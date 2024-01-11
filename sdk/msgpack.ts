import { Encoder, Decoder, Sizer, Writer } from '@wapc/as-msgpack';
import { AppContext, AppOutput, WasmResult, PublicKey } from './types';
import { combinePtr, splitPtr } from './utils';
import { storeData, loadData } from './memUtils';

let errOccured: bool = false;
let errMessage: string = '';

function setMsgPackError(msg: string): void {
    errOccured = true;
    errMessage = msg;
}

function clearMsgPackError(): void {
    errOccured = false;
    errMessage = '';
}

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
    let isFieldSetMap = new Map<string, bool>();
    //@ts-ignore
    for (let i = 0; i < classObj.__structure.length; i++) {
        //@ts-ignore
        typesMap.set(classObj.__structure[i][0], classObj.__structure[i][1]);
        //@ts-ignore
        isFieldSetMap.set(classObj.__structure[i][0], classObj.__isFieldSet[i]);
    }
    let numFields = decoder.readMapSize() as i32;
    for (let idx = 0; idx < numFields; idx++) {
        let fieldName = decoder.readString();
        if (!typesMap.has(fieldName)) {
            setMsgPackError(`Unknown field: "${fieldName}"`);
            return classObj;
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
                setMsgPackError(`Type not supported: ${fieldType}`);
                break;
            }
        } else {
            setMsgPackError(`Type not supported: ${fieldType}`);
            break;
        }

        if (decoder.error()) {
            setMsgPackError(`"${fieldName}" field error: ${(decoder.error() as Error).message}`);
            return classObj;
        }

        // mark this field as set
        isFieldSetMap.set(fieldName, true);
    }
    // check if all filds have been set
    const isFieldSetKeys = isFieldSetMap.keys();
    for (let i = 0; i < isFieldSetKeys.length; i++) {
        if (!isFieldSetMap.get(isFieldSetKeys[i])) {
            setMsgPackError(`Missing required field "${isFieldSetKeys[i]}"`);
            return classObj;
        }
    }
    return classObj;
}

/** Functions used to (de)serialize internal assemblyscript types and their arrays.
     * Supported types: u8, u16, u32, u64, i8, i16, i32, i64, f32, f64, bool, string, ArrayBuffer
    */
namespace InternalTypes {
    export function serBool(value: bool): ArrayBuffer {
        let sizer = new Sizer();
        sizer.writeBool(value);
        let ab = new ArrayBuffer(sizer.length);
        let encoder = new Encoder(ab);
        encoder.writeBool(value);
        return ab;
    }

    export function deserBool(ab: ArrayBuffer): bool {
        let decoder = new Decoder(ab);
        return decoder.readBool();
    }

    export function serUInt8(value: u8): ArrayBuffer {
        let sizer = new Sizer();
        sizer.writeUInt8(value);
        let ab = new ArrayBuffer(sizer.length);
        let encoder = new Encoder(ab);
        encoder.writeUInt8(value);
        return ab;
    }

    export function deserUInt8(ab: ArrayBuffer): u8 {
        let decoder = new Decoder(ab);
        return decoder.readUInt8();
    }

    export function serUInt16(value: u16): ArrayBuffer {
        let sizer = new Sizer();
        sizer.writeUInt16(value);
        let ab = new ArrayBuffer(sizer.length);
        let encoder = new Encoder(ab);
        encoder.writeUInt16(value);
        return ab;
    }

    export function deserUInt16(ab: ArrayBuffer): u16 {
        let decoder = new Decoder(ab);
        return decoder.readUInt16();
    }

    export function serUInt32(value: u32): ArrayBuffer {
        let sizer = new Sizer();
        sizer.writeUInt32(value);
        let ab = new ArrayBuffer(sizer.length);
        let encoder = new Encoder(ab);
        encoder.writeUInt32(value);
        return ab;
    }

    export function deserUInt32(ab: ArrayBuffer): u32 {
        let decoder = new Decoder(ab);
        return decoder.readUInt32();
    }

    export function serUInt64(value: u64): ArrayBuffer {
        let sizer = new Sizer();
        sizer.writeUInt64(value);
        let ab = new ArrayBuffer(sizer.length);
        let encoder = new Encoder(ab);
        encoder.writeUInt64(value);
        return ab;
    }

    export function deserUInt64(ab: ArrayBuffer): u64 {
        let decoder = new Decoder(ab);
        return decoder.readUInt64();
    }

