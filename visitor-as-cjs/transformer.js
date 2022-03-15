"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformVisitor = exports.mergeTransformer = exports.PathTransformVisitor = exports.ASTBuilderVisitor = exports.ASTTransformVisitor = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
const base_1 = require("./base");
const as_1 = require("./as");
const astBuilder_1 = require("./astBuilder");
const path_1 = require("./path");
const ts_mixer_1 = require("ts-mixer");
const baseTransform_1 = require("./baseTransform");
class Transform extends as_1.Transform {
}
class ASTTransformVisitor extends (0, ts_mixer_1.Mixin)(base_1.BaseVisitor, Transform) {
}
exports.ASTTransformVisitor = ASTTransformVisitor;
class ASTBuilderVisitor extends (0, ts_mixer_1.Mixin)(astBuilder_1.ASTBuilder, Transform) {
}
exports.ASTBuilderVisitor = ASTBuilderVisitor;
class PathTransformVisitor extends (0, ts_mixer_1.Mixin)(path_1.PathVisitor, Transform) {
}
exports.PathTransformVisitor = PathTransformVisitor;
function mergeTransformer(from, to) {
    // @ts-ignore
    to.program = from.program;
    // @ts-ignore
    to.baseDir = from.baseDir;
    // @ts-ignore
    to.stdout = from.stdout;
    // @ts-ignore
    to.stderr = from.stderr;
    // @ts-ignore
    to.log = from.log;
    to.writeFile = from.writeFile;
    to.readFile = from.readFile;
    to.listFiles = from.listFiles;
}
exports.mergeTransformer = mergeTransformer;
class TransformVisitor extends (0, ts_mixer_1.Mixin)(baseTransform_1.BaseTransformVisitor, Transform) {
}
exports.TransformVisitor = TransformVisitor;
//# sourceMappingURL=transformer.js.map