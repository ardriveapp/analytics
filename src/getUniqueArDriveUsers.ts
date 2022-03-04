import { countDistinct } from "./common";
import { getUniqueArDriveUsers } from "./gql";

export async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(2021, 11, 1);
  const end = new Date(2022, 0, 1);

  const appTarget = "ArDrive"; // Change this to whatever app target you like

  const name = appTarget + "_All_App_Data_Report_" + today + ".csv";
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;

  const csvWriter = createCsvWriter({
    path: name,
    header: [
      { id: "foundTransactions", title: "FOUNDTRANSACTIONS" },
      { id: "dataSize", title: "TOTALDATASIZE" },
      { id: "foundUsers", title: "FOUNDUSERS" },
    ],
  });

  console.log(
    "Getting all data from from app %s from %s to %s",
    appTarget,
    start.toLocaleString(),
    end.toLocaleString()
  );
  const allData = await getUniqueArDriveUsers(start, end);

  const uniqueUsers = countDistinct(
    allData.foundUsers,
    allData.foundUsers.length
  );
  console.log("Total Transactions found: %s", allData.foundTransactions);
  console.log("Total ArFS Data found: %s", allData.dataSize);
  console.log("Total Active Users found: %s", uniqueUsers);

  const recordToWrite = {
    foundTransactions: allData.foundTransactions,
    dataSize: allData.dataSize,
    foundUsers: uniqueUsers,
  };
  csvWriter.writeRecords(recordToWrite).then(() => {
    console.log("...Done getting all files");
  });
}

main();