    export function serInt8(value: i8): ArrayBuffer {
        let sizer = new Sizer();
        sizer.writeInt8(value);
        let ab = new ArrayBuffer(sizer.length);
        let encoder = new Encoder(ab);
        encoder.writeInt8(value);
        return ab;
    }

    export function deserInt8(ab: ArrayBuffer): i8 {
        let decoder = new Decoder(ab);
        return decoder.readInt8();
    }

    export function serInt16(value: i16): ArrayBuffer {
        let sizer = new Sizer();
        sizer.writeInt16(value);
        let ab = new ArrayBuffer(sizer.length);
        let encoder = new Encoder(ab);
        encoder.writeInt16(value);
        return ab;
    }

    export function deserInt16(ab: ArrayBuffer): i16 {
        let decoder = new Decoder(ab);
        return decoder.readInt16();
    }

    export function serInt32(value: i32): ArrayBuffer {
        let sizer = new Sizer();
        sizer.writeInt32(value);
        let ab = new ArrayBuffer(sizer.length);
        let encoder = new Encoder(ab);
        encoder.writeInt32(value);
        return ab;
    }

    export function deserInt32(ab: ArrayBuffer): i32 {
        let decoder = new Decoder(ab);
        return decoder.readInt32();
    }

    export function serInt64(value: i64): ArrayBuffer {
        let sizer = new Sizer();
        sizer.writeInt64(value);
        let ab = new ArrayBuffer(sizer.length);
        let encoder = new Encoder(ab);
        encoder.writeInt64(value);
        return ab;
    }

    export function deserInt64(ab: ArrayBuffer): i64 {
        let decoder = new Decoder(ab);
        return decoder.readInt64();
    }

    export function serFloat32(value: f32): ArrayBuffer {
        let sizer = new Sizer();
        sizer.writeFloat32(value);
        let ab = new ArrayBuffer(sizer.length);
        let encoder = new Encoder(ab);
        encoder.writeFloat32(value);
        return ab;
    }

    export function deserFloat32(ab: ArrayBuffer): f32 {
        let decoder = new Decoder(ab);
        return decoder.readFloat32();
    }

    export function serFloat64(value: f64): ArrayBuffer {
        let sizer = new Sizer();
        sizer.writeFloat64(value);
        let ab = new ArrayBuffer(sizer.length);
        let encoder = new Encoder(ab);
        encoder.writeFloat64(value);
        return ab;
    }

    export function deserFloat64(ab: ArrayBuffer): f64 {
        let decoder = new Decoder(ab);
        return decoder.readFloat64();
    }

    export function serString(value: string): ArrayBuffer {
        let sizer = new Sizer();
        sizer.writeString(value);
        let ab = new ArrayBuffer(sizer.length);
        let encoder = new Encoder(ab);
        encoder.writeString(value);
        return ab;
    }

    export function deserString(ab: ArrayBuffer): string {
        let decoder = new Decoder(ab);
        return decoder.readString();
    }

    export function serArrayBuffer(value: ArrayBuffer): ArrayBuffer {
        let sizer = new Sizer();
        sizer.writeByteArray(value);
        let ab = new ArrayBuffer(sizer.length);
        let encoder = new Encoder(ab);
        encoder.writeByteArray(value);
        return ab;
    }

    export function deserArrayBuffer(ab: ArrayBuffer): ArrayBuffer {
        let decoder = new Decoder(ab);
        return decoder.readByteArray();
    }

    export function serBoolArray(value: bool[]): ArrayBuffer {
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
        return ab;
    }

    export function deserBoolArray(ab: ArrayBuffer): bool[] {
        let decoder = new Decoder(ab);
        let arraySize = decoder.readArraySize();
        let resultArray: bool[] = [];
        for (let i = 0 as u32; i < arraySize; i++) {
            resultArray.push(decoder.readBool())
        }
        return resultArray;
    }

    export function serUInt8Array(value: u8[]): ArrayBuffer {
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
        return ab;
    }

    export function deserUInt8Array(ab: ArrayBuffer): u8[] {
        let decoder = new Decoder(ab);
        let arraySize = decoder.readArraySize();
        let resultArray: u8[] = [];
        for (let i = 0 as u32; i < arraySize; i++) {
            resultArray.push(decoder.readUInt8())
        }
        return resultArray;
    }

    export function serUInt16Array(value: u16[]): ArrayBuffer {
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
        return ab;
    }

