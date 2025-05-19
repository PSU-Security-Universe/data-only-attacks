# mode

## Summary

`writefile()` is a user-defined function provided by the command-line shell to write binary data (such as BLOBs) or text from the database to the file system.

For example, `writefile(X, Y)` writes the blob Y into the file named X and returns the number of bytes written. `writefile` also supports creating a symlink or directory, or changing a file's mode based on an additional `mode` argument.

Examples:

- `SELECT writefile('linkname', 'targetfile', 0xA1ED);`  
  This creates a symlink named `linkname` that points to `targetfile`. The value `0xA1ED` specifies the mode for symlink creation.

- `SELECT writefile('myfile', 'targetdata', 0x1A4);`  
  This writes `targetdata` to `myfile` and sets its file mode to `644`.

All these operations are determined by the `mode` parameter. Some SQLite service APIs may enforce strict sanitization when handling symlink creation requests, but apply looser checks when writing file content. An attacker could exploit this by manipulating the `mode` value to bypass sanitization, potentially creating unexpected symlinks for future attacks.

