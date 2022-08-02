import { getAllAstatineRewards, getAllInfernoRewards } from "./gql";
import { AstatineReward } from "./types";

export async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const name = "ArDrive_All_Inferno_Transactions_" + today + ".csv";

  const createCsvWriter = require("csv-writer").createObjectCsvWriter;

  const csvWriter = createCsvWriter({
    path: name,
    header: [
      { id: "owner", title: "OWNER" },
      { id: "target", title: "RECIPIENT" },
      { id: "appName", title: "APPNAME" },
      { id: "appVersion", title: "APPVERSION" },
      { id: "cannon", title: "CANNON" },
      { id: "quantity", title: "QUANTITY" },
      { id: "blockHeight", title: "BLOCKHEIGHT" },
      { id: "blockTime", title: "BLOCKTIME" },
      { id: "friendlyDate", title: "FRIENDLYDATE" },
      { id: "validSmartweaveTx", title: "VALIDSMARTWEAVETX" },
    ],
  });

  const start = new Date(2020, 8, 26); // the beginning history of ardrive
  const end = new Date();
  const allRewards: AstatineReward[] = await getAllInfernoRewards(start, end);
  csvWriter.writeRecords(allRewards).then(() => {
    // console.log("...Done writing all ArDrive Community Fees transactions");
  });

  let totalARDRIVESent = 0;
  allRewards.forEach((reward: AstatineReward) => {
    totalARDRIVESent += +reward.quantity;
  });

  const owners: string[] = [];
  for (let i = 0; i < allRewards.length; i += 1) {
    owners.push(allRewards[i].target);
  }

  let uniqueTargets = 0;
  owners.forEach((element, index) => {
    if (owners.indexOf(element) === index) {
      uniqueTargets += 1;
    }
  });

  console.log("%s ArDrive Inferno transactions sent", allRewards.length);
  console.log("%s Unique Targets", uniqueTargets);
  console.log("%s ArDrive distributed", totalARDRIVESent);
}

main();
