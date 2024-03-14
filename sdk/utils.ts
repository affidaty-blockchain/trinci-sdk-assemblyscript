import { CombinedPtrTuple } from './types';

/** Combines two u32 values into a single u64.
 * This is the value that must be returned to the host from the exported `run()` function.
 */
export function combinePtr(offset: u32, length: u32): u64 {
    return (((offset as u64) << 32) | (length as u64));
}

/** Splits a 64bit number into 32bit values: offset and length*/
export function splitPtr(combinedPtr: u64): CombinedPtrTuple {
    return new CombinedPtrTuple((combinedPtr >> 32) as u32, combinedPtr as u32);
}

/**ArrayBuffer compare.  
 * At first byte length gets compared. if a.len > b.len, then a > b  
 * Then all bytes (if any) get cycled until first difference is found; if a[i] > b[i], then a > b
 * @return `-1` if a < b; `0` if a == b; `1` if a > b;
 */
export function abCompare(aPtr: u32, bPtr: u32): i8 {
    const aLen: u32 = changetype<ArrayBuffer>(aPtr).byteLength;
    const bLen: u32 = changetype<ArrayBuffer>(bPtr).byteLength;

    const lenDiff: i64 = (aLen as i64) - (bLen as i64);
    if (lenDiff > 0) { // a.len > b.len
        return 1;
    } else if (lenDiff < 0) { // a.len < b.lens
        return -1;
    }

    // // if lengths are the same check bytes
    if (aLen == 0) return 0; // no need to check if empty
    for (let i: u32 = 0; i < aLen; i++) {
        const byteDiff = (load<u8>(aPtr + i) - load<u8>(bPtr + i)) as i16;
        if (byteDiff > 0) { // a[i] > b[i]
            return 1;
        } else if (byteDiff < 0) { // a[i] < b[i]
            return -1;
        }
    }

    // if we are here then arrays must be equal
    return 0;
}

/** Converts an ArrayBuffer into a hexadecimal string representing that array */
export function arrayBufferToHexString(ab: ArrayBuffer): string {
    let result: string = '';
    let dataView = new DataView(ab);
    for (let i = 0; i < dataView.byteLength; i++) {
        result += dataView.getUint8(i).toString(16).padStart(2, '0');
    }
    return result;
}

/** Converts an ArrayBuffer into an array of u8 values */
export function arrayBufferToU8Array(buffer: ArrayBuffer): u8[] {
    let dataView = new DataView(buffer);
    let result: u8[] = new Array<u8>(buffer.byteLength);
    for (let i = 0; i < buffer.byteLength; i++) {
        result[i] = dataView.getUint8(i);
    }
    return result;
}

/** Converts an array of u8 values into an ArrayBuffer */
export function u8ArrayToArrayBuffer(arr: u8[]): ArrayBuffer {
    let uint8Arr: Uint8Array = new Uint8Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
        uint8Arr[i] = arr[i];
    }
    return uint8Arr.buffer;
}

/**
 * Method that allows to split an amount into multiple parts according to passed proportions.  
 * If there is any remainder it will be inserted as last element of the array so that resulting array will have an extra element at the end.  
 * If fractions sum exceeds u64 max value (overflow) an empty array will be returned
 * @param amount - value to split
 * @param fractionsArray - array representing proportion values. [3, 3, 5] means that total amount will be divided in 3 parts: 3/11, 3/11 and 5/11
 * @returns array representing amounts relative to each member of the "partsArray" in the same order. If fractionsArray sum causes overflow (sum is greater than U64.MAX_VALUE) then an empty array is returned.
 * @example divideAmount(200, [9, 6, 15]) => [60, 40, 100]
 */
export function divideAmount(amount: u64, fractionsArray: u64[]): u64[] {
    let result: u64[] = new Array<u64>(fractionsArray.length).fill(0);

    if (amount <= 0) return result;

    // summing fractions with overflow check (fractions sum exceeds U64.MAX_VALUE)
    let remainingMaxSum: u64 = U64.MAX_VALUE;
    let fractionsSum: u64 = 0;
    for (let i = 0; i < fractionsArray.length; i++) {
        if (fractionsArray[i] > remainingMaxSum) {
            return new Array<u64>(0);
        }
        fractionsSum += fractionsArray[i];
        remainingMaxSum -= fractionsArray[i];
    }

    let resultsSum: u64 = 0;
    for(let i: i32 = 0; i < fractionsArray.length; i++) {
        result[i] = (amount * fractionsArray[i]) / fractionsSum;
        resultsSum += result[i];
    }
    const remainder: u64 = amount - resultsSum;

    // push remainder if any
    if (remainder > 0) result.push(remainder);

    return result;
}
