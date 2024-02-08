import {
  getMinBlock,
  newArFSDriveTx,
  newArFSFileDataTx,
  newArFSFileTx,
  newArFSFolderTx,
  newArFSSnapshotTx,
  newArFSTipTx,
  newBundleTx,
  sleep,
} from "./utilities";
import {
  ArFSDriveTx,
  ArFSFileDataTx,
  ArFSFileTx,
  ArFSFolderTx,
  ArFSSnapshotTx,
  ArFSTipTx,
  BundleTx,
  ResultSet,
} from "./types";
import Arweave from "arweave";

export const arweave = Arweave.init({
  host: "arweave-search.goldsky.com", // Arweave Gateway
  port: 443,
  protocol: "https",
  timeout: 600000,
  logging: false,
});

export const L2gateways = ["https://arweave-search.goldsky.com"];

// Index of the currently used gateway into L2gateways.
let currentGateway: number = 0;

// How many pages to get from a gql query
let firstPage: number = 100; // Max size of query for GQL

// Switches to the next gateway in the L2gateways array
function switchGateway() {
  currentGateway = (currentGateway + 1) % L2gateways.length;
  console.log("Switched gateway to " + L2gateways[currentGateway]);
}

// Chooses the current gateway and runs a callback with it.
// If an error occurs, the call is retried and the gateway is switched automatically.
export async function queryGateway(
  query: (url: string) => Promise<any>
): Promise<any> {
  const initialGatewayIndex = currentGateway;
  let tries: number = 0;
  while (true) {
    try {
      return await query(L2gateways[currentGateway]);
    } catch (err) {
      console.log(err);
      console.log(
        "Gateway error with " + L2gateways[currentGateway] + ", retrying..."
      );
      tries += 1;
      await sleep(5000);
      if (tries >= 5) {
        tries = 0;
        switchGateway();
        if (currentGateway === initialGatewayIndex) {
          // We've tried all L2gateways, nothing left to do.
          return Promise.reject(err);
        }
      }
    }
  }
}

