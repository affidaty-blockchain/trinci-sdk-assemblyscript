[<BACK](index.md)
# MessagePack

## External resources

- [Official site](https://msgpack.org/)
- [JSON<->MsgPack converter](https://msgpack.solder.party/)
- [Msgpack Visualizer](https://sugendran.github.io/msgpack-visualizer/) - This browser utility allows to parse and view internal msgpack structure and tags. **Works only with Base64 strings**.

&nbsp;

## Overview

TRINCI platform is made in a way that allows it to be unaffected by the single smart contract execution logic and data serialization allowing smart contract developers to use a wast selection of tools, transcoders and serializers.

However in order for the smart contracts to interact with each other in a seamless way, there's need to agree on common interfaces and transcoding format. We aim to make msgpack such standard on our platform. All service communication channels between core and WASm machine are currently using msgpack as main serialization format.

A number of functions and features have been integrated into SDK to aid developers handling messagepack transcoding. Those functions are grouped into `MsgPack` namespace and can be imported like so:
```ts
import { MsgPack } from './sdk';
```

&nbsp;

## Internal types

The easiest way to use sdk msgpack feature
r is to transcode plain internal AssemblyScript types with no additional formatting.
It can be done using following two template functions:

```ts
    // serialization
    sdk.MsgPack.serializeInternalType<T>(val: T): u8[];

    // deserialization
    sdk.MsgPack.deserializeInternalType<T>(bytes: u8[]): T;
```

> Currently supported internal types: `bool`, `u8`, `u16`, `u32`, `u64`, `i8`, `i16`, `i32`, `i64`, `f32`, `f64`, `string`, `ArrayBuffer` **and also arrays of those types** like `string[]` or `bool[]` etc.

#### Examples:

```ts
    const value: string[] = ['Hello', 'world!'];
    // this logs "value(2 elems): [Hello, world!]"
    sdk.HostFunctions.log(`value(${value.length.toString()} elems): [${value[0]}, ${value[1]}]`);

    // serialization
    const serBytes = MsgPack.serializeInternalType(value);
    // converting u8[] to hex string
    const serBytesHexStr = sdk.Utils.arrayBufferToHexString(sdk.Utils.u8ArrayToArrayBuffer(serBytes));
    // this logs "serialized bytes : [92a548656c6c6fa6776f726c6421]"
    sdk.HostFunctions.log(`serialized bytes : [${serBytesHexStr}]`);

    // deserialization
    const deserValue = MsgPack.deserializeInternalType<string[]>(serBytes);
    // this logs "deserialized(2 elems): [Hello, world!]"
    sdk.HostFunctions.log(`deserialized(${deserValue.length.toString()} elems): [${deserValue[0]}, ${deserValue[1]}]`);
```

```ts
    // bool
    const value = true;
    const serBytes = MsgPack.serializeInternalType(value);

    // serialized hex: [c3]
```

```ts
    // u64
    const value: u64 = 0xffffffffffffffff;
    const serBytes = MsgPack.serializeInternalType(value);

    // serialized hex: [cfffffffffffffffff]
```

```ts
    // string
    const value = 'Hello world!';
    const serBytes = MsgPack.serializeInternalType(value);

    // serialized hex: [ac48656c6c6f20776f726c6421]
```

```ts
    // ArrayBuffer
    // This type is used for raw binary data transmission
    const value = sdk.Utils.u8ArrayToArrayBuffer([0xff, 0x00, 0xcc, 0xff]);
    const serBytes = MsgPack.serializeInternalType(value);

    // serialized hex: [c404ff00ccff]
```

&nbsp;

## Class decorator

Another way of transcoding data structures without resorting to custom transcoder is `@msgpackable` decorator.
It can be used in case you need to transcode an object with named properties. All (and only) types supported by `serializeInternalType()` are also supported by this decorator. 

First of all you need to declare a new class for the structure you need to serialize.

```ts
@msgpackable
class TransferArgs {
    from: string = '';
    to: string = '';
    units: u64 = 0;
}
```

> IMPORTANT: In must be possible to declare a new instance of that class without passing any argument to the constructor: `const args = new TransferArgs();`

Another way to declare the same class:
```ts
@msgpackable
class TransferArgs {
    from: string;
    to: string;
    units: u64;

    constructor(from: string = '', to: string = '', units: u64 = 0) {
        this.from = from;
        this.to = to;
        this.units = units;
    }
}
```

This way we have exactly the same result as before, but it is also possible to create a new instance of that class both with or without passing args to constructor.

Types different from those listed above are not supported, meaning that classes declared like that are not supported: 
```ts
@msgpackable
class UnsupportedClass {
    from: string = '';
    to: string = '';
    unsupportedProperty: Map<string, u64> = new Map<string, u64>();
}

@msgpackable
class AnotherUnsupportedClass {
    from: string = '';
    to: string = '';
    unsupportedProperty: UnsupportedClass = new UnsupportedClass();
}
```

Once the class has been declared, it can be (de)serialized using integrated template functions:
```ts
MsgPack.serialize<T>(value: T): u8[];
MsgPack.deserialize<T>(bytes: u8[]): T
```
like so:
```ts
// deserialization u8[] -> T
const deserializedArgs = MsgPack.deserialize<TransferArgs>(receivedArgsBytes);

// serialization T -> u8[]
const serializedArgsBytes = MsgPack.serialize(deserializedArgs);
```

During deserialization of a decorated class it is ok if some fields are missing in serialized bytes(even all of them). In that case corresponding values will be set to default value. However if there's an unknown property deserialization will fail.

If we define our class like this:

```ts
@msgpackable
class TransferArgs {
    from: string = '';
    to: string = '';
    units: u64 = 0;
}
```
We could have 3 scenarios:

1. Received args bytes:  `83a466726f6daa2346726f6d56616c7565a2746fa823546f56616c7565a5756e697473cffffffffffffffff`  
    This is ok. Every property has been defined correctly.  
    Deserialization result: `{from: "#FromValue", to: "#ToValue", units: 18446744073709551615}`

2. Received args bytes: `82a466726f6daa2346726f6d56616c7565a2746fa823546f56616c7565`  
    This is ok. Missing `units` property. Default value is assumed.  
    Deserialization result: `{from: "#FromValue", to: "#ToValue", units: 0}`

3. Received args bytes: `83a466726f6daa2346726f6d56616c7565a2746fa823546f56616c7565a4756e6974cfffffffffffffffff`  
    This will throw. Property name  is `unit` instead of `units`
    Deserialization result: Wasm machine fault.
&nbsp;

## Examples of encoded data

```json
// map with properties of various types
{
    "stringKey": "test string value",
    "boolKey": true,
    "numKey": 42,
    "bytesKey": <Bytes 0xff 0x00 0xff 0xcc> // no particular meaning. Just random bytes
}

// Serialization result: [84a9737472696e674b6579b17465737420737472696e672076616c7565a7626f6f6c4b6579c3a66e756d4b65792aa862797465734b6579c404ff00ffcc]
```

### CTX
```json
[
    0, // depth
    "", // current network name
    "#Alias", // owner
    "QmfRmgXv4rtgS1UfRgfyEFuV56eWTDUixKP8se85RThJqG", // caller
    "init", // method
    "QmfRmgXv4rtgS1UfRgfyEFuV56eWTDUixKP8se85RThJqG" // origin
]

// Serialization result: [9600a0a623416c696173d92e516d66526d675876347274675331556652676679454675563536655754445569784b5038736538355254684a7147a4696e6974d92e516d66526d675876347274675331556652676679454675563536655754445569784b5038736538355254684a7147]
```

### Return

```json
[
    true, // this makes core save db status after transaction (tx has been successful)
    <Bytes c3> // msgpack encoded "true" value
]

// serialization result: [92c3c401c3]
```

```json
[
    true, // this makes core save db status after transaction (tx has been successful)
    <Bytes 2a> // msgpack encoded 42 (number) value
]

// serialization result: [92c3c4012a]
```
```json
[
    false, // this makes core drop new db status after transaction (tx has failed)
    <Bytes 6d79206572726f72206d657373616765> // utf-8 encoded error message "my error message"
]

// serialization result: [92c2c4106d79206572726f72206d657373616765]
```
