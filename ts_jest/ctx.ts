import * as Utils from './utils';

type TCTXDecoded = [number, string, string, string, string, string];

export class CTX {

    /** Transaction target network */
    public network: string = '';

    /** Account ID, on which smart contract code is getting executed */
    public owner: string;

    /** Initially same as origin. Changes with each hop of the "call" host function */
    public caller: string;

    /** Original transaction submitter */
    public origin: string;

    /** Called smart contract method */
    public method: string = '';

    /** Internal smart contract call depth */
    public depth: number = 0;

    constructor(ctx?: CTX) {
        this.network = ctx ? ctx.network : '';
        this.owner = ctx ? ctx.owner : '';
        this.caller = ctx ? ctx.caller : '';
        this.origin = ctx ? ctx.origin : '';
        this.method = ctx ? ctx.method : '';
        this.depth = ctx ? ctx.depth : 0;
    }

    setNetwork(network: string) {
        this.network = network;
        return this;
    }

    setOwner(owner: string) {
        this.owner = owner;
        return this;
    }

    setCaller(caller: string) {
        this.caller = caller;
        return this;
    }

    setOrigin(origin: string) {
        this.origin = origin;
        return this;
    }

    setMethod(method: string) {
        this.method = method;
        return this;
    }

    setDepth(depth: number) {
        this.depth = depth;
        return this;
    }

    set(owner: string, caller?: string, origin?: string) {
        this.owner = owner;
        this.caller = caller ? caller : this.owner;
        this.origin = origin ? origin : this.caller;

    }

    derive(newOwner: string, newMethod: string): CTX {
        const ctx = new CTX(this);
        ctx.caller = this.owner;
        ctx.owner = newOwner;
        ctx.method = newMethod;
        ctx.depth++;
        return ctx;
    }

    toBytes(): Uint8Array {
        const bytes = Utils.mpEncode(
            [
                this.depth,
                this.network,
                this.owner,
                this.caller,
                this.method,
                this.origin,
            ]
        );
        return new Uint8Array(bytes);
    }

    fromBytes(bytes: Uint8Array): CTX {
        const decodedObj = Utils.mpDecode(bytes) as TCTXDecoded;
        this.depth = decodedObj[0];
        this.network = decodedObj[1];
        this.owner = decodedObj[2];
        this.caller = decodedObj[3];
        this.method = decodedObj[4];
        this.origin = decodedObj[5];
        return this;
    }
}

export default CTX;
