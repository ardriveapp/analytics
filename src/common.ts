import {
    getAllArDrives, 
    getAllBlockDates, 
    getLatestBlockInfo, 
    getMyTotalArDriveCommunityFees, 
    getTokenHolderCount, 
    getTotalArDriveCommunityFees, 
    getTotalBundledDataTransactionsSize, 
    getTotalDataTransactionsSize, 
    getTotalDataTransactionsSize_WithBlocks, 
    getTotalDriveSize,
    getWalletBalance, 
    /*get_24_hour_ardrive_transactions*/ 
} from './arweave'
import { getArDriveCommunityState, getTotalTokenCount, getWalletArDriveLockedBalance, getWalletArDriveUnlockedBalance } from './smartweave';
import { Results, ContentType, BlockInfo, ArDriveCommunityFee, BlockDate } from './types';

export const communityWallets : string[] = [
  'i325n3L2UvgcavEM8UnFfY0OWBiyf2RrbNsLStPI73o', // vested community usage mining 
  '-OtTqVqAGqTBzhviZptnUTys7rWenNrnQcjGtvDBDdo', // locked warchest
  'vn6Z31Dy8rV8Ion7MTcPjwhLcEJnAIObHIGDHP8oGDI', // unlocked operations
  'Zznp65qgTIm2QBMjjoEaHKOmQrpTu0tfOcdbkm_qoL4', // vested locked warchest
  '2ZaUGqVCPxst5s0XO933HbZmksnLixpXkt6Sh2re0hg', // unlocked community usage mining
  'FAxDUPlFfJrLDl6BvUlPw3EJOEEeg6WQbhiWidU7ueY', // unlocked team and projects
  'pzH5LB20NhsrPMmvZzTrW-ahbAbIE-TeRzWBVYdArpA' // operational vault
];

// Pauses application
export async function sleep(ms: number): Promise<number> {
	return new Promise((resolve) => {
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		setTimeout(resolve, ms);
	});
}

export async function sendResultsToGraphite (results: Results) {

    const today = results.endDate;

    await sendMessageToGraphite('ardrive.users.total', results.totalArDriveUsers, today);
    await sendMessageToGraphite('ardrive.users.new', results.newArDriveUsers, today);
    await sendMessageToGraphite('ardrive.users.averageUserSize', results.averageUserSize, today);
    await sendMessageToGraphite('ardrive.users.averageUserFiles', results.averageUserFiles, today);
    await sendMessageToGraphite('ardrive.drives.total', results.drivesFound, today);
    await sendMessageToGraphite('ardrive.drives.public', results.publicDrives, today);
    await sendMessageToGraphite('ardrive.drives.private', results.privateDrives, today);
    await sendMessageToGraphite('ardrive.bundledData.total', results.totalBundledData, today);
    await sendMessageToGraphite('ardrive.bundledData.desktop', results.totalDesktopBundledData, today);
    await sendMessageToGraphite('ardrive.bundledData.webapp', results.totalWebAppBundledData, today);
    await sendMessageToGraphite('ardrive.v2Data.total', results.totalDataSize, today);
    await sendMessageToGraphite('ardrive.v2Data.public', results.publicData, today);
    await sendMessageToGraphite('ardrive.v2Data.private', results.privateData, today);
    await sendMessageToGraphite('ardrive.files.total', results.totalFiles, today);
    await sendMessageToGraphite('ardrive.files.web', results.webAppFiles, today);
    await sendMessageToGraphite('ardrive.files.desktop', results.desktopFiles, today);
    await sendMessageToGraphite('ardrive.files.public', results.publicFiles, today);
    await sendMessageToGraphite('ardrive.files.private', results.privateFiles, today);
    await sendMessageToGraphite('ardrive.fees.community', results.totalCommunityFees, today);
    await sendMessageToGraphite('ardrive.fees.mining', results.totalMiningFees, today);
    await sendMessageToGraphite('ardrive.fees.desktop', results.desktopFees, today);
    await sendMessageToGraphite('ardrive.fees.webapp', results.webAppFees, today);
    await sendMessageToGraphite('ardrive.fees.public', results.publicArFees, today);
    await sendMessageToGraphite('ardrive.fees.private', results.privateArFees, today);
    await sendMessageToGraphite('ardrive.community.tokenHolders', results.tokenHolders, today);
    await sendMessageToGraphite('arweave.blockHeight', results.blockHeight, today);
    await sendMessageToGraphite('arweave.weaveSize', results.weaveSize, today);
    await sendMessageToGraphite('arweave.difficuty', results.weaveSize, today);
    
    if (results.contentTypes !== undefined) {
        await asyncForEach (results.contentTypes, async (contentType: ContentType) => {
            let contentTypeGraphiteMessage = 'ardrive.contenttypes.';
            contentTypeGraphiteMessage = contentTypeGraphiteMessage.concat(contentType.contentType)
            await sendMessageToGraphite(contentTypeGraphiteMessage, contentType.count, today);
        })
    }

    return "Success";
}

