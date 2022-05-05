import * as Utils from './utils';

export default class WasmResult {
    success: boolean;
    result: Uint8Array;

    constructor(success?: boolean, result?: Uint8Array) {
        this.success = success ? success : false;
        this.result = result ? result : new Uint8Array([]);
    }

    fromBytes(bytes: Uint8Array): WasmResult {
        const decodedBytes = Utils.mpDecode(bytes) as [boolean, Buffer];
        this.success = decodedBytes[0];
        this.result = decodedBytes[1];
        return this;
    }

    toBytes(): Uint8Array {
        const encodedBytes = Utils.mpEncode([
            this.success,
            Buffer.from(this.result),
        ]);
        return new Uint8Array(encodedBytes);
    }

    setError(message: string): WasmResult {
        this.success = false;
        this.result = new Uint8Array(Buffer.from(message));
        return this;
    }

    setSuccess(data: Uint8Array): WasmResult {
        this.success = true;
        this.result = data;
        return this;
    }

    setTrue(): WasmResult {
        this.success = true;
        this.result = new Uint8Array([0xc3]);
        return this;
    }

    setFalse(): WasmResult {
        this.success = true;
        this.result = new Uint8Array([0xc2]);
        return this;
    }

    setNull(): WasmResult {
        this.success = true;
        this.result = new Uint8Array([0xc0]);
        return this;
    }

    get isError(): boolean {
        return !this.success;
    }

    decode():any {
        return {
            success : this.success,
            result: this.success ? Utils.mpDecode(this.result) : this.errorMessage
        }
    }

    get errorMessage(): string {
        return Buffer.from(this.result).toString();
    }

    get resultDecoded(): any {
        return Utils.mpDecode(this.result);
    }
}