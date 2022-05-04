/* eslint-disable id-length */
module.exports = {
  REQUEST_CORRELATION_NAMESPACE_KEY: "umbrel-electrumx-request",
  REQUEST_CORRELATION_ID_KEY: "reqId",

  ELECTRUM_HIDDEN_SERVICE:
    process.env.ELECTRUM_HIDDEN_SERVICE || "/var/lib/tor/electrum/hostname",

  ELECTRUM_LOCAL_SERVICE: process.env.ELECTRUM_LOCAL_SERVICE || "umbrel.local",

  ELECTRUM_HOST: process.env.ELECTRUM_HOST || "0.0.0.0",
  ELECTRUM_PORT: process.env.ELECTRUM_PORT || 50001,

  LND_REST_HIDDEN_SERVICE_FILE:
    process.env.LND_REST_HIDDEN_SERVICE_FILE ||
    "/var/lib/tor/lnd-rest/hostname",
  LND_GRPC_HIDDEN_SERVICE_FILE:
    process.env.LND_GRPC_HIDDEN_SERVICE_FILE ||
    "/var/lib/tor/lnd-grpc/hostname",
  LND_CERT_FILE: process.env.LND_CERT_FILE || "/lnd/tls.cert",
  LND_ADMIN_MACAROON_FILE:
    process.env.LND_ADMIN_MACAROON_FILE ||
    "/lnd/data/chain/bitcoin/mainnet/admin.macaroon",
  LND_WALLET_PASSWORD: process.env.LND_WALLET_PASSWORD || "moneyprintergobrrr",
};
