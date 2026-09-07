import { z } from "zod";
import type { BitcoinCoreClient } from "./electrumx-gui-service.js";

const blockchainInfoSchema = z.object({
  blocks: z.number().int().nonnegative(),
  initialblockdownload: z.boolean(),
});
const indexInfoSchema = z.record(z.string(), z.object({
  synced: z.boolean(),
  best_block_height: z.number().int().nonnegative(),
}));

const rpcResponseSchema = z.object({
  result: z.unknown().nullable(),
  error: z.unknown().nullable(),
});

export function createBitcoinCoreClient({
  host,
  port,
  username,
  password,
  fetchFn = fetch,
  timeoutMs = 5_000,
}: {
  host: string;
  port: number;
  username: string;
  password: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}): BitcoinCoreClient {
  const endpoint = `http://${host}:${port}`;
  const authorization = `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;

  async function request(method: string): Promise<unknown> {
    let response: Response;
    try {
      response = await fetchFn(endpoint, {
        method: "POST",
        headers: {
          authorization,
          "content-type": "application/json",
        },
        body: JSON.stringify({ jsonrpc: "1.0", id: "electrumx-gui", method, params: [] }),
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new Error("Bitcoin Core RPC request failed");
    }

    if (!response.ok) throw new Error("Bitcoin Core RPC request failed");

    let parsed: z.infer<typeof rpcResponseSchema>;
    try {
      parsed = rpcResponseSchema.parse(await response.json());
    } catch {
      throw new Error("Bitcoin Core RPC response was invalid");
    }
    if (parsed.error !== null) throw new Error("Bitcoin Core RPC returned an error");
    return parsed.result;
  }

  return {
    async getBlockchainInfo() {
      const blockchainInfo = blockchainInfoSchema.safeParse(await request("getblockchaininfo"));
      if (!blockchainInfo.success) throw new Error("Bitcoin Core RPC response was invalid");
      const indexInfo = indexInfoSchema.safeParse(await request("getindexinfo"));
      if (!indexInfo.success) throw new Error("Bitcoin Core RPC response was invalid");
      return {
        ...blockchainInfo.data,
        indexes: Object.fromEntries(Object.entries(indexInfo.data).map(([name, info]) => [name, {
          synced: info.synced,
          bestBlockHeight: info.best_block_height,
        }])),
      };
    },
  };
}
