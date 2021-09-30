import { Encoder, Decoder, Sizer, Writer } from '@wapc/as-msgpack';
import Types from './types';
import Utils from './utils';
import MemUtils from './memutils';

// "value" argument is used here only to determine the return type, as a string
// containing type name cannot be used to denote a type directly.
function getMember<VT, CT>(classObj: CT, memberName:string, value: VT): VT {
    let memberIndex: i32 = -1;
    for (let i = 0; i < classObj.__structure.length; i++) {
        if (classObj.__structure[i][0] == memberName) {
            memberIndex = i;
        }
    }
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

function write<T>(writer: Writer, classObj: T): void {
    writer.writeMapSize(classObj.__structure.length);
    for (let i = 0; i < classObj.__structure.length; i++) {
        let fieldName:  string = classObj.__structure[i][0];
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
    for (let i = 0; i < classObj.__structure.length; i++) {
        if (classObj.__structure[i][0] == memberName) {
            memberIndex = i;
            break;
        }
    }
    changetype<(c:CT, v:VT)=>void>(classObj.__setters[memberIndex])(classObj, value);
}

function read<T>(decoder: Decoder): T {
    let classObj = instantiate<T>();
    let typesMap = new Map<string, string>();
    for (let i = 0; i < classObj.__structure.length; i++) {
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

function writeAppOutput(writer: Writer, success: bool, result: ArrayBuffer): void {
    writer.writeArraySize(2);
    writer.writeBool(success);
    writer.writeByteArray(result);
}

namespace MsgPack {

    /** Template function to serialize a class into an array of bytes (read on limitations in readme) */
    export function serialize<T>(classObj: T): u8[] {
        let sizer = new Sizer();
        write(sizer, classObj);
        let arrayBuffer = new ArrayBuffer(sizer.length);
        let encoder = new Encoder(arrayBuffer);
        write(encoder, classObj);
        return Utils.arrayBufferToU8Array(arrayBuffer);
    }

    /** Template function to deserialize a class from a given array of bytes (read on limitations in readme)*/
    export function deserialize<T>(u8Array: u8[]): T {
        let arrayBuffer = Utils.u8ArrayToArrayBuffer(u8Array);
        let decoder = new Decoder(arrayBuffer);
        let classObj = read<T>(decoder);
        return classObj;
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
    export function appOutputEncode(success: boolean, result: u8[]): Types.TCombinedPtr {
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
}

export default MsgPack;
