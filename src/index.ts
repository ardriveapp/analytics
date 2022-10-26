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
  uploaders,
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

export async function hourlyUploaderUsageAnalytics() {
  const message = "uploader.l1."; // this is where all of the logs will be stored
  const totalAddresses: string[] = [];
  let bufferHours = 1; // The amount of hours to buffer to ensure items have been indexed.
  let start = new Date();
  start.setHours(start.getHours() - 1 - bufferHours); // we will only scan for 1 hour of data
  let end = new Date();
  end.setHours(end.getHours() - bufferHours);

  console.log(
    "Hourly Uploader Usage Analytics.  Getting all ArDrive App Stats from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );
  await asyncForEach(uploaders, async (uploader: string) => {
    console.log(`...${uploader}`);
    const l1Results = await getAllAppL1Transactions(start, end, uploader);
    await sendBundlesToGraphite(message, l1Results.bundleTxs, end);

    const appAddresses: string[] = [];
    l1Results.bundleTxs.forEach((tx) => {
      totalAddresses.push(tx.owner);
      appAddresses.push(tx.owner);
    });

    const uniqueAppUsers = new Set(appAddresses).size;

    await sendMessageToGraphite(
      `uploader.l1.users.` + uploader, // FIX THE NAME
      uniqueAppUsers,
      end
    );
  });

  const uniqueTotalUsers = new Set(totalAddresses).size;
  await sendMessageToGraphite(`uploader.l1.users.total`, uniqueTotalUsers, end);
  console.log("Hourly Uploader Usage Analytics Completed");
}

export async function dailyArDriveUserAnalytics() {
  const message = "ardrive.users.l1."; // this is where all of the logs will be stored

  // collect unique users that have uploaded data in the previous 24 hours
  let bufferHours = 24; // The amount of hours to buffer to ensure items have been fully indexed.
  let hoursToQuery = 24; // The amount of hours to search for in the period i.e. 12, 24 or other range
  let daysToQuery = hoursToQuery / 24; // users to name this graphite message

  let start = new Date(); // Set to today
  start.setHours(start.getHours() - hoursToQuery - bufferHours);
  let end = new Date();
  end.setHours(end.getHours() - bufferHours);

  console.log(
    "Collecting unique daily ArDrive users from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );

  let dailyWallets: string[] = [];
  await asyncForEach(appNames, async (appName: string) => {
    const l1Results = await getAllAppL1Transactions(start, end, appName);

    dailyWallets.push(...l1Results.foundUsers);
    const appUniqueUsers = new Set(l1Results.foundUsers).size;
    console.log(`${appUniqueUsers} users found for ${appName}`);
    let graphiteMessage = message + appName + "." + daysToQuery;
    await sendMessageToGraphite(graphiteMessage, appUniqueUsers, end);
  });

  const uniqueDailyUserCount = new Set(dailyWallets).size;
  let graphiteMessage = message + daysToQuery;
  await sendMessageToGraphite(graphiteMessage, uniqueDailyUserCount, end);
  console.log(`Unique daily ArDrive users found: ${uniqueDailyUserCount}`);

  console.log(
    "Completed unique daily user analytics from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );

  // collect unique users that have uploaded data in the previous 30 days
  bufferHours = 24; // The amount of hours to buffer to ensure items have been fully indexed.
  hoursToQuery = 24 * 30; // The amount of hours to search for in the period i.e. 12, 24 or other range
  daysToQuery = hoursToQuery / 24; // users to name this graphite message

  start = new Date(); // Set to today
  start.setHours(start.getHours() - hoursToQuery - bufferHours);
  end = new Date();
  end.setHours(end.getHours() - bufferHours);

  console.log(
    "Collecting unique 30 day ArDrive users from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );

  let thirtyDayWallets: string[] = [];
  await asyncForEach(appNames, async (appName: string) => {
    const l1Results = await getAllAppL1Transactions(start, end, appName);

    thirtyDayWallets.push(...l1Results.foundUsers);
    const appUniqueUsers = new Set(l1Results.foundUsers).size;
    console.log(`${appUniqueUsers} users found for ${appName}`);
    let graphiteMessage = message + appName + "." + daysToQuery;
    await sendMessageToGraphite(graphiteMessage, appUniqueUsers, end);
  });

  const unique30DayUserCount = new Set(thirtyDayWallets).size;
  graphiteMessage = message + daysToQuery;
  await sendMessageToGraphite(graphiteMessage, unique30DayUserCount, end);
  console.log(`Unique 30 day ArDrive users found: ${unique30DayUserCount}`);

  console.log(
    "Completed 30 day unique user analytics from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );
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
});

cron.schedule("0 */24 * * *", async function () {
  await dailyArDriveUserAnalytics();
});

cron.schedule("*/2 * * * *", async function () {
  await networkAnalytics();
});

cron.schedule("*/15 * * * *", async function () {
  await getArDriveCommunityWalletARBalances();
  await getOtherWalletARBalances();
  await hourlyUploaderUsageAnalytics();
});
