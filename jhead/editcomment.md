# EditComment

## Overview

Jhead provides the ability to interactively edit the JPEG comment field using the `-ce` command-line option. When this option is used, the program launches a text editor so the user can modify the comment associated with the image.

## How It Works

When the `-ce` option is specified, the following logic is executed:

```c
if (EditComment) {
    // ...
    char EditFileName[PATH_MAX+5];
                    strcpy(EditFileName, FileName);
                    strcat(EditFileName, ".txt");

    CommentSize = FileEditComment(EditFileName, Comment, CommentSize);
    // ...
}
```

The core function responsible for launching the editor is `FileEditComment`:

```c
static int FileEditComment(char * TempFileName, char * Comment, int CommentSize)
{
    // Write the current comment to a temporary file
    file = fopen(TempFileName, "w");
    fwrite(Comment, CommentSize, 1, file);
    fclose(file);

    // Determine which editor to use
    Editor = getenv("EDITOR");
    if (Editor == NULL){
#ifdef _WIN32
        Editor = "notepad";
#else
        Editor = "vi";
#endif
    }

    // Construct and execute the shell command
    sprintf(QuotedPath, "%s \"%s\"", Editor, TempFileName);
    a = system(QuotedPath);

    ...
}
```

- The program writes the current comment to a temporary file.
- It determines the editor to use from the `$EDITOR` environment variable (or defaults to `vi`/`notepad`).
- It constructs a shell command and executes it using `system()`.
- After editing, it reads the comment back from the file and updates the JPEG.

## Security Issue: Command Injection

The `EditComment` feature is vulnerable to command injection because it constructs a shell command using user-controlled input `FileName` and `$EDITOR` without any validation:

```c
Editor = getenv("EDITOR");
sprintf(QuotedPath, "%s \"%s\"", Editor, TempFileName);
a = system(QuotedPath);
```

- If an attacker sets the `EDITOR` environment variable to a malicious value (e.g., `EDITOR="vi; rm -rf ~"`), arbitrary commands can be executed when `system()` is called.
- The temporary filename is also interpolated into the shell command and can be exploited by attackers in the way mentioned in `regenthumbnail.md`.