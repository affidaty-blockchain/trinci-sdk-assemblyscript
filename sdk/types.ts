/** Two 32 bit numbers (offset and length) combined into one 64 bit.
 * Returned by smart contract to trinci core as offset and length
 * of the actual data saved to wasmMemory
*/
export type WasmResult = u64;

/** Two 32 bit numbers (offset and length) combined into array. */
export class CombinedPtrTuple {
    /** Data offset */
    offset: u32;
    /** Data length */
    length: u32;

    constructor(offset: u32 = 0, length: u32 = 0) {
        this.offset = offset;
        this.length = length;
    }
}

/** Application context */
export class AppContext {
    /** Internal smart contract call depth */
    public depth: u16 = 0;
    /** Transaction target network */
    public network: string = '';
    /** Account ID, on which smart contract code is getting executed */
    public owner: string = '';
    /** Changes with each hop of the "call" host function */
    public caller: string = '';
    /** Called smart contract method */
    public method: string = '';
    /** Original transaction submitter */
    public origin: string = '';
}

export class AppOutput {
    /** Boolean value returned by the wasm WebAssembly application (smart contract) */
    execSuccess: bool = false;
    /** Raw binary data returned by the wasm WebAssembly application (smart contract) */
    execResult: ArrayBuffer = new ArrayBuffer(0);

    constructor(execSuccess: bool = false, execResult: ArrayBuffer = new ArrayBuffer(0)) {
        this.execSuccess = execSuccess;
        this.execResult = execResult;
    }
}

/** Standard public key structure also found in transactions */
export class PublicKey {
    public type: string;
    public variant: string;
    public value: ArrayBuffer;

    constructor(type: string = '', variant: string = '', value: ArrayBuffer = new ArrayBuffer(0)) {
        this.type = type;
        this.variant = variant;
        this.value = value;
    }
}
