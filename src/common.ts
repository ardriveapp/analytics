import axios, { AxiosResponse } from "axios";
import axiosRetry, { exponentialDelay } from "axios-retry";
import {
  getAllBlockDates,
  getBlockTimestamp,
  getCurrentBlockHeight,
  getLatestBlockInfo,
  getWalletBalance,
  /*get_24_hour_ardrive_transactions*/
} from "./arweave";
import {
  getAllCommunityFees,
  getAllDrives,
  getAllTransactions_WithBlocks,
  getMyCommunityFees,
  getUserSize,
  getAllTransactions,
  getSumOfAllCommunityFees,
  getAllArDriveCommunityTokenTransactions,
} from "./gql";
import {
  sendArDriveCommunityFinancesToGraphite,
  sendMessageToGraphite,
} from "./graphite";
import {
  getArDriveCommunityState,
  getTotalTokenCount,
  getWalletArDriveLockedBalance,
  getWalletArDriveUnlockedBalance,
  getTokenHolderCount,
} from "./smartweave";
import {
  Results,
  BlockInfo,
  ArDriveCommunityFee,
  BlockDate,
  SmartweaveTx,
  BundleTx,
  ArFSFileTx,
  ArFSDriveTx,
  ArFSFolderTx,
  ArFSFileDataTx,
  ArFSTipTx,
} from "./types";

export const communityWallets: string[] = [
  "i325n3L2UvgcavEM8UnFfY0OWBiyf2RrbNsLStPI73o", // vested community usage mining
  "-OtTqVqAGqTBzhviZptnUTys7rWenNrnQcjGtvDBDdo", // locked warchest
  "vn6Z31Dy8rV8Ion7MTcPjwhLcEJnAIObHIGDHP8oGDI", // unlocked operations
  "Zznp65qgTIm2QBMjjoEaHKOmQrpTu0tfOcdbkm_qoL4", // vested locked warchest
  "2ZaUGqVCPxst5s0XO933HbZmksnLixpXkt6Sh2re0hg", // unlocked community usage mining
  "FAxDUPlFfJrLDl6BvUlPw3EJOEEeg6WQbhiWidU7ueY", // unlocked team and projects
  "pzH5LB20NhsrPMmvZzTrW-ahbAbIE-TeRzWBVYdArpA", // operational vault
];

export const otherAppWallets: string[] = [
  "OXcT1sVRSA5eGwt2k6Yuz8-3e3g9WJi5uSE99CWqsBs", // bundler node wallet
  "zuPbEeWn8R9d4p-fU5eZjuizPX5WM-5c-7etrjk3U7Q", // akord wallet
];

export const appNames: string[] = [
  "ArDrive-CLI",
  "ArDrive-Desktop",
  "ArDrive-Mobile",
  "ArDrive-Core",
  "ArDrive-Sync",
  "ArDrive-Web"
];

// Pauses application
export async function sleep(ms: number): Promise<number> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    setTimeout(resolve, ms);
  });
}

// Gets all of the ArDrive Community AR token balances and sends their balance to grafana
export async function getArDriveCommunityWalletARBalances() {
  let today = new Date();

  console.log("%s Starting to collect ArDrive Community Balances", today);
  console.log("");

  communityWallets.forEach(async (communityWallet: string) => {
    let communityWalletMessage =
      "ardrive.finances.communitywallets." + communityWallet + ".ar";
    let balance = await getWalletBalance(communityWallet);
    console.log("%s balance is %s", communityWallet, balance);
    await sendMessageToGraphite(communityWalletMessage, balance, today);
  });
}

// Gets all of the ArDrive Community Wallets and lists all token transfers
export async function getArDriveTokenTransfers(
  start: Date,
  end: Date
): Promise<SmartweaveTx[]> {
  console.log(
    "Starting to collect ArDrive Community Token Transfers from %s to %s",
    start,
    end
  );
  console.log("");
  let results: SmartweaveTx[] = [];
  await asyncForEach(communityWallets, async (communityWallet: string) => {
    results = results.concat(
      await getAllArDriveCommunityTokenTransactions(communityWallet, start, end)
    );
  });
  // results = await validateSmartweaveTxs(results);
  return results;
}

