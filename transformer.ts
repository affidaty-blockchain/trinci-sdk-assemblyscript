import {
    Parser,
    Tokenizer,
    Source,
    FunctionDeclaration,
    ClassDeclaration,
    FieldDeclaration,
    Statement,
} from 'assemblyscript/dist/assemblyscript.js';
import {
    TransformVisitor,
    utils,
    SimpleParser,
} from './visitor-as/index.js';

const pubMethodDecoratorName = 'exposed';
const msgpackableDecoratorName = 'msgpackable';
const optClassFieldDecoratorName = 'optional';
const reservedClassFields = [
    '__structure',
    '__setters',
    '__getters',
    '__isFieldSet',
];
const internalTypesList = [
    'f32', 'f64', 'bool',
    'u8', 'u16', 'u32', 'u64',
    'i8', 'i16', 'i32', 'i64',
    'string', 'String', '~lib/string/String',
    'ArrayBuffer', '~lib/arraybuffer/ArrayBuffer',
    'Array<f32>', 'Array<f64>', 'Array<bool>',
    'Array<u8>', 'Array<u16>', 'Array<u32>', 'Array<u64>',
    'Array<i8>', 'Array<i16>', 'Array<i32>', 'Array<i64>',
    'Array<string>', 'Array<String>', 'Array<~lib/string/String>',
    'Array<ArrayBuffer>', 'Array<~lib/arraybuffer/ArrayBuffer>',
];

let publicMethods: {[key: string]: {args: [string, string][], return: string}} = {};
let msgpackableClasses: string[] = [];
let isMainAllocDefined = false;
let isMainIsCallableDefined = false;
let isMainRunDefined = false;

function isInternalType(typeName: string): boolean {
    return internalTypesList.includes(typeName);
}

function checkCustomRunFunction(node: FunctionDeclaration): void {
    // exported == 2, so we isolate 2nd lsb value
    if ((node.flags & 0x02) == 0) {
        throw new Error('Custom "run" must have "export" modifier');
    }
    const signatureErrorMessage = 'custom "run" function must have one of two signatures: (u32, u32, u32, u32) => sdk.Types.WasmResult or (u32, u32, u32, u32) => u64'
    if (utils.getName(node.signature.returnType) != 'sdk.Types.WasmResult'
        && utils.getName(node.signature.returnType) != 'u64'
    ) throw new Error(signatureErrorMessage);
    if (!node.signature.parameters || node.signature.parameters.length != 4) throw new Error(signatureErrorMessage);
    node.signature.parameters.forEach((param) => {
        if (utils.getName(param.type) != 'u32') throw new Error(signatureErrorMessage);
    })
}

function checkCustomAllocFunction(node: FunctionDeclaration): void {
    if ((node.flags & 0x02) == 0) {
        throw new Error('Custom "alloc" must have "export" modifier');
    }
    const signatureErrorMessage = 'custom "alloc" function must have exacly this signature: (u32) => u32'
    if (utils.getName(node.signature.returnType) != 'u32') throw new Error(signatureErrorMessage);
    if (!node.signature.parameters || node.signature.parameters.length != 1) throw new Error(signatureErrorMessage);
    node.signature.parameters.forEach((param) => {
        if (utils.getName(param.type) != 'u32') throw new Error(signatureErrorMessage);
    })
}

function checkCustomIsCallableFunction(node: FunctionDeclaration): void {
    if ((node.flags & 0x02) == 0) {
        throw new Error('Custom "is_callable" must have "export" modifier');
    }
    const signatureErrorMessage = 'custom "is_callable" function must have exacly this signature: (u32, u32) => u8'
    if (utils.getName(node.signature.returnType) != 'u8') throw new Error(signatureErrorMessage);
    if (!node.signature.parameters || node.signature.parameters.length != 2) throw new Error(signatureErrorMessage);
    node.signature.parameters.forEach((param) => {
        if (utils.getName(param.type) != 'u32') throw new Error(signatureErrorMessage);
    })
}

