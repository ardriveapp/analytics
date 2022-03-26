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
import { getAllAppTransactions_DESC } from "./gql";
import {
  sendBundlesToGraphite,
  sendDriveMetadataToGraphite,
  sendFileDataToGraphite,
  sendFileMetadataToGraphite,
  sendFolderMetadataToGraphite,
  sendMessageToGraphite,
  sendv2CommunityTipsToGraphite,
} from "./graphite";
import { BlockInfo } from "./types";

// Used for scheduling the jobs
const cron = require("node-cron");

export async function hourlyArDriveUsageAnalytics(hours: number) {
  let bufferHours = 4; // The amount of hours to buffer to ensure items have been indexed.
  let start = new Date();
  let results;
  start.setHours(start.getHours() - hours - bufferHours);
  let end = new Date();
  end.setHours(start.getHours() - bufferHours);

  console.log(
    "Hourly %s ArDrive Usage Analytics.  Getting all ArDrive App Stats from %s to %s",
    hours,
    start.toLocaleString(),
    end.toLocaleString()
  );
  await asyncForEach(appNames, async (appName: string) => {
    results = await getAllAppTransactions_DESC(start, end, appName, 1);
    await sendBundlesToGraphite(results.bundleTxs, end);
    await sendFileMetadataToGraphite(results.fileTxs, end);
    await sendFileDataToGraphite(results.fileDataTxs, end);
    await sendFolderMetadataToGraphite(results.folderTxs, end);
    await sendDriveMetadataToGraphite(results.driveTxs, end);
    await sendv2CommunityTipsToGraphite(results.tipTxs, end);

    console.log("Results for %s", appName);
    console.log(" - BundledTxs: %s", results.bundleTxs.length);
    console.log(" - FileDataTxs: %s", results.fileDataTxs.length);
    console.log(" - FileTxs: %s", results.fileTxs.length);
    console.log(" - FolderTxs: %s", results.folderTxs.length);
    console.log(" - DriveTxs: %s", results.driveTxs.length);
    console.log(" - V2 Tips: %s", results.tipTxs.length);
  });


  // Determine how many unique new users in this period by checking for drives created, getting user information, and checking full user list
  /*const newUsers: string[] = [
    ...new Set(results.driveTxs.map((item: { owner: string }) => item.owner)),
  ];
  const allTimeStart = new Date(2020, 8, 26); // beginning date for ArDrive transactions
  const allDrives = await getAllDrives_ASC(allTimeStart, start, 1); // We want to get all drive information going up to the most recent period
  const allUsers: string[] = [
    ...new Set(allDrives.map((item: { owner: string }) => item.owner)),
  ]; 

  // need to compare new ardrive users to total ardrive users
  let newUserCount = 0;
  newUsers.forEach((user: string) => {
    newUserCount += allUsers.filter((item) => item === user).length;
  });
  await sendMessageToGraphite("ardrive.users.new", newUserCount, end);
  await sendMessageToGraphite("ardrive.users.total", allUsers.length, end);


  console.log("New Users: %s", newUserCount);
  console.log("All Users: %s", allUsers.length); */
  console.log("Hourly ArDrive Usage Analytics Completed");
}

// Gets non-GQL related data
// Includes Weave height, size, difficulty and last block size
async function networkAnalytics() {
  let today = new Date();

  console.log(
    "%s Network Analytics.  Starting to collect latest block and price info",
    today
  );

  let pendingTxs = await getMempoolSize();
  console.log("Mempool size: %s", pendingTxs.length);
  await sendMessageToGraphite(
    "arweave.mempool.pendingTxs",
    pendingTxs.length,
    today
  );

  let height = await getCurrentBlockHeight();
  console.log("Block Height is: %s", height);

  await sendMessageToGraphite("arweave.blockHeight", +height, today);

  let latestBlock: BlockInfo = await getLatestBlockInfo(height);
  console.log("Transactions Mined: %s", latestBlock.transactionCount);
  await sendMessageToGraphite( "arweave.transactionsMined", latestBlock.transactionCount, today);
  await sendMessageToGraphite(
    "arweave.weaveSize",
    latestBlock.weaveSize,
    today
  );
  console.log("Weave Size: %s", latestBlock.weaveSize);
  await sendMessageToGraphite(
    "arweave.difficulty",
    latestBlock.difficulty,
    today
  );
  console.log("Arweave Difficulty: %s", latestBlock.difficulty);
  await sendMessageToGraphite(
    "arweave.lastBlockSize",
    latestBlock.blockSize,
    today
  );
  console.log("Arweave Last Block Size: %s", latestBlock.blockSize);

  // Include the 15% fee
  const arweavePriceOf1GB = (await getDataPrice(1073741824));
  await sendMessageToGraphite(
    "arweave.price.ar.1gb",
    +arweavePriceOf1GB.toFixed(5),
    today
  );

  const arDrivePriceOf1GB = arweavePriceOf1GB * 1.15
  await sendMessageToGraphite(
    "ardrive.price.ar.1gb",
    +arDrivePriceOf1GB.toFixed(5),
    today
  );

  // Get price of AR in USD
  let arUSDPrice = await getArUSDPrice();

  // Get data prices of different data sizes in AR
  if (arUSDPrice !== 0) {
    console.log("Price of AR is: $%s", arUSDPrice);

    await sendMessageToGraphite("arweave.price.usd", arUSDPrice, today);

    await sendMessageToGraphite(
      "ardrive.price.usd.1gb",
      +arDrivePriceOf1GB.toFixed(5) * arUSDPrice,
      today
    );
  }

  let finished = new Date();
  console.log("%s Finished collecting Network Analytics", finished);
}

console.log("Start ArDrive Analytics Cron Jobs");
console.log("---------------------------------");
/*cron.schedule('0 17 * * *', function(){
    console.log('Running ArDrive Daiy Analytics Every 24 hours at 1pm');
    dailyArDriveUsageAnalytics();
});*/

cron.schedule("0 */12 * * *", function () {
  console.log(
    "Running ArDrive Daiy Analytics and ArDrive Community Wallet Balances (ARDRIVE tokens) Every 12 hours"
  );
  hourlyArDriveUsageAnalytics(12);
  getArDriveCommunityWalletArDriveBalances();
});

cron.schedule("*/2 * * * *", function () {
  console.log(
    "Running ArDrive Block Info and Price Collection Analytics Every 2 minutes"
  );
  networkAnalytics();
});

cron.schedule("*/60 * * * *", function () {
  console.log(
    "Collecting ArDrive Community Wallet Balances (AR tokens) Every 60 minutes"
  );
  getArDriveCommunityWalletARBalances();
  getOtherWalletARBalances();
});
