import { Decoder } from '@wapc/as-msgpack';
import Types from './types';
import MemUtils from './memutils';
import Utils from './utils';
import MsgPack from './msgpack';

declare function hf_log(messageAddress: u32, messageLength: u32): void;

declare function hf_load_data(keyAddress: u32, keyLength: u32): Types.TCombinedPtr;

declare function hf_store_data(keyAddress: u32, keyLength: u32, dataAddress: u32, dataLength: u32): void;

declare function hf_remove_data(keyAddress: u32, keyLength: u32): void;

declare function hf_get_keys(patternAddress: u32, patternSize: u32): Types.TCombinedPtr;

declare function hf_load_asset(idAddr: u32, idLength: u32): Types.TCombinedPtr;

declare function hf_store_asset(idAddr: u32, idLength: u32, valueAddr: u32, valueLength: u32): void;

declare function hf_get_account_contract(idAddr: u32, idLength: u32): Types.TCombinedPtr;

declare function hf_sha256(dataAddress: u32, dataLength: u32): Types.TCombinedPtr;

declare function hf_drand(max: u64): Types.TCombinedPtr;

declare function hf_is_callable(accountIdAddress: u32,accountIdLength: u32,methodAddress: u32,methodLength: u32): u8;

declare function hf_call(
    accountIdAddress: u32,
    accountIdLength: u32,
    methodAddress: u32,
    methodLength: u32,
    dataAddress: u32,
    dataLength: u32,
): Types.TCombinedPtr;
declare function hf_s_call(
    accountIdAddress: u32,
    accountIdLength: u32,
    methodAddress: u32,
    methodLength: u32,
    hashAddress: u32,
    hashLength: u32,
    dataAddress: u32,
    dataLength: u32,
): Types.TCombinedPtr;


declare function hf_verify(
    pubKeyAddress: u32,
    pubKeyLength: u32,
    dataAddress: u32,
    dataLength: u32,
    signatureAddress: u32,
    signatureLength: u32,
): u32;

declare function hf_emit(
    eventNameAddress: u32,
    eventNameLength: u32,
    eventDataAddress: u32,
    eventDataLength: u32,
): void;

export namespace HostFunctions {
    /** check if method is callable in targetId account */
    export function is_callable(targetId: string, method: string): bool {
        let targetIdAddress = MemUtils.stringToMem(targetId);
        let methodAddress = MemUtils.stringToMem(method);
        return (hf_is_callable(targetIdAddress,targetId.length,methodAddress,method.length) ==1);
    }
    /** Calls another smart contract method from within a smart contract.
     * @param targetId - account to call
     * @param method - method to call
     * @param data - data to pass as call arguments
    */
    export function call(targetId: string, method: string, data: u8[]): Types.AppOutput {
        let targetIdAddress = MemUtils.stringToMem(targetId);
        let methodAddress = MemUtils.stringToMem(method);
        let dataAddress = MemUtils.u8ArrayToMem(data);
        let combPtr = hf_call(
            targetIdAddress,
            targetId.length,
            methodAddress,
            method.length,
            dataAddress,
            data.length,
        );
        let combPtrTuple = Utils.splitPtr(combPtr);
        return MsgPack.appOutputDecode(
            MemUtils.u8ArrayFromMem(combPtrTuple.offset, combPtrTuple.length)
        )
    }

    /** Calls another smart contract method from within a smart contract just like `call`, but succeeds only if target has passed smart contract bound to it.
     * @param targetId - account to call
     * @param method - method to call
     * @param hash - expected smart contract bound to target
     * @param data - data to pass as call arguments
    */
    export function scall(targetId: string, method: string, hash: string, data: u8[]): Types.AppOutput {
        let targetIdAddress = MemUtils.stringToMem(targetId);
        let methodAddress = MemUtils.stringToMem(method);
        let dataAddress = MemUtils.u8ArrayToMem(data);
        let hashAdress = MemUtils.stringToMem(hash);
        let combPtr = hf_s_call(
            targetIdAddress,
            targetId.length,
            methodAddress,
            method.length,
            hashAdress,
            hash.length,
            dataAddress,
            data.length,
        );
        let combPtrTuple = Utils.splitPtr(combPtr);
        return MsgPack.appOutputDecode(
            MemUtils.u8ArrayFromMem(combPtrTuple.offset, combPtrTuple.length)
        )
    }

    /** Emits a smart contract event. */
    export function emit(eventName: string, eventData: u8[]): void {
        let eventNameAddress = MemUtils.stringToMem(eventName);
        let eventDataAddress = MemUtils.u8ArrayToMem(eventData);
        hf_emit(eventNameAddress, eventName.length, eventDataAddress, eventData.length);
    }

    /** Outputs a log message into nodes logs (debug log level). */
    export function log(message: string): void {
        const address = MemUtils.stringToMem(message);
        hf_log(address, message.length);
    }

    /** Stores data by key into account hosting smart contract. */
    export function storeData(key: string, data: u8[]): void {
        let keyAddr = MemUtils.stringToMem(key);
        let dataAddr = MemUtils.u8ArrayToMem(data);
        hf_store_data(keyAddr, key.length, dataAddr, data.length);
    }

    /**
     * A template wrapper for storeData host function. Performs automatic serialization of classes defined witd '@msgpackable' decorator.
     * @template T - a type decorated with `@msgpackable` decorator.
     * @param key - key under which data will be saved.
     * @param object - object of a class defined with `@msgpackable` decorator.
     */
    export function storeDataT<T>(key: string, object: T): void {
        const byteData = MsgPack.serialize<T>(object);
        return storeData(key,byteData);
    }

