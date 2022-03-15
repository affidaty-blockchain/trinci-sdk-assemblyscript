"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indent = exports.isStdlib = exports.hasMessage = exports.hasWarningMessage = exports.hasErrorMessage = exports.StringBuilder = exports.updateSource = exports.isMethodNamed = exports.className = exports.isEntry = exports.isUserEntry = exports.cloneNode = exports.getTypeName = exports.getName = exports.toString = exports.not = exports.isLibrary = exports.getDecorator = exports.hasDecorator = exports.isDecorator = exports.decorates = void 0;
const as_1 = require("./as");
const astBuilder_1 = require("./astBuilder");
const cloneDeep = require("lodash.clonedeep");
function decorates(node, name) {
    return node.name.text === name;
}
exports.decorates = decorates;
function isDecorator(name) {
    return (node) => decorates(node, name);
}
exports.isDecorator = isDecorator;
function hasDecorator(node, name) {
    let decl;
    if (node instanceof as_1.DeclarationStatement) {
        decl = node;
    }
    else {
        decl = node.declaration;
    }
    // because it could be undefined
    return decl.decorators?.some(isDecorator(name)) == true;
}
exports.hasDecorator = hasDecorator;
function getDecorator(node, name) {
    return node.decorators?.find(isDecorator(name));
}
exports.getDecorator = getDecorator;
function isLibrary(node) {
    return node.isLibrary || node.internalPath.startsWith("~lib/rt/");
}
exports.isLibrary = isLibrary;
function not(fn) {
    return (t) => !fn(t);
}
exports.not = not;
function toString(node) {
    return astBuilder_1.ASTBuilder.build(node);
}
exports.toString = toString;
function getName(node) {
    if (node instanceof as_1.TypeNode) {
        if (node instanceof as_1.NamedTypeNode) {
            let name = getTypeName(node.name);
            const typeParameters = node.typeArguments;
            if (typeParameters && typeParameters.length > 0) {
                name += `<${typeParameters.map(getName).join(", ")}>`;
            }
            return name;
        }
        else if (node instanceof as_1.TypeName) {
            return toString(node.identifier);
        }
        return "";
    }
    if (node instanceof as_1.ClassDeclaration || node instanceof as_1.InterfaceDeclaration || node instanceof as_1.FunctionDeclaration) {
        return className(node);
    }
    return toString(node.name);
}
exports.getName = getName;
function getTypeName(node) {
    let name = toString(node.identifier);
    if (node.next) {
        name += getTypeName(node.next);
    }
    return name;
}
exports.getTypeName = getTypeName;
function cloneNode(node) {
    return cloneDeep(node);
}
exports.cloneNode = cloneNode;
function isUserEntry(node) {
    return node.range.source.sourceKind == as_1.SourceKind.USER_ENTRY;
}
exports.isUserEntry = isUserEntry;
function isEntry(node) {
    return isUserEntry(node) || node.range.source.sourceKind == as_1.SourceKind.LIBRARY_ENTRY;
}
exports.isEntry = isEntry;
function className(_class) {
    let name = toString(_class.name);
    const typeParameters = _class.typeParameters;
    if (typeParameters) {
        name += `<${typeParameters.map(getName).join(", ")}>`;
    }
    return name;
}
exports.className = className;
function isMethodNamed(name) {
    return (stmt) => stmt.kind == as_1.NodeKind.METHODDECLARATION && toString(stmt.name) === name;
}
exports.isMethodNamed = isMethodNamed;
function updateSource(program, newSource) {
    const sources = program.sources;
    for (let i = 0, len = sources.length; i < len; i++) {
        if (sources[i].internalPath == newSource.internalPath) {
            sources[i] = newSource;
            break;
        }
    }
}
exports.updateSource = updateSource;
class StringBuilder {
    constructor() {
        this.sb = [];
    }
    push(s) {
        this.sb.push(s);
    }
    finish(separator = "\n") {
        let res = this.sb.join(separator);
        this.sb = [];
        return res;
    }
    get last() { return this.sb[this.sb.length - 1]; }
}
exports.StringBuilder = StringBuilder;
/**
 *
 * @param emitter DiagnosticEmitter
 * @returns return true if emitter have ERROR message
 */
function hasErrorMessage(emitter) {
    return hasMessage(emitter, as_1.DiagnosticCategory.ERROR);
}
exports.hasErrorMessage = hasErrorMessage;
/**
*
* @param emitter DiagnosticEmitter
* @returns return true if emitter have WARNING message
*/
function hasWarningMessage(emitter) {
    return hasMessage(emitter, as_1.DiagnosticCategory.WARNING);
}
exports.hasWarningMessage = hasWarningMessage;
/**
*
* @param emitter DiagnosticEmitter
* @returns return true if emitter have `category` message
*/
function hasMessage(emitter, category) {
    const diagnostics = emitter.diagnostics ? emitter.diagnostics : [];
    for (const msg of diagnostics) {
        if (msg.category === category) {
            return true;
        }
    }
    return false;
}
exports.hasMessage = hasMessage;
let isStdlibRegex = /\~lib\/(?:array|arraybuffer|atomics|builtins|crypto|console|compat|dataview|date|diagnostics|error|function|iterator|map|math|number|object|process|reference|regexp|set|staticarray|string|symbol|table|typedarray|vector|rt\/?|bindings\/|shared\/typeinfo)|util\/|uri|polyfills|memory/;
function isStdlib(s) {
    let source = s instanceof as_1.Source ? s : s.range.source;
    return isStdlibRegex.test(source.internalPath);
}
exports.isStdlib = isStdlib;
exports.indent = as_1.util.indent;
//# sourceMappingURL=utils.js.map