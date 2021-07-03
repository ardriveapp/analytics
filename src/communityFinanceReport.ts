import { getArDriveCommunityFinances } from "./common";

export async function main () {
    const today = new Date().toISOString().slice(0, 10)
    const name = 'ArDrive_Community_Finance_Report_' + today + '.csv';

    const createCsvWriter = require('csv-writer').createObjectCsvWriter;
    const csvWriter = createCsvWriter({
      path: name,
      header: [
          {id: 'owner', title: 'OWNER'},
          {id: 'friendlyName', title: 'FRIENDLYNAME'},
          {id: 'appName', title: 'APPNAME'},
          {id: 'appVersion', title: 'APPVERSION'},
          {id: 'tip', title: 'TIP'},
          {id: 'type', title: 'TYPE'},
          {id: 'exchangeRate', title: 'AR/USD PRICE'},
          {id: 'amountAR', title: 'AR'},
          {id: 'amountUSD', title: 'USD'},
          {id: 'currentPrice', title: 'CURRENT AR/USD PRICE'},
          {id: 'costBasis', title: 'COST BASIS'},
          {id: 'blockHeight', title: 'BLOCKHEIGHT'},
          {id: 'blockTime', title: 'BLOCKTIME'},
          {id: 'friendlyDate', title: 'FRIENDLYDATE'},
      ]
    });

    const start = new Date(2020, 8, 26) // the beginning history of ardrive
    const end = new Date()

    const communityFees = await getArDriveCommunityFinances(start, end)
    
    console.log ("Writing all ArDrive Community Finances to ", name)
    csvWriter.writeRecords(communityFees)
    .then(() => {
        console.log('...Done writing');
    });
}

main();