// Gets other Wallet's AR token balances and sends their balance to grafana
export async function getOtherWalletARBalances() {
  let today = new Date();

  console.log("%s Starting to collect Other Wallet Balances", today);
  console.log("");

  otherAppWallets.forEach(async (otherAppWallet: string) => {
    let otherWalletMessage =
      "ardrive.finances.otherwallets." + otherAppWallet + ".ar";
    let balance = await getWalletBalance(otherAppWallet);
    console.log("%s balance is %s", otherAppWallet, balance);
    await sendMessageToGraphite(otherWalletMessage, balance, today);
  });
}

// Gets all of the ArDrive Community Wallet balances for the ArDrive token specifically and sends to grafana
export async function getArDriveCommunityWalletArDriveBalances() {
  try {
    const today = new Date();
    const state = await getArDriveCommunityState();

    await getTotalTokenCount(state);
    communityWallets.forEach(async (communityWallet: string) => {
      const lockedBalance = await getWalletArDriveLockedBalance(
        state,
        communityWallet
      );
      const unlockedBalance = await getWalletArDriveUnlockedBalance(
        state,
        communityWallet
      );
      const totalBalance = lockedBalance + unlockedBalance;
      console.log("Total Balance for %s: %s", communityWallet, totalBalance);

      let communityWalletMessage =
        "ardrive.finances.communitywallets." +
        communityWallet +
        ".ardrive.locked";
      await sendMessageToGraphite(communityWalletMessage, lockedBalance, today);

      communityWalletMessage =
        "ardrive.finances.communitywallets." +
        communityWallet +
        ".ardrive.unlocked";
      await sendMessageToGraphite(
        communityWalletMessage,
        unlockedBalance,
        today
      );

      communityWalletMessage =
        "ardrive.finances.communitywallets." +
        communityWallet +
        ".ardrive.total";
      await sendMessageToGraphite(communityWalletMessage, totalBalance, today);
    });
  } catch (err) {
    console.log("Error getting token balances");
  }
}

// Gets all of the community fees for the main ArDrive wallets since the beginning of ArDrive usage
// Writes to graphite/grafana
export async function fullyPopulateArDriveCommunityFinances() {
  let today = new Date();
  const start = new Date(2020, 8, 26); // the beginning history of ardrive

  start.setMinutes(0);
  start.setHours(20);

  console.log("Fully populating all ArDrive Community Finances in Grafana");
  while (start < today) {
    const end = new Date(start);
    end.setDate(start.getDate() + 1); // How far back we should query for data
    console.log("Getting data between %s and %s", start, end);
    let fees = await getArDriveCommunityFinances(start, end);
    fees.forEach(async (fee: ArDriveCommunityFee) => {
      console.log(fee);
      await sendArDriveCommunityFinancesToGraphite(fee);
    });
    start.setDate(start.getDate() + 1); // move on to the next day
  }
}

// Gets all ArDrive Tip transactions for the primary ArDrive Community Wallets between a start and end date
export async function getArDriveCommunityFinances(
  start: Date,
  end: Date
): Promise<ArDriveCommunityFee[]> {
  let communityFees: ArDriveCommunityFee[] = [];

  const vestedCommunityUsageMining =
    "i325n3L2UvgcavEM8UnFfY0OWBiyf2RrbNsLStPI73o";
  communityFees = communityFees.concat(
    await getMyCommunityFees(
      "VestedCommunityDistribution",
      vestedCommunityUsageMining,
      start,
      end
    )
  );

  const lockedWarchest = "-OtTqVqAGqTBzhviZptnUTys7rWenNrnQcjGtvDBDdo";
  communityFees = communityFees.concat(
    await getMyCommunityFees("LockedWarchest", lockedWarchest, start, end)
  );

  const unlockedOperations = "vn6Z31Dy8rV8Ion7MTcPjwhLcEJnAIObHIGDHP8oGDI";
  communityFees = communityFees.concat(
    await getMyCommunityFees(
      "UnlockedOperations",
      unlockedOperations,
      start,
      end
    )
  );

  const vestedLockedWarchest = "Zznp65qgTIm2QBMjjoEaHKOmQrpTu0tfOcdbkm_qoL4";
  communityFees = communityFees.concat(
    await getMyCommunityFees(
      "VestedLockedWarchest",
      vestedLockedWarchest,
      start,
      end
    )
  );

  const unlockedCommunityUsageMining =
    "2ZaUGqVCPxst5s0XO933HbZmksnLixpXkt6Sh2re0hg";
  communityFees = communityFees.concat(
    await getMyCommunityFees(
      "UnlockedCommunityDistribution",
      unlockedCommunityUsageMining,
      start,
      end
    )
  );

  const unlockedTeamAndProjects = "FAxDUPlFfJrLDl6BvUlPw3EJOEEeg6WQbhiWidU7ueY";
  communityFees = communityFees.concat(
    await getMyCommunityFees(
      "UnlockedTeamAndProjects",
      unlockedTeamAndProjects,
      start,
      end
    )
  );

  return communityFees;
}