// Sums up every data transaction for a start and end period and returns newest results first
export async function getAllAppL2Transactions(
  start: Date,
  end: Date,
  appName: string,
  minBlock?: number
): Promise<ResultSet> {
  let cursor: string = "";
  let timeStamp = new Date(end);
  let hasNextPage = true;
  let lastBlock = 0;
  let missingDataErrors = 0;
  let bundleTxs: BundleTx[] = [];
  let fileTxs: ArFSFileTx[] = [];
  let folderTxs: ArFSFolderTx[] = [];
  let driveTxs: ArFSDriveTx[] = [];
  let snapshotTxs: ArFSSnapshotTx[] = [];
  let fileDataTxs: ArFSFileDataTx[] = [];
  let tipTxs: ArFSTipTx[] = [];
  let foundUsers: string[] = [];
  let foundTxs: number = 0;

  if (minBlock === undefined || minBlock === 0) {
    minBlock = await getMinBlock(start);
  }

  let appPlatformQuery = "";
  let appNameQuery;

  console.log(
    `   ...Querying for all ${appName} L2 Transactions starting at ${minBlock}`
  );

  while (hasNextPage) {
    let tags: string;
    if (appName === "ArDrive-App-Web") {
      appNameQuery = "ArDrive-App";
      appPlatformQuery = "Web";
      tags = `[
        { name: "App-Name", values: ["${appNameQuery}"]}
        { name: "App-Platform", values: ["${appPlatformQuery}"]}
      ]`;
    } else if (appName === "ArDrive-App-Android") {
      appNameQuery = "ArDrive-App";
      appPlatformQuery = "Android";
      tags = `[
        { name: "App-Name", values: ["${appNameQuery}"]}
        { name: "App-Platform", values: ["${appPlatformQuery}"]}
      ]`;
    } else if (appName === "ArDrive-App-iOS") {
      appNameQuery = "ArDrive-App";
      appPlatformQuery = "iOS";
      tags = `[
        { name: "App-Name", values: ["${appNameQuery}"]}
        { name: "App-Platform", values: ["${appPlatformQuery}"]}
      ]`;
    } else if (appName === "uploader-m") {
      appNameQuery = "ar-io.com Bundler M";
      tags = `[
        { name: "App-Name", values: ["${appNameQuery}"]}
      ]`;
    } else {
      tags = `[
        { name: "App-Name", values: ["${appName}"]}
      ]`;
    }

    const query = {
      query: `query {
          transactions(
            tags: ${tags}
            sort: HEIGHT_ASC
            block: {min: ${minBlock}}
            first: ${firstPage}
            after: "${cursor}"
          ) {
            pageInfo {
              hasNextPage
            }
            edges {
              cursor
              node {
                id
                bundledIn {
                    id
                }
                owner {
                    address
                }
                fee {
                    ar
                }
                quantity {
                    ar
                }
                tags {
                    name
                    value
                }
                data {
                  size
                }
                block {
                  height
                  timestamp
                }
              }
            }
          }
        }`,
    };

    try {
      const transactions = await queryGateway(async (url: string) => {
        const response = await arweave.api.post(url + "/graphql", query);
        const { data } = response.data;
        if (data === undefined) {
          console.log(response.statusText);
          console.log(response);
          console.log(
            "Get All L2 Transactions... Undefined data returned from Gateway"
          );
          missingDataErrors += 1;
          return 0;
        } else {
          const { transactions } = data;
          return transactions;
        }
      });
      if (transactions === 0) {
        console.log("%s Gateway returned an empty JSON ", timeStamp);
        await sleep(1000);
      } else {
        hasNextPage = transactions.pageInfo.hasNextPage;
        const { edges } = transactions;
        // console.log("Edges found %s", edges.length);
        for (let i = 0; i < edges.length; i += 1) {
          cursor = edges[i].cursor;
          const { node } = edges[i];
          const { block } = node;
          if (block !== null) {
            timeStamp = new Date(block.timestamp * 1000);
            if (
              start.getTime() <= timeStamp.getTime() &&
              end.getTime() >= timeStamp.getTime()
            ) {
              /*console.log(
                "Block: %s Tx: %s at Time: %s",
                lastBlock,
                node.id,
                timeStamp.toLocaleString()
              ); */
              // Prepare our files
              lastBlock = block.height;
              const { tags } = node;
              const { data } = node;
              const { fee } = node;
              let bundleTx = newBundleTx();
              let fileTx = newArFSFileTx();
              let fileDataTx = newArFSFileDataTx();
              let folderTx = newArFSFolderTx();
              let driveTx = newArFSDriveTx();
              let tipTx = newArFSTipTx();
              let snapshotTx = newArFSSnapshotTx();
              let encrypted = false;
              let contentType = "";
              let appVersion = "";
              let appPlatform;
              let appPlatformVersion;
              let clientName = "";
              let entityType = "data";
              let arFsVersion = "";
              let bundledIn = "";
              let bundleFormat = "";
              let communityTip = 0;
              let blockStart = 0;

              tags.forEach((tag: any) => {
                const key = tag.name;
                const { value } = tag;
                switch (key) {
                  case "Cipher-IV":
                    encrypted = true;
                    break;
                  case "Entity-Type":
                    entityType = value;
                    break;
                  case "Block-Start":
                    blockStart = value;
                    break;
                  case "Content-Type":
                    contentType = value;
                    break;
                  case "App-Platform":
                    appPlatform = value;
                    break;
                  case "App-Platform-Version":
                    appPlatformVersion = value;
                    break;
                  case "App-Version":
                    appVersion = value;
                    break;
                  case "ArFS":
                    arFsVersion = value;
                    break;
                  case "Bundle-Format":
                    bundleFormat = value;
                    break;
                  case "ArDrive-Client":
                    clientName = value;
                    break;
                  case "Tip-Type":
                    if (value === "data upload") {
                      communityTip = +node.quantity.ar;
                    }
                    break;
                  default:
                    break;
                }
              });

              if (clientName.includes("ArConnect")) {
                appName = "ArConnect";
              }
              if (bundleFormat === "binary") {
                // this is a bundle
                bundleTx.appName = appName;
                bundleTx.appVersion = appVersion;
                bundleTx.appPlatform = appPlatform;
                bundleTx.appPlatformVersion = appPlatformVersion;
                bundleTx.dataSize = +data.size;
                bundleTx.fee = +fee.ar;
                bundleTx.quantity = +node.quantity.ar;
                bundleTx.owner = node.owner.address;
                bundleTx.tags = tags;
                bundleTxs.push(bundleTx);
              } else if (communityTip !== 0 && contentType === "") {
                tipTx.appName = appName;
                tipTx.appVersion = appVersion;
                tipTx.appPlatform = appPlatform;
                tipTx.appPlatformVersion = appPlatformVersion;
                tipTx.owner = node.owner.address;
                tipTx.quantity = +communityTip;
                tipTx.id = node.id;
                tipTx.blockHeight = block.height;
                tipTx.blockTime = block.timestamp;
                tipTx.friendlyDate = timeStamp.toLocaleString();
                tipTx.tags = tags;
                tipTxs.push(tipTx);
              } else if (entityType === "data" && arFsVersion === "") {
                // This is file data since it has no entity tag
                fileDataTx.dataSize = +data.size;
                fileDataTx.appName = appName;
                fileDataTx.appVersion = appVersion;
                fileDataTx.appPlatform = appPlatform;
                fileDataTx.appPlatformVersion = appPlatformVersion;
                fileDataTx.owner = node.owner.address;
                fileDataTx.private = encrypted;
                fileDataTx.quantity = +node.quantity.ar;
                fileDataTx.fee = +fee.ar;
                fileDataTx.contentType = contentType;
                fileDataTx.bundledIn = bundledIn;
                fileDataTx.id = node.id;
                fileDataTx.blockHeight = block.height;
                fileDataTx.blockTime = block.timestamp;
                fileDataTx.friendlyDate = timeStamp.toLocaleString();
                fileDataTx.tags = tags;
                fileDataTxs.push(fileDataTx);
              } else if (entityType === "file") {
                fileTx.dataSize = +data.size;
                fileTx.appName = appName;
                fileTx.appVersion = appVersion;
                fileTx.appPlatform = appPlatform;
                fileTx.appPlatformVersion = appPlatformVersion;
                fileTx.arfsVersion = arFsVersion;
                fileTx.owner = node.owner.address;
                fileTx.private = encrypted;
                fileTx.fee = +fee.ar;
                fileTx.contentType = contentType;
                fileTx.bundledIn = bundledIn;
                fileTx.id = node.id;
                fileTx.blockHeight = block.height;
                fileTx.blockTime = block.timestamp;
                fileTx.friendlyDate = timeStamp.toLocaleString();
                fileTx.tags = tags;
                fileTxs.push(fileTx);
              } else if (entityType === "folder") {
                folderTx.dataSize = +data.size;
                folderTx.appName = appName;
                folderTx.appVersion = appVersion;
                folderTx.appPlatform = appPlatform;
                folderTx.appPlatformVersion = appPlatformVersion;
                folderTx.arfsVersion = arFsVersion;
                folderTx.owner = node.owner.address;
                folderTx.private = encrypted;
                folderTx.fee = +fee.ar;
                folderTx.contentType = contentType;
                folderTx.bundledIn = bundledIn;
                folderTx.id = node.id;
                folderTx.blockHeight = block.height;
                folderTx.blockTime = block.timestamp;
                folderTx.friendlyDate = timeStamp.toLocaleString();
                folderTx.tags = tags;
                folderTxs.push(folderTx);
              } else if (entityType === "drive") {
                driveTx.dataSize = +data.size;
                driveTx.appName = appName;
                driveTx.appVersion = appVersion;
                driveTx.arfsVersion = arFsVersion;
                driveTx.appPlatform = appPlatform;
                driveTx.appPlatformVersion = appPlatformVersion;
                driveTx.owner = node.owner.address;
                driveTx.private = encrypted;
                driveTx.fee = +fee.ar;
                driveTx.contentType = contentType;
                driveTx.bundledIn = bundledIn;
                driveTx.id = node.id;
                driveTx.blockHeight = block.height;
                driveTx.blockTime = block.timestamp;
                driveTx.friendlyDate = timeStamp.toLocaleString();
                driveTx.tags = tags;
                driveTxs.push(driveTx);
              } else if (entityType === "snapshot") {
                snapshotTx.dataSize = +data.size;
                snapshotTx.appName = appName;
                snapshotTx.appVersion = appVersion;
                snapshotTx.arfsVersion = arFsVersion;
                snapshotTx.appPlatform = appPlatform;
                snapshotTx.appPlatformVersion = appPlatformVersion;
                snapshotTx.owner = node.owner.address;
                snapshotTx.private = encrypted;
                snapshotTx.fee = +fee.ar;
                snapshotTx.blockStart = blockStart;
                snapshotTx.bundledIn = bundledIn;
                snapshotTx.id = node.id;
                snapshotTx.blockHeight = block.height;
                snapshotTx.blockTime = block.timestamp;
                snapshotTx.friendlyDate = timeStamp.toLocaleString();
                snapshotTx.tags = tags;
                snapshotTxs.push(snapshotTx);
              }

              foundUsers.push(node.owner.address);
              foundTxs += 1;
            } else if (timeStamp.getTime() > end.getTime()) {
              //console.log("Result too early %s", timeStamp);
              hasNextPage = false; // if it is ASC
              i = edges.length;
            } else if (timeStamp.getTime() < start.getTime()) {
              // console.log("Result too old %s", timeStamp);
              // hasNextPage = false; // if it is DESC
            } else {
              //console.log(
              //  "Block is null so we skip this transaction %s",
              //  node.Id
              //);
            }
          }
        }
      }
    } catch (err) {
      console.log(err);
      console.log("Error getting transactions at Blockheight: %s", lastBlock);
      hasNextPage = false;
    }
  }

  console.log("Found Txs %s", foundTxs);
  return {
    bundleTxs,
    fileDataTxs,
    fileTxs,
    folderTxs,
    driveTxs,
    snapshotTxs,
    tipTxs,
    foundUsers,
    lastBlock,
  };
}

