import {asyncForEach, BlockInfo, formatBytes, getAllArDrives, getArUSDPrice, getCurrentBlockHeight, getDataPrice, getLatestBlockInfo, getTotalArDriveCommunityFees, getTotalBundledDataTransactionsSize, getTotalDataTransactionsSize, getTotalDriveSize, userSizeCompare, /*get_24_hour_ardrive_transactions*/ } from './arweave'

async function main () {
    let today = new Date();

    console.log ("%s Starting to collect analytics", today)
    console.log ("")

    let height = await getCurrentBlockHeight();
    let latestBlock : BlockInfo = await getLatestBlockInfo(height)  

    let start = new Date(today);
    let minutesToRemove = 15;
    start.setMinutes(start.getMinutes() - minutesToRemove);
    console.log (start)
    const totalData_15min = await getTotalDataTransactionsSize(start, today)
    const totalFees_15min = await getTotalArDriveCommunityFees(start, today)
    const totalBundledData_15min = await getTotalBundledDataTransactionsSize(start, today)
    const allArDrives_15min = await getAllArDrives(start, today)
    const distinctArDriveUsers_15min = [...new Set(allArDrives_15min.map(x => x.address))]
    let totalPrivateDrives_15min = 0;
    let totalPublicDrives_15min = 0;
    allArDrives_15min.forEach((drive: any) => {
        if (drive.privacy === 'private') {
            totalPrivateDrives_15min += 1;
        }
        else {
            totalPublicDrives_15min += 1;
        }
    })

    start = new Date(today);
    start.setDate(start.getDate() - 1);
    console.log (start)
    let allOwnerStats_1day : any[] = [];
    const totalData_1day = await getTotalDataTransactionsSize(start, today)
    const totalBundledData_1day = await getTotalBundledDataTransactionsSize(start, today)
    const totalFees_1day = await getTotalArDriveCommunityFees(start, today)
    const allArDrives_1day = await getAllArDrives(start, today)
    const distinctArDriveUsers_1day = [...new Set(allArDrives_1day.map(x => x.address))]
    let totalPrivateDrives_1day = 0;
    let totalPublicDrives_1day = 0;
    allArDrives_1day.forEach((drive: any) => {
        if (drive.privacy === 'private') {
            totalPrivateDrives_1day += 1;
        }
        else {
            totalPublicDrives_1day += 1;
        }
    })

    await asyncForEach (distinctArDriveUsers_1day, async (owner: string) => {
        // Get Drive Size
        allOwnerStats_1day.push(await getTotalDriveSize(owner))
    })
    allOwnerStats_1day.sort(userSizeCompare);

    start = new Date(today);
    start.setDate(start.getDate() - 120);
    console.log (start)
    let allOwnerStats_120day : any[] = [];
    const totalData_120day = await getTotalDataTransactionsSize(start, today)
    const totalBundledData_120day = await getTotalBundledDataTransactionsSize(start, today)
    const totalFees_120day = await getTotalArDriveCommunityFees(start, today)
    const allFees_120day = totalFees_120day.totalFees + totalData_120day.publicArFee + totalData_120day.privateArFee;
    const allArDrives_120day = await getAllArDrives(start, today)
    const distinctArDriveUsers_120day = [...new Set(allArDrives_120day.map(x => x.address))]
    let totalPrivateDrives_120day = 0;
    let totalPublicDrives_120day = 0;
    allArDrives_120day.forEach((drive: any) => {
        if (drive.privacy === 'private') {
            totalPrivateDrives_120day += 1;
        }
        else {
            totalPublicDrives_120day += 1;
        }
    })

    await asyncForEach (distinctArDriveUsers_120day, async (owner: string) => {
        // Get Drive Size
        allOwnerStats_120day.push(await getTotalDriveSize(owner))
    })
    allOwnerStats_120day.sort(userSizeCompare);

    // Get all prices
    const priceOf1MB = await getDataPrice(1048576);
    const priceOf5MB = await getDataPrice(1048576*5);
    const priceOf25MB = await getDataPrice(1048576*25);
    const priceOf100MB = await getDataPrice(1048576*100);
    const priceOf500MB = await getDataPrice (1048576*500);
    const priceOf1GB = await getDataPrice(1073741824);

    // Get price of AR in USD
    let arUSDPrice = await getArUSDPrice()

    /*await sendMessageToGraphite('users.total', Object.keys(distinctArDriveUsers_14day).length, today);
    await sendMessageToGraphite('drives.total', Object.keys(allArDrives_14day).length, today);
    await sendMessageToGraphite('drives.public', totalPublicDrives_14day, today);
    await sendMessageToGraphite('drives.private', totalPrivateDrives_14day, today);
    await sendMessageToGraphite('data.total', (totalData_14day.publicDataSize + totalData_14day.privateDataSize), today);
    await sendMessageToGraphite('data.public', totalData_14day.publicDataSize, today);
    await sendMessageToGraphite('data.private', totalData_14day.privateDataSize, today);
    await sendMessageToGraphite('files.total', (totalData_14day.publicFiles + totalData_14day.privateFiles), today);
    await sendMessageToGraphite('files.web', totalData_14day.webAppFiles, today);
    await sendMessageToGraphite('files.desktop', totalData_14day.desktopFiles, today);
    await sendMessageToGraphite('files.public', totalData_14day.publicFiles, today);
    await sendMessageToGraphite('files.private',totalData_14day.privateFiles, today);
    await sendMessageToGraphite('fees.total', +((totalData_14day.publicArFee + totalData_14day.privateArFee).toFixed(5)), today);
    await sendMessageToGraphite('fees.public', +totalData_14day.publicArFee.toFixed(5), today);
    await sendMessageToGraphite('fees.private', +totalData_14day.privateArFee.toFixed(5), today);
    await sendMessageToGraphite('price.1mb', +priceOf1MB.toFixed(5), today)
    await sendMessageToGraphite('price.5mb', +priceOf5MB.toFixed(5), today)
    await sendMessageToGraphite('price.75mb', +priceOf75MB.toFixed(5), today)
    await sendMessageToGraphite('price.500mb', +priceOf500MB.toFixed(5), today)
    await sendMessageToGraphite('price.1gb', +priceOf1GB.toFixed(5), today)*/

    console.log ('  ---------------------------')
    console.log ('Drive, User, Data and File Counts');
    console.log ('  15 Min -');
    console.log ('      Unique Wallets:     ', Object.keys(distinctArDriveUsers_15min).length);
    console.log ('      Total Drives:       ', Object.keys(allArDrives_15min).length);
    console.log ('          Public:         ', totalPublicDrives_15min);
    console.log ('          Private:        ', totalPrivateDrives_15min);
    console.log ('      Total BundledData:  ', (formatBytes(totalBundledData_15min.bundledDataSize)));
    console.log ('      Total Data:         ', (formatBytes(totalData_15min.publicDataSize + totalData_15min.privateDataSize)));
    console.log ('          Public:         ', (formatBytes(totalData_15min.publicDataSize)));
    console.log ('          Private:        ', (formatBytes(totalData_15min.privateDataSize)));
    console.log ('      Total Files:        ', (totalData_15min.publicFiles + totalData_15min.privateFiles));
    console.log ('          Web:            ', totalData_15min.webAppFiles);
    console.log ('          Desktop:        ', totalData_15min.desktopFiles);
    console.log ('          Public:         ', totalData_15min.publicFiles);
    console.log ('          Private:        ', totalData_15min.privateFiles);
    console.log ('      Total Fees (AR):    ', totalFees_15min.totalFees.toFixed(5));
    console.log ('          Desktop:        ', totalFees_15min.desktopFees.toFixed(5));
    console.log ('          WebApp:         ', totalFees_15min.webAppFees.toFixed(5));
    console.log ('  ---------------------------')
    console.log ('  1 Day -');
    console.log ('      Unique Wallets:     ', Object.keys(distinctArDriveUsers_1day).length);
    console.log ('      Total Drives:       ', Object.keys(allArDrives_1day).length);
    console.log ('          Public:         ', totalPublicDrives_1day);
    console.log ('          Private:        ', totalPrivateDrives_1day);
    console.log ('      Total BundledData:  ', formatBytes(totalBundledData_1day.bundledDataSize));
    console.log ('      Total Data:         ', formatBytes(totalData_1day.publicDataSize + totalData_1day.privateDataSize));
    console.log ('          Public:         ', formatBytes(totalData_1day.publicDataSize));
    console.log ('          Private:        ', formatBytes(totalData_1day.privateDataSize));
    console.log ('      Total Files:        ', (totalData_1day.publicFiles + totalData_1day.privateFiles));
    console.log ('          Web:            ', totalData_1day.webAppFiles);
    console.log ('          Desktop:        ', totalData_1day.desktopFiles);
    console.log ('          Public:         ', totalData_1day.publicFiles);
    console.log ('          Private:        ', totalData_1day.privateFiles);
    console.log ('      Total Fees (AR):    ', totalFees_1day.totalFees.toFixed(5));
    console.log ('          Desktop:        ', totalFees_1day.desktopFees.toFixed(5));
    console.log ('          WebApp:         ', totalFees_1day.webAppFees.toFixed(5));
    console.log ('  ---------------------------')
    console.log ('  120 Day -');
    console.log ('      Unique Wallets:     ', Object.keys(distinctArDriveUsers_120day).length);
    console.log ('      Total Drives:       ', Object.keys(allArDrives_120day).length);
    console.log ('          Public:         ', totalPublicDrives_120day);
    console.log ('          Private:        ', totalPrivateDrives_120day);
    console.log ('      Total BundledData:  ', formatBytes(totalBundledData_120day.bundledDataSize));
    console.log ('      Total Data:         ', formatBytes(totalData_120day.publicDataSize + totalData_120day.privateDataSize));
    console.log ('          Public:         ', formatBytes(totalData_120day.publicDataSize));
    console.log ('          Private:        ', formatBytes(totalData_120day.privateDataSize));
    console.log ('      Total Files:        ', (totalData_120day.publicFiles + totalData_120day.privateFiles));
    console.log ('          Web:            ', totalData_120day.webAppFiles);
    console.log ('          Desktop:        ', totalData_120day.desktopFiles);
    console.log ('          Public:         ', totalData_120day.publicFiles);
    console.log ('          Private:        ', totalData_120day.privateFiles);
    console.log ('      Total Fees (AR):    ', totalFees_120day.totalFees.toFixed(5));
    console.log ('          Desktop:        ', totalFees_120day.desktopFees.toFixed(5));
    console.log ('          WebApp:         ', totalFees_120day.webAppFees.toFixed(5));
    console.log ('  ---------------------------')
    console.log ('')

    let averageUserSize = 0;
    let averageUserFiles = 0;
    allOwnerStats_120day.forEach((ownerStat: any) => {
        averageUserSize += ownerStat.totalDriveSize;
        averageUserFiles += ownerStat.totalDriveTransactions
    })
    averageUserSize = averageUserSize / +Object.keys(allOwnerStats_120day).length 
    averageUserFiles = averageUserFiles / +Object.keys(allOwnerStats_120day).length

    console.log ("All Owner Stats %s", +Object.keys(allOwnerStats_120day).length)
    console.log ("Average User Upload Amount %s", averageUserSize)
    console.log ("Average User Files %s", averageUserFiles)
    console.log ("")

    console.log ("Top 10 Drives in the past day")
    allOwnerStats_1day = allOwnerStats_1day.slice(0, 9);
    allOwnerStats_1day.forEach((ownerStat: any) => {
        console.log ("Owner: %s", ownerStat.owner)
        console.log ("Size: %s Files: %s", formatBytes(ownerStat.totalDriveSize), ownerStat.totalDriveTransactions)
    })
    console.log ("")

    console.log ("Top 10 Drives of all time")
    allOwnerStats_120day = allOwnerStats_120day.slice(0, 9);
    allOwnerStats_120day.forEach((ownerStat: any) => {
        console.log ("Owner: %s", ownerStat.owner)
        console.log ("Size: %s Files: %s", formatBytes(ownerStat.totalDriveSize), ownerStat.totalDriveTransactions)
    })
    console.log ("")

    console.log ("Mining Fees Paid %s, $%s", allFees_120day, (allFees_120day * arUSDPrice))
    console.log ("Community Fees Paid %s, $%s", (allFees_120day * .15), ((allFees_120day * .15) * arUSDPrice))
    console.log ("")
    
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

    // Used to test Astatine
    // get_24_hour_ardrive_transactions();
}

main();
