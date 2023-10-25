import { stringToB64Url } from "arweave/node/lib/utils";
import { asyncForEach, sleep } from "./common";
import {
  ArDriveCommunityFee,
  ArFSFileDataTx,
  ArFSFileTx,
  ArFSFolderTx,
  ArFSSnapshotTx,
  ArFSTipTx,
  BundleTx,
  ContentType,
  ResultSet,
  Results,
} from "./types";

export async function sendBundlesToGraphite(
  message: string,
  bundles: BundleTx[],
  end: Date
) {
  const type = ".bundles";
  // console.log("Sending Bundle Txs to Graphite", end);
  const appNames: string[] = [...new Set(bundles.map((item) => item.appName))];
  await asyncForEach(appNames, async (appName: string) => {
    const appBundles = bundles.filter(
      (item) => item.appName === appName
    ).length;
    const foundAddresses: string[] = [];
    bundles.forEach((tx) => {
      foundAddresses.push(tx.owner);
    });
    const appBundlers = new Set(foundAddresses).size;
    const appData = bundles
      .filter((item) => item.appName === appName)
      .map((item) => item.dataSize)
      .reduce((prev, curr) => prev + curr, 0);
    const appTips = bundles
      .filter((item) => item.appName === appName)
      .map((item) => item.quantity)
      .reduce((prev, curr) => prev + curr, 0);
    const appFees = bundles
      .filter((item) => item.appName === appName)
      .map((item) => item.fee)
      .reduce((prev, curr) => prev + curr, 0);
    const averageBundleSize = appData / appBundles;
    const averageBundleTipSize = appTips / appBundles;
    const averageBundleFees = appFees / appBundles;

    console.log("  - %s", appName);
    console.log(
      "      - Bundles: %s Data: %s Tips: %s Fees: %s",
      appBundles,
      appData,
      appTips,
      appFees
    );

    appName = appName.replaceAll(" ", "-"); // removes any spaces in app name
    let graphiteMessage = message + appName + type + ".totalTxs";
    await sendMessageToGraphite(graphiteMessage, appBundles, end);

    graphiteMessage = message + appName + type + ".dataSize";
    await sendMessageToGraphite(graphiteMessage, appData, end);

    graphiteMessage = message + appName + type + ".averageBundleSize";
    await sendMessageToGraphite(graphiteMessage, averageBundleSize, end);

    graphiteMessage = message + appName + type + ".averageBundleTipSize";
    await sendMessageToGraphite(graphiteMessage, averageBundleTipSize, end);

    graphiteMessage = message + appName + type + ".averageBundleFees";
    await sendMessageToGraphite(graphiteMessage, averageBundleFees, end);

    graphiteMessage = message + appName + type + ".tips";
    await sendMessageToGraphite(graphiteMessage, appTips, end);

    graphiteMessage = message + appName + type + ".fees";
    await sendMessageToGraphite(graphiteMessage, appFees, end);

    graphiteMessage = message + appName + type + ".bundlers";
    await sendMessageToGraphite(graphiteMessage, appBundlers, end);
  });
}

