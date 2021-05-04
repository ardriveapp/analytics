import {
    getAllArDrives, 
    getLatestBlockInfo, 
    getTokenHolderCount, 
    getTotalArDriveCommunityFees, 
    getTotalBundledDataTransactionsSize, 
    getTotalDataTransactionsSize, 
    getTotalDriveSize, 
    /*get_24_hour_ardrive_transactions*/ 
} from './arweave'
import { Results, ContentType, BlockInfo } from './types';

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

// Gets a set of metrics for a period of days or hours
export async function getMetrics (start: Date, end: Date, days?: number, hours?: number) : Promise<Results> {
    if (hours) {
      console.log ("hours is ", hours)
      start = end;
      console.log (start)
      start.setHours(start.getHours() - hours);
      console.log (start)
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
    console.log ("Average User Files %s", formatBytes(averageUserFiles));
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
    const message = path + " " + value.toString() + " " + (Math.floor(timeStamp.getTime()/1000)) + '\n';
    let net = require('net');
    let client = new net.Socket();
    client.connect(2003, 'stats.ardrive.io', function() {
        client.write(message)
        client.end('completed!')
    });
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