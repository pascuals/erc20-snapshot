#!/usr/bin/env node
"use strict";

const Balances = require("./balances");
const Config = require("./config");
const Events = require("./events/blockchain");
const Export = require("./export");
const BigNumber = require("bignumber.js");
const { getContract } = require("./contract");

const start = async () => {
  await Config.checkConfig();
  const format = Config.getConfig().format;
  const result = await Events.get();

  console.log("Calculating balances of %s (%s)", result.name, result.symbol);
  let balances = await Balances.createBalances(result);

  const totalBalances = balances.reduce((sum, balance) =>
      new BigNumber(balance.balance).plus(sum)
    ,
    0);

  if (Config.getConfig().ignoreZeroBalances.toLowerCase() === "yes") {
    balances = balances.filter(balance =>
      !new BigNumber(balance.balance).isZero()
    );
  }

  // double check 100 first balances
  for await (const balance of balances.slice(0, 100)) {
    const realBalance = await getContract().methods.balanceOf(balance.wallet).call();
    if (!(new BigNumber(realBalance?._hex).div(10 ** parseInt(result.decimals)).eq(balance.balance))) console.warn(`Invalid balance`, balance.wallet, balance.balance);
  }

  console.log("Exporting balances", `${balances.length} wallets`, `${totalBalances.toString()} ${result.symbol}`);
  await Export.exportBalances(result.symbol, balances, format);
};

(async () => {
  try {
    await start();
  } catch (e) {
    console.error(e);
  }
})();
