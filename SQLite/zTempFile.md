# zTempFile

## Summary

SQLite will try to delete the temporary file (if there is one). The path of the temporary file is stored in `p->zTempFile`. `p` is a `ShellState` initialized at the very beginning. If `p->zTempFile` is not null, sqlite will call `shellDeleteFile` and then call `unlink` to delete the temp file. By modifying `p->zTempFile`, we can delete arbitrary file.

Here is the related code:

```c
  static void clearTempFile(ShellState *p) {
    if( p->zTempFile==0 ) return;
    if( p->doXdgOpen ) return;
    if( shellDeleteFile(p->zTempFile) ) return;
    sqlite3_free(p->zTempFile);
    p->zTempFile = 0;
  }
```