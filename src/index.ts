import {
  getArUSDPrice,
  getCurrentBlockHeight,
  getDataPrice,
  getLatestBlockInfo,
  getMempoolSize,
} from "./arweave";
import {
  appNames,
  asyncForEach,
  getArDriveCommunityWalletARBalances,
  getArDriveCommunityWalletArDriveBalances,
  getOtherWalletARBalances,
} from "./common";
import { getAllAppL1Transactions } from "./gql";
import {
  sendBundlesToGraphite,
  sendDriveMetadataToGraphite,
  sendFileDataToGraphite,
  sendFileMetadataToGraphite,
  sendFolderMetadataToGraphite,
  sendMessageToGraphite,
  sentL1CommunityTipsToGraphite,
} from "./graphite";
import { BlockInfo } from "./types";

// Used for scheduling the jobs
const cron = require("node-cron");

export async function hourlyArDriveUsageAnalytics(hours: number) {
  const message = "ardrive.apps.l1."; // this is where all of the logs will be stored
  const totalAddresses: string[] = [];
  let bufferHours = 12; // The amount of hours to buffer to ensure items have been indexed.
  let start = new Date();
  start.setHours(start.getHours() - hours - bufferHours);
  let end = new Date();
  end.setHours(end.getHours() - bufferHours);

  console.log(
    "Hourly %s ArDrive Usage Analytics.  Getting all ArDrive App Stats from %s to %s",
    hours,
    start.toLocaleString(),
    end.toLocaleString()
  );
  await asyncForEach(appNames, async (appName: string) => {
    console.log(`...${appName}`);
    const l1Results = await getAllAppL1Transactions(start, end, appName);
    await sendBundlesToGraphite(message, l1Results.bundleTxs, end);
    await sendFileMetadataToGraphite(message, l1Results.fileTxs, end);
    await sendFileDataToGraphite(message, l1Results.fileDataTxs, end);
    await sendFolderMetadataToGraphite(message, l1Results.folderTxs, end);
    await sendDriveMetadataToGraphite(message, l1Results.driveTxs, end);
    await sentL1CommunityTipsToGraphite(message, l1Results.tipTxs, end);

    const appAddresses: string[] = [];
    l1Results.bundleTxs.forEach((tx) => {
      totalAddresses.push(tx.owner);
      appAddresses.push(tx.owner);
    });
    l1Results.fileDataTxs.forEach((tx) => {
      totalAddresses.push(tx.owner);
      appAddresses.push(tx.owner);
    });
    l1Results.fileTxs.forEach((tx) => {
      totalAddresses.push(tx.owner);
      appAddresses.push(tx.owner);
    });
    l1Results.folderTxs.forEach((tx) => {
      totalAddresses.push(tx.owner);
      appAddresses.push(tx.owner);
    });
    l1Results.driveTxs.forEach((tx) => {
      totalAddresses.push(tx.owner);
      appAddresses.push(tx.owner);
    });
    const uniqueAppUsers = new Set(appAddresses).size;

    await sendMessageToGraphite(
      `ardrive.users.l1.` + appName,
      uniqueAppUsers,
      end
    );
  });

  const uniqueTotalUsers = new Set(totalAddresses).size;
  await sendMessageToGraphite(`ardrive.users.l1.total`, uniqueTotalUsers, end);
  console.log("Hourly ArDrive Usage Analytics Completed");
}

