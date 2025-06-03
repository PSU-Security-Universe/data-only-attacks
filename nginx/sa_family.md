# sa_family

## Background

The `ngx_open_listening_sockets` function is responsible for creating, configuring and preparing all the sockets that NGINX will use to accept incoming connections. This includes both network sockets and Unix domain sockets (for local IPC).

`struct sockaddr` uses a member `sa_family` to mark the socket type. `AF_INET*` for network socket and `AF_UNIX` for Unix domain socket.

## Details

In `ngx_open_listening_sockets`, if the socket is a Unix domain socket, nginx will call `chmod` to set permission of the target Unix file to `RW_RW_RW_`

```c
if (ls[i].sockaddr->sa_family == AF_UNIX) {
    mode_t   mode;
    u_char  *name;

    name = ls[i].addr_text.data + sizeof("unix:") - 1;
    mode = (S_IRUSR|S_IWUSR|S_IRGRP|S_IWGRP|S_IROTH|S_IWOTH);

    if (chmod((char *) name, mode) == -1) {
        ...
    }
```