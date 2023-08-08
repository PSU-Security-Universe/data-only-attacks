# data-only-attacks
A list of data-only attacks

<table>
    <thead>
        <tr>
            <th>Program</th>
            <th>Version</th>
            <th>Variable</th>
            <th>Location</th>
            <th>Malicious Goal</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td rowspan="3">SQLite</td>
            <td rowspan="3">3.40.1</td>
            <td>p->doXdgOpen</td>
            <td>shell.c:20270</td>
            <td>execute arbitrary program</td>
        </tr>
        <tr>
            <td>p->zTempFile</td>
            <td>shell.c:20560</td>
            <td>delete any file</td>
        </tr>
        <tr>
            <td>isDelete</td>
            <td>sqlite3.c:42939</td>
            <td>delete any file</td>
        </tr>
        <tr>
            <td>V8</td>
            <td>8.5.188</td>
            <td>enable_os_system</td>
            <td>d8-posix.cc:762</td>
            <td>execute any program</td>
        </tr>
    </tbody>
</table>