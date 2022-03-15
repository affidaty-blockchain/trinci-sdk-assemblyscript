import { Encoder, Decoder, Sizer, Writer } from '@wapc/as-msgpack';
import Types from './types';
import Utils from './utils';
import MemUtils from './memutils';

// "value" argument is used here only to determine the return type, as a string
// containing type name cannot be used to denote a type directly.
function getMember<VT, CT>(classObj: CT, memberName:string, value: VT): VT {
    let memberIndex: i32 = -1;
    //@ts-ignore
    for (let i = 0; i < classObj.__structure.length; i++) {
        //@ts-ignore
        if (classObj.__structure[i][0] == memberName) {
            memberIndex = i;
        }
    }
    //@ts-ignore
    return changetype<(c:CT)=>VT>(classObj.__getters[memberIndex])(classObj);
}

function writeArray<T>(writer: Writer, classObj: T, arrayFieldName: string, fullTypeName: string ): void {
    let arrayTypeNameBegin = fullTypeName.indexOf('<') + 1;
    let arrayTypeNameEnd = fullTypeName.lastIndexOf('>', arrayTypeNameBegin);
    let arrayMemberTypeName = fullTypeName.slice(arrayTypeNameBegin, arrayTypeNameEnd);
    if (arrayMemberTypeName === 'bool') {
        let arr: Array<bool> = [];
        writer.writeArray(getMember(classObj, arrayFieldName, arr), (writer, item)=> {
            writer.writeBool(item);
        });
    } else if (arrayMemberTypeName == 'i8') {
        let arr: Array<i8> = [];
        writer.writeArray(getMember(classObj, arrayFieldName, arr), (writer, item)=> {
            writer.writeInt8(item);
        });
    } else if (arrayMemberTypeName == 'i16') {
        let arr: Array<i16> = [];
        writer.writeArray(getMember(classObj, arrayFieldName, arr), (writer, item)=> {
            writer.writeInt16(item);
        });
    } else if (arrayMemberTypeName == 'i32') {
        let arr: Array<i32> = [];
        writer.writeArray(getMember(classObj, arrayFieldName, arr), (writer, item)=> {
            writer.writeInt32(item);
        });
    } else if (arrayMemberTypeName == 'i64') {
        let arr: Array<i64> = [];
        writer.writeArray(getMember(classObj, arrayFieldName, arr), (writer, item)=> {
            writer.writeInt64(item);
        });
    } else if (arrayMemberTypeName == 'u8') {
        let arr: Array<u8> = [];
        writer.writeArray(getMember(classObj, arrayFieldName, arr), (writer, item)=> {
            writer.writeUInt8(item);
        });
    } else if (arrayMemberTypeName == 'u16') {
        let arr: Array<u16> = [];
        writer.writeArray(getMember(classObj, arrayFieldName, arr), (writer, item)=> {
            writer.writeUInt16(item);
        });
    } else if (arrayMemberTypeName == 'u32') {
        let arr: Array<u32> = [];
        writer.writeArray(getMember(classObj, arrayFieldName, arr), (writer, item)=> {
            writer.writeUInt32(item);
        });
    } else if (arrayMemberTypeName == 'u64') {
        let arr: Array<u64> = [];
        writer.writeArray(getMember(classObj, arrayFieldName, arr), (writer, item)=> {
            writer.writeUInt64(item);
        });
    } else if (arrayMemberTypeName == 'f32') {
        let arr: Array<f32> = [];
        writer.writeArray(getMember(classObj, arrayFieldName, arr), (writer, item)=> {
            writer.writeFloat32(item);
        });
    } else if (arrayMemberTypeName == 'f64') {
        let arr: Array<f64> = [];
        writer.writeArray(getMember(classObj, arrayFieldName, arr), (writer, item)=> {
            writer.writeFloat64(item);
        });
    } else if (arrayMemberTypeName == 'string') {
        let arr: Array<string> = [];
        writer.writeArray(getMember(classObj, arrayFieldName, arr), (writer, item)=> {
            writer.writeString(item);
        });
    } else if (arrayMemberTypeName == 'ArrayBuffer') {
        let arr: Array<ArrayBuffer> = [];
        writer.writeArray(getMember(classObj, arrayFieldName, arr), (writer, item)=> {
            writer.writeByteArray(item);
        });
    } else {
        throw new Error(`Type not supported: ${fullTypeName}`)
    }
}

