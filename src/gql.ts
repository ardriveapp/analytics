import { arweave, getArUSDPrice } from "./arweave";
import {
  asyncForEach,
  formatBytes,
  getMaxBlock,
  getMinBlock,
  newArFSDriveTx,
  newArFSFileDataTx,
  newArFSFileTx,
  newArFSFolderTx,
  newArFSTipTx,
  newBundleTx,
  sleep,
} from "./common";
import {
  ArDriveCommunityFee,
  ArDriveStat,
  ArFSDriveTx,
  ArFSFileDataTx,
  ArFSFileTx,
  ArFSFolderTx,
  ArFSTipTx,
  AstatineReward,
  BundleTx,
  ContentType,
  FileInfo,
  InfernoUser,
  L1ResultSet,
  ResultSet,
  SmartweaveTx,
} from "./types";
import limestone from "limestone-api";

const desktopAppName = "ArDrive-Desktop";
const webAppName = "ArDrive-Web";
const mobileAppName = "ArDrive-Mobile";
const coreAppName = "ArDrive-Core";
const cliAppName = "ArDrive-CLI";
const syncAppName = "ArDrive-Sync";

export const gateways = ["http://test.arweave.ardrive.io:3000"];
// export const gateways = ["https://arweave.net"];

// Index of the currently used gateway into gateways.
let currentGateway: number = 0;

// How many pages to get from a gql query
let firstPage: number = 10000; // Max size of query for GQL

// Switches to the next gateway in the gateways array
function switchGateway() {
  currentGateway = (currentGateway + 1) % gateways.length;
  console.log("Switched gateway to " + gateways[currentGateway]);
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
      return await query(gateways[currentGateway]);
    } catch (err) {
      console.log(err);
      console.log(
        "Gateway error with " + gateways[currentGateway] + ", retrying..."
      );
      tries += 1;
      await sleep(5000);
      if (tries >= 5) {
        tries = 0;
        switchGateway();
        if (currentGateway === initialGatewayIndex) {
          // We've tried all gateways, nothing left to do.
          return Promise.reject(err);
        }
      }
    }
  }
}

