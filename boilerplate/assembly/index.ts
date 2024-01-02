import * as sdk from './sdk';

//####################### Native required functions ################################################
// export function alloc(size: u32):u32 {
//     return heap.alloc(size) as u32;
// }
// export function is_callable(methodAddress: u32, methodSize: u32): u8{
//     const methodsList: string[] = [];
//     const calledMethod: string = sdk.MsgPack.deserializeInternalType<string>(sdk.MemUtils.u8ArrayFromMem(methodAddress,methodSize));
//     return methodsList.includes(calledMethod) ? 1 : 0;
// }
// export function run(ctxAddress: u32, ctxSize: u32, argsAddress: u32, argsSize: u32): sdk.Types.WasmResult {
//     let ctxU8Arr: u8[] = sdk.MemUtils.u8ArrayFromMem(ctxAddress,ctxSize);
//     let ctx = sdk.MsgPack.ctxDecode(ctxU8Arr);
//     let argsU8: u8[] = sdk.MemUtils.u8ArrayFromMem(argsAddress,argsSize);
//     if (ctx.method == 'customTypeTest') {
//         const args = sdk.MsgPack.deserialize<testClass>(argsU8);
//         if (sdk.MsgPack.isError()) return sdk.Return.Error(`deserialization faillure: ${sdk.MsgPack.errorMessage()}`);
//         return customTypeTest(ctx, args);
//     } else if (ctx.method == 'internalTypeTest') {
//         const args = sdk.MsgPack.deserializeInternalType<string>(argsU8);
//         if (sdk.MsgPack.isError()) return sdk.Return.Error(`deserialization faillure: ${sdk.MsgPack.errorMessage()}`);
//         return internalTypeTest(ctx, args);
//     } else if (ctx.method == 'noTypeTest') {
//         const args = argsU8;
//         return noTypeTest(ctx, args);
//     } else if(ctx.method=='noTypeTest2') {
//         const args = sdk.Utils.u8ArrayToArrayBuffer(argsU8);
//         return noTypeTest2(ctx, args);
//     }
//     return sdk.Return.Error('method not found');
// }

//####################### public Functions #########################################################

@msgpackable
class testClass {
    from: string = '';
    to: string = '';
    units: u64 = 0;
    @optional
    data: ArrayBuffer = new ArrayBuffer(0);
}

@publicMethod
function customTypeTest(_ctx: sdk.Types.AppContext, args: testClass): sdk.Types.WasmResult {
    sdk.HostFunctions.log('customTypeTest');
    if (sdk.MsgPack.isError()) {
        return sdk.Return.Error(`Deserialization faillure: ${sdk.MsgPack.errorMessage()}`)
    }
    sdk.HostFunctions.storeData('from', sdk.MsgPack.serializeInternalType<string>(args.from));
    sdk.HostFunctions.storeData('to', sdk.MsgPack.serializeInternalType<string>(args.to));
    sdk.HostFunctions.storeData('units', sdk.MsgPack.serializeInternalType<u64>(args.units));
    if (args.data.byteLength > 0) {
        sdk.HostFunctions.storeData('data', sdk.Utils.arrayBufferToU8Array(args.data));
    }
    return sdk.Return.True();
}

@publicMethod
function internalTypeTest(_ctx: sdk.Types.AppContext, str: string): sdk.Types.WasmResult {
    sdk.HostFunctions.log('internalTypeTest');
    sdk.HostFunctions.storeData('testData', sdk.MsgPack.serializeInternalType(str));
    return sdk.Return.True();
}

@publicMethod
function noTypeTest(_ctx: sdk.Types.AppContext, bytes: u8[]): sdk.Types.WasmResult {
    sdk.HostFunctions.log('noTypeTest');
    sdk.HostFunctions.storeData('testData', bytes);
    return sdk.Return.True();
}

@publicMethod
function noTypeTest2(_ctx: sdk.Types.AppContext, bytes: ArrayBuffer): sdk.Types.WasmResult {
    sdk.HostFunctions.log('noTypeTest2');
    sdk.HostFunctions.storeData('testData', sdk.Utils.arrayBufferToU8Array(bytes));
    return sdk.Return.True();
}