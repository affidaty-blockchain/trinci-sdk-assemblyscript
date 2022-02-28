'use strict';
const fs = require('fs');

const defaultHashesFileName = 'hashlist.json';

function jsonStringify(obj) {
    return JSON.stringify(obj, null, 4);
}

function fileFromPath(path, removeExt = false) {
    let result;
    const lastSlashIdx = path.lastIndexOf('/');
    if (lastSlashIdx < (path.length -1) && lastSlashIdx >= 0) {
        result = path.substring(lastSlashIdx + 1);
    }
    if (removeExt) {
        const lastDotIdx = result.lastIndexOf('.');
        if (lastDotIdx >= 0) {
            result = result.substring(0, lastDotIdx);
        }
    }
    return result;
}

function getDefaultPath() {
    let path = process.argv[1];
    const lastSlashIdx = path.lastIndexOf('/');
    path = path.substring(0, lastSlashIdx + 1);
    path += defaultHashesFileName;
    return path;
}

function reloadFile(path) {
    let jsonStr = fs.readFileSync(path).toString();
    let list = {};
    if (jsonStr.length > 0) {
        list = JSON.parse(fs.readFileSync(path).toString());
    }
    return list;
}

function createFileIfNotExists(path) {
    if (!fs.existsSync(path)) {
        fs.writeFileSync(path, jsonStringify({}));
    }
}

function saveToFile(path, list) {
    fs.writeFileSync(path, jsonStringify(list));
}

class HashList {
    path = '';

    list = {};

    constructor(path = '') {
        if (path === '') {
            this.path = getDefaultPath();
        }
        createFileIfNotExists(this.path);
        this.list = reloadFile(this.path);
    }

    load(key = '') {
        return this.list[key];
    }

    save(key = '', hashValue = '') {
        this.list[key] = hashValue;
        saveToFile(this.path, this.list);
    }
}

exports.HashList = HashList;
exports.fileFromPath = fileFromPath;