import { encode as mpEncode, decode as mpDecode } from 'msgpack-lite';
import fastSha256 from 'fast-sha256';

export { mpEncode, mpDecode };

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
    return new Uint8Array(mpEncode([success, Buffer.from(result)]))
}

export function getRefHash(dataBuffer: Buffer): string {
    let refHash = `1220${Buffer.from(fastSha256(new Uint8Array(dataBuffer))).toString('hex')}`;
    return refHash;
}