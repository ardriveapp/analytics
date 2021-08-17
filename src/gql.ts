import { arweave, getArUSDPrice, getCurrentBlockHeight } from './arweave';
import { asyncForEach, formatBytes, sleep } from './common';
import { ArDriveCommunityFee, ArDriveStat, ContentType } from './types';
import limestone from 'limestone-api';

const desktopAppName = "ArDrive-Desktop";
const webAppName = "ArDrive-Web";
const mobileAppName = "ArDrive-Mobile";
const coreAppName = "ArDrive-Core";
const cliAppName = "ArDrive-CLI";

export const gateways = [
	"https://arweave.net"
];

// Index of the currently used gateway into gateways.
let currentGateway: number = 0;

// Switches to the next gateway in the gateways array
function switchGateway() {
	currentGateway = (currentGateway + 1) % gateways.length;
	console.log("Switched gateway to " + gateways[currentGateway]);
}

// Chooses the current gateway and runs a callback with it.
// If an error occurs, the call is retried and the gateway is switched automatically.
export async function queryGateway(query: (url: string) => Promise<any>): Promise<any> {
	const initialGatewayIndex = currentGateway;
	let tries: number = 0;
	while (true) {
		try {
			return await query(gateways[currentGateway]);
		} catch (err) {
			//console.log(err);
			console.log("Gateway error with " + gateways[currentGateway] + ", retrying...");
			tries += 1;
            await sleep(300000);
			if (tries >= 5) {
			    tries = 0;
			    switchGateway ();
			    if (currentGateway === initialGatewayIndex) {
				    // We've tried all gateways, nothing left to do.
				    return Promise.reject(err);
			    }
			}
		}
	}
};

// Sums up all transactions for a drive
export const getUserSize = async (owner: string, start: Date, end: Date) => {
    let totalDriveSize = 0;
    let totalDriveTransactions = 0
    let firstPage : number = 100; // Max size of query for GQL
    let cursor : string = "";
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
                const response = await arweave.api.request().post(url + "/graphql", query)
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
                if ((start.getTime() <= timeStamp.getTime()) && (end.getTime() >= timeStamp.getTime())) {
                    if (data !== null) {
                    totalDriveSize += +data.size;
                    totalDriveTransactions += 1;
                    }
                }
                }
            })
        }
        const formattedSize = formatBytes(totalDriveSize);
        return {owner, totalDriveSize, formattedSize, totalDriveTransactions};
    } catch (err) {
        console.log (err);
        console.log ("Error getting all sizes of an owners drives");
        return {owner, totalDriveSize, totalDriveTransactions};
    }
};

// Gets ArDrive information from a start and and date
export const getAllDrives = async (start: Date, end: Date) => {
    let firstPage : number = 100; // Max size of query for GQL
    let cursor : string = "";
    let arDriveStats : ArDriveStat[] = [];
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
            const response = await arweave.api.request().post(url + "/graphql", query)
            const { data } = response.data;
            const { transactions } = data;
            return transactions;
        });
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
export const getANS102Transactions = async (start: Date, end: Date) => {
    let bundledDataSize = 0;
    let webAppDataSize = 0;
    let desktopDataSize = 0;
    let firstPage : number = 100; // Max size of query for GQL
    let cursor : string = "";
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
                const response = await arweave.api.request().post(url + "/graphql", query)
                const { data } = response.data;
                const { transactions } = data;
                return transactions;
            });
            const { edges } = transactions;
            hasNextPage = transactions.pageInfo.hasNextPage
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

};

// Sums up all ArDrive Community Tips/Fees
export const getAllCommunityFees = async (start: Date, end: Date) => {
    let totalFees = 0;
    let desktopAppFees = 0;
    let webAppFees = 0;
    let coreAppFees = 0;
    let cliAppFees = 0;
    let mobileAppFees = 0;
    let firstPage : number = 100; // Max size of query for GQL
    let cursor : string = "";
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
            }
            const transactions = await queryGateway(async (url: string) => {
                const response = await arweave.api.request().post(url + "/graphql", query)
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
                        switch (appName) {
                            case webAppName:
                                webAppFees += +quantity.ar;
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
            })
        }
        return {totalFees, webAppFees, desktopAppFees, mobileAppFees, coreAppFees, cliAppFees};
    } catch (err) {
        console.log (err)
        console.log ("Error collecting total amount of fees")
        return {totalFees, webAppFees, desktopAppFees, mobileAppFees, coreAppFees, cliAppFees};
    }
};