// Takes the ardrive community fees and exports to graphite/grafana dashboard, using friendly name for the grouping
export async function sendArDriveCommunityFinancesToGraphite (communityFee: ArDriveCommunityFee) {
  try {
    const date = new Date(communityFee.blockTime * 1000);
    let arDriveFinancesMessage = 'ardrive.finances.' + communityFee.friendlyName + '.';

    let graphiteMessage = arDriveFinancesMessage + 'amount.ar';
    await sendMessageToGraphite(graphiteMessage, communityFee.amountAR, date);

    graphiteMessage = arDriveFinancesMessage + 'amount.usd';
    await sendMessageToGraphite(graphiteMessage, communityFee.amountUSD, date);

    graphiteMessage = arDriveFinancesMessage + 'tipType.' + communityFee.tip + '.';
    await sendMessageToGraphite(graphiteMessage, 1, date);

  } catch (err) {
    console.log (err);
    console.log ("Error sending community fees to graphite")
  }
  return "Success";
}


// Gets all of the ArDrive Community AR token balances and sends their balance to grafana
export async function getArDriveCommunityWalletARBalances () {
  let today = new Date();

  console.log ("%s Starting to collect ArDrive Community Balances", today)
  console.log ("")

  communityWallets.forEach(async (communityWallet: string) => {
    let communityWalletMessage = 'ardrive.finances.communitywallets.ar.' + communityWallet
    let balance = await getWalletBalance(communityWallet);
    console.log ("%s balance is %s", communityWallet, balance)
    await sendMessageToGraphite(communityWalletMessage, balance, today);
  });
}

// Gets all of the ArDrive Community Wallet balances for the ArDrive token specifically and sends to grafana
export async function getArDriveCommunityWalletArDriveBalances () {
  try {
    const today = new Date();
    const state = await getArDriveCommunityState();

    await getTotalTokenCount(state);
    communityWallets.forEach(async (communityWallet: string) => {
        const lockedBalance = await getWalletArDriveLockedBalance(state, communityWallet)
        const unlockedBalance = await getWalletArDriveUnlockedBalance(state, communityWallet)
        const totalBalance = lockedBalance + unlockedBalance;
        console.log ("Total Balance for %s: %s", communityWallet, totalBalance)

        let communityWalletMessage = 'ardrive.finances.communitywallets.' + communityWallet + '.ardrive.locked'
        await sendMessageToGraphite(communityWalletMessage, lockedBalance, today);

        communityWalletMessage = 'ardrive.finances.communitywallets.' + communityWallet + '.ardrive.unlocked'
        await sendMessageToGraphite(communityWalletMessage, unlockedBalance, today);

        communityWalletMessage = 'ardrive.finances.communitywallets.' + communityWallet + '.ardrive.total'
        await sendMessageToGraphite(communityWalletMessage, totalBalance, today);
    });
  } catch (err) {
      console.log ("Error getting token balances")
  }
}

// Gets all of the community fees for the main ArDrive wallets since the beginning of ArDrive usage
// Writes to graphite/grafana
export async function fullyPopulateArDriveCommunityFinances() {
  let today = new Date();
  const start = new Date(2020, 8, 26) // the beginning history of ardrive

  start.setMinutes(0);
  start.setHours(20);

  console.log ("Fully populating all ArDrive Community Finances in Grafana")
  while (start < today) {
      const end = new Date(start)
      end.setDate(start.getDate() + 1); // How far back we should query for data
      console.log ("Getting data between %s and %s", start, end);
      let fees = await getArDriveCommunityFinances(start, end);
      fees.forEach(async (fee: ArDriveCommunityFee) => {
        console.log (fee)
        await sendArDriveCommunityFinancesToGraphite(fee);
      })
      start.setDate(start.getDate() + 1); // move on to the next day
  }
}

