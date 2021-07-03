import { readContract } from 'smartweave';
import { arweave } from './arweave';

// ArDrive Profit Sharing Community Smart Contract
const communityTxId = '-8A6RexFkpfWwuyVO98wzSFZh0d6VJuI-buTJvlwOJQ';

// Gets a random ArDrive token holder based off their weight (amount of tokens they hold)
export async function selectTokenHolder() {
	// Read the ArDrive Smart Contract to get the latest state
	const state = await readContract(arweave, communityTxId);
	const balances = state.balances;
	const vault = state.vault;

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

// Gets a random ArDrive token holder based off their weight (amount of tokens they hold)
export async function getArDriveCommunityState(): Promise<any> {
	// Read the ArDrive Smart Contract to get the latest state
    console.log ("Getting ArDrive Community State")
	const state = await readContract(arweave, communityTxId);
    return state;
};

// Gets a random ArDrive token holder based off their weight (amount of tokens they hold)
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
	};

    console.log ("Total ArDrive Tokens: ", total)
    return total;
}

export async function getWalletArDriveLockedBalance(state: any, wallet: string): Promise<number> {
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
    };

    console.log ("Total Locked ArDrive Tokens for %s: %s", wallet, total)
    return total;
}

export async function getWalletArDriveUnlockedBalance(state: any, wallet: string): Promise<number> {
	// Read the ArDrive Smart Contract to get the latest state
	const balances = state.balances;

	// Get the total number of tokens by checking each user's unlocked balance
	let total = 0;
    if (!isNaN(balances[wallet])) {
        total += balances[wallet];
    }

    console.log ("Total Unlocked ArDrive Tokens for %s: %s", wallet, total)
    return total;
}