function writeDecorated<T>(writer: Writer, classObj: T): void {
    //@ts-ignore
    writer.writeMapSize(classObj.__structure.length);
    //@ts-ignore
    for (let i = 0; i < classObj.__structure.length; i++) {
        //@ts-ignore
        let fieldName:  string = classObj.__structure[i][0];
        //@ts-ignore
        let fieldType: string = classObj.__structure[i][1];
        let iteractions: i32 = 1;
        writer.writeString(fieldName);
        if (fieldType === 'bool') {
            let valType: bool = false;
            writer.writeBool(getMember(classObj, fieldName, valType));
        } else if (fieldType == 'i8') {
            let valType: i8 = 0;
            writer.writeInt8(getMember(classObj, fieldName, valType));
        } else if (fieldType == 'i16') {
            let valType: i16 = 0;
            writer.writeInt16(getMember(classObj, fieldName, valType));
        } else if (fieldType == 'i32') {
            let valType: i32 = 0;
            writer.writeInt32(getMember(classObj, fieldName, valType));
        } else if (fieldType == 'i64') {
            //@ts-ignore
            let valType: i64 = 0;
            writer.writeInt64(getMember(classObj, fieldName, valType));
        } else if (fieldType == 'u8') {
            let valType: u8 = 0;
            writer.writeUInt8(getMember(classObj, fieldName, valType));
        } else if (fieldType == 'u16') {
            let valType: u16 = 0;
            writer.writeUInt16(getMember(classObj, fieldName, valType));
        } else if (fieldType == 'u32') {
            let valType: u32 = 0;
            writer.writeUInt32(getMember(classObj, fieldName, valType));
        } else if (fieldType == 'u64') {
            let valType: u64 = 0;
            writer.writeUInt64(getMember(classObj, fieldName, valType));
        } else if (fieldType == 'f32') {
            let valType: f32 = 0;
            writer.writeFloat32(getMember(classObj, fieldName, valType));
        } else if (fieldType == 'f64') {
            let valType: f64 = 0;
            writer.writeFloat64(getMember(classObj, fieldName, valType));
        } else if (fieldType == 'string') {
            let valType: string = '';
            writer.writeString(getMember(classObj, fieldName, valType));
        } else if (fieldType == 'ArrayBuffer') {
            let valType: ArrayBuffer = new ArrayBuffer(0);
            writer.writeByteArray(getMember(classObj, fieldName, valType));
        } else if (fieldType.indexOf('Array<') !== -1) {
            writeArray(writer, classObj, fieldName, fieldType);
        } else {
            throw new Error(`Type not supported: ${fieldType}`);
        }
    }
}

function setMember<VT, CT>(classObj: CT, memberName:string, value: VT): void {
    let memberIndex: i32 = -1;
    //@ts-ignore
    for (let i = 0; i < classObj.__structure.length; i++) {
        //@ts-ignore
        if (classObj.__structure[i][0] == memberName) {
            memberIndex = i;
            break;
        }
    }
    //@ts-ignore
    changetype<(c:CT, v:VT)=>void>(classObj.__setters[memberIndex])(classObj, value);
}

