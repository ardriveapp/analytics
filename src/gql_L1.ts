import {
  asyncForEach,
  getMinBlock,
  newArFSDriveTx,
  newArFSFileDataTx,
  newArFSFileTx,
  newArFSFolderTx,
  newArFSSnapshotTx,
  newArFSTipTx,
  newBundleTx,
  sleep,
} from "./common";
import {
  ArDriveCommunityFee,
  ArFSDriveTx,
  ArFSFileDataTx,
  ArFSFileTx,
  ArFSFolderTx,
  ArFSSnapshotTx,
  ArFSTipTx,
  AstatineReward,
  BundleTx,
  ResultSet,
  SmartweaveTx,
} from "./types";
import Arweave from "arweave";
import { getArUSDPrice } from "./arweave";

export const arweave = Arweave.init({
  host: "vilenarios.com", // Arweave Gateway
  port: 3001,
  protocol: "http",
  timeout: 600000,
  logging: false,
});

export const L1gateways = ["http://vilenarios.com:3001"];

// Index of the currently used gateway into L1gateways.
let currentGateway: number = 0;

// How many pages to get from a gql query
let firstPage: number = 10000; // Max size of query for GQL

// Switches to the next gateway in the L1gateways array
function switchGateway() {
  currentGateway = (currentGateway + 1) % L1gateways.length;
  console.log("Switched gateway to " + L1gateways[currentGateway]);
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
      return await query(L1gateways[currentGateway]);
    } catch (err) {
      console.log(err);
      console.log(
        "Gateway error with " + L1gateways[currentGateway] + ", retrying..."
      );
      tries += 1;
      await sleep(5000);
      if (tries >= 5) {
        tries = 0;
        switchGateway();
        if (currentGateway === initialGatewayIndex) {
          // We've tried all L1gateways, nothing left to do.
          return Promise.reject(err);
        }
      }
    }
  }
}

