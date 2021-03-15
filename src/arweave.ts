import Arweave from 'arweave';
import { dataCompare, formatBytes } from './common';
import { BlockInfo, ArDriveStat, ContentType, AstatineItem } from './types';
import { readContract } from "smartweave";

const appName = "ArDrive-Desktop";
const webAppName = "ArDrive-Web";

// ArDrive Profit Sharing Community Smart Contract
const communityTxId = '-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ';


const fetch = require('node-fetch')
const arweave = Arweave.init({
    host: 'arweave.net', // Arweave Gateway
    port: 443,
    protocol: 'https',
    timeout: 600000,
  });



// Gets the latest price of Arweave in USD
export const getArUSDPrice = async () : Promise<number> => {
  let usdPrice = 0;
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=arweave&vs_currencies=usd"
    );
    usdPrice = (await res.clone().json()).arweave.usd;
    return usdPrice;
  }
  catch (err) {
    console.log ("Error getting AR/USD price from Coingecko")
    return 0;
  }
};

// Gets the price of AR based on amount of data
export const getDataPrice = async (bytes: number) => {
    const response = await fetch(`https://arweave.net/price/${bytes}`);
    const winstonAmount = await response.json();
    const arweaveAmount = +winstonAmount * 0.000000000001;
    return arweaveAmount;
};

// Gets the latest block height
export const getCurrentBlockHeight = async () => {
    const response = await fetch(`https://arweave.net/height/`);
    const height = await response.json()
    return height;
};

// Gets the total weave size from the latest block
export const getLatestBlockInfo = async (height: number) => {
    let latestBlock : BlockInfo = {
        weaveSize: 0,
        difficulty: 0,
        blockSize: 0,
    }
    const response = await fetch(`https://arweave.net/block/height/${height}`);
    const blockInfo = await response.json()
    latestBlock.weaveSize = blockInfo['weave_size']
    latestBlock.difficulty = blockInfo['diff']
    latestBlock.blockSize = blockInfo['block_size']
    return latestBlock;
};

// Gets ArDrive information from a start and and date
export const getAllArDrives = async (start: Date, end: Date) => {
    let firstPage : number = 100; // Max size of query for GQL
    let cursor : string = "";
    let arDriveStats : ArDriveStat[] = [];
    let found = 1;
    try {
      while (found > 0) {
        let transactions = await queryForAllArDrives(firstPage, cursor);
        const { edges } = transactions;
        found = edges.length;
        edges.forEach((edge: any) => {
            cursor = edge.cursor;
            const { node } = edge;
            const { owner } = node;
            const { block } = node;
            if (block !== null) {
                let timeStamp = new Date(block.timestamp * 1000);
                // We only want results between our start and end dates, defined by milliseconds since epoch
                if ((start.getTime() <= timeStamp.getTime()) && (end.getTime() >= timeStamp.getTime())) {
                    //console.log ("Matching ardrive transaction: ", timeStamp)
                    const { tags } = node;
                    let arDriveStat: ArDriveStat = {
                        address: owner.address,
                        privacy: '',
                        appName: '',
                        driveId: '',
                        tx: node.id,
                        data: 0,
                        blockTimeStamp: timeStamp,
                    }
                    tags.forEach((tag: any) => {
                        const key = tag.name;
                        const { value } = tag;
                        switch (key) {
                        case 'App-Name':
                            arDriveStat.appName = value;
                            break;
                        case 'Drive-Privacy':
                            arDriveStat.privacy = value;
                            break;
                        case 'Drive-Id':
                            arDriveStat.driveId = value;
                            break;
                        default:
                            break;
                        };
                    })
                    arDriveStats.push(arDriveStat);
                } else if (timeStamp.getTime() > end.getTime()) {
                  // console.log ("Result too old")
                  found = 0;
                } else {
                  // result too early
                }
            }
        })
      }
      return arDriveStats;
    } catch (err) {
        console.log (err)
        console.log ("Error collecting total number of ArDrives")
        return arDriveStats;
    }
};

