import { asyncForEach, sleep } from "./common";
import { ArDriveCommunityFee, ArFSFileDataTx, ArFSFileTx, ArFSFolderTx, ArFSTipTx, BundleTx, ContentType, Results } from "./types";

export async function sendBundlesToGraphite (bundles: BundleTx[], end: Date) {
    console.log ("Sending Bundle Txs to Graphite", end)
    const appNames: string[] = [...new Set(bundles.map(item => item.appName))];
    const message = 'ardrive.apps.';
    await asyncForEach (appNames, async (appName: string) => {
        const appBundles = bundles.filter(item => item.appName === appName).length;
        const appData = bundles.filter(item => item.appName === appName).map(item => item.dataSize).reduce((prev, curr) => prev + curr, 0);
        const appTips = bundles.filter(item => item.appName === appName).map(item => item.quantity).reduce((prev, curr) => prev + curr, 0);
        const appFees = bundles.filter(item => item.appName === appName).map(item => item.fee).reduce((prev, curr) => prev + curr, 0);
        const averageBundleSize = appData / appBundles;
        const averageBundleTipSize = appTips / appBundles;
        const averageBundleFees = appFees / appBundles;

        console.log ("  - %s", appName);
        console.log ("      - Bundles: %s Data: %s Tips: %s Fees: %s", appBundles, appData, appTips, appFees);

        let graphiteMessage = message + appName + '.bundles.total';
        await sendMessageToGraphite(graphiteMessage, appBundles, end);

        graphiteMessage = message + appName + '.bundles.data';
        await sendMessageToGraphite(graphiteMessage, appData, end);

        graphiteMessage = message + appName + '.bundles.averageBundleSize';
        await sendMessageToGraphite(graphiteMessage, averageBundleSize, end);

        graphiteMessage = message + appName + '.bundles.averageBundleTipSize';
        await sendMessageToGraphite(graphiteMessage, averageBundleTipSize, end);

        graphiteMessage = message + appName + '.bundles.averageBundleFees';
        await sendMessageToGraphite(graphiteMessage, averageBundleFees, end);

        graphiteMessage = message + appName + '.bundles.tips';
        await sendMessageToGraphite(graphiteMessage, appTips, end);

        graphiteMessage = message + appName + '.bundles.fees';
        await sendMessageToGraphite(graphiteMessage, appFees, end);
    }); 
};

