const jayson = require('jayson');
const bitcoindService = require("services/bitcoind");

const constants = require("utils/const.js");

// ElectrumX RPC details: https://electrumx.readthedocs.io/en/latest/rpc-interface.html
class ElectrumClient {
  constructor(host, port) {
    this.client = new jayson.Client.tcp({
      host,
      port,
      version: 2,
      delimiter: '\n'
    });
  }

  async request(method, params = []) {
    return new Promise((resolve, reject) => {
      this.client.request(method, params, (error, response) => {
        if (error) return reject(error);
        if (!response?.result) return reject(new Error('Invalid response'));
        resolve(response.result);
      });
    });
  }
}

const electrumClient = new ElectrumClient(constants.ELECTRUM_HOST, constants.ELECTRUM_RPC_PORT);

async function getVersion() {
  // Returns version number from response format: "{name} {semver}"
  // e.g., "ElectrumX 1.16.0" -> "1.16.0"
  const info = await electrumClient.request('getinfo');
  return info?.version?.split(' ')[1] ?? 'unknown';
}

async function syncPercent() {
  // If Bitcoin node is still syncing, we return null and render the "Waiting for Bitcoin Node to finish syncing..." message in the frontend
  // This way, the sync percent is not calculated until the Bitcoin node is done syncing
  const { initialblockdownload } = await bitcoindService.getBlockChainInfo();
  if (initialblockdownload) {
    return null;
  }

  const info = await electrumClient.request('getinfo');
  const dbHeight = info['db height']; // ElectrumX height
  const daemonHeight = info['daemon height']; // Bitcoin node height

  // returns NaN if daemonHeight is 0, which is falsy and caught by the frontend appropriately
  return Math.ceil((dbHeight / daemonHeight) * 100);
}

module.exports = {
  getVersion,
  syncPercent,
};
