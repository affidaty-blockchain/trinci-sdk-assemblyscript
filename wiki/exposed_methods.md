[<BACK](index.md)
# Exposed methods
Exposed methods are those methods which are callable directly from a transaction.
Methods can be exposed in two ways: manual (defining custom "run" function) or automatic (decorator). Custom run function (and other internal functions) are discussed in the wiki section relative to the [`index.ts` file](index_file.md)  
Example of a method exposed using decorator:
```ts
@exposed
function my_method(ctx: sdk.Types.AppContext, args: string): sdk.Types.WasmResult {
    // do something...
}
```
## `@exposed` decorator
> `@exposed` decorator gets processed only inside `assembly/index.ts` file.

This decorator allows to expose methods automatically.  
IDEs like VSCode use TypeScript to do code checks. Sinse TypeScript does not support function decorators, it will mark `@exposed` as error, even if compilation goes just fine. To avoid it you can put `// @ts-ignore` comment one line above decorator. This will silence TypeScript for the line following that comment:
```ts
// @ts-ignore
@exposed
function init(ctx: sdk.Types.AppContext, config: Config): sdk.Types.WasmResult
```
## Signature
### Parameters
> Parameter name doesn't matter.  

Public method parameters can have following formats:
- one parameter of type `sdk.Types.AppContext`(exactly): args received from transaction (if any) are not passed to the called method
    ```ts
    @exposed
    function my_method(ctx: sdk.Types.AppContext): sdk.Types.WasmResult {
        // do something...
    }
    ```
- two parameters (first parameter **MUST** be of type `sdk.Types.AppContext`)
    - second parameter of type `ArrayBuffer`: no deserialization will be performed and args bytes will be passed to the called method "as is".
        ```ts
        @exposed
        function my_method(ctx: sdk.Types.AppContext, txArgs: ArrayBuffer): sdk.Types.WasmResult {

            // do something...

            // returning received args directly
            return sdk.Return.SuccessWithRawBytes(txArgs);
        }
        ```
    - second parameter of one of internal types: f32, f64, bool, u8, u16, u32, u64, i8, i16, i32, i64, string or arrays of those types. In this case msgpack deserialization gets performed automatically via `sdk.MsgPack.deserializeInternalType<T>()` generic function.
        ```ts
        @exposed
        function my_method(ctx: sdk.Types.AppContext, txArgs: string): sdk.Types.WasmResult {

            // do something...

            // returning received args directly
            return sdk.Return.SuccessWithInternalType(txArgs);
        }
        ```
    - second parameter of a msgpackable type: in this case msgpack deserialization gets performed automatically via `sdk.MsgPack.deserialize<T>()` generic function.
        ```ts
        @msgpackable class MyArgs {
            str: string = '';
            num: u64 = 0;
        }

        @exposed
        function my_method(ctx: sdk.Types.AppContext, txArgs: MyArgs): sdk.Types.WasmResult {

            // do something...

            // returning received args directly
            return sdk.Return.SuccessWithDecoratedType(txArgs);
        }
        ```

### Return

Public method return type must be "sdk.Types.WasmResult" (exactly).