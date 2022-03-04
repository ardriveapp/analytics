import { getAllAstatineRewards } from "./gql";
import { AstatineReward } from "./types";

export async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const name = "ArDrive_All_Astatine_Transactions_" + today + ".csv";

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
  const allRewards: AstatineReward[] = await getAllAstatineRewards(start, end);
  csvWriter.writeRecords(allRewards).then(() => {
    console.log("...Done writing all ArDrive Community Fees transactions");
  });

  let totalARDRIVESent = 0;
  allRewards.forEach((reward: AstatineReward) => {
    totalARDRIVESent += +reward.quantity;
  });
  console.log("%s ArDrive Astatine transactions sent", allRewards.length);
  console.log("%s ARDRIVE collected", totalARDRIVESent);
}

main();