function readDecorated<T>(decoder: Decoder): T {
    let classObj = instantiate<T>();
    let typesMap = new Map<string, string>();
    //@ts-ignore
    for (let i = 0; i < classObj.__structure.length; i++) {
        //@ts-ignore
        typesMap.set(classObj.__structure[i][0], classObj.__structure[i][1]);
    }
    let numFields = decoder.readMapSize() as i32;
    for (let idx = 0; idx < numFields; idx++) {
        let fieldName = decoder.readString();
        if (!typesMap.has(fieldName)) {
            throw new Error(`Unknown field: ${fieldName}`);
        }
        let fieldType = typesMap.get(fieldName);
        if (fieldType == 'bool') {
            setMember(classObj, fieldName, decoder.readBool());
        } else if (fieldType == 'i8') {
            setMember(classObj, fieldName, decoder.readInt8());
        } else if (fieldType == 'i16') {
            setMember(classObj, fieldName, decoder.readInt16());
        } else if (fieldType == 'i32') {
            setMember(classObj, fieldName, decoder.readInt32());
        } else if (fieldType == 'i64') {
            setMember(classObj, fieldName, decoder.readInt64());
        } else if (fieldType == 'u8') {
            setMember(classObj, fieldName, decoder.readUInt8());
        } else if (fieldType == 'u16') {
            setMember(classObj, fieldName, decoder.readUInt16());
        } else if (fieldType == 'u32') {
            setMember(classObj, fieldName, decoder.readUInt32());
        } else if (fieldType == 'u64') {
            setMember(classObj, fieldName, decoder.readUInt64());
        } else if (fieldType == 'f32') {
            setMember(classObj, fieldName, decoder.readFloat32());
        } else if (fieldType == 'f64') {
            setMember(classObj, fieldName, decoder.readFloat64());
        } else if (fieldType === 'string') {
            setMember(classObj, fieldName, decoder.readString());
        } else if (fieldType === 'ArrayBuffer') {
            setMember(classObj, fieldName, decoder.readByteArray());
        } else if (fieldType.indexOf('Array<') !== -1) {
            let arrayTypeNameBegin = fieldType.indexOf('<') + 1;
            let arrayTypeNameEnd = fieldType.lastIndexOf('>', arrayTypeNameBegin);
            let arrayMemberTypeName = fieldType.slice(arrayTypeNameBegin, arrayTypeNameEnd);
            if (arrayMemberTypeName === 'bool') {
                setMember(classObj, fieldName, decoder.readArray<bool>((decoder)=>{
                    return decoder.readBool();
                }));
            } else if (arrayMemberTypeName == 'i8') {
                setMember(classObj, fieldName, decoder.readArray<i8>((decoder)=>{
                    return decoder.readInt8();
                }));
            } else if (arrayMemberTypeName == 'i16') {
                setMember(classObj, fieldName, decoder.readArray<i16>((decoder)=>{
                    return decoder.readInt16();
                }));
            } else if (arrayMemberTypeName == 'i32') {
                setMember(classObj, fieldName, decoder.readArray<i32>((decoder)=>{
                    return decoder.readInt32();
                }));
            } else if (arrayMemberTypeName == 'i64') {
                setMember(classObj, fieldName, decoder.readArray<i64>((decoder)=>{
                    return decoder.readInt64();
                }));
            } else if (arrayMemberTypeName == 'u8') {
                setMember(classObj, fieldName, decoder.readArray<u8>((decoder)=>{
                    return decoder.readUInt8();
                }));
            } else if (arrayMemberTypeName == 'u16') {
                setMember(classObj, fieldName, decoder.readArray<u16>((decoder)=>{
                    return decoder.readUInt16();
                }));
            } else if (arrayMemberTypeName == 'u32') {
                setMember(classObj, fieldName, decoder.readArray<u32>((decoder)=>{
                    return decoder.readUInt32();
                }));
            } else if (arrayMemberTypeName == 'u64') {
                setMember(classObj, fieldName, decoder.readArray<u64>((decoder)=>{
                    return decoder.readUInt64();
                }));
            } else if (arrayMemberTypeName == 'f32') {
                setMember(classObj, fieldName, decoder.readArray<f32>((decoder)=>{
                    return decoder.readFloat32();
                }));
            } else if (arrayMemberTypeName == 'f64') {
                setMember(classObj, fieldName, decoder.readArray<f64>((decoder)=>{
                    return decoder.readFloat64();
                }));
            } else if (arrayMemberTypeName == 'string') {
                setMember(classObj, fieldName, decoder.readArray<string>((decoder)=>{
                    return decoder.readString();
                }));
            } else if (arrayMemberTypeName == 'ArrayBuffer') {
                setMember(classObj, fieldName, decoder.readArray<ArrayBuffer>((decoder)=>{
                    return decoder.readByteArray();
                }));
            } else {
                throw new Error(`Type not supported: ${fieldType}`);
            }
        } else {
            throw new Error(`Type not supported: ${fieldType}`);
        }
    }
    return classObj;
}

