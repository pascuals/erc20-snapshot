"use strict";

const Web3 = require("web3");

const BlockByBlock = require("./block-by-block");
const BlockReader = require("./block-reader");
const Config = require("../config").getConfig();
const { getContract } = require("../contract");
const FileHelper = require("../file-helper");
const LastDownloadedBlock = require("./last-downloaded-block");
const Parameters = require("../parameters").get();

const { promisify } = require("util");

const sleep = promisify(setTimeout);

const web3 = [];
let web3Index = 0;
const getWeb3 = () => {
  if (web3Index >= web3.length) web3Index = 0;
  return web3[web3Index++];
};


(Config || {}).providers.forEach(config =>
  web3.push(new Web3(new Web3.providers.HttpProvider(config || "http://localhost:8545")))
);

const groupBy = (objectArray, property) => {
  return objectArray.reduce((acc, obj) => {
    const key = obj[property];
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(obj);
    return acc;
  }, {});
};

const tryGetEvents = async (start, end, symbol) => {
  try {
    console.log(`Fetching ${end - start} blocks (${start} to ${end})`);
    const pastEvents = await getContract().getPastEvents("Transfer", { fromBlock: start, toBlock: end });

    if (pastEvents.length) {
      console.info("Successfully imported ", pastEvents.length, " events");
    }

    const group = groupBy(pastEvents, "blockNumber");

    for (let key in group) {
      if (group.hasOwnProperty(key)) {
        const blockNumber = key;
        const data = group[key];

        const file = Parameters.eventsDownloadFilePath.replace(/{token}/g, symbol).replace(/{blockNumber}/g, blockNumber);

        FileHelper.writeFile(file, data);
      }
    }
  } catch (e) {
    console.log("Could not get events due to an error. Now checking block by block.", "");
    await BlockByBlock.tryBlockByBlock(start, end, symbol);
  }
};

module.exports.get = async () => {
  const name = await getContract().methods.name().call();
  const symbol = await getContract().methods.symbol().call();
  const decimals = await getContract().methods.decimals().call();
  const blockHeight = await getWeb3().eth.getBlockNumber();
  let fromBlock = parseInt(Config.fromBlock) || 0;
  const blocksPerBatch = parseInt(Config.blocksPerBatch) || 0;
  const delay = parseInt(Config.delay) || 0;
  const toBlock = parseInt(Config.toBlock) || blockHeight;

  const lastDownloadedBlock = await LastDownloadedBlock.get(symbol);

  if (lastDownloadedBlock) {
    console.log("Resuming from the last downloaded block #", lastDownloadedBlock);
    fromBlock = lastDownloadedBlock + 1;
  }

  console.log("From %d to %d", fromBlock, toBlock, Math.ceil((toBlock - fromBlock) / blocksPerBatch));

  let start = fromBlock;
  let end = Math.min(fromBlock + blocksPerBatch, toBlock);
  let i = 0;

  while (start <= toBlock) {
    i++;

    if (delay) {
      await sleep(delay);
    }

    console.log("Batch", i, " From", start, "to", end);

    await tryGetEvents(start, Math.min(end, toBlock), symbol);

    start = end + 1;
    end = Math.min(start + blocksPerBatch, toBlock);
  }

  const events = await BlockReader.getEvents(symbol);

  return {
    name,
    symbol,
    decimals,
    events
  };
};