export async function dailyArDriveUserAnalytics() {
  const message = "ardrive.apps.l1."; // this is where all of the logs will be stored
  let bufferHours = 12; // The amount of hours to buffer to ensure items have been indexed.
  let captureTime = 12; // The amount of hours to capture per run
  let start = new Date();
  start.setHours(start.getHours() - captureTime - bufferHours);
  let end = new Date();
  end.setHours(end.getHours() - bufferHours);

  console.log(
    "Daily ArDrive User Analytics.  Getting all ArDrive App Stats from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );

  const l1Results = await getAllAppL1Transactions(start, end);
  await sendBundlesToGraphite(message, l1Results.bundleTxs, end);
  await sendFileMetadataToGraphite(message, l1Results.fileTxs, end);
  await sendFileDataToGraphite(message, l1Results.fileDataTxs, end);
  await sendFolderMetadataToGraphite(message, l1Results.folderTxs, end);
  await sendDriveMetadataToGraphite(message, l1Results.driveTxs, end);
  await sentL1CommunityTipsToGraphite(message, l1Results.tipTxs, end);

  const totalAddresses: string[] = [];
  l1Results.bundleTxs.forEach((tx) => {
    totalAddresses.push(tx.owner);
  });
  l1Results.fileDataTxs.forEach((tx) => {
    totalAddresses.push(tx.owner);
  });
  l1Results.fileTxs.forEach((tx) => {
    totalAddresses.push(tx.owner);
  });
  l1Results.folderTxs.forEach((tx) => {
    totalAddresses.push(tx.owner);
  });
  l1Results.driveTxs.forEach((tx) => {
    totalAddresses.push(tx.owner);
  });
  const uniqueUsers = new Set(totalAddresses).size;
  await sendMessageToGraphite(`ardrive.users.l1.uniqueUsers`, uniqueUsers, end);
  console.log("Hourly ArDrive Usage Analytics Completed");
}

// Gets non-GQL related data
// Includes Weave height, size, difficulty and last block size
async function networkAnalytics() {
  let today = new Date();

  //console.log(
  //  "%s Network Analytics.  Starting to collect latest block and price info",
  //  today
  //);

  let pendingTxs = await getMempoolSize();
  //console.log("Mempool size: %s", pendingTxs.length);
  await sendMessageToGraphite(
    "arweave.mempool.pendingTxs",
    pendingTxs.length,
    today
  );

  let height = await getCurrentBlockHeight();
  //console.log("Block Height is: %s", height);

  await sendMessageToGraphite("arweave.blockHeight", +height, today);

  let latestBlock: BlockInfo = await getLatestBlockInfo(height);
  //console.log("Transactions Mined: %s", latestBlock.transactionCount);
  await sendMessageToGraphite(
    "arweave.transactionsMined",
    latestBlock.transactionCount,
    today
  );
  await sendMessageToGraphite(
    "arweave.weaveSize",
    latestBlock.weaveSize,
    today
  );
  //console.log("Weave Size: %s", latestBlock.weaveSize);
  await sendMessageToGraphite(
    "arweave.difficulty",
    latestBlock.difficulty,
    today
  );
  //console.log("Arweave Difficulty: %s", latestBlock.difficulty);
  await sendMessageToGraphite(
    "arweave.lastBlockSize",
    latestBlock.blockSize,
    today
  );
  //console.log("Arweave Last Block Size: %s", latestBlock.blockSize);

  // Include the 15% fee
  const arweavePriceOf1GB = await getDataPrice(1073741824);
  await sendMessageToGraphite(
    "arweave.price.ar.1gb",
    +arweavePriceOf1GB.toFixed(5),
    today
  );

  const arDrivePriceOf1GB = arweavePriceOf1GB * 1.15;
  await sendMessageToGraphite(
    "ardrive.price.ar.1gb",
    +arDrivePriceOf1GB.toFixed(5),
    today
  );

  // Get price of AR in USD
  let arUSDPrice = await getArUSDPrice();

  // Get data prices of different data sizes in AR
  if (arUSDPrice !== 0) {
    // console.log("Price of AR is: $%s", arUSDPrice);

    await sendMessageToGraphite("arweave.price.usd", arUSDPrice, today);

    await sendMessageToGraphite(
      "ardrive.price.usd.1gb",
      +arDrivePriceOf1GB.toFixed(5) * arUSDPrice,
      today
    );
  }

  let finished = new Date();
  console.log(
    "%s - %s Finished collecting Network Analytics",
    height,
    finished
  );
}

console.log("Start ArDrive Analytics Cron Jobs");
console.log("---------------------------------");
cron.schedule("0 */12 * * *", async function () {
  await hourlyArDriveUsageAnalytics(12);
  await getArDriveCommunityWalletArDriveBalances();
});

cron.schedule("*/2 * * * *", async function () {
  await networkAnalytics();
});

cron.schedule("*/60 * * * *", async function () {
  await getArDriveCommunityWalletARBalances();
  await getOtherWalletARBalances();
});