// Sums up every data transaction for a start and end period and returns newest results first
export async function getAllAppL2Manifests(
  start: Date,
  end: Date,
  appName: string,
  minBlock?: number
): Promise<ArFSFileDataTx[]> {
  let cursor: string = "";
  let timeStamp = new Date(end);
  let hasNextPage = true;
  let lastBlock = 0;
  let fileDataTxs: ArFSFileDataTx[] = [];
  let foundUsers: string[] = [];
  let foundTxs: number = 0;

  if (minBlock === undefined || minBlock === 0) {
    minBlock = await getMinBlock(start);
  }

  let appPlatformQuery = "";
  let appNameQuery;

  console.log(
    `   ...Querying for all ${appName} Manifests L2 Transactions starting at ${minBlock}`
  );

  while (hasNextPage) {
    let tags: string;
    if (appName === "ArDrive-App-Web") {
      appNameQuery = "ArDrive-App";
      appPlatformQuery = "Web";
      tags = `[
        { name: "App-Name", values: ["${appNameQuery}"]}
        { name: "App-Platform", values: ["${appPlatformQuery}"]}
        { name: "Content-Type", values: ["application/x.arweave-manifest+json"]}
      ]`;
    } else if (appName === "ArDrive-App-Android") {
      appNameQuery = "ArDrive-App";
      appPlatformQuery = "Android";
      tags = `[
        { name: "App-Name", values: ["${appNameQuery}"]}
        { name: "App-Platform", values: ["${appPlatformQuery}"]}
        { name: "Content-Type", values: ["application/x.arweave-manifest+json"]}
      ]`;
    } else if (appName === "ArDrive-App-iOS") {
      appNameQuery = "ArDrive-App";
      appPlatformQuery = "iOS";
      tags = `[
        { name: "App-Name", values: ["${appNameQuery}"]}
        { name: "App-Platform", values: ["${appPlatformQuery}"]}
        { name: "Content-Type", values: ["application/x.arweave-manifest+json"]}
      ]`;
    } else if (appName === "N/A") {
      tags = `[
          { name: "Content-Type", values: ["application/x.arweave-manifest+json"]}
        ]`;
    } else {
      tags = `[
        { name: "App-Name", values: ["${appName}"]}
        { name: "Content-Type", values: ["application/x.arweave-manifest+json"]}
      ]`;
    }

    const query = {
      query: `query {
          transactions(
            tags: ${tags}
            sort: HEIGHT_ASC
            block: {min: ${minBlock}}
            first: ${firstPage}
            after: "${cursor}"
          ) {
            pageInfo {
              hasNextPage
            }
            edges {
              cursor
              node {
                id
                bundledIn {
                    id
                }
                owner {
                    address
                }
                fee {
                    ar
                }
                quantity {
                    ar
                }
                tags {
                    name
                    value
                }
                data {
                  size
                }
                block {
                  height
                  timestamp
                }
              }
            }
          }
        }`,
    };

    try {
      const transactions = await queryGateway(async (url: string) => {
        const response = await arweave.api.post(url + "/graphql", query);
        const { data } = response.data;
        if (data === undefined) {
          console.log(response.statusText);
          console.log(response);
          console.log(
            "Get All L2 Transactions... Undefined data returned from Gateway"
          );
          return 0;
        } else {
          const { transactions } = data;
          return transactions;
        }
      });
      if (transactions === 0) {
        console.log("%s Gateway returned an empty JSON ", timeStamp);
        await sleep(1000);
      } else {
        hasNextPage = transactions.pageInfo.hasNextPage;
        const { edges } = transactions;
        // console.log("Edges found %s", edges.length);
        for (let i = 0; i < edges.length; i += 1) {
          cursor = edges[i].cursor;
          const { node } = edges[i];
          const { block } = node;
          if (block !== null) {
            timeStamp = new Date(block.timestamp * 1000);
            if (
              start.getTime() <= timeStamp.getTime() &&
              end.getTime() >= timeStamp.getTime()
            ) {
              /*console.log(
                "Block: %s Tx: %s at Time: %s",
                lastBlock,
                node.id,
                timeStamp.toLocaleString()
              ); */
              // Prepare our files
              lastBlock = block.height;
              const { tags } = node;
              const { data } = node;
              const { fee } = node;
              const { bundledIn } = node;
              let fileDataTx = newArFSFileDataTx();
              let encrypted = false;
              let contentType = "";
              let appVersion = "";
              let appPlatform;
              let appPlatformVersion;
              let clientName = "";
              let bundleTxId = "";
              if (bundledIn && bundledIn.id !== null) {
                bundleTxId = bundledIn.id;
              }

              tags.forEach((tag: any) => {
                const key = tag.name;
                const { value } = tag;
                switch (key) {
                  case "Cipher-IV":
                    encrypted = true;
                    break;
                  case "Content-Type":
                    contentType = value;
                    break;
                  case "App-Platform":
                    appPlatform = value;
                    break;
                  case "App-Platform-Version":
                    appPlatformVersion = value;
                    break;
                  case "App-Version":
                    appVersion = value;
                    break;
                  case "ArDrive-Client":
                    clientName = value;
                    break;
                  default:
                    break;
                }
              });

              if (clientName.includes("ArConnect")) {
                appName = "ArConnect";
              }
              // This is file data since it has no entity tag
              fileDataTx.dataSize = +data.size;
              fileDataTx.appName = appName;
              fileDataTx.appVersion = appVersion;
              fileDataTx.appPlatform = appPlatform;
              fileDataTx.appPlatformVersion = appPlatformVersion;
              fileDataTx.owner = node.owner.address;
              fileDataTx.private = encrypted;
              fileDataTx.quantity = +node.quantity.ar;
              fileDataTx.fee = +fee.ar;
              fileDataTx.contentType = contentType;
              fileDataTx.bundledIn = bundleTxId;
              fileDataTx.id = node.id;
              fileDataTx.blockHeight = block.height;
              fileDataTx.blockTime = block.timestamp;
              fileDataTx.friendlyDate = timeStamp.toLocaleString();
              fileDataTxs.push(fileDataTx);

              foundUsers.push(node.owner.address);
              foundTxs += 1;
            } else if (timeStamp.getTime() > end.getTime()) {
              //console.log("Result too early %s", timeStamp);
              hasNextPage = false; // if it is ASC
              i = edges.length;
            } else if (timeStamp.getTime() < start.getTime()) {
              // console.log("Result too old %s", timeStamp);
              // hasNextPage = false; // if it is DESC
            } else {
              //console.log(
              //  "Block is null so we skip this transaction %s",
              //  node.Id
              //);
            }
          }
        }
      }
    } catch (err) {
      console.log(err);
      console.log("Error getting transactions at Blockheight: %s", lastBlock);
      hasNextPage = false;
    }
  }

  console.log("Found Txs %s", foundTxs);
  return fileDataTxs;
}

