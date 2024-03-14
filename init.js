#!/usr/bin/env node

import fs from 'fs';
import path, { dirname } from 'path';
import { default as ReadLine , Interface as ReadLineInterface}  from 'readline';
import Yargs from 'yargs/yargs';

const argv = Yargs(Yargs.hideBin(process.argv))
.version('1.0.0')
.locale('en')
.option('yes', {
    alias: 'y',
    type: 'boolean',
    demandOption: false,
    description: 'If set, no overwrite confirmation is needed',
})
.help()
.argv;

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


/**
 * @param {string} question
 * @param {boolean} defaultResponse
 * @param {ReadLineInterface | null} customRLInterface
 * @returns {Promise<boolean>}
 */
function askForUserConfirmation(question, defaultResponse, customRLInterface) {
    return new Promise((resolve) => {
        let _rlInterface = customRLInterface || ReadLine.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        const promptStr = `${question}(${defaultResponse ? 'YES/no' : 'yes/NO'}): `;
        _rlInterface.question(promptStr, async(answer) => {
            if (!answer || !answer.length) {
                if (!customRLInterface) _rlInterface.close();
                return resolve(defaultResponse);
            }
            if (['y', 'yes'].indexOf(answer.trim().toLowerCase()) >= 0) {
                if (!customRLInterface) _rlInterface.close();
                return resolve(true);
            } else if (['n', 'no'].indexOf(answer.trim().toLowerCase()) >= 0) {
                if (!customRLInterface) _rlInterface.close();
                return resolve(false);
            }
            console.log(`Please enter a valid answer: y/yes/n/no`);
            const recursiveAnswer = await askForUserConfirmation(question, defaultResponse, _rlInterface);
            if (!customRLInterface) _rlInterface.close();
            return resolve(recursiveAnswer);
        })
    });
}

async function main() {
    const sourcePath = path.resolve(import.meta.dirname, './boilerplate');
    const targetPath = path.resolve('./');
    if (!argv.yes) {
        console.log();
        console.log(`This operation will merge folder\n"${sourcePath}"\ninto current working folder\n"${targetPath}"\noverwriting any existing file.`);
        console.log();
        if (!(await askForUserConfirmation('Are you sure?'))) {
            console.log('Cancelled by user');
            console.log();
            return;
        }
        console.log();
    }

    copyOrMergeDirsRecursiveSync(
        sourcePath,
        targetPath,
        true,
    );
    return;
}

main();