// type TInternalTypeString =
// | 'u8' | 'Array<u8>' | 'u16' | 'Array<u16>' | 'u32'|'Array<u32>'|'u64'|'Array<u64>'
// |'i8'|'Array<i8>'|'i16'|'Array<i16>'|'i32'|'Array<i32>'|'i64'|'Array<i64>'
// |'f32'|'Array<f32>'|'f64'|'Array<f64>'|'bool'|'Array<bool>'
// |'String'|'Array<~lib/string/String>'|'ArrayBuffer'|'Array<~lib/arraybuffer/ArrayBuffer>';

export const serMap: Map<string, usize> = new Map();
serMap.set('u8', changetype<usize>(MsgPack.InternalTypes.serUInt8));
serMap.set('Array<u8>', changetype<usize>(MsgPack.InternalTypes.serUInt8Array));
serMap.set('u16', changetype<usize>(MsgPack.InternalTypes.serUInt16));
serMap.set('Array<u16>', changetype<usize>(MsgPack.InternalTypes.serUInt16Array));
serMap.set('u32', changetype<usize>(MsgPack.InternalTypes.serUInt32));
serMap.set('Array<u32>', changetype<usize>(MsgPack.InternalTypes.serUInt32Array));
serMap.set('u64', changetype<usize>(MsgPack.InternalTypes.serUInt64));
serMap.set('Array<u64>', changetype<usize>(MsgPack.InternalTypes.serUInt64Array));
serMap.set('i8', changetype<usize>(MsgPack.InternalTypes.serInt8));
serMap.set('Array<i8>', changetype<usize>(MsgPack.InternalTypes.serInt8Array));
serMap.set('i16', changetype<usize>(MsgPack.InternalTypes.serInt16));
serMap.set('Array<i16>', changetype<usize>(MsgPack.InternalTypes.serInt16Array));
serMap.set('i32', changetype<usize>(MsgPack.InternalTypes.serInt32));
serMap.set('Array<i32>', changetype<usize>(MsgPack.InternalTypes.serInt32Array));
serMap.set('i64', changetype<usize>(MsgPack.InternalTypes.serInt64));
serMap.set('Array<i64>', changetype<usize>(MsgPack.InternalTypes.serInt64Array));
serMap.set('f32', changetype<usize>(MsgPack.InternalTypes.serFloat32));
serMap.set('Array<f32>', changetype<usize>(MsgPack.InternalTypes.serFloat32Array));
serMap.set('f64', changetype<usize>(MsgPack.InternalTypes.serFloat64));
serMap.set('Array<f64>', changetype<usize>(MsgPack.InternalTypes.serFloat64Array));
serMap.set('bool', changetype<usize>(MsgPack.InternalTypes.serBool));
serMap.set('Array<bool>', changetype<usize>(MsgPack.InternalTypes.serBoolArray));
serMap.set('String', changetype<usize>(MsgPack.InternalTypes.serString));
serMap.set('Array<~lib/string/String>', changetype<usize>(MsgPack.InternalTypes.serStringArray));
serMap.set('ArrayBuffer', changetype<usize>(MsgPack.InternalTypes.serArrayBuffer));
serMap.set('Array<~lib/arraybuffer/ArrayBuffer>', changetype<usize>(MsgPack.InternalTypes.serArrayBufferArray));