// Gets all drives in a given period
export async function getAllAppL2Drives(
  start: Date,
  end: Date,
  appName: string,
  minBlock?: number
): Promise<{ driveTxs: ArFSDriveTx[]; foundUsers: string[] }> {
  let cursor: string = "";
  let timeStamp = new Date(end);
  let hasNextPage = true;
  let lastBlock = 0;
  let driveTxs: ArFSDriveTx[] = [];
  let foundUsers: string[] = [];
  let foundTxs: number = 0;

  if (minBlock === undefined || minBlock === 0) {
    minBlock = await getMinBlock(start);
  }

  let appPlatformQuery = "";
  let appNameQuery;

  console.log(
    `   ...Querying for all ${appName} Drives starting at ${minBlock}`
  );

  while (hasNextPage) {
    let tags: string;
    if (appName === "ArDrive-App-Web") {
      appNameQuery = "ArDrive-App";
      appPlatformQuery = "Web";
      tags = `[
        { name: "App-Name", values: ["${appNameQuery}"]}
        { name: "App-Platform", values: ["${appPlatformQuery}"]}
        { name: "Content-Type", values: ["application/x.arweave-manifest+json"]}
      ]`;
    } else if (appName === "ArDrive-App-Android") {
      appNameQuery = "ArDrive-App";
      appPlatformQuery = "Android";
      tags = `[
        { name: "App-Name", values: ["${appNameQuery}"]}
        { name: "App-Platform", values: ["${appPlatformQuery}"]}
        { name: "Content-Type", values: ["application/x.arweave-manifest+json"]}
      ]`;
    } else if (appName === "ArDrive-App-iOS") {
      appNameQuery = "ArDrive-App";
      appPlatformQuery = "iOS";
      tags = `[
        { name: "App-Name", values: ["${appNameQuery}"]}
        { name: "App-Platform", values: ["${appPlatformQuery}"]}
        { name: "Content-Type", values: ["application/x.arweave-manifest+json"]}
      ]`;
    } else {
      tags = `[
        { name: "App-Name", values: ["${appName}"]}
        { name: "Entity-Type", values: ["drive"]}
      ]`;
    }

    const query = {
      query: `query {
          transactions(
            tags: ${tags}
            sort: HEIGHT_ASC
            block: {min: ${minBlock}}
            first: ${firstPage}
            after: "${cursor}"
          ) {
            pageInfo {
              hasNextPage
            }
            edges {
              cursor
              node {
                id
                bundledIn {
                    id
                }
                owner {
                    address
                }
                fee {
                    ar
                }
                quantity {
                    ar
                }
                tags {
                    name
                    value
                }
                data {
                  size
                }
                block {
                  height
                  timestamp
                }
              }
            }
          }
        }`,
    };

    try {
      const transactions = await queryGateway(async (url: string) => {
        const response = await arweave.api.post(url + "/graphql", query);
        const { data } = response.data;
        if (data === undefined) {
          console.log(response.statusText);
          console.log(response);
          console.log(
            "Get All L2 Drive Transactions... Undefined data returned from Gateway"
          );
          return 0;
        } else {
          const { transactions } = data;
          return transactions;
        }
      });
      if (transactions === 0) {
        console.log("%s Gateway returned an empty JSON ", timeStamp);
        await sleep(1000);
      } else {
        hasNextPage = transactions.pageInfo.hasNextPage;
        const { edges } = transactions;
        // console.log("Edges found %s", edges.length);
        for (let i = 0; i < edges.length; i += 1) {
          cursor = edges[i].cursor;
          const { node } = edges[i];
          const { block } = node;
          if (block !== null) {
            timeStamp = new Date(block.timestamp * 1000);
            if (
              start.getTime() <= timeStamp.getTime() &&
              end.getTime() >= timeStamp.getTime()
            ) {
              /*console.log(
                "Block: %s Tx: %s at Time: %s",
                lastBlock,
                node.id,
                timeStamp.toLocaleString()
              ); */
              // Prepare our files
              lastBlock = block.height;
              const { tags } = node;
              const { data } = node;
              const { fee } = node;
              let driveTx = newArFSDriveTx();
              let encrypted = false;
              let contentType = "";
              let appVersion = "";
              let appPlatform;
              let appPlatformVersion;
              let clientName = "";
              let bundledIn = "";
              let arFsVersion = "";

              tags.forEach((tag: any) => {
                const key = tag.name;
                const { value } = tag;
                switch (key) {
                  case "Cipher-IV":
                    encrypted = true;
                    break;
                  case "Content-Type":
                    contentType = value;
                    break;
                  case "App-Platform":
                    appPlatform = value;
                    break;
                  case "App-Platform-Version":
                    appPlatformVersion = value;
                    break;
                  case "App-Version":
                    appVersion = value;
                    break;
                  case "ArDrive-Client":
                    clientName = value;
                    break;
                  case "ArFS":
                    arFsVersion = value;
                    break;
                  default:
                    break;
                }
              });

              if (clientName.includes("ArConnect")) {
                appName = "ArConnect";
              }

              driveTx.dataSize = +data.size;
              driveTx.appName = appName;
              driveTx.appVersion = appVersion;
              driveTx.arfsVersion = arFsVersion;
              driveTx.appPlatform = appPlatform;
              driveTx.appPlatformVersion = appPlatformVersion;
              driveTx.owner = node.owner.address;
              driveTx.private = encrypted;
              driveTx.fee = +fee.ar;
              driveTx.contentType = contentType;
              driveTx.bundledIn = bundledIn;
              driveTx.id = node.id;
              driveTx.blockHeight = block.height;
              driveTx.blockTime = block.timestamp;
              driveTx.friendlyDate = timeStamp.toLocaleString();
              driveTxs.push(driveTx);

              foundUsers.push(node.owner.address);
              foundTxs += 1;
            } else if (timeStamp.getTime() > end.getTime()) {
              //console.log("Result too early %s", timeStamp);
              hasNextPage = false; // if it is ASC
              i = edges.length;
            } else if (timeStamp.getTime() < start.getTime()) {
              // console.log("Result too old %s", timeStamp);
              // hasNextPage = false; // if it is DESC
            } else {
              //console.log(
              //  "Block is null so we skip this transaction %s",
              //  node.Id
              //);
            }
          }
        }
      }
    } catch (err) {
      console.log(err);
      console.log("Error getting transactions at Blockheight: %s", lastBlock);
      hasNextPage = false;
    }
  }

  console.log("Found Txs %s", foundTxs);
  return { driveTxs, foundUsers };
}

