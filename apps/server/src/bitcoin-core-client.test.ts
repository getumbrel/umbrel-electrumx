// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createBitcoinCoreClient } from "./bitcoin-core-client.js";

describe("BitcoinCoreClient", () => {
  it("requests blockchain and required index status with scoped basic authentication", async () => {
    const fetchFn = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({
        authorization: `Basic ${Buffer.from("gui:scoped-secret").toString("base64")}`,
        "content-type": "application/json"
      });
      expect(init?.redirect).toBe("error");
      const request = JSON.parse(String(init?.body)) as { method: string; params: unknown[] };
      expect(request.params).toEqual([]);
      if (request.method === "getblockchaininfo") {
        return new Response(JSON.stringify({ result: { blocks: 110, initialblockdownload: false }, error: null, id: "electrumx-gui" }), { status: 200 });
      }
      expect(request.method).toBe("getindexinfo");
      return new Response(JSON.stringify({ result: {
        txindex: { synced: true, best_block_height: 110 },
        txospenderindex: { synced: true, best_block_height: 110 },
      }, error: null, id: "electrumx-gui" }), { status: 200 });
    });
    const client = createBitcoinCoreClient({ host: "bitcoin", port: 8332, username: "gui", password: "scoped-secret", fetchFn });

    expect(await client.getBlockchainInfo()).toEqual({
      blocks: 110,
      initialblockdownload: false,
      indexes: {
        txindex: { synced: true, bestBlockHeight: 110 },
        txospenderindex: { synced: true, bestBlockHeight: 110 },
      },
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("returns a safe error without reflecting daemon payloads", async () => {
    const client = createBitcoinCoreClient({
      host: "bitcoin",
      port: 8332,
      username: "gui",
      password: "secret",
      fetchFn: async () => new Response("wallet-address-sensitive-body", { status: 500 })
    });

    await expect(client.getBlockchainInfo()).rejects.toThrow("Bitcoin Core RPC request failed");
    await expect(client.getBlockchainInfo()).rejects.not.toThrow("wallet-address-sensitive-body");
  });

  it("rejects daemon errors and malformed results using only safe messages", async () => {
    const rpcError = createBitcoinCoreClient({
      host: "bitcoin", port: 8332, username: "gui", password: "secret",
      fetchFn: async () => new Response(JSON.stringify({ result: null, error: { message: "wallet-secret" }, id: "electrs-gui" }), { status: 200 })
    });
    const malformed = createBitcoinCoreClient({
      host: "bitcoin", port: 8332, username: "gui", password: "secret",
      fetchFn: async () => new Response(JSON.stringify({ result: { blocks: "bad" }, error: null, id: "electrs-gui" }), { status: 200 })
    });

    await expect(rpcError.getBlockchainInfo()).rejects.toThrow("Bitcoin Core RPC returned an error");
    await expect(rpcError.getBlockchainInfo()).rejects.not.toThrow("wallet-secret");
    await expect(malformed.getBlockchainInfo()).rejects.toThrow("Bitcoin Core RPC response was invalid");
  });

  it("derives required index readiness from getindexinfo without estimates", async () => {
    const fetchFn = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as { method: string };
      if (request.method === "getblockchaininfo") {
        return new Response(JSON.stringify({ result: { blocks: 110, initialblockdownload: false }, error: null }), { status: 200 });
      }
      expect(request.method).toBe("getindexinfo");
      return new Response(JSON.stringify({ result: {
        txindex: { synced: false, best_block_height: 90 },
        txospenderindex: { synced: true, best_block_height: 110 },
      }, error: null }), { status: 200 });
    });
    const client = createBitcoinCoreClient({ host: "bitcoin", port: 8332, username: "gui", password: "scoped-secret", fetchFn });

    await expect(client.getBlockchainInfo()).resolves.toEqual({
      blocks: 110,
      initialblockdownload: false,
      indexes: {
        txindex: { synced: false, bestBlockHeight: 90 },
        txospenderindex: { synced: true, bestBlockHeight: 110 },
      },
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
