import { getAllArDriveTokenHolders } from "./smartweave";
import { TokenHolders } from "./types";

const fs = require("fs");

export async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const start = Date.now();
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

  const allTokenHolders: TokenHolders = await getAllArDriveTokenHolders();

  // stringify JSON Object
  let jsonContent = JSON.stringify(allTokenHolders);

  fs.writeFile("output.json", jsonContent, "utf8", function (err) {
    if (err) {
      console.log("An error occured while writing JSON Object to File.");
      return console.log(err);
    }
  });

  const end = Date.now();

  console.log("Took %s seconds", (end - start) / 1000);

  csvWriter.writeRecords(allTokenHolders).then(() => {
    console.log(`Found ${allTokenHolders.length} token holders`);
    console.log("Done writing all ArDrive Token Holders");
  });
}

main();