    /** Loads data by key from account hosting smart contract. */
    export function loadData(key: string): u8[] {
        const keyAddress = MemUtils.stringToMem(key);
        let combinedPtr = hf_load_data(keyAddress, key.length);
        let ptrTuple = Utils.splitPtr(combinedPtr);
        return MemUtils.u8ArrayFromMem(ptrTuple.offset, ptrTuple.length);
    }

    /**
     * A template wrapper for loadData host function. Performs automatic deserialization of classes decorated witd `@msgpackable`.
     * @template T - a type decorated with `@msgpackable` decorator.
     * @param key - key under which data were be saved.
     */
    export function loadDataT<T>(key: string):T {
        const resultBytes = loadData(key);
        return MsgPack.deserialize<T>(resultBytes);
    }

    /** Removes data by key from account hosting smart contract. */
    export function removeData(key: string): void {
        let keyAddr = MemUtils.stringToMem(key);
        hf_remove_data(keyAddr, key.length);
    }

    /** Get keys list from smart contract owner's accout.
     * @param pattern - pattern string to search. Currently only prefixes are supported. If not empty, has to end with a '\*'. if empty, '*' is assumed, which shows all the keys.
     */
    export function getKeys(pattern: string = '*'): string[] {
        if (pattern.length <= 0) {
            pattern = '*';
        }
        let patternAddress = MemUtils.stringToMem(pattern);
        let combPtr = hf_get_keys(
            patternAddress,
            pattern.length,
        );
        let combPtrTuple = Utils.splitPtr(combPtr);
        let getKeysResult = MsgPack.appOutputDecode(
            MemUtils.u8ArrayFromMem(combPtrTuple.offset, combPtrTuple.length)
        );
        let result: string[] = [];
        if (getKeysResult.success) {
            let decoder = new Decoder(getKeysResult.result);
            let arraySize = decoder.readArraySize();
            for (let i: u32 = 0; i < arraySize; i++) {
                result.push(decoder.readString());
            }
        };
        return result;
    }

    /** Loads asset-specific data from source account. */
    export function loadAsset(sourceId: string): u8[] {
        let idAddress = MemUtils.stringToMem(sourceId);
        let combinedPtr = hf_load_asset(idAddress, sourceId.length);
        let ptrTuple = Utils.splitPtr(combinedPtr);
        return MemUtils.u8ArrayFromMem(ptrTuple.offset, ptrTuple.length);
    }

    /**
     * A template wrapper for loadAsset host function. Performs automatic deserialization of classes defined witd `@msgpackable` decorator.
     * @template T - a type decorated with `@msgpackable` decorator.
     * @param accountId - Account from which you want to load asset-specific data.
     */
    export function loadAssetT<T>(accountId: string): T {
        const resultBytes = loadAsset(accountId);
        return MsgPack.deserialize<T>(resultBytes);
    }

    /** Stores asset-specific data as raw bytes into destination account. */
    export function storeAsset(destId: string, value: u8[]): void {
        let idAddress = MemUtils.stringToMem(destId);
        let valueAddress = MemUtils.u8ArrayToMem(value);
        hf_store_asset(idAddress, destId.length, valueAddress, value.length);
    }

    /**
     * A template wrapper for storeAsset host function. Performs automatic serialization of classes defined witd `@msgpackable` decorator.
     * @template T - a type decorated with `@msgpackable` decorator.
     * @param accountId - Account under which you want to store asset-specific data.
     * @param object - object of a class defined with `@msgpackable` decorator.
     */
    export function storeAssetT<T>(accountId: string, object: T): void {
        const objectBytes = MsgPack.serialize<T>(object);
        return HostFunctions.storeAsset(accountId, objectBytes);    
    }

    /** Returns smart contract associated with given account. */
    export function getAccountContract(accountId: string): string {
        let idAddress = MemUtils.stringToMem(accountId);
        let combinedPtr = hf_get_account_contract(idAddress, accountId.length);
        let ptrTuple = Utils.splitPtr(combinedPtr);
        let resultBytesU8 = MemUtils.u8ArrayFromMem(ptrTuple.offset, ptrTuple.length);
        let resultBytesHex = Utils.arrayBufferToHexString(Utils.u8ArrayToArrayBuffer(resultBytesU8));
        return resultBytesHex;
    }

    /** Computes sha256 from given bytes. */
    export function sha256(data: u8[]): u8[] {
        let dataAddr = MemUtils.u8ArrayToMem(data);
        let combinedPtr = hf_sha256(dataAddr, data.length);
        let ptrTuple = Utils.splitPtr(combinedPtr);
        return MemUtils.u8ArrayFromMem(ptrTuple.offset, ptrTuple.length);
    }

    /** Verify the data signature against provided public key. */
    export function verify(publicKey: Types.PublicKey, data: u8[], signature: u8[]): bool {
        let pubKeyBytes = MsgPack.pubKeyEncode(publicKey);
        let pubKeyAddress = MemUtils.u8ArrayToMem(pubKeyBytes);
        let dataAddress = MemUtils.u8ArrayToMem(data);
        let signatureAddress = MemUtils.u8ArrayToMem(signature);
        return (
            hf_verify(
                pubKeyAddress,
                pubKeyBytes.length,
                dataAddress,
                data.length,
                signatureAddress,
                signature.length,
            ) == 1
        )
    }

    /** returns */
    export function drand(max: u64): u64 {
        return hf_drand(max);
    }
}

export default HostFunctions;