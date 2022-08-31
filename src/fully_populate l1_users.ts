import { addHoursToDate } from "./common";
import { getAllAppL1Transactions } from "./gql";
import { sendUsersToGraphite } from "./graphite";

const message = "ardrive.users.l1."; // this is where all of the logs will be stored

async function main() {
  // The date to start looking for data
  // let start = new Date(2020, 8, 26); // the beginning history of ardrive
  let start = new Date(2022, 7, 16);

  // The dat ato finish looking for data
  let end = new Date();

  // The amount of hours to search for in the period i.e. 12, 24 or other range
  let hoursToQuery: number = 24;

  console.log(
    "Collecting all User stats in %s hour increments from %s to %s",
    hoursToQuery,
    start.toLocaleString(),
    end.toLocaleString()
  );
  console.log(
    "--------------------------------------------------------------------------------"
  );

  while (start < end) {
    const end = new Date(addHoursToDate(start, hoursToQuery));
    console.log(
      "Collecting stats from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );

    const l1Results = await getAllAppL1Transactions(start, end);
    await sendUsersToGraphite(message, l1Results, end);
    console.log(
      "Completed analytics from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );
    start = addHoursToDate(start, hoursToQuery);
  }
}

main();
