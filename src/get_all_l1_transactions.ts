import { addHoursToDate, appNames, asyncForEach, getMinBlock } from "./common";
import { getAllAppL1Transactions, getBundleTransactions_ASC } from "./gql";
import {
  sendBundlesToGraphite,
  sendFileDataSizeOnlyToGraphite,
} from "./graphite";
import { BundleTx, L1ResultSet, ResultSet } from "./types";

async function main() {
  // The end date for the query range
  let end = new Date();

  let start = new Date(2020, 9, 26); // the beginning history of ardrive

  console.log(
    "Running analytics from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );
  console.log(
    "--------------------------------------------------------------------------------"
  );

  const l1Results = await getAllAppL1Transactions(start, end);
  //await sendBundlesToGraphite(bundleTxs, end);
  // await sendFileDataSizeOnlyToGraphite(l1Results.fileDataTxs, end);
  const totalL1TxsFound =
    l1Results.bundleTxs.length +
    l1Results.driveTxs.length +
    l1Results.fileDataTxs.length +
    l1Results.fileTxs.length +
    l1Results.folderTxs.length +
    l1Results.tipTxs.length;
  console.log(`Bundles found: ${l1Results.bundleTxs.length}`);
  console.log(`Total L1 Txs found ${totalL1TxsFound}`);
  console.log(" - BundledTxs: %s", l1Results.bundleTxs.length);
  console.log(" - FileDataTxs: %s", l1Results.fileDataTxs.length);
  console.log(" - FileTxs: %s", l1Results.fileTxs.length);
  console.log(" - FolderTxs: %s", l1Results.folderTxs.length);
  console.log(" - DriveTxs: %s", l1Results.driveTxs.length);
  console.log(" - V2 Tips: %s", l1Results.tipTxs.length);
}

main();
