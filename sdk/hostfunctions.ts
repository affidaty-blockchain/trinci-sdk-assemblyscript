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
declare function hf_call(
    accountIdAddress: u32,
    accountIdLength: u32,
    methodAddress: u32,
    methodLength: u32,
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
namespace HostFunctions {
    /** call another smart contract method from within a smart contyract */
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
            MemUtils.u8ArrayFromMem(combPtrTuple[0], combPtrTuple[1])
        )
    }

    /** Emits a smart contract event */
    export function emit(eventName: string, eventData: u8[]): void {
        let eventNameAddress = MemUtils.stringToMem(eventName);
        let eventDataAddress = MemUtils.u8ArrayToMem(eventData);
        hf_emit(eventNameAddress, eventName.length, eventDataAddress, eventData.length);
    }

    /** Outputs a log message into nodes logs (debug log level) */
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

    /** Loads data by key from account hosting smart contract. */
    export function loadData(key: string): u8[] {
        const keyAddress = MemUtils.stringToMem(key);
        let combinedPtr = hf_load_data(keyAddress, key.length);
        let ptrTuple = Utils.splitPtr(combinedPtr);
        return MemUtils.u8ArrayFromMem(ptrTuple[0], ptrTuple[1]);
    }

    /** Removes data by key from account hosting smart contract. */
    export function removeData(key: string): void {
        let keyAddr = MemUtils.stringToMem(key);
        hf_remove_data(keyAddr, key.length);
    }

    /** Get keys list from smart contract owner's accout.
     * @param pattern - pattern string to search. Currently only prefixes are supported. If not empty, has to end with a '\*'. if empty, '*' is assumed, which shows all the keys
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
            MemUtils.u8ArrayFromMem(combPtrTuple[0], combPtrTuple[1])
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

    /** Loads asset-specific data from source account */
    export function loadAsset(sourceId: string): u8[] {
        let idAddress = MemUtils.stringToMem(sourceId);
        let combinedPtr = hf_load_asset(idAddress, sourceId.length);
        let ptrTuple = Utils.splitPtr(combinedPtr);
        return MemUtils.u8ArrayFromMem(ptrTuple[0], ptrTuple[1]);
    }

    /** Stores asset-specific data into destination account */
    export function storeAsset(destId: string, value: u8[]): void {
        let idAddress = MemUtils.stringToMem(destId);
        let valueAddress = MemUtils.u8ArrayToMem(value);
        hf_store_asset(idAddress, destId.length, valueAddress, value.length);
    }

    /** Returns smart contract associated with given account. */
    export function getAccountContract(accountId: string): string {
        let idAddress = MemUtils.stringToMem(accountId);
        let combinedPtr = hf_get_account_contract(idAddress, accountId.length);
        let ptrTuple = Utils.splitPtr(combinedPtr);
        let resultBytesU8 = MemUtils.u8ArrayFromMem(ptrTuple[0], ptrTuple[1]);
        let resultBytesHex = Utils.arrayBufferToHexString(Utils.u8ArrayToArrayBuffer(resultBytesU8));
        return resultBytesHex;
    }

    /** Computes sha256 from given bytes. */
    export function sha256(data: u8[]): u8[] {
        let dataAddr = MemUtils.u8ArrayToMem(data);
        let combinedPtr = hf_sha256(dataAddr, data.length);
        let ptrTuple = Utils.splitPtr(combinedPtr);
        return MemUtils.u8ArrayFromMem(ptrTuple[0], ptrTuple[1]);
    }

    /** Verify the data signature against provided public key */
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