function parseTopLevelStatement(sourcePath: string, stmtStr: string): Statement {
    const stmt = new Parser().parseTopLevelStatement(new Tokenizer(new Source(0, sourcePath, stmtStr)));
    if (!stmt) throw new Error(`Error parsing top level statement; Source path "${sourcePath}"; Statement string: ${stmtStr}`);
    return stmt;
}

function getStructure(node: any): [string, string, boolean][] {
    let result: [string, string, boolean][] = [];
    for (let memderIdx = 0; memderIdx < node.members.length; memderIdx++) {
        if (node.members[memderIdx] instanceof FieldDeclaration) {
            let fieldName = utils.getName(node.members[memderIdx]);
            if (reservedClassFields.includes(fieldName)) {
                throw new Error(`Cannot have \"${fieldName}\" field in a msgpackable class. This is a reserved internal name.`)
            }
            let fieldType = utils.getName(node.members[memderIdx].type);
            let isOptional = false;
            if (node.members[memderIdx].decorators && node.members[memderIdx].decorators.length > 0) {
                for (let fieldDecIdx = 0; fieldDecIdx < node.members[memderIdx].decorators.length; fieldDecIdx++) {
                    if (utils.getName(node.members[memderIdx].decorators[fieldDecIdx]) === optClassFieldDecoratorName){
                        isOptional = true;
                    }
                }
            }
            result.push([fieldName, fieldType, isOptional]);
        }
    }
    return result;
}

function getSetters(structure: [string, string, boolean][], node: any): string[] {
    let result: string[] = [];
    for (let i = 0; i < structure.length; i++) {
        let setterCode: string = `changetype<usize>((c:${utils.getName(node)}, v:${structure[i][1]}):void=>{c.${structure[i][0]}=v;})`;
        result.push(setterCode);
    }
    return result;
}

function getGetters(structure: [string, string, boolean][], node: any): string[] {
    let result: string[] = [];
    for (let i = 0; i < structure.length; i++) {
        let getterCode = `changetype<usize>((c:${utils.getName(node)}):${structure[i][1]}=>{return c.${structure[i][0]};})`;
        result.push(getterCode);
    }
    return result;
}

class Transformer extends TransformVisitor {
    // visitImportStatement(node: ImportStatement): ImportStatement {
    //     // console.log(`import `);
    //     return super.visitImportStatement(node);
    // }
    visitClassDeclaration(node: ClassDeclaration): ClassDeclaration {
        if (node.decorators && node.decorators.length > 0) {
            for (let decoratorIdx = 0; decoratorIdx < node.decorators.length; decoratorIdx++) {
                if (utils.getName((node as any).decorators[decoratorIdx]) === msgpackableDecoratorName) {
                    msgpackableClasses.push(utils.getName(node))
                    // getting class structure to use for code generation below
                    let structure = getStructure(node);
                    // adding '__structure' member to class. It contains names and types of
                    // all members of the class.
                    let structureMemberCode = '__structure: string[][] = [';
                    for (let i = 0; i < structure.length; i++) {
                        if (i > 0) {
                            structureMemberCode += ',';
                        }
                        structureMemberCode += '[\'';
                        structureMemberCode += structure[i][0];
                        structureMemberCode += '\',\'';
                        structureMemberCode += structure[i][1];
                        structureMemberCode += '\']';
                    }
                    structureMemberCode += '];';
                    node.members.push(SimpleParser.parseClassMember(structureMemberCode, node));

                    // '__setters' member will allow to set value of any class member
                    let setters = getSetters(structure, node);
                    let settersMemberCode = '__setters: usize[] = [';
                    for (let i = 0; i < structure.length; i++) {
                        if (i > 0) {
                            settersMemberCode += ',';
                        }
                        settersMemberCode += setters[i];
                    }
                    settersMemberCode += '];';
                    node.members.push(SimpleParser.parseClassMember(settersMemberCode, node)); //parse StaticArray.fromArray expression

                    // '__getters' member will allow to get value of any class member
                    let getters = getGetters(structure, node);
                    let gettersMemberCode = '__getters: usize[] = [';
                    for (let i = 0; i < structure.length; i++) {
                        if (i > 0) {
                            gettersMemberCode += ',';
                        }
                        gettersMemberCode += getters[i];
                    }
                    gettersMemberCode += '];';
                    node.members.push(SimpleParser.parseClassMember(gettersMemberCode, node));//parse StaticArray.fromArray expression

                    // this one keeps track of which field has been set and which not during deserialization. Optional fields get marked as set right away.
                    // if any field is marked as not set after the deserialization ends, then a deserialization faillure error is set.
                    let isFieldSetCode = '__isFieldSet: bool[] = [';
                    for (let i = 0; i < structure.length; i++) {
                        if (i > 0) {
                            isFieldSetCode += ',';
                        }
                        // if structure[i][2] is "true", then this field is optional and must be marked as set right away
                        isFieldSetCode += structure[i][2] ? 'true' : 'false';
                    }
                    isFieldSetCode += '];';
                    node.members.push(SimpleParser.parseClassMember(isFieldSetCode, node));//parse StaticArray.fromArray expression
                }
            }
        }
        return super.visitClassDeclaration(node);
    }

