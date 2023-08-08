# p->zTempFile

## Program

[SQLite 3.40.1](https://github.com/sqlite/)

## TL;DR

SQLite will try to delete the temporary file (if there is one). The path of the temporary file is stored in `p->zTempFile`. `p` is a `ShellState` initialized at the very beginning. If `p->zTempFile` is not null, sqlite will call `shellDeleteFile` and then call `unlink` to delete the temp file. By modifying `p->zTempFile`, we can delete arbitrary file.

Here is the related code:
```c
    static void clearTempFile(ShellState *p){
    if( p->zTempFile==0 ) return;
    if( p->doXdgOpen ) return;
    if( shellDeleteFile(p->zTempFile) ) return;
    sqlite3_free(p->zTempFile);
    p->zTempFile = 0;
    }
```

## Attack in the wild

### Gain arbitrary memory-write primitive

We reuse the [bug](../SQLite-doXdgOpen/analysis.md/#gain-arbitrary-memory-write-primitive).

### PoC

In this only attack, we only need to exploit the vulnerability once to corrupt `p->zTempFile`. We disabled ASLR in this attack, so the address of p and faked structures are fixed. Bypassing ASLR is also feasible as demonstrated in page 60 of the slide. The complete PoC can be found in [poc.py](./poc.py).