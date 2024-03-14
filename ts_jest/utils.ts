import {
    encode as mpEnc,
    EncoderOptions,
    decode as mpDec,
    DecoderOptions
} from '@msgpack/msgpack';
import fastSha256 from 'fast-sha256';
import { defMsgPackOptions } from './defaults';
import { toHex } from './binConversions';

export function padHexStr(s: string, bytes: number, cutIflonger: boolean = false): string {
    while ( s.length < ( bytes || 2 )) { s = "0" + s;}
    return s;
}

export function splitPointer(combinedPtr: bigint): { offset: number, length: number } {
    let resHolderArray = new BigUint64Array(1);
    resHolderArray.set([combinedPtr]);
    let combinedPtrHexStr = resHolderArray[0].toString(16);
    combinedPtrHexStr = padHexStr(combinedPtrHexStr, 16);
    return {
        offset: parseInt(
            combinedPtrHexStr.substring(0, 8),
            16,
        ),
        length: parseInt(
            combinedPtrHexStr.substring(8),
            16,
        ),
    };
}

export function combinePointer(offset: number, length: number): bigint {
    const offsetHexStr = padHexStr(offset.toString(16), 8);
    const lengthHexStr = padHexStr(length.toString(16), 8);
    return BigInt(`0x${offsetHexStr}${lengthHexStr}`);
}

export function encodeAppOutput(success: boolean, result: Uint8Array): Uint8Array {
    return new Uint8Array(mpEnc([success, result], defMsgPackOptions))
}

export function getRefHash(data: Uint8Array): string {
    let refHash = `1220${toHex(fastSha256(data))}`;
    return refHash;
}

/** Serializes any javascript object into an array of bytes using MsgPack */
export function objectToBytes(obj: any, options: EncoderOptions = defMsgPackOptions): Uint8Array {
    if (typeof obj === 'undefined') {
        throw new Error('Cannot encode "undefined"');
    }
    const result = mpEnc(obj, options);
    return result;
}

/** Deserializes an array of bytes into a plain javascript
 * object using MsgPack */
export function bytesToObject(bytes: Uint8Array, options: DecoderOptions = defMsgPackOptions): any {
    if (!bytes.length) {
        throw new Error('Cannot decode empty byte array.');
    }
    return mpDec(bytes, options);
}