    visitFunctionDeclaration(node: FunctionDeclaration): FunctionDeclaration {
        // first check if this is one of custom run/allor/is_callable functions (only in main index file)
        if (node.range.source.normalizedPath == 'assembly/index.ts') {
            const name = utils.getName(node);
            if (name == 'alloc') {
                checkCustomAllocFunction(node);
                isMainAllocDefined = true;
                console.log('Found custom "alloc"');
            } else if (name == 'is_callable') {
                checkCustomIsCallableFunction(node);
                isMainIsCallableDefined = true;
                console.log('Found custom "is_callable"');
            } else if (name == 'run') {
                checkCustomRunFunction(node);
                isMainRunDefined = true;
                console.log('Found custom "run"');
            }
        }
        if (node.decorators && node.decorators.length > 0) {
            for (let decoratorIdx = 0; decoratorIdx < node.decorators.length; decoratorIdx++) {
                if (utils.getName((node as any).decorators[decoratorIdx]) === pubMethodDecoratorName) {
                    /** @type {{args: [string, string][], return: string}} */
                    const publicMethodName = utils.getName(node);
                    const publicMethodSignature: {args: [string, string][], return: string} = {
                        args: [],
                        return: '',
                    }
                    if (!node.signature.parameters
                        || (node.signature.parameters.length != 1 && node.signature.parameters.length != 2)
                    ) throw new Error(`public method "${publicMethodName}" must have 1 or 2 arguments; received: ${node.signature.parameters ? node.signature.parameters.length : 0}`);
                    for (let paramIdx = 0; paramIdx < node.signature.parameters.length; paramIdx++) {
                        const parameter = node.signature.parameters[paramIdx];
                        const paramName = utils.getName(parameter);
                        const paramType = utils.getName(parameter.type);
                        // TODO-dynamic-typecheck
                        if (paramIdx == 0 && paramType !== 'sdk.Types.AppContext')
                            throw new Error(`first parameter of public method "${publicMethodName}" must be of type "sdk.Types.AppContext"`);
                        publicMethodSignature.args.push([paramName, paramType]);
                    }
                    publicMethodSignature.return = utils.getName(node.signature.returnType)
                    // TODO-dynamic-typecheck
                    if (publicMethodSignature.return !== 'sdk.Types.WasmResult')
                            throw new Error(`return of public method "${publicMethodName}" must be of type "sdk.Types.WasmResult"`);
                    publicMethods[publicMethodName] = publicMethodSignature;
                }
            }
        }
        return super.visitFunctionDeclaration(node);
    }