export async function sendUsersToGraphite(
  message: string,
  results: ResultSet,
  end: Date
) {
  // console.log("Sending Found Users to Graphite", end);

  let totalAddresses: string[] = [];
  let bundleAddresses: string[] = [];
  let webAddresses: string[] = [];
  let cliAddresses: string[] = [];
  let mobileAddresses: string[] = [];
  let coreAddresses: string[] = [];
  let syncAddresses: string[] = [];
  let desktopAddresses: string[] = [];
  let arconnectAddresses: string[] = [];

  results.bundleTxs.forEach((tx) => {
    totalAddresses.push(tx.owner);
    bundleAddresses.push(tx.owner);
    switch (tx.appName) {
      case "ArDrive-Web":
        webAddresses.push(tx.owner);
        break;
      case "ArDrive-CLI":
        cliAddresses.push(tx.owner);
        break;
      case "ArDrive-Sync":
        syncAddresses.push(tx.owner);
        break;
      case "ArDrive-Mobile":
        mobileAddresses.push(tx.owner);
        break;
      case "ArDrive-Core":
        coreAddresses.push(tx.owner);
        break;
      case "ArDrive-Desktop":
        desktopAddresses.push(tx.owner);
        break;
      case "ArConnect":
        arconnectAddresses.push(tx.owner);
        break;
      default:
        break;
    }
  });
  results.fileDataTxs.forEach((tx) => {
    totalAddresses.push(tx.owner);
    switch (tx.appName) {
      case "ArDrive-Web":
        webAddresses.push(tx.owner);
        break;
      case "ArDrive-CLI":
        cliAddresses.push(tx.owner);
        break;
      case "ArDrive-Sync":
        syncAddresses.push(tx.owner);
        break;
      case "ArDrive-Mobile":
        mobileAddresses.push(tx.owner);
        break;
      case "ArDrive-Core":
        coreAddresses.push(tx.owner);
        break;
      case "ArDrive-Desktop":
        desktopAddresses.push(tx.owner);
        break;
      case "ArConnect":
        arconnectAddresses.push(tx.owner);
        break;
      default:
        break;
    }
  });
  results.fileTxs.forEach((tx) => {
    totalAddresses.push(tx.owner);
    switch (tx.appName) {
      case "ArDrive-Web":
        webAddresses.push(tx.owner);
        break;
      case "ArDrive-CLI":
        cliAddresses.push(tx.owner);
        break;
      case "ArDrive-Sync":
        syncAddresses.push(tx.owner);
        break;
      case "ArDrive-Mobile":
        mobileAddresses.push(tx.owner);
        break;
      case "ArDrive-Core":
        coreAddresses.push(tx.owner);
        break;
      case "ArDrive-Desktop":
        desktopAddresses.push(tx.owner);
        break;
      case "ArConnect":
        arconnectAddresses.push(tx.owner);
        break;
      default:
        break;
    }
  });
  results.folderTxs.forEach((tx) => {
    totalAddresses.push(tx.owner);
    switch (tx.appName) {
      case "ArDrive-Web":
        webAddresses.push(tx.owner);
        break;
      case "ArDrive-CLI":
        cliAddresses.push(tx.owner);
        break;
      case "ArDrive-Sync":
        syncAddresses.push(tx.owner);
        break;
      case "ArDrive-Mobile":
        mobileAddresses.push(tx.owner);
        break;
      case "ArDrive-Core":
        coreAddresses.push(tx.owner);
        break;
      case "ArDrive-Desktop":
        desktopAddresses.push(tx.owner);
        break;
      case "ArConnect":
        arconnectAddresses.push(tx.owner);
        break;
      default:
        break;
    }
  });
  results.driveTxs.forEach((tx) => {
    totalAddresses.push(tx.owner);
    switch (tx.appName) {
      case "ArDrive-Web":
        webAddresses.push(tx.owner);
        break;
      case "ArDrive-CLI":
        cliAddresses.push(tx.owner);
        break;
      case "ArDrive-Sync":
        syncAddresses.push(tx.owner);
        break;
      case "ArDrive-Mobile":
        mobileAddresses.push(tx.owner);
        break;
      case "ArDrive-Core":
        coreAddresses.push(tx.owner);
        break;
      case "ArDrive-Desktop":
        desktopAddresses.push(tx.owner);
        break;
      case "ArConnect":
        arconnectAddresses.push(tx.owner);
        break;
      default:
        break;
    }
  });

  const totalUniqueUsers = new Set(totalAddresses).size;
  let graphiteMessage = message + "24hr.totalUsers";
  await sendMessageToGraphite(graphiteMessage, totalUniqueUsers, end);

  const totalUniqueWebUsers = new Set(webAddresses).size;
  graphiteMessage = message + "24hr.webUsers";
  await sendMessageToGraphite(graphiteMessage, totalUniqueWebUsers, end);

  const totalUniqueCLIUsers = new Set(cliAddresses).size;
  graphiteMessage = message + "24hr.cliUsers";
  await sendMessageToGraphite(graphiteMessage, totalUniqueWebUsers, end);

  const totalUniqueSyncUsers = new Set(syncAddresses).size;
  graphiteMessage = message + "24hr.syncUsers";
  await sendMessageToGraphite(graphiteMessage, totalUniqueSyncUsers, end);

  const totalUniqueCoreUsers = new Set(coreAddresses).size;
  graphiteMessage = message + "24hr.coreUsers";
  await sendMessageToGraphite(graphiteMessage, totalUniqueCoreUsers, end);

  const totalUniqueMobileUsers = new Set(mobileAddresses).size;
  graphiteMessage = message + "24hr.mobileUsers";
  await sendMessageToGraphite(graphiteMessage, totalUniqueMobileUsers, end);

  const totalUniqueDesktopUsers = new Set(desktopAddresses).size;
  graphiteMessage = message + "24hr.desktopUsers";
  await sendMessageToGraphite(graphiteMessage, totalUniqueDesktopUsers, end);

  const totalUniqueArConnectUsers = new Set(arconnectAddresses).size;
  graphiteMessage = message + "24hr.ArConnectUsers";
  await sendMessageToGraphite(graphiteMessage, totalUniqueArConnectUsers, end);

  console.log(`Total Unique Users found: ${totalUniqueUsers}`);
  console.log(`Total Unique Web Users found: ${totalUniqueWebUsers}`);
  console.log(`Total Unique CLI Users found: ${totalUniqueCLIUsers}`);
  console.log(`Total Unique Sync Users found: ${totalUniqueSyncUsers}`);
  console.log(`Total Unique Core Users found: ${totalUniqueCoreUsers}`);
  console.log(`Total Unique Mobile Users found: ${totalUniqueMobileUsers}`);
  console.log(`Total Unique Desktop Users found: ${totalUniqueDesktopUsers}`);
  console.log(
    `Total Unique ArConnect Users found: ${totalUniqueArConnectUsers}`
  );
}