// Gets all of the ArDrive Community tip transactions for the main wallets and exports to a CSV
export async function exportAllMyCommunityFees(
  name: string,
  friendlyName: string,
  owner: string
) {
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;

  const csvWriter = createCsvWriter({
    path: name,
    header: [
      { id: "owner", title: "OWNER" },
      { id: "recipient", title: "RECIPIENT" },
      { id: "appName", title: "APPNAME" },
      { id: "appVersion", title: "APPVERSION" },
      { id: "tip", title: "TIP" },
      { id: "type", title: "TYPE" },
      { id: "exchangeRate", title: "AR/USD PRICE" },
      { id: "amountAR", title: "AR" },
      { id: "amountUSD", title: "USD" },
      { id: "currentPrice", title: "CURRENT AR/USD PRICE" },
      { id: "costBasis", title: "COST BASIS" },
      { id: "blockHeight", title: "BLOCKHEIGHT" },
      { id: "blockTime", title: "BLOCKTIME" },
      { id: "friendlyDate", title: "FRIENDLYDATE" },
    ],
  });

  const start = new Date(2020, 8, 26); // the beginning history of ardrive
  const end = new Date();
  const allMyFees: ArDriveCommunityFee[] = await getMyCommunityFees(
    friendlyName,
    owner,
    start,
    end
  );
  csvWriter.writeRecords(allMyFees).then(() => {
    console.log("...Done writing all my ArDrive Community Fees");
  });

  let totalARFees = 0;
  allMyFees.forEach((fee: ArDriveCommunityFee) => {
    totalARFees += +fee.amountAR;
  });
  console.log(
    "%s ArDrive Community Fee transactions receieved",
    allMyFees.length
  );
  console.log("%s AR collected", totalARFees);
}

// Gets all of the ArDrive Community tip transactions and exports to a CSV
export async function exportAllCommunityFees(name: string) {
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;

  const csvWriter = createCsvWriter({
    path: name,
    header: [
      { id: "owner", title: "OWNER" },
      { id: "recipient", title: "RECIPIENT" },
      { id: "appName", title: "APPNAME" },
      { id: "appVersion", title: "APPVERSION" },
      { id: "tip", title: "TIP" },
      { id: "type", title: "TYPE" },
      { id: "exchangeRate", title: "AR/USD PRICE" },
      { id: "amountAR", title: "AR" },
      { id: "amountUSD", title: "USD" },
      { id: "currentPrice", title: "CURRENT AR/USD PRICE" },
      { id: "costBasis", title: "COST BASIS" },
      { id: "blockHeight", title: "BLOCKHEIGHT" },
      { id: "blockTime", title: "BLOCKTIME" },
      { id: "friendlyDate", title: "FRIENDLYDATE" },
    ],
  });

  const start = new Date(2020, 8, 26); // the beginning history of ardrive
  const end = new Date();
  const allMyFees: ArDriveCommunityFee[] = await getAllCommunityFees(
    start,
    end
  );
  csvWriter.writeRecords(allMyFees).then(() => {
    console.log("...Done writing all my ArDrive Community Fees");
  });

  let totalARFees = 0;
  allMyFees.forEach((fee: ArDriveCommunityFee) => {
    totalARFees += +fee.amountAR;
  });
  console.log(
    "%s ArDrive Community Fee transactions receieved",
    allMyFees.length
  );
  console.log("%s AR collected", totalARFees);
}