    export function deserUInt16Array(ab: ArrayBuffer): u16[] {
        let decoder = new Decoder(ab);
        let arraySize = decoder.readArraySize();
        let resultArray: u16[] = [];
        for (let i = 0 as u32; i < arraySize; i++) {
            resultArray.push(decoder.readUInt16())
        }
        return resultArray;
    }

    export function serUInt32Array(value: u32[]): ArrayBuffer {
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
        return ab;
    }

    export function deserUInt32Array(ab: ArrayBuffer): u32[] {
        let decoder = new Decoder(ab);
        let arraySize = decoder.readArraySize();
        let resultArray: u32[] = [];
        for (let i = 0 as u32; i < arraySize; i++) {
            resultArray.push(decoder.readUInt32())
        }
        return resultArray;
    }

    export function serUInt64Array(value: u64[]): ArrayBuffer {
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
        return ab;
    }

    export function deserUInt64Array(ab: ArrayBuffer): u64[] {
        let decoder = new Decoder(ab);
        let arraySize = decoder.readArraySize();
        let resultArray: u64[] = [];
        for (let i = 0 as u32; i < arraySize; i++) {
            resultArray.push(decoder.readUInt64())
        }
        return resultArray;
    }

    export function serInt8Array(value: i8[]): ArrayBuffer {
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
        return ab;
    }

    export function deserInt8Array(ab: ArrayBuffer): i8[] {
        let decoder = new Decoder(ab);
        let arraySize = decoder.readArraySize();
        let resultArray: i8[] = [];
        for (let i = 0 as u32; i < arraySize; i++) {
            resultArray.push(decoder.readInt8())
        }
        return resultArray;
    }

    export function serInt16Array(value: i16[]): ArrayBuffer {
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
        return ab;
    }

    export function deserInt16Array(ab: ArrayBuffer): i16[] {
        let decoder = new Decoder(ab);
        let arraySize = decoder.readArraySize();
        let resultArray: i16[] = [];
        for (let i = 0 as u32; i < arraySize; i++) {
            resultArray.push(decoder.readInt16())
        }
        return resultArray;
    }

    export function serInt32Array(value: i32[]): ArrayBuffer {
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
        return ab;
    }

    export function deserInt32Array(ab: ArrayBuffer): i32[] {
        let decoder = new Decoder(ab);
        let arraySize = decoder.readArraySize();
        let resultArray: i32[] = [];
        for (let i = 0 as u32; i < arraySize; i++) {
            resultArray.push(decoder.readInt32())
        }
        return resultArray;
    }

    export function serInt64Array(value: i64[]): ArrayBuffer {
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
        return ab;
    }

    export function deserInt64Array(ab: ArrayBuffer): i64[] {
        let decoder = new Decoder(ab);
        let arraySize = decoder.readArraySize();
        let resultArray: i64[] = [];
        for (let i = 0 as u32; i < arraySize; i++) {
            resultArray.push(decoder.readInt64())
        }
        return resultArray;
    }

    export function serFloat32Array(value: f32[]): ArrayBuffer {
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
        return ab;
    }

    export function deserFloat32Array(ab: ArrayBuffer): f32[] {
        let decoder = new Decoder(ab);
        let arraySize = decoder.readArraySize();
        let resultArray: f32[] = [];
        for (let i = 0 as u32; i < arraySize; i++) {
            resultArray.push(decoder.readFloat32())
        }
        return resultArray;
    }

    export function serFloat64Array(value: f64[]): ArrayBuffer {
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
        return ab;
    }

    export function deserFloat64Array(ab: ArrayBuffer): f64[] {
        let decoder = new Decoder(ab);
        let arraySize = decoder.readArraySize();
        let resultArray: f64[] = [];
        for (let i = 0 as u32; i < arraySize; i++) {
            resultArray.push(decoder.readFloat64())
        }
        return resultArray;
    }

    export function serStringArray(value: string[]): ArrayBuffer {
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
        return ab;
    }

    export function deserStringArray(ab: ArrayBuffer): string[] {
        let decoder = new Decoder(ab);
        let arraySize = decoder.readArraySize();
        let resultArray: string[] = [];
        for (let i = 0 as u32; i < arraySize; i++) {
            resultArray.push(decoder.readString())
        }
        return resultArray;
    }

    export function serArrayBufferArray(value: ArrayBuffer[]): ArrayBuffer {
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
        return ab;
    }

