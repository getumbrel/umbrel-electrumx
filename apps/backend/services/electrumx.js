const ElectrumClient = require("@lily-technologies/electrum-client");
const bitcoindService = require("services/bitcoind");

const constants = require("utils/const.js");

let rpcClient = new ElectrumClient(
  constants.ELECTRUM_PORT,
  constants.ELECTRUM_HOST,
  "tcp"
);

(async () => {
  try {
    const ver = await rpcClient.initElectrum({
      client: "umbrel",
      version: "1.4",
    });
  } catch (e) {
    console.log("connect errror: ", e.message);
  }
})();

async function getVersion() {
  // versionInfo[0] comes in as "ElectrumX 1.16.0", so we parse
  const version = rpcClient.versionInfo[0].substring(
    rpcClient.versionInfo[0].indexOf(" ") + 1
  );
  return version;
}

// This is a little hacky way of determining if electrumx is sync'd to bitcoind
// see https://github.com/romanz/electrumx/pull/543#issuecomment-973078262
async function syncPercent() {
  // first, check if bitcoind isn't still IBD
  const {
    result: bitcoindResponse,
  } = await bitcoindService.getBlockChainInfo();
  if (bitcoindResponse.initialblockdownload) {
    return 0;
  }

  // if not IBD, then check bitcoind height to electrumx height
  const resp = await rpcClient.blockchainHeaders_subscribe();
  console.log("resp: ", resp);
  const { height: electrumxHeight } = resp;
  return Math.ceil((electrumxHeight / bitcoindResponse.blocks) * 100);
}

module.exports = {
  getVersion,
  syncPercent,
};