export async function sendFileDataToGraphite(
  message: string,
  txs: ArFSFileDataTx[],
  end: Date
) {
  const type = ".fileData";
  // console.log("Sending File Data Txs to Graphite", end);
  const appNames: string[] = [...new Set(txs.map((item) => item.appName))];

  await asyncForEach(appNames, async (appName: string) => {
    // Public
    let privacy = ".public";
    const publicTxs = txs.filter(
      (item) => item.appName === appName && item.private === false
    ).length;
    const publicDataItems = txs.filter(
      (item) =>
        item.appName === appName && item.fee === 0 && item.private === false
    ).length; // If the data has no fee, then it must be a data item
    const publicV2Txs = txs.filter(
      (item) =>
        item.appName === appName &&
        item.bundledIn === "" &&
        item.fee !== 0 &&
        item.private === false
    ).length;
    const publicAppTips = txs
      .filter((item) => item.appName === appName)
      .map((item) => item.quantity)
      .reduce((prev, curr) => prev + curr, 0);
    const publicV2DataSize = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.dataSize)
      .reduce((prev, curr) => prev + curr, 0);
    const publicDataItemSize = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.dataItemSize)
      .reduce((prev, curr) => prev + curr, 0);
    const publicFees = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.fee)
      .reduce((prev, curr) => prev + curr, 0);
    const publicAvgFileDataSize =
      (publicV2DataSize + publicDataItemSize) / publicTxs;

    let graphiteMessage = message + appName + privacy + type + ".totalTxs";
    await sendMessageToGraphite(graphiteMessage, publicTxs, end);
    graphiteMessage = message + appName + privacy + type + ".l2Txs";
    await sendMessageToGraphite(graphiteMessage, publicDataItems, end);
    graphiteMessage = message + appName + privacy + type + ".l1Txs";
    await sendMessageToGraphite(graphiteMessage, publicV2Txs, end);
    graphiteMessage = message + appName + privacy + type + ".l1DataSize";
    await sendMessageToGraphite(graphiteMessage, publicV2DataSize, end);
    graphiteMessage = message + appName + privacy + type + ".l2DataSize";
    await sendMessageToGraphite(graphiteMessage, publicDataItemSize, end);
    graphiteMessage = message + appName + privacy + type + ".averageFileSize";
    await sendMessageToGraphite(graphiteMessage, publicAvgFileDataSize, end);
    graphiteMessage = message + appName + privacy + type + ".fees";
    await sendMessageToGraphite(graphiteMessage, publicFees, end);
    graphiteMessage = message + appName + type + ".tips";
    await sendMessageToGraphite(graphiteMessage, publicAppTips, end);

    console.log("  - %s", appName);
    console.log("      - %s", privacy);
    console.log(
      "      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s",
      type,
      publicTxs,
      publicV2Txs,
      publicDataItems,
      publicFees
    );
    console.log(
      "      - V2Data: %s bytes, DataItem Data: %s bytes",
      publicV2DataSize,
      publicDataItemSize
    );

    // Private
    privacy = ".private";
    const privateTxs = txs.filter(
      (item) => item.appName === appName && item.private === true
    ).length;
    const privateDataItems = txs.filter(
      (item) =>
        item.appName === appName && item.fee === 0 && item.private === true
    ).length; // If the data has no fee, then it must be a data item
    const privateV2Txs = txs.filter(
      (item) =>
        item.appName === appName &&
        item.bundledIn === "" &&
        item.fee !== 0 &&
        item.private === true
    ).length;
    const privateAppTips = txs
      .filter((item) => item.appName === appName)
      .map((item) => item.quantity)
      .reduce((prev, curr) => prev + curr, 0);
    const privateV2DataSize = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.dataSize)
      .reduce((prev, curr) => prev + curr, 0);
    const privateDataItemSize = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.dataItemSize)
      .reduce((prev, curr) => prev + curr, 0);
    const privateFees = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.fee)
      .reduce((prev, curr) => prev + curr, 0);
    const privateAvgFileDataSize =
      (privateV2DataSize + privateDataItemSize) / privateTxs;

    graphiteMessage = message + appName + privacy + type + ".totalTxs";
    await sendMessageToGraphite(graphiteMessage, privateTxs, end);
    graphiteMessage = message + appName + privacy + type + ".l2Txs";
    await sendMessageToGraphite(graphiteMessage, privateDataItems, end);
    graphiteMessage = message + appName + privacy + type + ".l1Txs";
    await sendMessageToGraphite(graphiteMessage, privateV2Txs, end);
    graphiteMessage = message + appName + privacy + type + ".l1DataSize";
    await sendMessageToGraphite(graphiteMessage, privateV2DataSize, end);
    graphiteMessage = message + appName + privacy + type + ".l2DataSize";
    await sendMessageToGraphite(graphiteMessage, privateDataItemSize, end);
    graphiteMessage =
      message + appName + privacy + type + ".averageFileDataSize";
    await sendMessageToGraphite(graphiteMessage, privateAvgFileDataSize, end);
    graphiteMessage = message + appName + privacy + type + ".fees";
    await sendMessageToGraphite(graphiteMessage, privateFees, end);
    graphiteMessage = message + appName + type + ".tips";
    await sendMessageToGraphite(graphiteMessage, privateAppTips, end);

    console.log("  - %s", appName);
    console.log("      - %s", privacy);
    console.log(
      "      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s",
      type,
      privateTxs,
      privateV2Txs,
      privateDataItems,
      privateFees
    );
    console.log(
      "      - V2Data: %s bytes, DataItem Data: %s bytes",
      privateV2DataSize,
      privateDataItemSize
    );

    // Count the different content types
    const contentTypes: string[] = [
      ...new Set(
        txs
          .filter((item) => item.appName === appName)
          .map((item) => item.contentType)
      ),
    ];
    await asyncForEach(contentTypes, async (contentType: string) => {
      const contentTypeCount = txs.filter(
        (item) => item.appName === appName && item.contentType === contentType
      ).length;
      graphiteMessage = message + appName + ".contentTypes." + contentType;
      await sendMessageToGraphite(graphiteMessage, contentTypeCount, end);
    });
  });
}

