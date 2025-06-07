# ngx_terminate & ngx_quit

## Details

The function `ngx_single_process_cycle` is responsible for running the main event loop when Nginx is started in single-process mode. In this function, Nginx first walks through all loaded modules and initializes each process if needed. Then, Nginx enters an infinite loop, which serves as the main event loop. Within this loop, Nginx calls `ngx_process_events_and_timers` to process incoming events (such as connections, timers, etc.). Nginx also checks for certain signals and performs operations based on their values. For example, if it receives the `ngx_terminate` or `ngx_quit` signals (see line a), Nginx will call `ngx_master_process_exit` to clean up the process and exit.

```c
void
ngx_single_process_cycle(ngx_cycle_t *cycle)
{
    ngx_uint_t  i;

    if (ngx_set_environment(cycle, NULL) == NULL) {
        /* fatal */
        exit(2);
    }

    for (i = 0; cycle->modules[i]; i++) {
        if (cycle->modules[i]->init_process) {
            if (cycle->modules[i]->init_process(cycle) == NGX_ERROR) {
                /* fatal */
                exit(2);
            }
        }
    }

    for ( ;; ) {
        ...
        ngx_process_events_and_timers(cycle);

a:        if (ngx_terminate || ngx_quit) {

            for (i = 0; cycle->modules[i]; i++) {
                if (cycle->modules[i]->exit_process) {
                    cycle->modules[i]->exit_process(cycle);
                }
            }

            ngx_master_process_exit(cycle);
        }

        ...
    }
}
```

`ngx_master_process_exit` will further call `ngx_delete_pidfile` to delete the PID file. The filename is loaded from either `ccf->oldpid.data` or `ccf->pid.data` at line b and is used to delete the file at line c.

```c
ngx_delete_pidfile(ngx_cycle_t *cycle)
{
    u_char           *name;
    ngx_core_conf_t  *ccf;

    ccf = (ngx_core_conf_t *) ngx_get_conf(cycle->conf_ctx, ngx_core_module);

b:  name = ngx_new_binary ? ccf->oldpid.data : ccf->pid.data;

c:  if (ngx_delete_file(name) == NGX_FILE_ERROR) {
        ...
    }
}
```