[V8](https://v8.dev/docs) is Google’s open source high-performance JavaScript and WebAssembly engine, written in C++. It is used in Chrome and in Node.js, among others.

# Source Code

Our analysis is performed on version 8.5.1888. The following commands provide a way to obtain a copy of the source code.

```bash
$ sudo apt install bison cdbs curl flex g++ git python vim pkg-config clang clang++
$ git clone https://chromium.googlesource.com/chromium/tools/$ depot_tools.git
$ export PATH=$(pwd)/depot_tools:${PATH}
$ fetch v8
$ cd v8
$ git reset --hard 8.5.188
$ gclient sync -D
$ patch --directory=v8 --strip=1 < /path/to/v8.patch
$ export CC="clang" CXX="clang++" BUILD_CC="clang" BUILD_CXX="clang++" LLVM_COMPILER=clang AR=llvm-ar NM=llvm-nm BUILD_AR=llvm-ar BUILD_NM=llvm-nm
$ gn gen x64.debug
$ cp /path/to/args.gn x64.debug
$ ninja -C x64.debug "v8_monolith" "d8"
```

# Critical Variables

* [enable\_os\_system](enable_os_system.md)

# Data-only Attacks

* [enable\_os\_system-attack](enable_os_system-attack.md)
