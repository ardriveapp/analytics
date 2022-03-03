
import Arweave from 'arweave';
import { asyncForEach, statsFetch } from './common';
import { BlockInfo, BlockDate } from './types';

const fetch = require('node-fetch')
export const arweave = Arweave.init({
    host: 'arweave.net', // Arweave Gateway
    port: 443,
    protocol: 'https',
    timeout: 600000,
    logging: false
  });

// Gets the latest price of Arweave in USD
export async function getArUSDPrice() : Promise<number> {
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
export async function getDataPrice(bytes: number) {
    // change to axios w/ retry
    const response = await statsFetch(`https://arweave.net/price/${bytes}`);
    const winstonAmount = await response.data;
    const arweaveAmount = +winstonAmount * 0.000000000001;
    return arweaveAmount;
};

// Gets the latest block height
export async function getCurrentBlockHeight() {
  let height = 0;
  try {
    const response = await statsFetch(`https://arweave.net/height/`);
    height = await response.data
    return height
  } catch (err) {
    console.log (err)
  }
  return height
};

// Gets the latest block height
export async function getMempoolSize() {
  let pendingTxs: any;
  try {
    const response = await statsFetch(`https://arweave.net/tx/pending`);
    pendingTxs = await response.data
    return pendingTxs
  } catch (err) {
    console.log (err)
  }
  return pendingTxs
};

// Gets all transactions from the latest block
export async function getLatestBlockTransactions() {
  const lastBlockHeight = await getCurrentBlockHeight();
  const response = await statsFetch(`https://arweave.net/block/height/${lastBlockHeight}`);
  const block = await response.data;
  return block;
}
// Takes all transactions in the mempool and gets the average fee per byte in winston
// WIP
export async function getAvgPerByteFee (memPool: string[]) {
  let avgRewardPerByte = 0;
  
  await asyncForEach (memPool, async (tx: string) => {
    const response = await statsFetch(`https://arweave.net/tx/${tx}`);
    const txDetails = await response.data;
    const txReward = +txDetails.reward;
    const dataSize = +txDetails.data_size;
    const rewardPerByte = dataSize / txReward;
    console.log ("Reward per byte for %s is %s", tx, rewardPerByte)
    console.log ("   Data Size %s", dataSize)
    console.log ("   Reward is %s", txReward)
  });
  console.log (avgRewardPerByte)
};

// Gets the total weave size from the latest block
export async function getLatestBlockInfo (height: number) {
    let latestBlock : BlockInfo = {
        weaveSize: 0,
        difficulty: 0,
        blockSize: 0,
    }
    try {
      const response = await statsFetch(`https://arweave.net/block/height/${height}`);
      const blockInfo = await response.data;
      latestBlock.weaveSize = blockInfo['weave_size']
      latestBlock.difficulty = blockInfo['diff']
      latestBlock.blockSize = blockInfo['block_size']
      return latestBlock;
    } catch (err) {
      console.log ("Error getting latest block info");
      console.log (err)
      return latestBlock;
    }

};

// Basic function to get the date for a block height
// Not used anywhere
export async function getBlockDate (height: number): Promise<BlockDate> {
  const response = await statsFetch(`https://arweave.net/block/height/${height}`);
  const blockInfo = await response.data;
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
// Get the latest status of a transaction
export async function getTransactionStatus(txid: string): Promise<number> {
	try {
		const response = await arweave.transactions.getStatus(txid);
		return response.status;
	} catch (err) {
		// console.log(err);
		return 0;
	}
}