// Gets all ArDrive Tip transactions for the primary ArDrive Community Wallets between a start and end date
export async function getArDriveCommunityFinances (start: Date, end: Date): Promise<ArDriveCommunityFee[]> {

  let communityFees: ArDriveCommunityFee[] = [];

  const vestedCommunityUsageMining = 'i325n3L2UvgcavEM8UnFfY0OWBiyf2RrbNsLStPI73o';
  communityFees = communityFees.concat(await getMyTotalArDriveCommunityFees('VestedCommunityDistribution', vestedCommunityUsageMining, start, end));

  const lockedWarchest = '-OtTqVqAGqTBzhviZptnUTys7rWenNrnQcjGtvDBDdo';
  communityFees = communityFees.concat(await getMyTotalArDriveCommunityFees('LockedWarchest', lockedWarchest, start, end));

  const unlockedOperations = 'vn6Z31Dy8rV8Ion7MTcPjwhLcEJnAIObHIGDHP8oGDI';
  communityFees = communityFees.concat(await getMyTotalArDriveCommunityFees('UnlockedOperations', unlockedOperations, start, end));

  const vestedLockedWarchest = 'Zznp65qgTIm2QBMjjoEaHKOmQrpTu0tfOcdbkm_qoL4';
  communityFees = await getMyTotalArDriveCommunityFees('VestedLockedWarchest', vestedLockedWarchest, start, end)

  const unlockedCommunityUsageMining = '2ZaUGqVCPxst5s0XO933HbZmksnLixpXkt6Sh2re0hg';
  communityFees = communityFees.concat(await getMyTotalArDriveCommunityFees('UnlockedCommunityDistribution', unlockedCommunityUsageMining, start, end));

  const unlockedTeamAndProjects = 'FAxDUPlFfJrLDl6BvUlPw3EJOEEeg6WQbhiWidU7ueY'
  communityFees = communityFees.concat(await getMyTotalArDriveCommunityFees('UnlockedTeamAndProjects', unlockedTeamAndProjects, start, end));

  return communityFees;

}

// Gets all of the ArDrive Community tip transactions for the main wallets and exports to a CSV
export async function exportAllMyCommunityFees (name: string, friendlyName: string, owner: string) {
  const createCsvWriter = require('csv-writer').createObjectCsvWriter;

  const csvWriter = createCsvWriter({
      path: name,
      header: [
          {id: 'owner', title: 'OWNER'},
          {id: 'appName', title: 'APPNAME'},
          {id: 'appVersion', title: 'APPVERSION'},
          {id: 'tip', title: 'TIP'},
          {id: 'type', title: 'TYPE'},
          {id: 'exchangeRate', title: 'AR/USD PRICE'},
          {id: 'amountAR', title: 'AR'},
          {id: 'amountUSD', title: 'USD'},
          {id: 'currentPrice', title: 'CURRENT AR/USD PRICE'},
          {id: 'costBasis', title: 'COST BASIS'},
          {id: 'blockHeight', title: 'BLOCKHEIGHT'},
          {id: 'blockTime', title: 'BLOCKTIME'},
          {id: 'friendlyDate', title: 'FRIENDLYDATE'},
      ]
  });
  
  const start = new Date(2020, 8, 26) // the beginning history of ardrive
  const end = new Date()
  const allMyFees: ArDriveCommunityFee[] = await getMyTotalArDriveCommunityFees(friendlyName, owner, start, end)
  csvWriter.writeRecords(allMyFees)
  .then(() => {
      console.log('...Done writing all my ArDrive Community Fees');
  });

  let totalARFees = 0;
  allMyFees.forEach((fee: ArDriveCommunityFee) => {
      totalARFees += +fee.amountAR
  });
  console.log ("%s ArDrive Community Fee transactions receieved", allMyFees.length);
  console.log ("%s AR collected", totalARFees);
}