// Sums up every bundled data transaction for a start and end period.
export const getTotalBundledDataTransactionsSize = async (start: Date, end: Date) => {
    let bundledDataSize = 0;
    let webAppDataSize = 0;
    let desktopDataSize = 0;
    let firstPage : number = 100; // Max size of query for GQL
    let cursor : string = "";
    let found = 1;
    let timeStamp = new Date(end);
    try {
        while (found > 0) {
            let transactions = await queryForBundledDataUploads(firstPage, cursor);
            const { edges } = transactions;
            found = edges.length;
            // Create the query to search for all ardrive transactions.
            edges.forEach((edge: any) => {
                cursor = edge.cursor;
                const { node } = edge;
                const { data } = node;
                const { block } = node;
                const { tags } = node;
                if (block !== null) {
                    timeStamp = new Date(block.timestamp * 1000);
                    if ((start.getTime() <= timeStamp.getTime()) && (end.getTime() >= timeStamp.getTime())) {
                        // We only want data transactions
                        if (data.size > 0) {
                            //console.log ("Matching bundled data transaction: ", timeStamp)
                            let appName = '';
                            tags.forEach((tag: any) => {
                                const key = tag.name;
                                const { value } = tag;
                                switch (key) {
                                case 'App-Name':
                                    appName = value;
                                    break;
                                default:
                                    break;
                                };
                            })
                            bundledDataSize += +data.size;
                            if (appName === 'ArDrive-Web') {
                                webAppDataSize += +data.size;
                            } else if (appName === 'ArDrive-Desktop') {
                                desktopDataSize += +data.size;
                            }
                        }
                    } else if (timeStamp.getTime() > end.getTime()) {
                      // console.log ("Result too old")
                      found = 0;
                    } else {
                      // result too early
                    }
                }
            })
        }
    return {bundledDataSize, webAppDataSize, desktopDataSize}
    } catch (err) {
        console.log (err)
        console.log ("Error collecting total amount of uploaded data")
        return {bundledDataSize, webAppDataSize, desktopDataSize}
    }

}

// Sums up every data transaction for a start and end period.
export const getTotalDataTransactionsSize = async (start: Date, end: Date) => {
    let lastBlock = 1;
    let publicDataSize = 0;
    let privateDataSize = 0;
    let publicFiles = 0;
    let privateFiles = 0;
    let webAppFiles = 0;
    let desktopFiles = 0;
    let publicArFee = 0;
    let privateArFee = 0;
    let contentType : string = '';
    let contentTypes : ContentType[] = [];
    let firstPage : number = 100; // Max size of query for GQL
    let cursor : string = "";
    let found = 1;
    let timeStamp = new Date(end);
    let today = new Date();

    // To calculate the no. of days between two dates
    const blocksPerDay = 670;
    let height = await getCurrentBlockHeight();
    const startDays = today.getTime() - start.getTime()
    const startDaysDiff = Math.floor(startDays / (1000 * 3600 * 24));
    const minBlock = height - (blocksPerDay * startDaysDiff)

    try {
        while (found > 0) {
            let transactions = await queryForDataUploads(minBlock, firstPage, cursor);
            const { edges } = transactions;
            found = edges.length;
            // Create the query to search for all ardrive transactions.
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
                    if ((start.getTime() <= timeStamp.getTime()) && (end.getTime() >= timeStamp.getTime())) {
                        // We only want data transactions
                        if (data.size > 0) {
                          //console.log ("Matching data transaction: %s %s", node.id, timeStamp)
                            let cipherIV = "public";
                            let appName = '';
                            tags.forEach((tag: any) => {
                                const key = tag.name;
                                const { value } = tag;
                                switch (key) {
                                case 'Cipher-IV':
                                  cipherIV = value;
                                  break;
                                case 'Content-Type':
                                  contentType = value;
                                  break;
                                case 'App-Name':
                                  appName = value;
                                  break;
                                default:
                                  break;
                                };
                            })
                            if (cipherIV === 'public') {
                                publicDataSize += +data.size;
                                publicArFee += +fee.ar;
                                publicFiles += 1;
                                // Does this content type exist in our array?
                                let objIndex = contentTypes.findIndex((obj => obj.contentType === contentType));
                                if (objIndex >= 0) {
                                  // If it exists, then we increment the existing data amount
                                  contentTypes[objIndex].count += 1;
                                } 
                                else {
                                  // Else we add a content type to our Content Types list
                                  // console.log ("New Content Type Found %s ", contentType)
                                  let newContentType: ContentType = {
                                    contentType,
                                    count: 1
                                  };
                                  contentTypes.push(newContentType);
                                }
                            }
                            else {
                                privateDataSize += +data.size;
                                privateArFee += +fee.ar;
                                privateFiles += 1;
                            }
                            if (appName === 'ArDrive-Web') {
                                webAppFiles += 1;
                            } else if (appName === 'ArDrive-Desktop') {
                                desktopFiles += 1;
                            }
                        }
                    } else if (timeStamp.getTime() > end.getTime()) {
                      // console.log ("Result too old")
                      found = 0;
                    } else {
                      // result too early
                    }
                }
            })
        }
    return {publicDataSize, privateDataSize, publicFiles, privateFiles, publicArFee, privateArFee, webAppFiles, desktopFiles, contentTypes, lastBlock}
    } catch (err) {
        console.log (err)
        console.log ("Error collecting total amount of uploaded data")
        return {publicDataSize, privateDataSize, publicFiles, privateFiles, publicArFee, privateArFee, webAppFiles, desktopFiles, lastBlock}
    }

}

