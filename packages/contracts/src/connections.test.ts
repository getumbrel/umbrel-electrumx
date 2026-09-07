import { describe, expect, it } from "vitest";
import { connectionSchema, createConnectionDetails } from "./connections.js";

describe("createConnectionDetails", () => {
  it("creates distinct suffix-free Bitcoin LAN and Tor host:port records", () => {
    expect(createConnectionDetails({ localHost: "umbrel.local", torHost: "electrumx.example.onion", port: "50001" })).toEqual({
      local: { address: "umbrel.local", port: 50001, connectionString: "umbrel.local:50001", transport: "tcp" },
      tor: { address: "electrumx.example.onion", port: 50001, connectionString: "electrumx.example.onion:50001", transport: "tcp" }
    });
  });

  it("keeps the private administration RPC port out of wallet payloads", () => {
    const details = createConnectionDetails({ localHost: "umbrel.local", torHost: "electrumx.example.onion", port: 50001 });
    expect(JSON.stringify(details)).not.toContain("8000");
    expect(details.local.connectionString).toBe("umbrel.local:50001");
    expect(details.tor.connectionString).toBe("electrumx.example.onion:50001");
  });

  it("rejects invalid public ports", () => {
    expect(() => createConnectionDetails({ localHost: "umbrel.local", torHost: "example.onion", port: "0" })).toThrow("Invalid Electrum port");
  });

  it("rejects suffixed connection strings", () => {
    expect(() => connectionSchema.parse({
      address: "umbrel.local",
      port: 50001,
      connectionString: "umbrel.local:50001:t",
      transport: "tcp",
    })).toThrow();
  });
});
