import { getArDriveTokenSnapshot, getArDriveTokenSnapshot_Redstone } from "./smartweave";

export async function main () {
    const today = new Date().toISOString().slice(0, 10);
    const name = 'ArDrive_Snapshot_' + today + '.csv';

    const createCsvWriter = require('csv-writer').createObjectCsvWriter;

    const csvWriter = createCsvWriter({
        path: name,
        header: [
            {id: 'address', title: 'ADDRESS'},
            {id: 'unlockedArDriveTokens', title: 'UNLOCKEDARDRIVETOKENS'},
            {id: 'lockedArDriveTokens', title: 'LOCKEDARDRIVETOKENS'},
            {id: 'totalArDriveTokens', title: 'TOTALARDRIVETOKENS'},
            {id: 'voteWeight', title: 'VOTEWEIGHT'},
            {id: 'arweaveTokens', title: 'ARWEAVETOKENS'},
        ]
    });
    
    const result = await getArDriveTokenSnapshot();
    await getArDriveTokenSnapshot_Redstone();
    csvWriter.writeRecords(result)
    .then(() => {
        console.log('...Done writing ArDrive Token Snapshot');
    });

}

main();