// Gets the date of every block on the arweave network
export async function getBlockDates() {
  const createCsvWriter = require('csv-writer').createObjectCsvWriter;
  const csvWriter = createCsvWriter({
      path: 'allBlockDates.csv',
      header: [
          {id: 'blockHeight', title: 'HEIGHT'},
          {id: 'blockTimeStamp', title: 'TIMESTAMP'},
          {id: 'blockHash', title: 'HASH'},
          {id: 'friendlyDate', title: 'DATE'},
      ]
  });

  const allBlockDates: BlockDate[] = await getAllBlockDates()
  csvWriter.writeRecords(allBlockDates)
  .then(() => {
      console.log('...Done writing all block dates');
  });
}

// Gets a set of metrics for a period of days or hours
export async function getMetrics (start: Date, end: Date, days?: number, hours?: number) : Promise<Results> {
    const today = new Date()
    // If our end date is in the future, we set it to the current time to ensure valid results.
    if (end.getTime() > today.getTime()) {
      end.setTime(today.getTime());
    }

    console.log ("Pulling metrics from %s EST to %s EST", start.toLocaleString(), end.toLocaleString());

    let totalPrivateDrives = 0;
    let totalPublicDrives = 0;
    console.log ("- Getting all data transactions");
    const totalData = await getTotalDataTransactionsSize(start, end)
    const totalDataSize = totalData.publicDataSize + totalData.privateDataSize;
    const totalFiles = totalData.publicFiles + totalData.privateFiles;
    totalData.contentTypes?.sort(contentTypeCountCompare)
    console.log ("- Getting all bundled data transactions");
    const totalBundledData = await getTotalBundledDataTransactionsSize(start, end)
    console.log ("- Getting ArDrive Community fees");
    const totalCommunityFees = await getTotalArDriveCommunityFees(start, end)
    const totalMiningFees = totalData.publicArFee + totalData.privateArFee;

    console.log ("- Getting all drives");
    const allNewArDrives = await getAllArDrives(start, end)
    allNewArDrives.forEach((drive: any) => {
        if (drive.privacy === 'private') {
            totalPrivateDrives += 1;
        }
        else {
            totalPublicDrives += 1;
        }
    })

    // Determine how many drives in this period
    const distinctNewArDriveUsers = [...new Set(allNewArDrives.map(x => x.address))];

    // Determine amount of total users
    console.log ("- Getting total amount of ArDrive users");
    let allTimeStart = new Date();
    allTimeStart.setDate(end.getDate() - 365);
    const allArDrives = await getAllArDrives(allTimeStart, end)
    const distinctArDriveUsers = [...new Set(allArDrives.map(x => x.address))]

    // filter out low drive sizes
    console.log ("- Getting total drive sizes");
    let allOwnerStats : any[] = [];
    await asyncForEach (distinctNewArDriveUsers, async (owner: string) => {
        // Get Drive Size
        let ownerStat = await getTotalDriveSize(owner, start, end)
        allOwnerStats.push(ownerStat)
        // else drive is too small and we do not count it
    })
    allOwnerStats.sort(userSizeCompare);

    // Get total number of ArDrive token holders
    console.log ("- Getting token holder count");
    const tokenHolders = await getTokenHolderCount();

    console.log ("COMPLETED!");

    console.log ('  ---------------------------');
    console.log ("Total Unique Users Found: ", distinctArDriveUsers.length);
    console.log ("Total Token Holders Found:", tokenHolders);
    if (days) {
      console.log ('  %s Day(s) -', days);
    } else if (hours) {
      console.log ('  %s Hour(s) -', hours);
    }
    console.log ("      Total Users:        ", distinctNewArDriveUsers.length);
    console.log ("          Real Users      ", Object.keys(allOwnerStats).length);
    console.log ('      Total Drives:       ', Object.keys(allNewArDrives).length);
    console.log ('          Public:         ', totalPublicDrives);
    console.log ('          Private:        ', totalPrivateDrives);
    console.log ('      Total BundledData:  ', formatBytes(totalBundledData.bundledDataSize));
    console.log ('      Total Data:         ', formatBytes(totalDataSize));
    console.log ('          Public:         ', formatBytes(totalData.publicDataSize));
    console.log ('          Private:        ', formatBytes(totalData.privateDataSize));
    console.log ('      Total Files:        ', totalFiles);
    console.log ('          Web:            ', totalData.webAppFiles);
    console.log ('          Desktop:        ', totalData.desktopFiles);
    console.log ('          Public:         ', totalData.publicFiles);
    console.log ('          Private:        ', totalData.privateFiles);
    console.log ('      Total Mining Fees:  ', totalMiningFees.toFixed(5));
    console.log ('      Total ArDrive Fees: ', totalCommunityFees.totalFees.toFixed(5));
    console.log ('          Desktop:        ', totalCommunityFees.desktopFees.toFixed(5));
    console.log ('          WebApp:         ', totalCommunityFees.webAppFees.toFixed(5));
    console.log ('  ---------------------------')

    console.log ("Content Types Found %s", totalData.contentTypes?.length);
    console.log (totalData.contentTypes);
    console.log ('  ---------------------------');

    let averageUserSize = 0;
    let averageUserFiles = 0;
    allOwnerStats.forEach((ownerStat: any) => {
        averageUserSize += ownerStat.totalDriveSize;
        averageUserFiles += ownerStat.totalDriveTransactions;
    })
    averageUserSize = +averageUserSize / allOwnerStats.length ;
    averageUserFiles = +averageUserFiles / allOwnerStats.length;

    console.log ("Average User Upload Size %s", formatBytes(averageUserSize));
    console.log ("Average User Files %s", averageUserFiles);
    console.log ('  ---------------------------');
    console.log ("Top 10 Uploaders This Period");
    console.log ("Starting: %s", end.toLocaleString());
    console.log ("Ending: %s", start.toLocaleString());
    allOwnerStats = allOwnerStats.slice(0, 20);
    allOwnerStats.forEach((ownerStat: any) => {
        console.log ("Owner: %s", ownerStat.owner);
        console.log ("Size: %s Files: %s", formatBytes(ownerStat.totalDriveSize), ownerStat.totalDriveTransactions);
    })
    
    // Get latest block details 
    let latestBlock : BlockInfo = await getLatestBlockInfo(totalData.lastBlock)  ;
    
    console.log ("Latest block is: %s", totalData.lastBlock);
    console.log ("Weave size is: %s", latestBlock.weaveSize);
    console.log ("Last block size is: %s", latestBlock.blockSize);
    console.log ("Difficulty is: %s", latestBlock.difficulty);
    console.log ('  ---------------------------');

    const metrics : Results = {
        startDate: start,
        endDate: end,
        totalArDriveUsers: distinctArDriveUsers.length,
        newArDriveUsers: distinctNewArDriveUsers.length,
        drivesFound: allNewArDrives.length,
        publicDrives: totalPublicDrives,
        privateDrives: totalPrivateDrives,
        totalDataSize,
        totalBundledData: totalBundledData.bundledDataSize,
        totalWebAppBundledData: totalBundledData.webAppDataSize,
        totalDesktopBundledData: totalBundledData.desktopDataSize,
        privateData: totalData.privateDataSize,
        publicData: totalData.publicDataSize,
        totalFiles,
        webAppFiles: totalData.webAppFiles,
        desktopFiles: totalData.desktopFiles,
        privateFiles: totalData.privateFiles,
        publicFiles: totalData.publicFiles,
        totalCommunityFees: +totalCommunityFees.totalFees.toFixed(8),
        totalMiningFees: +totalMiningFees.toFixed(8),
        desktopFees: +totalCommunityFees.desktopFees.toFixed(8),
        webAppFees: +totalCommunityFees.webAppFees.toFixed(8),
        publicArFees: +totalData.publicArFee.toFixed(8),
        privateArFees: +totalData.privateArFee.toFixed(8),
        contentTypes: totalData.contentTypes,
        averageUserSize,
        averageUserFiles,
        blockHeight: totalData.lastBlock,
        weaveSize: latestBlock.weaveSize,
        blockSize: latestBlock.blockSize,
        difficulty: latestBlock.difficulty,
        tokenHolders
    };

    return metrics;
}

