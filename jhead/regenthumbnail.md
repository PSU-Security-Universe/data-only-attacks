# RegenThumbnail

## Overview

Jhead provides the ability to regenerate image thumbnails embedded in EXIF data using the `-rgt [size]` command-line option. This option store `size` in the global variable `RegenThumbnail`, which is then used as a flag to trigger thumbnail regeneration for the specified image file.

## How It Works

When the `-rgt` option is used, the following logic is executed:

```c
if (RegenThumbnail) {
    if (RegenerateThumbnail(FileName)) {
        Modified = TRUE;
    }
}
```

The core function responsible for thumbnail regeneration is `RegenerateThumbnail`:

```c
static int RegenerateThumbnail(const char * FileName)
{
    ...

a:  sprintf(ThumbnailGenCommand, "mogrify -thumbnail %dx%d -quality 80 \"%s\"", 
        RegenThumbnail, RegenThumbnail, FileName);

b:  if (system(ThumbnailGenCommand) == 0){
        // Put the thumbnail back in the header
        return ReplaceThumbnail(FileName);
    }else{
        ErrFatal("Unable to run 'mogrify' command");
        return FALSE;
    }
}
```

- The command string for `mogrify` is constructed using user-supplied input (`FileName`).
- This command is then executed via `system()` without any sanitization or validation.

## Security Issue: Command Injection

Because the `FileName` parameter is user-controlled and directly interpolated into a shell command, this implementation is vulnerable to command injection. An attacker can craft a malicious filename to execute arbitrary shell commands.

```bash
jhead-3.04$ ./jhead -rgt \"; echo 'hello'\"

Error : No such file
in file '"'
hello"
```