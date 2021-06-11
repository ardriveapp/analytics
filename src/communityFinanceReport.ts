import { asyncForEach, getArDriveCommunityFinances, sendArDriveCommunityFinancesToGraphite } from "./common";
import { ArDriveCommunityFee } from "./types";

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

    const communityFees = await getArDriveCommunityFinances()
    
    console.log ("Writing all ArDrive Community Finances to ", name)
    csvWriter.writeRecords(communityFees)
    .then(() => {
        console.log('...Done writing');
    });

    console.log ("Sending ArDrive Community Finances to Graphite/Grafana");
    await asyncForEach (communityFees, async (communityFee: ArDriveCommunityFee) => {
        await sendArDriveCommunityFinancesToGraphite(communityFee);
    });
    console.log ("All fees sent")


}

main();