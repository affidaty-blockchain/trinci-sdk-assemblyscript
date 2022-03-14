import { mpEncode, mpDecode } from './utils';
import CTX from './ctx';
export class TX {
    network:string;
    target : string;
    contract: string;
    method: string;
    args: any = {};
    signer:string = '';

    constructor(target: string = '', contractRefHash: string = '', method: string = '', network: string = '') {
        this.network = network;
        this.target = target;
        this.contract = contractRefHash;
        this.method = method;
    }

    setNetwork(network: string) {
        this.network = network;
        return this;
    }

    setTarget(target:string ) {
        this.target = target;
        return this;
    }

    setContract(contractRefHash:string ) {
        this.contract = contractRefHash;
        return this;
    }

    setMethod(method: string) {
        this.method = method;
        return this;
    }

    setArgs(args:any = {}) {
        this.args = args;
        return this;
    }

    setArgsBytes(): Buffer {
        return mpEncode(this.args);
    }

    setSigner(accountId: string) {
        this.signer = accountId;
        return this;
    }

    set argsBytes(argsBytes: Uint8Array) {
        this.args = mpDecode(argsBytes);
    }

    get argsBytes(): Uint8Array {
        return new Uint8Array(mpEncode(this.args))
    }

    toCTX(): CTX {
        const ctx = new CTX();
        ctx.network = this.network;
        ctx.owner = this.target;
        ctx.caller = this.signer;
        ctx.origin = this.signer;
        ctx.method = this.method;
        ctx.depth = 0;
        return ctx;
    }
}
//let ctx = new TX().to("Account1").method("test").args({a:1}).sign("Account2").toCTX();
export default TX;