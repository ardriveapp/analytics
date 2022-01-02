import { addHoursToDate, getMinBlock } from "./common";
import { getAllAppTransactions_ASC } from "./gql";
import { sendBundlesToGraphite, sendDriveMetadataToGraphite, sendFileDataToGraphite, sendFileMetadataToGraphite, sendFolderMetadataToGraphite, sendv2CommunityTipsToGraphite } from "./graphite";
import { ResultSet } from "./types";

async function main () {
    let allResults: ResultSet = {
        bundles: [],
        fileDatas: [],
        files: [],
        folders: [],
        drives: [],
        v2CommunityTips: []
    };
    
    let today = new Date();


    // The amount of hours to search for i.e. 12, 24 or other range
    let hoursToQuery: number = 12;

    // const start = new Date(2020, 8, 26) // the beginning history of ardrive
    let start = new Date(2020, 11, 16);
    let lastBlock = await getMinBlock(start);

    console.log ("Running analytics from %s to %s", start.toLocaleString(), today.toLocaleString());
    console.log ("--------------------------------------------------------------------------------");

    while (start < today) {
        const end = new Date(addHoursToDate(start, hoursToQuery));
        console.log ("Stats from %s to %s", start.toLocaleString(), end.toLocaleString());
        let results = await getAllAppTransactions_ASC(start, end, lastBlock);

        console.log ("BundledTxs: %s", results.bundleTxs.length);
        console.log ("FileDataTxs: %s", results.fileDataTxs.length);
        console.log ("FileTxs: %s", results.fileTxs.length);
        console.log ("FolderTxs: %s", results.folderTxs.length);
        console.log ("DriveTxs: %s", results.driveTxs.length);
        console.log ("V2 Tips: %s", results.tipTxs.length);
        allResults.bundles = allResults.bundles.concat(results.bundleTxs);
        allResults.fileDatas = allResults.fileDatas.concat(results.fileDataTxs);
        allResults.files = allResults.files.concat(results.fileTxs);
        allResults.folders = allResults.folders.concat(results.folderTxs);
        allResults.drives = allResults.drives.concat(results.driveTxs);
        allResults.v2CommunityTips = allResults.v2CommunityTips.concat(results.tipTxs);
        start = addHoursToDate(start, hoursToQuery);
        await sendBundlesToGraphite(results.bundleTxs, end);
        await sendFileMetadataToGraphite(results.fileTxs, end);
        await sendFileDataToGraphite(results.fileDataTxs, end);
        await sendFolderMetadataToGraphite(results.folderTxs, end);
        await sendDriveMetadataToGraphite(results.driveTxs, end);
        await sendv2CommunityTipsToGraphite(results.tipTxs, end);
        lastBlock = results.lastBlock - 1; // Start the search from 1 block previous to the last block
    };
    console.log ("--------------------------------------------------------------------------------");
    console.log ("All Results");
    console.log ("BundledTxs: %s", allResults.bundles.length);
    console.log ("FileDataTxs: %s", allResults.fileDatas.length);
    console.log ("FileTxs: %s", allResults.files.length);
    console.log ("FolderTxs: %s", allResults.folders.length);
    console.log ("DriveTxs: %s", allResults.drives.length);
    console.log ("V2 Tips: %s", allResults.v2CommunityTips.length);
}

main();