export async function sendFileDataSizeOnlyToGraphite(
  message: string,
  txs: ArFSFileDataTx[],
  end: Date
) {
  // console.log("Sending File Data Txs to Graphite", end);
  const appNames: string[] = [...new Set(txs.map((item) => item.appName))];
  const type = ".fileData2";

  await asyncForEach(appNames, async (appName: string) => {
    // Public
    let privacy = ".public";
    const publicTxs = txs.filter(
      (item) => item.appName === appName && item.private === false
    ).length;
    const publicDataItems = txs.filter(
      (item) =>
        item.appName === appName && item.fee === 0 && item.private === false
    ).length; // If the data has no fee, then it must be a data item
    const publicV2Txs = txs.filter(
      (item) =>
        item.appName === appName &&
        item.bundledIn === "" &&
        item.fee !== 0 &&
        item.private === false
    ).length;
    const publicV2DataSize = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.dataSize)
      .reduce((prev, curr) => prev + curr, 0);
    const publicDataItemSize = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.dataItemSize)
      .reduce((prev, curr) => prev + curr, 0);
    const publicFees = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.fee)
      .reduce((prev, curr) => prev + curr, 0);

    let graphiteMessage = message + appName + privacy + type + ".l1DataSize";
    await sendMessageToGraphite(graphiteMessage, publicV2DataSize, end);
    console.log("  - %s", appName);
    console.log("      - %s", privacy);
    console.log(
      "      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s",
      type,
      publicTxs,
      publicV2Txs,
      publicDataItems,
      publicFees
    );
    console.log(
      "      - V2Data: %s bytes, DataItem Data: %s bytes",
      publicV2DataSize,
      publicDataItemSize
    );

    // Private
    privacy = ".private";
    const privateTxs = txs.filter(
      (item) => item.appName === appName && item.private === true
    ).length;
    const privateDataItems = txs.filter(
      (item) =>
        item.appName === appName && item.fee === 0 && item.private === true
    ).length; // If the data has no fee, then it must be a data item
    const privateV2Txs = txs.filter(
      (item) =>
        item.appName === appName &&
        item.bundledIn === "" &&
        item.fee !== 0 &&
        item.private === true
    ).length;
    const privateV2DataSize = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.dataSize)
      .reduce((prev, curr) => prev + curr, 0);
    const privateDataItemSize = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.dataItemSize)
      .reduce((prev, curr) => prev + curr, 0);
    const privateFees = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.fee)
      .reduce((prev, curr) => prev + curr, 0);

    graphiteMessage = message + appName + privacy + type + ".l1DataSize";
    await sendMessageToGraphite(graphiteMessage, privateV2DataSize, end);

    console.log("  - %s", appName);
    console.log("      - %s", privacy);
    console.log(
      "      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s",
      type,
      privateTxs,
      privateV2Txs,
      privateDataItems,
      privateFees
    );
    console.log(
      "      - V2Data: %s bytes, DataItem Data: %s bytes",
      privateV2DataSize,
      privateDataItemSize
    );
  });
}

export async function sendFileMetadataToGraphite(
  message: string,
  txs: ArFSFileTx[],
  end: Date
) {
  // console.log("Sending File Metadata Txs to Graphite", end);
  const appNames: string[] = [...new Set(txs.map((item) => item.appName))];
  const type = ".fileMetaData";
  await asyncForEach(appNames, async (appName: string) => {
    // Public
    let privacy = ".public";
    const publicTxs = txs.filter(
      (item) => item.appName === appName && item.private === false
    ).length;
    const publicDataItems = txs.filter(
      (item) =>
        item.appName === appName && item.fee === 0 && item.private === false
    ).length; // If the data has no fee, then it must be a data item
    const publicV2Txs = txs.filter(
      (item) =>
        item.appName === appName &&
        item.bundledIn === "" &&
        item.fee !== 0 &&
        item.private === false
    ).length;
    const publicV2DataSize = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.dataSize)
      .reduce((prev, curr) => prev + curr, 0);
    const publicDataItemSize = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.dataItemSize)
      .reduce((prev, curr) => prev + curr, 0);
    const publicFees = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.fee)
      .reduce((prev, curr) => prev + curr, 0);

    let graphiteMessage = message + appName + privacy + type + ".totalTxs";
    await sendMessageToGraphite(graphiteMessage, publicTxs, end);
    graphiteMessage = message + appName + privacy + type + ".l2Txs";
    await sendMessageToGraphite(graphiteMessage, publicDataItems, end);
    graphiteMessage = message + appName + privacy + type + ".l1Txs";
    await sendMessageToGraphite(graphiteMessage, publicV2Txs, end);
    graphiteMessage = message + appName + privacy + type + ".l1DataSize";
    await sendMessageToGraphite(graphiteMessage, publicV2DataSize, end);
    graphiteMessage = message + appName + privacy + type + ".l2DataSize";
    await sendMessageToGraphite(graphiteMessage, publicDataItemSize, end);
    graphiteMessage = message + appName + privacy + type + ".fees";
    await sendMessageToGraphite(graphiteMessage, publicFees, end);

    console.log("  - %s", appName);
    console.log("      - %s", privacy);
    console.log(
      "      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s",
      type,
      publicTxs,
      publicV2Txs,
      publicDataItems,
      publicFees
    );
    console.log(
      "      - V2Data: %s bytes, DataItem Data: %s bytes",
      publicV2DataSize,
      publicDataItemSize
    );

    // Private
    privacy = ".private";
    const privateTxs = txs.filter(
      (item) => item.appName === appName && item.private === true
    ).length;
    const privateDataItems = txs.filter(
      (item) =>
        item.appName === appName && item.fee === 0 && item.private === true
    ).length; // If the data has no fee, then it must be a data item
    const privateV2Txs = txs.filter(
      (item) =>
        item.appName === appName &&
        item.bundledIn === "" &&
        item.fee !== 0 &&
        item.private === true
    ).length;
    const privateV2DataSize = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.dataSize)
      .reduce((prev, curr) => prev + curr, 0);
    const privateDataItemSize = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.dataItemSize)
      .reduce((prev, curr) => prev + curr, 0);
    const privateFees = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.fee)
      .reduce((prev, curr) => prev + curr, 0);

    graphiteMessage = message + appName + privacy + type + ".totalTxs";
    await sendMessageToGraphite(graphiteMessage, privateTxs, end);
    graphiteMessage = message + appName + privacy + type + ".l2Txs";
    await sendMessageToGraphite(graphiteMessage, privateDataItems, end);
    graphiteMessage = message + appName + privacy + type + ".l1Txs";
    await sendMessageToGraphite(graphiteMessage, privateV2Txs, end);
    graphiteMessage = message + appName + privacy + type + ".l1DataSize";
    await sendMessageToGraphite(graphiteMessage, privateV2DataSize, end);
    graphiteMessage = message + appName + privacy + type + ".l2DataSize";
    await sendMessageToGraphite(graphiteMessage, privateDataItemSize, end);
    graphiteMessage = message + appName + privacy + type + ".fees";
    await sendMessageToGraphite(graphiteMessage, privateFees, end);

    console.log("  - %s", appName);
    console.log("      - %s", privacy);
    console.log(
      "      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s",
      type,
      privateTxs,
      privateV2Txs,
      privateDataItems,
      privateFees
    );
    console.log(
      "      - V2Data: %s bytes, DataItem Data: %s bytes",
      privateV2DataSize,
      privateDataItemSize
    );
  });
}