// Sums up every data transaction for a start and end period and returns newest results first
export async function getAllBundlesByOwner(
  start: Date,
  end: Date,
  owner: string,
  minBlock?: number
): Promise<BundleTx[]> {
  let cursor: string = "";
  let timeStamp = new Date(end);
  let hasNextPage = true;
  let lastBlock = 0;
  let missingDataErrors = 0;
  let bundleTxs: BundleTx[] = [];
  let foundTxs: number = 0;

  if (minBlock === undefined || minBlock === 0) {
    minBlock = await getMinBlock(start);
  }

  console.log(
    `   ...Querying for all bundles, folders and drives uploaded by ${owner} starting at ${minBlock}`
  );
  while (hasNextPage) {
    let tags: string;
    tags = `[
      {
        name: "Entity-Type",
        values: ["folder"]
      }
    ]`;

    const query = {
      query: `query {
          transactions(
            owners: "${owner}"
            tags: ${tags}
            sort: HEIGHT_ASC
            block: {min: ${minBlock}}
            first: ${firstPage}
            after: "${cursor}"
          ) {
            pageInfo {
              hasNextPage
            }
            edges {
              cursor
              node {
                id
                bundledIn {
                    id
                }
                owner {
                    address
                }
                fee {
                    ar
                }
                quantity {
                    ar
                }
                tags {
                    name
                    value
                }
                data {
                  size
                }
                block {
                  height
                  timestamp
                }
              }
            }
          }
        }`,
    };

    try {
      const transactions = await queryGateway(async (url: string) => {
        const response = await arweave.api.post(url + "/graphql", query);
        const { data } = response.data;
        if (data === undefined) {
          console.log(response.statusText);
          console.log(response);
          console.log(
            "Get All Bundled Transactions... Undefined data returned from Gateway"
          );
          missingDataErrors += 1;
          return 0;
        } else {
          const { transactions } = data;
          return transactions;
        }
      });
      if (transactions === 0) {
        console.log("%s Gateway returned an empty JSON ", timeStamp);
        await sleep(1000);
      } else {
        hasNextPage = transactions.pageInfo.hasNextPage;
        const { edges } = transactions;
        // console.log("Edges found %s", edges.length);
        for (let i = 0; i < edges.length; i += 1) {
          cursor = edges[i].cursor;
          const { node } = edges[i];
          const { block } = node;
          if (block !== null) {
            timeStamp = new Date(block.timestamp * 1000);
            if (
              start.getTime() <= timeStamp.getTime() &&
              end.getTime() >= timeStamp.getTime()
            ) {
              /*console.log(
                "Block: %s Tx: %s at Time: %s",
                lastBlock,
                node.id,
                timeStamp.toLocaleString()
              ); */
              // Prepare our files
              lastBlock = block.height;
              if (node.bundledIn) {
                const { tags } = node;
                const { data } = node;
                const { fee } = node;
                let bundleTx = newBundleTx();
                let appVersion = "";
                let appName = "";
                tags.forEach((tag: any) => {
                  const key = tag.name;
                  const { value } = tag;
                  switch (key) {
                    case "App-Name":
                      appName = value;
                      break;
                    case "App-Version":
                      appVersion = value;
                      break;
                    default:
                      break;
                  }
                });
                bundleTx.txId = node.id;
                bundleTx.appName = appName;
                bundleTx.appVersion = appVersion;
                bundleTx.dataSize = +data.size;
                bundleTx.fee = +fee.ar;
                bundleTx.quantity = +node.quantity.ar;
                bundleTx.owner = node.owner.address;
                bundleTx.bundledInTxId = node.bundledIn.id;
                bundleTx.blockHeight = +block.height;
                bundleTxs.push(bundleTx);
                foundTxs += 1;
              }
            } else if (timeStamp.getTime() > end.getTime()) {
              //console.log("Result too early %s", timeStamp);
              hasNextPage = false; // if it is ASC
              i = edges.length;
            } else if (timeStamp.getTime() < start.getTime()) {
              // console.log("Result too old %s", timeStamp);
              // hasNextPage = false; // if it is DESC
            } else {
              //console.log(
              //  "Block is null so we skip this transaction %s",
              //  node.Id
              //);
            }
          }
        }
      }
    } catch (err) {
      console.log(err);
      console.log("Error getting transactions at Blockheight: %s", lastBlock);
      hasNextPage = false;
    }
  }

  cursor = "";
  hasNextPage = true;

  while (hasNextPage) {
    let tags: string;
    tags = `[
      {
        name: "Entity-Type",
        values: ["drive"]
      }
    ]`;

    const query = {
      query: `query {
          transactions(
            owners: "${owner}"
            tags: ${tags}
            sort: HEIGHT_ASC
            block: {min: ${minBlock}}
            first: ${firstPage}
            after: "${cursor}"
          ) {
            pageInfo {
              hasNextPage
            }
            edges {
              cursor
              node {
                id
                bundledIn {
                    id
                }
                owner {
                    address
                }
                fee {
                    ar
                }
                quantity {
                    ar
                }
                tags {
                    name
                    value
                }
                data {
                  size
                }
                block {
                  height
                  timestamp
                }
              }
            }
          }
        }`,
    };

    try {
      const transactions = await queryGateway(async (url: string) => {
        const response = await arweave.api.post(url + "/graphql", query);
        const { data } = response.data;
        if (data === undefined) {
          console.log(response.statusText);
          console.log(response);
          console.log(
            "Get All Bundled Transactions... Undefined data returned from Gateway"
          );
          missingDataErrors += 1;
          return 0;
        } else {
          const { transactions } = data;
          return transactions;
        }
      });
      if (transactions === 0) {
        console.log("%s Gateway returned an empty JSON ", timeStamp);
        await sleep(1000);
      } else {
        hasNextPage = transactions.pageInfo.hasNextPage;
        const { edges } = transactions;
        // console.log("Edges found %s", edges.length);
        for (let i = 0; i < edges.length; i += 1) {
          cursor = edges[i].cursor;
          const { node } = edges[i];
          const { block } = node;
          if (block !== null) {
            timeStamp = new Date(block.timestamp * 1000);
            if (
              start.getTime() <= timeStamp.getTime() &&
              end.getTime() >= timeStamp.getTime()
            ) {
              /*console.log(
                "Block: %s Tx: %s at Time: %s",
                lastBlock,
                node.id,
                timeStamp.toLocaleString()
              ); */
              // Prepare our files
              lastBlock = block.height;
              if (node.bundledIn) {
                const { tags } = node;
                const { data } = node;
                const { fee } = node;
                let bundleTx = newBundleTx();
                let appVersion = "";
                let appName = "";
                tags.forEach((tag: any) => {
                  const key = tag.name;
                  const { value } = tag;
                  switch (key) {
                    case "App-Name":
                      appName = value;
                      break;
                    case "App-Version":
                      appVersion = value;
                      break;
                    default:
                      break;
                  }
                });
                bundleTx.txId = node.id;
                bundleTx.appName = appName;
                bundleTx.appVersion = appVersion;
                bundleTx.dataSize = +data.size;
                bundleTx.fee = +fee.ar;
                bundleTx.quantity = +node.quantity.ar;
                bundleTx.owner = node.owner.address;
                bundleTx.bundledInTxId = node.bundledIn.id;
                bundleTx.blockHeight = +block.height;
                bundleTxs.push(bundleTx);
                foundTxs += 1;
              }
            } else if (timeStamp.getTime() > end.getTime()) {
              //console.log("Result too early %s", timeStamp);
              hasNextPage = false; // if it is ASC
              i = edges.length;
            } else if (timeStamp.getTime() < start.getTime()) {
              // console.log("Result too old %s", timeStamp);
              // hasNextPage = false; // if it is DESC
            } else {
              //console.log(
              //  "Block is null so we skip this transaction %s",
              //  node.Id
              //);
            }
          }
        }
      }
    } catch (err) {
      console.log(err);
      console.log("Error getting transactions at Blockheight: %s", lastBlock);
      hasNextPage = false;
    }
  }

  cursor = "";
  hasNextPage = true;
  while (hasNextPage) {
    let tags: string;
    tags = `[
      {
        name: "Bundle-Version",
        values: ["2.0.0"]
      }
      {
        name: "Bundle-Format",
        values: ["binary"]
      }
    ]`;

    const query = {
      query: `query {
          transactions(
            owners: "${owner}"
            tags: ${tags}
            sort: HEIGHT_ASC
            block: {min: ${minBlock}}
            first: ${firstPage}
            after: "${cursor}"
          ) {
            pageInfo {
              hasNextPage
            }
            edges {
              cursor
              node {
                id
                bundledIn {
                    id
                }
                owner {
                    address
                }
                fee {
                    ar
                }
                quantity {
                    ar
                }
                tags {
                    name
                    value
                }
                data {
                  size
                }
                block {
                  height
                  timestamp
                }
              }
            }
          }
        }`,
    };

    try {
      const transactions = await queryGateway(async (url: string) => {
        const response = await arweave.api.post(url + "/graphql", query);
        const { data } = response.data;
        if (data === undefined) {
          console.log(response.statusText);
          console.log(response);
          console.log(
            "Get All Bundled Transactions... Undefined data returned from Gateway"
          );
          missingDataErrors += 1;
          return 0;
        } else {
          const { transactions } = data;
          return transactions;
        }
      });
      if (transactions === 0) {
        console.log("%s Gateway returned an empty JSON ", timeStamp);
        await sleep(1000);
      } else {
        hasNextPage = transactions.pageInfo.hasNextPage;
        const { edges } = transactions;
        // console.log("Edges found %s", edges.length);
        for (let i = 0; i < edges.length; i += 1) {
          cursor = edges[i].cursor;
          const { node } = edges[i];
          const { block } = node;
          if (block !== null) {
            timeStamp = new Date(block.timestamp * 1000);
            if (
              start.getTime() <= timeStamp.getTime() &&
              end.getTime() >= timeStamp.getTime()
            ) {
              /*console.log(
                "Block: %s Tx: %s at Time: %s",
                lastBlock,
                node.id,
                timeStamp.toLocaleString()
              ); */
              // Prepare our files
              lastBlock = block.height;
              const { tags } = node;
              const { data } = node;
              const { fee } = node;
              let bundleTx = newBundleTx();
              let appVersion = "";
              let appName = "";
              tags.forEach((tag: any) => {
                const key = tag.name;
                const { value } = tag;
                switch (key) {
                  case "App-Name":
                    appName = value;
                    break;
                  case "App-Version":
                    appVersion = value;
                    break;
                  default:
                    break;
                }
              });
              bundleTx.txId = node.id;
              bundleTx.appName = appName;
              bundleTx.appVersion = appVersion;
              bundleTx.dataSize = +data.size;
              bundleTx.fee = +fee.ar;
              bundleTx.quantity = +node.quantity.ar;
              bundleTx.owner = node.owner.address;
              if (node.bundledIn) {
                bundleTx.bundledInTxId = node.bundledIn.id;
              }
              bundleTx.blockHeight = +block.height;
              bundleTxs.push(bundleTx);
              foundTxs += 1;
            } else if (timeStamp.getTime() > end.getTime()) {
              //console.log("Result too early %s", timeStamp);
              hasNextPage = false; // if it is ASC
              i = edges.length;
            } else if (timeStamp.getTime() < start.getTime()) {
              // console.log("Result too old %s", timeStamp);
              // hasNextPage = false; // if it is DESC
            } else {
              //console.log(
              //  "Block is null so we skip this transaction %s",
              //  node.Id
              //);
            }
          }
        }
      }
    } catch (err) {
      console.log(err);
      console.log("Error getting transactions at Blockheight: %s", lastBlock);
      hasNextPage = false;
    }
  }

  console.log("Found Txs %s", foundTxs);
  return bundleTxs;
}

