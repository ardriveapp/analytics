import { getArDriveTokenTransfers } from "./utilities";

export async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const name = "ArDrive_Community_Token_Transactions_" + today + ".csv";
  let end = new Date();
  let start = new Date(2020, 7, 1);

  const createCsvWriter = require("csv-writer").createObjectCsvWriter;

  const csvWriter = createCsvWriter({
    path: name,
    header: [
      { id: "id", title: "TXID" },
      { id: "owner", title: "OWNER" },
      { id: "target", title: "TARGET" },
      { id: "appName", title: "APPNAME" },
      { id: "quantity", title: "QUANTITY" },
      { id: "blockHeight", title: "BLOCKHEIGHT" },
      { id: "blockTime", title: "BLOCKTIME" },
      { id: "friendlyDate", title: "FRIENDLYDATE" },
      { id: "validSmartweaveTx", title: "VALIDSMARTWEAVETX" },
    ],
  });

  const results = await getArDriveTokenTransfers(start, end);

  csvWriter.writeRecords(results).then(() => {
    console.log(`Found ${results.length} resuults`);
    console.log(`...Done writing ArDrive Token Transfers`);
  });
}

main();
