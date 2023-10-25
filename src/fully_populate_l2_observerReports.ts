import {
  addHoursToDate,
  getMinBlock,
} from "./common";
import { getAllObservationReports } from "./gql_L2";
import { sendMessageToGraphite } from "./graphite";

const message = "observer.l2."; // this is where all of the logs will be stored

async function main() {
  const appName = 'AR-IO Observer'
  // The date to start looking for data
  let start = new Date(2023, 9, 17);
  // let start = new Date(2023, 1, 20);

  // The date to finish looking for data
  let end = new Date();
  end.setHours(0, 0, 0, 0);

  // The amount of hours to search for in the period i.e. 12, 24 or other range
  let hoursToQuery: number = 1;

  console.log(
    "Collecting all stats in %s hour increments from %s to %s",
    hoursToQuery,
    start.toLocaleString(),
    end.toLocaleString()
  );
  console.log(
    "--------------------------------------------------------------------------------"
  );

  let minBlock = await getMinBlock(start);
  while (start < end) {
    const totalAddresses: string[] = [];
    const end = new Date(addHoursToDate(start, hoursToQuery));
    console.log(
      "Collecting observer reports analytics from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );

    const l2Results = await getAllObservationReports(
      start,
      end,
      appName,
      minBlock
    );

    await sendMessageToGraphite(
      `observer.l2.reports`,
      l2Results.fileDataTxs.length,
      end
    );
    console.log(
      "Completed observer reports analytics from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );

    l2Results.fileDataTxs.forEach((tx) => {
      totalAddresses.push(tx.owner);
    });
  
    const uniqueAppUsers = new Set(totalAddresses);
  
    await sendMessageToGraphite(
      `observer.l2.uniqueUsers`,
      uniqueAppUsers.size,
      end
    );

    start = addHoursToDate(start, hoursToQuery);
    minBlock = await getMinBlock(start);
  }
}

main();