// Sums up all ArDrive Community Tips/Fees
export const getTotalArDriveCommunityFees = async (start: Date, end: Date) => {
  let totalFees = 0;
  let desktopFees = 0;
  let webAppFees = 0;
  let firstPage : number = 100; // Max size of query for GQL
  let cursor : string = "";
  let found = 1;
  let timeStamp = new Date(end);
  try {
      while (found > 0) {
        let transactions = await queryForArDriveCommunityFees(firstPage, cursor);
        const { edges } = transactions;
        found = edges.length;
        // Create the query to search for all ardrive transactions.
        edges.forEach((edge: any) => {
            cursor = edge.cursor;
            const { node } = edge;
            const { fee } = node;
            const { block } = node;
            const { tags } = node;
            if (block !== null) {
                timeStamp = new Date(block.timestamp * 1000);
                if ((start.getTime() <= timeStamp.getTime()) && (end.getTime() >= timeStamp.getTime())) {
                  //console.log ("Matching community fee transaction: ", timeStamp)
                  let appName = '';
                  tags.forEach((tag: any) => {
                      const key = tag.name;
                      const { value } = tag;
                      switch (key) {
                      case 'App-Name':
                          appName = value;
                          break;
                      default:
                          break;
                      };
                  })
                  totalFees += +fee.ar;
                  if (appName === 'ArDrive-Web') {
                    webAppFees += +fee.ar;
                  } else if (appName === 'ArDrive-Desktop') {
                    desktopFees += +fee.ar;
                  }
                } else if (timeStamp.getTime() > end.getTime()) {
                  // console.log ("Result too old")
                  found = 0;
                } else {
                  // result too early
                }
            }
        })
      }
  return {totalFees, webAppFees, desktopFees};
  } catch (err) {
      console.log (err)
      console.log ("Error collecting total amount of fees")
      return {totalFees, webAppFees, desktopFees};
  }
}

// Sums up all transactions for a drive
export const getTotalDriveSize = async (owner: string, start: Date, end: Date) => {
  let totalDriveSize = 0;
  let totalDriveTransactions = 0
  let firstPage : number = 100; // Max size of query for GQL
  let cursor : string = "";
  let found = 1;
  let timeStamp = new Date(end);
  try {
    while (found > 0) {
      let transactions = await queryForDriveSize(owner, firstPage, cursor);
      const { edges } = transactions;
      found = edges.length;
      // Create the query to search for all ardrive transactions.
      edges.forEach((edge: any) => {
          cursor = edge.cursor;
          const { node } = edge;
          const { data } = node;
          const { block } = node;
          if (block !== null) {
            timeStamp = new Date(block.timestamp * 1000);
            if ((start.getTime() <= timeStamp.getTime()) && (end.getTime() >= timeStamp.getTime())) {
              if (data !== null) {
                totalDriveSize += +data.size;
                totalDriveTransactions += 1;
              }
            }
          }
      })
    }
  const formattedSize = formatBytes(totalDriveSize)
  return {owner, totalDriveSize, formattedSize, totalDriveTransactions};
  } catch (err) {
      console.log (err)
      console.log ("Error getting all sizes of an owners drives")
      return {owner, totalDriveSize, totalDriveTransactions};
  }
}

