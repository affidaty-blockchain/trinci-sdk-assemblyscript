"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VariableDecorator = exports.FunctionDecorator = exports.ClassDecorator = exports.Decorator = exports.TopLevelDecorator = exports.registerDecorator = void 0;
const transformer_1 = require("./transformer");
const utils_1 = require("./utils");
function registerDecorator(decorator) {
    TopLevelDecorator.registerVisitor(decorator);
    return TopLevelDecorator;
}
exports.registerDecorator = registerDecorator;
class TopLevelDecorator extends transformer_1.PathTransformVisitor {
    static registerVisitor(visitor) {
        TopLevelDecorator._visitor = visitor;
    }
    get visitor() {
        return TopLevelDecorator._visitor;
    }
    visitDecoratorNode(node) {
        if (this.visitor.decoratorMatcher(node)) {
            this.visitor.currentPath = this.currentParentPath;
            this.visitor.visit(this.currentParent);
        }
    }
    afterParse(_) {
        (0, transformer_1.mergeTransformer)(this, this.visitor);
        this.visit(this.program.sources.filter(this.visitor.sourceFilter));
    }
}
exports.TopLevelDecorator = TopLevelDecorator;
class Decorator extends transformer_1.PathTransformVisitor {
    /**
     * Default filter that removes library files
     */
    get sourceFilter() {
        return (0, utils_1.not)(utils_1.isStdlib);
    }
    get decoratorMatcher() {
        return (node) => (0, utils_1.decorates)(node, this.name);
    }
    get name() { return ""; }
    getDecorator(node) {
        return node.decorators && node.decorators.find(this.decoratorMatcher) || null;
    }
}
exports.Decorator = Decorator;
class ClassDecorator extends Decorator {
}
exports.ClassDecorator = ClassDecorator;
class FunctionDecorator extends Decorator {
}
exports.FunctionDecorator = FunctionDecorator;
class VariableDecorator extends Decorator {
}
exports.VariableDecorator = VariableDecorator;
//# sourceMappingURL=decorator.js.map