import { getAllFiles } from "./gql";


export async function main () {
    const today = new Date().toISOString().slice(0, 10)
    const start = new Date(2020, 8, 26) // the beginning history of ardrive
    const end = new Date()
    const name = 'ArDrive_All_Files_Report_' + today + '.csv';
    const createCsvWriter = require('csv-writer').createObjectCsvWriter;

    const csvWriter = createCsvWriter({
        path: name,
        header: [
            {id: 'address', title: 'ADDRESS'},
            {id: 'fileId', title: 'FILEID'},
            {id: 'parentFolderId', title: 'PARENTFOLDERID'},
            {id: 'driveId', title: 'DRIVEID'},
            {id: 'privacy', title: 'PRIVACY'},
            {id: 'tx', title: 'TX'},
            {id: 'blockTimeStamp', title: 'BLOCKTIMESTAMP'},
        ]
    });

    console.log('Getting all ArDrive File IDs from %s to %s', start.toLocaleString(), end.toLocaleString());
    const allFiles = await getAllFiles(start, end)

    console.log ("Total Files IDs found: %s", allFiles.length)
    csvWriter.writeRecords(allFiles)
    .then(() => {
        console.log('...Done getting all files');
    });
}

main();