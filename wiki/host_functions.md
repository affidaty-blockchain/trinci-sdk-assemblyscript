[<BACK](index)
# Host Functions

Below are some basic concepts which apply to every smart contract on TRINCI platform independently of programming languages those contracts are written in.

---

- [Imports](#imports)
   - [`hf_log()`](#hf_logmessageaddress-u32-messagelength-u32-void)
   - [`hf_load_data()`](#hf_load_datakeyaddress-u32-keylength-u32-u64)
   - [`hf_store_data()`](#hf_store_datakeyaddress-u32-keylength-u32-dataaddress-u32-datalength-u32-void)
   - [`hf_remove_data()`](#hf_remove_datakeyaddress-u32-keylength-u32-void)
   - [`hf_get_keys()`](#hf_get_keyspatternaddress-u32-patternsize-u32-typestcombinedptr)
   - [`hf_load_asset()`](#hf_load_assetidaddr-u32-idlength-u32-typestcombinedptr)
   - [`hf_store_asset()`](#hf_store_assetidaddr-u32-idlength-u32-valueaddr-u32-valuelength-u32-void)
   - [`hf_remove_asset()`](#hf_remove_assetidaddr-u32-idlength-u32-void)
   - [`hf_get_account_contract()`](#hf_get_account_contractidaddr-u32-idlength-u32-typestcombinedptr)
   - [`hf_sha256()`](#hf_sha256dataaddress-u32-datalength-u32-typestcombinedptr)
   - [`hf_drand()`](#hf_drandmax-u64-typestcombinedptr)
   - [`hf_is_callable()`](#hf_is_callableaccountidaddress-u32accountidlength-u32methodaddress-u32methodlength-u32-u8)
   - [`hf_get_block_time()`](#hf_get_block_time-u64)
   - [`hf_call()`](#hf_callaccountidaddress-u32-accountidlength-u32-methodaddress-u32-methodlength-u32-dataaddress-u32-datalength-u32-typestcombinedptr)
   - [`hf_s_call()`](#hf_s_call)
   - [`hf_verify()`](#hf_verifypubkeyaddress-u32-pubkeylength-u32-dataaddress-u32-datalength-u32-signatureaddress-u32-signaturelength-u32-u32)
   - [`hf_emit()`](#hf_emiteventnameaddress-u32-eventnamelength-u32-eventdataaddress-u32-eventdatalength-u32-void)

&nbsp;

- [Wrappers](#wrappers)

   - [`log()`](#logmessage-string-void)
   - [`storeData()`](#storedatakey-string-data-u8-void)
   - [`storeDataT<T>()`](#storedatattkey-string-object-t-void)
   - [`loadData()`](#loaddatakey-string-u8)
   - [`loadDataT<T>()`](#loaddatattkey-string-t)
   - [`removeData()`](#removedatakey-string-void)
   - [`storeAsset()`](#storeassetaccountid-string-value-u8-void)
   - [`storeAssetT<T>()`](#storeassetttaccountid-string-object-t-void)
   - [`loadAsset()`](#loadassetaccountid-string-u8)
   - [`loadAssetT<T>()`](#loadassetttaccountid-string-t)
   - [`removeAsset()`](#removeassetaccountid-string-void)
   - [`getKeys()`](#getkeyspattern-string---string)
   - [`isCallable()`](#iscallabletargetid-string-method-string-bool)
   - [`call()`](#calltargetid-string-method-string-data-u8-typesappoutput)
   - [`scall()`](#scalltargetid-string-method-string-contracthash-u8-data-u8-typesappoutput)
   - [`emit()`](#emiteventname-string-eventdata-u8-void)
   - [`getAccountContract()`](#getaccountcontractaccountid-string-string)
   - [`sha256()`](#sha256data-u8-u8)
   - [`verify()`](#verifypublickey-typespublickey-data-u8-signature-u8-bool)
   - [`drand()`](#drandmax-u64-u64)
   - [`getBlockTime()`](#getblocktime-u64)

---
[^UP](#host-functions)
## Imports

Imports are actual low-level functions which get imported into wasm module during smart contract. At smart contract level they are declared as external functions and are implemented on the core side. Those functions can accept/return only numbers.

### `hf_log(messageAddress: u32, messageLength: u32): void`

For this to actually work, TRINCI node must be launched with "debug" log level.
It allows you to print a message string as a node log message.
Message must be utf-8 encoded.

&nbsp;

### `hf_load_data(keyAddress: u32, keyLength: u32): u64`

Allows to load previously saved data on own account (owner data section) under a given key.
Returns combined pointer to byte array. If key does not exist the returned array is empty.
Key string must be utf-8 encoded.

&nbsp;

### `hf_store_data(keyAddress: u32, keyLength: u32, dataAddress: u32, dataLength: u32): void`

Allows to store data on own account (owner data section) under a given key. It is possible to create empty keys, passing zero length byte array.
Key string must be utf-8 encoded.
Data is a raw byte array.


&nbsp;

### `hf_remove_data(keyAddress: u32, keyLength: u32): void`

Allows to remove previously saved data on own account (owner data section) under a given key.
Key string must be utf-8 encoded.

&nbsp;

### `hf_get_keys(patternAddress: u32, patternSize: u32): Types.TCombinedPtr`

Allows to view keys in owner data of the account. Returns combined pointer to messagepack encoded array of strings listing all existing keys matching a specific pattern. Pattern can end with a `*`, in which case function returns list of all keys which starts with exact pattern string preceding `*`.

Example: if an account has keys `testKey1`, `testKey2` and `myKey` and pattern string is `test*`, then only `testKey1` and `testKey2` are returned.

If pattern string contains only `*` - all keys are returned.
If pattern does not contain `*` - only the exact match is returned, allowing to check for existense of a specific key.

Pattern string must be utf-8 encoded.

&nbsp;

### `hf_load_asset(idAddr: u32, idLength: u32): Types.TCombinedPtr`

Allows to load asset data previously saved on a foreigh account
Returns combined pointer to byte array. If data do not exist the returned array is empty.

Account string must be utf-8 encoded.

&nbsp;

### `hf_store_asset(idAddr: u32, idLength: u32, valueAddr: u32, valueLength: u32): void`

Allows to store asset data on a foreigh account.
Account string must be utf-8 encoded.
Data is a raw byte array.

&nbsp;

### `hf_remove_asset(idAddr: u32, idLength: u32): void`

Allows to completely remove this account's asset data on a foreigh account.
Account string must be utf-8 encoded.

&nbsp;

### `hf_get_account_contract(idAddr: u32, idLength: u32): Types.TCombinedPtr`

Allows to check what smart contract (if any) is linked to a specific account.

Account string must be utf-8 encoded.
Returns raw byte array representing smart contract hash.
If account has no linked smart contract then an empty byte array is returned.

&nbsp;

### `hf_sha256(dataAddress: u32, dataLength: u32): Types.TCombinedPtr`

Returns raw byte array representing SHA-256 hash of given data.

&nbsp;

### `hf_drand(max: u64): u64`
Deterministic random generator. Returns an integer between 0 and max
See drand explanation in basic TRINCI documentation.
In this case both passed and returned values are actually wanted numbers and not pointers to memory regions.

&nbsp;

### `hf_is_callable(accountIdAddress: u32,accountIdLength: u32,methodAddress: u32,methodLength: u32): u8`

Check whether a method can be called on a specific account.
Account string must be utf-8 encoded.

&nbsp;

### `hf_get_block_time(): u64`

Returns current block time as UNIX Epoch.


&nbsp;

### `hf_call(accountIdAddress: u32, accountIdLength: u32, methodAddress: u32, methodLength: u32, dataAddress: u32, dataLength: u32): Types.TCombinedPtr`

Allows to make subsequent smart contract calls from within another smart contract.

&nbsp;

### `hf_s_call(accountIdAddress: u32, accountIdLength: u32, hashAddress: u32, hashLength: u32, methodAddress: u32, methodLength: u32, dataAddress: u32, dataLength: u32): Types.TCombinedPtr`

Works just like `hf_call()` described above but allows to define smart contract hash expected to be bound to target account. In case there is no contract or it's different from the expected one this function returns an error

&nbsp;

### `hf_verify(pubKeyAddress: u32, pubKeyLength: u32, dataAddress: u32, dataLength: u32, signatureAddress: u32, signatureLength: u32): u32`

Allows to verify data signatures.

&nbsp;

### `hf_emit(eventNameAddress: u32, eventNameLength: u32, eventDataAddress: u32, eventDataLength: u32): void;`

Emits a transaction event.
Transaction events can be captured in two ways:
 - Connecting connecting to node bridge port (real time)
 - View all transaction events inside transaction receipt.

&nbsp;

---
[^UP](#host-functions)
## Wrappers

For ease of use of host functions a number of wrappers have been implemented. All of them are grouped into `HostFunction` namespace
and can be imported using

```ts
import { HostFunctions } from './sdk';
```

Following wrappers are present:  
&nbsp;

### `log(message: string): void`

Outputs a log message into node logs (only if launched with debug log level)

&nbsp;

### `storeData(key: string, data: u8[]): void`

Stores data under a specific key into owner data of the account hosting smart contract

&nbsp;

### `storeDataT<T>(key: string, object: T): void`

Just as storeData() above, but accepts classes decorated with [`@msgpackable` decorator](./messagepack.md#class-decorator)

&nbsp;

### `loadData(key: string): u8[]`

Loads data from a key. If key does not exist, returns empty array.

&nbsp;

### `loadDataT<T>(key: string): T`

Just like `loadData()`above, but allows to retrieve data with automatic deserialization into a class decorated with [`@msgpackable` decorator](./messagepack.md#class-decorator)

&nbsp;

### `removeData(key: string): void`

Removes data by key from account hosting smart contract.

&nbsp;

### `storeAsset(accountId: string, value: u8[]): void`

Stores asset-specific data as raw bytes into destination account.

&nbsp;

### `storeAssetT<T>(accountId: string, object: T): void`

Same as above, but also performs automatic serialization of classes decorated with [`@msgpackable` decorator](./messagepack.md#class-decorator).

&nbsp;

### `loadAsset(accountId: string): u8[]`

Loads asset-specific data from source account.

&nbsp;

### `loadAssetT<T>(accountId: string): T`

Same as above, but also performs automatic deserialization of classes decorated with [`@msgpackable` decorator](./messagepack.md#class-decorator).

&nbsp;

### `removeAsset(accountId: string): void`

Allows to completely remove asset-specific data from an account.

&nbsp;

### `getKeys(pattern: string = '*'): string[]`

Get keys list from smart contract owner's account.

&nbsp;

### `isCallable(targetId: string, method: string): bool`

Check if method is callable in targetId account

&nbsp;

### `call(targetId: string, method: string, data: u8[]): Types.AppOutput`

Calls another smart contract method from within a smart contract

&nbsp;

### `scall(targetId: string, method: string, contractHash: u8[], data: u8[]): Types.AppOutput`

Calls another smart contract method from within a smart contract just like `call`, but succeeds only if target has passed smart contract bound to it.

&nbsp;

### `emit(eventName: string, eventData: u8[]): void`

Emits a smart contract event.

&nbsp;

### `getAccountContract(accountId: string): string`

Returns smart contract associated with given account.

&nbsp;

### `sha256(data: u8[]): u8[]`

Computes sha256 from given bytes.

&nbsp;

### `verify(publicKey: Types.PublicKey, data: u8[], signature: u8[]): bool`

Allows to verify data signature.

&nbsp;

### `drand(max: u64): u64`

Deterministic random generator.

&nbsp;

### `getBlockTime(): u64`

Returns current block time as UNIX Epoch.

&nbsp;
