// import { ClassDecorator, registerDecorator } from './src/decorator';
// import { getName, getTypeName, toString } from './src/utils';
import { ClassDecorator, registerDecorator, utils, SimpleParser } from "@affidaty/trinci-sdk-as/visitor-as-cjs";
import {
    FieldDeclaration,
    MethodDeclaration,
    ClassDeclaration,
} from "@affidaty/trinci-sdk-as/visitor-as-cjs/as";


function getStructure(node: ClassDeclaration): string[][] {
    let result: string[][] = [];
    for (let i = 0; i < node.members.length; i++) {
        if (node.members[i] instanceof FieldDeclaration ) {
            let fieldName = utils.getName(node.members[i]);
            let fieldType = utils.getName(node.members[i].type);
            result.push([fieldName, fieldType]);
        }
    }
    return result
}

function getSetters(structure: string[][], node: ClassDeclaration): string[] {
    let result: string[] = [];
    for (let i = 0; i < structure.length; i++) {
        let setterCode = `changetype<usize>((c:${utils.getName(node)}, v:${structure[i][1]}):void=>{c.${structure[i][0]}=v;})`;
        result.push(setterCode);
    }
    return result;
}

function getGetters(structure: string[][], node: ClassDeclaration): string[] {
    let result: string[] = [];
    for (let i = 0; i < structure.length; i++) {
        let getterCode = `changetype<usize>((c:${utils.getName(node)}):${structure[i][1]}=>{return c.${structure[i][0]};})`;
        result.push(getterCode);
    }
    return result;
}

class MsgPackable extends ClassDecorator {
    visitFieldDeclaration(node: FieldDeclaration) {
    }
    visitMethodDeclaration(node: MethodDeclaration) {
    }
    visitClassDeclaration(node: ClassDeclaration) {
        let structure: string[][] = getStructure(node);
        // console.log(structure);
        let structureMemberCode: string = '__structure: string[][] = [';
        for (let i = 0; i < structure.length; i++) {
            if (i > 0) {
                structureMemberCode += ','
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

        let setters: string[] = getSetters(structure, node);
        let settersMemberCode: string = '__setters: usize[] = [';
        for (let i = 0; i < structure.length; i++) {
            if (i > 0) {
                settersMemberCode += ','
            }
            settersMemberCode += setters[i];
        }
        settersMemberCode += '];';
        let settersMember = SimpleParser.parseClassMember(settersMemberCode, node); //parse StaticArray.fromArray expression
        node.members.push(settersMember);

        let getters: string[] = getGetters(structure, node);
        let gettersMemberCode: string = '__getters: usize[] = [';
        for (let i = 0; i < structure.length; i++) {
            if (i > 0) {
                gettersMemberCode += ','
            }
            gettersMemberCode += getters[i];
        }
        gettersMemberCode += '];';
        let gettersMember = SimpleParser.parseClassMember(gettersMemberCode, node); //parse StaticArray.fromArray expression
        node.members.push(gettersMember);
        return node;
    }
    get name() { return "msgpackable"; }
}
module.exports = registerDecorator(new MsgPackable());
