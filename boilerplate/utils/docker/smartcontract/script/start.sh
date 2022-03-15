#!/usr/bin/env bash

cd /home/node/smartcontract

printf "installing dependencies...\n"

npm install

npm run asbuild
