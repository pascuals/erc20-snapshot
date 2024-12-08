"use strict";

const Web3 = require("web3");

const Config = require("./config").getConfig();
const Parameters = require("./parameters").get();

const web3 = [];
let web3Index = 0;
const getWeb3 = () => {
  if (web3Index >= web3.length) web3Index = 0;
  return web3[web3Index++];
};

(Config || {}).providers.forEach(config =>
  web3.push(new Web3(new Web3.providers.HttpProvider(config || "http://localhost:8545")))
);

const contractAddress = (Config || {}).contractAddress;

module.exports.getContract = () => getWeb3().eth.Contract(Parameters.abi, contractAddress);