// Sums up all ArDrive Community Tips/Fees for a particular public address.  Uses a friendly name to label the wallet
export const getMyCommunityFees = async (friendlyName: string, owner: string, start: Date, end: Date): Promise<ArDriveCommunityFee[]> => {
    let firstPage : number = 100; // Max size of query for GQL
    let cursor : string = "";
    let hasNextPage = true;
    let timeStamp = new Date(end);
    let limestoneDay: number;
    let myFees: ArDriveCommunityFee[] = [];
    let checkHistoricalPrice = true;
    console.log ("Getting all fees for %s: %s", friendlyName, owner)
  
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
                const response = await arweave.api.request().post(url + "/graphql", query)
                const { data } = response.data;
                const { transactions } = data;
                return transactions;
            });
            const { edges } = transactions;
            hasNextPage = transactions.pageInfo.hasNextPage
            await asyncForEach (edges, async (edge: any) => {
                let myFee: ArDriveCommunityFee = {
                    owner,
                    friendlyName,
                    appName: '',
                    appVersion: '',
                    tip: '',
                    type: '',
                    amountAR: 0,
                    exchangeRate: 0, // The AR/USD exchange rate
                    amountUSD: 0,
                    currentPrice,
                    costBasis: 0,
                    blockHeight: 0,
                    blockTime: 0,
                    friendlyDate: ''
                }
                cursor = edge.cursor;
                const { node } = edge;
                const { quantity } = node;
                const { block } = node;
                const { tags } = node;
                if (block !== null) {
                    timeStamp = new Date(block.timestamp * 1000);
                    if ((start.getTime() <= timeStamp.getTime()) && (end.getTime() >= timeStamp.getTime())) {
                        // console.log ("Matching community fee transaction: ", timeStamp)
                        myFee.amountAR = quantity.ar;
                        try {
                        // Will try to get the price of AR for the day of this transaction. 
                        // This will skip if it already got the price of AR for that day
                        // This will skip completely if limestone is down
                        if (checkHistoricalPrice && (limestoneDay !== timeStamp.getDay())) {
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
                        console.log ("Cannot get AR price on ", timeStamp);
                        }
                        myFee.blockTime = block.timestamp;
                        myFee.blockHeight = block.height;
                        myFee.friendlyDate = timeStamp.toLocaleString();
                        tags.forEach((tag: any) => {
                            const key = tag.name;
                            const { value } = tag;
                            switch (key) {
                            case 'App-Name':
                                myFee.appName = value;
                                break;
                            case 'App-Version':
                                myFee.appVersion = value;
                                break;
                            case 'Type':
                                myFee.type = value;
                                break;
                            case 'Tip-Type':
                                myFee.tip = value;
                                break;
                            default:
                                break;
                            };
                        })
                        myFees.push(myFee);
                    } else if (timeStamp.getTime() > end.getTime()) {
                        // console.log ("Result too early")
                    } else {
                        // console.log ("Result too old")
                        hasNextPage = false;
                        // result too old
                    }
                }
            })
        }
        return myFees;
    } catch (err) {
        console.log (err)
        console.log ("Error collecting total amount of fees")
        return myFees;
    }
};

// Sums up every data transaction for a start and end period.
// Uses an estimate of block time to try to reduce query size
export const getAllTransactions_WithBlocks = async (start: Date, end: Date) => {
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
    const blocksPerDay = 800;
    let height = await getCurrentBlockHeight();
    let minBlock = height - blocksPerDay // Search the last min block time by default
    const startDays = today.getTime() - start.getTime()
    const startDaysDiff = Math.floor(startDays / (1000 * 3600 * 24));
    if (startDaysDiff !== 0) {
      minBlock = height - (blocksPerDay * startDaysDiff)
    } 

    console.log (minBlock)
    while (hasNextPage) {
        const query = {
          query: `query {
          transactions(
            tags: [
                { name: "App-Name", values: ["${desktopAppName}", "${webAppName}", "${mobileAppName}", "${coreAppName}", "${cliAppName}"]}
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
                const response = await arweave.api.request().post(url + "/graphql", query)
                const { data } = response.data;
                const { transactions } = data;
                return transactions;
            });
            hasNextPage = transactions.pageInfo.hasNextPage
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

                            switch (appName) {
                                case webAppName:
                                    webAppFiles += 1;
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
            })
        } 
        catch (err) {
            console.log(err);
            console.log(
              'Error getting total data transaction size at %s with %s.  Stopping', lastBlock);
            hasNextPage = false;
        }
    }
    return {publicDataSize, privateDataSize, publicFiles, privateFiles, publicArFee, privateArFee, webAppFiles, desktopAppFiles, mobileAppFiles, coreAppFiles, cliAppFiles, contentTypes, lastBlock}
}

// Sums up every data transaction for a start and end period.
// Uses an estimate of block time to try to reduce query size
export const getAllTransactions = async (start: Date, end: Date) => {
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
    let publicArFee = 0;
    let privateArFee = 0;
    let contentType : string = '';
    let contentTypes : ContentType[] = [];
    let firstPage : number = 100; // Max size of query for GQL
    let cursor : string = "";
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
                const response = await arweave.api.request().post(url + "/graphql", query)
                const { data } = response.data;
                const { transactions } = data;
                return transactions;
            });
            hasNextPage = transactions.pageInfo.hasNextPage
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
                            switch (appName) {
                                case webAppName:
                                    webAppFiles += 1;
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
            })
        } 
        catch (err) {
            console.log(err);
            console.log(
              'Error getting total data transaction size at %s with %s.  Stopping', lastBlock);
            hasNextPage = false;
        }
    }
    return {publicDataSize, privateDataSize, publicFiles, privateFiles, publicArFee, privateArFee, webAppFiles, desktopAppFiles, mobileAppFiles, coreAppFiles, cliAppFiles, contentTypes, lastBlock}

}