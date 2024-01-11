import { AppOutput, WasmResult } from './types';
import { combinePtr } from './utils';
import { storeData as storeDataToMem } from './memUtils';
import { serializeAppOutput, serializeDecorated, serializeInternalType } from './msgpack';

/**
 * Returns an Error with passed error message. If this is returned by the top-level wasm call
 * (originated directly by a transaction, meaning ctx.depth is 0) then the transaction fails.
 * @param message - Error message
 */
export function Error(message: string): WasmResult {
    const messageAb = String.UTF8.encode(message);
    const outputAb = serializeAppOutput(new AppOutput(false, messageAb));
    return combinePtr(storeDataToMem(outputAb), outputAb.byteLength);
}

/**
 * Returns combined pointer to an array of bytes wrapped in a Success response;
 * Useful when, for example, you need to use your own (de)serialization format.
 * @param execResult - raw bytes you want to return as execution result
*/
export function SuccessWithRawBytes(execResult: ArrayBuffer): WasmResult {
    const outputAb = serializeAppOutput(new AppOutput(true, execResult));
    return combinePtr(storeDataToMem(outputAb), outputAb.byteLength);
}

/**
 * Returns combined pointer to a passed serialized value wrapped in a Success response;
 * If this is returned by the top-level wasm call (originated directly by a transaction,
 * meaning ctx.depth is 0) then the transaction succeeds.
 * @template T - an internal type
 * @param execResult - value you want to return
*/
export function SuccessWithInternalType<T>(execResult: T): WasmResult {
    const outputAb = serializeAppOutput(new AppOutput(true, serializeInternalType<T>(execResult)));
    return combinePtr(storeDataToMem(outputAb), outputAb.byteLength);
}

/**
 * Returns combined pointer to a passed serialized value wrapped in a Success response;
 * In this case value must be a custom class decorated with a `@msgpackable` decorator..
 * @template T - class decorated with a `@msgpackable` decorator.
 * @param value - value you want to return
*/
export function SuccessWithDecoratedType<T>(value: T): WasmResult {
    const outputAb = serializeAppOutput(new AppOutput(true, serializeDecorated(value)));
    return combinePtr(storeDataToMem(outputAb), outputAb.byteLength);
}

/**
 * Returns a combined pointer to a msgpacked 'true' value wrapped in a 'Success' response;
 */
export function SuccessWithTrue(): WasmResult {
    const outputAb = serializeAppOutput(new AppOutput(true, changetype<ArrayBuffer>(([0xc3] as u8[]).dataStart)));
    return combinePtr(storeDataToMem(outputAb), outputAb.byteLength);
}

/**
 * Returns a combined pointer to a msgpacked 'false' value wrapped in a 'Success' response;
 */
export function SuccessWithFalse(): WasmResult {
    const outputAb = serializeAppOutput(new AppOutput(true, changetype<ArrayBuffer>(([0xc2] as u8[]).dataStart)));
    return combinePtr(storeDataToMem(outputAb), outputAb.byteLength);
}

/**
 * Returns a combined pointer to a msgpacked 'null' value wrapped in a 'Success' response;
 */
export function SuccessWithNull(): WasmResult {
    const outputAb = serializeAppOutput(new AppOutput(true, changetype<ArrayBuffer>(([0xc0] as u8[]).dataStart)));
    return combinePtr(storeDataToMem(outputAb), outputAb.byteLength);
}
