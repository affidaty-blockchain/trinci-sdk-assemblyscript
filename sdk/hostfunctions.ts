import Types from './types';
import MemUtils from './memutils';
import Utils from './utils';

declare function hf_log(messageAddress: u32, messageLength: u32): void;
declare function hf_load_data(keyAddress: u32, keyLength: u32): Types.TCombinedPtr;
declare function hf_store_data(keyAddress: u32, keyLength: u32, dataAddress: u32, dataLength: u32): void;
declare function hf_remove_data(keyAddress: u32, keyLength: u32): void;
declare function hf_load_asset(idAddr: u32, idLength: u32): Types.TCombinedPtr;
declare function hf_store_asset(idAddr: u32, idLength: u32, valueAddr: u32, valueLength: u32): void;
declare function  hf_call(
    accountIdAddress: u32,
    accountIdLength: u32,
    methodAddress: u32,
    methodLength: u32,
    dataAddress: u32,
    dataLength: u32,
): Types.TCombinedPtr;
// declare function  hf_verify(
//     pubKeyAddress: u32,
//     pubKeyLength: u32,
//     dataAddress: u32,
//     dataLength: u32,
//     signatureAddress: u32,
//     signatureLength: u32,
// ): u32;
namespace HostFunctions {
    // // Verify the signature of the given data by the given pk and algorithm
    // export function verify(publicKey: &PublicKey, data: &[u8], sign: &[u8]) -> bool {
    //     let pk = match rmp_serialize(&pk) {
    //         Ok(val) => val,
    //         Err(_) => return false,
    //     };
    //     let pk_addr = slice_to_mem(&pk);
    //     let data_addr = slice_to_mem(data);
    //     let sign_addr = slice_to_mem(sign);

    //     unsafe {
    //         hf_verify(
    //             pk_addr,
    //             pk.len() as i32,
    //             data_addr,
    //             data.len() as i32,
    //             sign_addr,
    //             sign.len() as i32,
    //         ) == 1
    //     }
    // }

    /** call another smart contract method from within a smart contyract */
    export function call(targetId: string, method: string, data: u8[]): u8[] {
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
        return MemUtils.u8ArrayFromMem(combPtrTuple[0], combPtrTuple[1]);
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
}

export default HostFunctions;