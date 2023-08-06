import { getAllCommunityFees } from "./gql_L1";
import { ArDriveCommunityFee } from "./types";

const fs = require("fs");

export async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const name = "ArDrive_All_Community_Tips_" + today + ".csv";

  const createCsvWriter = require("csv-writer").createObjectCsvWriter;

  const csvWriter = createCsvWriter({
    path: name,
    header: [
      { id: "owner", title: "OWNER" },
      { id: "recipient", title: "RECIPIENT" },
      { id: "appName", title: "APPNAME" },
      { id: "appVersion", title: "APPVERSION" },
      { id: "tip", title: "TIP" },
      { id: "type", title: "TYPE" },
      { id: "exchangeRate", title: "AR/USD PRICE" },
      { id: "amountAR", title: "AR" },
      { id: "amountUSD", title: "USD" },
      { id: "currentPrice", title: "CURRENT AR/USD PRICE" },
      { id: "costBasis", title: "COST BASIS" },
      { id: "blockHeight", title: "BLOCKHEIGHT" },
      { id: "blockTime", title: "BLOCKTIME" },
      { id: "friendlyDate", title: "FRIENDLYDATE" },
    ],
  });

  const start = new Date(2020, 8, 26); // the beginning history of ardrive
  const end = new Date();
  const allMyFees: ArDriveCommunityFee[] = await getAllCommunityFees(
    start,
    end
  );
  csvWriter.writeRecords(allMyFees).then(() => {
    console.log("...Done writing all ArDrive Community Fees transactions");
  });

  let totalARFees = 0;
  allMyFees.forEach((fee: ArDriveCommunityFee) => {
    totalARFees += +fee.amountAR;
  });
  console.log(
    "%s ArDrive Community Fee transactions receieved",
    allMyFees.length
  );
  console.log("%s AR collected", totalARFees);
}

main();
