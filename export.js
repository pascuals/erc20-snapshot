"use strict";
const path = require("path");
const FileHelper = require("./file-helper");
const Parameters = require("./parameters").get();
const WalletType = require("./wallet-type");
const Config = require("./config").getConfig();

const objectToCsv = require("csv-writer").createObjectCsvWriter;

module.exports.exportBalances = async (symbol, balances, format) => {
  let withType = balances;

  const checkContract = Config.checkIfContract.toLowerCase() === "yes";
  if (checkContract) {
    withType = await WalletType.addType(balances);
  }

  const writeCsv = () => {
    const file = Parameters.outputFileNameCSV.replace(/{token}/g, symbol);
    FileHelper.ensureDirectory(path.dirname(file));

    const header = [{ id: "wallet", title: "holders" }, { id: "balance", title: "amounts" }];

    if (checkContract) {
      header.push({ id: "type", title: "Type" });
    }
    const writer = objectToCsv({
      path: file,
      header
    });

    console.log("Exporting CSV");
    writer.writeRecords(withType).then(() => console.log("CSV export done!"));
  };

  if (["csv", "both"].indexOf(format.toLowerCase()) > -1) {
    writeCsv();

    if (format.toLowerCase() === "csv") {
      return;
    }
  }

  console.log("Exporting JSON");
  await FileHelper.writeFile(Parameters.outputFileNameJSON.replace(/{token}/g, symbol), withType);
  console.log("JSON export done!");
};
