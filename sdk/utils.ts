import { Sizer, Decoder,Encoder, Writer } from '@wapc/as-msgpack'
import Types from './types';

namespace Utils {

    /** Combines two 32bit numbers into one 64bit */
    export function combinePtr(offset: u32, length: u32): Types.TCombinedPtr {
        let cPtr: Types.TCombinedPtr = (
            //@ts-ignore
            ((offset as i64) << 32)
            //@ts-ignore
            | (length as i64)
        );
        return cPtr;
    }

    /** Splist a 64bit number into array of two 32bit */
    export function splitPtr(combinedPtr: Types.TCombinedPtr): Types.TCombinedPtrTuple {
        let ptrTuple = new StaticArray<u32>(2);
        ptrTuple = [
            (combinedPtr >> 32) as u32,
            combinedPtr as u32,
        ];
        return ptrTuple;
    }

    /** converts string into an array of bytes */
    export function stringtoU8Array(str: string): u8[] {
        let vec: u8[] = new Array<u8>(str.length);
        for (let i = 0; i < str.length; i++) {
            vec[i] = str.charCodeAt(i) as u8;
        }
        return vec;
    }

    /** converts an array of bytes into string */
    export function u8ArrayToString(u8Arr: u8[]): string {
        let str: string = '';
        for (let i = 0; i < u8Arr.length; i++) {
            str = str.concat(String.fromCharCode(u8Arr[i]));
        }
        return str;
    }

    /** converts u8[] into Uint8Array */
    export function u8ArrayToUint8Array(u8Arr: u8[]): Uint8Array {
        let uint8Arr: Uint8Array = new Uint8Array(u8Arr.length);
        for (let i = 0; i < uint8Arr.length; i++) {
            uint8Arr[i] = u8Arr[i];
        }
        return uint8Arr;
    }

    /** converts Uint8Array into u8[] */
    export function uint8ArrayToU8Array(uint8Arr: Uint8Array): u8[] {
        let u8Arr: u8[] = [];
        for (let i = 0; i < uint8Arr.length; i++) {
            u8Arr.push(uint8Arr[i]);
        }
        return u8Arr;
    }

    /** converts an ArrayBuffer into a 8[] */
    export function arrayBufferToU8Array(arr: ArrayBuffer): u8[] {
        let dataView = new DataView(arr);
        let u8Arr: u8[] = [];
        for (let i = 0; i < arr.byteLength; i++) {
            u8Arr.push(dataView.getUint8(i));
        }
        return u8Arr;
    }

    /** converts a u8[] into an ArrayBuffer */
    export function u8ArrayToArrayBuffer(arr: u8[]): ArrayBuffer {
        return u8ArrayToUint8Array(arr).buffer;
    }

    /** converts an ArrayBuffer into a hexadecimal string */
    export function arrayBufferToHexString(ab: ArrayBuffer): string {
        let result: string = '';
        let dataView = new DataView(ab);
        for (let i = 0; i < dataView.byteLength; i++) {
            let byteStr = dataView.getUint8(i).toString(16);
            for (let i = 0; i < 2 - byteStr.length; i++) {
                byteStr = '0' + byteStr;
            }
            result += byteStr;
        }
        return result;
    }
     /** converts a MessagePack U64 into U64 */
    export function deserializeU64(u8Arr: u8[]): u64 {
        let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
        let decoder = new Decoder(ab);
        return decoder.readUInt64();
    }
    /** converts a U64 into  MessagePack U64 */
    export function serializeU64(value: u64): u8[] {
        let sizer = new Sizer();
        sizer.writeUInt64(value);
        let ab = new ArrayBuffer(sizer.length);
        let encoder = new Encoder(ab);
        encoder.writeUInt64(value);
        return Utils.arrayBufferToU8Array(ab);
    }
}

export default Utils;
