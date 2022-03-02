import { getArUSDPrice, getCurrentBlockHeight, getDataPrice, getLatestBlockInfo, getMempoolSize } from './arweave'
import { getArDriveCommunityWalletARBalances, getArDriveCommunityWalletArDriveBalances, getOtherWalletARBalances} from './common';
import { getAllAppTransactions_DESC, getAllDrives_ASC } from './gql';
import { sendBundlesToGraphite, sendDriveMetadataToGraphite, sendFileDataToGraphite, sendFileMetadataToGraphite, sendFolderMetadataToGraphite, sendMessageToGraphite, sendv2CommunityTipsToGraphite } from './graphite';
import { BlockInfo } from './types';

// Used for scheduling the jobs
const cron = require('node-cron');

export async function hourlyArDriveUsageAnalytics (hours: number) {
    let bufferHours = 4; // The amount of hours to buffer to ensure items have been indexed.
    let start = new Date();
    start.setHours(start.getHours() - hours - bufferHours);
    let end = new Date();
    end.setHours(start.getHours() - bufferHours);

    console.log ("Getting all ArDrive App Stats from %s to %s", start.toLocaleString(), end.toLocaleString());
    let results = await getAllAppTransactions_DESC(start, end);
    await sendBundlesToGraphite(results.bundleTxs, end);
    await sendFileMetadataToGraphite(results.fileTxs, end);
    await sendFileDataToGraphite(results.fileDataTxs, end);
    await sendFolderMetadataToGraphite(results.folderTxs, end);
    await sendDriveMetadataToGraphite(results.driveTxs, end);
    await sendv2CommunityTipsToGraphite(results.tipTxs, end);

    // Determine how many unique new users in this period by checking for drives created, getting user information, and checking full user list
    const newUsers: string[] = [...new Set(results.driveTxs.map((item: { owner: string; }) => item.owner))];
    const allTimeStart = new Date(2020, 8, 26) // beginning date for ArDrive transactions
    const allDrives = await getAllDrives_ASC(allTimeStart, start, 1) // We want to get all drive information going up to the most recent period
    const allUsers: string[] = [...new Set(allDrives.map((item: { owner: string }) => item.owner))];

    // need to compare new ardrive users to total ardrive users
    let newUserCount = 0;
    newUsers.forEach((user: string) => {
         newUserCount += allUsers.filter(item => item === user).length;
    });
    await sendMessageToGraphite('ardrive.users.new', newUserCount, end);
    await sendMessageToGraphite('ardrive.users.total', allUsers.length, end);

    console.log ("BundledTxs: %s", results.bundleTxs.length);
    console.log ("FileDataTxs: %s", results.fileDataTxs.length);
    console.log ("FileTxs: %s", results.fileTxs.length);
    console.log ("FolderTxs: %s", results.folderTxs.length);
    console.log ("DriveTxs: %s", results.driveTxs.length);
    console.log ("V2 Tips: %s", results.tipTxs.length);
    console.log ("New Users: %s", newUserCount);
    console.log ("All Users: %s", allUsers.length);
};

// Gets non-GQL related data
// Includes Weave height, size, difficulty and last block size
async function networkAnalytics() {
    let today = new Date();
    
    console.log ("%s Starting to collect latest block and price info", today);
    console.log ("");

    let pendingTxs = await getMempoolSize();
    await sendMessageToGraphite('arweave.mempool.pendingTxs', pendingTxs.length, today);
    console.log ("Mempool size: %s", pendingTxs.length);

    let height = await getCurrentBlockHeight();

    await sendMessageToGraphite('arweave.blockHeight', +height, today);

    let latestBlock : BlockInfo = await getLatestBlockInfo(height);
    await sendMessageToGraphite('arweave.weaveSize', latestBlock.weaveSize, today);
    console.log ("Weave Size: %s", latestBlock.weaveSize);
    await sendMessageToGraphite('arweave.difficulty', latestBlock.difficulty, today);
    console.log ("Arweave Difficulty: %s", latestBlock.difficulty);
    await sendMessageToGraphite('arweave.lastBlockSize', latestBlock.blockSize, today);
    console.log ("Arweave Last Block Size: %s", latestBlock.blockSize);

    // Get price of AR in USD
    let arUSDPrice = await getArUSDPrice();

    // Get data prices of different data sizes in AR
    if (arUSDPrice !== 0) {
        console.log ("Price of AR is: $%s", arUSDPrice);

        // Include the 15% fee
        const priceOf1MB = await getDataPrice(1048576) * 1.15;
        const priceOf5MB = await getDataPrice(1048576*5) * 1.15;
        const priceOf25MB = await getDataPrice(1048576*25) * 1.15;
        const priceOf100MB = await getDataPrice(1048576*100) * 1.15;
        const priceOf500MB = await getDataPrice (1048576*500) * 1.15;
        const priceOf1GB = await getDataPrice(1073741824) * 1.15;
        await sendMessageToGraphite('arweave.price.usd', arUSDPrice, today);
        await sendMessageToGraphite('ardrive.price.ar.1mb', (+priceOf1MB.toFixed(5)), today);
        await sendMessageToGraphite('ardrive.price.ar.5mb', (+priceOf5MB.toFixed(5)), today);
        await sendMessageToGraphite('ardrive.price.ar.25mb', (+priceOf25MB.toFixed(5)), today);
        await sendMessageToGraphite('ardrive.price.ar.100mb', (+priceOf100MB.toFixed(5)), today);
        await sendMessageToGraphite('ardrive.price.ar.500mb', (+priceOf500MB.toFixed(5)), today);
        await sendMessageToGraphite('ardrive.price.ar.1gb', (+priceOf1GB.toFixed(5)), today);
    
        // Get the data prices in USD
        await sendMessageToGraphite('ardrive.price.usd.1mb', (+priceOf1MB.toFixed(5) * arUSDPrice), today);
        await sendMessageToGraphite('ardrive.price.usd.5mb', (+priceOf5MB.toFixed(5) * arUSDPrice), today);
        await sendMessageToGraphite('ardrive.price.usd.25mb', (+priceOf25MB.toFixed(5) * arUSDPrice), today);
        await sendMessageToGraphite('ardrive.price.usd.100mb', (+priceOf100MB.toFixed(5) * arUSDPrice), today);
        await sendMessageToGraphite('ardrive.price.usd.500mb', (+priceOf500MB.toFixed(5) * arUSDPrice), today);
        await sendMessageToGraphite('ardrive.price.usd.1gb', (+priceOf1GB.toFixed(5) * arUSDPrice), today);
    }
}

console.log ("Start ArDrive Analytics Cron Jobs");
console.log ("---------------------------------");
networkAnalytics()
/*cron.schedule('0 17 * * *', function(){
    console.log('Running ArDrive Daiy Analytics Every 24 hours at 1pm');
    dailyArDriveUsageAnalytics();
});*/

cron.schedule('0 */12 * * *', function(){
    console.log('Running ArDrive Daiy Analytics and ArDrive Community Wallet Balances (ARDRIVE tokens) Every 12 hours');
    hourlyArDriveUsageAnalytics(12);
    getArDriveCommunityWalletArDriveBalances();
});

cron.schedule('*/5 * * * *', function(){
    console.log('Running ArDrive Block Info and Price Collection Analytics Every 5 minutes');
    networkAnalytics();
    getOtherWalletARBalances();
});

cron.schedule('*/60 * * * *', function(){
    console.log('Collecting ArDrive Community Wallet Balances (AR tokens) Every 30 minutes');
    getArDriveCommunityWalletARBalances();
});