export async function sendFolderMetadataToGraphite(
  message: string,
  txs: ArFSFolderTx[],
  end: Date
) {
  //console.log("Sending Folder Metadata Txs to Graphite", end);
  const appNames: string[] = [...new Set(txs.map((item) => item.appName))];
  const type = ".folderMetaData";
  await asyncForEach(appNames, async (appName: string) => {
    // Public
    let privacy = ".public";
    const publicTxs = txs.filter(
      (item) => item.appName === appName && item.private === false
    ).length;
    const publicDataItems = txs.filter(
      (item) =>
        item.appName === appName && item.fee === 0 && item.private === false
    ).length; // If the data has no fee, then it must be a data item
    const publicV2Txs = txs.filter(
      (item) =>
        item.appName === appName &&
        item.bundledIn === "" &&
        item.fee !== 0 &&
        item.private === false
    ).length;
    const publicV2DataSize = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.dataSize)
      .reduce((prev, curr) => prev + curr, 0);
    const publicDataItemSize = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.dataItemSize)
      .reduce((prev, curr) => prev + curr, 0);
    const publicFees = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.fee)
      .reduce((prev, curr) => prev + curr, 0);

    let graphiteMessage = message + appName + privacy + type + ".totalTxs";
    await sendMessageToGraphite(graphiteMessage, publicTxs, end);
    graphiteMessage = message + appName + privacy + type + ".l2Txs";
    await sendMessageToGraphite(graphiteMessage, publicDataItems, end);
    graphiteMessage = message + appName + privacy + type + ".l1Txs";
    await sendMessageToGraphite(graphiteMessage, publicV2Txs, end);
    graphiteMessage = message + appName + privacy + type + ".l1DataSize";
    await sendMessageToGraphite(graphiteMessage, publicV2DataSize, end);
    graphiteMessage = message + appName + privacy + type + ".l2DataSize";
    await sendMessageToGraphite(graphiteMessage, publicDataItemSize, end);
    graphiteMessage = message + appName + privacy + type + ".fees";
    await sendMessageToGraphite(graphiteMessage, publicFees, end);

    console.log("  - %s", appName);
    console.log("      - %s", privacy);
    console.log(
      "      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s",
      type,
      publicTxs,
      publicV2Txs,
      publicDataItems,
      publicFees
    );
    console.log(
      "      - V2Data: %s bytes, DataItem Data: %s bytes",
      publicV2DataSize,
      publicDataItemSize
    );

    // Private
    privacy = ".private";
    const privateTxs = txs.filter(
      (item) => item.appName === appName && item.private === true
    ).length;
    const privateDataItems = txs.filter(
      (item) =>
        item.appName === appName && item.fee === 0 && item.private === true
    ).length; // If the data has no fee, then it must be a data item
    const privateV2Txs = txs.filter(
      (item) =>
        item.appName === appName &&
        item.bundledIn === "" &&
        item.fee !== 0 &&
        item.private === true
    ).length;
    const privateV2DataSize = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.dataSize)
      .reduce((prev, curr) => prev + curr, 0);
    const privateDataItemSize = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.dataItemSize)
      .reduce((prev, curr) => prev + curr, 0);
    const privateFees = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.fee)
      .reduce((prev, curr) => prev + curr, 0);

    graphiteMessage = message + appName + privacy + type + ".totalTxs";
    await sendMessageToGraphite(graphiteMessage, privateTxs, end);
    graphiteMessage = message + appName + privacy + type + ".l2Txs";
    await sendMessageToGraphite(graphiteMessage, privateDataItems, end);
    graphiteMessage = message + appName + privacy + type + ".l1Txs";
    await sendMessageToGraphite(graphiteMessage, privateV2Txs, end);
    graphiteMessage = message + appName + privacy + type + ".l1DataSize";
    await sendMessageToGraphite(graphiteMessage, privateV2DataSize, end);
    graphiteMessage = message + appName + privacy + type + ".l2DataSize";
    await sendMessageToGraphite(graphiteMessage, privateDataItemSize, end);
    graphiteMessage = message + appName + privacy + type + ".fees";
    await sendMessageToGraphite(graphiteMessage, privateFees, end);

    console.log("  - %s", appName);
    console.log("      - %s", privacy);
    console.log(
      "      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s",
      type,
      privateTxs,
      privateV2Txs,
      privateDataItems,
      privateFees
    );
    console.log(
      "      - V2Data: %s bytes, DataItem Data: %s bytes",
      privateV2DataSize,
      privateDataItemSize
    );
  });
}