    export function deserArrayBufferArray(ab: ArrayBuffer): ArrayBuffer[] {
        let decoder = new Decoder(ab);
        let arraySize = decoder.readArraySize();
        let resultArray: ArrayBuffer[] = [];
        for (let i = 0 as u32; i < arraySize; i++) {
            resultArray.push(decoder.readByteArray())
        }
        return resultArray;
    }
}

const serMap: Map<string, usize> = new Map();
serMap.set('u8', changetype<usize>(InternalTypes.serUInt8));
serMap.set('Array<u8>', changetype<usize>(InternalTypes.serUInt8Array));
serMap.set('u16', changetype<usize>(InternalTypes.serUInt16));
serMap.set('Array<u16>', changetype<usize>(InternalTypes.serUInt16Array));
serMap.set('u32', changetype<usize>(InternalTypes.serUInt32));
serMap.set('Array<u32>', changetype<usize>(InternalTypes.serUInt32Array));
serMap.set('u64', changetype<usize>(InternalTypes.serUInt64));
serMap.set('Array<u64>', changetype<usize>(InternalTypes.serUInt64Array));
serMap.set('i8', changetype<usize>(InternalTypes.serInt8));
serMap.set('Array<i8>', changetype<usize>(InternalTypes.serInt8Array));
serMap.set('i16', changetype<usize>(InternalTypes.serInt16));
serMap.set('Array<i16>', changetype<usize>(InternalTypes.serInt16Array));
serMap.set('i32', changetype<usize>(InternalTypes.serInt32));
serMap.set('Array<i32>', changetype<usize>(InternalTypes.serInt32Array));
serMap.set('i64', changetype<usize>(InternalTypes.serInt64));
serMap.set('Array<i64>', changetype<usize>(InternalTypes.serInt64Array));
serMap.set('f32', changetype<usize>(InternalTypes.serFloat32));
serMap.set('Array<f32>', changetype<usize>(InternalTypes.serFloat32Array));
serMap.set('f64', changetype<usize>(InternalTypes.serFloat64));
serMap.set('Array<f64>', changetype<usize>(InternalTypes.serFloat64Array));
serMap.set('bool', changetype<usize>(InternalTypes.serBool));
serMap.set('Array<bool>', changetype<usize>(InternalTypes.serBoolArray));
serMap.set('String', changetype<usize>(InternalTypes.serString));
serMap.set('Array<~lib/string/String>', changetype<usize>(InternalTypes.serStringArray));
serMap.set('ArrayBuffer', changetype<usize>(InternalTypes.serArrayBuffer));
serMap.set('Array<~lib/arraybuffer/ArrayBuffer>', changetype<usize>(InternalTypes.serArrayBufferArray));

const deserMap: Map<string, usize> = new Map();
deserMap.set('u8', changetype<usize>(InternalTypes.deserUInt8));
deserMap.set('Array<u8>', changetype<usize>(InternalTypes.deserUInt8Array));
deserMap.set('u16', changetype<usize>(InternalTypes.deserUInt16));
deserMap.set('Array<u16>', changetype<usize>(InternalTypes.deserUInt16Array));
deserMap.set('u32', changetype<usize>(InternalTypes.deserUInt32));
deserMap.set('Array<u32>', changetype<usize>(InternalTypes.deserUInt32Array));
deserMap.set('u64', changetype<usize>(InternalTypes.deserUInt64));
deserMap.set('Array<u64>', changetype<usize>(InternalTypes.deserUInt64Array));
deserMap.set('i8', changetype<usize>(InternalTypes.deserInt8));
deserMap.set('Array<i8>', changetype<usize>(InternalTypes.deserInt8Array));
deserMap.set('i16', changetype<usize>(InternalTypes.deserInt16));
deserMap.set('Array<i16>', changetype<usize>(InternalTypes.deserInt16Array));
deserMap.set('i32', changetype<usize>(InternalTypes.deserInt32));
deserMap.set('Array<i32>', changetype<usize>(InternalTypes.deserInt32Array));
deserMap.set('i64', changetype<usize>(InternalTypes.deserInt64));
deserMap.set('Array<i64>', changetype<usize>(InternalTypes.deserInt64Array));
deserMap.set('f32', changetype<usize>(InternalTypes.deserFloat32));
deserMap.set('Array<f32>', changetype<usize>(InternalTypes.deserFloat32Array));
deserMap.set('f64', changetype<usize>(InternalTypes.deserFloat64));
deserMap.set('Array<f64>', changetype<usize>(InternalTypes.deserFloat64Array));
deserMap.set('bool', changetype<usize>(InternalTypes.deserBool));
deserMap.set('Array<bool>', changetype<usize>(InternalTypes.deserBoolArray));
deserMap.set('String', changetype<usize>(InternalTypes.deserString));
deserMap.set('Array<~lib/string/String>', changetype<usize>(InternalTypes.deserStringArray));
deserMap.set('ArrayBuffer', changetype<usize>(InternalTypes.deserArrayBuffer));
deserMap.set('Array<~lib/arraybuffer/ArrayBuffer>', changetype<usize>(InternalTypes.deserArrayBufferArray));

