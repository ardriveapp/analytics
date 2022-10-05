import { appNames, asyncForEach, formatBytes } from "./common";
import { getAllAppL1Transactions, getAllAppUserL1Transactions } from "./gql";
import { L1ResultSet } from "./types";

async function main() {
  // The end date for the query range
  //let end = new Date(2022, 8, 11); // today
  let end = new Date();
  // The start date for the query range
  //let start = new Date(2022, 8, 4);
  let start = new Date(2022, 4, 1);
  let owner = "zXeBkp2xG6SCSSSGPAuqV3vip0JhXjPAW-Lj7KSuB6E";

  console.log(
    "Running analytics from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );
  console.log(
    "--------------------------------------------------------------------------------"
  );

  const foundAddresses: string[] = [];
  let totalNonBundleSize = 0;
  let totalNonBundleGas = 0;
  let totalFileDataTips = 0;
  let totalNonBundledTxsFound = 0;
  let totalBundleSize = 0;
  let totalBundleGas = 0;
  let totalBundleTips = 0;
  let totalTipTxTips = 0;
  let appPlatformTxs = 0;
  await asyncForEach(appNames, async (appName: string) => {
    const l1Results: L1ResultSet = await getAllAppUserL1Transactions(
      start,
      end,
      owner,
      appName
    );

    let appNonBundleSize = 0;
    let appNonBundleGas = 0;
    let appFileDataTips = 0;
    let appNonBundledTxsFound = 0;
    let appBundleSize = 0;
    let appBundleGas = 0;
    let appBundleTips = 0;
    let appTipTxTips = 0;
    let appPlatformTxs = 0;

    //await sendBundlesToGraphite(bundleTxs, end);
    // await sendFileDataSizeOnlyToGraphite(l1Results.fileDataTxs, end);
    appNonBundledTxsFound =
      l1Results.driveTxs.length +
      l1Results.fileDataTxs.length +
      l1Results.fileTxs.length +
      l1Results.folderTxs.length +
      l1Results.tipTxs.length;

    totalNonBundledTxsFound += appNonBundledTxsFound;

    l1Results.bundleTxs.forEach((tx) => {
      totalBundleSize += tx.dataSize;
      totalBundleGas += tx.fee;
      totalBundleTips += tx.quantity;
      appBundleSize += tx.dataSize;
      appBundleGas += tx.fee;
      appBundleTips += tx.quantity;
      foundAddresses.push(tx.owner);
      if (tx.appPlatform !== undefined) {
        appPlatformTxs += 1;
      }
    });

    l1Results.fileDataTxs.forEach((tx) => {
      totalNonBundleSize += tx.dataSize;
      totalNonBundleGas += tx.fee;
      totalFileDataTips += tx.quantity;
      appBundleSize += tx.dataSize;
      appBundleGas += tx.fee;
      appBundleTips += tx.quantity;
      foundAddresses.push(tx.owner);
      if (tx.appPlatform !== undefined) {
        appPlatformTxs += 1;
      }
    });
    l1Results.fileTxs.forEach((tx) => {
      totalNonBundleSize += tx.dataSize;
      totalNonBundleGas += tx.fee;
      appNonBundleSize += tx.dataSize;
      appNonBundleGas += tx.fee;
      foundAddresses.push(tx.owner);
      if (tx.appPlatform !== undefined) {
        appPlatformTxs += 1;
      }
    });
    l1Results.folderTxs.forEach((tx) => {
      totalNonBundleSize += tx.dataSize;
      totalNonBundleGas += tx.fee;
      appNonBundleSize += tx.dataSize;
      appNonBundleGas += tx.fee;
      foundAddresses.push(tx.owner);
    });
    l1Results.driveTxs.forEach((tx) => {
      totalNonBundleSize += tx.dataSize;
      totalNonBundleGas += tx.fee;
      appNonBundleSize += tx.dataSize;
      appNonBundleGas += tx.fee;
      foundAddresses.push(tx.owner);
      if (tx.appPlatform !== undefined) {
        appPlatformTxs += 1;
      }
    });

    l1Results.tipTxs.forEach((tx) => {
      totalTipTxTips += tx.quantity;
      appTipTxTips += tx.quantity;
    });

    console.log(`-----------------------------------------`);
    console.log(`App Bundles found: ${l1Results.bundleTxs.length}`);
    console.log("App Separated Tip Txs Sent: %s", l1Results.tipTxs.length);
    console.log(
      `Total App L1 Transactions: ${
        appNonBundledTxsFound + l1Results.bundleTxs.length
      }`
    );
    console.log("ArFS App Stats");
    console.log(" - FileDataTxs: %s", l1Results.fileDataTxs.length);
    console.log(" - FileTxs: %s", l1Results.fileTxs.length);
    console.log(" - FolderTxs: %s", l1Results.folderTxs.length);
    console.log(" - DriveTxs: %s", l1Results.driveTxs.length);
  });

  console.log(`FINAL RESULTS FOR ${owner}`);
  console.log(`-----------------------------------------`);
  console.log(
    `Non Bundled Data Size (Bytes): ${formatBytes(totalNonBundleSize)}`
  );
  console.log(`Non Bundled Gas Spent (AR): ${totalNonBundleGas}`);
  console.log(`Bundled Tip Amount (AR): ${totalBundleTips}`);
  console.log(`Non Bundled Tip Amount (AR): ${totalFileDataTips}`);
  console.log(`Bundle Data Size (Bytes): ${formatBytes(totalBundleSize)}`);
  console.log(`Bundle Gas Spent (AR): ${totalBundleGas}`);
  console.log(`Non Bundled Txs found: ${totalNonBundledTxsFound}`);
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
  const uniqueUserCount = new Set(foundAddresses).size;
  console.log(`Total Unique Users Found: ${uniqueUserCount}`);
  console.log(`App Platform Txs: ${appPlatformTxs}`);
  console.log(`Separated Tip Amount (AR): ${totalTipTxTips}`);
  console.log(
    "Completed analytics from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );
}

main();