export async function sendFileDataToGraphite (txs: ArFSFileDataTx[], end: Date) {
  console.log ("Sending File Data Txs to Graphite", end)
  const appNames: string[] = [...new Set(txs.map(item => item.appName))];
  const message = 'ardrive.apps';
  const type = '.fileData'

  await asyncForEach (appNames, async (appName: string) => {
      // Public
      let privacy = '.public';
      const publicTxs = txs.filter(item => item.appName === appName && item.private === false).length;
      const publicDataItems = txs.filter(item => (item.appName === appName && item.fee === 0 && item.private === false)).length; // If the data has no fee, then it must be a data item
      const publicV2Txs = txs.filter(item => (item.appName === appName && item.bundledIn === '' && item.fee !== 0 && item.private === false)).length;
      const publicV2DataSize = txs.filter(item => item.appName === appName && item.private === false).map(item => item.dataSize).reduce((prev, curr) => prev + curr, 0);
      const publicDataItemSize = txs.filter(item => item.appName === appName && item.private === false).map(item => item.dataItemSize).reduce((prev, curr) => prev + curr, 0);
      const publicFees = txs.filter(item => item.appName === appName && item.private === false).map(item => item.fee).reduce((prev, curr) => prev + curr, 0);
      const publicAvgFileDataSize = (publicV2DataSize + publicDataItemSize)/publicTxs;

      let graphiteMessage = message + appName + privacy + type + '.totalTxs';
      await sendMessageToGraphite(graphiteMessage, publicTxs, end);
      graphiteMessage = message + appName + privacy + type + '.dataItemTxs';
      await sendMessageToGraphite(graphiteMessage, publicDataItems, end); 
      graphiteMessage = message + appName + privacy + type + '.v2Txs';
      await sendMessageToGraphite(graphiteMessage, publicV2Txs, end); 
      graphiteMessage = message + appName + privacy + type + '.v2DataSize';
      await sendMessageToGraphite(graphiteMessage, publicV2DataSize, end);
      graphiteMessage = message + appName + privacy + type + '.dataItemSize';
      await sendMessageToGraphite(graphiteMessage, publicDataItemSize, end);
      graphiteMessage = message + appName + privacy + type + '.averageFileDataSize';
      await sendMessageToGraphite(graphiteMessage, publicAvgFileDataSize, end);
      graphiteMessage = message + appName + privacy + type + '.fees';
      await sendMessageToGraphite(graphiteMessage, publicFees, end); 

      console.log ("  - %s", appName);
      console.log ("      - %s", privacy)
      console.log ("      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s", type, publicTxs, publicV2Txs, publicDataItems, publicFees);
      console.log ("      - V2Data: %s bytes, DataItem Data: %s bytes", publicV2DataSize, publicDataItemSize);

      // Private
      privacy = '.private'
      const privateTxs = txs.filter(item => item.appName === appName && item.private === true).length;
      const privateDataItems = txs.filter(item => (item.appName === appName && item.fee === 0 && item.private === true)).length; // If the data has no fee, then it must be a data item
      const privateV2Txs = txs.filter(item => (item.appName === appName && item.bundledIn === '' && item.fee !== 0 && item.private === true)).length;
      const privateV2DataSize = txs.filter(item => item.appName === appName && item.private === true).map(item => item.dataSize).reduce((prev, curr) => prev + curr, 0);
      const privateDataItemSize = txs.filter(item => item.appName === appName && item.private === true).map(item => item.dataItemSize).reduce((prev, curr) => prev + curr, 0);
      const privateFees = txs.filter(item => item.appName === appName && item.private === true).map(item => item.fee).reduce((prev, curr) => prev + curr, 0);
      const privateAvgFileDataSize = (privateV2DataSize + privateDataItemSize)/privateTxs;

      graphiteMessage = message + appName + privacy + type + '.totalTxs';
      await sendMessageToGraphite(graphiteMessage, privateTxs, end);
      graphiteMessage = message + appName + privacy + type + '.dataItemTxs';
      await sendMessageToGraphite(graphiteMessage, privateDataItems, end); 
      graphiteMessage = message + appName + privacy + type + '.v2Txs';
      await sendMessageToGraphite(graphiteMessage, privateV2Txs, end); 
      graphiteMessage = message + appName + privacy + type + '.v2DataSize';
      await sendMessageToGraphite(graphiteMessage, privateV2DataSize, end);
      graphiteMessage = message + appName + privacy + type + '.dataItemSize';
      await sendMessageToGraphite(graphiteMessage, privateDataItemSize, end);
      graphiteMessage = message + appName + privacy + type + '.averageFileDataSize';
      await sendMessageToGraphite(graphiteMessage, privateAvgFileDataSize, end);
      graphiteMessage = message + appName + privacy + type + '.fees';
      await sendMessageToGraphite(graphiteMessage, privateFees, end); 

      console.log ("  - %s", appName);
      console.log ("      - %s", privacy)
      console.log ("      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s", type, privateTxs, privateV2Txs, privateDataItems, privateFees);
      console.log ("      - V2Data: %s bytes, DataItem Data: %s bytes", privateV2DataSize, privateDataItemSize);

      // Count the different content types
      const contentTypes: string[] = [...new Set(txs.filter(item => item.appName ===appName).map(item => item.contentType))];
      await asyncForEach (contentTypes, async (contentType: string) => {
        const contentTypeCount = txs.filter(item => (item.appName === appName && item.contentType === contentType)).length;
        graphiteMessage = message + appName + '.contentTypes.' + contentType;
        await sendMessageToGraphite(graphiteMessage, contentTypeCount, end);
      });
  });
};

