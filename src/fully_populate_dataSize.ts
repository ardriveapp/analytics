import { addHoursToDate, appNames, asyncForEach, getMinBlock } from "./common";
import { getAllAppL1Transactions, getBundleTransactions_ASC } from "./gql";
import {
  sendBundlesToGraphite,
  sendFileDataSizeOnlyToGraphite,
} from "./graphite";
import { BundleTx, L1ResultSet, ResultSet } from "./types";

async function main() {
  // The amount of hours to search for i.e. 12, 24 or other range
  let hoursToQuery: number = 12;

  // The end date for the query range
  let end = new Date();

  let start = new Date(2020, 9, 26); // the beginning history of ardrive
  // let start = new Date(2022, 1, 15);
  start = addHoursToDate(start, hoursToQuery);

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
    console.log(
      "Getting all ArDrive Data from from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );
    //const bundleTxs: BundleTx[] = await getBundleTransactions_ASC(start, end);
    const l1Results = await getAllAppL1Transactions(start, end);
    //await sendBundlesToGraphite(bundleTxs, end);
    await sendFileDataSizeOnlyToGraphite(l1Results.fileDataTxs, end);
    const totalL1TxsFound =
      l1Results.driveTxs.length +
      l1Results.fileDataTxs.length +
      l1Results.fileTxs.length +
      l1Results.folderTxs.length +
      l1Results.tipTxs.length;
    console.log(`Bundles found: ${l1Results.bundleTxs.length}`);
    console.log(`Other L1 Txs found ${totalL1TxsFound}`);
    start = addHoursToDate(start, hoursToQuery);
  }
  console.log(
    "--------------------------------------------------------------------------------"
  );
}

main();
