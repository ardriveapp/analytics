import { getArUSDPrice, getCurrentBlockHeight, getDataPrice, getLatestBlockInfo } from './arweave'
import { sendMessageToGraphite, getMetrics, sendResultsToGraphite } from './common';
import { Results, BlockInfo } from './types';

const cron = require('node-cron');


// ArDrive Profit Sharing Community Smart Contract
// import Community from 'community-js';
// const communityTxId = '-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ';

/*
* add number of ardrive pst holders
•	Tips sent
	Total size of tips
	Total number of tips distributed
*/

async function dailyArDriveUsageAnalytics () {
    let today = new Date();
    let start = new Date(today.getDate() - 1);

    const dailyResults : Results = await getMetrics(start, today, 1);
    await sendResultsToGraphite(dailyResults);
}

// Gets non-GQL related data
// Includes Weave height, size, difficulty and last block size
async function networkAnalytics() {
    let today = new Date();
    
    console.log ("%s Starting to collect latest block and price info", today)
    console.log ("")

    let height = await getCurrentBlockHeight();
    await sendMessageToGraphite('weave.height', +height, today)
    let latestBlock : BlockInfo = await getLatestBlockInfo(height)
    await sendMessageToGraphite('weave.totalSize', latestBlock.weaveSize, today)
    await sendMessageToGraphite('weave.difficulty', latestBlock.difficulty, today)
    await sendMessageToGraphite('weave.lastBlockSize', latestBlock.blockSize, today)

    // Get price of AR in USD
    let arUSDPrice = await getArUSDPrice()

    // Get data prices of different data sizes in AR
    if (arUSDPrice !== 0) {
        const priceOf1MB = await getDataPrice(1048576);
        const priceOf5MB = await getDataPrice(1048576*5);
        const priceOf25MB = await getDataPrice(1048576*25);
        const priceOf100MB = await getDataPrice(1048576*100);
        const priceOf500MB = await getDataPrice (1048576*500);
        const priceOf1GB = await getDataPrice(1073741824);
        await sendMessageToGraphite('price.ar.usd', arUSDPrice, today)
        await sendMessageToGraphite('price.ar.1mb', +priceOf1MB.toFixed(5), today)
        await sendMessageToGraphite('price.ar.5mb', +priceOf5MB.toFixed(5), today)
        await sendMessageToGraphite('price.ar.25mb', +priceOf25MB.toFixed(5), today)
        await sendMessageToGraphite('price.ar.100mb', +priceOf100MB.toFixed(5), today)
        await sendMessageToGraphite('price.ar.500mb', +priceOf500MB.toFixed(5), today)
        await sendMessageToGraphite('price.ar.1gb', +priceOf1GB.toFixed(5), today)
    
        // Get the data prices in USD
        await sendMessageToGraphite('price.usd.1mb', (+priceOf1MB.toFixed(5) * arUSDPrice), today)
        await sendMessageToGraphite('price.usd.5mb', (+priceOf5MB.toFixed(5) * arUSDPrice), today)
        await sendMessageToGraphite('price.usd.25mb', (+priceOf25MB.toFixed(5) * arUSDPrice), today)
        await sendMessageToGraphite('price.usd.100mb', (+priceOf100MB.toFixed(5) * arUSDPrice), today)
        await sendMessageToGraphite('price.usd.500mb', (+priceOf500MB.toFixed(5) * arUSDPrice), today)
        await sendMessageToGraphite('price.usd.1gb', (+priceOf1GB.toFixed(5) * arUSDPrice), today)
    }
}

cron.schedule('0 0 * * *', function(){
    console.log('Running ArDrive Daiy Analytics Every 24 hours at midnight');
    dailyArDriveUsageAnalytics();
});

cron.schedule('*/5 * * * *', function(){
    console.log('Running ArDrive Block Info and Price Collection Analytics Every 5 minutes');
    networkAnalytics();
});
