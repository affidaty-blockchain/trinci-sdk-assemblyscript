// "sdk" import is required ( import sdk from './sdk';)
import { default as sdk, OwnerDB, AccountAssetU64} from './sdk';

// Decorator that marks method as public. All methods in "assembly/index.ts" decorated with
// @publicMethod can be called with a transaction.
// All public methods must have 1 o 2 parameter.
// The first parameter must always be of type "sdk.Types.AppContext"
// the second parameter (if any) can be of following types:
//     - an internal type: any type supported by sdk.MsgPack.(de)serializeInternalType(); auto deserialization is performed
//     - a class decorated with @mmsgpackable; auto deserialization is performed
//     - u8[] or ArrayBuffer; no auto deserialization is performed and argument bytes are passed to thhe public method as received from transaction
@publicMethod
function test_method(_ctx: sdk.Types.AppContext, argsU8: u8[]): sdk.Types.WasmResult {
    // HostFunctions contains all the available methods to interact with the blockchain
    // outside of protected WASM environment.
    // Use IntelliSense to explore other methods.
    // This one is for logs. To see those logs launch node with at least debug log level
    sdk.HostFunctions.log('testMethod()');
    sdk.HostFunctions.emit('testEvent', argsU8);
    return sdk.Return.True(); // return "success" with messagepack-encoded "true" value as result
}

// Use this decorator if you want to use (de)serialization generics
// Some restrictions:
// Class constructor must be callable without arguments. E.g.:"let c = new MyClass();"
// Supported types: bool, u8, u16, u32, u64, i8, i16, i32, i64, f32, f64, string, ArrayBuffer and arrays of those types.
// Nested managed classes not yet supported.
// Multidimensional arrays not yet supported.
// Maps not yet supported
// deserialization fails if transaction args contain extra unknown fields of are missing one or more fields
// It  is possible to decorate a field with "@optional" decorator (see class "TransferArgs" below)
@msgpackable
class Config {
    owner: string = '';
    max_mintable : u64 = 0;
    total_minted : u64 = 0;
}

@publicMethod
function init(_ctx: sdk.Types.AppContext, config: Config): sdk.Types.WasmResult {
    // To see those logs launch node with at least "debug" log level
    sdk.HostFunctions.log('init()');

    // checking if account is already initialized to prevent multiple initializations.
    // .has() function check if key "init" is present in OwnerDB
    if(OwnerDB.has('init')) {
        return sdk.Return.Error('Account is already initializated!');
    }

    sdk.HostFunctions.log(`owner: [${config.owner}].`);
    sdk.HostFunctions.log(`max_mintable: [${config.max_mintable}].`);
    OwnerDB.set<bool>('init', true); // native types must be stored using set<Type>
    OwnerDB.setObject('config', config); // you can store any @msgpackable Object with a string key
    return sdk.Return.True();
}

@publicMethod
function get_config(_ctx: sdk.Types.AppContext): sdk.Types.WasmResult {
    // To see those logs launch node with at least debug log level
    sdk.HostFunctions.log('get_config()');
    let config = OwnerDB.getObject<Config>('config'); // you must specify the <Type> for help deserialize funtion to create output
    sdk.HostFunctions.log(`owner: [${config.owner}]`);
    sdk.HostFunctions.log(`max_mintable: [${config.max_mintable}]`);
    return sdk.Return.SuccessAsObject(config); // this row convert "config" in MessagePack and return as WasmResult
}

@msgpackable
class TransferArgs {
    to: string = '';
    units: u64 = 0;
    @optional // in this case "data" field can be omitted in transaction without deserialization faillure and will assume default value
    data: ArrayBuffer = new ArrayBuffer(0);
}

@publicMethod
function mint(ctx: sdk.Types.AppContext, args: TransferArgs): sdk.Types.WasmResult {
    sdk.HostFunctions.log('Mint Coin');
    let config = OwnerDB.getObject<Config>('config'); // retrieve config from db

    if (ctx.origin !== config.owner) {
        return sdk.Return.Error('Not authorized');
    }

    if(args.units > ( config.max_mintable - config.total_minted )) {
        return sdk.Return.Error('Mint limit exceeded'); // error message must be a string
    }

    const toAccount = new AccountAssetU64(args.to); // use AccountAssetU64 class to wrap usesful method around a generic asset in u64
    toAccount.add(args.units); // add take care about previous balance and add token to actual balance
    config.total_minted += args.units;
    OwnerDB.setObject('config', config); //update config with new total_minted value
    return sdk.Return.Success<u64>(toAccount.balance()); // in Success<Type>  you must specify native type such as u64,string, bool, ecc...
}

@publicMethod
function transfer(ctx: sdk.Types.AppContext, args: TransferArgs): sdk.Types.WasmResult {
    // retrive payer account from ctx, you can use ctx.caller or ctx.origin,
    // but if you use ctx.caller you open yourself to scenarios in which other smart contracts 
    //can make token shifts, while if you force ctx.origin, only the one who is able to sign transactions will be able to move tokens
    const fromAccount = new AccountAssetU64(ctx.caller);

    if (!fromAccount.sub(args.units)) {// .sub return false if the balance is not enough to make payment
        //Insufficent funds
        return sdk.Return.Error(`Insufficent funds in ${ctx.caller}, balance:${fromAccount.balance()} transfer:${args.units}`);    
    }

    const toAccount = new AccountAssetU64(args.to);
    toAccount.add(args.units);
    return sdk.Return.Success<u64>(fromAccount.balance());
}
