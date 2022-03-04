import { getAllArDriveTokenHolders } from "./smartweave";
import { ArDriveTokenHolder } from "./types";

export async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const name = "ArDrive_All_Token_Holders_" + today + ".csv";

  const createCsvWriter = require("csv-writer").createObjectCsvWriter;

  const csvWriter = createCsvWriter({
    path: name,
    header: [
      { id: "address", title: "ADDRESS" },
      { id: "unlockedArDriveTokens", title: "UNLOCKEDARDRIVETOKENS" },
      { id: "lockedArDriveTokens", title: "LOCKEDARDRIVETOKENS" },
      { id: "totalArDriveTokens", title: "TOTALARDRIVETOKENS" },
      { id: "voteWeight", title: "VOTEWEIGHT" },
      { id: "arweaveTokens", title: "ARWEAVETOKENS" },
    ],
  });

  const allArDriveTokenHolders: ArDriveTokenHolder[] =
    await getAllArDriveTokenHolders();
  csvWriter.writeRecords(allArDriveTokenHolders).then(() => {
    console.log("...Done writing all ArDrive Token Holders");
  });
}

main();