export const deserMap: Map<string, usize> = new Map();
deserMap.set('u8', changetype<usize>(MsgPack.InternalTypes.deserUInt8));
deserMap.set('Array<u8>', changetype<usize>(MsgPack.InternalTypes.deserUInt8Array));
deserMap.set('u16', changetype<usize>(MsgPack.InternalTypes.deserUInt16));
deserMap.set('Array<u16>', changetype<usize>(MsgPack.InternalTypes.deserUInt16Array));
deserMap.set('u32', changetype<usize>(MsgPack.InternalTypes.deserUInt32));
deserMap.set('Array<u32>', changetype<usize>(MsgPack.InternalTypes.deserUInt32Array));
deserMap.set('u64', changetype<usize>(MsgPack.InternalTypes.deserUInt64));
deserMap.set('Array<u64>', changetype<usize>(MsgPack.InternalTypes.deserUInt64Array));
deserMap.set('i8', changetype<usize>(MsgPack.InternalTypes.deserInt8));
deserMap.set('Array<i8>', changetype<usize>(MsgPack.InternalTypes.deserInt8Array));
deserMap.set('i16', changetype<usize>(MsgPack.InternalTypes.deserInt16));
deserMap.set('Array<i16>', changetype<usize>(MsgPack.InternalTypes.deserInt16Array));
deserMap.set('i32', changetype<usize>(MsgPack.InternalTypes.deserInt32));
deserMap.set('Array<i32>', changetype<usize>(MsgPack.InternalTypes.deserInt32Array));
deserMap.set('i64', changetype<usize>(MsgPack.InternalTypes.deserInt64));
deserMap.set('Array<i64>', changetype<usize>(MsgPack.InternalTypes.deserInt64Array));
deserMap.set('f32', changetype<usize>(MsgPack.InternalTypes.deserFloat32));
deserMap.set('Array<f32>', changetype<usize>(MsgPack.InternalTypes.deserFloat32Array));
deserMap.set('f64', changetype<usize>(MsgPack.InternalTypes.deserFloat64));
deserMap.set('Array<f64>', changetype<usize>(MsgPack.InternalTypes.deserFloat64Array));
deserMap.set('bool', changetype<usize>(MsgPack.InternalTypes.deserBool));
deserMap.set('Array<bool>', changetype<usize>(MsgPack.InternalTypes.deserBoolArray));
deserMap.set('String', changetype<usize>(MsgPack.InternalTypes.deserString));
deserMap.set('Array<~lib/string/String>', changetype<usize>(MsgPack.InternalTypes.deserStringArray));
deserMap.set('ArrayBuffer', changetype<usize>(MsgPack.InternalTypes.deserArrayBuffer));
deserMap.set('Array<~lib/arraybuffer/ArrayBuffer>', changetype<usize>(MsgPack.InternalTypes.deserArrayBufferArray));

function writeAppOutput(writer: Writer, success: bool, result: ArrayBuffer): void {
    writer.writeArraySize(2);
    writer.writeBool(success);
    writer.writeByteArray(result);
}

function writePubKey(writer: Writer, pubKey: Types.PublicKey): void {
    writer.writeArraySize(3);
    writer.writeString(pubKey.type);
    writer.writeString(pubKey.curve);
    writer.writeByteArray(pubKey.value);
}

namespace MsgPack {
    /** Specific unnamed public key encode */
    export function pubKeyEncode(pubKey: Types.PublicKey): u8[] {
        const sizer = new Sizer();
        writePubKey(sizer, pubKey);
        const buffer = new ArrayBuffer(sizer.length);
        const encoder = new Encoder(buffer);
        writePubKey(encoder, pubKey);
        const resultU8Array = Utils.arrayBufferToU8Array(buffer);
        return resultU8Array;
    }

    /** Template function to serialize a class into an array of bytes (read on limitations in readme) */
    export function serialize<T>(classObj: T): u8[] {
        let sizer = new Sizer();
        writeDecorated(sizer, classObj);
        let arrayBuffer = new ArrayBuffer(sizer.length);
        let encoder = new Encoder(arrayBuffer);
        writeDecorated(encoder, classObj);
        return Utils.arrayBufferToU8Array(arrayBuffer);
    }

    /** Template function to deserialize a class from a given array of bytes (read on limitations in readme)*/
    export function deserialize<T>(u8Array: u8[]): T {
        let arrayBuffer = Utils.u8ArrayToArrayBuffer(u8Array);
        let decoder = new Decoder(arrayBuffer);
        let classObj = readDecorated<T>(decoder);
        return classObj;
    }

    export function serializeInternalType<T>(value: T): u8[] {
        const typename = nameof<T>();
        const serFunction = changetype<(value: T) => u8[]>(serMap.get(typename));
        return serFunction(value);
        // if (serMap.has(typename)) {
        //     const serFunction = changetype<(value: T) => u8[]>(serMap.get(typename));
        //     return serFunction(value);
        // } else {
        //     return serializeDecorated<T>(value);
        // }
    }

