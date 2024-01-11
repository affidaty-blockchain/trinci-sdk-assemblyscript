[<BACK](index.md)
# Basic concepts

Below are some basic concepts which apply to every smart contract on TRINCI platform independently of programming languages those contracts are written in.

---

- [Combined pointer](#combined-pointer)
- [Exports](#exports)
   - [`alloc()`](#allocsize-u32-u32)
   - [`run()`](#runctxaddress-u32-ctxsize-u32-argsaddress-u32-argssize-u32-u64)
   - [`is_callable()`](#is_callablemethodnameaddress-u32-methodnamesize-u32-u8)
- [Host functions](#host-functions)
- [Data structures](#data-structures)
   - [CTX](#ctx)
   - [Return](#return)
- [Account data](#account-data)
   - [Owner data](#owner-data)
   - [Asset data](#asset-data)
- [Transaction lifecycle](#transaction-lifecycle)
---

## WASM environment overview

![WASM Environment](./assets/wasm_env.svg)

&nbsp;

When a TRINCI node receives a transaction an isolated, sandboxed virtual WASM machine running required smart contract code is created.

In order for smart contract to do anything useful it nust have following capabilities:
- Receive data to process from core (transaction method and args)
- Database read/write access (e.g. change balance of an account)
- Return execution result back to the TRINCI core.

In order to achieve required functionality each WASM instance must have following features:
- `Exports` - WASM must provide a number of functions in order for the core to ask WASM for heap allocation and methods execution
- `Imports` - TRINCI core must import into WASM instance a number of functions in order for the smart contract to request data from 'outside'.
- `Heap` - WASM memory heap must be accessible in R/W mode from both core and WASM itself. This is required because the only type that can be passed/returned to/from a WASM function is a number. In order to exchange more complex data structures such structures must be serialized and allocated into memory. Then memory offset and size of data can be passed to/from WASm as numbers.
- `Data serialization format` - WASM smart contracts can be compiled from many different languages. This means a platform- and language-independent serialization method is needed to exchange data structures between different smart contracts and TRINCI core. In case of transaction arguments and results, no controls are performed and data are passed as raw byte arrays. This means that technically any serialization method can be used. However for internal service data exchange (e.g. CTX and HostFunctions) MessagePack was chosen and it is de facto standard for almost all smart contracts on TRINCI platform.

&nbsp;

---
[^UP](#basic-concepts)
## Combined pointer (WasmResult)

The only types that can be directly passed to and received from a called WASM functions are numeric types. While number of arguments passed to functions is virtually unlimited, only one number can be returned.

Because of this in cases where it is necessary to return something more complex the return type gets serialized and stored in WASM heap. Then two 32-bit values (memory offset and size in bytes) get combined into a single 64-bit value (hence the name `combined pointer`). Such value gets returned to the core, which splits value back into two 32-bit numbers, loads data from memory, decodes it and gets the actual data returned by function.

&nbsp;

---
[^UP](#basic-concepts)
## Exports

> You don't need to actually write functions described below.  
> They are generated and added automatically by transformer during compilation process. It is possible, however, to write custom alloc, run and is_callable, should the need arise. Upon detecting custom function, trasformer will just check it for signature correctness.  
> See [`index.ts` file](index_file.md) wiki section for more info and examples.

In order for a smart contract to work properly a number of functions must be exported from entry file (usually `assembly/index.ts`):
- #### `alloc(u32): u32`
   this function allows to safely allocate a contiguous region of WASM heap of `<size>` bytes to receive binary data from outside.
- #### `run(u32, u32, u32, u32): u64`
   This is like main() function in many programming languages: it is an entry point that actually gets called by core upon transaction execution.
- #### `is_callable(u32, u32): u8`
   This function returns 1 if a ceartain public method method can be called on this smart contract, 0 otherwise.

&nbsp;

---
[^UP](#basic-concepts)
## Host functions

These functions are implemented by the host (TRINCI core in our case) and declared as external functions inside smart contract code (`<package_install_dir>/@affidaty/trinci-sdk-as/sdk/env.ts`).
More in dedicated [Host functions](host_functions.md) section

&nbsp;

---
[^UP](#basic-concepts)
## Data structures

Following are data structures passed to/expected by the core in order to communicate with the smart contract.  
> All special data structures used in WASM<->core communications are serialized using MessagePack format. For more info and serialization examples see [MessagePack](messagepack.md) section of the wiki.

### CTX

This structure is passed to the exported `run()` function (first two arguments) along with method arguments and contains information about current smart contract execution context. It's a mixed type array with a fixed length of 6 elements and is structured as follows:

| Elem index | Type | Name | Description |
|------------|------|------|-------------|
| 0 | u16 | Depth | Initial value is `0`, which means that this smart contract execution was initiated directly by a transaction. Depth gets increased automatically by the core each time a sub call occurs (see [`call()`](./host_functions.md#calltargetid-string-method-string-data-u8-typesappoutput) and [`scall()`](./host_functions.md#scalltargetid-string-method-string-contracthash-u8-data-u8-typesappoutput) host functions). |
| 1 | string | Network | Transaction target network name. |
| 2 | string | Owner | This value represents the account id on which current smart contract execution takes place. (For depth=0 it's the target account of the transaction) |
| 3 | string | Caller | Account which initiated the current smart contract execution. On every sub call the current `owner` becomes next caller and the depth is increased by 1. When `depth` is `0` this value is same as `origin`. |
| 4 | string | Method | Smart contract `method` name being currently called by the caller. |
| 5 | string | Origin | Signer of the original transaction which initiated the first smart contract execution (when `depth` was `0`) |

Let's say a client submits a transaction built as follows:
```
target  : "#Target1",
network : "NetworkId",
contract: null,
method  : "my_method",
args    : <Bytes>,
signer  : "#UserAcc"
```

then whatever contract is bound to '#Target1' account (if none, tx fails) will be executed with following CTX:
```json
[
   0,           // depth (initial)
   "NetworkId", // network
   "#Target1",  // owner (tx target)
   "#UserAcc",  // caller (tx signer)
   "my_method", // method (tx method)
   "#UserAcc"   // origin (tx signer)
]
```

If that smart contract makes a subcall with following settings:
```
target: "#Target2",
method: "sub_method",
args  : <Bytes>,
```

Then a smart contract is called on account "#Target2" with following CTX:
```json
[
   1,                // depth (prev + 1)
   "NetworkId",      // network
   "#Target2",       // owner (subcall target)
   "#Target1",       // caller (prev target)
   "sub_method",     // method (subcall method)
   "#UserAcc"        // origin (original tx signer)
]
```

&nbsp;

### Return

Structure returned (not directly, see [Combined pointer](#combined-pointer) section) by exported [`run()`](#runctxaddress-u32-ctxsize-u32-argsaddress-u32-argssize-u32-u64) function after transaction has been processed. It's a mixed type array with a fixed length of 2 elements and is structured as follows:

| Elem index | Type | Name | Description |
|------------|------|------|-------------|
| 0 | bool | success | If `true`, core assumes that transaction as successful and every change made to database over the course of that transaction execution (including eventual sub calls) are to be kept. Otherwise those changes get discarded and database returns to the state immediately preceding that transaction execution. **NOTE:** If during transaction execution sub calls are made, only the original transaction (`depth=0`) return is considered significant by the core. Results of all sub calls must be processed according to the caller smart contract logic and do not influence core's decision on whether to discard changes or keep them. |
| 1 | byte array | result | Result of the transaction. Arbitrary byte array which doesn't get checked by the core. In the case of a failed transaction this field must be set to plain utf-8 encoded error message string. |

&nbsp;

---
[^UP](#basic-concepts)
## Account data

Every TRINCI account is functionally an isolated container for permanent smart contract data storage with [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete "Create, Read, Update and Delete") functionality.

All data of an account is seen by TRINCI node as raw byte arrays. This way a better compatibility is achieved, but the major drawback is that every smart contract can have it's own serialization/data handling logic and a client reading an account's data must know how to interpret such data.

Each TRINCI account has two separate containers for data storage:

![Account](./assets/account.svg)

&nbsp;

### Owner data

This region of account is accessible exclusively to account's own smart contract. It's a key-value storage where a piece of data can be stored and read under a custom key.

In the example above the smart contract linked to `#MyTestAccount`
has stored two pieces of data in it's own database under keys `dataKey1` and `dataKey2`. Those data can be accessed, modified and removed by account's smart contract at any time.

Owner data are managed using following host functions:
- [storeData()](./host_functions.md#storedatakey-string-data-u8-void)
- [loadData()](./host_functions.md#loaddatakey-string-u8)
- [removeData()](./host_functions.md#removedatakey-string-void)
- [getKeys()](./host_functions.md#getkeyspattern-string---string)

### Asset data
This region of account is meant to be used by other accounts to store data. This region is further divided by account which stored data.

> Every smart contract can only access/modify the asset data it stored.

In the diagram above account `#MyTestAccount` has data stored by smart contracts executed on other two accounts: `#Account1` and `#Account2`. Only smart contracts running on those two accounts can access and modify their respective asset data on `#MyTestAccount`.

Asset data are managed using following host functions:
- [storeAsset()](./host_functions.md#storeassetaccountid-string-value-u8-void)
- [loadAsset()](./host_functions.md#loadassetaccountid-string-u8)
- [removeAsset()](./host_functions.md#removeassetaccountid-string-void)

---
[^UP](#basic-concepts)
## Transaction lifecycle

![Transaction lifecycle](./assets/tx_lifecycle.svg)
