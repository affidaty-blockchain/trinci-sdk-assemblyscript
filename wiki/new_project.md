[<BACK](index.md)
# New Project

## Prerequisites

See `engines` section of the [`package.json` file](https://github.com/AssemblyScript/assemblyscript/blob/main/package.json) inside [official assemblyscript repository](https://github.com/AssemblyScript/assemblyscript).

&nbsp;

---
## Project initialization

While it is possible to create a new AssemblyScript project from scratch following guide on AssemblyScript official site, it is recommended to use exiting scripts, as they allow you to create automatically all recurring boilerplate code and 

&nbsp;

### Using create-blockchain package

Let's assume we are currently at `/home/user/my_contracts`

first run
```sh
npm init blockchain
```

running this command will use a special [`create-blockchain` package](https://www.npmjs.com/package/create-blockchain) to initialize a new AssemblyScript project which is already configured for development of a wasm application compatible with TRINCI platform as well as a configured Jest environment.

After that a cli-based installation wizard will ask you a few questions regarding your project.

Once finished, you'll se a directory inside your current working dir named after your project name. Navigate there with
```
cd <your-project-name>
```

and install dependencies with 
```
npm i
```

At this point your project should be ready for development of a new TRINCI smart contract.

&nbsp;

### Using sdk package itself

If, for some reason, using initialization package is not an option for you, the sdk package itself can be used to create initial structure.  
Once SDK package ([`@affidaty/trinci-sdk-as`](https://www.npmjs.com/package/@affidaty/trinci-sdk-as)) has been installed with  

```
npm i @affidaty/trinci-sdk-as
```

to the directory of your choice, simply substitute the content of the current folder with files from `./node_modules/@affidaty/trinci-sdk-as/boilerplate`, remove current `node_modules` and reinstall all dependencies.



&nbsp;

---
[^UP](#new-project)
## Files overview

```ts
.
├──asconfig.json // assemblyscript compiler options
├──assembly // actual assemblyscrpt code
│   ├──decorators.d.ts // @decorators type to make IDE happy
│   ├──index.ts // smart contract entry point
│   ├──sdk.ts // allows to import modules from just "./sdk"
│   └──tsconfig.json
├──jest.config.js // jest test environment settings
├──transformer.mjs // transformer. used during compilation
├──package.json
├──publishAccount.json // used with publish scripts
├──publishMetadata.json // used with publish scripts
├──test
│   └──example.spec.ts // example test
└──tsconfig.json
```

## Following steps

### Compilation

Once boilerplate code and configs have been copied open `./assembly/index.ts` to view an example of smart contract implementation with comments.
The example smart contract is ready for compilation, which can be done by executing one of npm scripts from `./package.json`:

```
npm run asbuild
```

After smart contract has been compiled, you can find wasm files in `./build`. output paths can be set in `./asconfig.json`.

### Tests

### Deployment