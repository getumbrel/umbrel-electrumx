# ElectrumX for Bitcoin on Umbrel

A modern, independently maintainable ElectrumX status and wallet-connection interface for Bitcoin Umbrel installations.

## Interface

- React 19, TypeScript, Vite, Fastify 5, TanStack Query, Radix UI, and Zod;
- the approved sibling information architecture with Bitcoin Core orange semantic accents and canonical ElectrumX/Bitcoin artwork;
- explicit waiting, connecting, indexing, synchronized, and degraded provider states;
- exactly six fixed index blocks with provider-driven progress, an independent pulse layer, and an independent completion layer;
- accessible Local and Tor connection details, clipboard controls, and locally generated QR codes;
- no telemetry and no logging of request paths, RPC payloads, wallet information, daemon responses, or credentials.

## Preserved Bitcoin contract

The GUI retains the canonical Bitcoin environment and route surface:

- GUI `PORT` defaults to `3007`;
- private ElectrumX administration uses `ELECTRUM_HOST` plus `ELECTRUM_RPC_PORT` (default `8000`);
- Bitcoin Core uses `BITCOIN_HOST`, `RPC_PORT`, `RPC_USER`, and required `RPC_PASSWORD` (non-secret defaults remain `172.28.0.2`, `18443`, and `umbrel`);
- wallet instructions use `ELECTRUM_PUBLIC_CONNECTION_PORT` (default `50001`), `ELECTRUM_LOCAL_SERVICE` (default `umbrel.local`), and `ELECTRUM_HIDDEN_SERVICE` (safe placeholder default `notyetset.onion`, replaced by Umbrel's supplied hidden-service hostname);
- the Connect dialog defaults to Local and emits exact `host:50001` payloads for display, copy, and QR;
- `GET /ping`, `GET /v1/electrumx/electrum-connection-details`, `GET /v1/electrumx/version`, and `GET /v1/electrumx/syncPercent` remain available.

The historical hard-coded RPC password fallback was intentionally removed as unsafe. `RPC_PASSWORD` must be injected at runtime. The historical bug that built the Local connection string from the Tor hostname is also corrected: Local and Tor payloads now use their own addresses.

## Runtime decision

The original GUI repository's last commit and `v1.0.0` tag are `d018ace5da1bcc5dd04952bc9ccb0d43e25943b7` (2024-11-18). Its example runtime is `lukechilds/electrumx:v1.16.0` on Node 16/Buster.

This modernization instead pins maintained upstream ElectrumX `2.0.0` at commit `280cb339aa158e099eb936033eecd15719770651` (2026-07-03). `runtime/electrumx/Dockerfile` follows upstream's RocksDB architecture, pins the Python base image by digest, builds the exact source revision, and runs as UID/GID `1000:1000`. The local Compose fixture uses Bitcoin Core `31.1` and keeps listeners separate:

- public wallet TCP: container/host `50001`;
- private admin RPC: container-network-only `8000`;
- GUI HTTP: `3007`.

The runtime image is a local build target only. Image publication is intentionally left to the upstream maintainers.

## Motion contract

While the provider reports `indexing`, all six fixed blocks receive a traveling `2.4s ease-in-out` pulse with `120ms` stagger, peak scale `1.055`, and brightness `1.65`. Pulse and solid-completion layers crossfade symmetrically over `220ms ease-out`. Ready is static and complete. Waiting, connecting, and degraded states never pulse. `prefers-reduced-motion: reduce` hard-disables animation, transform, filter, and transitions while retaining static progress colors.

## Development

Requires Node.js 24 and npm 12.0.2.

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm audit --audit-level=low
npm audit --omit=dev --audit-level=low
npm run build
```

Build the production GUI and maintained local ElectrumX runtime independently:

```bash
docker build -t umbrel-bitcoin-electrumx-gui:candidate .
docker build -f runtime/electrumx/Dockerfile -t umbrel-bitcoin-electrumx-runtime:2.0.0 .
docker compose config
```

## License

The modernization source is distributed under [`LICENSE.md`](LICENSE.md). [`LICENSE.legacy`](LICENSE.legacy) records inherited repository provenance, and bundled notices are in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
