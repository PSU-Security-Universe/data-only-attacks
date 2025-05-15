# mode

## Summary

The `writefile(X,Y)` SQL function writes the blob Y into the file named X and returns the number of bytes written. `writefile` also supports features to create a symlink or directory, or change file mode based on an extra argument `mode`.

For example:

`SELECT writefile('linkname', 'targetfile', 0xA1ED);` will create a symlink `linkname` links to `targetfile`. `0xA1ED` is the `mode` for symlink creation.

`SELECT writefile('myfile', 'targetdata', 0x1A4);` will write `targetdata` to `myfile` and set its file mode to `644`.

All these operations are determined by the mode parameter. Some SQLite service APIs may enforce strict sanitization when handling symlink creation requests, but apply looser checks when writing file content. An attacker could exploit this by manipulating the mode value to bypass sanitization, potentially creating unexpected symlinks for future attacks.

