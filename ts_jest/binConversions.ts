/* eslint no-bitwise: 0 */
import { encode as bs58Enc, decode as bs58Dec } from 'bs58';
import * as Errors from './errors';
import { base64Dec, base64Enc } from './base64';

export const regexDigits = /^[-0-9]*$/g;
export const regexHex = /^[0-9A-Fa-f]*$/g;
export const regexBase58 = /^[1-9A-HJ-NP-Za-km-z]*$/g;
export const regexBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/g;
export const regexBase64Url = /^[A-Za-z0-9\-_]*$/g;

// TODO: change String.match(RegExp) to RegExp.test(String)

/**
* Encodes binary data as hex string
*
* @param data - Binary data to encode
* @returns - hex string encoding data
*/
export function toHex(data: Uint8Array): string {
    if (data.length <= 0) return '';
    return data.reduce((acc: string, val: number) => {
        return `${acc}${val.toString(16).padStart(2, '0')}`;
    }, '');
}

/**
* Decodes binary data from hex string. Throws if string is not a valid hex.
*
* @param data - Binary data to encode
* @returns - hex string encoding data
*/
export function fromHex(hexStr: string): Uint8Array {
    if (hexStr.length <= 0) return new Uint8Array(0);
    if (!hexStr.match(regexHex)) throw new Error(Errors.NOT_HEX);
    return new Uint8Array(
        hexStr
            .padStart(hexStr.length + (hexStr.length % 2), '0')
            .toLowerCase()
            .match(/.{1,2}/g)!
            .map((byte: string) => { return parseInt(byte, 16); }),
    );
}

/**
* Encodes binary data as base58 string
*
* @param data - Binary data to encode
* @returns - base58 string encoding data
*/
export function toBase58(data: Uint8Array): string {
    if (data.length <= 0) return '';
    return bs58Enc(data);
}

/**
* Decodes binary data from base58 string. Throws if string is not a valid base58.
*
* @param data - Binary data to encode
* @returns - base58 string encoding data
*/
export function fromBase58(b58Str: string): Uint8Array {
    if (b58Str.length <= 0) return new Uint8Array(0);
    if (!b58Str.match(regexBase58)) throw new Error(Errors.NOT_B58);
    return bs58Dec(b58Str);
}

/**
* Encodes binary data as base64 string
*
* @param data - Binary data to encode
* @returns - base64 string encoding data
*/
export function toBase64(data: Uint8Array): string {
    if (data.length <= 0) return '';
    return base64Enc(data);
}

/**
* Decodes binary data from base64 string. Throws if string is not a valid base64.
*
* @param data - Binary data to encode
* @returns - base64 string encoding data
*/
export function fromBase64(b58Str: string): Uint8Array {
    if (b58Str.length <= 0) return new Uint8Array([]);
    if (!b58Str.match(regexBase64)) throw new Error(Errors.NOT_B64);
    return base64Dec(b58Str);
}

/**
* Encodes binary data as base64url string
*
* @param data - Binary data to encode
* @returns - base64url string encoding data
*/
export function toBase64Url(data: Uint8Array): string {
    if (data.length <= 0) return '';
    const b64 = toBase64(data);
    const pIdx = b64.indexOf('='); // padding index
    return b64.replace(/[+]/g, '-').replace(/[/]/g, '_').substring(0, pIdx >= 0 ? pIdx : undefined);
}

/**
* Decodes binary data from base64url string. Throws if string is not a valid base64url.
*
* @param data - Binary data to encode
* @returns - base64url string encoding data
*/
export function fromBase64Url(b58UrlStr: string): Uint8Array {
    if (b58UrlStr.length <= 0) return new Uint8Array([]);
    if (!b58UrlStr.match(regexBase64Url)) throw new Error(Errors.NOT_B64URL);
    return fromBase64(
        b58UrlStr
            .replace(/[-]/g, '+')
            .replace(/[_]/g, '/')
            .padEnd(Math.ceil(b58UrlStr.length / 4) * 4, '='),
    );
}
