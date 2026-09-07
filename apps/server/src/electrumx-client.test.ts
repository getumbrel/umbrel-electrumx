// @vitest-environment node
import { createServer, type Server, type Socket } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createElectrumXClient, createElectrumXPublicClient } from "./electrumx-client.js";

const servers: Server[] = [];
const sockets = new Set<Socket>();
afterEach(async () => Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
  for (const socket of sockets) socket.destroy();
  sockets.clear();
  server.close((error) => error ? reject(error) : resolve());
}))));

async function fakeAdmin(handler: (request: { method: string; id: number; params: unknown[] }) => unknown): Promise<number> {
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    let buffer = "";
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline === -1) return;
      const request = JSON.parse(buffer.slice(0, newline)) as { method: string; id: number; params: unknown[] };
      socket.end(`${JSON.stringify({ id: request.id, jsonrpc: "2.0", result: handler(request) })}\n`);
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing test address");
  return address.port;
}

describe("ElectrumXClient", () => {
  it("reads validated version and heights from the private admin RPC", async () => {
    const port = await fakeAdmin(({ method, params }) => {
      expect(method).toBe("getinfo");
      expect(params).toEqual([]);
      return { version: "ElectrumX 2.0.0", "db height": 110, "daemon height": 111 };
    });
    const client = createElectrumXClient({ host: "127.0.0.1", port, timeoutMs: 500 });

    await expect(client.getInfo()).resolves.toEqual({ version: "2.0.0", dbHeight: 110, daemonHeight: 111 });
  });

  it("times out instead of leaving a hanging admin socket", async () => {
    const server = createServer((socket) => {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test address");
    const client = createElectrumXClient({ host: "127.0.0.1", port: address.port, timeoutMs: 30 });

    await expect(client.getInfo()).rejects.toThrow("ElectrumX admin listener is unavailable");
  });

  it("preserves the legacy unknown fallback for an unversioned banner", async () => {
    const port = await fakeAdmin(() => ({ version: "ElectrumX", "db height": 1, "daemon height": 1 }));
    await expect(createElectrumXClient({ host: "127.0.0.1", port, timeoutMs: 500 }).getInfo()).resolves.toMatchObject({ version: "unknown" });
  });

  it("accepts the provider's legitimate minus-one empty-database height", async () => {
    const port = await fakeAdmin(() => ({ version: "ElectrumX 2.0.0", "db height": -1, "daemon height": 0 }));
    await expect(createElectrumXClient({ host: "127.0.0.1", port, timeoutMs: 500 }).getInfo()).resolves.toMatchObject({
      dbHeight: -1,
      daemonHeight: 0,
    });
  });

  it("requires a validated public server.version response for readiness", async () => {
    const port = await fakeAdmin(({ method, params }) => {
      expect(method).toBe("server.version");
      expect(params).toEqual(["umbrel", "1.4"]);
      return ["ElectrumX 2.0.0", "1.4"];
    });

    await expect(createElectrumXPublicClient({ host: "127.0.0.1", port, timeoutMs: 500 }).isReady()).resolves.toBe(true);
  });
});
