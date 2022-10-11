import { ClassDecorator, registerDecorator, utils, SimpleParser, } from '@affidaty/trinci-sdk-as/visitor-as/index.js';
import { FieldDeclaration } from 'assemblyscript/dist/assemblyscript.js';
// ==== Helper functions ====
function getStructure(node) {
    let result = [];
    for (let i = 0; i < node.members.length; i++) {
        if (node.members[i] instanceof FieldDeclaration) {
            let fieldName = utils.getName(node.members[i]);
            let fieldType = utils.getName(node.members[i].type);
            result.push([fieldName, fieldType]);
        }
    }
    return result;
}
function getSetters(structure, node) {
    let result = [];
    for (let i = 0; i < structure.length; i++) {
        let setterCode = `changetype<usize>((c:${utils.getName(node)}, v:${structure[i][1]}):void=>{c.${structure[i][0]}=v;})`;
        result.push(setterCode);
    }
    return result;
}
function getGetters(structure, node) {
    let result = [];
    for (let i = 0; i < structure.length; i++) {
        let getterCode = `changetype<usize>((c:${utils.getName(node)}):${structure[i][1]}=>{return c.${structure[i][0]};})`;
        result.push(getterCode);
    }
    return result;
}
// ==== Actual decorator class ====
class MsgPackable extends ClassDecorator {
    visitFieldDeclaration(node) {
    }
    visitMethodDeclaration(node) {
    }
    visitClassDeclaration(node) {
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
        let structureMember = SimpleParser.parseClassMember(structureMemberCode, node); //parse StaticArray.fromArray expression
        node.members.push(structureMember);
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
        let settersMember = SimpleParser.parseClassMember(settersMemberCode, node); //parse StaticArray.fromArray expression
        node.members.push(settersMember);
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
        let gettersMember = SimpleParser.parseClassMember(gettersMemberCode, node); //parse StaticArray.fromArray expression
        node.members.push(gettersMember);
        return node;
    }
    // use '@<name_given_here>' to call decorator
    get name() { return "msgpackable"; }
}
export default registerDecorator(new MsgPackable());
