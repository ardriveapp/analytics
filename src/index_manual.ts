
// import { get_24_hour_ardrive_transactions } from './arweave';
import { getMetrics } from './common';
import { Results } from './types';
// import { AstatineItem } from './types';

async function main () {
    const days = 1 

    let today = new Date();
    let start = new Date();

    // Take off one day
    start.setDate(start.getDate() - days);

    const dailyResults : Results = await getMetrics(start, today, 1);
    console.log (dailyResults)
    // Used to test Astatine
    // const usersToReward : AstatineItem[] = await get_24_hour_ardrive_transactions();
    // console.log (usersToReward)
}

main();
