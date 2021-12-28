import { asyncForEach, sleep } from "./common";
import { ArDriveCommunityFee, BundleTx, ContentType, Results } from "./types";

export async function sendBundlesToGraphite (bundles: BundleTx[], end: Date) {
    const appNames: string[] = [...new Set(bundles.map(item => item.appName))];
    const bundleMessage = 'ardrive.apps.';
    await asyncForEach (appNames, async (appName: string) => {
        const appBundles = bundles.filter(item => item.appName === appName).length;
        const appData = bundles.filter(item => item.appName === appName).map(item => item.dataSize).reduce((prev, curr) => prev + curr, 0);
        const appTips = bundles.filter(item => item.appName === appName).map(item => item.quantity).reduce((prev, curr) => prev + curr, 0);
        console.log ("  - %s", appName);
        console.log ("      - Bundles: %s Data: %s Tips: %s", appBundles, appData, appTips);

        let graphiteMessage = bundleMessage + appName + '.bundles.total';
        await sendMessageToGraphite(graphiteMessage, appBundles, end);

        graphiteMessage = bundleMessage + appName + '.bundles.data';
        await sendMessageToGraphite(graphiteMessage, appData, end);

        graphiteMessage = bundleMessage + appName + '.bundles.tips';
        await sendMessageToGraphite(graphiteMessage, appTips, end);
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