export async function sendFileMetadataToGraphite (txs: ArFSFileTx[], end: Date) {
  console.log ("Sending File Metadata Txs to Graphite", end)
  const appNames: string[] = [...new Set(txs.map(item => item.appName))];
  const message = 'ardrive.apps.';
  const type = '.fileMetaData';
  await asyncForEach (appNames, async (appName: string) => {
      // Public
      let privacy = '.public';
      const publicTxs = txs.filter(item => item.appName === appName && item.private === false).length;
      const publicDataItems = txs.filter(item => (item.appName === appName && item.fee === 0 && item.private === false)).length; // If the data has no fee, then it must be a data item
      const publicV2Txs = txs.filter(item => (item.appName === appName && item.bundledIn === '' && item.fee !== 0 && item.private === false)).length;
      const publicV2DataSize = txs.filter(item => item.appName === appName && item.private === false).map(item => item.dataSize).reduce((prev, curr) => prev + curr, 0);
      const publicDataItemSize = txs.filter(item => item.appName === appName && item.private === false).map(item => item.dataItemSize).reduce((prev, curr) => prev + curr, 0);
      const publicFees = txs.filter(item => item.appName === appName && item.private === false).map(item => item.fee).reduce((prev, curr) => prev + curr, 0);

      let graphiteMessage = message + appName + privacy + type + '.totalTxs';
      await sendMessageToGraphite(graphiteMessage, publicTxs, end);
      graphiteMessage = message + appName + privacy + type + '.dataItemTxs';
      await sendMessageToGraphite(graphiteMessage, publicDataItems, end); 
      graphiteMessage = message + appName + privacy + type + '.v2Txs';
      await sendMessageToGraphite(graphiteMessage, publicV2Txs, end); 
      graphiteMessage = message + appName + privacy + type + '.v2DataSize';
      await sendMessageToGraphite(graphiteMessage, publicV2DataSize, end);
      graphiteMessage = message + appName + privacy + type + '.dataItemSize';
      await sendMessageToGraphite(graphiteMessage, publicDataItemSize, end);
      graphiteMessage = message + appName + privacy + type + '.fees';
      await sendMessageToGraphite(graphiteMessage, publicFees, end); 

      console.log ("  - %s", appName);
      console.log ("      - %s", privacy)
      console.log ("      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s", type, publicTxs, publicV2Txs, publicDataItems, publicFees);
      console.log ("      - V2Data: %s bytes, DataItem Data: %s bytes", publicV2DataSize, publicDataItemSize);

      // Private
      privacy = '.private'
      const privateTxs = txs.filter(item => item.appName === appName && item.private === true).length;
      const privateDataItems = txs.filter(item => (item.appName === appName && item.fee === 0 && item.private === true)).length; // If the data has no fee, then it must be a data item
      const privateV2Txs = txs.filter(item => (item.appName === appName && item.bundledIn === '' && item.fee !== 0 && item.private === true)).length;
      const privateV2DataSize = txs.filter(item => item.appName === appName && item.private === true).map(item => item.dataSize).reduce((prev, curr) => prev + curr, 0);
      const privateDataItemSize = txs.filter(item => item.appName === appName && item.private === true).map(item => item.dataItemSize).reduce((prev, curr) => prev + curr, 0);
      const privateFees = txs.filter(item => item.appName === appName && item.private === true).map(item => item.fee).reduce((prev, curr) => prev + curr, 0);

      graphiteMessage = message + appName + privacy + type + '.totalTxs';
      await sendMessageToGraphite(graphiteMessage, privateTxs, end);
      graphiteMessage = message + appName + privacy + type + '.dataItemTxs';
      await sendMessageToGraphite(graphiteMessage, privateDataItems, end); 
      graphiteMessage = message + appName + privacy + type + '.v2Txs';
      await sendMessageToGraphite(graphiteMessage, privateV2Txs, end); 
      graphiteMessage = message + appName + privacy + type + '.v2DataSize';
      await sendMessageToGraphite(graphiteMessage, privateV2DataSize, end);
      graphiteMessage = message + appName + privacy + type + '.dataItemSize';
      await sendMessageToGraphite(graphiteMessage, privateDataItemSize, end);
      graphiteMessage = message + appName + privacy + type + '.fees';
      await sendMessageToGraphite(graphiteMessage, privateFees, end); 

      console.log ("  - %s", appName);
      console.log ("      - %s", privacy)
      console.log ("      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s", type, privateTxs, privateV2Txs, privateDataItems, privateFees);
      console.log ("      - V2Data: %s bytes, DataItem Data: %s bytes", privateV2DataSize, privateDataItemSize);
  });
};

