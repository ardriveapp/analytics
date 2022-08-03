import { formatBytes } from "./common";
import { getAllAppL1Transactions } from "./gql";

async function main() {
  // The end date for the query range
  let end = new Date(); // today
  // The start date for the query range
  let start = new Date(2020, 9, 26); // the beginning history of ardrive

  let appName = "Akord";

  console.log(
    `Getting all ${appName} L1 transactions from ${start.toLocaleString()} to ${end.toLocaleString()}`
  );
  console.log(
    "--------------------------------------------------------------------------------"
  );

  const l1Results = await getAllAppL1Transactions(start, end, appName);
  const totalNonBundledTxsFound = l1Results.fileDataTxs.length;

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

  console.log(`----------------${appName} Results---------------------`);
  console.log(`Bundles found: ${l1Results.bundleTxs.length}`);
  console.log(`Bundle Data Size: ${formatBytes(totalBundleSize)}`);
  console.log(`Bundle Gas Spent (AR): ${totalBundleGas}`);
  console.log(`Non Bundled Txs found: ${totalNonBundledTxsFound}`);
  console.log(`Non Bundled Data Size: ${formatBytes(totalNonBundleSize)}`);
  console.log(`Non Bundled Gas Spent (AR): ${totalNonBundleGas}`);
  console.log(`Bundled Tip Amount (AR): ${totalBundleTips}`);
  console.log(`Non Bundled Tip Amount (AR): ${totalFileDataTips}`);
  console.log(`-------------------------------------------------------`);
  console.log(
    `Total L1 Transactions: ${
      totalNonBundledTxsFound + l1Results.bundleTxs.length
    }`
  );
  console.log(
    `Total L1 Size: ${formatBytes(totalBundleSize + totalNonBundleSize)}`
  );
  console.log(
    `Total L1 Tip Amount (AR): ${totalBundleTips + totalFileDataTips}`
  );
  console.log(`-----------------------------------------`);
}

main();
