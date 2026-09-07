import { createConnectionDetails } from "../../../packages/contracts/src/connections.js";
import { buildApp } from "./app.js";
import { readConfig } from "./config.js";
import { createElectrumXClient, createElectrumXPublicClient } from "./electrumx-client.js";
import { createElectrumXGuiService } from "./electrumx-gui-service.js";
import { createBitcoinCoreClient } from "./bitcoin-core-client.js";

const config = readConfig(process.env);
const service = createElectrumXGuiService({
  core: createBitcoinCoreClient(config.core),
  electrumx: createElectrumXClient(config.electrumx),
  publicElectrum: createElectrumXPublicClient(config.publicElectrum),
  connections: createConnectionDetails(config.connections),
});
const app = buildApp({ service });

async function shutdown() { await app.close(); process.exit(0); }
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

try {
  await app.listen({ host: "0.0.0.0", port: config.port });
  console.info("ElectrumX GUI is listening");
} catch {
  console.error("ElectrumX GUI failed to start");
  process.exit(1);
}
