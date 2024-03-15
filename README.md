# TRINCI Assemblyscript Smart Contract SDK

Official Trinci 2 smart contract SDK library for assemblyscript

- [Changelog](https://github.com/affidaty-blockchain/trinci-sdk-assemblyscript/blob/master/CHANGELOG.md)

- [WIKI](https://github.com/affidaty-blockchain/trinci-sdk-assemblyscript/blob/master/wiki/index.md)
- [Generated SDK documentation](https://htmlpreview.github.io/?https://raw.githubusercontent.com/affidaty-blockchain/trinci-sdk-assemblyscript/master/docs/sdk/modules.html)
- [Generated test suite documentation](https://htmlpreview.github.io/?https://github.com/affidaty-blockchain/trinci-sdk-assemblyscript/blob/master/docs/testenv/modules.html)

## Description

This library will allow you to write your own TRINCI smart contracts in assemblyscript, test and publish them to the network.

## Usage

1. Create a new directory to host your project

2. Move into that directory

3. Install SDK: `npm install @affidaty/trinci-sdk-as`
    > Alternatively a project setup wizard can be used with  
    >```
    >npm init blockchain
    >```
    > In this case steps 1-4 can be skipped
    >> Note that you will need to clear npx cache, otherwise npx will continue to use outdated version.

4. Being inside project root directory, launch the initialization script with npx: `npx trinci-sdk-init`
    > Initialization script will merge the content of `node_modules/@affidaty/trinci-sdk-as/boilerplate` directory with current working directory.  
    > Existing files, if any, will be overwritten.  
    > User will be asked to comfirm the operation  
    > Confirmation can be skipped using `-y` flag: `npx trinci-sdk-init -y`
5. Install all dependencies: `npm install`  
6. At this point you can explore an example smart contract(entry point: `assembly/index.ts`).  
    Example asset smart contract contains all things you need to succesfully create your own basic smart contract.
7. Compilation: `npm run asbuild`.  
    Sample smart contract is compilable right out of the box.
8. Test: `npm run test`.  
    Example smart contract test can be found at `test/example.spec.ts`  
    > If you need to test smart contract event capturing with custom software  
    > you can use socket relay: `npm run relay` or `npx trinci-sdk-sock-relay`  
    > to which you can connect from both test environment and ypour custom software  
    > Check out `emit` section inside `example.spec.ts` for an example on how to use socket connection from jest environment.
9. Edit `publishMetadata.json` with updated info on your smart contract.
10. Use one of publish scripts from `package.json` which, in turn, executes `npx trinci-sdk-publish` to publish your smart contract.

