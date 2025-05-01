# doXdgOpen

## Summary

Structure `ShellState` maintains the shell session information, where `doXdgOpen` and `zTempFile` are two member fields.

Here is the related code:

```c
  // file: shel.c
  // function: output_reset

  // p is pointing to a ShellState structure
  if (p->doXdgOpen) {
    const char *zXdgOpenCmd = "xdg-open";
    char *zCmd = sqlite3_mprintf("%s %s", zXdgOpenCmd, p->zTempFile);
    if (system(zCmd)) { ...; }
  }
```

If `p->doXdgOpen` is `true`, it means the SQLite output was being redirected to a temporary file named by `p->zTempFile`. SQLite will open/start/xdg-open to open the file for users to check or save.

* Normally, `p->doXdgOpen` is `false`
* An attacker can modify `doXdgOpen` and `zTempFile` to execute any command on victim systems.


## Details

Structure `ShellState` maintains the shell status information. Its defintion is as follows.

```c
// in shell.c

/*
** State information about the database connection is contained in an
** instance of the following structure.
*/
typedef struct ShellState ShellState;
struct ShellState {
  sqlite3 *db;           /* The database */
  ...
  u8 doXdgOpen;          /* Invoke start/open/xdg-open in output_reset() */
  ...
  char *zTempFile;       /* Temporary file that might need deleting */
  ...
};
```

Users can start an SQLite shell by simply typing `./sqlite3 [path-to-database-file]` or `./sqlite3`. By default, SQLite receives the SQL query (input to SQLite) from `stdin`, and prints the query result on `stdout`. Here is an example of the SQLite shell.

```bash
$ ./sqlite3
sqlite> create table T (c int);
sqlite> insert into T values (0), (1), (2);
sqlite> select * from T;
0
1
2
```

However, users may want to save the query result into a file. SQLite supports this feature with the following options.

```bash
sqlite> .help
.excel                   Display the output of next command in spreadsheet
.once ?OPTIONS? ?FILE?   Output for the next SQL command only to FILE
.output ?FILE?           Send output to FILE or stdout if FILE is omitted
.testcase NAME           Begin redirecting output to 'testcase-out.txt'
```

More details are available at https://www.sqlite.org/cli.html#writing_results_to_a_file

More than that, users may want to edit the result a little bit before saving them into a file. SQLite nicely provides the feature that will save the result into a temporary file and immediately open that file for users.

```bash
sqlite> .once -E
.once ?OPTIONS? ?FILE?   Output for the next SQL command only to FILE
     If FILE begins with '|' then open as a pipe
       --bom  Put a UTF8 byte-order mark at the beginning
       -e     Send output to the system text editor
       -x     Send output as CSV to a spreadsheet (same as ".excel")
sqlite> .once -e
sqlite> select * from T;       <------- try it
```

After the last SQL query, SQLite will invoke the system text-editor to open the temporary file that contains the result.

The implementation of this feature is as follows. What we care about is the code for invoking the system text-editor in function `output_reset`.

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
a:  if (p->doXdgOpen) {
      const char *zXdgOpenCmd =
#if defined(_WIN32)
      "start";
#elif defined(__APPLE__)
      "open";
#else
      "xdg-open";
#endif
      char *zCmd;
b:    zCmd = sqlite3_mprintf("%s %s", zXdgOpenCmd, p->zTempFile);
c:    if (system(zCmd)) {
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

`output_reset` cleans up the previous output setting and restores the output to `stdout`. We focus on lines labeled with `a`, `b`, and `c`.

* Line `a`: SQLite checks whether `doXdgOpen` is set. This variable is set when the user types `.once -x`, `.once -e` or `.excel`, which means the user wants SQLite to invoke system text/excel-editor to modify the result. 

* Line `b`: If so, SQLite will move on to construct the command `zCmd`. `zXdgOpenCmd` is the system-specific command that automatically finds propoer applications to open particular-format files.
  * On Linux system, the shell command is `xdg-open`;
  * On Mac, the shell command is `open`;
  * On Windows, the command is `start`. 
  
  The temporary file name is stored in `zTempFile`, which is predefined but can be updated by user command. This is why it is a variable, not a constant.

* At last, SQLite uses line `c` to run the command, which will pop up the window of either text editor or excel editor.

## Idea for Attacks

Once attackers have the capability to modify memory content, they can launch arbitrary code execution on vulnerable SQLite process in two steps.

1. Corrupt `p->doXdgOpen` to `true` (or `1`)
2. Corrupt `zTempFile` to `; bad-cmd`, where `bad-cmd` is the malicious command

Then, SQLite will help execute the command `bad-cmd` for attackers.