// Gets the date of every block on the arweave network
export async function getBlockDates() {
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;
  const csvWriter = createCsvWriter({
    path: "allBlockDates.csv",
    header: [
      { id: "blockHeight", title: "HEIGHT" },
      { id: "blockTimeStamp", title: "TIMESTAMP" },
      { id: "blockHash", title: "HASH" },
      { id: "friendlyDate", title: "DATE" },
    ],
  });

  const allBlockDates: BlockDate[] = await getAllBlockDates();
  csvWriter.writeRecords(allBlockDates).then(() => {
    console.log("...Done writing all block dates");
  });
}

// Gets a set of metrics for a period of days or hours
// Can optionally use blockEstimate as "true" to use a block height estimator to refine the query further
export async function getAllMetrics(
  start: Date,
  end: Date,
  days?: number,
  hours?: number,
  estimate?: boolean
): Promise<Results> {
  const today = new Date();
  // If our end date is in the future, we set it to the current time to ensure valid results.
  if (end > today) {
    end.setTime(today.getTime());
  }
  console.log(
    "Pulling metrics from %s EST to %s EST",
    start.toLocaleString(),
    end.toLocaleString()
  );

  let totalPrivateDrives = 0;
  let totalPublicDrives = 0;
  console.log("- Getting all data transactions");
  let totalData: any;
  if (estimate === true) {
    totalData = await getAllTransactions_WithBlocks(start, end);
  } else {
    totalData = await getAllTransactions(start, end);
  }

  const totalDataSize = totalData.publicDataSize + totalData.privateDataSize;
  const totalFiles = totalData.publicFiles + totalData.privateFiles;
  totalData.contentTypes?.sort(contentTypeCountCompare);

  console.log("- Getting ArDrive Community fees");
  const totalCommunityFees = await getSumOfAllCommunityFees(start, end);
  const totalMiningFees = totalData.publicArFee + totalData.privateArFee;

  console.log("- Getting all drives");
  const allNewArDrives = await getAllDrives(start, end);
  allNewArDrives.forEach((drive: any) => {
    if (drive.privacy === "private") {
      totalPrivateDrives += 1;
    } else {
      totalPublicDrives += 1;
    }
  });

  // Determine how many drives in this period
  const distinctNewArDriveUsers = [
    ...new Set(allNewArDrives.map((x) => x.address)),
  ];

  // Determine amount of total users
  console.log("- Getting total amount of ArDrive users");
  let allTimeStart = new Date();
  allTimeStart.setDate(end.getDate() - 365);
  const allArDrives = await getAllDrives(allTimeStart, end);
  const distinctArDriveUsers = [...new Set(allArDrives.map((x) => x.address))];

  // filter out low drive sizes
  console.log("- Getting total drive sizes");
  let allOwnerStats: any[] = [];
  await asyncForEach(distinctNewArDriveUsers, async (owner: string) => {
    // Get Drive Size
    let ownerStat = await getUserSize(owner, start, end);
    allOwnerStats.push(ownerStat);
    // else drive is too small and we do not count it
  });
  allOwnerStats.sort(userSizeCompare);

  // Get total number of ArDrive token holders
  console.log("- Getting token holder count");
  const tokenHolders = await getTokenHolderCount();

  console.log("COMPLETED!");

  console.log("  ---------------------------");
  console.log("Total Unique Users Found: ", distinctArDriveUsers.length);
  console.log("Total Token Holders Found:", tokenHolders);
  if (days) {
    console.log("  %s Day(s) -", days);
  } else if (hours) {
    console.log("  %s Hour(s) -", hours);
  }
  console.log("      Total Users:        ", distinctNewArDriveUsers.length);
  console.log("          Real Users      ", Object.keys(allOwnerStats).length);
  console.log("      Total Drives:       ", Object.keys(allNewArDrives).length);
  console.log("          Public:         ", totalPublicDrives);
  console.log("          Private:        ", totalPrivateDrives);
  console.log("      Total Data:         ", formatBytes(totalDataSize));
  console.log(
    "          Public:         ",
    formatBytes(totalData.publicDataSize)
  );
  console.log(
    "          Private:        ",
    formatBytes(totalData.privateDataSize)
  );
  console.log("      Total Files:        ", totalFiles);
  console.log("          Web:            ", totalData.webAppFiles);
  console.log("          Desktop:        ", totalData.desktopAppFiles);
  console.log("          Mobile:         ", totalData.mobileAppFiles);
  console.log("          CLI:            ", totalData.cliAppFiles);
  console.log("          Sync:            ", totalData.syncAppFiles);
  console.log("          Core:           ", totalData.coreAppFiles);
  console.log("          Public:         ", totalData.publicFiles);
  console.log("          Private:        ", totalData.privateFiles);
  console.log("      Total Mining Fees:  ", totalMiningFees.toFixed(5));
  console.log(
    "      Total ArDrive Fees: ",
    totalCommunityFees.totalFees.toFixed(5)
  );
  console.log(
    "          Desktop:        ",
    totalCommunityFees.desktopAppFees.toFixed(5)
  );
  console.log(
    "          Web:            ",
    totalCommunityFees.webAppFees.toFixed(5)
  );
  console.log(
    "          Mobile:         ",
    totalCommunityFees.mobileAppFees.toFixed(5)
  );
  console.log(
    "          CLI:            ",
    totalCommunityFees.cliAppFees.toFixed(5)
  );
  console.log(
    "          Core:           ",
    totalCommunityFees.coreAppFees.toFixed(5)
  );
  console.log("  ---------------------------");

  console.log("Content Types Found %s", totalData.contentTypes?.length);
  console.log(totalData.contentTypes);
  console.log("  ---------------------------");

  let averageUserSize = 0;
  let averageUserFiles = 0;
  allOwnerStats.forEach((ownerStat: any) => {
    averageUserSize += ownerStat.totalDriveSize;
    averageUserFiles += ownerStat.totalDriveTransactions;
  });
  averageUserSize = +averageUserSize / allOwnerStats.length;
  averageUserFiles = +averageUserFiles / allOwnerStats.length;

  console.log("Average User Size %s", formatBytes(averageUserSize));
  console.log("Average User Files Amount %s", averageUserFiles);
  console.log("  ---------------------------");
  console.log("Top 10 Uploaders This Period");
  console.log("Starting: %s", end.toLocaleString());
  console.log("Ending: %s", start.toLocaleString());
  allOwnerStats = allOwnerStats.slice(0, 20);
  allOwnerStats.forEach((ownerStat: any) => {
    console.log("Owner: %s", ownerStat.owner);
    console.log(
      "Size: %s Files: %s",
      formatBytes(ownerStat.totalDriveSize),
      ownerStat.totalDriveTransactions
    );
  });

  // Get latest block details
  let latestBlock: BlockInfo = await getLatestBlockInfo(totalData.lastBlock);

  console.log("Latest block is: %s", totalData.lastBlock);
  console.log("Weave size is: %s", latestBlock.weaveSize);
  console.log("Last block size is: %s", latestBlock.blockSize);
  console.log("Difficulty is: %s", latestBlock.difficulty);
  console.log("  ---------------------------");

  const metrics: Results = {
    startDate: start,
    endDate: end,
    totalArDriveUsers: distinctArDriveUsers.length,
    newArDriveUsers: distinctNewArDriveUsers.length,
    drivesFound: allNewArDrives.length,
    publicDrives: totalPublicDrives,
    privateDrives: totalPrivateDrives,
    totalDataSize,
    privateData: totalData.privateDataSize,
    publicData: totalData.publicDataSize,
    totalFiles,
    webAppFiles: totalData.webAppFiles,
    desktopAppFiles: totalData.desktopAppFiles,
    mobileAppFiles: totalData.mobileAppFiles,
    coreAppFiles: totalData.coreAppFiles,
    arConnectFiles: totalData.arConnectFiles,
    cliAppFiles: totalData.cliAppFiles,
    syncAppFiles: totalData.syncAppFiles,
    privateFiles: totalData.privateFiles,
    publicFiles: totalData.publicFiles,
    totalCommunityFees: +totalCommunityFees.totalFees.toFixed(8),
    totalMiningFees: +totalMiningFees.toFixed(8),
    desktopAppFees: +totalCommunityFees.desktopAppFees.toFixed(8),
    webAppFees: +totalCommunityFees.webAppFees.toFixed(8),
    mobileAppFees: +totalCommunityFees.mobileAppFees.toFixed(8),
    coreAppFees: +totalCommunityFees.coreAppFees.toFixed(8),
    arConnectFees: +totalCommunityFees.arConnectFees.toFixed(8),
    cliAppFees: +totalCommunityFees.cliAppFees.toFixed(8),
    publicArFees: +totalData.publicArFee.toFixed(8),
    privateArFees: +totalData.privateArFee.toFixed(8),
    contentTypes: totalData.contentTypes,
    averageUserSize,
    averageUserFiles,
    blockHeight: totalData.lastBlock,
    weaveSize: latestBlock.weaveSize,
    blockSize: latestBlock.blockSize,
    difficulty: latestBlock.difficulty,
    tokenHolders,
  };

  return metrics;
}

