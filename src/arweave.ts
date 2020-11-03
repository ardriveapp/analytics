import Arweave from 'arweave';

const fetch = require('node-fetch')
const arweave = Arweave.init({
    host: 'arweave.net', // Arweave Gateway
    port: 443,
    protocol: 'https',
    timeout: 600000,
  });

// ArDrive Profit Sharing Community Smart Contract
// import Community from 'community-js';
// const communityTxId = '-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ';

/*
•	Unique Wallets that have created ArDrives
•	Top wallet addresses that have uploaded data for that day
•	Total amount of ArDrives created
	Amount of private drives
	Amount of public drives
•	Amount of data uploaded
	Total amount of data uploaded
	Total number of files uploaded
•	Tips sent
	Total size of tips
	Total number of tips distributed
*/

interface ArDriveStat {
    address: string,
    privacy: string,
    appName: string,
    driveId: string,
    tx: string,
    data: number,
    blockTimeStamp: Date
}

// Sends a message to the ardrive graphite server
export const sendMessageToGraphite = async (path: string, value: number, timeStamp: Date) => {
    const message = path + " " + value.toString() + " " + (Math.floor(timeStamp.getTime()/1000)) + '\n';
    let net = require('net');
    let client = new net.Socket();
    client.connect(2003, 'stats.ardrive.io', function() {
        client.write(message)
        client.end('completed!')
    });
}


// Format byte size to something nicer.  This is minified...
export const formatBytes = (bytes: number) => {
    const marker = 1024; // Change to 1000 if required
    const decimal = 3; // Change as required
    const kiloBytes = marker; // One Kilobyte is 1024 bytes
    const megaBytes = marker * marker; // One MB is 1024 KB
    const gigaBytes = marker * marker * marker; // One GB is 1024 MB
    // const teraBytes = marker * marker * marker * marker; // One TB is 1024 GB
  
    // return bytes if less than a KB
    if (bytes < kiloBytes) return `${bytes} Bytes`;
    // return KB if less than a MB
    if (bytes < megaBytes) return `${(bytes / kiloBytes).toFixed(decimal)} KB`;
    // return MB if less than a GB
    if (bytes < gigaBytes) return `${(bytes / megaBytes).toFixed(decimal)} MB`;
    // return GB if less than a TB
    return `${(bytes / gigaBytes).toFixed(decimal)} GB`;
  };

// Gets the price of AR based on amount of data
export const getDataPrice = async (bytes: number) => {
    const response = await fetch(`https://arweave.net/price/${bytes}`);
    const winstonAmount = await response.json();
    const arweaveAmount = +winstonAmount * 0.000000000001;
    return arweaveAmount;
};

// Gets ArDrive information from a start and and date
export const getAllArDrives = async (start: Date, end: Date) => {
    let firstPage : number = 2147483647; // Max size of query for GQL
    let cursor : string = "";
    let arDriveStats : ArDriveStat[] = [];
    try {
        let transactions = await queryForAllArDrives(firstPage, cursor);
        const { edges } = transactions;
        edges.forEach((edge: any) => {
            cursor = edge.cursor;
            const { node } = edge;
            const { owner } = node;
            const { block } = node;
            let timeStamp = new Date(block.timestamp * 1000);
            // We only want results between our start and end dates, defined by milliseconds since epoch
            if ((start.getTime() <= timeStamp.getTime()) && (end.getTime() >= timeStamp.getTime())) {
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
            }
        })
        return arDriveStats;
    } catch (err) {
        console.log (err)
        console.log ("Error collecting total number of ArDrives")
        return arDriveStats;
    }
};

// Creates a GraphQL Query to search for all ArDrive entities and requests it from the primary Arweave gateway
const queryForAllArDrives = async (firstPage: number, cursor: string) => {
    try {
        const query = {
        query: `query {
            transactions(
                sort: HEIGHT_DESC
                tags: [
                    { name: "App-Name", values: ["ArDrive-Desktop", "ArDrive-Web"] }
                    { name: "Entity-Type", values: "drive" }
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

// Sums up every data transaction for a start and end period.
export const getTotalDataTransactionsSize = async (start: Date, end: Date) => {
    let publicDataSize = 0;
    let privateDataSize = 0;
    let publicFiles = 0;
    let privateFiles = 0;
    let publicArFee = 0;
    let privateArFee = 0;
    let firstPage : number = 2147483647; // Max size of query for GQL
    let cursor : string = "";
    try {
        // Create the query to search for all ardrive transactions.
        let transactions = await queryForDataUploads(firstPage, cursor);
        const { edges } = transactions;
        edges.forEach((edge: any) => {
            cursor = edge.cursor;
            const { node } = edge;
            const { data } = node;
            const { fee } = node;
            const { block } = node;
            const { tags } = node;
            if (block !== null) {
                let timeStamp = new Date(block.timestamp * 1000);
                // We only want results from last 24 hours, defined by milliseconds since epoch
                if ((start.getTime() <= timeStamp.getTime()) && (end.getTime() >= timeStamp.getTime())) {
                    // We only want data transactions
                    if (data.size > 0) {
                        let cipherIV = "public";
                        tags.forEach((tag: any) => {
                            const key = tag.name;
                            const { value } = tag;
                            switch (key) {
                            case 'Cipher-IV':
                                cipherIV = value;
                                break;
                            default:
                                break;
                            };
                        })
                        if (cipherIV === 'public') {
                            publicDataSize += data.size;
                            publicArFee += +fee.ar;
                            publicFiles += 1;
                        }
                        else {
                            privateDataSize += data.size;
                            privateArFee += +fee.ar;
                            privateFiles += 1;
                        }

                    }
                }
            }
        })
    return {publicDataSize, privateDataSize, publicFiles, privateFiles, publicArFee, privateArFee}
    } catch (err) {
        console.log (err)
        console.log ("Error collecting total amount of uploaded data")
        return {publicDataSize, privateDataSize, publicFiles, privateFiles, publicArFee, privateArFee}
    }

}

// Creates a GraphQL Query to search for all ArDrive Data transactions and requests it from the primary Arweave gateway
async function queryForDataUploads(firstPage: number, cursor: string) {
    try {
    const query = {
      query: `query {
      transactions(
        sort: HEIGHT_DESC
        tags: { name: "App-Name", values: ["ArDrive-Desktop", "ArDrive-Web"] }
        first: ${firstPage}
        after: "${cursor}"
      ) {
        pageInfo {
          hasNextPage
        }
        edges {
          cursor
          node {
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