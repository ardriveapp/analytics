
import { get_24_hour_ardrive_transactions } from './arweave';
import { getMetrics } from './common';
import { AstatineItem } from './types';

async function main () {
    const days = 3 // Number of days to query for data
    //const end = new Date(); // The end range for the query eg. const start = new Date(2021, 0, 28);
    //const start = new Date()
    //start.setDate(start.getDate() - days); // When should the query start
    const start = new Date(2020, 10, 1)
    const end = new Date(start)
    end.setDate(start.getDate() + 3); // How far back we should query for data
    await getMetrics(start, end, days)

    // Used to test Astatine
    const usersToReward : AstatineItem[] = await get_24_hour_ardrive_transactions();
    console.log (usersToReward)
}

main();
