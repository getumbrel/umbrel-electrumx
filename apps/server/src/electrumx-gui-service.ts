import type { ConnectionDetails } from "../../../packages/contracts/src/connections.js";
import { deriveIndexerStatus, type IndexerStatus } from "../../../packages/contracts/src/status.js";
import type { ElectrumXGuiService } from "./app.js";

export interface CoreIndexInfo { synced: boolean; bestBlockHeight: number }
export interface BitcoinCoreClient {
  getBlockchainInfo(): Promise<{
    blocks: number;
    initialblockdownload: boolean;
    indexes: Record<string, CoreIndexInfo>;
  }>;
}

export interface ElectrumXInfo { version: string; dbHeight: number; daemonHeight: number }
export interface ElectrumXClient { getInfo(): Promise<ElectrumXInfo> }
export interface ElectrumXPublicClient { isReady(): Promise<boolean> }

export class ElectrumXUnavailableError extends Error {
  constructor() { super("ElectrumX admin listener is unavailable"); }
}

export class ElectrumXInvalidResponseError extends Error {
  constructor() { super("ElectrumX admin response was invalid"); }
}

const requiredCoreIndexes = ["txindex", "txospenderindex"] as const;

export function createElectrumXGuiService({ core, electrumx, publicElectrum, connections }: {
  core: BitcoinCoreClient;
  electrumx: ElectrumXClient;
  publicElectrum?: ElectrumXPublicClient;
  connections: ConnectionDetails;
}): ElectrumXGuiService {
  return {
    getConnections: () => connections,
    async getLegacyVersion() { return (await electrumx.getInfo()).version; },
    async getLegacySyncPercent() {
      try {
        const coreInfo = await core.getBlockchainInfo();
        if (requiredCoreIndexes.some((name) => !coreInfo.indexes[name]?.synced)) return -1;
        const info = await electrumx.getInfo();
        if (info.dbHeight < -1 || info.dbHeight > info.daemonHeight) return -2;
        if (info.daemonHeight <= 0) return 0;
        return Math.ceil((info.dbHeight / info.daemonHeight) * 100);
      } catch {
        return -2;
      }
    },
    async getStatus(): Promise<IndexerStatus> {
      let coreInfo: Awaited<ReturnType<BitcoinCoreClient["getBlockchainInfo"]>>;
      try {
        coreInfo = await core.getBlockchainInfo();
      } catch {
        return { state: "degraded", version: null, coreHeight: null, indexedHeight: null, percent: null, message: "Bitcoin Core is unavailable" };
      }
      if (requiredCoreIndexes.some((name) => !coreInfo.indexes[name])) {
        return { state: "degraded", version: null, coreHeight: coreInfo.blocks, indexedHeight: null, percent: null, message: "Bitcoin Core required indexes are unavailable" };
      }
      if (requiredCoreIndexes.some((name) => !coreInfo.indexes[name]?.synced)) {
        return { state: "waiting-for-core-indexes", version: null, coreHeight: coreInfo.blocks, indexedHeight: null, percent: null, message: "Waiting for Bitcoin Core indexes" };
      }
      try {
        const info = await electrumx.getInfo();
        if (info.dbHeight === -1) {
          return { state: "indexing", version: info.version, coreHeight: coreInfo.blocks, indexedHeight: null, percent: 0, message: "Preparing ElectrumX database" };
        }
        if (info.dbHeight > info.daemonHeight) {
          return { state: "error", version: null, coreHeight: coreInfo.blocks, indexedHeight: null, percent: null, message: "ElectrumX returned invalid status data" };
        }
        const targetHeight = Math.max(coreInfo.blocks, info.daemonHeight);
        const status = deriveIndexerStatus({ coreHeight: coreInfo.blocks, indexedHeight: info.dbHeight, targetHeight, initialBlockDownload: false, version: info.version });
        if (status.state !== "ready") return status;

        const listenerReady = await publicElectrum?.isReady().catch(() => false) ?? false;
        return listenerReady
          ? status
          : { ...status, state: "indexing", message: "ElectrumX is finalizing synchronization" };
      } catch (error) {
        if (error instanceof ElectrumXUnavailableError) {
          return deriveIndexerStatus({ coreHeight: coreInfo.blocks, indexedHeight: null, targetHeight: null, initialBlockDownload: false, version: null });
        }
        return { state: "error", version: null, coreHeight: coreInfo.blocks, indexedHeight: null, percent: null, message: "ElectrumX returned invalid status data" };
      }
    },
  };
}
