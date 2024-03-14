#!/usr/bin/env node

import fs from 'fs';
import path, { dirname } from 'path';

/**
 * recursively copies the content of source into target (or merges if target exists)
 * @param {string} source
 * @param {string} target
 * @param {boolean} overwriteFiles
 */
function copyOrMergeDirsRecursiveSync(source, target, overwriteFiles = false) {

    const _source = path.resolve(source);
    const _target = path.resolve(target);

    if (!fs.existsSync(_source)) throw new Error(`${_source} does not exist`);
    if (!fs.lstatSync(_source).isDirectory()) throw new Error(`${_source} is not a directory`);
    if (fs.existsSync(_target)) {
        if(!fs.lstatSync(_target).isDirectory()) throw new Error(`${_target} is not a directory`);
    } else {
        fs.mkdirSync(_target);
    }

    /** @type {string[]} */
    const files = [];
    /** @type {string[]} */
    const dirs = [];

    fs.readdirSync(_source).forEach((elem) => {
        if (fs.statSync(path.join(_source, elem)).isDirectory()) {
            dirs.push(elem);
        } else {
            files.push(elem);
        }
    })

    files.forEach((fileName) => {
        const fullSourceFilePath = path.join(_source, fileName);
        const fullTargetFilePath = path.join(_target, fileName);
        // console.log(`"${fullSourceFilePath}" => "${fullTargetFilePath}"`);
        if (fs.existsSync(fullTargetFilePath)) {
            if (!overwriteFiles) {
                console.warn(`"${fullTargetFilePath}" already exists`);
                return;
            }
            fs.rmSync(fullTargetFilePath);
        }
        fs.copyFileSync(fullSourceFilePath, fullTargetFilePath);
    })

    dirs.forEach((dirName) => {
        const fullSourceDirPath = path.join(_source, dirName);
        const fullTargetDirPath = path.join(_target, dirName);
        copyOrMergeDirsRecursiveSync(fullSourceDirPath, fullTargetDirPath, overwriteFiles);
    })
}

copyOrMergeDirsRecursiveSync(
    path.resolve(import.meta.dirname, './boilerplate'),
    path.resolve('./'),
    true,
);