// Asyncronous ForEach function
export const asyncForEach = async (array: any[], callback: any) => {
  for (let index = 0; index < array.length; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await callback(array[index], index, array);
  }
};

// Format byte size to something nicer.  This is minified...
export const formatBytes = (bytes: number) => {
  const marker = 1024; // Change to 1000 if required
  const decimal = 3; // Change as required
  const kiloBytes = marker; // One Kilobyte is 1024 bytes
  const megaBytes = marker * marker; // One MB is 1024 KB
  const gigaBytes = marker * marker * marker; // One GB is 1024 MB
  // const teraBytes = marker * marker * marker * marker; // One TB is 1024 GB

  // return bytes if less than a KB
  if (bytes < kiloBytes) return `${bytes} Bytes`;
  // return KB if less than a MB
  if (bytes < megaBytes) return `${(bytes / kiloBytes).toFixed(decimal)} KB`;
  // return MB if less than a GB
  if (bytes < gigaBytes) return `${(bytes / megaBytes).toFixed(decimal)} MB`;
  // return GB if less than a TB
  return `${(bytes / gigaBytes).toFixed(decimal)} GB`;
};

// Compares two data object sizes
export function dataCompare(a: any, b: any) {
  let comparison = 0;
  if (a.size > b.size) {
    comparison = 1;
  } else if (a.size < b.size) {
    comparison = -1;
  }
  return comparison * -1;
}

