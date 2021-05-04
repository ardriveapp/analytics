
// import { get_24_hour_ardrive_transactions } from './arweave';
import { getMetrics, sendResultsToGraphite } from './common';
import { Results } from './types';
// import { AstatineItem } from './types';

async function main () {
    let today = new Date();
    let start = new Date();
    let hours = 12;
    // Take off one day
    start.setHours(start.getHours() - hours);

    const dailyResults : Results = await getMetrics(start, today, 0, hours);
    await sendResultsToGraphite(dailyResults);
    // Used to test Astatine
    // const usersToReward : AstatineItem[] = await get_24_hour_ardrive_transactions();
    // console.log (usersToReward)
}

main();