const jayson = require('jayson');
const bitcoindService = require("services/bitcoind");

const constants = require("utils/const.js");

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

// Single instance pattern
const electrumClient = new ElectrumClient(constants.ELECTRUM_HOST, 8000);

async function getVersion() {
  const info = await electrumClient.request('getinfo');
  return info.version.substring(info.version.indexOf(' ') + 1) ?? 'unknown';
}

async function syncPercent() {
  const { initialblockdownload } = await bitcoindService.getBlockChainInfo();
  if (initialblockdownload) {
    return null;
  }

  const info = await electrumClient.request('getinfo');
  const dbHeight = info['db height'];
  const daemonHeight = info['daemon height'];

  // returns NaN if daemonHeight is 0, which is falsy and caught by the frontend appropriately
  return Math.ceil((dbHeight / daemonHeight) * 100);
}

module.exports = {
  getVersion,
  syncPercent,
};
