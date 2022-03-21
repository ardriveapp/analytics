import { addHoursToDate, getMinBlock } from "./common";
import { getAllAppDriveTransactions_ASC } from "./gql";
import { sendDriveMetadataToGraphite } from "./graphite";
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
      "Getting all ArDrive App Drive Stats from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );
    let results = await getAllAppDriveTransactions_ASC(start, end, lastBlock);
    console.log("DriveTxs: %s", results.driveTxs.length);
    allResults.driveTxs = allResults.driveTxs.concat(results.driveTxs);
    start = addHoursToDate(start, hoursToQuery);
    await sendDriveMetadataToGraphite(results.driveTxs, end);
    lastBlock = results.lastBlock - 1; // Start the search from 1 block previous to the last block
  }
  console.log(
    "--------------------------------------------------------------------------------"
  );
  console.log("All Results");
  console.log("DriveTxs: %s", allResults.driveTxs.length);
}

main();
