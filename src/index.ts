import {getAllArDrives, getDataPrice, getTotalDataTransactionsSize, sendMessageToGraphite} from './arweave'

const cron = require('node-cron');

async function main_data () {
    let today = new Date();
    console.log ("%s Starting to collect data analytics", today)
    console.log ("")

    // 
    let start = new Date(today);
    let minutesToRemove = 15;
    start.setMinutes(start.getMinutes() - minutesToRemove);

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

}

async function main_prices() {
    let today = new Date();
    console.log ("%s Starting to collect price info", today)
    console.log ("")
    const priceOf1MB = await getDataPrice(1048576);
    const priceOf5MB = await getDataPrice(1048576*5);
    const priceOf75MB = await getDataPrice(1048576*75);
    const priceOf500MB = await getDataPrice (1048576*500);
    const priceOf1GB = await getDataPrice(1073741824);
    await sendMessageToGraphite('price.1mb', +priceOf1MB.toFixed(5), today)
    await sendMessageToGraphite('price.5mb', +priceOf5MB.toFixed(5), today)
    await sendMessageToGraphite('price.75mb', +priceOf75MB.toFixed(5), today)
    await sendMessageToGraphite('price.500mb', +priceOf500MB.toFixed(5), today)
    await sendMessageToGraphite('price.1gb', +priceOf1GB.toFixed(5), today)

}

async function main_data_1d () {
    let today = new Date();
    let start = new Date(today);
    start.setDate(start.getDate() - 1);
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
    await sendMessageToGraphite('users.total_1d', Object.keys(distinctArDriveUsers).length, today);
    await sendMessageToGraphite('drives.total_1d', Object.keys(allArDrives).length, today);
    await sendMessageToGraphite('drives.public_1d', totalPublicDrives, today);
    await sendMessageToGraphite('drives.private_1d', totalPrivateDrives, today);
    await sendMessageToGraphite('data.total_1d', (totalData.publicDataSize + totalData.privateDataSize), today);
    await sendMessageToGraphite('data.public_1d', totalData.publicDataSize, today);
    await sendMessageToGraphite('data.private_1d', totalData.privateDataSize, today);
    await sendMessageToGraphite('files.total_1d', (totalData.publicFiles + totalData.privateFiles), today);
    await sendMessageToGraphite('files.web_1d', totalData.webAppFiles, today);
    await sendMessageToGraphite('files.desktop_1d', totalData.desktopFiles, today);
    await sendMessageToGraphite('files.public_1d', totalData.publicFiles, today);
    await sendMessageToGraphite('files.private_1d',totalData.privateFiles, today);
    await sendMessageToGraphite('fees.total_1d', +((totalData.publicArFee + totalData.privateArFee).toFixed(5)), today);
    await sendMessageToGraphite('fees.public_1d', +totalData.publicArFee.toFixed(5), today);
    await sendMessageToGraphite('fees.private_1d', +totalData.privateArFee.toFixed(5), today);

}

async function main_data_7d () {
    let today = new Date();
    let start = new Date(today);
    start.setDate(start.getDate() - 7);
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
    await sendMessageToGraphite('users.total_7d', Object.keys(distinctArDriveUsers).length, today);
    await sendMessageToGraphite('drives.total_7d', Object.keys(allArDrives).length, today);
    await sendMessageToGraphite('drives.public_7d', totalPublicDrives, today);
    await sendMessageToGraphite('drives.private_7d', totalPrivateDrives, today);
    await sendMessageToGraphite('data.total_7d', (totalData.publicDataSize + totalData.privateDataSize), today);
    await sendMessageToGraphite('data.public_7d', totalData.publicDataSize, today);
    await sendMessageToGraphite('data.private_7d', totalData.privateDataSize, today);
    await sendMessageToGraphite('files.total_7d', (totalData.publicFiles + totalData.privateFiles), today);
    await sendMessageToGraphite('files.web_7d', totalData.webAppFiles, today);
    await sendMessageToGraphite('files.desktop_7d', totalData.desktopFiles, today);
    await sendMessageToGraphite('files.public_7d', totalData.publicFiles, today);
    await sendMessageToGraphite('files.private_7d',totalData.privateFiles, today);
    await sendMessageToGraphite('fees.total_7d', +((totalData.publicArFee + totalData.privateArFee).toFixed(5)), today);
    await sendMessageToGraphite('fees.public_7d', +totalData.publicArFee.toFixed(5), today);
    await sendMessageToGraphite('fees.private_7d', +totalData.privateArFee.toFixed(5), today);

}

async function main_data_30d () {
    let today = new Date();
    let start = new Date(today);
    start.setDate(start.getDate() - 30);
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
    await sendMessageToGraphite('users.total_30d', Object.keys(distinctArDriveUsers).length, today);
    await sendMessageToGraphite('drives.total_30d', Object.keys(allArDrives).length, today);
    await sendMessageToGraphite('drives.public_30d', totalPublicDrives, today);
    await sendMessageToGraphite('drives.private_30d', totalPrivateDrives, today);
    await sendMessageToGraphite('data.total_30d', (totalData.publicDataSize + totalData.privateDataSize), today);
    await sendMessageToGraphite('data.public_30d', totalData.publicDataSize, today);
    await sendMessageToGraphite('data.private_30d', totalData.privateDataSize, today);
    await sendMessageToGraphite('files.total_30d', (totalData.publicFiles + totalData.privateFiles), today);
    await sendMessageToGraphite('files.web_30d', totalData.webAppFiles, today);
    await sendMessageToGraphite('files.desktop_30d', totalData.desktopFiles, today);
    await sendMessageToGraphite('files.public_30d', totalData.publicFiles, today);
    await sendMessageToGraphite('files.private_30d',totalData.privateFiles, today);
    await sendMessageToGraphite('fees.total_30d', +((totalData.publicArFee + totalData.privateArFee).toFixed(5)), today);
    await sendMessageToGraphite('fees.public_30d', +totalData.publicArFee.toFixed(5), today);
    await sendMessageToGraphite('fees.private_30d', +totalData.privateArFee.toFixed(5), today);

}

cron.schedule('0 * * * *', function(){
    console.log('Running ArDrive Analytics Every hour');
    main_data_30d();
});

cron.schedule('0 * * * *', function(){
    console.log('Running ArDrive Analytics Every hour');
    main_data_7d();
});

cron.schedule('0 * * * *', function(){
    console.log('Running ArDrive Analytics Every hour');
    main_data_1d();
});

cron.schedule('*/15 * * * *', function(){
    console.log('Running ArDrive Analytics Every 15 minutes');
    main_data();
});

cron.schedule('*/5 * * * *', function(){
    console.log('Running ArDrive Price Analytics Every 5 minutes');
    main_prices();
});
