import { countDistinct } from "./common";
import { getUniqueArDriveUsers } from "./gql";

// Gets all unique users who have uploaded to ArDrive in the given time range
export async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(2020, 8, 1);
  const end = new Date(2022, 6, 29);

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
    "Getting all unique users from from app %s from %s to %s",
    appTarget,
    start.toLocaleString(),
    end.toLocaleString()
  );

  // Determine how many unique new users in this period by checking for drives created, getting user information, and checking full user list
  /*const allTimeStart = new Date(2020, 8, 26); // beginning date for ArDrive transactions
  const allDrives = await getAllDrives_ASC(allTimeStart, end, 1); // We want to get all drive information going up to the most recent period
  const allUsers: string[] = [
    ...new Set(allDrives.map((item: { owner: string }) => item.owner)),
  ]; 
  console.log ("Number of unique users found", allUsers.length)*/

  const allData = await getUniqueArDriveUsers(start, end);

  const uniqueUsers = countDistinct(
    allData.foundUsers,
    allData.foundUsers.length
  );
  console.log("Total Transactions found: %s", allData.foundTransactions);
  console.log("Total ArFS Data found: %s", allData.dataSize);
  console.log("Total Active Users found: %s", uniqueUsers);

  const recordToWrite = {
    foundTransactions: allData.foundTransactions.toString(),
    dataSize: allData.dataSize.toString(),
    foundUsers: uniqueUsers.toString(),
  };
  csvWriter.writeRecords(recordToWrite).then(() => {
    console.log("...Done getting all files");
  });
}

main();
