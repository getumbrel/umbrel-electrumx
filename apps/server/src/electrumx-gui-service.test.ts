// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createElectrumXGuiService, ElectrumXUnavailableError } from "./electrumx-gui-service.js";

const connections = {
  local: { address: "umbrel.local", port: 50001, connectionString: "umbrel.local:50001", transport: "tcp" as const },
  tor: { address: "example.onion", port: 50001, connectionString: "example.onion:50001", transport: "tcp" as const }
};

const syncedIndexes = {
  txindex: { synced: true, bestBlockHeight: 110 },
  txospenderindex: { synced: true, bestBlockHeight: 110 },
};

describe("ElectrumXGuiService", () => {
  it("reports ElectrumX progress during Core IBD once required indexes are synchronized", async () => {
    const getInfo = vi.fn(async () => ({ version: "2.0.0", dbHeight: 40, daemonHeight: 80 }));
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 80, initialblockdownload: true, indexes: syncedIndexes }) },
      electrumx: { getInfo },
      connections
    });

    expect(await service.getStatus()).toMatchObject({
      state: "indexing",
      version: "2.0.0",
      coreHeight: 80,
      indexedHeight: 40,
      percent: 50,
    });
    expect(await service.getLegacySyncPercent()).toBe(50);
    expect(getInfo).toHaveBeenCalledTimes(2);
  });

  it("returns an accurate synchronized status", async () => {
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload: false, indexes: syncedIndexes }) },
      electrumx: { getInfo: async () => ({ version: "2.0.0", dbHeight: 110, daemonHeight: 110 }) },
      publicElectrum: { isReady: async () => true },
      connections
    });

    expect(await service.getStatus()).toEqual({
      state: "ready",
      version: "2.0.0",
      coreHeight: 110,
      indexedHeight: 110,
      percent: 100,
      message: "ElectrumX is synchronized"
    });
    expect(service.getConnections()).toBe(connections);
    expect(await service.getLegacyVersion()).toBe("2.0.0");
    expect(await service.getLegacySyncPercent()).toBe(100);
  });

  it("keeps caught-up admin data in finalizing until the public Electrum listener answers", async () => {
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload: true, indexes: syncedIndexes }) },
      electrumx: { getInfo: async () => ({ version: "2.0.0", dbHeight: 110, daemonHeight: 110 }) },
      publicElectrum: { isReady: async () => false },
      connections,
    });

    expect(await service.getStatus()).toMatchObject({
      state: "indexing",
      indexedHeight: 110,
      percent: 100,
      message: "ElectrumX is finalizing synchronization",
    });
  });

  it("degrades safely when Bitcoin Core is unavailable", async () => {
    const getInfo = vi.fn();
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => { throw new Error("rpcuser:secret"); } },
      electrumx: { getInfo },
      connections
    });

    expect(await service.getStatus()).toEqual({
      state: "degraded",
      version: null,
      coreHeight: null,
      indexedHeight: null,
      percent: null,
      message: "Bitcoin Core is unavailable"
    });
    expect(await service.getLegacySyncPercent()).toBe(-2);
    expect(getInfo).not.toHaveBeenCalled();
  });

  it("reports connecting and preserves the legacy unavailable sentinel", async () => {
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload: false, indexes: syncedIndexes }) },
      electrumx: { getInfo: async () => { throw new ElectrumXUnavailableError(); } },
      connections
    });

    expect(await service.getStatus()).toMatchObject({ state: "connecting", coreHeight: 110, indexedHeight: null, percent: null });
    expect(await service.getLegacySyncPercent()).toBe(-2);
  });

  it("preserves the legacy rounded-up synchronization percentage", async () => {
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 101, initialblockdownload: false, indexes: syncedIndexes }) },
      electrumx: { getInfo: async () => ({ version: "2.0.0", dbHeight: 99, daemonHeight: 101 }) },
      connections
    });

    expect(await service.getLegacySyncPercent()).toBe(99);
  });

  it("returns zero rather than NaN before ElectrumX has a daemon height", async () => {
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 0, initialblockdownload: false, indexes: {
        txindex: { synced: true, bestBlockHeight: 0 },
        txospenderindex: { synced: true, bestBlockHeight: 0 },
      } }) },
      electrumx: { getInfo: async () => ({ version: "2.0.0", dbHeight: 0, daemonHeight: 0 }) },
      connections
    });

    expect(await service.getLegacySyncPercent()).toBe(0);
  });

  it("uses ElectrumX daemon height as a synchronization target when it is ahead of the Core snapshot", async () => {
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 100, initialblockdownload: false, indexes: syncedIndexes }) },
      electrumx: { getInfo: async () => ({ version: "2.0.0", dbHeight: 100, daemonHeight: 101 }) },
      connections
    });

    expect(await service.getStatus()).toMatchObject({ state: "indexing", indexedHeight: 100, percent: 99.01 });
  });

  it("reports a legitimate empty ElectrumX database as zero-percent indexing", async () => {
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 0, initialblockdownload: false, indexes: {
        txindex: { synced: true, bestBlockHeight: 0 },
        txospenderindex: { synced: true, bestBlockHeight: 0 },
      } }) },
      electrumx: { getInfo: async () => ({ version: "2.0.0", dbHeight: -1, daemonHeight: 0 }) },
      connections
    });

    expect(await service.getStatus()).toMatchObject({
      state: "indexing",
      indexedHeight: null,
      percent: 0,
      message: "Preparing ElectrumX database",
    });
  });

  it("waits for every Core index required by pinned ElectrumX before querying its admin listener", async () => {
    const getInfo = vi.fn();
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({
        blocks: 110,
        initialblockdownload: true,
        indexes: {
          txindex: { synced: false, bestBlockHeight: 90 },
          txospenderindex: { synced: true, bestBlockHeight: 110 },
        },
      }) },
      electrumx: { getInfo },
      connections
    });

    expect(await service.getStatus()).toMatchObject({
      state: "waiting-for-core-indexes",
      coreHeight: 110,
      indexedHeight: null,
      percent: null,
      message: "Waiting for Bitcoin Core indexes",
    });
    expect(getInfo).not.toHaveBeenCalled();
  });

  it("degrades safely when a required Core index is unavailable during IBD", async () => {
    const getInfo = vi.fn();
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({
        blocks: 110,
        initialblockdownload: true,
        indexes: { txindex: { synced: true, bestBlockHeight: 110 } },
      }) },
      electrumx: { getInfo },
      connections
    });

    expect(await service.getStatus()).toMatchObject({
      state: "degraded",
      coreHeight: 110,
      indexedHeight: null,
      percent: null,
      message: "Bitcoin Core required indexes are unavailable",
    });
    expect(await service.getLegacySyncPercent()).toBe(-1);
    expect(getInfo).not.toHaveBeenCalled();
  });

  it("reports malformed ElectrumX admin data as an error instead of pretending to connect", async () => {
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload: false, indexes: syncedIndexes }) },
      electrumx: { getInfo: async () => { throw new Error("invalid admin response"); } },
      connections
    });

    expect(await service.getStatus()).toMatchObject({
      state: "error",
      coreHeight: 110,
      indexedHeight: null,
      percent: null,
      message: "ElectrumX returned invalid status data",
    });
  });

  it("fails closed when the provider DB height is ahead of its daemon target", async () => {
    const publicReady = vi.fn(async () => true);
    const service = createElectrumXGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload: false, indexes: syncedIndexes }) },
      electrumx: { getInfo: async () => ({ version: "2.0.0", dbHeight: 111, daemonHeight: 110 }) },
      publicElectrum: { isReady: publicReady },
      connections,
    });

    expect(await service.getStatus()).toMatchObject({
      state: "error",
      indexedHeight: null,
      percent: null,
      message: "ElectrumX returned invalid status data",
    });
    expect(publicReady).not.toHaveBeenCalled();
    expect(await service.getLegacySyncPercent()).toBe(-2);
  });
});
