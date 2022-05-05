import { appNames, asyncForEach } from "./common";
import { getAllAppTransactionsWithBlocks_DESC} from "./gql";
import { ResultSet } from "./types";

async function main() {
  let allResults: ResultSet = {
    bundleTxs: [],
    fileDataTxs: [],
    fileTxs: [],
    folderTxs: [],
    driveTxs: [],
    tipTxs: [],
    lastBlock: 0
  };

  let results: ResultSet = {
    bundleTxs: [],
    fileDataTxs: [],
    fileTxs: [],
    folderTxs: [],
    driveTxs: [],
    tipTxs: [],
    lastBlock: 0
  };

  // let start = new Date(2020, 8, 26); // the beginning history of ardrive
  let minBlock = 900000;
  let maxBlock = 900010;

  console.log(
    "Running analytics from %s to %s",
    minBlock,
    maxBlock
  );
  console.log(
    "--------------------------------------------------------------------------------"
  );

  await asyncForEach(appNames, async (appName: string) => {
    results = await getAllAppTransactionsWithBlocks_DESC(minBlock, maxBlock, appName);

    /*console.log("Results for %s", appName);
    console.log(" - BundledTxs: %s", results.bundleTxs.length);
    console.log(" - FileDataTxs: %s", results.fileDataTxs.length);
    console.log(" - FileTxs: %s", results.fileTxs.length);
    console.log(" - FolderTxs: %s", results.folderTxs.length);
    console.log(" - DriveTxs: %s", results.driveTxs.length);
    console.log(" - V2 Tips: %s", results.tipTxs.length);
    console.log(" - Last Block Found %s", results.lastBlock);*/

    allResults.bundleTxs = allResults.bundleTxs.concat(results.bundleTxs);
    allResults.fileDataTxs = allResults.fileDataTxs.concat(results.fileDataTxs);
    allResults.fileTxs = allResults.fileTxs.concat(results.fileTxs);
    allResults.folderTxs = allResults.folderTxs.concat(results.folderTxs);
    allResults.driveTxs = allResults.driveTxs.concat(results.driveTxs);
    allResults.tipTxs = allResults.tipTxs.concat(
      results.tipTxs
    );
  });
  console.log(
    "--------------------------------------------------------------------------------"
  );
  console.log("All Bundle Results");
  await asyncForEach(appNames, async (appName: string) => {
    const appBundles = allResults.bundleTxs.filter(
      (item) => item.appName === appName
    ).length;
    const appData = allResults.bundleTxs
      .filter((item) => item.appName === appName)
      .map((item) => item.dataSize)
      .reduce((prev, curr) => prev + curr, 0);
    const appTips = allResults.bundleTxs
      .filter((item) => item.appName === appName)
      .map((item) => item.quantity)
      .reduce((prev, curr) => prev + curr, 0);
    const appFees = allResults.bundleTxs
      .filter((item) => item.appName === appName)
      .map((item) => item.fee)
      .reduce((prev, curr) => prev + curr, 0);
    console.log("  - %s", appName);
    console.log(
      "      - Bundles: %s Data: %s Tips: %s Fees: %s",
      appBundles,
      appData,
      appTips,
      appFees
    );
  })

  console.log ("All File Data Results");
  await asyncForEach(appNames, async (appName: string) => {
    // Public
    let privacy = "public";
    const publicTxs = allResults.fileDataTxs.filter(
      (item) => item.appName === appName && item.private === false
    ).length;
    const publicDataItems = allResults.fileDataTxs.filter(
      (item) =>
        item.appName === appName && item.fee === 0 && item.private === false
    ).length; // If the data has no fee, then it must be a data item
    const publicV2Txs = allResults.fileDataTxs.filter(
      (item) =>
        item.appName === appName &&
        item.bundledIn === "" &&
        item.fee !== 0 &&
        item.private === false
    ).length;
    const publicV2DataSize = allResults.fileDataTxs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.dataSize)
      .reduce((prev, curr) => prev + curr, 0);
    const publicDataItemSize = allResults.fileDataTxs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.dataItemSize)
      .reduce((prev, curr) => prev + curr, 0);
    const publicFees = allResults.fileDataTxs
      .filter((item) => item.appName === appName && item.private === false)
      .map((item) => item.fee)
      .reduce((prev, curr) => prev + curr, 0);

    console.log("  - %s", appName);
    console.log("      - %s", privacy);
    console.log(
      "      - Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s",
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
    privacy = 'private';
    const privateTxs = allResults.fileDataTxs.filter(
      (item) => item.appName === appName && item.private === true
    ).length;
    const privateDataItems = allResults.fileDataTxs.filter(
      (item) =>
        item.appName === appName && item.fee === 0 && item.private === true
    ).length; // If the data has no fee, then it must be a data item
    const privateV2Txs = allResults.fileDataTxs.filter(
      (item) =>
        item.appName === appName &&
        item.bundledIn === "" &&
        item.fee !== 0 &&
        item.private === true
    ).length;
    const privateV2DataSize = allResults.fileDataTxs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.dataSize)
      .reduce((prev, curr) => prev + curr, 0);
    const privateDataItemSize = allResults.fileDataTxs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.dataItemSize)
      .reduce((prev, curr) => prev + curr, 0);
    const privateFees = allResults.fileDataTxs
      .filter((item) => item.appName === appName && item.private === true)
      .map((item) => item.fee)
      .reduce((prev, curr) => prev + curr, 0);

    console.log("  - %s", appName);
    console.log("      - %s", privacy);
    console.log(
      "      - Txs: %s, V2Txs: %s, DataItemTxs: %s, Fees: %s",
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

  console.log("BundledTxs: %s", allResults.bundleTxs.length);
  console.log("FileDataTxs: %s", allResults.fileDataTxs.length);
  console.log("FileTxs: %s", allResults.fileTxs.length);
  console.log("FolderTxs: %s", allResults.folderTxs.length);
  console.log("DriveTxs: %s", allResults.driveTxs.length);
  console.log("V2 Tips: %s", allResults.tipTxs.length);
}

main();
