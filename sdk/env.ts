import { AppOutput, PublicKey } from './types';
import { splitPtr } from './utils';
import {
    storeData as storeDataToMem,
    loadData as loadDataFromMem,
} from './memUtils';
import * as MsgPack from './msgpack';

// =================================================================================================
// Functions imported from host
declare function hf_log(msgOff: u32, msgLen: u32): void;
declare function hf_load_data(keyOff: u32, keyLen: u32): u64;
declare function hf_store_data(keyOff: u32, keyLen: u32, dataOff: u32, dataLen: u32): void;
declare function hf_remove_data(keyOff: u32, keyLen: u32): void;
declare function hf_get_keys(patternOff: u32, patternLen: u32): u64;
declare function hf_load_asset(accIdOff: u32, accIdLen: u32): u64;
declare function hf_store_asset(accIdOff: u32, accIdLen: u32, dataOff: u32, dataLen: u32): void;
declare function hf_remove_asset(accIdOff: u32, accIdLen: u32): void;
declare function hf_get_account_contract(accIdOff: u32, accIdLen: u32): u64;
declare function hf_sha256(dataOff: u32, dataLen: u32): u64;
declare function hf_drand(max: u64): u64;
declare function hf_get_block_time(): u64;
declare function hf_is_callable(accIdOff: u32, accIdLen: u32,methodOff: u32,methodLen: u32): u8;
declare function hf_call(accountOff: u32, accountLen: u32, methodOff: u32, methodLen: u32, dataOff: u32, dataLen: u32): u64;
declare function hf_s_call(accIdOff: u32, accIdLen: u32, hashOff: u32, hashLen: u32, methodOff: u32, methodLen: u32, dataOff: u32, dataLen: u32): u64;
declare function hf_verify(pubKeyOff: u32, pubKeyLen: u32, dataOff: u32, dataLen: u32, signatureOff: u32, signatureLen: u32): u32;
declare function hf_emit(eventNameOff: u32, eventNameLen: u32, eventDataOff: u32, eventDataLen: u32): void;

// =================================================================================================
// Internal wrappers

/** Outputs a log message into trinci node logs (debug log level) */
export function log(message: string): void {
    const ab = String.UTF8.encode(message);
    hf_log(storeDataToMem(ab), ab.byteLength);
}

/** Loads data by key from account hosting current smart contract instance */
export function loadData(key: string): ArrayBuffer {
    if (key.length <= 0) return new ArrayBuffer(0);
    const keyAb = String.UTF8.encode(key);
    return loadDataFromMem(
        splitPtr(
            hf_load_data(storeDataToMem(keyAb), keyAb.byteLength),
        ).offset,
    );
}

/** Stores (or updates) data by key into account hosting current
 * smart contract instance
 */
export function storeData(key: string, data: ArrayBuffer): void {
    if (key.length <= 0) return;
    const keyAb = String.UTF8.encode(key);
    hf_store_data(
        storeDataToMem(keyAb),
        keyAb.byteLength,
        storeDataToMem(data),
        data.byteLength,
    );
}

/** Removes data by key from account hosting current
 * smart contract instance
 */
export function removeData(key: string): void {
    if (key.length <= 0) return;
    const keyAb = String.UTF8.encode(key);
    hf_remove_data(storeDataToMem(keyAb), keyAb.byteLength);
}

/** Get keys list from smart contract owner's account
 * @param pattern - pattern string to search. Currently only prefixes are supported. If not empty, has to end with a '\*'. If empty, '*' is assumed, which shows all the keys
 */
export function getKeys(pattern: string = '*'): string[] {
    let patternAb: ArrayBuffer;
    if (pattern.length <= 0) {
        patternAb = changetype<ArrayBuffer>(([0x2a] as u8[]).dataStart); // '*'
    } else {
        patternAb = String.UTF8.encode(pattern);
    }

    const getKeysResult = MsgPack.deserializeAppOutput(
        loadDataFromMem(
            splitPtr(
                hf_get_keys(
                    storeDataToMem(patternAb),
                    patternAb.byteLength,
                )
            ).offset
        )
    );
    const result = MsgPack.deserializeInternalType<string[]>(getKeysResult.execResult);

    if (MsgPack.isError()) return new Array<string>(0);

    return result;
}

/** Loads asset-specific data from source account */
export function loadAsset(accountId: string): ArrayBuffer {
    if (accountId.length <= 0) return new ArrayBuffer(0);
    const accountIdAb = String.UTF8.encode(accountId);
    return loadDataFromMem(
        splitPtr(hf_load_asset(storeDataToMem(accountIdAb), accountIdAb.byteLength)).offset,
    );
}

