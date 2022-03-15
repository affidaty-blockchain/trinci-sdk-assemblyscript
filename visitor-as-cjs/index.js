"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.as = exports.utils = void 0;
__exportStar(require("./base"), exports);
__exportStar(require("./transformer"), exports);
__exportStar(require("./baseTransform"), exports);
__exportStar(require("./visitor"), exports);
__exportStar(require("./astBuilder"), exports);
__exportStar(require("./decorator"), exports);
__exportStar(require("./path"), exports);
__exportStar(require("./simpleParser"), exports);
const utils = __importStar(require("./utils"));
exports.utils = utils;
const as = __importStar(require("./as"));
exports.as = as;
//# sourceMappingURL=index.js.map