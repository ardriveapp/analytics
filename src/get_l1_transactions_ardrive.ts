import { formatBytes } from "./common";
import { getAllAppL1Transactions } from "./gql";

async function main() {
  // The end date for the query range
  let end = new Date(); // today
  // The start date for the query range
  let start = new Date(2020, 9, 26); // the beginning history of ardrive

  console.log(
    "Running analytics from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );
  console.log(
    "--------------------------------------------------------------------------------"
  );

  const l1Results = await getAllAppL1Transactions(start, end, "Akord");
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
  });

  let totalNonBundleSize = 0;
  let totalNonBundleGas = 0;
  let totalFileDataTips = 0;
  l1Results.fileDataTxs.forEach((tx) => {
    totalNonBundleSize += tx.dataSize;
    totalNonBundleGas += tx.fee;
    totalFileDataTips += tx.quantity;
  });
  l1Results.fileTxs.forEach((tx) => {
    totalNonBundleSize += tx.dataSize;
    totalNonBundleGas += tx.fee;
  });
  l1Results.folderTxs.forEach((tx) => {
    totalNonBundleSize += tx.dataSize;
    totalNonBundleGas += tx.fee;
  });
  l1Results.driveTxs.forEach((tx) => {
    totalNonBundleSize += tx.dataSize;
    totalNonBundleGas += tx.fee;
  });

  let totalTipTxTips = 0;
  l1Results.tipTxs.forEach((tx) => {
    totalTipTxTips += tx.quantity;
  });

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
  console.log(`-----------------------------------------`);
  console.log("ArFS Stats");
  console.log(" - FileDataTxs: %s", l1Results.fileDataTxs.length);
  console.log(" - FileTxs: %s", l1Results.fileTxs.length);
  console.log(" - FolderTxs: %s", l1Results.folderTxs.length);
  console.log(" - DriveTxs: %s", l1Results.driveTxs.length);
}

main();
