// "sdk" import is always required ( import sdk from './sdk';)
import { default as sdk, OwnerDB, AccountAssetU64} from './sdk';

// Use this decorator if you want to use (de)serialization generics
// Some restrictions:
// Class constructor must be callable without arguments. E.g.:"let c = new MyClass();"
// Supported types: bool, u8, u16, u32, u64, i8, i16, i32, i64, f32, f64, string, ArrayBuffer and arrays of those types.
// Nested managed classes not supported.
// Multidimensional arrays not supported.
// Maps not yet supported
// However for those cases you can implement your own MsgPack (de)serializer using "@wapc/as-msgpack" package.
// deserialization fails if transaction args contain extra unknown fields of are missing one or more fields
// It is possible to decorate a field with "@optional" decorator. In case optional field is missing in transaction args, it asssumes default value.
@msgpackable class Config {
    @optional admin: string = '';
    @optional max_mintable : u64 = U64.MAX_VALUE;
    @optional total_minted : u64 = 0;
}

// Decorator that marks method as "exposed". All methods in "assembly/index.ts" decorated with
// @exposed can be called with a transaction.
// All exposed methods must have 1 o 2 parameter.
// The first parameter must always be of type "sdk.Types.AppContext"
// the second parameter (if any) can be of following types:
//     - an internal type: any type supported by sdk.MsgPack.(de)serializeInternalType(): auto deserialization is performed
//     - a class decorated with @msgpackable: auto deserialization is performed
//     - ArrayBuffer: no auto deserialization is performed and argument bytes are passed to thhe public method as received from transaction
// Return type must be "sdk.Types.WasmResult"
// Also functions decorators are not supported in typescript, which is used for typechecking, while assemblyscript is fine with them. Hence the need to suppress TS error messages with ts-ignore
// @ts-ignore
@exposed
function init(ctx: sdk.Types.AppContext, config: Config): sdk.Types.WasmResult {
    // HostFunctions contains all the available methods to interact with the blockchain
    // outside of protected WASM environment.
    // Use IntelliSense to explore other methods.
    // This one is for logs. To see those logs launch node with at least debug log level
    // To see those logs launch node with at least "debug" log level
    // sdk.HostFunctions.log('init()');

    // checking if account is already initialized to prevent multiple initializations.
    // .has() function check if key "init" is present in OwnerDB
    if(OwnerDB.hasKey('init')) {
        return sdk.Return.Error('Account is already initializated!');
    }

    // if transaction contains no "admin" field, current caller becomes admin
    if (config.admin.length <= 0) config.admin = ctx.caller

    // storing data inside owner's database(blockchain)
    // in this context "owner"
    OwnerDB.storeInternaltype('init', true);
    OwnerDB.storeDecorated('config', config); // you can store any @msgpackable Object with a string key
    return sdk.Return.SuccessWithTrue();
}

// This function exists just as an example. Data can be read from blockchain directly without submitting a transaction.
// @ts-ignore
@exposed
function get_config(_ctx: sdk.Types.AppContext): sdk.Types.WasmResult {
    // sdk.HostFunctions.log('get_config()');
    if(!OwnerDB.hasKey('init')) {
        return sdk.Return.Error('Not initializated!');
    }
    let config = OwnerDB.loadDecorated<Config>('config'); // you must specify the <Type> for help deserialize funtion to create output
    // sdk.HostFunctions.log(`admin: [${config.admin}]`);
    // sdk.HostFunctions.log(`max_mintable: [${config.max_mintable}]`);
    return sdk.Return.SuccessWithDecoratedType(config); // this row convert "config" in MessagePack and return as WasmResult
}

@msgpackable class MintArgs {
    to: string = '';
    units: u64 = 0;
}

// @ts-ignore
@exposed
function mint(ctx: sdk.Types.AppContext, args: MintArgs): sdk.Types.WasmResult {
    // sdk.HostFunctions.log('Mint Coin');
    let config = OwnerDB.loadDecorated<Config>('config'); // retrieve config from db

    if (ctx.origin !== config.admin) { // only admin can mint new units 
        return sdk.Return.Error('Not authorized');
    }

    if(args.units > ( config.max_mintable - config.total_minted )) {
        return sdk.Return.Error('Mint limit exceeded'); // error message must be a string
    }

    const toAccount = new AccountAssetU64(args.to).readAssetData(); // use AccountAssetU64 class to wrap usesful method around a generic asset in u64
    toAccount.add(args.units).writeAssetData(); // add take care about previous balance and add token to actual balance
    config.total_minted += args.units;
    OwnerDB.storeDecorated('config', config); //update config with new total_minted value
    return sdk.Return.SuccessWithInternalType<u64>(toAccount.currValue); // in Success<Type>  you must specify native type such as u64,string, bool, ecc...
}

@msgpackable class TransferArgs {
    from: string = '';
    to: string = '';
    units: u64 = 0;
    @optional data: ArrayBuffer = new ArrayBuffer(0);
}

// @ts-ignore
@exposed
function transfer(ctx: sdk.Types.AppContext, args: TransferArgs): sdk.Types.WasmResult {

    // both ctx.caller and ctx.origin can be used during next check
    // "origin" is stricter, as the signer of the original transaction gets checked
    // while checking the "caller" allows for the transfer to be made by other smart contracts
    if (ctx.caller !== args.from) {
        return sdk.Return.Error('Not authorized');
    }
    const fromAsset = new AccountAssetU64(args.from).readAssetData().subtract(args.units).writeAssetData();
    if (fromAsset.isError) return sdk.Return.Error(`Transfer error: ${fromAsset.error}`);

    const toAsset = new AccountAssetU64(args.to).readAssetData().add(args.units).writeAssetData();
    if (toAsset.isError) return sdk.Return.Error(`Transfer error: ${fromAsset.error}`);
    return sdk.Return.SuccessWithInternalType<u64>(fromAsset.currValue);
}

// @ts-ignore
@exposed
function emit(_ctx: sdk.Types.AppContext, argsBytes: ArrayBuffer): sdk.Types.WasmResult {
    // sdk.HostFunctions.log('emit()');
    sdk.HostFunctions.emit('testEvent', argsBytes);
    return sdk.Return.SuccessWithTrue(); // return "success" with messagepack-encoded "true" value as result
}
