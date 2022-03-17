import { default as Utils } from './utils';
import { default as MsgPack } from './msgpack';
import { default as Types } from './types';

/**
 * Helper functions that create, encode and save to memory various smart contract return types
 */
export namespace Return {
    /**
     * Returns an Error with passed error message. If this is returned by the top-level wasm call
     * (originated directly by a transaction, meaning ctx.depth is 0) then the transaction fails.
     * @param message - Error message
     */
    export function Error(message:string):Types.TCombinedPtr {
        return MsgPack.appOutputEncode(false, Utils.stringtoU8Array(message));
    }

    /**
     * Returns combined pointer to a passed serialized value wrapped in a Success response;
     * If this is returned by the top-level wasm call (originated directly by a transaction,
     * meaning ctx.depth is 0) then the transaction succeeds.
     * @template T - internal type
     * @param value - value you want to return
    */
    export function Success<T>(value:T):Types.TCombinedPtr {
        return MsgPack.appOutputEncode(true, MsgPack.serializeInternalType<T>(val));
    }

    /**
     * Returns combined pointer to an array of byteswrapped in a Success response;
     * Useful when, for example, you need to use your own serialization format.
     * @param bytes - bytes you want to return
    */
    export function SuccessBytes(bytes: u8[]):Types.TCombinedPtr {
        return MsgPack.appOutputEncode(true, bytes);
    }

    /**
     * Returns combined pointer to a passed serialized value wrapped in a Success response;
     * In this case value must be a custom class decorated with a `@msgpackable` decorator..
     * @template T - class decorated with a `@msgpackable` decorator.
     * @param value - value you want to return
    */
    export function SuccessAsObject<T>(value:T):Types.TCombinedPtr {
        return MsgPack.appOutputEncode(true, MsgPack.serialize<T>(value));
    }

    /**
     * Returns a combined pointer to encoded 'true' value wrapped in a 'Success' response;
     */
    export function True():Types.TCombinedPtr {
        return MsgPack.appOutputEncode(true, [0xc3]);
    }

    /**
     * Returns a combined pointer to encoded 'false' value wrapped in a 'Success' response;
     */
    export function False():Types.TCombinedPtr {
        return MsgPack.appOutputEncode(true, [0xc2]);
    }

    /**
     * Returns a combined pointer to encoded 'null' value wrapped in a 'Success' response;
     */
    export function Null():Types.TCombinedPtr {
        return MsgPack.appOutputEncode(true, [0xc0]);
    }
}

export namespace Response {
    export function isSome(data: u8[]): boolean {
        return data.length > 0;
    }

    export function isEmpty(data: u8[]): boolean {
        return data.length <= 0;
    }
}
