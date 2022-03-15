FROM rust:1.59-slim-bullseye

# Some environment
ENV HOME="/home/node"

# Install core deps
USER root
RUN apt update
RUN apt install clang libclang-dev libssl-dev pkg-config build-essential git curl procps llvm lsb-release -y && rm -rf /var/lib/apt/lists/*

# Install rust components
RUN rustup target install wasm32-unknown-unknown && \
    rustup component add rustfmt

# Copy post-install script
COPY ./script/start.sh /usr/local/bin/start
RUN chmod a+x /usr/local/bin/start

# Setting user and work directory
RUN useradd node -d /home/node -s /bin/bash -m
WORKDIR /home/node
USER node:node

RUN rustc --version

CMD [ "start" ]