// Creates a GraphQL Query to search for all ArDrive entities and requests it from the primary Arweave gateway
const queryForAllArDrives = async (firstPage: number, cursor: string) => {
  try {
      const query = {
      query: `query {
          transactions(
              tags: [
                  { name: "App-Name", values: ["ArDrive-Desktop", "ArDrive-Web"] }
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
      // Call the Arweave Graphql Endpoint
      const response = await arweave.api
      .request()
      .post('https://arweave.net/graphql', query);
      const { data } = response.data;
      const { transactions } = data;
      return transactions;
  } catch (err) {
      console.log (err)
      console.log ("Cannot query for all ArDrives")
  }
}

// Creates a GraphQL Query to return all transactions for a drive
async function queryForDriveSize(owner: string, firstPage: number, cursor: string) {
  try {
    const query = {
      query: `query {
        transactions(
          owners: ["${owner}"]
          tags: [
            { name: "App-Name", values: ["${appName}", "${webAppName}"]}
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
  // Call the Arweave Graphql Endpoint
  const response = await arweave.api
    .request()
    .post('https://arweave.net/graphql', query);
  const { data } = response.data;
  const { transactions } = data;
  return transactions;
} catch (err) {
  console.log (err)
  console.log ("uh oh cant query")
}
}

// Creates a GraphQL Query to search for all ArDrive Data transactions and requests it from the primary Arweave gateway
async function queryForDataUploads(minBlock: number, firstPage: number, cursor: string) {
    try {
    const query = {
      query: `query {
      transactions(
        tags: { name: "App-Name", values: ["ArDrive-Desktop", "ArDrive-Web"] }
        block: {min: ${minBlock}}
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
    // Call the Arweave Graphql Endpoint
    const response = await arweave.api
      .request()
      .post('https://arweave.net/graphql', query);
    const { data } = response.data;
    const { transactions } = data;
    return transactions;
  } catch (err) {
    console.log (err)
    console.log ("uh oh cant query")
  }
}

// Creates a GraphQL Query to search for all ArDrive Data transactions and requests it from the primary Arweave gateway
async function queryForBundledDataUploads(firstPage: number, cursor: string) {
    try {
    const query = {
      query: `query {
      transactions(
        tags: [
            { name: "App-Name", values: ["ArDrive-Desktop", "ArDrive-Web"] }
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
    // Call the Arweave Graphql Endpoint
    const response = await arweave.api
      .request()
      .post('https://arweave.net/graphql', query);
    const { data } = response.data;
    const { transactions } = data;
    return transactions;
  } catch (err) {
    console.log (err)
    console.log ("uh oh cant query")
  }
}

// Creates a GraphQL Query to search for all ArDrive Community Fees
async function queryForArDriveCommunityFees(firstPage: number, cursor: string) {
  try {
      const query = {
        query: `query {
        transactions(
          tags: [
              { name: "App-Name", values: ["ArDrive-Desktop", "ArDrive-Web"] }
              { name: "Tip-Type", values: "data upload"}
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
              tags {
                name
                value
              }
              fee {
                  ar
              }
              block {
                timestamp
              }
            }
          }
        }
      }`,
      };
      // Call the Arweave Graphql Endpoint
      const response = await arweave.api
        .request()
        .post('https://arweave.net/graphql', query);
      const { data } = response.data;
      const { transactions } = data;
      return transactions;
    } catch (err) {
      console.log (err)
      console.log ("uh oh cant query")
    }
}

// Gets the count of ArDrive token holders
export async function getTokenHolderCount() : Promise<number>  {
  try {
    // Read the ArDrive Smart Contract to get the latest state
    const state = await readContract(arweave, communityTxId);
    const balances = state.balances;

    // Get the total number of token holders with balance > 0
    let total = 0;
    for (const addr of Object.keys(balances)) {
      total += balances[addr];
    }
    return total;
  } catch (err) {
    console.log (err)
    console.log ("Error getting token holder count")
    return 0;
  }
}

// This is used specifically for testing Astatine, and is not invoked with the Analytics script
export async function get_24_hour_ardrive_transactions() : Promise<AstatineItem[]> {
    let completed : Boolean = false;
    let weightedList : AstatineItem[] = [];
    let firstPage : number = 100; // Max size of query for GQL
    let cursor : string = "";
    let timeStamp = new Date();
    let yesterday = new Date(timeStamp);
    yesterday.setDate(yesterday.getDate() - 1);

    while (!completed) {
      // Create the query to search for all ardrive transactions.
      let transactions = await queryForDataUploads(0, firstPage, cursor);
      const { edges } = transactions;
      edges.forEach((edge: any) => {
        cursor = edge.cursor;
        const { node } = edge;
        const { data } = node;
        const { owner } = node;
        const { block } = node;
        if (block !== null) {
            let timeStamp = new Date(block.timestamp * 1000);
            // We only want results from last 24 hours, defined by milliseconds since epoch
            if (yesterday.getTime() <= timeStamp.getTime()) {
              // We only want data transactions
              if (+data.size > 0) {
                // Does this wallet address exist in our array?
                let objIndex = weightedList.findIndex((obj => obj.address === owner.address));
                if (objIndex >= 0) {
                // If it exists, then we increment the existing data amount
                  // console.log ("Existing wallet found %s with %s data", weightedList[objIndex].address, weightedList[objIndex].weight);
                  // console.log("Adding ", +data.size);
                  weightedList[objIndex].weight += +data.size;
                } 
                else {
                  // Else we add a new user into our Astatine List
                  // console.log("Adding new wallet ", owner.address);
                  let arDriveUser: AstatineItem = {
                    address: owner.address,
                    weight: +data.size,
                  };
                  weightedList.push(arDriveUser);
                }
              }
            }
            else {
              // The blocks are too old, and we dont care about them
              completed = true;
            }
        }
      })
    }
  
    // lets sort the list based on data amount
    weightedList.sort(dataCompare);
    console.log ("weighted list: ", weightedList.slice(0, 9));
    return weightedList;
}
