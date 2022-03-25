import { mpEncode, mpDecode } from './utils';
import CTX from './ctx';

export class TX {
    _network:string;
    _target : string;
    _contract: string;
    _method: string;
    _args: any = {};
    _signer:string = '';

    constructor(target: string = '', contractRefHash: string = '', method: string = '', network: string = '') {
        this._network = network;
        this._target = target;
        this._contract = contractRefHash;
        this._method = method;
    }

    network(network: string) {
        this._network = network;
        return this;
    }

    target(target:string ) {
        this._target = target;
        return this;
    }

    contract(contractRefHash:string ) {
        this._contract = contractRefHash;
        return this;
    }

    method(method: string) {
        this._method = method;
        return this;
    }

    args(args: any = {}) {
        this._args = args;
        return this;
    }

    argsBytes(bytes: Uint8Array) {
        this._args = mpDecode(bytes);
        return this;
    }

    signer(accountId: string) {
        this._signer = accountId;
        return this;
    }

    getArgsBytes(): Uint8Array {
        return new Uint8Array(mpEncode(this._args));
    }

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