// Compares two user object counts
export function userSizeCompare(a: any, b: any) {
  let comparison = 0;
  if (a.totalDriveSize > b.totalDriveSize) {
    comparison = 1;
  } else if (a.totalDriveSize < b.totalDriveSize) {
    comparison = -1;
  }
  return comparison * -1;
}

// Compares two ContentType object counts
export function contentTypeCountCompare(a: any, b: any) {
  let comparison = 0;
  if (a.count > b.count) {
    comparison = 1;
  } else if (a.count < b.count) {
    comparison = -1;
  }
  return comparison * -1;
}

// This method returns count of Unique elements in an array
export function countDistinct(arr: any[], n: number) {
  let hs = new Set();
  for (let i = 0; i < n; i++) {
    // add all the elements to the HashSet
    hs.add(arr[i]);
  }
  // return the size of hashset as
  // it consists of all Unique elements
  return hs.size;
}

// Return the number of blocks to end searching from based on a date
export async function getMaxBlock(end: Date, blocksPerHour?: number): Promise<number> {
  // calculate the no. of days between two dates
  if (!blocksPerHour) {
    blocksPerHour = 30;
  }
  let today = new Date();
  let height = await getCurrentBlockHeight();
  const endDaysDiff = today.getTime() - end.getTime();
  const endHoursDiff = Math.floor(endDaysDiff / (1000 * 3600));
  let maxBlock = height - blocksPerHour * endHoursDiff;
  let timeStamp = await getBlockTimestamp(maxBlock)
  if (end > timeStamp) {
    return await getMaxBlock(end, (blocksPerHour-3))
  } else {
    return maxBlock;
  }
}

