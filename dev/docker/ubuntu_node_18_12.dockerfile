FROM ubuntu:22.04 AS base

# install node with nvm
RUN apt-get update -qq && apt-get install -y --no-install-recommends git curl wget ca-certificates
ARG nvm_version="0.39.3"
ARG node_version="18.15.0"
RUN mkdir /usr/local/nvm
ENV NVM_DIR /usr/local/nvm
ADD https://raw.githubusercontent.com/nvm-sh/nvm/v${nvm_version}/install.sh /tmp/nvm_install.sh
RUN chmod +x /tmp/nvm_install.sh && /tmp/nvm_install.sh \
    && . $NVM_DIR/nvm.sh \
    && nvm install $node_version \
    && nvm alias default $node_version \
    && nvm use default
ENV NODE_PATH $NVM_DIR/v${node_version}/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v${node_version}/bin:$PATH

# install pnpm
ENV PNPM_VERSION "7.32.0"
ADD https://get.pnpm.io/install.sh /tmp/pnpm_install.sh
RUN chmod +x /tmp/pnpm_install.sh && bash /tmp/pnpm_install.sh
ENV PNPM_HOME "/root/.local/share/pnpm"
ENV PATH "${PATH}:${PNPM_HOME}"


#### Building
FROM base AS builder
## https://github.com/ever0de/pnpm-docker-root-bug#how-to-fix
WORKDIR /workspace
COPY . .
RUN pnpm install


#### setup-cpp
FROM ubuntu:20.04 AS setup-cpp
# install node with nvm
RUN apt-get update -qq && apt-get install -y --no-install-recommends git curl wget ca-certificates
ARG nvm_version="0.39.3"
ARG node_version="12.22.12"
RUN mkdir /usr/local/nvm
ENV NVM_DIR /usr/local/nvm
ADD https://raw.githubusercontent.com/nvm-sh/nvm/v${nvm_version}/install.sh /tmp/nvm_install.sh
RUN chmod +x /tmp/nvm_install.sh && /tmp/nvm_install.sh \
    && . $NVM_DIR/nvm.sh \
    && nvm install $node_version \
    && nvm alias default $node_version \
    && nvm use default
ENV NODE_PATH $NVM_DIR/v${node_version}/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v${node_version}/bin:$PATH
# add setup-cpp.js
COPY --from=builder /workspace/dist/node12 /
# run installation
RUN . $NVM_DIR/nvm.sh && node /setup-cpp.js --compiler llvm --cmake true --ninja true --cppcheck true --ccache true --vcpkg true --doxygen true --gcovr true --task true --powershell true
CMD ["source", "~/.cpprc"]
ENTRYPOINT ["/bin/bash"]


#### Building (example)
FROM setup-cpp AS example-builder
COPY ./dev/cpp_vcpkg_project /home/app
WORKDIR /home/app
RUN bash -c 'source ~/.cpprc \
    && task build'


#### Running environment
# use a distroless image or ubuntu:22.04 if you wish
FROM gcr.io/distroless/cc as runner
# copy the built binaries and their runtime dependencies
COPY --from=example-builder /home/app/build/my_exe/Release/ /home/app/
WORKDIR /home/app/
ENTRYPOINT ["./my_exe"]
