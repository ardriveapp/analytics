
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

export async function main2 () {
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

export async function main () {
    const createCsvWriter = require('csv-writer').createObjectCsvWriter;

    const csvWriter = createCsvWriter({
        path: 'allArMyDriveFees.csv',
        header: [
            {id: 'appName', title: 'APPNAME'},
            {id: 'appVersion', title: 'APPVERSION'},
            {id: 'tip', title: 'TIP'},
            {id: 'type', title: 'TYPE'},
            {id: 'amount', title: 'AMOUNT'},
            {id: 'blockHeight', title: 'BLOCKHEIGHT'},
            {id: 'blockTime', title: 'BLOCKTIME'},
            {id: 'friendlyDate', title: 'FRIENDLYDATE'},
        ]
    });
    2ZaUGqVCPxst5s0XO933HbZmksnLixpXkt6Sh2re0hg
    const allBlockDates: ArDriveCommunityFee[] = await getAllMyArDriveCommunityFees()
    csvWriter.writeRecords(allBlockDates)
    .then(() => {
        console.log('...Done writing all block dates');
    });
}



main();

export interface ArDriveCommunityFee {
    appName: string,
    appVersion: string,
    tip: string,
    type: string,
    amount: number,
    blockTime: number,
    friendlyDate: string
  }