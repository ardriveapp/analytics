import { asyncForEach, countDistinct, formatBytes, userSizeCompare } from "./common";
import { getAllDrives, getUserSize } from "./gql";
import { ArDriveStat } from "./types";


export async function main () {
    const today = new Date().toISOString().slice(0, 10)
    const start = new Date(2020, 8, 26) // the beginning history of ardrive
    const end = new Date()
    const name = 'ArDrive_All_Drives_Report_' + today + '.csv';
    const createCsvWriter = require('csv-writer').createObjectCsvWriter;

    const csvWriter = createCsvWriter({
        path: name,
        header: [
            {id: 'owner', title: 'OWNER'},
            {id: 'totalDriveSize', title: 'TOTALDRIVESIZE'},
            {id: 'totalDriveTransactions', title: 'TOTALDRIVETRANSACTIONS'},
        ]
    });

    console.log('Getting all ArDrive Drive IDs from %s to %s', start.toLocaleString(), end.toLocaleString());
    const allDrives: ArDriveStat[] = await getAllDrives(start, end)
    const distinctArDriveUsers = [...new Set(allDrives.map(x => x.address))]

    console.log ("Total Drive IDs found: %s", allDrives.length)
    console.log ("Total Unique Drives IDs: %s", countDistinct(allDrives, allDrives.length))
    console.log ("Total Unique Users Found: ", distinctArDriveUsers.length);

    // filter out low drive sizes
    console.log ("- Getting total user sizes");
    let allOwnerStats : any[] = [];
    await asyncForEach (distinctArDriveUsers, async (owner: string) => {
        // Get Drive Size
        let ownerStat = await getUserSize(owner, start, end)
        allOwnerStats.push(ownerStat)
    })
    allOwnerStats.sort(userSizeCompare);

    let averageUserSize = 0;
    let averageUserFiles = 0;
    allOwnerStats.forEach((ownerStat: any) => {
        averageUserSize += ownerStat.totalDriveSize;
        averageUserFiles += ownerStat.totalDriveTransactions;
    })
    averageUserSize = +averageUserSize / allOwnerStats.length ;
    averageUserFiles = +averageUserFiles / allOwnerStats.length;

    console.log ("Average User Size %s", formatBytes(averageUserSize));
    console.log ("Average User Files Amount %s", averageUserFiles);
    console.log ('  ---------------------------');
    console.log ("Top 50 Uploaders This Period");
    console.log ("Starting: %s", end.toLocaleString());
    console.log ("Ending: %s", start.toLocaleString());
    allOwnerStats = allOwnerStats.slice(0, 50);
    allOwnerStats.forEach((ownerStat: any) => {
        console.log ("Owner: %s", ownerStat.owner);
        console.log ("Size: %s Files: %s", formatBytes(ownerStat.totalDriveSize), ownerStat.totalDriveTransactions);
    })

csvWriter.writeRecords(allOwnerStats)
    .then(() => {
        console.log('...Done getting all drives');
    });
}

main();