// Return the number of blocks to start searching from based on a date
export async function getMinBlock(start: Date): Promise<number> {
  // calculate the no. of days between two dates
  const blocksPerDay = 695;
  let today = new Date();
  let height = await getCurrentBlockHeight();
  let minBlock = height - blocksPerDay; // Search the last min block time by default
  const startDays = today.getTime() - start.getTime();
  const startDaysDiff = Math.floor(startDays / (1000 * 3600 * 24));
  if (startDaysDiff !== 0) {
    minBlock = height - blocksPerDay * startDaysDiff;
  }
  //console.log ("Starting at %s on %s", minBlock, start )
  return minBlock;
}

// Adds an amount of hours to a date
export function addHoursToDate(currentDate: Date, hours: number) {
  const numberOfMlSeconds = currentDate.getTime();
  const addMlSeconds = hours * 60 * 60 * 1000;
  const newDate = new Date(numberOfMlSeconds + addMlSeconds);
  return newDate;
}

export function newBundleTx(): BundleTx {
  let bundle: BundleTx = {
    appName: "",
    appVersion: "",
    dataSize: 0,
    fee: 0,
    quantity: 0,
  };
  return bundle;
}

export function newArFSFileTx(): ArFSFileTx {
  let arFSFileTx: ArFSFileTx = {
    appName: "",
    appVersion: "",
    arfsVersion: "",
    owner: "",
    dataSize: 0,
    dataItemSize: 0,
    private: false,
    fee: 0,
    contentType: "",
    bundledIn: "",
    id: "",
    blockHeight: 0,
    blockTime: 0,
    friendlyDate: "",
  };
  return arFSFileTx;
}

export function newArFSFileDataTx(): ArFSFileDataTx {
  let arFSFileDataTx: ArFSFileDataTx = {
    appName: "",
    appVersion: "",
    owner: "",
    dataSize: 0,
    dataItemSize: 0,
    private: false,
    fee: 0,
    contentType: "",
    bundledIn: "",
    id: "",
    blockHeight: 0,
    blockTime: 0,
    friendlyDate: "",
  };
  return arFSFileDataTx;
}

export function newArFSFolderTx(): ArFSFolderTx {
  let arFSFolderTx: ArFSFolderTx = {
    appName: "",
    appVersion: "",
    arfsVersion: "",
    owner: "",
    dataSize: 0,
    dataItemSize: 0,
    private: false,
    fee: 0,
    contentType: "",
    bundledIn: "",
    id: "",
    blockHeight: 0,
    blockTime: 0,
    friendlyDate: "",
  };
  return arFSFolderTx;
}

export function newArFSDriveTx(): ArFSDriveTx {
  let arFSDriveTx: ArFSDriveTx = {
    appName: "",
    appVersion: "",
    arfsVersion: "",
    owner: "",
    dataSize: 0,
    dataItemSize: 0,
    private: false,
    fee: 0,
    contentType: "",
    bundledIn: "",
    id: "",
    blockHeight: 0,
    blockTime: 0,
    friendlyDate: "",
  };
  return arFSDriveTx;
}

export function newArFSTipTx(): ArFSTipTx {
  let arFSTipTx: ArFSTipTx = {
    appName: "",
    appVersion: "",
    owner: "",
    quantity: 0,
    id: "",
    blockHeight: 0,
    blockTime: 0,
    friendlyDate: "",
  };
  return arFSTipTx;
}

export async function retryFetch(reqURL: string): Promise<AxiosResponse<any>> {
  const axiosInstance = axios.create();
  const maxRetries = 10;
  axiosRetry(axiosInstance, {
    retries: maxRetries,
    retryDelay: (retryNumber) => {
      console.error(
        `Retry attempt ${retryNumber}/${maxRetries} of request to ${reqURL}`
      );
      return exponentialDelay(retryNumber);
    },
  });
  return await axiosInstance.get(reqURL, {
    responseType: "arraybuffer",
  });
}