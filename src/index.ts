import { getArUSDPrice, getCurrentBlockHeight, getDataPrice, getLatestBlockInfo } from './arweave'
import { sendMessageToGraphite, getMetrics, sendResultsToGraphite, getArDriveCommunityWalletBalances } from './common';
import { Results, BlockInfo } from './types';

// Used for scheduling the jobs
const cron = require('node-cron');

export async function dailyArDriveUsageAnalytics () {
    let today = new Date();
    let start = new Date();

    // Take off one day
    start.setDate(start.getDate() - 1);

    const dailyResults : Results = await getMetrics(start, today, 1);
    await sendResultsToGraphite(dailyResults);
}

export async function hourlyArDriveUsageAnalytics (hours: number) {
    let today = new Date();
    let start = new Date();

    // Take off one day
    start.setHours(start.getHours() - hours);

    const dailyResults : Results = await getMetrics(start, today, 0, hours);
    await sendResultsToGraphite(dailyResults);
}

// Gets non-GQL related data
// Includes Weave height, size, difficulty and last block size
async function networkAnalytics() {
    let today = new Date();
    
    console.log ("%s Starting to collect latest block and price info", today)
    console.log ("")

    let height = await getCurrentBlockHeight();
    await sendMessageToGraphite('arweave.blockHeight', +height, today)
    let latestBlock : BlockInfo = await getLatestBlockInfo(height)
    await sendMessageToGraphite('arweave.weaveSize', latestBlock.weaveSize, today)
    await sendMessageToGraphite('arweave.difficulty', latestBlock.difficulty, today)
    await sendMessageToGraphite('arweave.lastBlockSize', latestBlock.blockSize, today)

    // Get price of AR in USD
    let arUSDPrice = await getArUSDPrice()

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
        await sendMessageToGraphite('arweave.price.usd', arUSDPrice, today)
        await sendMessageToGraphite('ardrive.price.ar.1mb', (+priceOf1MB.toFixed(5)), today)
        await sendMessageToGraphite('ardrive.price.ar.5mb', (+priceOf5MB.toFixed(5)), today)
        await sendMessageToGraphite('ardrive.price.ar.25mb', (+priceOf25MB.toFixed(5)), today)
        await sendMessageToGraphite('ardrive.price.ar.100mb', (+priceOf100MB.toFixed(5)), today)
        await sendMessageToGraphite('ardrive.price.ar.500mb', (+priceOf500MB.toFixed(5)), today)
        await sendMessageToGraphite('ardrive.price.ar.1gb', (+priceOf1GB.toFixed(5)), today)
    
        // Get the data prices in USD
        await sendMessageToGraphite('ardrive.price.usd.1mb', (+priceOf1MB.toFixed(5) * arUSDPrice), today)
        await sendMessageToGraphite('ardrive.price.usd.5mb', (+priceOf5MB.toFixed(5) * arUSDPrice), today)
        await sendMessageToGraphite('ardrive.price.usd.25mb', (+priceOf25MB.toFixed(5) * arUSDPrice), today)
        await sendMessageToGraphite('ardrive.price.usd.100mb', (+priceOf100MB.toFixed(5) * arUSDPrice), today)
        await sendMessageToGraphite('ardrive.price.usd.500mb', (+priceOf500MB.toFixed(5) * arUSDPrice), today)
        await sendMessageToGraphite('ardrive.price.usd.1gb', (+priceOf1GB.toFixed(5) * arUSDPrice), today)
    }
}
console.log ("Start ArDrive Analytics Cron Jobs");
console.log ("---------------------------------");

/*cron.schedule('0 17 * * *', function(){
    console.log('Running ArDrive Daiy Analytics Every 24 hours at 1pm');
    dailyArDriveUsageAnalytics();
});*/

cron.schedule('0 */12 * * *', function(){
    console.log('Running ArDrive Daiy Analytics Every 12 hours');
    hourlyArDriveUsageAnalytics(12);
});

cron.schedule('*/15 * * * *', function(){
    console.log('Running ArDrive Block Info and Price Collection Analytics Every 15 minutes');
    networkAnalytics();
    getArDriveCommunityWalletBalances();
});

cron.schedule('*/30 * * * *', function(){
    console.log('Collecting ArDrive Community Wallet Balances');
    getArDriveCommunityWalletBalances();
});
