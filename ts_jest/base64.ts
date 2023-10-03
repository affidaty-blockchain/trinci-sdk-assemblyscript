/* eslint no-bitwise: 0 */

function b64ToUint6(nChr: number): number {
    if (nChr > 64 && nChr < 91) return nChr - 65;
    if (nChr > 96 && nChr < 123) return nChr - 71;
    if (nChr > 47 && nChr < 58) return nChr + 4;
    if (nChr === 43) return 62;
    if (nChr === 47) return 63;
    return 0;
}

export function base64Dec(b64Str: string): Uint8Array {
    // Remove any non-b64 characters, such as trailing "=", whitespace etc...
    const sB64Enc = b64Str.replace(/[^A-Za-z0-9+/]/g, '');
    const nInLen = sB64Enc.length;
    const nOutLen = (nInLen * 3 + 1) >> 2;
    const taBytes = new Uint8Array(nOutLen);
    let nMod3: number;
    let nMod4: number;
    let nUint24: number = 0;
    let nOutIdx: number = 0;
    for (let nInIdx = 0; nInIdx < nInLen; nInIdx += 1) {
        nMod4 = nInIdx & 3;
        nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << (6 * (3 - nMod4));
        if (nMod4 === 3 || nInLen - nInIdx === 1) {
            nMod3 = 0;
            while (nMod3 < 3 && nOutIdx < nOutLen) {
                taBytes[nOutIdx] = (nUint24 >>> ((16 >>> nMod3) & 24)) & 255;
                nMod3 += 1;
                nOutIdx += 1;
            }
            nUint24 = 0;
        }
    }
    return taBytes;
}

function uint6ToB64(nUint6: number): number {
    if (nUint6 < 26) return nUint6 + 65;
    if (nUint6 < 52) return nUint6 + 71;
    if (nUint6 < 62) return nUint6 - 4;
    if (nUint6 === 62) return 43;
    if (nUint6 === 63) return 47;
    return 65;
}

export function base64Enc(aBytes: Uint8Array): string {
    let nMod3 = 2;
    let sB64Enc = '';
    const nLen = aBytes.length;
    let nUint24 = 0;
    for (let nIdx = 0; nIdx < nLen; nIdx += 1) {
        nMod3 = nIdx % 3;
        nUint24 |= aBytes[nIdx] << ((16 >>> nMod3) & 24);
        if (nMod3 === 2 || aBytes.length - nIdx === 1) {
            sB64Enc += String.fromCodePoint(
                uint6ToB64((nUint24 >>> 18) & 63),
                uint6ToB64((nUint24 >>> 12) & 63),
                uint6ToB64((nUint24 >>> 6) & 63),
                uint6ToB64(nUint24 & 63),
            );
            nUint24 = 0;
        }
    }
    return (
        sB64Enc.substring(0, sB64Enc.length - 2 + nMod3)
            // eslint-disable-next-line no-nested-ternary
            + (nMod3 === 2
                ? ''
                : nMod3 === 1
                    ? '='
                    : '=='
            )
    );
}