export async function sendFolderMetadataToGraphite (txs: ArFSFolderTx[], end: Date) {
  console.log ("Sending Folder Metadata Txs to Graphite", end)
  const appNames: string[] = [...new Set(txs.map(item => item.appName))];
  const message = 'ardrive.apps.';
  const type = '.folderMetaData';
  await asyncForEach (appNames, async (appName: string) => {
      // Public
      let privacy = '.public';
      const publicTxs = txs.filter(item => item.appName === appName && item.private === false).length;
      const publicDataItems = txs.filter(item => (item.appName === appName && item.fee === 0 && item.private === false)).length; // If the data has no fee, then it must be a data item
      const publicV2Txs = txs.filter(item => (item.appName === appName && item.bundledIn === '' && item.fee !== 0 && item.private === false)).length;
      const publicV2DataSize = txs.filter(item => item.appName === appName && item.private === false).map(item => item.dataSize).reduce((prev, curr) => prev + curr, 0);
      const publicDataItemSize = txs.filter(item => item.appName === appName && item.private === false).map(item => item.dataItemSize).reduce((prev, curr) => prev + curr, 0);
      const publicFees = txs.filter(item => item.appName === appName && item.private === false).map(item => item.fee).reduce((prev, curr) => prev + curr, 0);

      let graphiteMessage = message + appName + privacy + type + '.totalTxs';
      await sendMessageToGraphite(graphiteMessage, publicTxs, end);
      graphiteMessage = message + appName + privacy + type + '.dataItemTxs';
      await sendMessageToGraphite(graphiteMessage, publicDataItems, end); 
      graphiteMessage = message + appName + privacy + type + '.v2Txs';
      await sendMessageToGraphite(graphiteMessage, publicV2Txs, end); 
      graphiteMessage = message + appName + privacy + type + '.v2DataSize';
      await sendMessageToGraphite(graphiteMessage, publicV2DataSize, end);
      graphiteMessage = message + appName + privacy + type + '.dataItemSize';
      await sendMessageToGraphite(graphiteMessage, publicDataItemSize, end);
      graphiteMessage = message + appName + privacy + type + '.fees';
      await sendMessageToGraphite(graphiteMessage, publicFees, end); 

      console.log ("  - %s", appName);
      console.log ("      - %s", privacy)
      console.log ("      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s", type, publicTxs, publicV2Txs, publicDataItems, publicFees);
      console.log ("      - V2Data: %s bytes, DataItem Data: %s bytes", publicV2DataSize, publicDataItemSize);

      // Private
      privacy = '.private'
      const privateTxs = txs.filter(item => item.appName === appName && item.private === true).length;
      const privateDataItems = txs.filter(item => (item.appName === appName && item.fee === 0 && item.private === true)).length; // If the data has no fee, then it must be a data item
      const privateV2Txs = txs.filter(item => (item.appName === appName && item.bundledIn === '' && item.fee !== 0 && item.private === true)).length;
      const privateV2DataSize = txs.filter(item => item.appName === appName && item.private === true).map(item => item.dataSize).reduce((prev, curr) => prev + curr, 0);
      const privateDataItemSize = txs.filter(item => item.appName === appName && item.private === true).map(item => item.dataItemSize).reduce((prev, curr) => prev + curr, 0);
      const privateFees = txs.filter(item => item.appName === appName && item.private === true).map(item => item.fee).reduce((prev, curr) => prev + curr, 0);

      graphiteMessage = message + appName + privacy + type + '.totalTxs';
      await sendMessageToGraphite(graphiteMessage, privateTxs, end);
      graphiteMessage = message + appName + privacy + type + '.dataItemTxs';
      await sendMessageToGraphite(graphiteMessage, privateDataItems, end); 
      graphiteMessage = message + appName + privacy + type + '.v2Txs';
      await sendMessageToGraphite(graphiteMessage, privateV2Txs, end); 
      graphiteMessage = message + appName + privacy + type + '.v2DataSize';
      await sendMessageToGraphite(graphiteMessage, privateV2DataSize, end);
      graphiteMessage = message + appName + privacy + type + '.dataItemSize';
      await sendMessageToGraphite(graphiteMessage, privateDataItemSize, end);
      graphiteMessage = message + appName + privacy + type + '.fees';
      await sendMessageToGraphite(graphiteMessage, privateFees, end); 

      console.log ("  - %s", appName);
      console.log ("      - %s", privacy)
      console.log ("      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s", type, privateTxs, privateV2Txs, privateDataItems, privateFees);
      console.log ("      - V2Data: %s bytes, DataItem Data: %s bytes", privateV2DataSize, privateDataItemSize);
  });
};

