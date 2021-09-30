#!/usr/bin/env bash

rm package.json
rm package-lock.json
cp -R ./node_modules/@affidaty/trinci-sdk-as/boilerplate/* ./
rm -R node_modules
npm install