function writeAppOutput(writer: Writer, appOutput: AppOutput): void {
    writer.writeArraySize(2);
    writer.writeBool(appOutput.execSuccess);
    writer.writeByteArray(appOutput.execResult);
}

function writePubKey(writer: Writer, pubKey: PublicKey): void {
    writer.writeArraySize(3);
    writer.writeString(pubKey.type);
    writer.writeString(pubKey.variant);
    writer.writeByteArray(pubKey.value);
}

/** Contains ready-to-use serialization functions for most common use cases. */

export function isError(): bool {
    return errOccured;
}

export function errorMessage(): string {
    return errMessage;
}

export function clearError(): void {
    clearMsgPackError();
}

/** Specific unnamed public key encode. */
export function serializePublicKey(pubKey: PublicKey): ArrayBuffer {
    const sizer = new Sizer();
    writePubKey(sizer, pubKey);
    const ab = new ArrayBuffer(sizer.length);
    const encoder = new Encoder(ab);
    writePubKey(encoder, pubKey);
    return ab;
}

/** Template function to serialize a custom class decorated with `@msgpackable` decorator.
 * @template T - a type decorated with `@msgpackable` decorator.
 * @param classObj - object to serialize
*/
export function serializeDecorated<T>(classObj: T): ArrayBuffer {
    let sizer = new Sizer();
    writeDecorated(sizer, classObj);
    let result = new ArrayBuffer(sizer.length);
    let encoder = new Encoder(result);
    writeDecorated(encoder, classObj);
    return result;
}

/** Template function to deserialize a custom class decorated with `@msgpackable` decorator.
 * @template T - a type decorated with `@msgpackable` decorator.
 * @param u8Array - bytes to deserialize
*/
export function deserializeDecorated<T>(ab: ArrayBuffer): T {
    let decoder = new Decoder(ab);
    let classObj = readDecorated<T>(decoder);
    return classObj;
}


/** Template function to serialize an internal type (or an array of type) value.
 * Supported types: u8, u16, u32, u64, i8, i16, i32, i64, f32, f64, bool, string, ArrayBuffer
 * @template T - internal type.
 * @param classObj - object to serialize
*/
export function serializeInternalType<T>(value: T): ArrayBuffer {
    const typename = nameof<T>();
    const serFunction = changetype<(value: T) => ArrayBuffer>(serMap.get(typename));
    return serFunction(value);
}

/** Template function to deserialize an internal type (or an array of type) value.
 * Supported types: u8, u16, u32, u64, i8, i16, i32, i64, f32, f64, bool, string, ArrayBuffer
 * @template T - internal type.
 * @param bytes - bytes to deserialize
*/
export function deserializeInternalType<T>(bytes: ArrayBuffer): T {
    const typename = nameof<T>();
    const deserFunction = changetype<(bytes: ArrayBuffer) => T>(deserMap.get(typename));
    return deserFunction(bytes);
}

/**
 * Decodes application context information from passed bytes. used in run() function. */
export function deserializeCtx(ctxArrayBuffer: ArrayBuffer): AppContext {
    const decoder = new Decoder(ctxArrayBuffer);
    let ctx: AppContext = {
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

/** Specific smart contract return value decoder. Used, for example, to decode HostFunctions.call() return value */
export function deserializeAppOutput(ab: ArrayBuffer): AppOutput {
    let appOutput = new AppOutput();
    let decoder = new Decoder(ab);
    decoder.readArraySize();
    appOutput.execSuccess = decoder.readBool();
    appOutput.execResult = decoder.readByteArray();
    return appOutput;
}

/** Specific smart contract return value encoder */
export function serializeAppOutput(appOutput: AppOutput): ArrayBuffer {
    const sizer = new Sizer();
    writeAppOutput(sizer, appOutput);
    const ab = new ArrayBuffer(sizer.length);
    const encoder = new Encoder(ab);
    writeAppOutput(encoder, appOutput);
    return ab;
}
