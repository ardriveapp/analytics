
import Arweave from 'arweave';
import { dataCompare, formatBytes } from './common';
import { BlockInfo, ArDriveStat, ContentType, AstatineItem } from './types';
import { readContract } from "smartweave";

const appName = "ArDrive-Desktop";
const webAppName = "ArDrive-Web";

// ArDrive Profit Sharing Community Smart Contract
const communityTxId = '-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ';

// GraphQLURLs
/*const gqlURLs: string[] = [
  'https://arweave.net/graphql',
  ''http://gateway.ardrive.io/graphql''
];*/

const primaryGraphQLUrl = 'https://arweave.net/graphql';
const backupGraphQLUrl = 'https://arweave.net/graphql';

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
    let hasNextPage = true;
    try {
      while (hasNextPage) {
        const transactions = await queryForAllDrives(firstPage, cursor, primaryGraphQLUrl);
        const { edges } = transactions;
        hasNextPage = transactions.pageInfo.hasNextPage
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
                  hasNextPage = false;
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
    let hasNextPage = true;
    let timeStamp = new Date(end);
    try {
        while (hasNextPage) {
            const transactions = await queryForBundledDataUploads(firstPage, cursor, primaryGraphQLUrl);
            const { edges } = transactions;
            hasNextPage = transactions.pageInfo.hasNextPage
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
                      hasNextPage = false;
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
    let timeStamp = new Date(end);
    let today = new Date();
    let hasNextPage = true;

    // To calculate the no. of days between two dates
    const blocksPerDay = 1000;
    let height = await getCurrentBlockHeight();
    const startDays = today.getTime() - start.getTime()
    const startDaysDiff = Math.floor(startDays / (1000 * 3600 * 24));
    const minBlock = height - (blocksPerDay * startDaysDiff)
    console.log ("Min block is: ", minBlock)
    let gqlUrl = primaryGraphQLUrl;
    let tries = 0;

    while (hasNextPage) {
        const query = {
          query: `query {
          transactions(
            tags: { name: "App-Name", values: ["ArDrive-Desktop", "ArDrive-Web"] }
            sort: HEIGHT_DESC
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
          // Call the Arweave Graphql Endpoint
          const response = await arweave.api
            .request()
            .post(gqlUrl, query);
          const { data } = response.data;
          const { transactions } = data;
          hasNextPage = transactions.pageInfo.hasNextPage;
          const { edges } = transactions;
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
                  console.log ("Block time: ", timeStamp.toLocaleString());
                  lastBlock = block.height;
                  if ((start.getTime() <= timeStamp.getTime()) && (end.getTime() >= timeStamp.getTime())) {
                      // We only want data transactions
                      console.log ("Matching data transaction: %s %s", node.id, timeStamp)
                      if (data.size > 0) {
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
                    // If the result is sooner than we want, continue to crawl
                    // console.log ("Result too early")
                  } else {
                    // if the result is older than we want, then stop querying
                    // console.log ("Result too old")
                    hasNextPage = false;
                  }
              }
          })
        } catch (err) {
          console.log(err);
          if (tries < 5) {
            tries += 1;
            console.log(
              'Error getting total data transaction size, trying again.');
          } else {
            tries = 0;
            if (gqlUrl === backupGraphQLUrl) {
              console.log('Backup gateway is also having issues, stopping.');
              hasNextPage = false;
            } else {
              console.log('Primary gateway is having issues, switching to backup.');
              gqlUrl = backupGraphQLUrl; // Change to the backup URL and try 5 times
            }
          }
        }
    }
    return {publicDataSize, privateDataSize, publicFiles, privateFiles, publicArFee, privateArFee, webAppFiles, desktopFiles, contentTypes, lastBlock}
}

// Sums up every data transaction for a start and end period.
// Uses an estimate of block time to try to reduce query size
export const getTotalDataTransactionsSize_WithBlocks = async (start: Date, end: Date) => {
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
  let timeStamp = new Date(end);
  let today = new Date();
  let found = 1;

  // To calculate the no. of days between two dates
  const blocksPerDay = 1000;
  let height = await getCurrentBlockHeight();
  const startDays = today.getTime() - start.getTime()
  const startDaysDiff = Math.floor(startDays / (1000 * 3600 * 24));
  const minBlock = height - (blocksPerDay * startDaysDiff)
  let gqlUrl = primaryGraphQLUrl;
  let tries = 0;
  while (found > 0) {
      const query = {
        query: `query {
        transactions(
          tags: { name: "App-Name", values: ["ArDrive-Desktop", "ArDrive-Web"] }
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
        // Call the Arweave Graphql Endpoint
        const response = await arweave.api
          .request()
          .post(gqlUrl, query);
        const { data } = response.data;
        const { transactions } = data;
        const { edges } = transactions;
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
                    // console.log ("Matching data transaction: %s %s", node.id, timeStamp)
                    if (data.size > 0) {
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
                  //console.log ("Result too early")
                }
            }
        })
      } catch (err) {
        //console.log(err);
        if (tries < 5) {
          tries += 1;
          console.log(
            'Error getting total data transaction size , trying again.');
        } else {
          tries = 0;
          if (gqlUrl.includes('.dev')) {
            console.log('Backup gateway is having issues, stopping.');
            found = 0;
          } else {
            console.log('Primary gateway is having issues, switching to backup.');
            gqlUrl = backupGraphQLUrl; // Change to the backup URL and try 5 times
          }
        }
      }
  }
  return {publicDataSize, privateDataSize, publicFiles, privateFiles, publicArFee, privateArFee, webAppFiles, desktopFiles, contentTypes, lastBlock}
}

// Sums up all ArDrive Community Tips/Fees
export const getTotalArDriveCommunityFees = async (start: Date, end: Date) => {
  let totalFees = 0;
  let desktopFees = 0;
  let webAppFees = 0;
  let firstPage : number = 100; // Max size of query for GQL
  let cursor : string = "";
  let hasNextPage = false;
  let timeStamp = new Date(end);
  try {
      while (hasNextPage) {
        const transactions = await queryForArDriveCommunityFees(firstPage, cursor, primaryGraphQLUrl);
        const { edges } = transactions;
        hasNextPage = transactions.pageInfo.hasNextPage
        // Create the query to search for all ardrive transactions.
        edges.forEach((edge: any) => {
            cursor = edge.cursor;
            const { node } = edge;
            const { quantity } = node;
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
                  totalFees += +quantity.ar;
                  if (appName === 'ArDrive-Web') {
                    webAppFees += +quantity.ar;
                  } else if (appName === 'ArDrive-Desktop') {
                    desktopFees += +quantity.ar;
                  }
                } else if (timeStamp.getTime() > end.getTime()) {
                  // console.log ("Result too old")
                  hasNextPage = false;
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
  let timeStamp = new Date(end);
  let hasNextPage = true;
  try {
    while (hasNextPage) {
      const transactions = await queryForOwnerSize(owner, firstPage, cursor, primaryGraphQLUrl);
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
const queryForAllDrives = async (firstPage: number, cursor: string, gqlUrl: string): Promise<any> => {
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
      .post(gqlUrl, query);
      const { data } = response.data;
      const { transactions } = data;
      return transactions;
  } catch (err) {
    console.log (err)
    console.log ("Cannot query for all drives.  Gateway error %s", gqlUrl)
    if (gqlUrl = primaryGraphQLUrl) {
      // Run backup graphql query
      return await queryForAllDrives(firstPage, cursor, backupGraphQLUrl) ;
    } else {
      return false;
    }
  }
}

// Creates a GraphQL Query to return all transactions for an owner
async function queryForOwnerSize(owner: string, firstPage: number, cursor: string, gqlUrl: string): Promise<any> {
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
      .post(gqlUrl, query);
    const { data } = response.data;
    const { transactions } = data;
    return transactions;
  } catch (err) {
    console.log (err)
    console.log ("Cannot query for owner size.  Gateway error %s", gqlUrl)
    if (gqlUrl = primaryGraphQLUrl) {
      // Run backup graphql query
      return await  queryForOwnerSize(owner, firstPage, cursor, backupGraphQLUrl) ;
    } else {
      return false;
    }
  }
}

// Creates a GraphQL Query to search for all ArDrive Data transactions and requests it from the primary Arweave gateway
async function queryForDataUploads(minBlock: number, firstPage: number, cursor: string, gqlUrl: string): Promise<any> {
    try {
    const query = {
      query: `query {
      transactions(
        tags: { name: "App-Name", values: ["ArDrive-Desktop", "ArDrive-Web"] }
        sort: HEIGHT_DESC
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

    // Call the Arweave Graphql Endpoint
    const response = await arweave.api
      .request()
      .post(gqlUrl, query);
    const { data } = response.data;
    const { transactions } = data;
    return transactions;
  } catch (err) {
    console.log (err)
    console.log ("Cannot query for data transactions.  Gateway error %s", gqlUrl)
    if (gqlUrl = primaryGraphQLUrl) {
      // Run backup graphql query
      return await queryForDataUploads(minBlock, firstPage, cursor, backupGraphQLUrl) ;
    } else {
      return false;
    }
  }
}

// Creates a GraphQL Query to search for all ArDrive Data transactions and requests it from the primary Arweave gateway
async function queryForBundledDataUploads(firstPage: number, cursor: string, gqlUrl: string): Promise<any> {
    try {
    const query = {
      query: `query {
      transactions(
        tags: [
            { name: "App-Name", values: ["ArDrive-Desktop", "ArDrive-Web"] }
            { name: "Bundle-Format", values: "json"}
        ]
        sort: HEIGHT_DESC
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
      .post(gqlUrl, query);
    const { data } = response.data;
    const { transactions } = data;
    return transactions;
  } catch (err) {
    console.log (err)
    console.log ("Cannot query for data bundles.  Gateway error %s", gqlUrl)
    if (gqlUrl = primaryGraphQLUrl) {
      // Run backup graphql query
      return await queryForBundledDataUploads(firstPage, cursor, backupGraphQLUrl) ;
    } else {
      return false;
    }
  }
}

// Creates a GraphQL Query to search for all ArDrive Community Fees
async function queryForArDriveCommunityFees(firstPage: number, cursor: string, gqlUrl: string): Promise<any> {
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
              quantity {
                winston
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
        .post(gqlUrl, query);
      const { data } = response.data;
      const { transactions } = data;
      return transactions;
    } catch (err) {
      console.log (err)
      console.log ("Cannot query for ArDrive Community Fees. Gateway error %s", gqlUrl)
      if (gqlUrl = primaryGraphQLUrl) {
        // Run backup graphql query
        return await queryForArDriveCommunityFees(firstPage, cursor, backupGraphQLUrl) ;
      } else {
        return false;
      }
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
      total += 1;
      balances[addr];
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
    let trimmedWeightedList : AstatineItem[] = [];
    let firstPage : number = 100; // Max size of query for GQL
    let cursor : string = "";
    let timeStamp = new Date();
    let yesterday = new Date(timeStamp);
    yesterday.setDate(yesterday.getDate() - 1);

    while (!completed) {
      // Create the query to search for all ardrive transactions.
      let transactions = await queryForDataUploads(0, firstPage, cursor, primaryGraphQLUrl);
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

    // Trim the list of any users who have not uploaded the minimum
    let minUploadAmount = 1048576 * 50 // 50 MB
    weightedList.forEach((item: AstatineItem) => {
      if (item.weight >= minUploadAmount) {
        trimmedWeightedList.push(item);
      }
    })
    
    return trimmedWeightedList;
}
