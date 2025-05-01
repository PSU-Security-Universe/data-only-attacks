[SQLite](https://www.sqlite.org/) is a widely used lightweight database management system (DBMS).

# Source Code

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

# Critical Variables

* [doXdgOpen](doXdgOpen.md)
* [isDelete](isDelete.md)
* [zTempFile](zTempFile.md)

# Data-only Attacks

* [doXdgopen-attack](doXdgOpen-attack.md)
* [isDetele-attack](isDelete-attack.md)
* [zTempFile-attack](zTempFile-attack.md)
