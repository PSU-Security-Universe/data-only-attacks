# ft.st_uid & ft.st_mode

## Background

The function `ngx_create_paths` is responsible for ensuring that all directories specified in the `cycle->paths` array exist, are owned by the correct user, and have the correct permissions. It attempts to create each directory (if it doesn't already exist), optionally changes its ownership to a specified user, and ensures the directory has at least user read, write, and execute permissions.

## Details

For every target file, Nginx first compares the owner of this file with `ngx_uid_t user`. If does not match (line a), Nginx will call `chown` to change the owner to `user`. Similarly, Nginx also checks the file user permissions (line b) and update them to user readable, writable and executable via `chmod`. 

```c
ngx_int_t
ngx_create_paths(ngx_cycle_t *cycle, ngx_uid_t user)
{
    ngx_err_t         err;
    ngx_uint_t        i;
    ngx_path_t      **path;

    path = cycle->paths.elts;
    for (i = 0; i < cycle->paths.nelts; i++) {

        if (ngx_create_dir(path[i]->name.data, 0700) == NGX_FILE_ERROR) {
            err = ngx_errno;
            if (err != NGX_EEXIST) {
                ngx_log_error(NGX_LOG_EMERG, cycle->log, err,
                              ngx_create_dir_n " \"%s\" failed",
                              path[i]->name.data);
                return NGX_ERROR;
            }
        }

        if (user == (ngx_uid_t) NGX_CONF_UNSET_UINT) {
            continue;
        }

        ngx_file_info_t   fi;
        ...
a:      if (fi.st_uid != user) {
            if (chown((const char *) path[i]->name.data, user, -1) == -1) {
                ...
                return NGX_ERROR;
            }
        }

        if ((fi.st_mode & (S_IRUSR|S_IWUSR|S_IXUSR))
                                                  != (S_IRUSR|S_IWUSR|S_IXUSR))
        {
            fi.st_mode |= (S_IRUSR|S_IWUSR|S_IXUSR);

b:          if (chmod((const char *) path[i]->name.data, fi.st_mode) == -1) {
                ...
                return NGX_ERROR;
            }
        }
        }

    return NGX_OK;
}
```