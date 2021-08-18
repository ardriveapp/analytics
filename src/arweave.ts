
import Arweave from 'arweave';
import { BlockInfo, BlockDate } from './types';

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
  let height = 0;
  try {
    const response = await fetch(`https://arweave.net/height/`);
    height = await response.json()
    return height
  } catch (err) {
    console.log (err)
  }
  // Try a backup just in case
  try {
    const response = await fetch(`http://node.ardrive.io:1984/height/`);
    height = await response.json()
  } catch (err) {
    console.log (err)
  }
  return height
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
