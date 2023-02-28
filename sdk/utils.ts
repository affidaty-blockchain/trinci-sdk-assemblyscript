import Types from './types';

export namespace Utils {

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

    /** Splits a 64bit number into array of two 32bit*/
    export function splitPtr(combinedPtr: Types.TCombinedPtr): Types.TCombinedPtrTuple {
        const ptrTuple: Types.TCombinedPtrTuple = {
            offset: (combinedPtr >> 32) as u32,
            length: combinedPtr as u32,
        };
        return ptrTuple;
    }

    /** Converts string into an array of bytes */
    export function stringToU8Array(str: string): u8[] {
        let vec: u8[] = new Array<u8>(str.length);
        for (let i = 0; i < str.length; i++) {
            vec[i] = str.charCodeAt(i) as u8;
        }
        return vec;
    }
    
     /** converts an arrayBuffer into string */
    export function arrayBufferToString(arr:ArrayBuffer):string {
        return u8ArrayToString(arrayBufferToU8Array(arr));
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

    /**
     * Method that allows to split an amount into multiple parts according to passed proportions.
     * @param value - value to split
     * @param partsArray - array representing proportion values. [3, 3, 5] means that total amount will be divided in 3 parts: 3/11, 3/11 and 5/11
     * @returns array representing amounts relative to each member of the "partsArray" in the same order. If fractionsArray sum causes overflow (sum is greater than U64.MAX_VALUE) then an empty array is returned.
     * @example divideAmount(200, [9, 6, 15]) => [60, 40, 100]
     */
    export function divideAmount(amount: u64, fractionsArray: u64[]): u64[] {
        let result: u64[] = [];

        // check for overflow (fractions sum exceeds U64.MAX_VALUE)
        let remMax: u64 = U64.MAX_VALUE;
        for (let i: i32 = 0; i < fractionsArray.length; i++) {
            if (fractionsArray[i]> remMax) {
                return result;
            }
            remMax -= fractionsArray[i];
        }

        const fractionsSum = fractionsArray.reduce((acc: u64, next: u64) => acc + next, 0);
        result = new Array<u64>(fractionsArray.length);
        for(let i: i32 = 0; i < fractionsArray.length; i++) {
            result[i] = (amount * fractionsArray[i]) / fractionsSum;
        }
        const resultSum: u64 = result.reduce((acc: u64, next: u64) => acc + next, 0);
        const remainder: u64 = amount - resultSum;
        result[0] += remainder;
        return result;
    }
}

export default Utils;
