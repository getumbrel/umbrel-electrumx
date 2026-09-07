// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readConfig } from "./config.js";

describe("server config", () => {
  it("accepts the inherited ElectrumX environment contract", () => {
    expect(readConfig({
      PORT: "3007",
      ELECTRUM_HOST: "electrumx_server_1",
      ELECTRUM_RPC_PORT: "8000",
      ELECTRUM_PUBLIC_CONNECTION_PORT: "50001",
      ELECTRUM_LOCAL_SERVICE: "umbrel.local",
      ELECTRUM_HIDDEN_SERVICE: "example.onion",
      BITCOIN_HOST: "bitcoin_server_1",
      RPC_PORT: "8332",
      RPC_USER: "umbrel",
      RPC_PASSWORD: "secret"
    })).toEqual({
      port: 3007,
      electrumx: { host: "electrumx_server_1", port: 8000 },
      publicElectrum: { host: "electrumx_server_1", port: 50001 },
      connections: { localHost: "umbrel.local", torHost: "example.onion", port: 50001 },
      core: { host: "bitcoin_server_1", port: 8332, username: "umbrel", password: "secret" }
    });
  });

  it("retains non-secret defaults but requires the RPC password", () => {
    expect(() => readConfig({})).toThrow("Invalid ElectrumX GUI configuration");
    expect(readConfig({ RPC_PASSWORD: "secret" })).toMatchObject({
      port: 3007,
      electrumx: { host: "0.0.0.0", port: 8000 },
      connections: { localHost: "umbrel.local", torHost: "notyetset.onion", port: 50001 },
      core: { host: "172.28.0.2", port: 18443, username: "umbrel" }
    });
  });

  it("rejects invalid ports without exposing the environment", () => {
    expect(() => readConfig({ RPC_PASSWORD: "secret", ELECTRUM_RPC_PORT: "nope" })).toThrow("Invalid ElectrumX GUI configuration");
  });
});
