import {formatBytes, getAllArDrives, getDataPrice, getTotalDataTransactionsSize, sendMessageToGraphite} from './arweave'

const cron = require('node-cron');

async function main () {
    let minutesToRemove=15;
    let today = new Date();
    console.log ("%s Starting to collect analytics", today)
    console.log ("")

    let start = new Date(today);
    start.setDate(start.getDate() - minutesToRemove*60000);

    const allArDrives = await getAllArDrives(start, today)
    const distinctArDriveUsers = [...new Set(allArDrives.map(x => x.address))]
    let totalPrivateDrives = 0;
    let totalPublicDrives = 0;
    allArDrives.forEach((drive: any) => {
        if (drive.privacy === 'private') {
            totalPublicDrives += 1;
        }
        else if (drive.privacy === '') {
            totalPrivateDrives += 1;
        }
    })

    const totalData = await getTotalDataTransactionsSize(start, today)
    const priceOf1MB = await getDataPrice(1048576);
    const priceOf5MB = await getDataPrice(1048576*5);
    const priceOf75MB = await getDataPrice(1048576*75);
    const priceOf500MB = await getDataPrice (1048576*500);
    const priceOf1GB = await getDataPrice(1073741824);

    await sendMessageToGraphite('users.total', Object.keys(distinctArDriveUsers).length, today);
    await sendMessageToGraphite('drives.total', Object.keys(allArDrives).length, today);
    await sendMessageToGraphite('drives.public', totalPublicDrives, today);
    await sendMessageToGraphite('drives.private', totalPrivateDrives, today);
    await sendMessageToGraphite('data.total', (totalData.publicDataSize + totalData.privateDataSize), today);
    await sendMessageToGraphite('data.public', totalData.publicDataSize, today);
    await sendMessageToGraphite('data.private', totalData.privateDataSize, today);
    await sendMessageToGraphite('files.total', (totalData.publicFiles + totalData.privateFiles), today);
    await sendMessageToGraphite('files.web', totalData.webAppFiles, today);
    await sendMessageToGraphite('files.desktop', totalData.desktopFiles, today);
    await sendMessageToGraphite('files.public', totalData.publicFiles, today);
    await sendMessageToGraphite('files.private',totalData.privateFiles, today);
    await sendMessageToGraphite('fees.total', +((totalData.publicArFee + totalData.privateArFee).toFixed(5)), today);
    await sendMessageToGraphite('fees.public', +totalData.publicArFee.toFixed(5), today);
    await sendMessageToGraphite('fees.private', +totalData.privateArFee.toFixed(5), today);
    await sendMessageToGraphite('price.1mb', +priceOf1MB.toFixed(5), today)
    await sendMessageToGraphite('price.5mb', +priceOf5MB.toFixed(5), today)
    await sendMessageToGraphite('price.75mb', +priceOf75MB.toFixed(5), today)
    await sendMessageToGraphite('price.500mb', +priceOf500MB.toFixed(5), today)
    await sendMessageToGraphite('price.1gb', +priceOf1GB.toFixed(5), today)

    console.log ('Drive, User, Data and File Counts');
    console.log ('  15 Minute -');
    console.log ('      Unique Wallets:     ', Object.keys(distinctArDriveUsers).length);
    console.log ('      Total Drives:       ', Object.keys(allArDrives).length);
    console.log ('          Public:         ', totalPublicDrives);
    console.log ('          Private:        ', totalPrivateDrives);
    console.log ('      Total Data:         ', formatBytes(totalData.publicDataSize + totalData.privateDataSize));
    console.log ('          Public:         ', formatBytes(totalData.publicDataSize));
    console.log ('          Private:        ', formatBytes(totalData.privateDataSize));
    console.log ('      Total Files:        ', (totalData.publicFiles + totalData.privateFiles));
    console.log ('          Public:         ', totalData.publicFiles);
    console.log ('          Private:        ', totalData.privateFiles);
    console.log ('      Total Fees (AR):    ', ((totalData.publicArFee + totalData.privateArFee).toFixed(5)));
    console.log ('          Public:         ', totalData.publicArFee.toFixed(5));
    console.log ('          Private:        ', totalData.privateArFee.toFixed(5));
    console.log ('')

    console.log ("Data Prices in AR")
    console.log ("  1 MB is:      %s AR", priceOf1MB.toFixed(5))
    console.log ("  5 MB is:      %s AR", priceOf5MB.toFixed(5))
    console.log ("  75MB is:      %s AR", priceOf75MB.toFixed(5))
    console.log ("  500 MB is:    %s AR", priceOf500MB.toFixed(5))
    console.log ("  1GB is:       %s AR", priceOf1GB.toFixed(5))
    console.log ("")
}

cron.schedule('*/15 * * * *', function(){
    console.log('Running ArDrive Analytics Every 15 minutes');
    main();
});
