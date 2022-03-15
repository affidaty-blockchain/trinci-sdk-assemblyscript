"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RangeTransform = void 0;
const baseTransform_1 = require("./baseTransform");
class RangeTransform extends baseTransform_1.BaseTransformVisitor {
    constructor(node) {
        super();
        this.node = node;
    }
    ;
    _visit(node) {
        node.range = this.node.range;
        return super._visit(node);
    }
    static visit(node, from) {
        return (new RangeTransform(from))._visit(node);
    }
}
exports.RangeTransform = RangeTransform;
//# sourceMappingURL=transformRange.js.map