    export function deserializeInternalType<T>(bytes: u8[]): T {
        const typename = nameof<T>();
        const deserFunction = changetype<(bytes: u8[]) => T>(deserMap.get(typename));
        return deserFunction(bytes);
        // if (deserMap.has(typename)) {
        //     const deserFunction = changetype<(bytes: u8[]) => T>(serMap.get(typename));
        //     return deserFunction(bytes);
        // } else {
        //     return deserializeDecorated<T>(bytes);
        // }
    }

    /** Specific smart contract context decoder, used in run() function */
    export function ctxDecode(ctxU8Arr: u8[]): Types.AppContext {
        const ctxArrayBuffer = Utils.u8ArrayToArrayBuffer(ctxU8Arr);
        const decoder = new Decoder(ctxArrayBuffer);
        let ctx: Types.AppContext = {
            depth: 0,
            network: '',
            owner: '',
            caller: '',
            method: '',
            origin: '',
        };
        if (decoder.readArraySize() !== 6) {
            throw new Error('wrong input array size');
        }
        ctx.depth = decoder.readUInt16();
        ctx.network = decoder.readString();
        ctx.owner = decoder.readString();
        ctx.caller = decoder.readString();
        ctx.method = decoder.readString();
        ctx.origin = decoder.readString();
        return ctx;
    }

    /** Specific smart contract return value encoder */
    export function appOutputEncode(success: bool, result: u8[]): Types.TCombinedPtr {
        let resultArrayBuffer = Utils.u8ArrayToArrayBuffer(result);
        const sizer = new Sizer();
        writeAppOutput(sizer, success, resultArrayBuffer);
        const buffer = new ArrayBuffer(sizer.length);
        const encoder = new Encoder(buffer);
        writeAppOutput(encoder, success, resultArrayBuffer);
        const resultU8Array = Utils.arrayBufferToU8Array(buffer);
        const resultAddress = MemUtils.u8ArrayToMem(resultU8Array);
        return Utils.combinePtr(resultAddress, resultU8Array.length);
    }

    /** Specific smart contract return value decoder. Used to decode HostFunctions.call() return value */
    export function appOutputDecode(appOutputU8: u8[]): Types.AppOutput {
        let appOutput = new Types.AppOutput();
        let ab = Utils.u8ArrayToArrayBuffer(appOutputU8);
        let decoder = new Decoder(ab);
        decoder.readArraySize();
        appOutput.success = decoder.readBool();
        appOutput.result = decoder.readByteArray();
        return appOutput;
    }

