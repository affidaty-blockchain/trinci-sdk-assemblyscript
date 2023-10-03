import { objectToBytes, bytesToObject } from './utils';
import CTX from './ctx';

export class TX {
    private _network: string;
    private _target : string;
    private _contract: string;
    private _method: string;
    private _args: Uint8Array;
    private _signer: string;

    constructor(target: string = '', contractRefHash: string = '', method: string = '', network: string = '') {
        this._network = network;
        this._target = target;
        this._contract = contractRefHash;
        this._method = method;
        this._args = new Uint8Array([]);
        this._signer = '';
    }

    network(network: string = '') {
        this._network = network;
        return this;
    }

    getNetwork(): string {
        return this._network
    }

    target(target:string = '') {
        this._target = target;
        return this;
    }

    getTarget(): string {
        return this._target;
    }

    contract(contractRefHash: string = '') {
        this._contract = contractRefHash;
        return this;
    }

    getContract(): string {
        return this._contract;
    }

    method(method: string = '') {
        this._method = method;
        return this;
    }

    getMethod(): string {
        return this._method;
    }

    /** Performs automatic MessagePack encoding */
    args(args: any) {
        if (typeof args !== 'undefined') {
            this._args = objectToBytes(args);
        }
        return this;
    }

    /** Performs automatic MessagePack decoding */
    getArgs(): any | undefined {
        if (this._args.length <= 0) {
            return undefined;
        }
        return bytesToObject(this._args);
    }

    /** Accepts raw bytes */
    argsBytes(bytes: Uint8Array) {
        this._args = bytes;
        return this;
    }

    /** returns raw bytes */
    getArgsBytes(): Uint8Array {
        return this._args;
    }

    signer(accountId: string = '') {
        this._signer = accountId;
        return this;
    }

    getSigner(): string {
        return this._signer;
    }

    /** Creates CTX from current transaction */
    toCTX(): CTX {
        const ctx = new CTX();
        ctx.network = this._network;
        ctx.owner = this._target;
        ctx.caller = this._signer;
        ctx.origin = this._signer;
        ctx.method = this._method;
        ctx.depth = 0;
        return ctx;
    }
}

export default TX;