export async function sendDriveMetadataToGraphite(
  message: string,
  txs: ArFSFolderTx[],
  end: Date
) {
  // console.log("Sending Drive Metadata Txs to Graphite", end);
  const appNames: string[] = [...new Set(txs.map((item) => item.appName))];
  const type = ".driveMetaData";
  await asyncForEach(appNames, async (appName: string) => {
    // Public
    let privacy = ".public";
    const publicTxs = txs.filter(
      (item) => item.appName === appName && item.private === false
    ).length;
    const publicDataItems = txs.filter(
      (item) =>
        item.appName === appName && item.fee === 0 && item.private === false
    ).length; // If the data has no fee, then it must be a data item
    const publicV2Txs = txs.filter(
      (item) =>
        item.appName === appName &&
        item.bundledIn === "" &&
        item.fee !== 0 &&
        item.private === false
    ).length;
    const publicV2DataSize = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.dataSize)
      .reduce((prev, curr) => prev + curr, 0);
    const publicDataItemSize = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.dataItemSize)
      .reduce((prev, curr) => prev + curr, 0);
    const publicFees = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.fee)
      .reduce((prev, curr) => prev + curr, 0);

    let graphiteMessage = message + appName + privacy + type + ".totalTxs";
    await sendMessageToGraphite(graphiteMessage, publicTxs, end);
    graphiteMessage = message + appName + privacy + type + ".l2Txs";
    await sendMessageToGraphite(graphiteMessage, publicDataItems, end);
    graphiteMessage = message + appName + privacy + type + ".l1Txs";
    await sendMessageToGraphite(graphiteMessage, publicV2Txs, end);
    graphiteMessage = message + appName + privacy + type + ".l1DataSize";
    await sendMessageToGraphite(graphiteMessage, publicV2DataSize, end);
    graphiteMessage = message + appName + privacy + type + ".l2DataSize";
    await sendMessageToGraphite(graphiteMessage, publicDataItemSize, end);
    graphiteMessage = message + appName + privacy + type + ".fees";
    await sendMessageToGraphite(graphiteMessage, publicFees, end);

    console.log("  - %s", appName);
    console.log("      - %s", privacy);
    console.log(
      "      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s",
      type,
      publicTxs,
      publicV2Txs,
      publicDataItems,
      publicFees
    );
    console.log(
      "      - V2Data: %s bytes, DataItem Data: %s bytes",
      publicV2DataSize,
      publicDataItemSize
    );

    // Private
    privacy = ".private";
    const privateTxs = txs.filter(
      (item) => item.appName === appName && item.private === true
    ).length;
    const privateDataItems = txs.filter(
      (item) =>
        item.appName === appName && item.fee === 0 && item.private === true
    ).length; // If the data has no fee, then it must be a data item
    const privateV2Txs = txs.filter(
      (item) =>
        item.appName === appName &&
        item.bundledIn === "" &&
        item.fee !== 0 &&
        item.private === true
    ).length;
    const privateV2DataSize = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.dataSize)
      .reduce((prev, curr) => prev + curr, 0);
    const privateDataItemSize = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.dataItemSize)
      .reduce((prev, curr) => prev + curr, 0);
    const privateFees = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.fee)
      .reduce((prev, curr) => prev + curr, 0);

    graphiteMessage = message + appName + privacy + type + ".totalTxs";
    await sendMessageToGraphite(graphiteMessage, privateTxs, end);
    graphiteMessage = message + appName + privacy + type + ".l2Txs";
    await sendMessageToGraphite(graphiteMessage, privateDataItems, end);
    graphiteMessage = message + appName + privacy + type + ".l1Txs";
    await sendMessageToGraphite(graphiteMessage, privateV2Txs, end);
    graphiteMessage = message + appName + privacy + type + ".l1DataSize";
    await sendMessageToGraphite(graphiteMessage, privateV2DataSize, end);
    graphiteMessage = message + appName + privacy + type + ".l2DataSize";
    await sendMessageToGraphite(graphiteMessage, privateDataItemSize, end);
    graphiteMessage = message + appName + privacy + type + ".fees";
    await sendMessageToGraphite(graphiteMessage, privateFees, end);

    console.log("  - %s", appName);
    console.log("      - %s", privacy);
    console.log(
      "      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s",
      type,
      privateTxs,
      privateV2Txs,
      privateDataItems,
      privateFees
    );
    console.log(
      "      - V2Data: %s bytes, DataItem Data: %s bytes",
      privateV2DataSize,
      privateDataItemSize
    );
  });
}

