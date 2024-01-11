/** Given a desired size in bytes, safely allocates a contiguous region into wasm memory for host to write to. */
export function alloc(size: u32): u32 {
    if (size <= 0) return 0;
    return changetype<u32>(new ArrayBuffer(size));
}

/** Stores binary data to wasm memory */
export function storeData(data: ArrayBuffer): u32 {
    return changetype<u32>(data);
}

/** Loads binary data from wasm memory */
export function loadData(address: u32): ArrayBuffer {
    if (address <= 0) return new ArrayBuffer(0);
    return changetype<ArrayBuffer>(address);
}

/** Stores a UTF-8 encoded string to wasm memory */
export function storeString(str: string): u32 {
    return storeData(String.UTF8.encode(str));
}

/** Loads and decodes a UTF-8 encoded string from wasm memory */
export function loadString(addr: u32): string {
    if (addr <= 0) return '';
    return String.UTF8.decode(loadData(addr));
}
