# syntax=docker/dockerfile:1.7
FROM python:3.14-trixie@sha256:7c95ed89000a861ad5d6c7fb06bd5260ca973cc9c58d7ad42fec690e24642a84 AS builder
WORKDIR /usr/src/app
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential git librocksdb-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*
ARG ELECTRUMX_COMMIT=280cb339aa158e099eb936033eecd15719770651
RUN python -m venv /opt/electrumx \
    && /opt/electrumx/bin/pip install --no-cache-dir \
      "e_x[rocksdb] @ git+https://github.com/spesmilo/electrumx.git@${ELECTRUMX_COMMIT}"

FROM python:3.14-slim-trixie@sha256:a7fb1e634c4a578f9e0bd6327f11a3cde11b7a9395f48e24360c0988bcc5c2bc
RUN apt-get update \
    && apt-get install -y --no-install-recommends librocksdb9.10 \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /data \
    && chown 1000:1000 /data
COPY --from=builder /opt/electrumx /opt/electrumx
ENV COIN=Bitcoin \
    NET=mainnet \
    DB_DIRECTORY=/data \
    DB_ENGINE=rocksdb \
    SERVICES=tcp://0.0.0.0:50001,rpc://0.0.0.0:8000 \
    PEER_DISCOVERY=off \
    PEER_ANNOUNCE=""
USER 1000:1000
VOLUME ["/data"]
EXPOSE 50001
CMD ["/opt/electrumx/bin/electrumx_server"]