export async function sendSnapshotMetadataToGraphite(
  message: string,
  txs: ArFSSnapshotTx[],
  end: Date
) {
  // console.log("Sending Drive Metadata Txs to Graphite", end);
  const appNames: string[] = [...new Set(txs.map((item) => item.appName))];
  const type = ".snapshot";
  await asyncForEach(appNames, async (appName: string) => {
    // Public
    let privacy = ".public";
    const publicTxs = txs.filter(
      (item) => item.appName === appName && item.private === false
    ).length;
    const publicDataItems = txs.filter(
      (item) =>
        item.appName === appName && item.fee === 0 && item.private === false
    ).length; // If the data has no fee, then it must be a data item
    const publicV2Txs = txs.filter(
      (item) =>
        item.appName === appName &&
        item.bundledIn === "" &&
        item.fee !== 0 &&
        item.private === false
    ).length;
    const publicV2DataSize = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.dataSize)
      .reduce((prev, curr) => prev + curr, 0);
    const publicDataItemSize = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.dataItemSize)
      .reduce((prev, curr) => prev + curr, 0);
    const publicFees = txs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.fee)
      .reduce((prev, curr) => prev + curr, 0);

    let graphiteMessage = message + appName + privacy + type + ".totalTxs";
    await sendMessageToGraphite(graphiteMessage, publicTxs, end);
    graphiteMessage = message + appName + privacy + type + ".l2Txs";
    await sendMessageToGraphite(graphiteMessage, publicDataItems, end);
    graphiteMessage = message + appName + privacy + type + ".l1Txs";
    await sendMessageToGraphite(graphiteMessage, publicV2Txs, end);
    graphiteMessage = message + appName + privacy + type + ".l1DataSize";
    await sendMessageToGraphite(graphiteMessage, publicV2DataSize, end);
    graphiteMessage = message + appName + privacy + type + ".l2DataSize";
    await sendMessageToGraphite(graphiteMessage, publicDataItemSize, end);
    graphiteMessage = message + appName + privacy + type + ".fees";
    await sendMessageToGraphite(graphiteMessage, publicFees, end);

    console.log("  - %s", appName);
    console.log("      - %s", privacy);
    console.log(
      "      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s",
      type,
      publicTxs,
      publicV2Txs,
      publicDataItems,
      publicFees
    );
    console.log(
      "      - V2Data: %s bytes, DataItem Data: %s bytes",
      publicV2DataSize,
      publicDataItemSize
    );

    // Private
    privacy = ".private";
    const privateTxs = txs.filter(
      (item) => item.appName === appName && item.private === true
    ).length;
    const privateDataItems = txs.filter(
      (item) =>
        item.appName === appName && item.fee === 0 && item.private === true
    ).length; // If the data has no fee, then it must be a data item
    const privateV2Txs = txs.filter(
      (item) =>
        item.appName === appName &&
        item.bundledIn === "" &&
        item.fee !== 0 &&
        item.private === true
    ).length;
    const privateV2DataSize = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.dataSize)
      .reduce((prev, curr) => prev + curr, 0);
    const privateDataItemSize = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.dataItemSize)
      .reduce((prev, curr) => prev + curr, 0);
    const privateFees = txs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.fee)
      .reduce((prev, curr) => prev + curr, 0);

    graphiteMessage = message + appName + privacy + type + ".totalTxs";
    await sendMessageToGraphite(graphiteMessage, privateTxs, end);
    graphiteMessage = message + appName + privacy + type + ".l2Txs";
    await sendMessageToGraphite(graphiteMessage, privateDataItems, end);
    graphiteMessage = message + appName + privacy + type + ".l1Txs";
    await sendMessageToGraphite(graphiteMessage, privateV2Txs, end);
    graphiteMessage = message + appName + privacy + type + ".l1DataSize";
    await sendMessageToGraphite(graphiteMessage, privateV2DataSize, end);
    graphiteMessage = message + appName + privacy + type + ".l2DataSize";
    await sendMessageToGraphite(graphiteMessage, privateDataItemSize, end);
    graphiteMessage = message + appName + privacy + type + ".fees";
    await sendMessageToGraphite(graphiteMessage, privateFees, end);

    console.log("  - %s", appName);
    console.log("      - %s", privacy);
    console.log(
      "      - %s Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s",
      type,
      privateTxs,
      privateV2Txs,
      privateDataItems,
      privateFees
    );
    console.log(
      "      - V2Data: %s bytes, DataItem Data: %s bytes",
      privateV2DataSize,
      privateDataItemSize
    );
  });
}

export async function sentL1CommunityTipsToGraphite(
  message: string,
  txs: ArFSTipTx[],
  end: Date
) {
  // console.log("Sending Tip Txs to Graphite", end);
  const appNames: string[] = [...new Set(txs.map((item) => item.appName))];
  await asyncForEach(appNames, async (appName: string) => {
    const appTipTxs = txs.filter((item) => item.appName === appName).length;
    const appTipQuantity = txs
      .filter((item) => item.appName === appName)
      .map((item) => item.quantity)
      .reduce((prev, curr) => prev + curr, 0);
    const averageTipSize = appTipQuantity / appTipTxs;
    console.log("  - %s", appName);
    console.log(
      "      - V2 Tip Txs: %s, Tip Quantity: %s",
      appTipTxs,
      appTipQuantity
    );

    let graphiteMessage = message + appName + ".v2CommunityTip.totalTxs";
    await sendMessageToGraphite(graphiteMessage, appTipTxs, end);

    graphiteMessage = message + appName + ".v2CommunityTip.quantity";
    await sendMessageToGraphite(graphiteMessage, appTipQuantity, end);

    graphiteMessage = message + appName + ".v2CommunityTip.averageTipSize";
    await sendMessageToGraphite(graphiteMessage, averageTipSize, end);
  });
}