// Sums up every l1 transaction for a start and end period and returns newest results first
export async function getAllAppL1Transactions(
  start: Date,
  end: Date,
  appName: string,
  minBlock?: number
): Promise<ResultSet> {
  let cursor: string = "";
  let timeStamp = new Date(end);
  let hasNextPage = true;
  let lastBlock = 1;
  let bundleTxs: BundleTx[] = [];
  let fileTxs: ArFSFileTx[] = [];
  let folderTxs: ArFSFolderTx[] = [];
  let driveTxs: ArFSDriveTx[] = [];
  let snapshotTxs: ArFSSnapshotTx[] = [];
  let fileDataTxs: ArFSFileDataTx[] = [];
  let tipTxs: ArFSTipTx[] = [];
  let foundUsers: string[] = [];

  if (minBlock === undefined || minBlock === 0) {
    minBlock = await getMinBlock(start);
  }

  let appPlatformQuery = "";
  let appNameQuery;

  console.log(
    `   ...Querying for all ${appName} L1 Transactions starting at ${minBlock}`
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
            "Get All L1 Transactions... Undefined data returned from Gateway"
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
        for (let i = 0; i < edges.length; i += 1) {
          cursor = edges[i].cursor;
          const { node } = edges[i];
          const { block } = node;
          if (block !== null) {
            lastBlock = block.height;
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
              let snapshotTx = newArFSSnapshotTx();
              let tipTx = newArFSTipTx();
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
                  case "Content-Type":
                    contentType = value;
                    break;
                  case "Block-Start":
                    blockStart = value;
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
              const isBundled = JSON.stringify(node.bundledIn);
              if (!node.bundledIn || isBundled === `{"id":""}`) {
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
                  snapshotTxs.push(snapshotTx);
                }
              }
              foundUsers.push(node.owner.address);
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
    } catch (err) {
      console.log(err);
      console.log("Error getting transactions at Blockheight: %s", lastBlock);
      hasNextPage = false;
    }
  }

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

// Gets all Inferno reward distributions made
export async function getAllInfernoRewards(
  start: Date,
  end: Date
): Promise<AstatineReward[]> {
  let cursor: string = "";
  let hasNextPage = true;
  let timeStamp = new Date(end);
  let input: string;
  let rewards: AstatineReward[] = [];
  console.log("Getting all Inferno Transactions");
  try {
    while (hasNextPage) {
      const query = {
        query: `query {
                transactions(
                  tags: [
                      { name: "Cannon", values: ["ArDrive Usage Rewards: Inferno"]}
                      { name: "Contract", values: "-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ"}
                  ]
                  first: ${firstPage}
                  after: "${cursor}"
                  sort: HEIGHT_DESC
                ) {
                  pageInfo {
                    hasNextPage
                  }
                  edges {
                    cursor
                    node {
                      recipient
                      tags {
                        name
                        value
                      }
                      owner {
                          address
                      }
                      quantity {
                        ar
                      }
                      block {
                        timestamp
                        height
                      }
                    }
                  }
                }
              }`,
      };
      const transactions = await queryGateway(async (url: string) => {
        const response = await arweave.api.post(url + "/graphql", query);
        const { data } = response.data;
        const { transactions } = data;
        return transactions;
      });
      const { edges } = transactions;
      hasNextPage = transactions.pageInfo.hasNextPage;
      await asyncForEach(edges, async (edge: any) => {
        cursor = edge.cursor;
        const { node } = edge;
        const { block } = node;
        const { owner } = node;
        const { tags } = node;
        if (block !== null) {
          timeStamp = new Date(block.timestamp * 1000);
          if (
            start.getTime() <= timeStamp.getTime() &&
            end.getTime() >= timeStamp.getTime()
          ) {
            let reward: AstatineReward = {
              owner: owner.address,
              target: "",
              appName: "",
              appVersion: "",
              cannon: "",
              quantity: 0,
              completion: 0,
              blockHeight: 0,
              blockTime: 0,
              friendlyDate: "",
              validSmartweaveTx: false,
            };

            reward.blockTime = block.timestamp;
            reward.blockHeight = block.height;
            reward.friendlyDate = timeStamp.toLocaleString();
            tags.forEach((tag: any) => {
              const key = tag.name;
              const { value } = tag;
              switch (key) {
                case "App-Name":
                  reward.appName = value;
                  break;
                case "App-Version":
                  reward.appVersion = value;
                  break;
                case "Cannon":
                  reward.cannon = value;
                  break;
                case "Completion":
                  reward.completion = value;
                  break;
                case "Input":
                  input = value;
                  break;
                default:
                  break;
              }
            });
            let inputObject = JSON.parse(input);
            reward.target = inputObject.target;
            reward.quantity = inputObject.qty;
            console.log(reward);
            rewards.push(reward);
          } else if (timeStamp.getTime() > end.getTime()) {
            // console.log ("Result too early")
          } else {
            // console.log ("Result too old")
            hasNextPage = false;
            // result too old
          }
        }
      });
    }
    return rewards;
  } catch (err) {
    console.log(err);
    console.log("Error collecting total amount of astatine transactions");
    return rewards;
  }
}

// Gets all ArDrive Community Tips/Fees sent
export async function getAllCommunityFees(
  start: Date,
  end: Date
): Promise<ArDriveCommunityFee[]> {
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let hasNextPage = true;
  let timeStamp = new Date(end);
  let myFees: ArDriveCommunityFee[] = [];
  console.log("Getting all ArDrive Community fees");

  const currentPrice = await getArUSDPrice();
  try {
    while (hasNextPage) {
      const query = {
        query: `query {
                transactions(
                  tags: [
                      { name: "Tip-Type", values: "data upload"}
                  ]
                  first: ${firstPage}
                  after: "${cursor}"
                  sort: HEIGHT_DESC
                ) {
                  pageInfo {
                    hasNextPage
                  }
                  edges {
                    cursor
                    node {
                      recipient
                      tags {
                        name
                        value
                      }
                      owner {
                          address
                      }
                      quantity {
                        ar
                      }
                      block {
                        timestamp
                        height
                      }
                    }
                  }
                }
              }`,
      };
      const transactions = await queryGateway(async (url: string) => {
        const response = await arweave.api.post(url + "/graphql", query);
        const { data } = response.data;
        const { transactions } = data;
        return transactions;
      });
      const { edges } = transactions;
      if (edges[0].node !== undefined) {
        console.log(
          `Block: ${edges[0].node.block.height} - ${edges.length} results found`
        );
      }
      hasNextPage = transactions.pageInfo.hasNextPage;
      await asyncForEach(edges, async (edge: any) => {
        cursor = edge.cursor;
        const { node } = edge;
        const { quantity } = node;
        const { block } = node;
        const { owner } = node;
        const { tags } = node;
        if (block !== null) {
          timeStamp = new Date(block.timestamp * 1000);
          if (
            start.getTime() <= timeStamp.getTime() &&
            end.getTime() >= timeStamp.getTime()
          ) {
            let myFee: ArDriveCommunityFee = {
              owner: owner.address,
              recipient: node.recipient,
              friendlyName: "community",
              appName: "",
              appVersion: "",
              tip: "",
              type: "",
              amountAR: 0,
              exchangeRate: 0, // The AR/USD exchange rate
              amountUSD: 0,
              currentPrice,
              costBasis: 0,
              blockHeight: 0,
              blockTime: 0,
              friendlyDate: "",
            };
            myFee.amountAR = quantity.ar;
            myFee.blockTime = block.timestamp;
            myFee.blockHeight = block.height;
            myFee.friendlyDate = timeStamp.toLocaleString();
            tags.forEach((tag: any) => {
              const key = tag.name;
              const { value } = tag;
              switch (key) {
                case "App-Name":
                  myFee.appName = value;
                  break;
                case "App-Version":
                  myFee.appVersion = value;
                  break;
                case "Type":
                  myFee.type = value;
                  break;
                case "Tip-Type":
                  myFee.tip = value;
                  break;
                default:
                  break;
              }
            });
            if (myFee.appName.includes("ArDrive")) {
              // We only care about ArDrive apps
              myFees.push(myFee);
            }
          } else if (timeStamp.getTime() > end.getTime()) {
            // console.log ("Result too early")
          } else {
            // console.log ("Result too old")
            hasNextPage = false;
            // result too old
          }
        }
      });
    }
    return myFees;
  } catch (err) {
    console.log(err);
    console.log("Error collecting total amount of fees");
    return myFees;
  }
}

// Gets all ArDrive Community Tips/Fees sent
export async function getAllArDriveCommunityTokenTransactions(
  owner: string,
  start: Date,
  end: Date
): Promise<SmartweaveTx[]> {
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let hasNextPage = true;
  let timeStamp = new Date(end);
  let input: string;
  let tokenTransfers: SmartweaveTx[] = [];

  try {
    while (hasNextPage) {
      const query = {
        query: `query {
                transactions(
                  owners:["${owner}"]
                  tags: [
                      { name: "Contract", values: "-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ"}
                  ]
                  first: ${firstPage}
                  after: "${cursor}"
                  sort: HEIGHT_DESC
                ) {
                  pageInfo {
                    hasNextPage
                  }
                  edges {
                    cursor
                    node {
                      id
                      recipient
                      tags {
                        name
                        value
                      }
                      owner {
                          address
                      }
                      quantity {
                        ar
                      }
                      block {
                        timestamp
                        height
                      }
                    }
                  }
                }
              }`,
      };
      const transactions = await queryGateway(async (url: string) => {
        const response = await arweave.api.post(url + "/graphql", query);
        const { data } = response.data;
        const { transactions } = data;
        return transactions;
      });
      const { edges } = transactions;
      hasNextPage = transactions.pageInfo.hasNextPage;
      await asyncForEach(edges, async (edge: any) => {
        cursor = edge.cursor;
        const { node } = edge;
        const { block } = node;
        const { owner } = node;
        const { tags } = node;
        if (block !== null) {
          timeStamp = new Date(block.timestamp * 1000);
          if (
            start.getTime() <= timeStamp.getTime() &&
            end.getTime() >= timeStamp.getTime()
          ) {
            let smartweaveTx: SmartweaveTx = {
              id: "",
              owner: owner.address,
              target: "",
              appName: "",
              appVersion: "",
              quantity: 0,
              blockHeight: 0,
              blockTime: 0,
              friendlyDate: "",
              validSmartweaveTx: false,
            };

            smartweaveTx.blockTime = block.timestamp;
            smartweaveTx.blockHeight = block.height;
            smartweaveTx.friendlyDate = timeStamp.toLocaleString();
            tags.forEach((tag: any) => {
              const key = tag.name;
              const { value } = tag;
              switch (key) {
                case "App-Name":
                  smartweaveTx.appName = value;
                  break;
                case "App-Version":
                  smartweaveTx.appVersion = value;
                  break;
                case "Input":
                  input = value;
                  break;
                default:
                  break;
              }
            });
            let inputObject = JSON.parse(input);
            smartweaveTx.id = node.id;
            smartweaveTx.target = inputObject.target;
            smartweaveTx.quantity = inputObject.qty;
            tokenTransfers.push(smartweaveTx);
          } else if (timeStamp.getTime() > end.getTime()) {
            // console.log ("Result too early")
          } else {
            // console.log ("Result too old")
            hasNextPage = false;
            // result too old
          }
        }
      });
    }
    return tokenTransfers;
  } catch (err) {
    console.log(err);
    console.log("Error collecting total amount of astatine transactions");
    return tokenTransfers;
  }
}

// Gets all ArDrive Community Tips/Fees for a particular public address.  Uses a friendly name to label the wallet
export async function getMyCommunityFees(
  friendlyName: string,
  owner: string,
  start: Date,
  end: Date
): Promise<ArDriveCommunityFee[]> {
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let hasNextPage = true;
  let timeStamp = new Date(end);
  let myFees: ArDriveCommunityFee[] = [];
  console.log("Getting all fees for %s: %s", friendlyName, owner);

  const currentPrice = await getArUSDPrice();
  try {
    while (hasNextPage) {
      const query = {
        query: `query {
                transactions(
                  recipients:["${owner}"]
                  tags: [
                      { name: "Tip-Type", values: "data upload"}
                  ]
                  first: ${firstPage}
                  after: "${cursor}"
                  sort: HEIGHT_DESC
                ) {
                  pageInfo {
                    hasNextPage
                  }
                  edges {
                    cursor
                    node {
                      recipient
                      tags {
                        name
                        value
                      }
                      quantity {
                        ar
                      }
                      block {
                        timestamp
                        height
                      }
                    }
                  }
                }
              }`,
      };
      const transactions = await queryGateway(async (url: string) => {
        const response = await arweave.api.post(url + "/graphql", query);
        const { data } = response.data;
        const { transactions } = data;
        return transactions;
      });
      const { edges } = transactions;
      hasNextPage = transactions.pageInfo.hasNextPage;
      await asyncForEach(edges, async (edge: any) => {
        cursor = edge.cursor;
        const { node } = edge;
        const { quantity } = node;
        const { block } = node;
        const { tags } = node;
        if (block !== null) {
          timeStamp = new Date(block.timestamp * 1000);
          if (
            start.getTime() <= timeStamp.getTime() &&
            end.getTime() >= timeStamp.getTime()
          ) {
            let myFee: ArDriveCommunityFee = {
              owner,
              recipient: node.recipient,
              friendlyName,
              appName: "",
              appVersion: "",
              tip: "",
              type: "",
              amountAR: 0,
              exchangeRate: 0, // The AR/USD exchange rate
              amountUSD: 0,
              currentPrice,
              costBasis: 0,
              blockHeight: 0,
              blockTime: 0,
              friendlyDate: "",
            };

            // console.log ("Matching community fee transaction: ", timeStamp)
            myFee.amountAR = quantity.ar;
            myFee.blockTime = block.timestamp;
            myFee.blockHeight = block.height;
            myFee.friendlyDate = timeStamp.toLocaleString();
            tags.forEach((tag: any) => {
              const key = tag.name;
              const { value } = tag;
              switch (key) {
                case "App-Name":
                  myFee.appName = value;
                  break;
                case "App-Version":
                  myFee.appVersion = value;
                  break;
                case "Type":
                  myFee.type = value;
                  break;
                case "Tip-Type":
                  myFee.tip = value;
                  break;
                default:
                  break;
              }
            });
            if (myFee.appName.includes("ArDrive")) {
              // We only care about ArDrive apps
              myFees.push(myFee);
            }
          } else if (timeStamp.getTime() > end.getTime()) {
            // console.log ("Result too early")
          } else {
            // console.log ("Result too old")
            hasNextPage = false;
            // result too old
          }
        }
      });
    }
    return myFees;
  } catch (err) {
    console.log(err);
    console.log("Error collecting total amount of fees");
    return myFees;
  }
}
