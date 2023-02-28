import Utils from './utils';

namespace MemUtils {
    /** stores u8[] to a specific memory address */
    export function u8ArrayToMemAddress(address: u32, vec: u8[]): void {
        for (let i = 0; i < vec.length; i++) {
            store<u8>(address + i, vec.at(i));
        }
    }

    /** stores u8[] into heap and returns address */
    export function u8ArrayToMem(vec: u8[]): u32 {
        let address = heap.alloc(vec.length) as u32;
        u8ArrayToMemAddress(address, vec);
        return address;
    }

    /** Given data address and length, this method loads a u8[] from memory */
    export function u8ArrayFromMem(address: u32, length: u32, doFree: bool = true): u8[] {
        let vec: u8[] = [];
        for (let i: u32 = 0; i < length; i++) {
            vec.push(load<u8>(address + i));
        }
        if (doFree) {
            heap.free(address);
        } 
        return vec;
    }

    /** This method stores a string to heap and returns it's address */
    export function stringToMem(str: string): u32 {
        let address = heap.alloc(str.length) as u32;
        u8ArrayToMemAddress(address, Utils.stringToU8Array(str));
        return address;
    }

    /** Given data address and length, this method loads a string from memory */
    export function stringFromMem(address: u32, size: u32, doFree: bool = true): string {
        let str = Utils.u8ArrayToString(u8ArrayFromMem(address, size, doFree));
        return str;
    }
}

export default MemUtils;
