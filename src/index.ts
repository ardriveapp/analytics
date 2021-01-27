import {asyncForEach, BlockInfo, getAllArDrives, getArUSDPrice, getCurrentBlockHeight, getDataPrice, getLatestBlockInfo, getTotalArDriveCommunityFees, getTotalBundledDataTransactionsSize, getTotalDataTransactionsSize, getTotalDriveSize, sendMessageToGraphite, userSizeCompare} from './arweave'

const cron = require('node-cron');

async function main_data_12hour () {
    let today = new Date();
    console.log ("%s Starting to collect data analytics", today)
    console.log ("")

    let start = new Date(today);
    let minutesToRemove = 720;
    let allOwnerStats : any[] = [];
    start.setMinutes(start.getMinutes() - minutesToRemove);
    const totalBundledData = await getTotalBundledDataTransactionsSize(start, today)
    const totalCommunityFees = await getTotalArDriveCommunityFees(start, today)
    const totalV2Data = await getTotalDataTransactionsSize(start, today)
    const allArDrives = await getAllArDrives(start, today)
    let totalPrivateDrives = 0;
    let totalPublicDrives = 0;
    allArDrives.forEach((drive: any) => {
        if (drive.privacy === 'private') {
            totalPrivateDrives += 1;
        }
        else {
            totalPublicDrives += 1;
        }
    })

    // Get the size of each user
    const distinctArDriveUsers = [...new Set(allArDrives.map(x => x.address))]
    await asyncForEach (distinctArDriveUsers, async (owner: string) => {
        // Get Drive Size
        allOwnerStats.push(await getTotalDriveSize(owner))
    })
    allOwnerStats.sort(userSizeCompare);

    // Calculate the averages of files and sizes for all users
    let averageUserSize = 0;
    let averageUserFiles = 0;
    allOwnerStats.forEach((ownerStat: any) => {
        averageUserSize += ownerStat.totalDriveSize;
        averageUserFiles += ownerStat.totalDriveTransactions;
    })
    averageUserSize = averageUserSize / +Object.keys(allOwnerStats).length 
    averageUserFiles = averageUserFiles / +Object.keys(allOwnerStats).length

    // Get top 10 users and send to graphite
    let i = 1;
    allOwnerStats = allOwnerStats.slice(0, 9);
    await asyncForEach (allOwnerStats, async (ownerStat: any) => {
        let top10Size = 'users.top10Size.'
        top10Size = top10Size.concat(i.toString())
        let top10Transactions = 'users.top10Transactions.'
        top10Transactions = top10Transactions.concat(i.toString())
        await sendMessageToGraphite(top10Size, ownerStat.totalDriveSize, today);
        await sendMessageToGraphite(top10Transactions, ownerStat.totalDriveTransactions, today);
        i += 1;
    })

    await sendMessageToGraphite('users.total', Object.keys(distinctArDriveUsers).length, today);
    await sendMessageToGraphite('users.averageSize', averageUserSize, today);
    await sendMessageToGraphite('users.averageUserFiles', averageUserSize, today);
    await sendMessageToGraphite('drives.total', Object.keys(allArDrives).length, today);
    await sendMessageToGraphite('drives.public', totalPublicDrives, today);
    await sendMessageToGraphite('drives.private', totalPrivateDrives, today);
    await sendMessageToGraphite('bundledData.total', (totalBundledData.bundledDataSize), today);
    await sendMessageToGraphite('bundledData.desktop', (totalBundledData.desktopDataSize), today);
    await sendMessageToGraphite('bundledData.webapp', (totalBundledData.webAppDataSize), today);
    await sendMessageToGraphite('v2Data.total', (totalV2Data.publicDataSize + totalV2Data.privateDataSize), today);
    await sendMessageToGraphite('v2Data.public', totalV2Data.publicDataSize, today);
    await sendMessageToGraphite('v2Data.private', totalV2Data.privateDataSize, today);
    await sendMessageToGraphite('files.total', (totalV2Data.publicFiles + totalV2Data.privateFiles), today);
    await sendMessageToGraphite('files.web', totalV2Data.webAppFiles, today);
    await sendMessageToGraphite('files.desktop', totalV2Data.desktopFiles, today);
    await sendMessageToGraphite('files.public', totalV2Data.publicFiles, today);
    await sendMessageToGraphite('files.private', totalV2Data.privateFiles, today);
    await sendMessageToGraphite('fees.total', +totalCommunityFees.totalFees.toFixed(5), today);
    await sendMessageToGraphite('fees.desktop', +totalCommunityFees.desktopFees.toFixed(5), today);
    await sendMessageToGraphite('fees.webapp', +totalCommunityFees.webAppFees.toFixed(5), today);

}

// Gets non-GQL related data
// Includes Weave height, size, difficulty and last block size
async function main_info() {
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

cron.schedule('0 */12 * * *', function(){
    console.log('Running ArDrive 12 Hour Analytics Every 12 hours');
    main_data_12hour();
});

cron.schedule('*/5 * * * *', function(){
    console.log('Running ArDrive Block Info and Price Collection Analytics Every 5 minutes');
    main_info();
});
