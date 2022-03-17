import sdk from './sdk';

// exposing heap.alloc function for host to pass data
// to this module
export function alloc(size: i32): i32 {
    return heap.alloc(size) as i32;
}
// after loading module, host calls this function automatically
export function run(ctxAddress: i32, ctxSize: i32, argsAddress: i32, argsSize: i32): sdk.Types.TCombinedPtr {
    // decoding context and getting args from memory
    let ctxU8Arr: u8[] = sdk.MemUtils.u8ArrayFromMem(ctxAddress, ctxSize);
    let ctx = sdk.MsgPack.ctxDecode(ctxU8Arr);
    let argsU8: u8[] = sdk.MemUtils.u8ArrayFromMem(argsAddress, argsSize);
    let methodsMap = new Map<string, (ctx: sdk.Types.AppContext, args: u8[])=>sdk.Types.TCombinedPtr>();

    // REGISTER YOUR METHODS HERE
    // See definitions below
    methodsMap.set('test_method', testMethod);
    methodsMap.set('store_data', storeData);
    methodsMap.set('load_data', loadData);
    methodsMap.set('remove_data', removeData);

    // ERROR IF METHOD NOT REGISTERED
    if (!methodsMap.has(ctx.method)) {
        let success = false;
        let resultBytes = sdk.Utils.stringtoU8Array('Method not found.');
        return sdk.MsgPack.appOutputEncode(success, resultBytes);
    }

    // CALL METHOD ASSOCIATED TO STRING
    return methodsMap.get(ctx.method)(ctx, argsU8);
}

function testMethod(ctx: sdk.Types.AppContext, argsU8: u8[]): sdk.Types.TCombinedPtr {
    // HostFunctions contains all the available methods to interact with the blockchain
    // outside of protected WASM environment.
    // Use IntelliSense to explore other methods.
    // This one is for logs. To see those logs launch node with at least debug log level
    sdk.HostFunctions.log('testMethod()');

    // resultBytes can be an arbitrary u8[] so you can output data in your own format
    let success = true;
    let resultBytes = sdk.Utils.stringtoU8Array('Test method OK');
    return sdk.MsgPack.appOutputEncode(success, resultBytes);
}

// Use this decorator if you want to use serialize/deserialize generics
// Some restrictions:
// Class ctor must be callable without arguments. E.g.:"let c = new MyClass();"
// supported types: bool, u8, u16, u32, u64, i8, i16, i32, i64, f32, f64, string, ArrayBuffer and arrays of those types.
// Nested managed classes aren't supported yet.
// Multidimensional arrays not yet supported.
// Maps not yet supported
@msgpackable
class KeyData {
    key: string = '';
    data: ArrayBuffer = new ArrayBuffer(0);
}

@msgpackable
class Key {
    key: string = '';
}

function storeData(ctx: sdk.Types.AppContext, argsU8: u8[]): sdk.Types.TCombinedPtr {
    // To see those logs launch node with at least "debug" log level
    sdk.HostFunctions.log('storeData()');
    let args = sdk.MsgPack.deserialize<KeyData>(argsU8);
    sdk.HostFunctions.log(`key: [${args.key}].`);
    sdk.HostFunctions.log(`data: [${sdk.Utils.arrayBufferToU8Array(args.data).toString()}].`);
    sdk.HostFunctions.storeData(args.key, sdk.Utils.arrayBufferToU8Array(args.data));

    // resultBytes can be an arbitrary u8[] so you can output data in your own format
    let success = true;
    let resultBytes = sdk.Utils.stringtoU8Array('Data stored');
    return sdk.MsgPack.appOutputEncode(success, resultBytes);
}

function loadData(ctx: sdk.Types.AppContext, argsU8: u8[]): sdk.Types.TCombinedPtr {
    // To see those logs launch node with at least debug log level
    sdk.HostFunctions.log('loadData()');
    let args = sdk.MsgPack.deserialize<Key>(argsU8);
    sdk.HostFunctions.log(`key: [${args.key}].`);
    let data = sdk.HostFunctions.loadData(args.key);
    sdk.HostFunctions.log(`data: [${data.toString()}].`);

    // resultBytes can be an arbitrary u8[] so you can output data in your own format
    let success = true;
    return sdk.MsgPack.appOutputEncode(success, data);
}

function removeData(ctx: sdk.Types.AppContext, argsU8: u8[]): sdk.Types.TCombinedPtr {
    // To see those logs launch node with at least debug log level
    sdk.HostFunctions.log('loadData()');
    let args = sdk.MsgPack.deserialize<Key>(argsU8);
    sdk.HostFunctions.log(`key: [${args.key}].`);
    sdk.HostFunctions.removeData(args.key);

    let success = true;
    let resultBytes = sdk.Utils.stringtoU8Array('Data removed');
    return sdk.MsgPack.appOutputEncode(success, resultBytes);
}
