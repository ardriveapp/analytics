import {asyncForEach, BlockInfo, formatBytes, getAllArDrives, getArUSDPrice, getCurrentBlockHeight, getDataPrice, getLatestBlockInfo, getTotalArDriveCommunityFees, getTotalBundledDataTransactionsSize, getTotalDataTransactionsSize, getTotalDriveSize, userSizeCompare, /*get_24_hour_ardrive_transactions*/ } from './arweave'

async function main () {
    const days = 1 // Number of days to query for data
    const start = new Date(2021, 0, 28); // The starting range for the query eg. const start = new Date(2021, 0, 28);
    const end = new Date(start)
    end.setDate(start.getDate() - days); // How far back we should query for data
    getMetrics(start, end, days)
    // Used to test Astatine
    // get_24_hour_ardrive_transactions();
}

async function getMetrics (start: Date, end: Date, days: number) {

    //var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    console.log ("Pulling metrics from %s EST to %s EST", end.toLocaleString(), start.toLocaleString())
    let allOwnerStats : any[] = [];
    let totalPrivateDrives = 0;
    let totalPublicDrives = 0;
    const totalData = await getTotalDataTransactionsSize(end, start)
    const totalBundledData = await getTotalBundledDataTransactionsSize(end, start)
    const totalFees = await getTotalArDriveCommunityFees(end, start)
    const allFees = totalFees.totalFees + totalData.publicArFee + totalData.privateArFee;
    const allNewArDrives = await getAllArDrives(end, start)
    allNewArDrives.forEach((drive: any) => {
        if (drive.privacy === 'private') {
            totalPrivateDrives += 1;
        }
        else {
            totalPublicDrives += 1;
        }
    })

    // Determine how many drives in this period
    const distinctNewArDriveUsers = [...new Set(allNewArDrives.map(x => x.address))]

    // Determine who uploaded the most data in this period
    let allTime = new Date();
    allTime.setDate(end.getDate() - 365);
    const allArDrives = await getAllArDrives(allTime, start)
    const distinctArDriveUsers = [...new Set(allArDrives.map(x => x.address))]
    await asyncForEach (distinctArDriveUsers, async (owner: string) => {
        // Get Drive Size
        allOwnerStats.push(await getTotalDriveSize(owner, end, start))
    })
    allOwnerStats.sort(userSizeCompare);

    // Get all prices
    const priceOf1MB = await getDataPrice(1048576);
    const priceOf5MB = await getDataPrice(1048576*5);
    const priceOf25MB = await getDataPrice(1048576*25);
    const priceOf100MB = await getDataPrice(1048576*100);
    const priceOf500MB = await getDataPrice (1048576*500);
    const priceOf1GB = await getDataPrice(1073741824);

    // Get price of AR in USD
    let arUSDPrice = await getArUSDPrice()

    // Get latest block details 
    let height = await getCurrentBlockHeight();
    let latestBlock : BlockInfo = await getLatestBlockInfo(height)  

    console.log ('  ---------------------------')
    console.log ('  %s Day(s) -', days);
    console.log ('      Unique Wallets:     ', Object.keys(distinctNewArDriveUsers).length);
    console.log ('      Total Drives:       ', Object.keys(allNewArDrives).length);
    console.log ('          Public:         ', totalPublicDrives);
    console.log ('          Private:        ', totalPrivateDrives);
    console.log ('      Total BundledData:  ', formatBytes(totalBundledData.bundledDataSize));
    console.log ('      Total Data:         ', formatBytes(totalData.publicDataSize + totalData.privateDataSize));
    console.log ('          Public:         ', formatBytes(totalData.publicDataSize));
    console.log ('          Private:        ', formatBytes(totalData.privateDataSize));
    console.log ('      Total Files:        ', (totalData.publicFiles + totalData.privateFiles));
    console.log ('          Web:            ', totalData.webAppFiles);
    console.log ('          Desktop:        ', totalData.desktopFiles);
    console.log ('          Public:         ', totalData.publicFiles);
    console.log ('          Private:        ', totalData.privateFiles);
    console.log ('      Total Fees (AR):    ', totalFees.totalFees.toFixed(5));
    console.log ('          Desktop:        ', totalFees.desktopFees.toFixed(5));
    console.log ('          WebApp:         ', totalFees.webAppFees.toFixed(5));
    console.log ('  ---------------------------')

    console.log ("Total users found %s", +Object.keys(allOwnerStats).length)
    console.log ("Top 10 Uploaders This Period")
    console.log ("Starting: %s", end.toLocaleString());
    console.log ("Ending: %s", start.toLocaleString());
    allOwnerStats = allOwnerStats.slice(0, 10);
    allOwnerStats.forEach((ownerStat: any) => {
        console.log ("Owner: %s", ownerStat.owner)
        console.log ("Size: %s Files: %s", formatBytes(ownerStat.totalDriveSize), ownerStat.totalDriveTransactions)
    })
    console.log ('  ---------------------------')
    let averageUserSize = 0;
    let averageUserFiles = 0;
    allOwnerStats.forEach((ownerStat: any) => {
        averageUserSize += ownerStat.totalDriveSize;
        averageUserFiles += ownerStat.totalDriveTransactions
    })
    averageUserSize = averageUserSize / +Object.keys(allOwnerStats).length 
    averageUserFiles = averageUserFiles / +Object.keys(allOwnerStats).length

    console.log ("Average User Upload Amount %s", averageUserSize)
    console.log ("Average User Files %s", averageUserFiles)
    console.log ('  ---------------------------')
    console.log ("Mining Fees Paid %s, $%s", allFees, (allFees * arUSDPrice))
    console.log ("Community Fees Paid %s, $%s", (allFees * .15), ((allFees * .15) * arUSDPrice))
    console.log ('  ---------------------------')
    console.log ("Data Prices in AR")
    console.log ("  1 MB is:      %s AR", priceOf1MB.toFixed(5))
    console.log ("  5 MB is:      %s AR", priceOf5MB.toFixed(5))
    console.log ("  25MB is:      %s AR", priceOf25MB.toFixed(5))
    console.log ("  100MB is:     %s AR", priceOf100MB.toFixed(5))
    console.log ("  500 MB is:    %s AR", priceOf500MB.toFixed(5))
    console.log ("  1GB is:       %s AR", priceOf1GB.toFixed(5))
    console.log ("")
    console.log ("AR/USD Price: %s USD", arUSDPrice)
    console.log ("Data Prices in USD")
    console.log ("  1 MB is:      %s USD", (+priceOf1MB.toFixed(5) * arUSDPrice))
    console.log ("  5 MB is:      %s USD", (+priceOf5MB.toFixed(5) * arUSDPrice))
    console.log ("  25MB is:      %s USD", (+priceOf25MB.toFixed(5) * arUSDPrice))
    console.log ("  100MB is:     %s USD", (+priceOf100MB.toFixed(5) * arUSDPrice))
    console.log ("  500 MB is:    %s USD", (+priceOf500MB.toFixed(5) * arUSDPrice))
    console.log ("  1GB is:       %s USD", (+priceOf1GB.toFixed(5) * arUSDPrice))
    console.log ("")
    console.log ("Latest block is: %s", height)
    console.log ("Weave size is: %s", latestBlock.weaveSize)
    console.log ("Last block size is: %s", latestBlock.blockSize)
    console.log ("Cumulative difficulty is: %s", latestBlock.difficulty)
}

main();
