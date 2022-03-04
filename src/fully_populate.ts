import { addHoursToDate, getMinBlock } from "./common";
import { getAllAppTransactions_ASC, getAllDrives_ASC } from "./gql";
import {
  sendBundlesToGraphite,
  sendDriveMetadataToGraphite,
  sendFileDataToGraphite,
  sendFileMetadataToGraphite,
  sendFolderMetadataToGraphite,
  sendMessageToGraphite,
  sendv2CommunityTipsToGraphite,
} from "./graphite";
import { ResultSet } from "./types";

async function main() {
  let allResults: ResultSet = {
    bundles: [],
    fileDatas: [],
    files: [],
    folders: [],
    drives: [],
    v2CommunityTips: [],
  };

  let today = new Date();

  // The amount of hours to search for i.e. 12, 24 or other range
  let hoursToQuery: number = 12;

  let start = new Date(2020, 8, 26); // the beginning history of ardrive
  // let start = new Date(2021, 11, 30);
  start = addHoursToDate(start, hoursToQuery);
  let lastBlock = await getMinBlock(start);

  console.log(
    "Running analytics from %s to %s",
    start.toLocaleString(),
    today.toLocaleString()
  );
  console.log(
    "--------------------------------------------------------------------------------"
  );

  while (start < today) {
    const end = new Date(addHoursToDate(start, hoursToQuery));
    console.log(
      "Getting all ArDrive App Stats from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );
    let results = await getAllAppTransactions_ASC(start, end, lastBlock);

    console.log("BundledTxs: %s", results.bundleTxs.length);
    console.log("FileDataTxs: %s", results.fileDataTxs.length);
    console.log("FileTxs: %s", results.fileTxs.length);
    console.log("FolderTxs: %s", results.folderTxs.length);
    console.log("DriveTxs: %s", results.driveTxs.length);
    console.log("V2 Tips: %s", results.tipTxs.length);
    allResults.bundles = allResults.bundles.concat(results.bundleTxs);
    allResults.fileDatas = allResults.fileDatas.concat(results.fileDataTxs);
    allResults.files = allResults.files.concat(results.fileTxs);
    allResults.folders = allResults.folders.concat(results.folderTxs);
    allResults.drives = allResults.drives.concat(results.driveTxs);
    allResults.v2CommunityTips = allResults.v2CommunityTips.concat(
      results.tipTxs
    );
    start = addHoursToDate(start, hoursToQuery);
    await sendBundlesToGraphite(results.bundleTxs, end);
    await sendFileMetadataToGraphite(results.fileTxs, end);
    await sendFileDataToGraphite(results.fileDataTxs, end);
    await sendFolderMetadataToGraphite(results.folderTxs, end);
    await sendDriveMetadataToGraphite(results.driveTxs, end);
    await sendv2CommunityTipsToGraphite(results.tipTxs, end);

    // Determine how many unique new users in this period by checking for drives created, getting user information, and checking full user list
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
    await sendMessageToGraphite("ardrive.users.total", allUsers.length, end);

    lastBlock = results.lastBlock - 1; // Start the search from 1 block previous to the last block
  }
  console.log(
    "--------------------------------------------------------------------------------"
  );
  console.log("All Results");
  console.log("BundledTxs: %s", allResults.bundles.length);
  console.log("FileDataTxs: %s", allResults.fileDatas.length);
  console.log("FileTxs: %s", allResults.files.length);
  console.log("FolderTxs: %s", allResults.folders.length);
  console.log("DriveTxs: %s", allResults.drives.length);
  console.log("V2 Tips: %s", allResults.v2CommunityTips.length);
}

main();