// Gets all posted reports by AR.IO Observers
export async function getAllObservationReports(
  start: Date,
  end: Date,
  appName: string,
  minBlock?: number
): Promise<{
  fileDataTxs: ArFSFileDataTx[];
  foundUsers: string[];
  lastBlock: number;
}> {
  let cursor: string = "";
  let timeStamp = new Date(end);
  let hasNextPage = true;
  let lastBlock = 0;
  let missingDataErrors = 0;
  let fileDataTxs: ArFSFileDataTx[] = [];
  let foundUsers: string[] = [];
  let foundTxs: number = 0;

  if (minBlock === undefined || minBlock === 0) {
    minBlock = await getMinBlock(start);
  }

  console.log(
    `   ...Querying for all ${appName} L2 Transactions starting at ${minBlock}`
  );

  while (hasNextPage) {
    let tags = `[
      { name: "AR-IO-Component", values: ["observer"]}
    ]`;

    const query = {
      query: `query {
          transactions(
            tags: ${tags}
            sort: HEIGHT_ASC
            block: {min: ${minBlock}}
            first: ${firstPage}
            after: "${cursor}"
          ) {
            pageInfo {
              hasNextPage
            }
            edges {
              cursor
              node {
                id
                bundledIn {
                    id
                }
                owner {
                    address
                }
                fee {
                    ar
                }
                quantity {
                    ar
                }
                tags {
                    name
                    value
                }
                data {
                  size
                }
                block {
                  height
                  timestamp
                }
              }
            }
          }
        }`,
    };

    try {
      const transactions = await queryGateway(async (url: string) => {
        const response = await arweave.api.post(url + "/graphql", query);
        const { data } = response.data;
        if (data === undefined) {
          console.log(response.statusText);
          console.log(response);
          console.log(
            "Get All L2 Transactions... Undefined data returned from Gateway"
          );
          missingDataErrors += 1;
          return 0;
        } else {
          const { transactions } = data;
          return transactions;
        }
      });
      if (transactions === 0) {
        console.log("%s Gateway returned an empty JSON ", timeStamp);
        await sleep(1000);
      } else {
        hasNextPage = transactions.pageInfo.hasNextPage;
        const { edges } = transactions;
        // console.log("Edges found %s", edges.length);
        for (let i = 0; i < edges.length; i += 1) {
          cursor = edges[i].cursor;
          const { node } = edges[i];
          const { block } = node;
          if (block !== null) {
            timeStamp = new Date(block.timestamp * 1000);
            if (
              start.getTime() <= timeStamp.getTime() &&
              end.getTime() >= timeStamp.getTime()
            ) {
              /*console.log(
                "Block: %s Tx: %s at Time: %s",
                lastBlock,
                node.id,
                timeStamp.toLocaleString()
              ); */
              // Prepare our files
              lastBlock = block.height;
              const { tags } = node;
              const { data } = node;
              const { fee } = node;
              const { bundledIn } = node;
              let fileDataTx = newArFSFileDataTx();
              let contentType = "";
              let appVersion = "";

              tags.forEach((tag: any) => {
                const key = tag.name;
                const { value } = tag;
                switch (key) {
                  case "Content-Type":
                    contentType = value;
                    break;
                  case "App-Version":
                    appVersion = value;
                    break;
                  default:
                    break;
                }
              });

              // This is file data since it has no entity tag
              fileDataTx.dataSize = +data.size;
              console.log(`Data Size: ${fileDataTx.dataSize}`);

              fileDataTx.appName = appName;

              fileDataTx.appVersion = appVersion;

              fileDataTx.owner = node.owner.address;
              console.log(`Owner: ${fileDataTx.owner}`);

              fileDataTx.quantity = +node.quantity.ar;

              fileDataTx.fee = +fee.ar;
              console.log(`Fee: ${fileDataTx.fee}`);

              fileDataTx.contentType = contentType;
              console.log(`Content Type: ${fileDataTx.contentType}`);

              fileDataTx.bundledIn = bundledIn.id || "";
              console.log(`Bundled In: ${fileDataTx.bundledIn}`);

              fileDataTx.id = node.id;
              console.log(`ID: ${fileDataTx.id}`);

              fileDataTx.blockHeight = block.height;
              console.log(`Block Height: ${fileDataTx.blockHeight}`);

              fileDataTx.blockTime = block.timestamp;
              console.log(`Block Time: ${fileDataTx.blockTime}`);

              fileDataTx.friendlyDate = timeStamp.toLocaleString();
              console.log(`Friendly Date: ${fileDataTx.friendlyDate}`);

              fileDataTxs.push(fileDataTx);

              foundUsers.push(node.owner.address);
              foundTxs += 1;
            } else if (timeStamp.getTime() > end.getTime()) {
              //console.log("Result too early %s", timeStamp);
              hasNextPage = false; // if it is ASC
              i = edges.length;
            } else if (timeStamp.getTime() < start.getTime()) {
              // console.log("Result too old %s", timeStamp);
              // hasNextPage = false; // if it is DESC
            } else {
              //console.log(
              //  "Block is null so we skip this transaction %s",
              //  node.Id
              //);
            }
          }
        }
      }
    } catch (err) {
      console.log(err);
      console.log("Error getting transactions at Blockheight: %s", lastBlock);
      hasNextPage = false;
    }
  }

  console.log("Found Txs %s", foundTxs);
  return {
    fileDataTxs,
    foundUsers,
    lastBlock,
  };
}