// Gets a set of metrics for a period of days or hours
export async function getAllMetrics (start: Date, end: Date, days?: number, hours?: number) : Promise<Results> {
  const today = new Date()
  // If our end date is in the future, we set it to the current time to ensure valid results.
  if (end > today) {
    end.setTime(today.getTime());
  }
  console.log ("Pulling metrics from %s EST to %s EST", start.toLocaleString(), end.toLocaleString());

  let totalPrivateDrives = 0;
  let totalPublicDrives = 0;
  console.log ("- Getting all data transactions");
  const totalData = await getTotalDataTransactionsSize_WithBlocks(start, end)
  const totalDataSize = totalData.publicDataSize + totalData.privateDataSize;
  const totalFiles = totalData.publicFiles + totalData.privateFiles;
  totalData.contentTypes?.sort(contentTypeCountCompare)
  console.log ("- Getting all bundled data transactions");
  const totalBundledData = await getTotalBundledDataTransactionsSize(start, end)
  console.log ("- Getting ArDrive Community fees");
  const totalCommunityFees = await getTotalArDriveCommunityFees(start, end)
  const totalMiningFees = totalData.publicArFee + totalData.privateArFee;

  console.log ("- Getting all drives");
  const allNewArDrives = await getAllArDrives(start, end)
  allNewArDrives.forEach((drive: any) => {
      if (drive.privacy === 'private') {
          totalPrivateDrives += 1;
      }
      else {
          totalPublicDrives += 1;
      }
  })

  // Determine how many drives in this period
  const distinctNewArDriveUsers = [...new Set(allNewArDrives.map(x => x.address))];

  // Determine amount of total users
  console.log ("- Getting total amount of ArDrive users");
  let allTimeStart = new Date();
  allTimeStart.setDate(end.getDate() - 365);
  const allArDrives = await getAllArDrives(allTimeStart, end)
  const distinctArDriveUsers = [...new Set(allArDrives.map(x => x.address))]

  // filter out low drive sizes
  console.log ("- Getting total drive sizes");
  let allOwnerStats : any[] = [];
  await asyncForEach (distinctNewArDriveUsers, async (owner: string) => {
      // Get Drive Size
      let ownerStat = await getTotalDriveSize(owner, start, end)
      allOwnerStats.push(ownerStat)
      // else drive is too small and we do not count it
  })
  allOwnerStats.sort(userSizeCompare);

  // Get total number of ArDrive token holders
  console.log ("- Getting token holder count");
  const tokenHolders = await getTokenHolderCount();

  console.log ("COMPLETED!");

  console.log ('  ---------------------------');
  console.log ("Total Unique Users Found: ", distinctArDriveUsers.length);
  console.log ("Total Token Holders Found:", tokenHolders);
  if (days) {
    console.log ('  %s Day(s) -', days);
  } else if (hours) {
    console.log ('  %s Hour(s) -', hours);
  }
  console.log ("      Total Users:        ", distinctNewArDriveUsers.length);
  console.log ("          Real Users      ", Object.keys(allOwnerStats).length);
  console.log ('      Total Drives:       ', Object.keys(allNewArDrives).length);
  console.log ('          Public:         ', totalPublicDrives);
  console.log ('          Private:        ', totalPrivateDrives);
  console.log ('      Total BundledData:  ', formatBytes(totalBundledData.bundledDataSize));
  console.log ('      Total Data:         ', formatBytes(totalDataSize));
  console.log ('          Public:         ', formatBytes(totalData.publicDataSize));
  console.log ('          Private:        ', formatBytes(totalData.privateDataSize));
  console.log ('      Total Files:        ', totalFiles);
  console.log ('          Web:            ', totalData.webAppFiles);
  console.log ('          Desktop:        ', totalData.desktopFiles);
  console.log ('          Public:         ', totalData.publicFiles);
  console.log ('          Private:        ', totalData.privateFiles);
  console.log ('      Total Mining Fees:  ', totalMiningFees.toFixed(5));
  console.log ('      Total ArDrive Fees: ', totalCommunityFees.totalFees.toFixed(5));
  console.log ('          Desktop:        ', totalCommunityFees.desktopFees.toFixed(5));
  console.log ('          WebApp:         ', totalCommunityFees.webAppFees.toFixed(5));
  console.log ('  ---------------------------')

  console.log ("Content Types Found %s", totalData.contentTypes?.length);
  console.log (totalData.contentTypes);
  console.log ('  ---------------------------');

  let averageUserSize = 0;
  let averageUserFiles = 0;
  allOwnerStats.forEach((ownerStat: any) => {
      averageUserSize += ownerStat.totalDriveSize;
      averageUserFiles += ownerStat.totalDriveTransactions;
  })
  averageUserSize = +averageUserSize / allOwnerStats.length ;
  averageUserFiles = +averageUserFiles / allOwnerStats.length;

  console.log ("Average User Size %s", formatBytes(averageUserSize));
  console.log ("Average User Files Amount %s", averageUserFiles);
  console.log ('  ---------------------------');
  console.log ("Top 10 Uploaders This Period");
  console.log ("Starting: %s", end.toLocaleString());
  console.log ("Ending: %s", start.toLocaleString());
  allOwnerStats = allOwnerStats.slice(0, 20);
  allOwnerStats.forEach((ownerStat: any) => {
      console.log ("Owner: %s", ownerStat.owner);
      console.log ("Size: %s Files: %s", formatBytes(ownerStat.totalDriveSize), ownerStat.totalDriveTransactions);
  })
  
  // Get latest block details 
  let latestBlock : BlockInfo = await getLatestBlockInfo(totalData.lastBlock)  ;
  
  console.log ("Latest block is: %s", totalData.lastBlock);
  console.log ("Weave size is: %s", latestBlock.weaveSize);
  console.log ("Last block size is: %s", latestBlock.blockSize);
  console.log ("Difficulty is: %s", latestBlock.difficulty);
  console.log ('  ---------------------------');

  const metrics : Results = {
      startDate: start,
      endDate: end,
      totalArDriveUsers: distinctArDriveUsers.length,
      newArDriveUsers: distinctNewArDriveUsers.length,
      drivesFound: allNewArDrives.length,
      publicDrives: totalPublicDrives,
      privateDrives: totalPrivateDrives,
      totalDataSize,
      totalBundledData: totalBundledData.bundledDataSize,
      totalWebAppBundledData: totalBundledData.webAppDataSize,
      totalDesktopBundledData: totalBundledData.desktopDataSize,
      privateData: totalData.privateDataSize,
      publicData: totalData.publicDataSize,
      totalFiles,
      webAppFiles: totalData.webAppFiles,
      desktopFiles: totalData.desktopFiles,
      privateFiles: totalData.privateFiles,
      publicFiles: totalData.publicFiles,
      totalCommunityFees: +totalCommunityFees.totalFees.toFixed(8),
      totalMiningFees: +totalMiningFees.toFixed(8),
      desktopFees: +totalCommunityFees.desktopFees.toFixed(8),
      webAppFees: +totalCommunityFees.webAppFees.toFixed(8),
      publicArFees: +totalData.publicArFee.toFixed(8),
      privateArFees: +totalData.privateArFee.toFixed(8),
      contentTypes: totalData.contentTypes,
      averageUserSize,
      averageUserFiles,
      blockHeight: totalData.lastBlock,
      weaveSize: latestBlock.weaveSize,
      blockSize: latestBlock.blockSize,
      difficulty: latestBlock.difficulty,
      tokenHolders
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
  
// Sends a message to the ardrive graphite server
export const sendMessageToGraphite = async (path: string, value: number, timeStamp: Date) => {
  try {
    const message = path + " " + value.toString() + " " + (Math.floor(timeStamp.getTime()/1000)) + '\n';
    let net = require('net');
    let socket = new net.createConnection(2003, 'stats.ardrive.io', function() {
        socket.write(message)
        socket.end('completed!')
    });
    socket.on('error', async function() {
      console.log ('Connection error')
      socket.end('completed!')
      await sleep (5000);
      await sendMessageToGraphite(path, value, timeStamp)
    })
  } catch (err) {
    console.log (err)
    console.log ("Error sending message to graphite")
  }

}

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
    if (a.weight > b.weight) {
      comparison = 1;
    } else if (a.weight < b.weight) {
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