export async function sendResultsToGraphite(results: Results) {
  const today = results.endDate;
  await sendMessageToGraphite(
    "ardrive.users.total",
    results.totalArDriveUsers,
    today
  );
  await sendMessageToGraphite(
    "ardrive.users.new",
    results.newArDriveUsers,
    today
  );
  await sendMessageToGraphite(
    "ardrive.users.averageUserSize",
    results.averageUserSize,
    today
  );
  await sendMessageToGraphite(
    "ardrive.users.averageUserFiles",
    results.averageUserFiles,
    today
  );
  await sendMessageToGraphite(
    "ardrive.drives.total",
    results.drivesFound,
    today
  );
  await sendMessageToGraphite(
    "ardrive.drives.public",
    results.publicDrives,
    today
  );
  await sendMessageToGraphite(
    "ardrive.drives.private",
    results.privateDrives,
    today
  );
  await sendMessageToGraphite(
    "ardrive.v2Data.total",
    results.totalDataSize,
    today
  );
  await sendMessageToGraphite(
    "ardrive.v2Data.public",
    results.publicData,
    today
  );
  await sendMessageToGraphite(
    "ardrive.v2Data.private",
    results.privateData,
    today
  );
  await sendMessageToGraphite("ardrive.files.total", results.totalFiles, today);
  await sendMessageToGraphite("ardrive.files.web", results.webAppFiles, today);
  await sendMessageToGraphite(
    "ardrive.files.desktop",
    results.desktopAppFiles,
    today
  );
  await sendMessageToGraphite(
    "ardrive.files.mobile",
    results.mobileAppFiles,
    today
  );
  await sendMessageToGraphite(
    "ardrive.files.core",
    results.coreAppFiles,
    today
  );
  await sendMessageToGraphite(
    "ardrive.files.core.arconnect",
    results.arConnectFiles,
    today
  );
  await sendMessageToGraphite("ardrive.files.cli", results.cliAppFiles, today);
  await sendMessageToGraphite(
    "ardrive.files.public",
    results.publicFiles,
    today
  );
  await sendMessageToGraphite(
    "ardrive.files.private",
    results.privateFiles,
    today
  );
  await sendMessageToGraphite(
    "ardrive.fees.community",
    results.totalCommunityFees,
    today
  );
  await sendMessageToGraphite(
    "ardrive.fees.mining",
    results.totalMiningFees,
    today
  );
  await sendMessageToGraphite(
    "ardrive.fees.desktop",
    results.desktopAppFees,
    today
  );
  await sendMessageToGraphite(
    "ardrive.fees.mobile",
    results.mobileAppFees,
    today
  );
  await sendMessageToGraphite("ardrive.fees.core", results.coreAppFees, today);
  await sendMessageToGraphite(
    "ardrive.fees.core.arconnect",
    results.arConnectFees,
    today
  );
  await sendMessageToGraphite("ardrive.fees.cli", results.cliAppFees, today);
  await sendMessageToGraphite("ardrive.fees.webapp", results.webAppFees, today);
  await sendMessageToGraphite(
    "ardrive.fees.public",
    results.publicArFees,
    today
  );
  await sendMessageToGraphite(
    "ardrive.fees.private",
    results.privateArFees,
    today
  );
  await sendMessageToGraphite(
    "ardrive.community.tokenHolders",
    results.tokenHolders,
    today
  );
  await sendMessageToGraphite(
    "arweave.blockHeight",
    results.blockHeight,
    today
  );
  await sendMessageToGraphite("arweave.weaveSize", results.weaveSize, today);
  await sendMessageToGraphite("arweave.difficuty", results.weaveSize, today);

  if (results.contentTypes !== undefined) {
    await asyncForEach(
      results.contentTypes,
      async (contentType: ContentType) => {
        let contentTypeGraphiteMessage = "ardrive.contenttypes.";
        contentTypeGraphiteMessage = contentTypeGraphiteMessage.concat(
          contentType.contentType
        );
        await sendMessageToGraphite(
          contentTypeGraphiteMessage,
          contentType.count,
          today
        );
      }
    );
  }

  return "Success";
}

// Takes the ardrive community fees and exports to graphite/grafana dashboard, using friendly name for the grouping
export async function sendArDriveCommunityFinancesToGraphite(
  communityFee: ArDriveCommunityFee
) {
  try {
    const date = new Date(communityFee.blockTime * 1000);
    let arDriveFinancesMessage =
      "ardrive.finances." + communityFee.friendlyName + ".";

    let graphiteMessage = arDriveFinancesMessage + "amount.ar";
    await sendMessageToGraphite(graphiteMessage, communityFee.amountAR, date);

    graphiteMessage = arDriveFinancesMessage + "amount.usd";
    await sendMessageToGraphite(graphiteMessage, communityFee.amountUSD, date);

    graphiteMessage =
      arDriveFinancesMessage + "tipType." + communityFee.tip + ".";
    await sendMessageToGraphite(graphiteMessage, 1, date);
  } catch (err) {
    console.log(err);
    console.log("Error sending community fees to graphite");
  }
  return "Success";
}

// Sends a message to the ardrive graphite server
export async function sendMessageToGraphite(
  path: string,
  value: number,
  timeStamp: Date
) {
  try {
    const message =
      path +
      " " +
      value.toString() +
      " " +
      Math.floor(timeStamp.getTime() / 1000) +
      "\n";
    let net = require("net");
    let socket = new net.createConnection(
      2003,
      "stats.ardrive.io",
      function () {
        socket.write(message);
        socket.end("completed!");
      }
    );
    socket.on("error", async function () {
      console.log("Connection error");
      socket.end("completed!");
      await sleep(5000);
      await sendMessageToGraphite(path, value, timeStamp);
    });
  } catch (err) {
    console.log(err);
    console.log("Error sending message to graphite");
  }
}
