import { LoggerFactory, WarpNodeFactory } from "warp-contracts";
import Arweave from "arweave";
// import { getWalletBalance } from "./arweave";
import { ArDriveTokenHolder } from "./types";

const smartweaveGatewayHost = "test.arweave.ardrive.io";
const port = 3002;
const protocol = "http";

export const smartweaveGateway = Arweave.init({
  host: smartweaveGatewayHost, // Arweave Gateway
  port,
  protocol,
  timeout: 600000,
  logging: false,
});

// ArDrive Profit Sharing Community Smart Contract
const communityTxId = "-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ";

// ~~ Initialize 'LoggerFactory' ~~
LoggerFactory.INST.logLevel("error");

// Initialize SmartWeave
const smartweave = WarpNodeFactory.memCachedBased(smartweaveGateway)
  .useArweaveGateway()
  .build();

// Gets a random ArDrive token holder based off their weight (amount of tokens they hold)
export async function selectTokenHolder() {
  // Read the ArDrive Smart Contract to get the latest state
  const stateJSON = await getArDriveCommunityState();
  const balances = stateJSON.balances;
  const vault = stateJSON.vault;

  // Get the total number of token holders
  let total = 0;
  for (const addr of Object.keys(balances)) {
    total += balances[addr];
  }

  // Check for how many tokens the user has staked/vaulted
  for (const addr of Object.keys(vault)) {
    if (!vault[addr].length) continue;

    const vaultBalance = vault[addr]
      .map((a: { balance: number; start: number; end: number }) => a.balance)
      .reduce((a: number, b: number) => a + b, 0);

    total += vaultBalance;

    if (addr in balances) {
      balances[addr] += vaultBalance;
    } else {
      balances[addr] = vaultBalance;
    }
  }

  // Create a weighted list of token holders
  const weighted: { [addr: string]: number } = {};
  for (const addr of Object.keys(balances)) {
    weighted[addr] = balances[addr] / total;
  }
}

// Gets the ArDrive Community Smwartweave state
export async function getArDriveCommunityState(): Promise<any> {
  // Read the ArDrive Smart Contract to get the latest state
  console.log(
    `Getting ArDrive Community State using ${
      protocol + "://" + smartweaveGatewayHost + ":" + port
    }`
  );
  // Read the ArDrive Smart Contract to get the latest state
  const pst = smartweave.pst(communityTxId);
  const state = await pst.currentState();
  const stateString = JSON.stringify(state);
  const stateJSON = JSON.parse(stateString);
  return stateJSON;
}

// Gets a count of all ArDrive tokens that have been minted
export async function getTotalTokenCount(state: any): Promise<number> {
  // Read the ArDrive Smart Contract to get the latest state
  const balances = state.balances;
  const vault = state.vault;

  // Get the total number of tokens by checking each user's unlocked balance
  let total = 0;
  for (const addr of Object.keys(balances)) {
    total += balances[addr];
  }

  // Check for how many tokens the each user has staked/vaulted and add to total
  for (const addr of Object.keys(vault)) {
    if (!vault[addr].length) continue;

    const vaultBalance = vault[addr]
      .map((a: { balance: number; start: number; end: number }) => a.balance)
      .reduce((a: number, b: number) => a + b, 0);

    // add to the total token count
    total += vaultBalance;
  }

  console.log("Total ArDrive Tokens: ", total);
  return total;
}

// Gets the count of ArDrive token holders
export async function getTokenHolderCount(): Promise<number> {
  try {
    // Read the ArDrive Smart Contract to get the latest state
    const state = await getArDriveCommunityState();
    const balances = state.balances;

    // Get the total number of token holders with balance > 0
    let total = 0;
    for (const addr of Object.keys(balances)) {
      total += 1;
      balances[addr];
    }
    return total;
  } catch (err) {
    console.log(err);
    console.log("Error getting token holder count");
    return 0;
  }
}

// Gets all ardrive token holders
export async function getAllArDriveTokenHolders(): Promise<
  ArDriveTokenHolder[]
> {
  // Read the ArDrive Smart Contract to get the latest state
  console.log(`Getting unlocked and vaulted balances from ${communityTxId}`);
  const state = await getArDriveCommunityState();
  const balances = state.balances;
  const vault = state.vault;
  let arDriveTokenHolders: ArDriveTokenHolder[] = [];
  for (const addr of Object.keys(balances)) {
    let vaultBalance = 0;
    if (vault[addr] !== undefined) {
      vaultBalance = vault[addr]
        .map((a: { balance: number; start: number; end: number }) => a.balance)
        .reduce((a: number, b: number) => a + b, 0);
    }

    let arDriveTokenHolder: ArDriveTokenHolder = {
      address: addr,
      unlockedArDriveTokens: balances[addr],
      lockedArDriveTokens: vaultBalance,
      totalArDriveTokens: balances[addr] + vaultBalance,
      voteWeight: 0,
      arweaveTokens: 0, // await getWalletBalance(addr),
    };
    //console.log (arDriveTokenHolder);
    arDriveTokenHolders.push(arDriveTokenHolder);
  }
  return arDriveTokenHolders;
}

// Gets all ardrive token holders
export async function getArDriveTokenSnapshot(): Promise<boolean> {
  // Read the ArDrive Smart Contract to get the latest state
  // const state = await getArDriveCommunityState_Redstone(); // Redstone version
  const state = await getArDriveCommunityState(); // Smartweave-js version

  console.log(
    "Getting ArDrive Token Snapshot including unlocked balances and locked balances with lock time"
  );
  const balances = state.balances;
  const vault = state.vault;
  console.log(balances);
  console.log(vault);
  return true;
}

export async function getWalletArDriveLockedBalance(
  state: any,
  wallet: string
): Promise<number> {
  // Read the ArDrive Smart Contract to get the latest state
  const vaults = state.vault;

  // Get the total number of tokens by checking each user's unlocked balance
  let total = 0;

  if (vaults[wallet] !== undefined) {
    const vaultBalance = vaults[wallet]
      .map((a: { balance: number; start: number; end: number }) => a.balance)
      .reduce((a: number, b: number) => a + b, 0);
    if (!isNaN(vaultBalance)) {
      total += vaultBalance;
    }
  }

  console.log("Total Locked ArDrive Tokens for %s: %s", wallet, total);
  return total;
}

export async function getWalletArDriveUnlockedBalance(
  state: any,
  wallet: string
): Promise<number> {
  // Read the ArDrive Smart Contract to get the latest state
  const balances = state.balances;

  // Get the total number of tokens by checking each user's unlocked balance
  let total = 0;
  if (!isNaN(balances[wallet])) {
    total += balances[wallet];
  }

  console.log("Total Unlocked ArDrive Tokens for %s: %s", wallet, total);
  return total;
}
