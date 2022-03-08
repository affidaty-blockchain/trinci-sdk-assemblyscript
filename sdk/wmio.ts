import { default as Utils } from './utils';
import { default as MsgPack } from './msgpack';
import { default as Types } from './types';
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
export { Ok, Error, False, Null, True, Some };