/** Stores asset-specific data as raw bytes into destination account */
export function storeAsset(accountId: string, newValue: ArrayBuffer): void {
    if (accountId.length <= 0) return;
    const accountIdAb = String.UTF8.encode(accountId);
    hf_store_asset(
        storeDataToMem(accountIdAb),
        accountIdAb.byteLength,
        storeDataToMem(newValue),
        newValue.byteLength,
    );
}

/** Allows to completely remove asset-specific data from an account */
export function removeAsset(accountId: string): void {
    if (accountId.length <= 0) return;
    const accountIdAb = String.UTF8.encode(accountId);
    hf_remove_asset(storeDataToMem(accountIdAb), accountIdAb.byteLength);
}

/** Returns smart contract hash as bytes associated with given account */
export function getAccountContract(accountId: string): ArrayBuffer {
    if (accountId.length <= 0) return new ArrayBuffer(0);
    const accountIdAb = String.UTF8.encode(accountId);
    let ptrTuple = splitPtr(hf_get_account_contract(storeDataToMem(accountIdAb), accountIdAb.byteLength));
    if (ptrTuple.length <= 0) {
        return new ArrayBuffer(0);
    }
    return loadDataFromMem(ptrTuple.offset);
}

/** Computes sha256 from given bytes */
export function sha256(data: ArrayBuffer): ArrayBuffer {
    return loadDataFromMem(splitPtr(hf_sha256(
        storeDataToMem(data),
        data.byteLength,
    )).offset);
}

/** Returns "deterministic random" value in range 0-max (inclusive). The returned value depends on the current state of the blockchain and will be the same across all nodes if called at the same point of blockchain history. */
export function drand(max: u64): u64 {
    return hf_drand(max);
}

/** Returns last accepted block timestamp value (UNIX Epoch) */
export function getLastBlockTime(): u64 {
    return hf_get_block_time();
}

/** Checks if a method is callable on targetId account */
export function isCallable(accountId: string, method: string): bool {
    if (accountId.length <= 0 || method.length <= 0) return false;
    const accountIdAb = String.UTF8.encode(accountId);
    const methodAb = String.UTF8.encode(method);
    return (hf_is_callable(
        storeDataToMem(accountIdAb),
        accountIdAb.byteLength,
        storeDataToMem(methodAb),
        methodAb.byteLength,
    ) == 1);
}

/** Calls another smart contract method from within a smart contract
 * @param accountId - account to call
 * @param method - method to call
 * @param args - data to pass as call arguments
*/
export function call(accountId: string, method: string, args: ArrayBuffer = new ArrayBuffer(0)): AppOutput {
    const accountIdAb = String.UTF8.encode(accountId);
    const methodAb = String.UTF8.encode(method);
    return MsgPack.deserializeAppOutput(loadDataFromMem(splitPtr(hf_call(
        storeDataToMem(accountIdAb),
        accountIdAb.byteLength,
        storeDataToMem(methodAb),
        methodAb.byteLength,
        storeDataToMem(args),
        args.byteLength,
    )).offset));
}

/** Calls another smart contract method from within a smart contract just like `call`, but succeeds only if target has passed smart contract bound to it.
 * @param accountId - account to call
 * @param method - method to call
 * @param contractHash - expected smart contract bound to target
 * @param args - data to pass as call arguments
*/
export function scall(accountId: string, method: string, contractHash: ArrayBuffer, args: ArrayBuffer = new ArrayBuffer(0)): AppOutput {
    const accountIdAb = String.UTF8.encode(accountId);
    const methodAb = String.UTF8.encode(method);
    return MsgPack.deserializeAppOutput(
        loadDataFromMem(
            splitPtr(
                hf_s_call(
                    storeDataToMem(accountIdAb),
                    accountIdAb.byteLength,
                    storeDataToMem(contractHash),
                    contractHash.byteLength,
                    storeDataToMem(methodAb),
                    methodAb.byteLength,
                    storeDataToMem(args),
                    args.byteLength,
                )
            ).offset
        )
    );
}

/** Emits a smart contract event. */
export function emit(eventName: string, eventData: ArrayBuffer): void {
    const eventNameAb = String.UTF8.encode(eventName);
    hf_emit(
        storeDataToMem(eventNameAb),
        eventNameAb.byteLength,
        storeDataToMem(eventData),
        eventData.byteLength,
    );
}

/** Verify the data signature against provided public key. */
export function verify(publicKey: PublicKey, data: ArrayBuffer, signature: ArrayBuffer): bool {
    let pubKeyAb = MsgPack.serializePublicKey(publicKey);
    return (
        hf_verify(
            storeDataToMem(pubKeyAb),
            pubKeyAb.byteLength,
            storeDataToMem(data),
            data.byteLength,
            storeDataToMem(signature),
            signature.byteLength,
        ) == 1
    )
}
