import { getMetrics, sendResultsToGraphite } from "./common";

async function main () {
    let today = new Date();
    const start = new Date(2021, 2, 2)
    console.log ("Today ", today)
    console.log ("Start ", start)
    while (start <= today) {
        const end = new Date(start)
        end.setDate(start.getDate() + 1); // How far back we should query for data
        let newResult = await getMetrics(start, end, 1)
        console.log (newResult)
        await sendResultsToGraphite(newResult);
        start.setDate(start.getDate() + 1); // move on to the next day
    }
}

main();
