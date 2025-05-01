# doXdgOpen

## Summary

Structure `ShellState` maintains the shell session information, where `doXdgOpen` and `zTempFile` are two member fields.

Here is the related code:

```c
  // in sqlite3.c

  // p is pointing to a ShellState structure
  if( p->doXdgOpen ){
    const char *zXdgOpenCmd = "xdg-open";
    char *zCmd = sqlite3_mprintf("%s %s", zXdgOpenCmd, p->zTempFile);
    if (system(zCmd)) { ...; }
  }
```

If `p->doXdgOpen` is `true`, it means the SQLite output was being redirected to a temporary file named by `p->zTempFile`. SQLite will open/start/xdg-open to open the file for users to check or save.

* Normally, `p->doXdgOpen` is `false`
* An attacker can modify `doXdgOpen` and `zTempFile` to execute any command on victim systems.


## Details

Structure `ShellState` maintains the shell status information. Its defintion is as follows: 

```c
// in shell.c

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

Users can create a sqlite shell by simply typing `./sqlite3 [path-to-database-file]` or `./sqlite3`. By default, sqlite receives the SQL query (input to sqlite) from `stdin`, and prints the query results on `stdout`. Here is an example of the sqlite shell:

```bash
$ ./sqlite3
sqlite> create table T (c int);
sqlite> insert into T values (0), (1), (2);
sqlite> select * from T;
0
1
2
```

However, sometimes you may want to save the query result into a file. sqlite supports this feature with the following options:

```sql
sqlite> .help
.excel                   Display the output of next command in spreadsheet
.once ?OPTIONS? ?FILE?   Output for the next SQL command only to FILE
.output ?FILE?           Send output to FILE or stdout if FILE is omitted
.testcase NAME           Begin redirecting output to 'testcase-out.txt'
```

More details are available at https://www.sqlite.org/cli.html#writing_results_to_a_file

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

The implementation details of this feature is as follows. What we care about is the code for opening the system text editor in function `output_reset`:

```c
// in shell.c

/*
** Change the output file back to stdout.
**
** If the p->doXdgOpen flag is set, that means the output was being
** redirected to a temporary file named by p->zTempFile.  In that case,
** launch start/open/xdg-open on that temporary file.
*/
static void output_reset(ShellState *p){
  if (p->outfile[0] == '|'){
#ifndef SQLITE_OMIT_POPEN
    pclose(p->out);
#endif
  } else {
    output_file_close(p->out);
#ifndef SQLITE_NOHAVE_SYSTEM
a.  if (p->doXdgOpen) {
      const char *zXdgOpenCmd =
#if defined(_WIN32)
      "start";
#elif defined(__APPLE__)
      "open";
#else
      "xdg-open";
#endif
      char *zCmd;
b.    zCmd = sqlite3_mprintf("%s %s", zXdgOpenCmd, p->zTempFile);
c.    if (system(zCmd)) {
        utf8_printf(stderr, "Failed: [%s]\n", zCmd);
      } else {
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