export async function sendDriveMetadataToGraphite (txs: ArFSFolderTx[], end: Date) {
  console.log ("Sending Drive Metadata Txs to Graphite", end)
  const appNames: string[] = [...new Set(txs.map(item => item.appName))];
  const message = 'ardrive.apps.';
  await asyncForEach (appNames, async (appName: string) => {
      const appDrives = txs.filter(item => item.appName === appName).length;
      const privateDrives = txs.filter(item => (item.appName === appName && item.private === true)).length;
      const publicDrives = appDrives - privateDrives;
      const dataItems = txs.filter(item => (item.appName === appName && item.fee === 0)).length; // If the data has no fee, then it must be a data item
      const v2Txs = txs.filter(item => (item.appName === appName && item.bundledIn === '' && item.fee !== 0)).length;
      const appV2DataSize = txs.filter(item => item.appName === appName).map(item => item.dataSize).reduce((prev, curr) => prev + curr, 0);
      const appDataItemSize = txs.filter(item => item.appName === appName).map(item => item.dataItemSize).reduce((prev, curr) => prev + curr, 0);
      const appFees = txs.filter(item => item.appName === appName).map(item => item.fee).reduce((prev, curr) => prev + curr, 0);
      console.log ("  - %s", appName);
      console.log ("      - Drive Metadata Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s", appDrives, v2Txs, dataItems, appFees);
      console.log ("      - V2Data: %s bytes, DataItem Data: %s bytes Private Drives: %s, Public Drives: %s", appV2DataSize, appDataItemSize, privateDrives, publicDrives);

      let graphiteMessage = message + appName + '.driveMetaData.totalTxs';
      await sendMessageToGraphite(graphiteMessage, appDrives, end);

      graphiteMessage = message + appName + '.driveMetaData.v2DataSize';
      await sendMessageToGraphite(graphiteMessage, appV2DataSize, end);

      graphiteMessage = message + appName + '.driveMetaData.dataItemSize';
      await sendMessageToGraphite(graphiteMessage, appDataItemSize, end);

      graphiteMessage = message + appName + '.driveMetaData.fees';
      await sendMessageToGraphite(graphiteMessage, appFees, end); 

      graphiteMessage = message + appName + '.driveMetaData.dataItemTxs';
      await sendMessageToGraphite(graphiteMessage, dataItems, end); 

      graphiteMessage = message + appName + '.driveMetaData.v2Txs';
      await sendMessageToGraphite(graphiteMessage, v2Txs, end); 

      graphiteMessage = message + appName + '.driveMetaData.privateTxs';
      await sendMessageToGraphite(graphiteMessage, privateDrives, end); 

      graphiteMessage = message + appName + '.driveMetaData.publicTxs';
      await sendMessageToGraphite(graphiteMessage, publicDrives, end); 
  });
};

export async function sendv2CommunityTipsToGraphite (txs: ArFSTipTx[], end: Date) {
  console.log ("Sending Tip Txs to Graphite", end)
  const appNames: string[] = [...new Set(txs.map(item => item.appName))];
  const message = 'ardrive.apps.';
  await asyncForEach (appNames, async (appName: string) => {
      const appTipTxs = txs.filter(item => item.appName === appName).length;
      const appTipQuantity = txs.filter(item => item.appName === appName).map(item => item.quantity).reduce((prev, curr) => prev + curr, 0);
      const averageTipSize = appTipQuantity / appTipTxs;
      console.log ("  - %s", appName);
      console.log ("      - V2 Tip Txs: %s, Tip Quantity: %s", appTipTxs, appTipQuantity);

      let graphiteMessage = message + appName + '.v2CommunityTip.totalTxs';
      await sendMessageToGraphite(graphiteMessage, appTipTxs, end);

      graphiteMessage = message + appName + '.v2CommunityTip.quantity';
      await sendMessageToGraphite(graphiteMessage, appTipQuantity, end);

      graphiteMessage = message + appName + '.v2CommunityTip.averageTipSize';
      await sendMessageToGraphite(graphiteMessage, averageTipSize, end);
  });
};

