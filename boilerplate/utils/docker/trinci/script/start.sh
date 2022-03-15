#!/usr/bin/env bash

# Download trinci node
git clone https://github.com/affidaty-blockchain/trinci-node.git /home/node/trinci
cd /home/node/trinci

#Compile and start node
cargo run --no-default-features -- --offline --bootstrap-path "./bootstraps/offline/bootstrap.bin" 2>&1 | sed -u -r "s/[[:cntrl:]]\[[0-9]{1,3}m//g" | tee /home/node/trinci/trinci.log
