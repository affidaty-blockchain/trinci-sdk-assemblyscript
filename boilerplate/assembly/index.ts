import sdk from '../node_modules/@affidaty/trinci-sdk-as';
import { AccountAssetU64 , OwnerDB } from "../node_modules/@affidaty/trinci-sdk-as/sdk/account";
const methodsMap = new Map<string, (ctx: sdk.Types.AppContext, args: u8[])=>sdk.Types.WasmResult>();
//####################### Native required functions ###############################################################
// exposing heap.alloc function for host to pass data to this module
export function alloc(size: i32): i32 {
    return heap.alloc(size) as i32;
}
export function run(ctxAddress: i32, ctxSize: i32, argsAddress: i32, argsSize: i32): sdk.Types.WasmResult {
    // decoding context and getting args from memory
    let ctxU8Arr: u8[] = sdk.MemUtils.u8ArrayFromMem(ctxAddress, ctxSize);
    let ctx = sdk.MsgPack.ctxDecode(ctxU8Arr);
    let argsU8: u8[] = sdk.MemUtils.u8ArrayFromMem(argsAddress, argsSize);
    
    // ERROR IF METHOD NOT REGISTERED
    if (!methodsMap.has(ctx.method)) {
        let success = false;
        let resultBytes = sdk.Utils.stringtoU8Array('method not found');
        return sdk.MsgPack.appOutputEncode(success, resultBytes);
    }
    // CALL METHOD ASSOCIATED TO STRING
    return methodsMap.get(ctx.method)(ctx, argsU8);
}
export function is_callable(methodAddress: i32, methodSize: i32): u8 {
    // decoding method from memory
    const calledMethod:string = sdk.MsgPack.deserializeInternalType<string>(sdk.MemUtils.u8ArrayFromMem(methodAddress, methodSize));
    // ERROR IF METHOD NOT REGISTERED
    return methodsMap.has(calledMethod) ? 1 : 0;
}
//####################### public Functions ###############################################################
    
methodsMap.set('test_method', testMethod);
function testMethod(_ctx: sdk.Types.AppContext, argsU8: u8[]): sdk.Types.WasmResult {
    // HostFunctions contains all the available methods to interact with the blockchain
    // outside of protected WASM environment.
    // Use IntelliSense to explore other methods.
    // This one is for logs. To see those logs launch node with at least debug log level
    sdk.HostFunctions.log('testMethod()');
    return sdk.Return.True(); // return true in MessagePack
}

// Use this decorator if you want to use serialize/deserialize generics
// Some restrictions:
// Class constructor must be callable without arguments. E.g.:"let c = new MyClass();"
// supported types: bool, u8, u16, u32, u64, i8, i16, i32, i64, f32, f64, string, ArrayBuffer and arrays of those types.
// Nested managed classes aren't supported yet.
// Multidimensional arrays not yet supported.
// Maps not yet supported
@msgpackable
class Config {
    owner: string = '';
    max_mintable : u64 = 0;
    total_minted : u64 = 0;
}

methodsMap.set('init', init);
function init(_ctx: sdk.Types.AppContext, argsU8: u8[]): sdk.Types.WasmResult {
    // To see those logs launch node with at least "debug" log level
    sdk.HostFunctions.log('init()');
    let config = sdk.MsgPack.deserialize<Config>(argsU8);  // you must specify the <Type> for help deserialize function to create output

    if(!OwnerDB.has("init")) { // check if account is already initialized to prevent multiple initializations, has function check if key "init" is present in OwnerDB
        sdk.HostFunctions.log(`owner: [${config.owner}].`);
        sdk.HostFunctions.log(`max_mintable: [${config.max_mintable}].`);
        OwnerDB.set<bool>("init",true); // native types must be stored using set<Type>
        OwnerDB.setObject("config",config); // you can store any @msgpackable Object with a string key
        return sdk.Return.True();
    }
    return sdk.Return.Error("Account is already initializated!"); // error message must be a string
}
methodsMap.set('get_config', get_config);
function get_config(_ctx: sdk.Types.AppContext, _argsU8: u8[]): sdk.Types.TCombinedPtr {
    // To see those logs launch node with at least debug log level
    sdk.HostFunctions.log('get_config()');
    let config = OwnerDB.getObject<Config>("config"); // you must specify the <Type> for help deserialize funtion to create output
    sdk.HostFunctions.log(`owner: [${config.owner}].`);
    sdk.HostFunctions.log(`max_mintable: [${config.max_mintable}].`);
    return sdk.Return.SuccessAsObject(config); // this row convert "config" in MessagePack and return as WasmResult
}

@msgpackable
class TransferArgs {
    to:string ="";
    units:u64 =0;
}
methodsMap.set('mint', mint);
function mint(ctx: sdk.Types.AppContext, argsU8: u8[]): sdk.Types.WasmResult {
    sdk.HostFunctions.log('Mint Coin');
    let config = OwnerDB.getObject<Config>("config"); // retrieve config from db
    if(ctx.origin == config.owner) { // only config.owner can mint, ctx.origin is who signed the transaction
        let args = sdk.MsgPack.deserialize<TransferArgs>(argsU8); // convert generic u8[] that contains bytes of MessagePack of config structure
        if((args.units + config.total_minted)> config.max_mintable) {
            return sdk.Return.Error("Token limit exceeded during mint"); // error message must be a string        
        }
        const toAccount = new AccountAssetU64(args.to); // use AccountAssetU64 class to wrap usesful method around a generic asset in u64
        toAccount.add(args.units); // add take care about previous balance and add token to actual balance
        config.total_minted += args.units;
        OwnerDB.setObject("config",config); //update config with new total_minted value
        return sdk.Return.Success<u64>(toAccount.balance()); // in Success<Type>  you must specify native type such as u64,string, bool, ecc...
    }
    return sdk.Return.Error("No right to mint!"); // error message must be a string
}

methodsMap.set('transfer', transfer);
function transfer(ctx: sdk.Types.AppContext, argsU8: u8[]): sdk.Types.WasmResult {
    let args = sdk.MsgPack.deserialize<TransferArgs>(argsU8); // convert generic u8[] that contains bytes of MessagePack of config structure
    // retrive payer account from ctx, you can use ctx.caller or ctx.origin,
    const fromAccount = new AccountAssetU64(ctx.caller);
    // but if you use ctx.caller you open yourself to scenarios in which other smart contracts 
    //can make token shifts, while if you force ctx.origin, only the one who is able to sign transactions will be able to move tokens
    if(fromAccount.sub(args.units)) { // .sub return true if the balance is enough to make payment
        const toAccount = new AccountAssetU64(args.to);
        toAccount.add(args.units);
        return sdk.Return.Success<u64>(fromAccount.balance());
    } else {
        //Insufficent funds
        return sdk.Return.Error(`insufficent funds in ${ctx.caller}, balance:${fromAccount.balance()} transfer:${args.units}`);    
    }
}