// Sums up all transactions for a wallet
export async function getUserSize(owner: string, start: Date, end: Date) {
  let totalDriveSize = 0;
  let totalDriveTransactions = 0;
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let timeStamp = new Date(end);
  let hasNextPage = true;

  try {
    while (hasNextPage) {
      const query = {
        query: `query {
                transactions(
                    owners: ["${owner}"]
                    tags: [
                    { name: "App-Name", values: ["${desktopAppName}", "${webAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}"]}
                    ]
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
                        data {
                        size
                        }
                        block {
                        timestamp
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
      // Create the query to search for all ardrive transactions.
      edges.forEach((edge: any) => {
        cursor = edge.cursor;
        const { node } = edge;
        const { data } = node;
        const { block } = node;
        if (block !== null) {
          timeStamp = new Date(block.timestamp * 1000);
          if (
            start.getTime() <= timeStamp.getTime() &&
            end.getTime() >= timeStamp.getTime()
          ) {
            if (data !== null) {
              totalDriveSize += +data.size;
              totalDriveTransactions += 1;
            }
          }
        }
      });
    }
    const formattedSize = formatBytes(totalDriveSize);
    return { owner, totalDriveSize, formattedSize, totalDriveTransactions };
  } catch (err) {
    console.log(err);
    console.log("Error getting all sizes of an owners drives");
    return { owner, totalDriveSize, totalDriveTransactions };
  }
}

// Gets ArDrive Drive information from a start and and date
export async function getAllDrives(
  start: Date,
  end: Date
): Promise<ArDriveStat[]> {
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let arDriveStats: ArDriveStat[] = [];
  let hasNextPage = true;
  try {
    while (hasNextPage) {
      const query = {
        query: `query {
                transactions(
                    tags: [
                        { name: "App-Name", values: ["${desktopAppName}", "${webAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}"]}
                        { name: "Entity-Type", values: "drive" }
                      ]
                    sort: HEIGHT_ASC
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
                            owner {
                                address
                            }
                            tags {
                                name
                                value
                            }
                            block {
                                timestamp
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
      edges.forEach((edge: any) => {
        cursor = edge.cursor;
        const { node } = edge;
        const { owner } = node;
        const { block } = node;
        if (block !== null) {
          let timeStamp = new Date(block.timestamp * 1000);
          // We only want results between our start and end dates, defined by milliseconds since epoch
          if (
            start.getTime() <= timeStamp.getTime() &&
            end.getTime() >= timeStamp.getTime()
          ) {
            //console.log ("Matching ardrive transaction: ", timeStamp)
            const { tags } = node;
            let arDriveStat: ArDriveStat = {
              address: owner.address,
              privacy: "",
              appName: "",
              driveId: "",
              tx: node.id,
              data: 0,
              blockTimeStamp: timeStamp,
            };
            tags.forEach((tag: any) => {
              const key = tag.name;
              const { value } = tag;
              switch (key) {
                case "App-Name":
                  arDriveStat.appName = value;
                  break;
                case "Drive-Privacy":
                  arDriveStat.privacy = value;
                  break;
                case "Drive-Id":
                  arDriveStat.driveId = value;
                  break;
                default:
                  break;
              }
            });
            arDriveStats.push(arDriveStat);
          } else if (timeStamp.getTime() > end.getTime()) {
            // console.log ("Result too old")
            hasNextPage = false;
          } else {
            // result too early
          }
        }
      });
    }
    return arDriveStats;
  } catch (err) {
    console.log(err);
    console.log("Error collecting total number of ArDrives");
    return arDriveStats;
  }
}

// Gets ArDrive Folder information from a start and and date
export async function getAllFolders(start: Date, end: Date): Promise<string[]> {
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let folderIds: string[] = [];
  let hasNextPage = true;
  try {
    while (hasNextPage) {
      const query = {
        query: `query {
                transactions(
                    tags: [
                        { name: "App-Name", values: ["${desktopAppName}", "${webAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}"]}
                        { name: "Entity-Type", values: "folder" }
                      ]
                    sort: HEIGHT_ASC
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
                            owner {
                                address
                            }
                            tags {
                                name
                                value
                            }
                            block {
                                timestamp
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
      edges.forEach((edge: any) => {
        cursor = edge.cursor;
        const { node } = edge;
        const { block } = node;
        if (block !== null) {
          let timeStamp = new Date(block.timestamp * 1000);
          // We only want results between our start and end dates, defined by milliseconds since epoch
          if (
            start.getTime() <= timeStamp.getTime() &&
            end.getTime() >= timeStamp.getTime()
          ) {
            //console.log ("Matching ardrive transaction: ", timeStamp)
            const { tags } = node;
            tags.forEach((tag: any) => {
              const key = tag.name;
              const { value } = tag;
              switch (key) {
                case "Folder-Id":
                  folderIds.push(value);
                  break;
                default:
                  break;
              }
            });
          } else if (timeStamp.getTime() > end.getTime()) {
            // console.log ("Result too old")
            hasNextPage = false;
          } else {
            // result too early
          }
        } else {
          console.log("Block is null!");
        }
      });
    }
    return folderIds;
  } catch (err) {
    console.log(err);
    console.log("Error collecting total number of ArDrives");
    return folderIds;
  }
}

// Gets ArDrive File information from a start and and date
export async function getAllFiles(start: Date, end: Date): Promise<FileInfo[]> {
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let files: FileInfo[] = [];
  let hasNextPage = true;
  try {
    while (hasNextPage) {
      const query = {
        query: `query {
                transactions(
                    tags: [
                        { name: "App-Name", values: ["${desktopAppName}", "${webAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}"]}
                        { name: "Entity-Type", values: "file" }
                      ]
                    sort: HEIGHT_ASC
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
                            owner {
                                address
                            }
                            tags {
                                name
                                value
                            }
                            block {
                                timestamp
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
      edges.forEach((edge: any) => {
        cursor = edge.cursor;
        const { node } = edge;
        const { block } = node;
        const { owner } = node;
        if (block !== null) {
          let timeStamp = new Date(block.timestamp * 1000);
          // We only want results between our start and end dates, defined by milliseconds since epoch
          if (
            start.getTime() <= timeStamp.getTime() &&
            end.getTime() >= timeStamp.getTime()
          ) {
            //console.log ("Matching ardrive transaction: ", timeStamp)
            let file: FileInfo = {
              address: owner.address,
              fileId: "",
              parentFolderId: "",
              driveId: "",
              privacy: "public",
              tx: node.id,
              blockTimeStamp: timeStamp,
            };
            const { tags } = node;
            tags.forEach((tag: any) => {
              const key = tag.name;
              const { value } = tag;
              switch (key) {
                case "File-Id":
                  file.fileId = value;
                  break;
                case "Drive-Id":
                  file.driveId = value;
                  break;
                case "Parent-Folder-Id":
                  file.parentFolderId = value;
                  break;
                case "Cipher-IV":
                  file.privacy = "private";
                  break;
                default:
                  break;
              }
            });
            files.push(file);
          } else if (timeStamp.getTime() > end.getTime()) {
            // console.log ("Result too old")
            hasNextPage = false;
          } else {
            // result too early
          }
        }
      });
    }
    return files;
  } catch (err) {
    console.log(err);
    console.log("Error collecting all ArDrive Files");
    return files;
  }
}

// Gets ArDrive information from a start and and date
export async function getAllAppData(
  appTarget: string,
  start: Date,
  end: Date
): Promise<{
  foundTransactions: number;
  dataSize: number;
  foundUsers: string[];
}> {
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let foundTransactions = 0;
  let dataSize = 0;
  let foundUsers: string[] = [];
  let hasNextPage = true;
  try {
    while (hasNextPage) {
      const query = {
        query: `query {
                transactions(
                    tags: [
                        { name: "App-Name", values: ["${appTarget}"]}
                      ]
                    sort: HEIGHT_ASC
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
                            owner {
                                address
                            }
                            tags {
                                name
                                value
                            }
                            block {
                                timestamp
                            }
                            data {
                                size
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
      edges.forEach((edge: any) => {
        cursor = edge.cursor;
        const { node } = edge;
        const { block } = node;
        const { data } = node;
        if (block !== null) {
          let timeStamp = new Date(block.timestamp * 1000);
          // We only want results between our start and end dates, defined by milliseconds since epoch
          if (
            start.getTime() <= timeStamp.getTime() &&
            end.getTime() >= timeStamp.getTime()
          ) {
            //console.log ("Matching ardrive transaction: ", timeStamp)
            foundTransactions += 1;
            dataSize += +data.size;
            const { tags } = node;
            foundUsers.push(node.owner.address);
            tags.forEach((tag: any) => {
              const key = tag.name;
              const { value } = tag;
              // include whatever specific tags needed to track users of this app.
              switch (key) {
                case "publicSigningKey":
                  foundUsers.push(value);
                  break;
                default:
                  break;
              }
            });
          } else if (timeStamp.getTime() > end.getTime()) {
            // console.log ("Result too old")
            hasNextPage = false;
          } else {
            // result too early
          }
        }
      });
    }
    return { foundTransactions, dataSize, foundUsers };
  } catch (err) {
    console.log(err);
    console.log("Error collecting total number of ArDrives");
    return { foundTransactions, dataSize, foundUsers };
  }
}

// Gets ArDrive information from a start and and date
export async function getUniqueArDriveUsers(
  start: Date,
  end: Date
): Promise<{
  foundTransactions: number;
  dataSize: number;
  foundUsers: {
    [wallet: string]: string;
  };
}> {
  let firstPage: number = 10000; // Max size of query for GQL
  let cursor: string = "";
  let foundTransactions = 0;
  let dataSize = 0;
  let foundUsers: {
    [wallet: string]: string;
  };
  let hasNextPage = true;

  // To calculate the no. of days between two dates
  let minBlock = await getMinBlock(start);

  try {
    while (hasNextPage) {
      const query = {
        query: `query {
                transactions(
                    tags:
                      { name: "App-Name", values: ["${desktopAppName}", "${webAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}"]}
                    bundledIn: ""
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
                            owner {
                                address
                            }
                            tags {
                                name
                                value
                            }
                            block {
                                timestamp
                                height
                            }
                            data {
                                size
                            }
                        }
                    }
                }
            }`,
      };
      const transactions = await queryGateway(async (url: string) => {
        const response = await arweave.api.post(url + "/graphql", query);
        const { data } = response.data;
        if (data === undefined) {
          console.log(response.statusText);
          console.log(response);
          console.log(
            "Get All Unique ArDrive Users... Undefined data returned from Gateway"
          );
          return 0;
        } else {
          const { transactions } = data;
          return transactions;
        }
      });
      if (transactions === 0) {
        console.log("%s Gateway returned an empty JSON.");
        await sleep(1000);
      } else {
        const { edges } = transactions;
        console.log(
          `Block: ${edges[0].node.block.height} - ${edges.length} results found`
        );
        hasNextPage = transactions.pageInfo.hasNextPage;
        edges.forEach((edge: any) => {
          cursor = edge.cursor;
          const { node } = edge;
          const { block } = node;
          const { data } = node;
          const { owner } = node;
          if (block !== null) {
            let timeStamp = new Date(block.timestamp * 1000);
            // We only want results between our start and end dates, defined by milliseconds since epoch
            // console.log(timeStamp.toLocaleString());
            if (
              start.getTime() <= timeStamp.getTime() &&
              end.getTime() >= timeStamp.getTime()
            ) {
              //console.log ("Matching ardrive transaction: ", timeStamp)
              foundTransactions += 1;
              dataSize += +data.size;
              foundUsers[owner.address] = block.height;
            } else if (timeStamp.getTime() > end.getTime()) {
              //console.log("Result too early");
              // hasNextPage = false;
            } else {
              console.log("Result too old");
              hasNextPage = false;
            }
          }
        });
      }
    }
    return { foundTransactions, dataSize, foundUsers };
  } catch (err) {
    console.log(err);
    console.log("Error collecting total number of ArDrive Users");
    return { foundTransactions, dataSize, foundUsers };
  }
}

// Sums up every bundled data transaction for a start and end period.
export async function getANS102Transactions(start: Date, end: Date) {
  let bundledDataSize = 0;
  let webAppDataSize = 0;
  let desktopDataSize = 0;
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let hasNextPage = true;
  let timeStamp = new Date(end);
  try {
    while (hasNextPage) {
      const query = {
        query: `query {
                transactions(
                  tags: [
                    { name: "App-Name", values: ["${desktopAppName}", "${webAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}"]}
                    { name: "Bundle-Format", values: "json"}
                  ]
                  sort: HEIGHT_ASC
                  first: ${firstPage}
                  after: "${cursor}"
                ) {
                  pageInfo {
                    hasNextPage
                  }
                  edges {
                    cursor
                    node {
                      tags {
                          name
                          value
                      }
                      data {
                        size
                      }
                      block {
                        timestamp
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
      edges.forEach((edge: any) => {
        cursor = edge.cursor;
        const { node } = edge;
        const { data } = node;
        const { block } = node;
        const { tags } = node;
        if (block !== null) {
          timeStamp = new Date(block.timestamp * 1000);
          if (
            start.getTime() <= timeStamp.getTime() &&
            end.getTime() >= timeStamp.getTime()
          ) {
            // We only want data transactions
            if (data.size > 0) {
              //console.log ("Matching bundled data transaction: ", timeStamp)
              let appName = "";
              tags.forEach((tag: any) => {
                const key = tag.name;
                const { value } = tag;
                switch (key) {
                  case "App-Name":
                    appName = value;
                    break;
                  default:
                    break;
                }
              });
              bundledDataSize += +data.size;
              if (appName === "ArDrive-Web") {
                webAppDataSize += +data.size;
              } else if (appName === "ArDrive-Desktop") {
                desktopDataSize += +data.size;
              }
            }
          } else if (timeStamp.getTime() > end.getTime()) {
            console.log("Result too early");
            hasNextPage = false;
          } else {
            console.log("Result too old");
          }
        }
      });
    }
    return { bundledDataSize, webAppDataSize, desktopDataSize };
  } catch (err) {
    console.log(err);
    console.log("Error collecting total amount of uploaded data");
    return { bundledDataSize, webAppDataSize, desktopDataSize };
  }
}

// Sums up all ArDrive Community Tips/Fees
export async function getSumOfAllCommunityFees(start: Date, end: Date) {
  let totalFees = 0;
  let desktopAppFees = 0;
  let webAppFees = 0;
  let coreAppFees = 0;
  let arConnectFees = 0;
  let cliAppFees = 0;
  let mobileAppFees = 0;
  let arDriveClient = "";
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let hasNextPage = true;
  let timeStamp = new Date(end);
  try {
    while (hasNextPage) {
      const query = {
        query: `query {
                transactions(
                  tags: [
                    { name: "App-Name", values: ["${desktopAppName}", "${webAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}"]}
                    { name: "Tip-Type", values: "data upload"}
                  ]
                  first: ${firstPage}
                  after: "${cursor}"
                  sort: HEIGHT_ASC
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
                      fee {
                          ar
                      }
                      quantity {
                        winston
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
      // Create the query to search for all ardrive transactions.
      edges.forEach((edge: any) => {
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
            //console.log ("Matching community fee transaction: ", timeStamp)
            let appName = "";
            tags.forEach((tag: any) => {
              const key = tag.name;
              const { value } = tag;
              switch (key) {
                case "App-Name":
                  appName = value;
                  break;
                case "ArDrive-Client":
                  arDriveClient = value;
                  break;
                default:
                  break;
              }
            });
            totalFees += +quantity.ar;
            switch (appName) {
              case webAppName:
                if (!arDriveClient.includes("ArConnect")) {
                  webAppFees += +quantity.ar;
                } else {
                  coreAppFees += +quantity.ar;
                  arConnectFees += +quantity.ar;
                }
                break;
              case desktopAppName:
                desktopAppFees += +quantity.ar;
                break;
              case mobileAppName:
                mobileAppFees += +quantity.ar;
                break;
              case coreAppName:
                coreAppFees += +quantity.ar;
                break;
              case cliAppName:
                cliAppFees += +quantity.ar;
                break;
            }
          } else if (timeStamp.getTime() > end.getTime()) {
            // console.log ("Result too old")
            hasNextPage = false;
          } else {
            // result too early
          }
        }
      });
    }
    return {
      totalFees,
      webAppFees,
      desktopAppFees,
      mobileAppFees,
      coreAppFees,
      cliAppFees,
      arConnectFees,
    };
  } catch (err) {
    console.log(err);
    console.log("Error collecting total amount of fees");
    return {
      totalFees,
      webAppFees,
      desktopAppFees,
      mobileAppFees,
      coreAppFees,
      cliAppFees,
      arConnectFees,
    };
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
  let limestoneDay: number;
  let myFees: ArDriveCommunityFee[] = [];
  let checkHistoricalPrice = true;
  console.log("Getting all ArDrive Community fees");

  const currentPrice = await getArUSDPrice();
  try {
    while (hasNextPage) {
      const query = {
        query: `query {
                transactions(
                  tags: [
                      { name: "App-Name", values: ["${webAppName}", "${desktopAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}"]}
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
            try {
              // Will try to get the price of AR for the day of this transaction.
              // This will skip if it already got the price of AR for that day
              // This will skip completely if limestone is down
              if (checkHistoricalPrice && limestoneDay !== timeStamp.getDay()) {
                limestoneDay = timeStamp.getDay();
                let latestPrice = await limestone.getHistoricalPrice("AR", {
                  date: timeStamp, // Any convertable to date type
                });
                myFee.exchangeRate = latestPrice.value;
                myFee.amountUSD = latestPrice.value * myFee.amountAR;
                myFee.costBasis = latestPrice.value - myFee.currentPrice;
              }
            } catch {
              checkHistoricalPrice = false;
              console.log("Cannot get AR price on ", timeStamp);
            }
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
            myFees.push(myFee);
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
export async function getAllAstatineRewards(
  start: Date,
  end: Date
): Promise<AstatineReward[]> {
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let hasNextPage = true;
  let timeStamp = new Date(end);
  let input: string;
  let rewards: AstatineReward[] = [];
  console.log("Getting all Astatine Transactions");
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
  let limestoneDay: number;
  let myFees: ArDriveCommunityFee[] = [];
  let checkHistoricalPrice = true;
  console.log("Getting all fees for %s: %s", friendlyName, owner);

  const currentPrice = await getArUSDPrice();
  try {
    while (hasNextPage) {
      const query = {
        query: `query {
                transactions(
                  recipients:["${owner}"]
                  tags: [
                      { name: "App-Name", values: ["${desktopAppName}", "${webAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}"]}
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
            try {
              // Will try to get the price of AR for the day of this transaction.
              // This will skip if it already got the price of AR for that day
              // This will skip completely if limestone is down
              if (checkHistoricalPrice && limestoneDay !== timeStamp.getDay()) {
                limestoneDay = timeStamp.getDay();
                let latestPrice = await limestone.getHistoricalPrice("AR", {
                  date: timeStamp, // Any convertable to date type
                });
                myFee.exchangeRate = latestPrice.value;
                myFee.amountUSD = latestPrice.value * myFee.amountAR;
                myFee.costBasis = latestPrice.value - myFee.currentPrice;
              }
            } catch {
              checkHistoricalPrice = false;
              console.log("Cannot get AR price on ", timeStamp);
            }
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
            myFees.push(myFee);
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

// Sums up every data transaction for a start and end period.
// Uses an estimate of block time to try to reduce query size
export async function getAllTransactions_WithBlocks(start: Date, end: Date) {
  let lastBlock = 1;
  let publicDataSize = 0;
  let privateDataSize = 0;
  let publicFiles = 0;
  let privateFiles = 0;
  let webAppFiles = 0;
  let desktopAppFiles = 0;
  let mobileAppFiles = 0;
  let coreAppFiles = 0;
  let cliAppFiles = 0;
  let syncAppFiles = 0;
  let arConnectFiles = 0;
  let publicArFee = 0;
  let privateArFee = 0;
  let arDriveClient: string = "";
  let contentType: string = "";
  let contentTypes: ContentType[] = [];
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let timeStamp = new Date(end);
  let hasNextPage = true;

  let minBlock = await getMinBlock(start);

  while (hasNextPage) {
    const query = {
      query: `query {
          transactions(
            tags: [
                { name: "App-Name", values: ["${desktopAppName}", "${webAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}", "${syncAppName}"]}
            ]
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
                owner {
                    address
                }
                fee {
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
        const { transactions } = data;
        return transactions;
      });
      hasNextPage = transactions.pageInfo.hasNextPage;
      const { edges } = transactions;
      edges.forEach((edge: any) => {
        cursor = edge.cursor;
        const { node } = edge;
        const { data } = node;
        const { fee } = node;
        const { block } = node;
        const { tags } = node;
        if (block !== null) {
          timeStamp = new Date(block.timestamp * 1000);
          lastBlock = block.height;
          if (
            start.getTime() <= timeStamp.getTime() &&
            end.getTime() >= timeStamp.getTime()
          ) {
            // We only want data transactions
            // console.log ("Matching data transaction: %s %s", node.id, timeStamp)
            if (data.size > 0) {
              let cipherIV = "public";
              let appName = "";
              tags.forEach((tag: any) => {
                const key = tag.name;
                const { value } = tag;
                switch (key) {
                  case "Cipher-IV":
                    cipherIV = value;
                    break;
                  case "Content-Type":
                    contentType = value;
                    break;
                  case "App-Name":
                    appName = value;
                    break;
                  case "ArDrive-Client":
                    arDriveClient = value;
                    break;
                  default:
                    break;
                }
              });
              if (cipherIV === "public") {
                publicDataSize += +data.size;
                publicArFee += +fee.ar;
                publicFiles += 1;
                // Does this content type exist in our array?
                let objIndex = contentTypes.findIndex(
                  (obj) => obj.contentType === contentType
                );
                if (objIndex >= 0) {
                  // If it exists, then we increment the existing data amount
                  contentTypes[objIndex].count += 1;
                } else {
                  // Else we add a content type to our Content Types list
                  // console.log ("New Content Type Found %s ", contentType)
                  let newContentType: ContentType = {
                    contentType,
                    count: 1,
                  };
                  contentTypes.push(newContentType);
                }
              } else {
                privateDataSize += +data.size;
                privateArFee += +fee.ar;
                privateFiles += 1;
              }

              switch (appName) {
                case webAppName:
                  // Currently, ArConnect is tagging its uploads with app name ArDrive-Web
                  // If a file is uploaded by ArConnect (with ardrive core), we want to count it as such
                  if (!arDriveClient.includes("ArConnect")) {
                    webAppFiles += 1;
                  } else {
                    coreAppFiles += 1;
                    arConnectFiles += 1;
                  }
                  break;
                case desktopAppName:
                  desktopAppFiles += 1;
                  break;
                case mobileAppName:
                  mobileAppFiles += 1;
                  break;
                case coreAppName:
                  coreAppFiles += 1;
                  break;
                case cliAppName:
                  cliAppFiles += 1;
                  break;
                case syncAppName:
                  syncAppFiles += 1;
                  break;
              }
            }
          } else if (timeStamp.getTime() > end.getTime()) {
            //console.log (timeStamp)
            console.log("Result too early %s", timeStamp);
            hasNextPage = false;
          } else {
            //console.log (timeStamp)
            console.log("Result too old %s", timeStamp);
          }
        }
      });
    } catch (err) {
      console.log(err);
      console.log(
        "Error getting total data transaction size at %s with %s.  Stopping",
        lastBlock
      );
      hasNextPage = false;
    }
  }
  return {
    publicDataSize,
    privateDataSize,
    publicFiles,
    privateFiles,
    publicArFee,
    privateArFee,
    webAppFiles,
    desktopAppFiles,
    mobileAppFiles,
    coreAppFiles,
    cliAppFiles,
    syncAppFiles,
    arConnectFiles,
    contentTypes,
    lastBlock,
  };
}

// Sums up every data transaction for a start and end period.
// Uses an estimate of block time to try to reduce query size
export async function getAllTransactions(start: Date, end: Date) {
  let lastBlock = 1;
  let publicDataSize = 0;
  let privateDataSize = 0;
  let publicFiles = 0;
  let privateFiles = 0;
  let webAppFiles = 0;
  let desktopAppFiles = 0;
  let mobileAppFiles = 0;
  let coreAppFiles = 0;
  let cliAppFiles = 0;
  let arConnectFiles = 0;
  let publicArFee = 0;
  let privateArFee = 0;
  let arDriveClient: string = "";
  let contentType: string = "";
  let contentTypes: ContentType[] = [];
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let timeStamp = new Date(end);
  let hasNextPage = true;

  while (hasNextPage) {
    const query = {
      query: `query {
          transactions(
            tags: [
                { name: "App-Name", values: ["${desktopAppName}", "${webAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}"]}
            ]
            sort: HEIGHT_ASC
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
                owner {
                    address
                }
                fee {
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
        const { transactions } = data;
        return transactions;
      });
      hasNextPage = transactions.pageInfo.hasNextPage;
      const { edges } = transactions;
      edges.forEach((edge: any) => {
        cursor = edge.cursor;
        const { node } = edge;
        const { data } = node;
        const { fee } = node;
        const { block } = node;
        const { tags } = node;
        if (block !== null) {
          timeStamp = new Date(block.timestamp * 1000);
          lastBlock = block.height;
          if (
            start.getTime() <= timeStamp.getTime() &&
            end.getTime() >= timeStamp.getTime()
          ) {
            // We only want data transactions
            // console.log ("Matching data transaction: %s %s", node.id, timeStamp)
            if (data.size > 0) {
              let cipherIV = "public";
              let appName = "";
              tags.forEach((tag: any) => {
                const key = tag.name;
                const { value } = tag;
                switch (key) {
                  case "Cipher-IV":
                    cipherIV = value;
                    break;
                  case "Content-Type":
                    contentType = value;
                    break;
                  case "App-Name":
                    appName = value;
                    break;
                  case "ArDrive-Client":
                    arDriveClient = value;
                    break;
                  default:
                    break;
                }
              });
              if (cipherIV === "public") {
                publicDataSize += +data.size;
                publicArFee += +fee.ar;
                publicFiles += 1;
                // Does this content type exist in our array?
                let objIndex = contentTypes.findIndex(
                  (obj) => obj.contentType === contentType
                );
                if (objIndex >= 0) {
                  // If it exists, then we increment the existing data amount
                  contentTypes[objIndex].count += 1;
                } else {
                  // Else we add a content type to our Content Types list
                  // console.log ("New Content Type Found %s ", contentType)
                  let newContentType: ContentType = {
                    contentType,
                    count: 1,
                  };
                  contentTypes.push(newContentType);
                }
              } else {
                privateDataSize += +data.size;
                privateArFee += +fee.ar;
                privateFiles += 1;
              }
              switch (appName) {
                case webAppName:
                  // Currently, ArConnect is tagging its uploads with app name ArDrive-Web
                  // If a file is uploaded by ArConnect (with ardrive core), we want to count it as such
                  if (!arDriveClient.includes("ArConnect")) {
                    webAppFiles += 1;
                  } else {
                    coreAppFiles += 1;
                    arConnectFiles += 1;
                  }
                  break;
                case desktopAppName:
                  desktopAppFiles += 1;
                  break;
                case mobileAppName:
                  mobileAppFiles += 1;
                  break;
                case coreAppName:
                  coreAppFiles += 1;
                  break;
                case cliAppName:
                  cliAppFiles += 1;
                  break;
              }
            }
          } else if (timeStamp.getTime() > end.getTime()) {
            //console.log (timeStamp)
            //console.log ("Result too early")
            hasNextPage = false;
          } else {
            //console.log (timeStamp)
            //console.log ("Result too old")
          }
        }
      });
    } catch (err) {
      console.log(err);
      console.log(
        "Error getting total data transaction size at %s with %s.  Stopping",
        lastBlock
      );
      hasNextPage = false;
    }
  }
  return {
    publicDataSize,
    privateDataSize,
    publicFiles,
    privateFiles,
    publicArFee,
    privateArFee,
    webAppFiles,
    desktopAppFiles,
    mobileAppFiles,
    coreAppFiles,
    cliAppFiles,
    arConnectFiles,
    contentTypes,
    lastBlock,
  };
}

// Sums up every data transaction for a start and end period.
// Uses an estimate of block time to try to reduce query size and returns oldest results first
export async function getAllAppTransactions_ASC(
  start: Date,
  end: Date,
  lastBlock: number
) {
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let timeStamp = new Date(end);
  let hasNextPage = true;
  let minBlock = 1;
  if (lastBlock === 1) {
    minBlock = await getMinBlock(start);
  } else {
    minBlock = lastBlock;
    console.log(
      "Continuing querying for All App Transactions from block %s",
      lastBlock
    );
  }

  let fileTxs: ArFSFileTx[] = [];
  let folderTxs: ArFSFolderTx[] = [];
  let driveTxs: ArFSDriveTx[] = [];
  let fileDataTxs: ArFSFileDataTx[] = [];
  let bundleTxs: BundleTx[] = [];
  let tipTxs: ArFSTipTx[] = [];

  while (hasNextPage) {
    const query = {
      query: `query {
          transactions(
            tags: [
                { name: "App-Name", values: ["${desktopAppName}", "${webAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}", "${syncAppName}"]}
            ]
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
          console.log("Undefined data!!!");
          console.log(response.statusText);
          return 0;
        } else {
          const { transactions } = data;
          return transactions;
        }
      });
      hasNextPage = transactions.pageInfo.hasNextPage;
      const { edges } = transactions;
      edges.forEach((edge: any) => {
        cursor = edge.cursor;
        const { node } = edge;
        const { block } = node;
        if (block !== null) {
          timeStamp = new Date(block.timestamp * 1000);
          if (
            start.getTime() <= timeStamp.getTime() &&
            end.getTime() >= timeStamp.getTime()
          ) {
            lastBlock = block.height;
            // Prepare our files
            const { tags } = node;
            const { data } = node;
            const { fee } = node;
            let bundleTx = newBundleTx();
            let fileTx = newArFSFileTx();
            let fileDataTx = newArFSFileDataTx();
            let folderTx = newArFSFolderTx();
            let driveTx = newArFSDriveTx();
            let tipTx = newArFSTipTx();
            let encrypted = false;
            let contentType = "";
            let appName = "";
            let appVersion = "";
            let clientName = "";
            let entityType = "data";
            let arFsVersion = "";
            let bundleFormat = "";
            let bundledIn = "";
            let communityTip = 0;

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
                case "App-Name":
                  appName = value;
                  break;
                case "App-Version":
                  appVersion = value;
                  break;
                case "ArFS":
                  arFsVersion = value;
                  break;
                case "ArDrive-Client":
                  clientName = value;
                  break;
                case "Bundle-Format":
                  bundleFormat = value;
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

            if (node.bundledIn) {
              bundledIn = node.bundledIn.id;
            }

            if (bundleFormat === "binary") {
              // this is a bundle
              bundleTx.appName = appName;
              bundleTx.appVersion = appVersion;
              bundleTx.dataSize = +data.size;
              bundleTx.fee = +fee.ar;
              bundleTx.quantity = +node.quantity.ar;
              bundleTxs.push(bundleTx);
            } else if (communityTip !== 0) {
              tipTx.appName = appName;
              tipTx.appVersion = appVersion;
              tipTx.owner = node.owner.address;
              tipTx.quantity = +communityTip;
              tipTx.id = node.id;
              tipTx.blockHeight = block.height;
              tipTx.blockTime = block.timestamp;
              tipTx.friendlyDate = timeStamp.toLocaleString();
              tipTxs.push(tipTx);
            } else if (
              entityType === "data" &&
              arFsVersion === "" &&
              communityTip === 0
            ) {
              // this is a file data tx and therefore has no ArFS tag or entity type tag or community tip tag
              if (+fee.ar === 0) {
                // This is a bundle
                fileDataTx.dataItemSize = +data.size;
              } else {
                fileDataTx.dataSize = +data.size;
              }
              fileDataTx.appName = appName;
              fileDataTx.appVersion = appVersion;
              fileDataTx.owner = node.owner.address;
              fileDataTx.private = encrypted;
              fileDataTx.fee = +fee.ar;
              fileDataTx.contentType = contentType;
              fileDataTx.bundledIn = bundledIn;
              fileDataTx.id = node.id;
              fileDataTx.blockHeight = block.height;
              fileDataTx.blockTime = block.timestamp;
              fileDataTx.friendlyDate = timeStamp.toLocaleString();
              fileDataTxs.push(fileDataTx);
            } else if (entityType === "file") {
              // THIS IS A FILE METADATA TX
              if (+fee.ar === 0) {
                // This is a bundle
                fileTx.dataItemSize = +data.size;
              } else {
                fileTx.dataSize = +data.size;
              }
              fileTx.appName = appName;
              fileTx.appVersion = appVersion;
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
              // THIS IS A FOLDER METADATA TX
              if (+fee.ar === 0) {
                // This is a bundle
                folderTx.dataItemSize = +data.size;
              } else {
                folderTx.dataSize = +data.size;
              }
              folderTx.appName = appName;
              folderTx.appVersion = appVersion;
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
              // THIS IS A DRIVE METADATA TX
              if (+fee.ar === 0) {
                // This is a bundle
                driveTx.dataItemSize = +data.size;
              } else {
                driveTx.dataSize = +data.size;
              }
              driveTx.appName = appName;
              driveTx.appVersion = appVersion;
              driveTx.arfsVersion = arFsVersion;
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
            }
          } else if (timeStamp.getTime() > end.getTime()) {
            // console.log ("Result too early %s", timeStamp)
            hasNextPage = false;
          } else {
            // console.log ("Result too old %s", timeStamp)
          }
        }
      });
    } catch (err) {
      console.log(err);
      console.log("Error getting transactions at Blockheight: %s", lastBlock);
      // hasNextPage = false;
    }
  }
  return {
    bundleTxs,
    fileDataTxs,
    fileTxs,
    folderTxs,
    driveTxs,
    tipTxs,
    lastBlock,
  };
}

// Sums up every Drive transaction for a start and end period.
// Uses an estimate of block time to try to reduce query size and returns oldest results first
export async function getAllAppDriveTransactions_ASC(
  start: Date,
  end: Date,
  lastBlock: number
) {
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let timeStamp = new Date(end);
  let hasNextPage = true;
  let minBlock = 1;
  const entityType = "drive";

  if (lastBlock === 1) {
    minBlock = await getMinBlock(start);
  } else {
    minBlock = lastBlock;
    console.log(
      "Continuing querying for All App Drive Transactions from block %s",
      lastBlock
    );
  }

  let fileTxs: ArFSFileTx[] = [];
  let folderTxs: ArFSFolderTx[] = [];
  let driveTxs: ArFSDriveTx[] = [];
  let fileDataTxs: ArFSFileDataTx[] = [];
  let bundleTxs: BundleTx[] = [];
  let tipTxs: ArFSTipTx[] = [];

  while (hasNextPage) {
    const query = {
      query: `query {
          transactions(
            tags: [
                { name: "App-Name", values: ["${desktopAppName}", "${webAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}", "${syncAppName}"]}
                { name: "Entity-Type", values: "${entityType}"}
            ]
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
          console.log("Undefined data!!!");
          console.log(response.statusText);
        }
        const { transactions } = data;
        return transactions;
      });
      hasNextPage = transactions.pageInfo.hasNextPage;
      const { edges } = transactions;
      edges.forEach((edge: any) => {
        cursor = edge.cursor;
        const { node } = edge;
        const { block } = node;
        if (block !== null) {
          timeStamp = new Date(block.timestamp * 1000);
          if (
            start.getTime() <= timeStamp.getTime() &&
            end.getTime() >= timeStamp.getTime()
          ) {
            lastBlock = block.height;
            // Prepare our files
            const { tags } = node;
            const { data } = node;
            const { fee } = node;
            let bundleTx = newBundleTx();
            let fileTx = newArFSFileTx();
            let fileDataTx = newArFSFileDataTx();
            let folderTx = newArFSFolderTx();
            let driveTx = newArFSDriveTx();
            let tipTx = newArFSTipTx();
            let encrypted = false;
            let contentType = "";
            let appName = "";
            let appVersion = "";
            let clientName = "";
            let entityType = "data";
            let arFsVersion = "";
            let bundleFormat = "";
            let bundledIn = "";
            let communityTip = 0;

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
                case "App-Name":
                  appName = value;
                  break;
                case "App-Version":
                  appVersion = value;
                  break;
                case "ArFS":
                  arFsVersion = value;
                  break;
                case "ArDrive-Client":
                  clientName = value;
                  break;
                case "Bundle-Format":
                  bundleFormat = value;
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

            if (node.bundledIn) {
              bundledIn = node.bundledIn.id;
            }

            if (bundleFormat === "binary") {
              // this is a bundle
              bundleTx.appName = appName;
              bundleTx.appVersion = appVersion;
              bundleTx.dataSize = +data.size;
              bundleTx.fee = +fee.ar;
              bundleTx.quantity = +node.quantity.ar;
              bundleTxs.push(bundleTx);
            } else if (communityTip !== 0) {
              tipTx.appName = appName;
              tipTx.appVersion = appVersion;
              tipTx.owner = node.owner.address;
              tipTx.quantity = +communityTip;
              tipTx.id = node.id;
              tipTx.blockHeight = block.height;
              tipTx.blockTime = block.timestamp;
              tipTx.friendlyDate = timeStamp.toLocaleString();
              tipTxs.push(tipTx);
            } else if (
              entityType === "data" &&
              arFsVersion === "" &&
              communityTip === 0
            ) {
              // this is a file data tx and therefore has no ArFS tag or entity type tag or community tip tag
              if (+fee.ar === 0) {
                // This is a bundle
                fileDataTx.dataItemSize = +data.size;
              } else {
                fileDataTx.dataSize = +data.size;
              }
              fileDataTx.appName = appName;
              fileDataTx.appVersion = appVersion;
              fileDataTx.owner = node.owner.address;
              fileDataTx.private = encrypted;
              fileDataTx.fee = +fee.ar;
              fileDataTx.contentType = contentType;
              fileDataTx.bundledIn = bundledIn;
              fileDataTx.id = node.id;
              fileDataTx.blockHeight = block.height;
              fileDataTx.blockTime = block.timestamp;
              fileDataTx.friendlyDate = timeStamp.toLocaleString();
              fileDataTxs.push(fileDataTx);
            } else if (entityType === "file") {
              // THIS IS A FILE METADATA TX
              if (+fee.ar === 0) {
                // This is a bundle
                fileTx.dataItemSize = +data.size;
              } else {
                fileTx.dataSize = +data.size;
              }
              fileTx.appName = appName;
              fileTx.appVersion = appVersion;
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
              // THIS IS A FOLDER METADATA TX
              if (+fee.ar === 0) {
                // This is a bundle
                folderTx.dataItemSize = +data.size;
              } else {
                folderTx.dataSize = +data.size;
              }
              folderTx.appName = appName;
              folderTx.appVersion = appVersion;
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
              // THIS IS A DRIVE METADATA TX
              if (+fee.ar === 0) {
                // This is a bundle
                driveTx.dataItemSize = +data.size;
              } else {
                driveTx.dataSize = +data.size;
              }
              driveTx.appName = appName;
              driveTx.appVersion = appVersion;
              driveTx.arfsVersion = arFsVersion;
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
            }
          } else if (timeStamp.getTime() > end.getTime()) {
            // console.log ("Result too early %s", timeStamp)
            hasNextPage = false;
          } else {
            // console.log ("Result too old %s", timeStamp)
          }
        }
      });
    } catch (err) {
      console.log(err);
      console.log("Error getting transactions at Blockheight: %s", lastBlock);
      // hasNextPage = false;
    }
  }
  return {
    bundleTxs,
    fileDataTxs,
    fileTxs,
    folderTxs,
    driveTxs,
    tipTxs,
    lastBlock,
  };
}

// Sums up every data transaction for a start and end period and returns newest results first
export async function getAllAppTransactions_DESC(
  start: Date,
  end: Date,
  appName: string,
  lastBlock: number
): Promise<ResultSet> {
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let timeStamp = new Date(end);
  let hasNextPage = true;
  let missingDataErrors = 0;

  let fileTxs: ArFSFileTx[] = [];
  let folderTxs: ArFSFolderTx[] = [];
  let driveTxs: ArFSDriveTx[] = [];
  let fileDataTxs: ArFSFileDataTx[] = [];
  let bundleTxs: BundleTx[] = [];
  let tipTxs: ArFSTipTx[] = [];

  let minBlock: number;
  if (lastBlock === 1) {
    minBlock = await getMinBlock(start);
  } else {
    minBlock = lastBlock;
  }
  console.log(
    "Querying for %s Transactions after block %s from %s to %s",
    appName,
    minBlock,
    start.toLocaleString(),
    end.toLocaleString()
  );

  while (hasNextPage) {
    const query = {
      query: `query {
          transactions(
            tags: [
                { name: "App-Name", values: ["${appName}"]}
            ]
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
            "Get All App Transactions DESC... Undefined data returned from Gateway"
          );
          missingDataErrors += 1;
          return 0;
        } else {
          const { transactions } = data;
          return transactions;
        }
      });
      if (transactions === 0) {
        console.log(
          "%s Gateway returned an empty JSON at %s.",
          timeStamp,
          lastBlock
        );
        await sleep(1000);
      } else {
        hasNextPage = transactions.pageInfo.hasNextPage;
        const { edges } = transactions;
        edges.forEach((edge: any) => {
          cursor = edge.cursor;
          const { node } = edge;
          const { block } = node;
          if (block !== null) {
            timeStamp = new Date(block.timestamp * 1000);
            if (
              start.getTime() <= timeStamp.getTime() &&
              end.getTime() >= timeStamp.getTime()
            ) {
              // console.log ("Found Tx in Block: %s at Time: %s", lastBlock, timeStamp.toLocaleString())
              // Prepare our files
              const { tags } = node;
              const { data } = node;
              const { fee } = node;
              let bundleTx = newBundleTx();
              let fileTx = newArFSFileTx();
              let fileDataTx = newArFSFileDataTx();
              let folderTx = newArFSFolderTx();
              let driveTx = newArFSDriveTx();
              let tipTx = newArFSTipTx();
              let encrypted = false;
              let contentType = "";
              let appName = "";
              let appVersion = "";
              let clientName = "";
              let entityType = "data";
              let arFsVersion = "";
              let bundleFormat = "";
              let bundledIn = "";
              let communityTip = 0;

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
                  case "App-Name":
                    appName = value;
                    break;
                  case "App-Version":
                    appVersion = value;
                    break;
                  case "ArFS":
                    arFsVersion = value;
                    break;
                  case "ArDrive-Client":
                    clientName = value;
                    break;
                  case "Bundle-Format":
                    bundleFormat = value;
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

              if (node.bundledIn) {
                bundledIn = node.bundledIn.id;
              }

              if (bundleFormat === "binary") {
                // this is a bundle
                bundleTx.appName = appName;
                bundleTx.appVersion = appVersion;
                bundleTx.dataSize = +data.size;
                bundleTx.fee = +fee.ar;
                bundleTx.quantity = +node.quantity.ar;
                bundleTxs.push(bundleTx);
              } else if (communityTip !== 0) {
                tipTx.appName = appName;
                tipTx.appVersion = appVersion;
                tipTx.owner = node.owner.address;
                tipTx.quantity = +communityTip;
                tipTx.id = node.id;
                tipTx.blockHeight = block.height;
                tipTx.blockTime = block.timestamp;
                tipTx.friendlyDate = timeStamp.toLocaleString();
                tipTxs.push(tipTx);
              } else if (
                entityType === "data" &&
                arFsVersion === "" &&
                communityTip === 0
              ) {
                // this is a file data tx and therefore has no ArFS tag or entity type tag or community tip tag
                if (+fee.ar === 0) {
                  // This is a bundle
                  fileDataTx.dataItemSize = +data.size;
                } else {
                  fileDataTx.dataSize = +data.size;
                }
                fileDataTx.appName = appName;
                fileDataTx.appVersion = appVersion;
                fileDataTx.owner = node.owner.address;
                fileDataTx.private = encrypted;
                fileDataTx.fee = +fee.ar;
                fileDataTx.contentType = contentType;
                fileDataTx.bundledIn = bundledIn;
                fileDataTx.id = node.id;
                fileDataTx.blockHeight = block.height;
                fileDataTx.blockTime = block.timestamp;
                fileDataTx.friendlyDate = timeStamp.toLocaleString();
                fileDataTxs.push(fileDataTx);
              } else if (entityType === "file") {
                // THIS IS A FILE METADATA TX
                if (+fee.ar === 0) {
                  // This is a bundle
                  fileTx.dataItemSize = +data.size;
                } else {
                  fileTx.dataSize = +data.size;
                }
                fileTx.appName = appName;
                fileTx.appVersion = appVersion;
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
                // THIS IS A FOLDER METADATA TX
                if (+fee.ar === 0) {
                  // This is a bundle
                  folderTx.dataItemSize = +data.size;
                } else {
                  folderTx.dataSize = +data.size;
                }
                folderTx.appName = appName;
                folderTx.appVersion = appVersion;
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
                // THIS IS A DRIVE METADATA TX
                if (+fee.ar === 0) {
                  // This is a bundle
                  driveTx.dataItemSize = +data.size;
                } else {
                  driveTx.dataSize = +data.size;
                }
                driveTx.appName = appName;
                driveTx.appVersion = appVersion;
                driveTx.arfsVersion = arFsVersion;
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
              }
              lastBlock = block.height;
            }
          }
          if (timeStamp.getTime() > end.getTime()) {
            // console.log ("Result too early %s", timeStamp)
            // hasNextPage = false; // if it is ASC
          } else if (timeStamp.getTime() < start.getTime()) {
            // console.log ("Result too old %s", timeStamp)
            hasNextPage = false; // if it is DESC
          } else {
            // console.log ("Block is null so we skip this transaction %s", node.Id);
          }
        });
      }
    } catch (err) {
      console.log(err);
      console.log("Error getting transactions at Blockheight: %s", lastBlock);
      hasNextPage = false;
    }
  }
  console.log("Missing Data Errors: %s", missingDataErrors);
  return {
    bundleTxs,
    fileDataTxs,
    fileTxs,
    folderTxs,
    driveTxs,
    tipTxs,
    lastBlock,
  };
}

// Sums up every data transaction for a start and end period and returns newest results first
export async function getAllAppTransactionsWithBlocks_DESC(
  minBlock: number,
  maxBlock: number,
  appName: string
): Promise<ResultSet> {
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let hasNextPage = true;
  let missingDataErrors = 0;
  let lastBlock = 0;
  let fileTxs: ArFSFileTx[] = [];
  let folderTxs: ArFSFolderTx[] = [];
  let driveTxs: ArFSDriveTx[] = [];
  let fileDataTxs: ArFSFileDataTx[] = [];
  let bundleTxs: BundleTx[] = [];
  let tipTxs: ArFSTipTx[] = [];

  console.log(
    "Querying for %s Transactions after block %s to block %s",
    appName,
    minBlock,
    maxBlock
  );

  while (hasNextPage) {
    const query = {
      query: `query {
          transactions(
            tags: [
                { name: "App-Name", values: ["${appName}"]}
            ]
            sort: HEIGHT_DESC
            block: {min: ${minBlock}, max: ${maxBlock}}
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
            "Get All App Transactions DESC... Undefined data returned from Gateway"
          );
          missingDataErrors += 1;
          return 0;
        } else {
          const { transactions } = data;
          return transactions;
        }
      });
      if (transactions === 0) {
        console.log("%s Gateway returned an empty JSON.");
        await sleep(1000);
      } else {
        hasNextPage = transactions.pageInfo.hasNextPage;
        const { edges } = transactions;
        edges.forEach((edge: any) => {
          cursor = edge.cursor;
          const { node } = edge;
          const { block } = node;
          if (block !== null) {
            let timeStamp = new Date(block.timestamp * 1000);
            // console.log ("Found Tx in Block: %s at Time: %s", lastBlock, timeStamp.toLocaleString())
            // Prepare our files
            const { tags } = node;
            const { data } = node;
            const { fee } = node;
            let bundleTx = newBundleTx();
            let fileTx = newArFSFileTx();
            let fileDataTx = newArFSFileDataTx();
            let folderTx = newArFSFolderTx();
            let driveTx = newArFSDriveTx();
            let tipTx = newArFSTipTx();
            let encrypted = false;
            let contentType = "";
            let appName = "";
            let appVersion = "";
            let clientName = "";
            let entityType = "data";
            let arFsVersion = "";
            let bundleFormat = "";
            let bundledIn = "";
            let communityTip = 0;

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
                case "App-Name":
                  appName = value;
                  break;
                case "App-Version":
                  appVersion = value;
                  break;
                case "ArFS":
                  arFsVersion = value;
                  break;
                case "ArDrive-Client":
                  clientName = value;
                  break;
                case "Bundle-Format":
                  bundleFormat = value;
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

            if (node.bundledIn) {
              bundledIn = node.bundledIn.id;
            }

            if (bundleFormat === "binary") {
              // this is a bundle
              bundleTx.appName = appName;
              bundleTx.appVersion = appVersion;
              bundleTx.dataSize = +data.size;
              bundleTx.fee = +fee.ar;
              bundleTx.quantity = +node.quantity.ar;
              bundleTxs.push(bundleTx);
            } else if (communityTip !== 0) {
              tipTx.appName = appName;
              tipTx.appVersion = appVersion;
              tipTx.owner = node.owner.address;
              tipTx.quantity = +communityTip;
              tipTx.id = node.id;
              tipTx.blockHeight = block.height;
              tipTx.blockTime = block.timestamp;
              tipTx.friendlyDate = timeStamp.toLocaleString();
              tipTxs.push(tipTx);
            } else if (
              entityType === "data" &&
              arFsVersion === "" &&
              communityTip === 0
            ) {
              // this is a file data tx and therefore has no ArFS tag or entity type tag or community tip tag
              if (+fee.ar === 0) {
                // This is a bundle
                fileDataTx.dataItemSize = +data.size;
              } else {
                fileDataTx.dataSize = +data.size;
              }
              fileDataTx.appName = appName;
              fileDataTx.appVersion = appVersion;
              fileDataTx.owner = node.owner.address;
              fileDataTx.private = encrypted;
              fileDataTx.fee = +fee.ar;
              fileDataTx.contentType = contentType;
              fileDataTx.bundledIn = bundledIn;
              fileDataTx.id = node.id;
              fileDataTx.blockHeight = block.height;
              fileDataTx.blockTime = block.timestamp;
              fileDataTx.friendlyDate = timeStamp.toLocaleString();
              fileDataTxs.push(fileDataTx);
            } else if (entityType === "file") {
              // THIS IS A FILE METADATA TX
              if (+fee.ar === 0) {
                // This is a bundle
                fileTx.dataItemSize = +data.size;
              } else {
                fileTx.dataSize = +data.size;
              }
              fileTx.appName = appName;
              fileTx.appVersion = appVersion;
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
              // THIS IS A FOLDER METADATA TX
              if (+fee.ar === 0) {
                // This is a bundle
                folderTx.dataItemSize = +data.size;
              } else {
                folderTx.dataSize = +data.size;
              }
              folderTx.appName = appName;
              folderTx.appVersion = appVersion;
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
              // THIS IS A DRIVE METADATA TX
              if (+fee.ar === 0) {
                // This is a bundle
                driveTx.dataItemSize = +data.size;
              } else {
                driveTx.dataSize = +data.size;
              }
              driveTx.appName = appName;
              driveTx.appVersion = appVersion;
              driveTx.arfsVersion = arFsVersion;
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
            }
            lastBlock = block.height;
          }
        });
      }
    } catch (err) {
      console.log(err);
      console.log("Error getting transactions at Blockheight");
      hasNextPage = false;
    }
  }
  console.log("Missing Data Errors: %s", missingDataErrors);
  return {
    bundleTxs,
    fileDataTxs,
    fileTxs,
    folderTxs,
    driveTxs,
    tipTxs,
    lastBlock,
  };
}

// Queries a range of blocks and sums up every data transaction for a start and end period and returns newest results first
export async function getAllAppTransactionsByBlocks_Inferno(
  minBlock: number,
  maxBlock: number,
  appName: string
): Promise<{ appResults: InfernoUser[]; gqlRequests: number }> {
  let gqlRequests = 0;
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let hasNextPage = true;
  //let lastBlock = 0;
  let appResults: InfernoUser[] = [];

  console.log(
    "Querying for %s Transactions after block %s to block %s",
    appName,
    minBlock,
    maxBlock
  );

  while (hasNextPage) {
    const query = {
      query: `query {
          transactions(
            tags: [
                { name: "App-Name", values: ["${appName}"]}
            ]
            sort: HEIGHT_DESC
            block: {min: ${minBlock}, max: ${maxBlock}}
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
            "getAllAppTransactionsByBlocks_Inferno... Undefined data returned from Gateway"
          );
          return 0;
        } else {
          const { transactions } = data;
          return transactions;
        }
      });
      gqlRequests++;
      if (transactions === 0) {
        console.log("Gateway returned an empty JSON.");
        await sleep(1000);
      } else {
        hasNextPage = transactions.pageInfo.hasNextPage;
        const { edges } = transactions;
        edges.forEach((edge: any) => {
          let entityType = "";
          cursor = edge.cursor;
          const { node } = edge;
          const { block } = node;
          const { owner } = node;
          if (block !== null) {
            // let timeStamp = new Date(block.timestamp * 1000);
            // Prepare our files
            const { tags } = node;
            const { data } = node;
            let dataSize = 0;
            let bundleFormat = "";

            tags.forEach((tag: any) => {
              const key = tag.name;
              const { value } = tag;
              switch (key) {
                case "Bundle-Format":
                  bundleFormat = value;
                  break;
                case "Entity-Type":
                  entityType = value;
                  break;
                default:
                  break;
              }
            });

            if (!node.bundledIn || bundleFormat === "binary") {
              //console.log ("Found Inferno User %s Tx in Block: %s at Time: %s with size", owner.address, lastBlock, timeStamp.toLocaleString(), +data.size)
              //console.log (tags)
              dataSize = +data.size;
            }

            let objIndex = appResults.findIndex(
              (obj) => obj.address === owner.address
            );
            if (objIndex >= 0) {
              // If it exists, then we increment the existing data amount
              // console.log ("Existing wallet found %s with %s data", results[objIndex].address, results[objIndex].size);
              appResults[objIndex].size += dataSize;
              if (entityType === "file") {
                appResults[objIndex].files++;
              }
            } else {
              // Else we add a new user into our Astatine List
              // console.log("Adding new wallet ", owner.address);
              let infernoUser: InfernoUser = {
                address: owner.address,
                size: dataSize,
                files: 0,
                elligible: false,
                rank: 0,
              };
              if (entityType === "file") {
                infernoUser.files++;
              }
              appResults.push(infernoUser);
            }
            //lastBlock = block.height;
          }
        });
      }
    } catch (err) {
      console.log(err);
      console.log("Error getting transactions at Blockheight");
      hasNextPage = false;
    }
  }
  // console.log("Missing Data Errors: %s", missingDataErrors);
  return { appResults, gqlRequests };
}

// Queries a range of blocks and sums up every data transaction for a start and end period and returns newest results first
export async function getAllAppTransactionsByDate_Inferno(
  start: Date,
  end: Date,
  appName: string
): Promise<{
  appResults: InfernoUser[];
  minBlock: number;
  maxBlock: number;
  gqlRequests: number;
}> {
  let gqlRequests = 0;
  let firstPage: number = 100; // Max size of query for GQL
  let timeStamp = new Date(end);
  let cursor: string = "";
  let hasNextPage = true;
  let appResults: InfernoUser[] = [];
  let startBlock = 0;
  let endBlock = 0;

  let minBlock = await getMinBlock(start);
  let maxBlock = await getMaxBlock(end);

  console.log(
    "Querying for %s Transactions after block %s to %s from %s to %s",
    appName,
    minBlock,
    maxBlock,
    start.toLocaleString(),
    end.toLocaleString()
  );

  while (hasNextPage) {
    const query = {
      query: `query {
          transactions(
            tags: [
                { name: "App-Name", values: ["${appName}"]}
            ]
            sort: HEIGHT_DESC
            block: {min: ${minBlock}, max: ${maxBlock}}
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
            "getAllAppTransactionsByDate_Inferno... Undefined data returned from Gateway"
          );
          return 0;
        } else {
          const { transactions } = data;
          return transactions;
        }
      });
      gqlRequests++;
      if (transactions === 0) {
        console.log("Gateway returned an empty JSON.");
        await sleep(1000);
      } else {
        hasNextPage = transactions.pageInfo.hasNextPage;
        const { edges } = transactions;
        edges.forEach((edge: any) => {
          let entityType = "";
          cursor = edge.cursor;
          const { node } = edge;
          const { block } = node;
          const { owner } = node;
          if (block !== null) {
            timeStamp = new Date(block.timestamp * 1000);
            if (
              start.getTime() <= timeStamp.getTime() &&
              end.getTime() >= timeStamp.getTime()
            ) {
              if (startBlock === 0) {
                startBlock = block.height;
              }
              endBlock = block.height;
              // Prepare our files
              const { tags } = node;
              const { data } = node;
              let dataSize = 0;
              let bundleFormat = "";
              console.log("%s at %s", appName, block.height);
              tags.forEach((tag: any) => {
                const key = tag.name;
                const { value } = tag;
                switch (key) {
                  case "Bundle-Format":
                    bundleFormat = value;
                    break;
                  case "Entity-Type":
                    entityType = value;
                    break;
                  default:
                    break;
                }
              });

              if (
                (!node.bundledIn && entityType === "") ||
                bundleFormat === "binary"
              ) {
                //console.log ("Found Inferno User %s Tx in Block: %s at Time: %s with size", owner.address, lastBlock, timeStamp.toLocaleString(), +data.size)
                //console.log (tags)
                dataSize = +data.size;
              }

              let objIndex = appResults.findIndex(
                (obj) => obj.address === owner.address
              );
              if (objIndex >= 0) {
                // If it exists, then we increment the existing data amount
                // console.log ("Existing wallet found %s with %s data", results[objIndex].address, results[objIndex].size);
                appResults[objIndex].size += dataSize;
                if (entityType === "file") {
                  appResults[objIndex].files++;
                }
              } else {
                // Else we add a new user into our Astatine List
                // console.log("Adding new wallet ", owner.address);
                let infernoUser: InfernoUser = {
                  address: owner.address,
                  size: dataSize,
                  files: 0,
                  elligible: false,
                  rank: 0,
                };
                if (entityType === "file") {
                  infernoUser.files++;
                }
                appResults.push(infernoUser);
              }
            }
            if (timeStamp.getTime() > end.getTime()) {
              // console.log ("Result too early %s", timeStamp)
              // hasNextPage = false; // if it is ASC
            } else if (timeStamp.getTime() < start.getTime()) {
              // console.log ("Result too old %s", timeStamp)
              hasNextPage = false; // if it is DESC
            } else {
              // console.log ("Block is null so we skip this transaction %s", node.Id);
            }
          }
        });
      }
    } catch (err) {
      console.log(err);
      console.log("Error getting transactions at Blockheight");
      hasNextPage = false;
    }
  }
  // console.log("Missing Data Errors: %s", missingDataErrors);
  return { appResults, minBlock: startBlock, maxBlock: endBlock, gqlRequests };
}

// Gets ArDrive Drive information from a start and end date
export async function getAllDrives_ASC(
  start: Date,
  end: Date,
  lastBlock: number
): Promise<ArFSDriveTx[]> {
  let firstPage: number = 100; // Max size of query for GQL
  let cursor: string = "";
  let driveTxs: ArFSDriveTx[] = [];
  let hasNextPage = true;
  let timeStamp = new Date(end);

  let minBlock = 1;
  if (lastBlock === 1) {
    minBlock = await getMinBlock(start);
  } else {
    minBlock = lastBlock;
    console.log("Continuing getting all Drives from block %s", lastBlock);
  }

  try {
    while (hasNextPage) {
      const query = {
        query: `query {
                transactions(
                    tags: [
                        { name: "App-Name", values: ["${desktopAppName}", "${webAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}", "${syncAppName}"]}
                        { name: "Entity-Type", values: "drive" }
                      ]
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
      const transactions = await queryGateway(async (url: string) => {
        const response = await arweave.api.post(url + "/graphql", query);
        const { data } = response.data;
        if (data === undefined) {
          console.log(
            "Get All App Transactions DESC... Undefined data returned from Gateway"
          );
          console.log(response.statusText);
          return 0;
        } else {
          const { transactions } = data;
          return transactions;
        }
      });
      if (transactions === 0) {
        console.log(
          "%s Gateway returned an empty JSON at %s.  Trying again",
          timeStamp,
          lastBlock
        );
      } else {
        const { edges } = transactions;
        hasNextPage = transactions.pageInfo.hasNextPage;
        edges.forEach((edge: any) => {
          cursor = edge.cursor;
          const { node } = edge;
          const { block } = node;
          if (block !== null) {
            timeStamp = new Date(block.timestamp * 1000);
            if (
              start.getTime() <= timeStamp.getTime() &&
              end.getTime() >= timeStamp.getTime()
            ) {
              lastBlock = block.height;
              // Prepare our files
              const { tags } = node;
              const { data } = node;
              const { fee } = node;
              let driveTx = newArFSDriveTx();
              let encrypted = false;
              let appName = "";
              let appVersion = "";
              let clientName = "";
              let contentType = "";
              let arFsVersion = "";
              let bundledIn = "";

              tags.forEach((tag: any) => {
                const key = tag.name;
                const { value } = tag;
                switch (key) {
                  case "Cipher-IV":
                    encrypted = true;
                    break;
                  case "App-Name":
                    appName = value;
                    break;
                  case "App-Version":
                    appVersion = value;
                    break;
                  case "ArFS":
                    arFsVersion = value;
                    break;
                  case "ArDrive-Client":
                    clientName = value;
                    break;
                  case "Content-Type":
                    contentType = value;
                    break;
                  default:
                    break;
                }
              });

              if (clientName.includes("ArConnect")) {
                appName = "ArConnect";
              }

              if (node.bundledIn) {
                bundledIn = node.bundledIn.id;
              }

              if (+fee.ar === 0) {
                // This is a bundle
                driveTx.dataItemSize = +data.size;
              } else {
                driveTx.dataSize = +data.size; // this is a v2 tx
              }

              driveTx.appName = appName;
              driveTx.appVersion = appVersion;
              driveTx.arfsVersion = arFsVersion;
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
            } else if (timeStamp.getTime() > end.getTime()) {
              // console.log ("Result too old")
              hasNextPage = false;
            } else {
              // result too early
            }
          }
        });
      }
    }
    return driveTxs;
  } catch (err) {
    console.log(err);
    console.log("Error collecting total number of Drives");
    return driveTxs;
  }
}

/////////////////// Newest Scripts

// Gets all ANS 104 Bundle Transactions
export async function getBundleTransactions_ASC(
  start: Date,
  end: Date
): Promise<BundleTx[]> {
  let bundles: BundleTx[] = [];
  let cursor: string = "";
  let hasNextPage = true;
  let timeStamp = new Date(end);
  let minBlock = await getMinBlock(start);
  console.log(`Querying for all bundle transactions starting at ${minBlock} `);
  try {
    while (hasNextPage) {
      const query = {
        query: `query {
                transactions(
                  tags: [
                    { name: "App-Name", values: ["${desktopAppName}", "${webAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}", "${syncAppName}"]}
                    { name: "Bundle-Format", values: "binary"}
                  ]
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
                      tags {
                          name
                          value
                      }
                      quantity {
                        ar
                      }
                      owner {
                        address
                      }
                      fee {
                        ar
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
      const transactions = await queryGateway(async (url: string) => {
        const response = await arweave.api.post(url + "/graphql", query);
        const { data } = response.data;
        const { transactions } = data;
        return transactions;
      });
      const { edges } = transactions;
      console.log(
        `Block: ${edges[0].node.block.height} - ${edges.length} results found`
      );
      hasNextPage = transactions.pageInfo.hasNextPage;
      edges.forEach((edge: any) => {
        cursor = edge.cursor;
        const { node } = edge;
        const { data } = node;
        const { block } = node;
        const { tags } = node;
        if (block !== null) {
          timeStamp = new Date(block.timestamp * 1000);
          if (
            start.getTime() <= timeStamp.getTime() &&
            end.getTime() >= timeStamp.getTime()
          ) {
            let bundle = newBundleTx();
            // We only want data transactions
            if (data.size > 0) {
              //console.log ("Matching bundled data transaction: ", timeStamp)
              tags.forEach((tag: any) => {
                const key = tag.name;
                const { value } = tag;
                switch (key) {
                  case "App-Name":
                    bundle.appName = value;
                    break;
                  case "App-Version":
                    bundle.appVersion = value;
                    break;
                  default:
                    break;
                }
              });
              bundle.owner = node.owner.address;
              bundle.dataSize = +data.size;
              bundle.quantity = +node.quantity.ar;
              bundle.fee = +node.fee.ar;
              bundle.timeStamp = timeStamp.getTime();
              bundles.push(bundle);
            }
          } else if (timeStamp.getTime() > end.getTime()) {
            //console.log ("Result too early %s", timeStamp)
            hasNextPage = false;
          } else {
            //console.log ("Result too old %s", timeStamp)
          }
        }
      });
    }
    return bundles;
  } catch (err) {
    console.log(err);
    console.log("Error collecting all bundles");
    return bundles;
  }
}

// Sums up every data transaction for a start and end period and returns newest results first
export async function getAllAppL1Transactions(
  start: Date,
  end: Date,
  appName?: string
): Promise<L1ResultSet> {
  let cursor: string = "";
  let timeStamp = new Date(end);
  let hasNextPage = true;
  let missingDataErrors = 0;
  let lastBlock = 1;

  let bundleTxs: BundleTx[] = [];
  let fileTxs: ArFSFileTx[] = [];
  let folderTxs: ArFSFolderTx[] = [];
  let driveTxs: ArFSDriveTx[] = [];
  let fileDataTxs: ArFSFileDataTx[] = [];
  let tipTxs: ArFSTipTx[] = [];

  let minBlock: number;
  minBlock = await getMinBlock(start);
  if (appName === undefined) {
    appName = `${desktopAppName}", "${webAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}", "${syncAppName}`;
  }

  console.log(`Querying for all L1Transactions starting at ${minBlock}`);

  while (hasNextPage) {
    const query = {
      query: `query {
          transactions(
            tags: [
              { name: "App-Name", values: ["${appName}"]}
            ]
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
            "Get All App Transactions DESC... Undefined data returned from Gateway"
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
        edges.forEach((edge: any) => {
          cursor = edge.cursor;
          const { node } = edge;
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
              let tipTx = newArFSTipTx();
              let encrypted = false;
              let contentType = "";
              let appName = "";
              let appVersion = "";
              let clientName = "";
              let entityType = "data";
              let arFsVersion = "";
              let bundledIn = "";
              let bundleFormat = "";
              let communityTip = 0;

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
                  case "App-Name":
                    appName = value;
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
                bundleTx.dataSize = +data.size;
                bundleTx.fee = +fee.ar;
                bundleTx.quantity = +node.quantity.ar;
                bundleTx.owner = node.owner.address;
                bundleTxs.push(bundleTx);
              } else if (communityTip !== 0) {
                tipTx.appName = appName;
                tipTx.appVersion = appVersion;
                tipTx.owner = node.owner.address;
                tipTx.quantity = +communityTip;
                tipTx.id = node.id;
                tipTx.blockHeight = block.height;
                tipTx.blockTime = block.timestamp;
                tipTx.friendlyDate = timeStamp.toLocaleString();
                tipTxs.push(tipTx);
              } else if (
                entityType === "data" &&
                arFsVersion === "" &&
                communityTip === 0
              ) {
                // This is file data since it has no entity tag
                fileDataTx.dataSize = +data.size;
                fileDataTx.appName = appName;
                fileDataTx.appVersion = appVersion;
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
              }
            }
          }
          if (timeStamp.getTime() > end.getTime()) {
            // console.log("Result too early %s", timeStamp);
            hasNextPage = false; // if it is ASC
          } else if (timeStamp.getTime() < start.getTime()) {
            // console.log("Result too old %s", timeStamp);
            // hasNextPage = false; // if it is DESC
          } else {
            //console.log(
            //  "Block is null so we skip this transaction %s",
            //  node.Id
            //);
          }
        });
        console.log(`Got ${edges.length} with last block ${lastBlock}`);
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
    tipTxs,
  };
}

// Gets all ArDrive Community Tips/Fees sent
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

// Gets ArDrive information from a start and and date
export async function getArDriveUsers(
  start: Date,
  end: Date
): Promise<{
  foundTransactions: number;
  foundUsers: {
    [wallet: string]: number;
  };
}> {
  let bundleTxs = await getBundleTransactions_ASC(start, end);

  let cursor: string = "";
  let foundTransactions = 0;
  let foundUsers: {
    [wallet: string]: number;
  } = {};
  let hasNextPage = true;

  // To calculate the no. of days between two dates
  let minBlock = await getMinBlock(start);

  try {
    while (hasNextPage) {
      const query = {
        query: `query {
                transactions(
                    tags: [
                      { name: "App-Name", values: ["${desktopAppName}", "${webAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}"]}
                      { name: "Entity-Type", values: "drive" }
                    ]
                    bundledIn: ""
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
                            owner {
                                address
                            }
                            tags {
                                name
                                value
                            }
                            block {
                                timestamp
                                height
                            }
                            data {
                                size
                            }
                        }
                    }
                }
            }`,
      };
      const transactions = await queryGateway(async (url: string) => {
        const response = await arweave.api.post(url + "/graphql", query);
        const { data } = response.data;
        if (data === undefined) {
          console.log(response.statusText);
          console.log(response);
          console.log(
            "Get All Unique ArDrive Users... Undefined data returned from Gateway"
          );
          return 0;
        } else {
          const { transactions } = data;
          return transactions;
        }
      });
      if (transactions === 0) {
        console.log("%s Gateway returned an empty JSON.");
        await sleep(1000);
      } else {
        const { edges } = transactions;
        console.log(
          `Block: ${edges[0].node.block.height} - ${edges.length} results found`
        );
        hasNextPage = transactions.pageInfo.hasNextPage;
        edges.forEach((edge: any) => {
          cursor = edge.cursor;
          const { node } = edge;
          const { block } = node;
          const { owner } = node;
          if (block !== null) {
            let timeStamp = new Date(block.timestamp * 1000);
            // We only want results between our start and end dates, defined by milliseconds since epoch
            // console.log(timeStamp.toLocaleString());
            if (
              start.getTime() <= timeStamp.getTime() &&
              end.getTime() >= timeStamp.getTime()
            ) {
              //console.log ("Matching ardrive transaction: ", timeStamp)
              foundTransactions += 1;
              foundUsers[`${owner.address}`] = timeStamp.getTime();
            } else if (timeStamp.getTime() > end.getTime()) {
              //console.log("Result too early");
              // hasNextPage = false;
            } else {
              console.log("Result too old");
              hasNextPage = false;
            }
          }
        });
      }
    }
    // Merge results
    bundleTxs.forEach((bundleTx) => {
      if (!foundUsers[bundleTx.owner]) {
        foundUsers[bundleTx.owner] = bundleTx.timeStamp;
      } else if (foundUsers[bundleTx.owner] < bundleTx.timeStamp) {
        foundUsers[bundleTx.owner] = bundleTx.timeStamp;
      }
    });
    return { foundTransactions, foundUsers };
  } catch (err) {
    console.log(err);
    console.log("Error collecting total number of ArDrive Users");
    return { foundTransactions, foundUsers };
  }
}
