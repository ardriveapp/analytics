import { countDistinct } from "./utilities";
import { getAllAppL2Transactions } from "./gql_L2";

export async function main() {
  const today = new Date().toISOString().slice(0, 10);
  // The date to start looking for data
  let start = new Date(2020, 8, 26); // the beginning history of ardrive
  // let start = new Date(2021, 7, 16);

  // The date to finish looking for data
  let end = new Date();
  end.setHours(0, 0, 0, 0);

  const appName = "Akord"; // Change this to whatever app target you like

  const name = appName + "_All_App_Data_Report_" + today + ".csv";
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;

  const csvWriter = createCsvWriter({
    path: name,
    header: [
      { id: "foundL1Transactions", title: "FOUNDL1TRANSACTIONS" },
      { id: "foundL2Transactions", title: "FOUNDL2TRANSACTIONS" },
      { id: "foundDataItemData", title: "FOUNDDATAITEMDATA" },
      { id: "foundBundledData", title: "FOUNDBUNDLEDDATA" },
      { id: "uniqueTotalUsers", title: "UNIQUETOTALUSERS" },
    ],
  });
  console.log(
    "Getting all data from from app %s from %s to %s",
    appName,
    start.toLocaleString(),
    end.toLocaleString()
  );

  const l2Results = await getAllAppL2Transactions(start, end, appName);

  const foundAddresses: string[] = [];
  let foundBundledData = 0;
  let foundDataItemData = 0;
  let foundL1Transactions = 0;
  let foundL2Transactions = 0;

  l2Results.bundleTxs.forEach((tx) => {
    foundAddresses.push(tx.owner);
    foundBundledData += tx.dataSize;
    foundL1Transactions += 1;
  });
  l2Results.fileDataTxs.forEach((tx) => {
    foundAddresses.push(tx.owner);
    foundDataItemData += tx.dataSize;
    foundL2Transactions += 1;
  });
  l2Results.fileTxs.forEach((tx) => {
    foundAddresses.push(tx.owner);
  });
  l2Results.folderTxs.forEach((tx) => {
    foundAddresses.push(tx.owner);
  });
  l2Results.driveTxs.forEach((tx) => {
    foundAddresses.push(tx.owner);
  });
  l2Results.snapshotTxs.forEach((tx) => {
    foundAddresses.push(tx.owner);
  });

  const uniqueTotalUsers = new Set(foundAddresses).size;
  console.log("Total L1 Transactions found: %s", foundL1Transactions);
  console.log("Total L2 Transactions found: %s", foundL2Transactions);
  console.log("Total Data Item Data Found: %s", foundDataItemData);
  console.log("Total users found: %s", uniqueTotalUsers);
  const recordToWrite = {
    foundL1Transactions,
    foundL2Transactions,
    foundDataItemData,
    foundBundledData,
    uniqueTotalUsers,
  };
  csvWriter.writeRecords(recordToWrite).then(() => {
    console.log("...Done getting all files");
  });
}
main();
