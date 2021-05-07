import { getAllMetrics, sendResultsToGraphite } from "./common";

async function main () {
    // let today = new Date();
    const today = new Date(2021, 4, 6)
    // const start = new Date(2020, 8, 26) // the beginning history of ardrive
    const start = new Date(2021, 4, 5)
    // const start = new Date(today)
    console.log ("Today ", today)
    console.log ("Start ", start)
    while (start < today) {
        const end = new Date(start)
        end.setDate(start.getDate() + 1); // How far back we should query for data
        let newResult = await getAllMetrics(start, end, 1)
        // console.log (newResult)
        await sendResultsToGraphite(newResult);
        start.setDate(start.getDate() + 1); // move on to the next day
    }
}

main();
