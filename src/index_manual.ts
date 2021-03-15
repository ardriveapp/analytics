
import { get_24_hour_ardrive_transactions } from './arweave';
import { getMetrics } from './common';
import { AstatineItem } from './types';

async function main () {
    const days = 1 // Number of days to query for data
    const end = new Date(); // The end range for the query eg. const start = new Date(2021, 0, 28);
    const start = new Date()
    start.setDate(start.getDate() - days); // When should the query start
    await getMetrics(start, end, days)

    // Used to test Astatine
    const usersToReward : AstatineItem[] = await get_24_hour_ardrive_transactions();
    console.log (usersToReward)
}

main();