export async function sendResultsToGraphite (results: Results) {

    const today = results.endDate;
    await sendMessageToGraphite('ardrive.users.total', results.totalArDriveUsers, today);
    await sendMessageToGraphite('ardrive.users.new', results.newArDriveUsers, today);
    await sendMessageToGraphite('ardrive.users.averageUserSize', results.averageUserSize, today);
    await sendMessageToGraphite('ardrive.users.averageUserFiles', results.averageUserFiles, today);
    await sendMessageToGraphite('ardrive.drives.total', results.drivesFound, today);
    await sendMessageToGraphite('ardrive.drives.public', results.publicDrives, today);
    await sendMessageToGraphite('ardrive.drives.private', results.privateDrives, today);
    await sendMessageToGraphite('ardrive.v2Data.total', results.totalDataSize, today);
    await sendMessageToGraphite('ardrive.v2Data.public', results.publicData, today);
    await sendMessageToGraphite('ardrive.v2Data.private', results.privateData, today);
    await sendMessageToGraphite('ardrive.files.total', results.totalFiles, today);
    await sendMessageToGraphite('ardrive.files.web', results.webAppFiles, today);
    await sendMessageToGraphite('ardrive.files.desktop', results.desktopAppFiles, today);
    await sendMessageToGraphite('ardrive.files.mobile', results.mobileAppFiles, today);
    await sendMessageToGraphite('ardrive.files.core', results.coreAppFiles, today);
    await sendMessageToGraphite('ardrive.files.core.arconnect', results.arConnectFiles, today);
    await sendMessageToGraphite('ardrive.files.cli', results.cliAppFiles, today);
    await sendMessageToGraphite('ardrive.files.public', results.publicFiles, today);
    await sendMessageToGraphite('ardrive.files.private', results.privateFiles, today);
    await sendMessageToGraphite('ardrive.fees.community', results.totalCommunityFees, today);
    await sendMessageToGraphite('ardrive.fees.mining', results.totalMiningFees, today);
    await sendMessageToGraphite('ardrive.fees.desktop', results.desktopAppFees, today);
    await sendMessageToGraphite('ardrive.fees.mobile', results.mobileAppFees, today);
    await sendMessageToGraphite('ardrive.fees.core', results.coreAppFees, today);
    await sendMessageToGraphite('ardrive.fees.core.arconnect', results.arConnectFees, today)
    await sendMessageToGraphite('ardrive.fees.cli', results.cliAppFees, today);
    await sendMessageToGraphite('ardrive.fees.webapp', results.webAppFees, today);
    await sendMessageToGraphite('ardrive.fees.public', results.publicArFees, today);
    await sendMessageToGraphite('ardrive.fees.private', results.privateArFees, today);
    await sendMessageToGraphite('ardrive.community.tokenHolders', results.tokenHolders, today);
    await sendMessageToGraphite('arweave.blockHeight', results.blockHeight, today);
    await sendMessageToGraphite('arweave.weaveSize', results.weaveSize, today);
    await sendMessageToGraphite('arweave.difficuty', results.weaveSize, today);
    
    if (results.contentTypes !== undefined) {
        await asyncForEach (results.contentTypes, async (contentType: ContentType) => {
            let contentTypeGraphiteMessage = 'ardrive.contenttypes.';
            contentTypeGraphiteMessage = contentTypeGraphiteMessage.concat(contentType.contentType)
            await sendMessageToGraphite(contentTypeGraphiteMessage, contentType.count, today);
        })
    }

    return "Success";
};

// Takes the ardrive community fees and exports to graphite/grafana dashboard, using friendly name for the grouping
export async function sendArDriveCommunityFinancesToGraphite (communityFee: ArDriveCommunityFee) {
    try {
      const date = new Date(communityFee.blockTime * 1000);
      let arDriveFinancesMessage = 'ardrive.finances.' + communityFee.friendlyName + '.';
  
      let graphiteMessage = arDriveFinancesMessage + 'amount.ar';
      await sendMessageToGraphite(graphiteMessage, communityFee.amountAR, date);
  
      graphiteMessage = arDriveFinancesMessage + 'amount.usd';
      await sendMessageToGraphite(graphiteMessage, communityFee.amountUSD, date);
  
      graphiteMessage = arDriveFinancesMessage + 'tipType.' + communityFee.tip + '.';
      await sendMessageToGraphite(graphiteMessage, 1, date);
  
    } catch (err) {
      console.log (err);
      console.log ("Error sending community fees to graphite")
    }
    return "Success";
};

// Sends a message to the ardrive graphite server
export async function sendMessageToGraphite (path: string, value: number, timeStamp: Date) {
    try {
      const message = path + " " + value.toString() + " " + (Math.floor(timeStamp.getTime()/1000)) + '\n';
      let net = require('net');
      let socket = new net.createConnection(2003, 'stats.ardrive.io', function() {
          socket.write(message);
          socket.end('completed!');
      });
      socket.on('error', async function() {
        console.log ('Connection error');
        socket.end('completed!');
        await sleep (5000);
        await sendMessageToGraphite(path, value, timeStamp);
      })
    } catch (err) {
      console.log (err);
      console.log ("Error sending message to graphite");
    }
};