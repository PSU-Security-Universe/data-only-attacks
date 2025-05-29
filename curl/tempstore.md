# tempstore

## Details

tempstore is a pointer to a string that holds the name of a temporary file.
When curl attempts to write something to a file, tempstore is used to ensure that the target file is written atomically and safely.
When writing to a file (not stdout), Curl_fopen may open a temporary file for writing and set tempstore to its name.
After successfully writing all content, the function closes the temporary file and then renames it to the target filename.
This approach prevents data loss or corruption if the program crashes or is interrupted during the write operation. The original file is only replaced once the new file is fully written. The core code logic is as follows:

```c
  if(!use_stdout) {
    ...
    if(tempstore && Curl_rename(tempstore, filename)) { 
      unlink(tempstore);
    }
  }
```

However, curl does not check the existence of original target file `filename` before calling `Curl_rename(tempstore, filename)`. This means any file could be overwritten without check.  

