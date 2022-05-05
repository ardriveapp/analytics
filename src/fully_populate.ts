import { addHoursToDate, appNames, asyncForEach, getMinBlock } from "./common";
import { getAllAppTransactions_DESC} from "./gql";
import { sendBundlesToGraphite, sendFileMetadataToGraphite, sendFileDataToGraphite, sendFolderMetadataToGraphite, sendDriveMetadataToGraphite, sendv2CommunityTipsToGraphite } from "./graphite";
import { ResultSet } from "./types";

async function main() {
  let allResults: ResultSet = {
    bundleTxs: [],
    fileDataTxs: [],
    fileTxs: [],
    folderTxs: [],
    driveTxs: [],
    tipTxs: [],
    lastBlock: 0
  };

  let results: ResultSet = {
    bundleTxs: [],
    fileDataTxs: [],
    fileTxs: [],
    folderTxs: [],
    driveTxs: [],
    tipTxs: [],
    lastBlock: 0
  };

  let end = new Date();

  // The amount of hours to search for i.e. 12, 24 or other range
  let hoursToQuery: number = 24;

  // let start = new Date(2020, 8, 26); // the beginning history of ardrive
  let start = new Date(2022, 1, 15);
  start = addHoursToDate(start, hoursToQuery);
  let lastBlock = await getMinBlock(start);

  console.log(
    "Running analytics from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );
  console.log(
    "--------------------------------------------------------------------------------"
  );

  while (start < end) {
    const end = new Date(addHoursToDate(start, hoursToQuery));
    await asyncForEach(appNames, async (appName: string) => {
      results = await getAllAppTransactions_DESC(start, end, appName, lastBlock);
      await sendBundlesToGraphite(results.bundleTxs, end);
      await sendFileMetadataToGraphite(results.fileTxs, end);
      await sendFileDataToGraphite(results.fileDataTxs, end);
      await sendFolderMetadataToGraphite(results.folderTxs, end);
      await sendDriveMetadataToGraphite(results.driveTxs, end);
      await sendv2CommunityTipsToGraphite(results.tipTxs, end);
  
      console.log("Results for %s", appName);
      console.log(" - BundledTxs: %s", results.bundleTxs.length);
      console.log(" - FileDataTxs: %s", results.fileDataTxs.length);
      console.log(" - FileTxs: %s", results.fileTxs.length);
      console.log(" - FolderTxs: %s", results.folderTxs.length);
      console.log(" - DriveTxs: %s", results.driveTxs.length);
      console.log(" - V2 Tips: %s", results.tipTxs.length);
      console.log(" - Last Block Found %s", results.lastBlock);

      allResults.bundleTxs = allResults.bundleTxs.concat(results.bundleTxs);
      allResults.fileDataTxs = allResults.fileDataTxs.concat(results.fileDataTxs);
      allResults.fileTxs = allResults.fileTxs.concat(results.fileTxs);
      allResults.folderTxs = allResults.folderTxs.concat(results.folderTxs);
      allResults.driveTxs = allResults.driveTxs.concat(results.driveTxs);
      allResults.tipTxs = allResults.tipTxs.concat(
        results.tipTxs
      );
    });


    /* Determine how many unique new users in this period by checking for drives created, getting user information, and checking full user list
    const newUsers: string[] = [
      ...new Set(results.driveTxs.map((item: { owner: string }) => item.owner)),
    ];
    const allTimeStart = new Date(2020, 8, 26); // beginning date for ArDrive transactions
    const allDrives = await getAllDrives_ASC(allTimeStart, start, 1); // We want to get all drive information going up to the most recent period
    const allUsers: string[] = [
      ...new Set(allDrives.map((item: { owner: string }) => item.owner)),
    ];

    // need to compare new ardrive users to total ardrive users
    let newUserCount = 0;
    newUsers.forEach((user: string) => {
      newUserCount += allUsers.filter((item) => item === user).length;
    });
    await sendMessageToGraphite("ardrive.users.new", newUserCount, end);
    await sendMessageToGraphite("ardrive.users.total", allUsers.length, end);*/

    lastBlock = results.lastBlock - 1; // Start the search from 1 block previous to the last block
    start = addHoursToDate(start, hoursToQuery);
  }
  console.log(
    "--------------------------------------------------------------------------------"
  );
  console.log("All Results");
  console.log("BundledTxs: %s", allResults.bundleTxs.length);
  console.log("FileDataTxs: %s", allResults.fileDataTxs.length);
  console.log("FileTxs: %s", allResults.fileTxs.length);
  console.log("FolderTxs: %s", allResults.folderTxs.length);
  console.log("DriveTxs: %s", allResults.driveTxs.length);
  console.log("V2 Tips: %s", allResults.tipTxs.length);
}

main();
