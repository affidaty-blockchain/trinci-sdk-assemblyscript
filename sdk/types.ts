namespace Types {
    /** Two 32 bit numbers (address and length) combined into one 64 bit*/
    export type TCombinedPtr = u64;
    /** Two 32 bit numbers (address and length) combined into array*/
    export type TCombinedPtrTuple = StaticArray<u32>;

    /** Application context */
    export class AppContext {
        /** Internal smart contract call depth */
        public depth: u16;
        /** Transaction target network */
        public network: string;
        /** Account ID, on which smart contract code is getting executed */
        public owner: string;
        /** Changes with each hop of the "call" host function */
        public caller: string;
        /** Called smart contract method */
        public method: string;
        /** Original transaction submitter */
        public origin: string;
    }

    export class AppOutput {
        /** Boolean value returned by the wasm WebAssembly application (smart contract) */
        success: bool = false;
        /** Raw binary data returned by the wasm WebAssembly application (smart contract) */
        result: ArrayBuffer = new ArrayBuffer(0);
    }

    /** Public standard key structure */
    @msgpackable
    export class PublicKey {
        public type: string = '';
        public curve: string = '';
        public value: ArrayBuffer = new ArrayBuffer(0);
    }
}

export default Types;
