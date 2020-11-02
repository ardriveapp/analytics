import {formatBytes, getAllArDrives, getDataPrice, getTotalDataTransactionsSize, sendMessageToGraphite} from './arweave'

async function main () {


let today = new Date();
console.log ("%s Starting to collect analytics", today)
console.log ("")

let start = new Date(today);
start.setDate(start.getDate() - 1);
const allArDrives_1day = await getAllArDrives(start, today)
const distinctArDriveUsers_1day = [...new Set(allArDrives_1day.map(x => x.address))]
let totalPrivateDrives_1day = 0;
let totalPublicDrives_1day = 0;
allArDrives_1day.forEach((drive: any) => {
    if (drive.privacy === 'private') {
        totalPublicDrives_1day += 1;
    }
    else if (drive.privacy === '') {
        totalPrivateDrives_1day += 1;
    }
})
const totalData_1day = await getTotalDataTransactionsSize(start, today)

start = new Date(today);
start.setDate(start.getDate() - 7);
const allArDrives_7day = await getAllArDrives(start, today)
const distinctArDriveUsers_7day = [...new Set(allArDrives_7day.map(x => x.address))]
let totalPrivateDrives_7day = 0;
let totalPublicDrives_7day = 0;
allArDrives_7day.forEach((drive: any) => {
    if (drive.privacy === 'private') {
        totalPublicDrives_7day += 1;
    }
    else if (drive.privacy === '') {
        totalPrivateDrives_7day += 1;
    }
})
const totalData_7day = await getTotalDataTransactionsSize(start, today)

start = new Date(today);
start.setDate(start.getDate() - 14);
const allArDrives_14day = await getAllArDrives(start, today)
const distinctArDriveUsers_14day = [...new Set(allArDrives_14day.map(x => x.address))]
let totalPrivateDrives_14day = 0;
let totalPublicDrives_14day = 0;
allArDrives_14day.forEach((drive: any) => {
    if (drive.privacy === 'private') {
        totalPublicDrives_14day += 1;
    }
    else if (drive.privacy === '') {
        totalPrivateDrives_14day += 1;
    }
})
const totalData_14day = await getTotalDataTransactionsSize(start, today)

start = new Date(today);
start.setDate(start.getDate() - 30);
const allArDrives_30day = await getAllArDrives(start, today)
const distinctArDriveUsers_30day = [...new Set(allArDrives_30day.map(x => x.address))]
let totalPrivateDrives_30day = 0;
let totalPublicDrives_30day = 0;
allArDrives_30day.forEach((drive: any) => {
    if (drive.privacy === 'private') {
        totalPublicDrives_30day += 1;
    }
    else if (drive.privacy === '') {
        totalPrivateDrives_30day += 1;
    }
})
const totalData_30day = await getTotalDataTransactionsSize(start, today)

start = new Date(today);
start.setDate(start.getDate() - 90);
const allArDrives_90day = await getAllArDrives(start, today)
const distinctArDriveUsers_90day = [...new Set(allArDrives_90day.map(x => x.address))]
let totalPrivateDrives_90day = 0;
let totalPublicDrives_90day = 0;
allArDrives_90day.forEach((drive: any) => {
    if (drive.privacy === 'private') {
        totalPublicDrives_90day += 1;
    }
    else if (drive.privacy === '') {
        totalPrivateDrives_90day += 1;
    }
})
const totalData_90day = await getTotalDataTransactionsSize(start, today);


const priceOf1MB = await getDataPrice(1048576);
const priceOf5MB = await getDataPrice(1048576*5);
const priceOf75MB = await getDataPrice(1048576*75);
const priceOf500MB = await getDataPrice (1048576*500);
const priceOf1GB = await getDataPrice(1073741824);

await sendMessageToGraphite('drives.total', Object.keys(allArDrives_1day).length);

console.log ('Drive, User, Data and File Counts');
console.log ('  1 Day -');
console.log ('      Unique Wallets:     ', Object.keys(distinctArDriveUsers_1day).length);
console.log ('      Total Drives:       ', Object.keys(allArDrives_1day).length);
console.log ('          Public:         ', totalPublicDrives_1day);
console.log ('          Private:        ', totalPrivateDrives_1day);
console.log ('      Total Data:         ', formatBytes(totalData_1day.publicDataSize + totalData_1day.privateDataSize));
console.log ('          Public:         ', formatBytes(totalData_1day.publicDataSize));
console.log ('          Private:        ', formatBytes(totalData_1day.privateDataSize));
console.log ('      Total Files:        ', (totalData_1day.publicFiles + totalData_1day.privateFiles));
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
console.log ('          Public:         ', totalData_7day.publicFiles);
console.log ('          Private:        ', totalData_7day.privateFiles);
console.log ('      Total Fees (AR):    ', ((totalData_7day.publicArFee + totalData_7day.privateArFee).toFixed(5)));
console.log ('          Public:         ', totalData_7day.publicArFee.toFixed(5));
console.log ('          Private:        ', totalData_7day.privateArFee.toFixed(5));
console.log ('  ---------------------------')
console.log ('  14 Day -')
console.log ('      Unique Wallets:     ', Object.keys(distinctArDriveUsers_14day).length)
console.log ('      Total Drives:       ', Object.keys(allArDrives_14day).length)
console.log ('          Public:         ', totalPublicDrives_14day)
console.log ('          Private:        ', totalPrivateDrives_14day)
console.log ('      Total Data:         ', formatBytes(totalData_14day.publicDataSize + totalData_14day.privateDataSize));
console.log ('          Public:         ', formatBytes(totalData_14day.publicDataSize));
console.log ('          Private:        ', formatBytes(totalData_14day.privateDataSize));
console.log ('      Total Files:        ', (totalData_14day.publicFiles + totalData_14day.privateFiles));
console.log ('          Public:         ', totalData_14day.publicFiles);
console.log ('          Private:        ', totalData_14day.privateFiles);
console.log ('      Total Fees (AR):    ', ((totalData_14day.publicArFee + totalData_14day.privateArFee).toFixed(5)));
console.log ('          Public:         ', totalData_14day.publicArFee.toFixed(5));
console.log ('          Private:        ', totalData_14day.privateArFee.toFixed(5));
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

}

main()