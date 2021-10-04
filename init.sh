#!/usr/bin/env bash

# creates boilerplate code in CWD
rm package.json
rm package-lock.json
cp -R ./node_modules/@affidaty/trinci-sdk-as/boilerplate/* ./
rm -R node_modules
npm install
