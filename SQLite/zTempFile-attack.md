# Corrupting `zTempFile`

By corrupting `zTempFile` critcal variable in `SQLite`, attackers can delete arbitrary files as they want.

## Attack via Real-world (Fixed) Bugs

### 1. Gain arbitrary memory-write primitive

We reuse the old bug [CVE-2017-6983](./cve-2017-6983.md) for achieving arbitrary memory write.

#### 2. Compile SQLite

```bash
# in sqlite folder

CC="clang -DSQLITE_DEBUG" ./configure --enable-debug
make
```

### 3. Proof-of-Concept (PoC)

In this only attack, we only need to exploit the vulnerability once to corrupt `p->zTempFile`. We disabled ASLR in this attack, so the address of p and faked structures are fixed. Bypassing ASLR is also feasible as demonstrated in page 60 of the slide. The complete PoC can be found in [zTempFile-poc.py](./zTempFile-poc.py).