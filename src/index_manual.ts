import {formatBytes, getAllArDrives, getDataPrice, getTotalDataTransactionsSize, get_24_hour_ardrive_transactions } from './arweave'
const Api = require('@limestonefi/api');

async function main () {
    let today = new Date();
    console.log ("%s Starting to collect analytics", today)
    console.log ("")

    let start = new Date(today);
    let minutesToRemove = 15;
    start.setMinutes(start.getMinutes() - minutesToRemove);
    console.log (start)
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
    const totalData_15min = await getTotalDataTransactionsSize(start, today)

    start = new Date(today);
    start.setDate(start.getDate() - 1);
    console.log (start)
    const totalData_1day = await getTotalDataTransactionsSize(start, today)
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

    start = new Date(today);
    start.setDate(start.getDate() - 7);
    console.log (start)
    const totalData_7day = await getTotalDataTransactionsSize(start, today)
    const allArDrives_7day = await getAllArDrives(start, today)
    const distinctArDriveUsers_7day = [...new Set(allArDrives_7day.map(x => x.address))]
    let totalPrivateDrives_7day = 0;
    let totalPublicDrives_7day = 0;
    allArDrives_7day.forEach((drive: any) => {
        if (drive.privacy === 'private') {
            totalPublicDrives_7day += 1;
        }
        else {
            totalPrivateDrives_7day += 1;
        }
    })

    start = new Date(today);
    start.setDate(start.getDate() - 30);
    console.log (start)
    const totalData_30day = await getTotalDataTransactionsSize(start, today)
    const allArDrives_30day = await getAllArDrives(start, today)
    const distinctArDriveUsers_30day = [...new Set(allArDrives_30day.map(x => x.address))]
    let totalPrivateDrives_30day = 0;
    let totalPublicDrives_30day = 0;
    allArDrives_30day.forEach((drive: any) => {
        if (drive.privacy === 'private') {
            totalPrivateDrives_30day += 1;
        }
        else {
            totalPublicDrives_30day += 1;
        }
    })

    start = new Date(today);
    start.setDate(start.getDate() - 90);
    console.log (start)
    const totalData_90day = await getTotalDataTransactionsSize(start, today);
    const allArDrives_90day = await getAllArDrives(start, today)
    const distinctArDriveUsers_90day = [...new Set(allArDrives_90day.map(x => x.address))]
    let totalPrivateDrives_90day = 0;
    let totalPublicDrives_90day = 0;
    allArDrives_90day.forEach((drive: any) => {
        if (drive.privacy === 'private') {
            totalPrivateDrives_90day += 1;
        }
        else {
            totalPublicDrives_90day += 1;
        }
    })

    // Get all prices
    const priceOf1MB = await getDataPrice(1048576);
    const priceOf5MB = await getDataPrice(1048576*5);
    const priceOf75MB = await getDataPrice(1048576*75);
    const priceOf500MB = await getDataPrice (1048576*500);
    const priceOf1GB = await getDataPrice(1073741824);

    // Get price of AR in USD
    let limestoneQuote = await Api.getPrice("AR");

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

    console.log ('Drive, User, Data and File Counts');
    console.log ('  15 Min -');
    console.log ('      Unique Wallets:     ', Object.keys(distinctArDriveUsers_15min).length);
    console.log ('      Total Drives:       ', Object.keys(allArDrives_15min).length);
    console.log ('          Public:         ', totalPublicDrives_15min);
    console.log ('          Private:        ', totalPrivateDrives_15min);
    console.log ('      Total Data:         ', formatBytes(totalData_15min.publicDataSize + totalData_15min.privateDataSize));
    console.log ('          Public:         ', formatBytes(totalData_15min.publicDataSize));
    console.log ('          Private:        ', formatBytes(totalData_15min.privateDataSize));
    console.log ('      Total Files:        ', (totalData_15min.publicFiles + totalData_15min.privateFiles));
    console.log ('          Web:            ', totalData_15min.webAppFiles);
    console.log ('          Desktop:        ', totalData_15min.desktopFiles);
    console.log ('          Public:         ', totalData_15min.publicFiles);
    console.log ('          Private:        ', totalData_15min.privateFiles);
    console.log ('      Total Fees (AR):    ', ((totalData_15min.publicArFee + totalData_15min.privateArFee).toFixed(5)));
    console.log ('          Public:         ', totalData_15min.publicArFee.toFixed(5));
    console.log ('          Private:        ', totalData_15min.privateArFee.toFixed(5));
    console.log ('  ---------------------------')
    console.log ('  1 Day -');
    console.log ('      Unique Wallets:     ', Object.keys(distinctArDriveUsers_1day).length);
    console.log ('      Total Drives:       ', Object.keys(allArDrives_1day).length);
    console.log ('          Public:         ', totalPublicDrives_1day);
    console.log ('          Private:        ', totalPrivateDrives_1day);
    console.log ('      Total Data:         ', formatBytes(totalData_1day.publicDataSize + totalData_1day.privateDataSize));
    console.log ('          Public:         ', formatBytes(totalData_1day.publicDataSize));
    console.log ('          Private:        ', formatBytes(totalData_1day.privateDataSize));
    console.log ('      Total Files:        ', (totalData_1day.publicFiles + totalData_1day.privateFiles));
    console.log ('          Web:            ', totalData_1day.webAppFiles);
    console.log ('          Desktop:        ', totalData_1day.desktopFiles);
    console.log ('          Public:         ', totalData_1day.publicFiles);
    console.log ('          Private:        ', totalData_1day.privateFiles);
    console.log ('      Total Fees (AR):    ', ((totalData_1day.publicArFee + totalData_1day.privateArFee).toFixed(5)));
    console.log ('          Public:         ', totalData_1day.publicArFee.toFixed(5));
    console.log ('          Private:        ', totalData_1day.privateArFee.toFixed(5));
    console.log ('  ---------------------------')
    console.log ('  7 Day -')
    console.log ('      Unique Wallets:     ', Object.keys(distinctArDriveUsers_7day).length)
    console.log ('      Total Drives:       ', Object.keys(allArDrives_7day).length)
    console.log ('          Public:         ', totalPublicDrives_7day)
    console.log ('          Private:        ', totalPrivateDrives_7day)
    console.log ('      Total Data:         ', formatBytes(totalData_7day.publicDataSize + totalData_7day.privateDataSize));
    console.log ('          Public:         ', formatBytes(totalData_7day.publicDataSize));
    console.log ('          Private:        ', formatBytes(totalData_7day.privateDataSize));
    console.log ('      Total Files:        ', (totalData_7day.publicFiles + totalData_7day.privateFiles));
    console.log ('          Web:            ', totalData_7day.webAppFiles);
    console.log ('          Desktop:        ', totalData_7day.desktopFiles);
    console.log ('          Public:         ', totalData_7day.publicFiles);
    console.log ('          Private:        ', totalData_7day.privateFiles);
    console.log ('      Total Fees (AR):    ', ((totalData_7day.publicArFee + totalData_7day.privateArFee).toFixed(5)));
    console.log ('          Public:         ', totalData_7day.publicArFee.toFixed(5));
    console.log ('          Private:        ', totalData_7day.privateArFee.toFixed(5));
    console.log ('  ---------------------------')
    console.log ('  30 Day -')
    console.log ('      Unique Wallets:     ', Object.keys(distinctArDriveUsers_30day).length)
    console.log ('      Total Drives:       ', Object.keys(allArDrives_30day).length)
    console.log ('          Public:         ', totalPublicDrives_30day)
    console.log ('          Private:        ', totalPrivateDrives_30day)
    console.log ('      Total Data:         ', formatBytes(totalData_30day.publicDataSize + totalData_30day.privateDataSize));
    console.log ('          Public:         ', formatBytes(totalData_30day.publicDataSize));
    console.log ('          Private:        ', formatBytes(totalData_30day.privateDataSize));
    console.log ('      Total Files:        ', (totalData_30day.publicFiles + totalData_30day.privateFiles));
    console.log ('          Web:            ', totalData_30day.webAppFiles);
    console.log ('          Desktop:        ', totalData_30day.desktopFiles);
    console.log ('          Public:         ', totalData_30day.publicFiles);
    console.log ('          Private:        ', totalData_30day.privateFiles);
    console.log ('      Total Fees (AR):    ', ((totalData_30day.publicArFee + totalData_30day.privateArFee).toFixed(5)));
    console.log ('          Public:         ', totalData_30day.publicArFee.toFixed(5));
    console.log ('          Private:        ', totalData_30day.privateArFee.toFixed(5));
    console.log ('  ---------------------------')
    console.log ('  90 Day -')
    console.log ('      Unique Wallets:     ', Object.keys(distinctArDriveUsers_90day).length)
    console.log ('      Total Drives:       ', Object.keys(allArDrives_90day).length)
    console.log ('          Public:         ', totalPublicDrives_90day)
    console.log ('          Private:        ', totalPrivateDrives_90day)
    console.log ('      Total Data:         ', formatBytes(totalData_90day.publicDataSize + totalData_90day.privateDataSize));
    console.log ('          Public:         ', formatBytes(totalData_90day.publicDataSize));
    console.log ('          Private:        ', formatBytes(totalData_90day.privateDataSize));
    console.log ('      Total Files:        ', (totalData_90day.publicFiles + totalData_90day.privateFiles));
    console.log ('          Web:            ', totalData_90day.webAppFiles);
    console.log ('          Desktop:        ', totalData_90day.desktopFiles);
    console.log ('          Public:         ', totalData_90day.publicFiles);
    console.log ('          Private:        ', totalData_90day.privateFiles);
    console.log ('      Total Fees (AR):    ', ((totalData_90day.publicArFee + totalData_90day.privateArFee).toFixed(5)));
    console.log ('          Public Fees:    ', totalData_90day.publicArFee.toFixed(5));
    console.log ('          Private Fees:   ', totalData_90day.privateArFee.toFixed(5));
    console.log ('')
    console.log ("Data Prices in AR")
    console.log ("  1 MB is:      %s AR", priceOf1MB.toFixed(5))
    console.log ("  5 MB is:      %s AR", priceOf5MB.toFixed(5))
    console.log ("  75MB is:      %s AR", priceOf75MB.toFixed(5))
    console.log ("  500 MB is:    %s AR", priceOf500MB.toFixed(5))
    console.log ("  1GB is:       %s AR", priceOf1GB.toFixed(5))
    console.log ("")
    console.log ("AR/USD Price: %s USD", +limestoneQuote.price)

    get_24_hour_ardrive_transactions();
}

main();
