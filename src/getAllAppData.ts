import { countDistinct } from "./common";
import { getAllAppData } from "./gql";


export async function main () {
    const today = new Date().toISOString().slice(0, 10)
    const start = new Date(2020, 8, 26) // the beginning history of ardrive
    const end = new Date()

    const appTarget = ''; // Change this to whatever app target you like

    const name = appTarget + '_All_App_Data_Report_' + today + '.csv';
    const createCsvWriter = require('csv-writer').createObjectCsvWriter;

    const csvWriter = createCsvWriter({
        path: name,
        header: [
            {id: 'foundTransactions', title: 'FOUNDTRANSACTIONS'},
            {id: 'dataSize', title: 'TOTALDATASIZE'},
            {id: 'foundUsers', title: 'FOUNDUSERS'}
        ]
    });

    console.log('Getting all data from from app %s from %s to %s',  appTarget, start.toLocaleString(), end.toLocaleString());
    const allData = await getAllAppData(appTarget, start, end)

    const uniqueUsers = countDistinct(allData.foundUsers, allData.foundUsers.length)
    console.log ("Total Transactions found: %s", allData.foundTransactions);
    console.log ("Total Data found: %s", allData.dataSize);
    console.log ("Total users found: %s", uniqueUsers);

    const recordToWrite = {
        foundTransactions: allData.foundTransactions,
        dataSize: allData.dataSize,
        foundUsers: uniqueUsers
    }
    csvWriter.writeRecords(recordToWrite)
    .then(() => {
        console.log('...Done getting all files');
    });
}

main();