    afterParse(parser: Parser): void {
        let sources = parser.sources.filter(utils.not(utils.isLibrary));
        this.visit(sources);
        sources.forEach((source) => {
            if (source.normalizedPath === 'assembly/index.ts') {
                const publicMethodsNames = Object.keys(publicMethods);
                // append automatic functions only if they haven't already been defined by the user
                // alloc
                if (!isMainAllocDefined) {
                    const allocStr = 'export function alloc(size: u32):u32 { return sdk.MemUtils.alloc(size); }';
                    source.statements.push(parseTopLevelStatement(source.normalizedPath, allocStr));
                }

                //is_callable
                if (!isMainIsCallableDefined) {
                    let isCallableStr = "export function is_callable(methodAddress:u32,methodSize:u32):u8{const methodsList:string[]=[";
                    for (let nameIdx = 0; nameIdx < publicMethodsNames.length; nameIdx++) {
                        if (nameIdx > 0) isCallableStr += ',';
                        isCallableStr += `'${publicMethodsNames[nameIdx]}'`;
                    }
                    isCallableStr += "];const calledMethod:string=sdk.MsgPack.deserializeInternalType<string>(sdk.MemUtils.loadData(methodAddress));return methodsList.includes(calledMethod)?1:0;}";
                    source.statements.push(parseTopLevelStatement(source.normalizedPath, isCallableStr));
                }

                //run
                if (!isMainRunDefined) {
                    let runStr = "export function run(ctxAddress:u32,ctxSize:u32,argsAddress:u32,argsSize:u32):sdk.Types.WasmResult{let ctxBytes:ArrayBuffer=sdk.MemUtils.loadData(ctxAddress);let ctx=sdk.MsgPack.deserializeCtx(ctxBytes);let argsBytes:ArrayBuffer=sdk.MemUtils.loadData(argsAddress);"
                    for (let methodIdx = 0; methodIdx < publicMethodsNames.length; methodIdx++) {
                        const publicMethodName = publicMethodsNames[methodIdx];
                        const publicMethod = publicMethods[publicMethodName];
                        // console.log(publicMethod);
                        if (methodIdx > 0) runStr += 'else ';
                        runStr += `if(ctx.method=='${publicMethodName}'){`;
                        // at this time we know there are 1 (only ctx) or 2 (ctx + args) args: [[name0, type0],[name1, type1]]
                        const secondArgType = publicMethod.args.length == 2 ? publicMethod.args[1][1] : '';
                        if (secondArgType == '') {
                            // no secong argument, then no deserialization
                        } else if (secondArgType == 'ArrayBuffer' || secondArgType == '~lib/arraybuffer/ArrayBuffer') {
                            // console.log(`No deserialization (${secondArgType}) for public method "${publicMethodName}"`);
                            runStr += 'const args=argsBytes;';
                        } else if (isInternalType(secondArgType)) {
                            // console.log(`internal type deserialization (${secondArgType}) for public method "${publicMethodName}"`);
                            runStr += `const args=sdk.MsgPack.deserializeInternalType<${secondArgType}>(argsBytes);`;
                            runStr += 'if(sdk.MsgPack.isError())return sdk.Return.Error(`deserialization faillure: ${sdk.MsgPack.getErrorMessage()}`);';
                        } else if (msgpackableClasses.includes(secondArgType)) {
                            // console.log(`msgpackable deserialization (${secondArgType}) for public method "${publicMethodName}"`);
                            runStr += `const args=sdk.MsgPack.deserializeDecorated<${secondArgType}>(argsBytes);`;
                            runStr += 'if(sdk.MsgPack.isError())return sdk.Return.Error(`deserialization faillure: ${sdk.MsgPack.getErrorMessage()}`);';
                        } else {
                            throw new Error(`Unknown deserialization method for type "${secondArgType}", second argument of public method "${publicMethodName}"`);
                        }
                        runStr += `return ${publicMethodName}(ctx${secondArgType !== '' ? ', args' : ''});}`;
                    }
                    runStr += "return sdk.Return.Error('method not found');}";
                    // console.log(runStr);
                    source.statements.push(parseTopLevelStatement(source.normalizedPath, runStr));
                }
            }
        })
    }
}

export default new Transformer();
