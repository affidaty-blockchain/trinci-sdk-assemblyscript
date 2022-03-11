import { default as Utils } from './utils';
import { default as MsgPack } from './msgpack';
import { default as Types } from './types';
import { default as HostFunctions } from './hostfunctions';
/**
 * Return a TCombinedPtr that contains success and other data in bytearray
 *
 * @param {number[]} resultBytes
 * @return {*} 
 */
function Ok(resultBytes:number[]):Types.TCombinedPtr { return MsgPack.appOutputEncode(true, resultBytes); }
/**
 * Return a TCombinedPtr that contains unsucces and string message about error
 *
 * @param {string} message
 * @return {*}  {Types.TCombinedPtr}
 */
function Error(message:string):Types.TCombinedPtr { return MsgPack.appOutputEncode(false, Utils.stringtoU8Array(message)); }
/**
 * Return a TCombinedPtr that contains success and true in MessagePack
 *
 * @return {*}  {Types.TCombinedPtr}
 */
function True():Types.TCombinedPtr { return MsgPack.appOutputEncode(true, [195]); } // true in messagepack
/**
 * Return a TCombinedPtr that contains success and false in MessagePack
 *
 * @return {*}  {Types.TCombinedPtr}
 */

function False():Types.TCombinedPtr { return MsgPack.appOutputEncode(true, [194]); } // false in messagepack
/**
 * Return a TCombinedPtr that contains success and null in MessagePack
 *
 * @return {*}  {Types.TCombinedPtr}
 */

function Null():Types.TCombinedPtr { return MsgPack.appOutputEncode(true, [192]); } // null in messagepack
/**
 * Return true in case of some LoadData or Load Asset found some data inside a relative database cell
 *
 * @param {number[]} data
 * @return {*}  {boolean}
 */
function Some(data:number[]):boolean { return data.length > 0;  } // null in messagepack
/**
 * wrapper of HostFunction.storeData
 * storeData in owner account using generics, this function take care about MessagePack conversion
 *
 * @template T
 * @param {string} key
 * @param {T} data
 * @return {*}  {void}
 */
function storeData<T>(key: string, data: T): void {
    const byteData = MsgPack.serialize<T>(data);
    return HostFunctions.storeAsset(key,byteData);
}

/**
 * wrapper of HostFunction.loadData
 * loadData from owner account using generics, this function take care about MessagePack conversion
 * @template T
 * @param {string} key
 * @return {*}  {T}
 */
function loadData<T>(key: string):T {
    const bytesResult = HostFunctions.loadData(key);
    return MsgPack.deserialize<T>(bytesResult);
}
/**
 * wrapper of HostFunction.removeData
 *
 * @param {string} key
 * @return {*}  {void}
 */
function removeData(key: string): void {
    return HostFunctions.removeData(key);
}

/**
 * wrapper of HostFunction.storeAsset
 * storeAsset in any accountID handle by owner using generics, this function take care about MessagePack conversion
 * @template T
 * @param {string} accountId
 * @param {T} value
 * @return {*}  {void}
 */
function storeAsset<T>(accountId: string, value: T): void {
    const byteData = MsgPack.serialize<T>(value);
    return HostFunctions.storeAsset(accountId,byteData);    
}

/**
 * wrapper of HostFunction.loadAsset
 * loadAsset from any accountID handle by owner using generics, this function take care about MessagePack conversion
 * @template T
 * @param {string} accountId
 * @return {*}  {T}
 */
function loadAsset<T>(accountId: string): T {
    const bytesResult = HostFunctions.loadAsset(accountId);
    return MsgPack.deserialize<T>(bytesResult);
}



export { Ok, Error, False, Null, True, Some , storeData, loadData , removeData , loadAsset , storeAsset };