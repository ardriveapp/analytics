
// import { get_24_hour_ardrive_transactions } from './arweave';
import {  BlockDate, getAllBlockDates } from './arweave';
// import { AstatineItem } from './types';

export async function getBlockDates() {
    const createCsvWriter = require('csv-writer').createObjectCsvWriter;
    const csvWriter = createCsvWriter({
        path: 'allBlockDates.csv',
        header: [
            {id: 'blockHeight', title: 'HEIGHT'},
            {id: 'blockTimeStamp', title: 'TIMESTAMP'},
            {id: 'blockHash', title: 'HASH'},
            {id: 'friendlyDate', title: 'DATE'},
        ]
    });

    const allBlockDates: BlockDate[] = await getAllBlockDates()
    csvWriter.writeRecords(allBlockDates)
    .then(() => {
        console.log('...Done writing all block dates');
    });
}

async function main () {
    const createCsvWriter = require('csv-writer').createObjectCsvWriter;
    const csvWriter = createCsvWriter({
        path: 'allBlockDates.csv',
        header: [
            {id: 'blockHeight', title: 'HEIGHT'},
            {id: 'blockTimeStamp', title: 'TIMESTAMP'},
            {id: 'blockHash', title: 'HASH'},
            {id: 'friendlyDate', title: 'DATE'},
        ]
    });

    const allBlockDates: BlockDate[] = await getAllBlockDates()
    csvWriter.writeRecords(allBlockDates)
    .then(() => {
        console.log('...Done writing all block dates');
    });
}

main();