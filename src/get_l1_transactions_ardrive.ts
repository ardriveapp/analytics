import { formatBytes } from "./common";
import { getAllAppL1Transactions } from "./gql";
import { L1ResultSet } from "./types";

async function main() {
  // The end date for the query range
  let end = new Date(); // today
  // The start date for the query range
  let start = new Date(2020, 8, 10);

  console.log(
    "Running analytics from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );
  console.log(
    "--------------------------------------------------------------------------------"
  );

  const foundAddresses: string[] = [];
  const l1Results: L1ResultSet = await getAllAppL1Transactions(start, end);
  //await sendBundlesToGraphite(bundleTxs, end);
  // await sendFileDataSizeOnlyToGraphite(l1Results.fileDataTxs, end);
  const totalNonBundledTxsFound =
    l1Results.driveTxs.length +
    l1Results.fileDataTxs.length +
    l1Results.fileTxs.length +
    l1Results.folderTxs.length +
    l1Results.tipTxs.length;

  let totalBundleSize = 0;
  let totalBundleGas = 0;
  let totalBundleTips = 0;

  l1Results.bundleTxs.forEach((tx) => {
    totalBundleSize += tx.dataSize;
    totalBundleGas += tx.fee;
    totalBundleTips += tx.quantity;
    foundAddresses.push(tx.owner);
  });

  let totalNonBundleSize = 0;
  let totalNonBundleGas = 0;
  let totalFileDataTips = 0;
  l1Results.fileDataTxs.forEach((tx) => {
    totalNonBundleSize += tx.dataSize;
    totalNonBundleGas += tx.fee;
    totalFileDataTips += tx.quantity;
    foundAddresses.push(tx.owner);
  });
  l1Results.fileTxs.forEach((tx) => {
    totalNonBundleSize += tx.dataSize;
    totalNonBundleGas += tx.fee;
    foundAddresses.push(tx.owner);
  });
  l1Results.folderTxs.forEach((tx) => {
    totalNonBundleSize += tx.dataSize;
    totalNonBundleGas += tx.fee;
    foundAddresses.push(tx.owner);
  });
  l1Results.driveTxs.forEach((tx) => {
    totalNonBundleSize += tx.dataSize;
    totalNonBundleGas += tx.fee;
    foundAddresses.push(tx.owner);
  });

  let totalTipTxTips = 0;
  l1Results.tipTxs.forEach((tx) => {
    totalTipTxTips += tx.quantity;
  });

  const uniqueUserCount = new Set(foundAddresses).size;
  console.log(
    "Completed analytics from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );
  console.log(`-----------------------------------------`);
  console.log(`Bundles found: ${l1Results.bundleTxs.length}`);
  console.log(`Bundle Data Size (Bytes): ${formatBytes(totalBundleSize)}`);
  console.log(`Bundle Gas Spent (AR): ${totalBundleGas}`);
  console.log(`Non Bundled Txs found: ${totalNonBundledTxsFound}`);
  console.log(
    `Non Bundled Data Size (Bytes): ${formatBytes(totalNonBundleSize)}`
  );
  console.log(`Non Bundled Gas Spent (AR): ${totalNonBundleGas}`);
  console.log(`Bundled Tip Amount (AR): ${totalBundleTips}`);
  console.log(`Non Bundled Tip Amount (AR): ${totalFileDataTips}`);
  console.log("Separated Tip Txs Sent: %s", l1Results.tipTxs.length);
  console.log(`Separated Tip Amount (AR): ${totalTipTxTips}`);
  console.log(`-----------------------------------------`);
  console.log(
    `Total L1 Transactions: ${
      totalNonBundledTxsFound + l1Results.bundleTxs.length
    }`
  );
  console.log(
    `Total L1 Size (Bytes): ${formatBytes(
      totalBundleSize + totalNonBundleSize
    )}`
  );
  console.log(
    `Total L1 Tip Amount (AR): ${
      totalBundleTips + totalFileDataTips + totalTipTxTips
    }`
  );
  console.log(`Total Unique Users Found: ${uniqueUserCount}`);
  console.log(`-----------------------------------------`);
  console.log("ArFS Stats");
  console.log(" - FileDataTxs: %s", l1Results.fileDataTxs.length);
  console.log(" - FileTxs: %s", l1Results.fileTxs.length);
  console.log(" - FolderTxs: %s", l1Results.folderTxs.length);
  console.log(" - DriveTxs: %s", l1Results.driveTxs.length);
}

main();
