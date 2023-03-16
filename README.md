# TRINCI Assemblyscript Smart Contract SDK

Official Trinci 2 smart contract SDK library for assemblyscript

- [Changelog](./CHANGELOG.md)

- [WIKI](./wiki/index.md)
- [Generated SDK documentation]()
- [Generated test suite documentation]()

## Description

This library will allow you to write your own TRINCI smart contracts in assemblyscript, test them and publish it to the network.

## Usage

1. Create a new directory to host your project

2. Move into that directory

3. Install SDK: `npm install @affidaty/trinci-sdk-as`
    > Alternatively a project setup wizard can be used with  
    >```
    >npm init blockchain
    >```
    > In this case steps 1-4 can be skipped

4. Launch the initialization script inside sdk package: `./node_modules/@affidaty/trinci-sdk-as/init.sh`
5. Install all dependencies: `npm install`
6. At this point you can explore an example smart contract(entry point: `assembly/index.ts`).  
    Example asset smart contract contains all things you need to succesfully create your own basic smart contract.
7. Compilation: `npm run asbuild`.  
    Sample smart contract is compilable right out of the box.
8. Test: `npm run test`.  
    Example smart contract test can be found at `test/example.spec.ts`
