
import Arweave from 'arweave';
import { dataCompare } from './common';
import { BlockInfo, AstatineItem, BlockDate } from './types';

const primaryGraphQLUrl = 'https://arweave.net/graphql';
const backupGraphQLUrl = 'https://arweave.net/graphql';

const fetch = require('node-fetch')
export const arweave = Arweave.init({
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

// Basic function to get the date for a block height
// Not used anywhere
export const getBlockDate = async (height: number): Promise<BlockDate> => {
  const response = await fetch(`https://arweave.net/block/height/${height}`);
  const blockInfo = await response.json()
  const blockTimeStampDate = new Date(+blockInfo['timestamp'] * 1000);
  const friendlyDate = blockTimeStampDate.toLocaleString();
  const blockDate: BlockDate = {
    blockHeight: height,
    blockTimeStamp: blockInfo['timestamp'],
    blockHash: blockInfo['hash'],
    friendlyDate,
  };
  return blockDate;
}

// Basic function to get the dates of every block starting from 0
// Not used anywhere
export async function getAllBlockDates() : Promise<BlockDate[]> {
  let blockDates: BlockDate[] = [];
  let currentHeight = await getCurrentBlockHeight();
  let i = 0;
  while (i <= currentHeight) {
    let blockDate = await getBlockDate(i);
    console.log ("Block Date: ", blockDate);
    blockDates.push(blockDate);
    i += 1;
  }
  return blockDates;
}

// Get the balance of an Arweave wallet
export async function getWalletBalance(walletPublicKey: string): Promise<number> {
	try {
		let balance = await arweave.wallets.getBalance(walletPublicKey);
		balance = arweave.ar.winstonToAr(balance);
		return +balance;
	} catch (err) {
		console.log(err);
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

// This is used specifically for testing Astatine, and is not invoked with the Analytics script
// Creates a GraphQL Query to search for all ArDrive Data transactions and requests it from the primary Arweave gateway
async function queryForDataUploads(minBlock: number, firstPage: number, cursor: string, gqlUrl: string): Promise<any> {
  try {
  const query = {
    query: `query {
    transactions(
      tags: { name: "App-Name", values: ["ArDrive-Desktop", "ArDrive-Mobile", "ArDrive-Web"] }
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