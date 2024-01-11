[<BACK](index.md)

# `assembly/index.ts` file
This file is the entry point of your smart contract. It's path must be exactly `assembly/index.ts`

## Imports

Smart contract's entry file `MUST` import trinci sdk as "sdk":
```ts
import sdk from './sdk';
```

Other namespaces can also de imported. The important thing is to keep the import of the `default` under the name `sdk`:
```ts
import { default as sdk, OwnerDB, AccountAssetU64} from './sdk';
```



## Exports
> You don't need to actually write functions described below.  
> They are generated and added automatically by transformer during compilation process. It is possible, however, to write custom alloc, run and is_callable, should the need arise. Upon detecting custom function, trasformer will just check it for signature correctness.  

> NOTE: In following examples a `methodsMap` is used. It is a top level variable declared like this:  
> ```ts
> const methodsMap = new Map<string, (ctx: sdk.Types.AppContext, args: u8[])=>sdk.Types.WasmResult>();
> ```
> Each public method must be inserted into map like this:
> ```ts
> methodsMap.set('test_method', testMethod);
> function testMethod(_ctx: sdk.Types.AppContext, argsU8: u8[]): sdk.Types.WasmResult {
>     // do something
>     return sdk.Return.True();
> }
> ```

In order for a smart contract to work properly a number of functions must be exported from entry file:
- #### `alloc(size: u32): u32`
   Gets called both by core and internally before writing anything to WASM heap. It allows to use internal wasm memory allocator to safely allocate a contiguous region of WASM heap of `<size>` bytes to store there data to pass to the smart contract. It accepts a 32-bit integer number representing size of data to allocate in bytes and returns memory offset at which to start writing data.  
    Example:
    ```ts
    export function alloc(size: u32): u32 {
        return sdk.MemUtils.alloc(size);
    }
    ```

- #### `run(ctxAddress: u32, ctxSize: u32, argsAddress: u32, argsSize: u32): u64`
   This is like main() function in many programming languages: it is an entry point that gets called by core and, depending on the internal smart contract logic, calls other internal methods. `run()` gets passed MessagePack encoded CTX (execution context, more on that later) and raw unchanged transaction argument bytes. It returns a 64-bit number, which is two 32-bit numbers representing offset and size of MessagePack encoded return structure (more on that later).  
    Example:
    ```ts
    export function run(ctxAddress: i32, _ctxSize: i32, argsAddress: i32, _argsSize: i32): sdk.Types.WasmResult {

        // decoding context and getting args from memory
        let ctx = sdk.MsgPack.deserializeCtx(sdk.MemUtils.loadData(ctxAddress));
        let argsBytes: ArrayBuffer = sdk.MemUtils.loadData(argsAddress);

        if (ctx.method == 'my_method_1') {
            const args: string = sdk.MsgPack.deserializeInternalType<string>(argsBytes);
            return myMethod1(ctx, args);
        } else if (ctx.method == 'my_method_2') {
            // here `MyClass` must have `@msgpackable` decorator
            const args: MyClass = sdk.MsgPack.deserializeDecorated<MyClass>(argsBytes);
            return myMethod2(ctx, args);
        }

        return sdk.Return.Error('method not found');
    }
    ```

- #### `is_callable(methodNameAddress: u32, methodNameSize: u32): u8`
   This function gets memory offset and size of the MessagePack encoded string containing name of the method. It returns 1 if such method can be called on this smart contract, 0 otherwise. Even if, technically, a smart contract can be executed perfectly fine even without this function exported, it is highly suggested to export such function in order to give core (and other smart contracts) a way to determine if a method can be called on your contract without actually trying to call it.  
    Example:
    ```ts
    export function is_callable(methodAddress: i32, methodSize: i32): u8 {
        // decoding method from memory
        const calledMethod: string = sdk.MsgPack.deserializeInternalType<string>(sdk.MemUtils.loadData(methodAddress));
        // ERROR IF METHOD NOT REGISTERED
        return (methodNamesArray.indexOf(calledMethod) >= 0) ? 1 : 0;
    }
    ```