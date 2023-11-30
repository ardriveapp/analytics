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
  getMinBlock,
  getOtherWalletARBalances,
  loadLatestJsonFile,
  saveDataToJsonFile,
  uploaderAppNames,
} from "./utilities";
import { getAllAppL1Transactions } from "./gql_L1";
import { getAllAppL2Transactions, getAllObservationReports } from "./gql_L2";
import {
  sendBundlesToGraphite,
  sendDriveMetadataToGraphite,
  sendFileDataToGraphite,
  sendFileMetadataToGraphite,
  sendFolderMetadataToGraphite,
  sendMessageToGraphite,
  sendSnapshotMetadataToGraphite,
  sentL1CommunityTipsToGraphite,
} from "./graphite";
import { BlockInfo } from "./types";

// Used for scheduling the jobs
const cron = require("node-cron");

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
  await asyncForEach(uploaderAppNames, async (uploader: string) => {
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

export async function hourlyObservationReportAnalytics() {
  const appName = "AR-IO Observer";
  const totalAddresses: string[] = [];
  let bufferHours = 1; // The amount of hours to buffer to ensure items have been indexed.
  let start = new Date();
  start.setHours(start.getHours() - 1 - bufferHours); // we will only scan for 1 hour of data
  let end = new Date();
  end.setHours(end.getHours() - bufferHours);

  console.log(
    "Hourly Observation Report Analytics.  Getting all AR-IO Observer Stats from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );

  let minBlock = await getMinBlock(start);
  const l2Results = await getAllObservationReports(
    start,
    end,
    appName,
    minBlock
  );

  await sendMessageToGraphite(
    `observer.l2.reports`,
    l2Results.fileDataTxs.length,
    end
  );

  l2Results.fileDataTxs.forEach((tx) => {
    totalAddresses.push(tx.owner);
  });

  const uniqueAppUsers = new Set(totalAddresses).size;

  await sendMessageToGraphite(`observer.l2.uniqueUsers`, uniqueAppUsers, end);

  console.log("Hourly Observation Reports Analytics Completed");
}

export async function hourlyArDriveUsageAnalyticsL1(hours: number) {
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
    await sendSnapshotMetadataToGraphite(message, l1Results.snapshotTxs, end);
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

export async function dailyArDriveUserAnalyticsL1() {
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

  let dailyUploaders: string[] = [];
  await asyncForEach(appNames, async (appName: string) => {
    const l1Results = await getAllAppL1Transactions(start, end, appName);

    dailyUploaders.push(...l1Results.foundUsers);
    const appUniqueUploaders = new Set(l1Results.foundUsers).size;
    console.log(`${appUniqueUploaders} users found for ${appName}`);
    let graphiteMessage = message + appName + "." + daysToQuery;
    await sendMessageToGraphite(graphiteMessage, appUniqueUploaders, end);
  });

  const uniqueDailyUploaderCount = new Set(dailyUploaders).size;
  let graphiteMessage = message + daysToQuery;
  await sendMessageToGraphite(graphiteMessage, uniqueDailyUploaderCount, end);
  console.log(`Unique daily ArDrive users found: ${uniqueDailyUploaderCount}`);

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
    const appUniqueUploaders = new Set(l1Results.foundUsers).size;
    console.log(`${appUniqueUploaders} users found for ${appName}`);
    let graphiteMessage = message + appName + "." + daysToQuery;
    await sendMessageToGraphite(graphiteMessage, appUniqueUploaders, end);
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

export async function dailyArDriveUserAnalyticsL2() {
  const message = "ardrive.users.l2."; // this is where all of the logs will be stored

  // collect unique users that have uploaded data in the previous 24 hours
  let bufferHours = 24; // The amount of hours to buffer to ensure items have been fully indexed.
  let hoursToQuery = 24; // The amount of hours to search for in the period i.e. 12, 24 or other range
  let daysToQuery = hoursToQuery / 24; // users to name this graphite message

  let start = new Date(); // Set to today
  start.setHours(start.getHours() - hoursToQuery - bufferHours);
  let end = new Date();
  end.setHours(end.getHours() - bufferHours);

  console.log(
    "Collecting unique daily ArDrive L2 new users and uploaders from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );

  const loadedData = loadLatestJsonFile();
  let totalUniqueArDriveUsers: string[] =
    loadedData?.totalUniqueArDriveUsers || [];
  let blockHeight: number = loadedData?.lastBlockScanned || 0;
  let lastBlockScanned: number = blockHeight;
  const newDriveCreators: string[] = [];
  let dailyUploaders: string[] = [];

  await asyncForEach(appNames, async (appName: string) => {
    const l2Results = await getAllAppL2Transactions(start, end, appName);
    l2Results.driveTxs.forEach((tx) => {
      if (tx.blockHeight > lastBlockScanned) {
        lastBlockScanned = tx.blockHeight;
      }
      newDriveCreators.push(tx.owner);
    });

    dailyUploaders.push(...l2Results.foundUsers);
    const appUniqueUploaders = new Set(l2Results.foundUsers).size;
    console.log(`${appUniqueUploaders} uploaders found for ${appName}`);
    let graphiteMessage = message + appName + "." + daysToQuery;
    await sendMessageToGraphite(graphiteMessage, appUniqueUploaders, end);
  });

  const uniqueNewDriveCreatorsSet = new Set(newDriveCreators);
  const uniqueNewDriveCreators = [...uniqueNewDriveCreatorsSet];
  console.log(`${uniqueNewDriveCreators.length} new drives created`);

  const oldUserTotalCount = totalUniqueArDriveUsers.length;
  const combinedUsers = totalUniqueArDriveUsers.concat(uniqueNewDriveCreators);
  const combinedUsersSet = new Set(combinedUsers);
  totalUniqueArDriveUsers = [...combinedUsersSet];
  const newUsersAdded = totalUniqueArDriveUsers.length - oldUserTotalCount;
  console.log("New users added: ", newUsersAdded);
  console.log("Total users: ", totalUniqueArDriveUsers.length);
  await sendMessageToGraphite(`${message}.newUsers`, newUsersAdded, end);
  await sendMessageToGraphite(
    `${message}.totalUniqueUsers`,
    totalUniqueArDriveUsers.length,
    end
  );

  const uniqueDailyUploaderCount = new Set(dailyUploaders).size;
  let graphiteMessage = message + daysToQuery;
  await sendMessageToGraphite(graphiteMessage, uniqueDailyUploaderCount, end);
  console.log(`Unique daily ArDrive users found: ${uniqueDailyUploaderCount}`);

  console.log(
    "Completed unique daily user L2 analytics from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );

  const data = {
    lastBlockScanned,
    totalUniqueArDriveUsers,
  };
  const baseFileName = `output_l2`;
  await saveDataToJsonFile(data, baseFileName, lastBlockScanned);
}

export async function hourlyArDriveUsageAnalyticsL2(hours: number) {
  const message = "ardrive.apps.l2."; // this is where all of the logs will be stored
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
    const l2Results = await getAllAppL2Transactions(start, end, appName);
    await sendBundlesToGraphite(message, l2Results.bundleTxs, end);
    await sendFileMetadataToGraphite(message, l2Results.fileTxs, end);
    await sendFileDataToGraphite(message, l2Results.fileDataTxs, end);
    await sendFolderMetadataToGraphite(message, l2Results.folderTxs, end);
    await sendDriveMetadataToGraphite(message, l2Results.driveTxs, end);
    await sendSnapshotMetadataToGraphite(message, l2Results.snapshotTxs, end);
    await sentL1CommunityTipsToGraphite(message, l2Results.tipTxs, end);

    const appAddresses: string[] = [];
    l2Results.bundleTxs.forEach((tx) => {
      totalAddresses.push(tx.owner);
      appAddresses.push(tx.owner);
    });
    l2Results.fileDataTxs.forEach((tx) => {
      totalAddresses.push(tx.owner);
      appAddresses.push(tx.owner);
    });
    l2Results.fileTxs.forEach((tx) => {
      totalAddresses.push(tx.owner);
      appAddresses.push(tx.owner);
    });
    l2Results.folderTxs.forEach((tx) => {
      totalAddresses.push(tx.owner);
      appAddresses.push(tx.owner);
    });
    l2Results.driveTxs.forEach((tx) => {
      totalAddresses.push(tx.owner);
      appAddresses.push(tx.owner);
    });
    const uniqueAppUsers = new Set(appAddresses).size;

    await sendMessageToGraphite(
      `ardrive.users.l2.` + appName,
      uniqueAppUsers,
      end
    );
  });

  const uniqueTotalUsers = new Set(totalAddresses).size;
  await sendMessageToGraphite(`ardrive.users.l2.total`, uniqueTotalUsers, end);
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
  await hourlyArDriveUsageAnalyticsL1(12);
  await hourlyArDriveUsageAnalyticsL2(12);
});

cron.schedule("0 */24 * * *", async function () {
  await dailyArDriveUserAnalyticsL1();
  await dailyArDriveUserAnalyticsL2();
});

cron.schedule("*/2 * * * *", async function () {
  await networkAnalytics();
});

cron.schedule("*/15 * * * *", async function () {
  await getArDriveCommunityWalletARBalances();
  await getOtherWalletARBalances();
});

cron.schedule("*/60 * * * *", async function () {
  await hourlyUploaderUsageAnalytics();
  await hourlyObservationReportAnalytics();
});