    export namespace InternalTypes {
        export function serBool(value: bool): u8[] {
            let sizer = new Sizer();
            sizer.writeBool(value);
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeBool(value);
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserBool(u8Arr: u8[]): bool {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            return decoder.readBool();
        }
    
        export function serUInt8(value: u8): u8[] {
            let sizer = new Sizer();
            sizer.writeUInt8(value);
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeUInt8(value);
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserUInt8(u8Arr: u8[]): u8 {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            return decoder.readUInt8();
        }
    
        export function serUInt16(value: u16): u8[] {
            let sizer = new Sizer();
            sizer.writeUInt16(value);
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeUInt16(value);
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserUInt16(u8Arr: u8[]): u16 {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            return decoder.readUInt16();
        }
    
        export function serUInt32(value: u32): u8[] {
            let sizer = new Sizer();
            sizer.writeUInt32(value);
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeUInt32(value);
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserUInt32(u8Arr: u8[]): u32 {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            return decoder.readUInt32();
        }
    
        export function serUInt64(value: u64): u8[] {
            let sizer = new Sizer();
            sizer.writeUInt64(value);
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeUInt64(value);
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserUInt64(u8Arr: u8[]): u64 {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            return decoder.readUInt64();
        }
    
        export function serInt8(value: i8): u8[] {
            let sizer = new Sizer();
            sizer.writeInt8(value);
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeInt8(value);
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserInt8(u8Arr: u8[]): i8 {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            return decoder.readInt8();
        }
    
        export function serInt16(value: i16): u8[] {
            let sizer = new Sizer();
            sizer.writeInt16(value);
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeInt16(value);
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserInt16(u8Arr: u8[]): i16 {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            return decoder.readInt16();
        }
    
        export function serInt32(value: i32): u8[] {
            let sizer = new Sizer();
            sizer.writeInt32(value);
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeInt32(value);
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserInt32(u8Arr: u8[]): i32 {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            return decoder.readInt32();
        }
    
        export function serInt64(value: i64): u8[] {
            let sizer = new Sizer();
            sizer.writeInt64(value);
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeInt64(value);
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserInt64(u8Arr: u8[]): i64 {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            return decoder.readInt64();
        }
    
        export function serFloat32(value: f32): u8[] {
            let sizer = new Sizer();
            sizer.writeFloat32(value);
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeFloat32(value);
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserFloat32(u8Arr: u8[]): f32 {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            return decoder.readFloat32();
        }
    
        export function serFloat64(value: f64): u8[] {
            let sizer = new Sizer();
            sizer.writeFloat64(value);
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeFloat64(value);
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserFloat64(u8Arr: u8[]): f64 {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            return decoder.readFloat64();
        }
    
        export function serString(value: string): u8[] {
            let sizer = new Sizer();
            sizer.writeString(value);
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeString(value);
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserString(u8Arr: u8[]): string {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            return decoder.readString();
        }
    
        export function serArrayBuffer(value: ArrayBuffer): u8[] {
            let sizer = new Sizer();
            sizer.writeByteArray(value);
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeByteArray(value);
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserArrayBuffer(u8Arr: u8[]): ArrayBuffer {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            return decoder.readByteArray();
        }
    
        export function serBoolArray(value: bool[]): u8[] {
            let sizer = new Sizer();
            sizer.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                sizer.writeBool(value[i])
            }
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                encoder.writeBool(value[i])
            }
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserBoolArray(u8Arr: u8[]): bool[] {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            let arraySize = decoder.readArraySize();
            let resultArray: bool[] = [];
            for (let i = 0 as u32; i < arraySize; i++) {
                resultArray.push(decoder.readBool())
            }
            return resultArray;
        }
    
        export function serUInt8Array(value: u8[]): u8[] {
            let sizer = new Sizer();
            sizer.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                sizer.writeUInt8(value[i])
            }
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                encoder.writeUInt8(value[i])
            }
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserUInt8Array(u8Arr: u8[]): u8[] {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            let arraySize = decoder.readArraySize();
            let resultArray: u8[] = [];
            for (let i = 0 as u32; i < arraySize; i++) {
                resultArray.push(decoder.readUInt8())
            }
            return resultArray;
        }
    
        export function serUInt16Array(value: u16[]): u8[] {
            let sizer = new Sizer();
            sizer.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                sizer.writeUInt16(value[i])
            }
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                encoder.writeUInt16(value[i])
            }
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserUInt16Array(u8Arr: u8[]): u16[] {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            let arraySize = decoder.readArraySize();
            let resultArray: u16[] = [];
            for (let i = 0 as u32; i < arraySize; i++) {
                resultArray.push(decoder.readUInt16())
            }
            return resultArray;
        }
    
        export function serUInt32Array(value: u32[]): u8[] {
            let sizer = new Sizer();
            sizer.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                sizer.writeUInt32(value[i])
            }
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                encoder.writeUInt32(value[i])
            }
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserUInt32Array(u8Arr: u8[]): u32[] {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            let arraySize = decoder.readArraySize();
            let resultArray: u32[] = [];
            for (let i = 0 as u32; i < arraySize; i++) {
                resultArray.push(decoder.readUInt32())
            }
            return resultArray;
        }
    
        export function serUInt64Array(value: u64[]): u8[] {
            let sizer = new Sizer();
            sizer.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                sizer.writeUInt64(value[i])
            }
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                encoder.writeUInt64(value[i])
            }
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserUInt64Array(u8Arr: u8[]): u64[] {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            let arraySize = decoder.readArraySize();
            let resultArray: u64[] = [];
            for (let i = 0 as u32; i < arraySize; i++) {
                resultArray.push(decoder.readUInt64())
            }
            return resultArray;
        }
    
        export function serInt8Array(value: i8[]): u8[] {
            let sizer = new Sizer();
            sizer.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                sizer.writeInt8(value[i])
            }
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                encoder.writeInt8(value[i])
            }
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserInt8Array(u8Arr: u8[]): i8[] {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            let arraySize = decoder.readArraySize();
            let resultArray: i8[] = [];
            for (let i = 0 as u32; i < arraySize; i++) {
                resultArray.push(decoder.readInt8())
            }
            return resultArray;
        }
    
        export function serInt16Array(value: i16[]): u8[] {
            let sizer = new Sizer();
            sizer.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                sizer.writeInt16(value[i])
            }
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                encoder.writeInt16(value[i])
            }
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserInt16Array(u8Arr: u8[]): i16[] {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            let arraySize = decoder.readArraySize();
            let resultArray: i16[] = [];
            for (let i = 0 as u32; i < arraySize; i++) {
                resultArray.push(decoder.readInt16())
            }
            return resultArray;
        }
    
        export function serInt32Array(value: i32[]): u8[] {
            let sizer = new Sizer();
            sizer.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                sizer.writeInt32(value[i])
            }
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                encoder.writeInt32(value[i])
            }
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserInt32Array(u8Arr: u8[]): i32[] {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            let arraySize = decoder.readArraySize();
            let resultArray: i32[] = [];
            for (let i = 0 as u32; i < arraySize; i++) {
                resultArray.push(decoder.readInt32())
            }
            return resultArray;
        }
    
        export function serInt64Array(value: i64[]): u8[] {
            let sizer = new Sizer();
            sizer.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                sizer.writeInt64(value[i])
            }
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                encoder.writeInt64(value[i])
            }
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserInt64Array(u8Arr: u8[]): i64[] {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            let arraySize = decoder.readArraySize();
            let resultArray: i64[] = [];
            for (let i = 0 as u32; i < arraySize; i++) {
                resultArray.push(decoder.readInt64())
            }
            return resultArray;
        }
    
        export function serFloat32Array(value: f32[]): u8[] {
            let sizer = new Sizer();
            sizer.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                sizer.writeFloat32(value[i])
            }
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                encoder.writeFloat32(value[i])
            }
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserFloat32Array(u8Arr: u8[]): f32[] {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            let arraySize = decoder.readArraySize();
            let resultArray: f32[] = [];
            for (let i = 0 as u32; i < arraySize; i++) {
                resultArray.push(decoder.readFloat32())
            }
            return resultArray;
        }
    
        export function serFloat64Array(value: f64[]): u8[] {
            let sizer = new Sizer();
            sizer.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                sizer.writeFloat64(value[i])
            }
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                encoder.writeFloat64(value[i])
            }
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserFloat64Array(u8Arr: u8[]): f64[] {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            let arraySize = decoder.readArraySize();
            let resultArray: f64[] = [];
            for (let i = 0 as u32; i < arraySize; i++) {
                resultArray.push(decoder.readFloat64())
            }
            return resultArray;
        }
    
        export function serStringArray(value: string[]): u8[] {
            let sizer = new Sizer();
            sizer.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                sizer.writeString(value[i])
            }
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                encoder.writeString(value[i])
            }
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserStringArray(u8Arr: u8[]): string[] {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            let arraySize = decoder.readArraySize();
            let resultArray: string[] = [];
            for (let i = 0 as u32; i < arraySize; i++) {
                resultArray.push(decoder.readString())
            }
            return resultArray;
        }
    
        export function serArrayBufferArray(value: ArrayBuffer[]): u8[] {
            let sizer = new Sizer();
            sizer.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                sizer.writeByteArray(value[i])
            }
            let ab = new ArrayBuffer(sizer.length);
            let encoder = new Encoder(ab);
            encoder.writeArraySize(value.length);
            for (let i = 0; i < value.length; i++) {
                encoder.writeByteArray(value[i])
            }
            return Utils.arrayBufferToU8Array(ab);
        }
    
        export function deserArrayBufferArray(u8Arr: u8[]): ArrayBuffer[] {
            let ab = Utils.u8ArrayToArrayBuffer(u8Arr);
            let decoder = new Decoder(ab);
            let arraySize = decoder.readArraySize();
            let resultArray: ArrayBuffer[] = [];
            for (let i = 0 as u32; i < arraySize; i++) {
                resultArray.push(decoder.readByteArray())
            }
            return resultArray;
        }
    }
}


export default MsgPack;
