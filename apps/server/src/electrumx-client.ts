import { connect } from "node:net";
import { z } from "zod";
import {
  ElectrumXInvalidResponseError,
  ElectrumXUnavailableError,
  type ElectrumXClient,
  type ElectrumXPublicClient,
} from "./electrumx-gui-service.js";

const responseSchema = z.object({ id: z.number(), result: z.unknown(), error: z.unknown().optional() });
const infoSchema = z.object({
  version: z.string().min(1),
  "db height": z.number().int().min(-1),
  "daemon height": z.number().int().nonnegative(),
});
const versionSchema = z.union([z.string(), z.tuple([z.string(), z.string()])]);

type ClientOptions = { host: string; port: number; timeoutMs?: number };
type ClientContext = "admin" | "public";

function createJsonRpcClient({ host, port, timeoutMs = 5_000 }: ClientOptions, context: ClientContext) {
  let requestId = 0;
  const unavailable = () => context === "admin"
    ? new ElectrumXUnavailableError()
    : new Error("ElectrumX public listener is unavailable");
  const invalid = () => context === "admin"
    ? new ElectrumXInvalidResponseError()
    : new Error("ElectrumX public response was invalid");

  return async function request(method: string, params: unknown[]): Promise<unknown> {
    requestId += 1;
    const id = requestId;
    return new Promise((resolve, reject) => {
      const socket = connect({ host, port });
      let settled = false;
      let buffer = "";
      const finish = (error?: Error, result?: unknown) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        if (error) reject(error); else resolve(result);
      };
      socket.setEncoding("utf8");
      socket.setTimeout(timeoutMs);
      socket.on("timeout", () => finish(unavailable()));
      socket.on("error", () => finish(unavailable()));
      socket.on("connect", () => socket.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`));
      socket.on("data", (chunk) => {
        buffer += chunk;
        if (buffer.length > 65_536) return finish(invalid());
        const newline = buffer.indexOf("\n");
        if (newline === -1) return;
        try {
          const response = responseSchema.parse(JSON.parse(buffer.slice(0, newline)));
          if (response.id !== id || response.error) throw invalid();
          finish(undefined, response.result);
        } catch {
          finish(invalid());
        }
      });
    });
  };
}

export function createElectrumXClient(options: ClientOptions): ElectrumXClient {
  const request = createJsonRpcClient(options, "admin");
  return {
    async getInfo() {
      const result = infoSchema.safeParse(await request("getinfo", []));
      if (!result.success) throw new ElectrumXInvalidResponseError();
      const info = result.data;
      const version = info.version.split(" ")[1] || "unknown";
      return {
        version,
        dbHeight: info["db height"],
        daemonHeight: info["daemon height"],
      };
    },
  };
}

export function createElectrumXPublicClient(options: ClientOptions): ElectrumXPublicClient {
  const request = createJsonRpcClient(options, "public");
  return {
    async isReady() {
      versionSchema.parse(await request("server.version", ["umbrel", "1.4"]));
      return true;
    },
  };
}
