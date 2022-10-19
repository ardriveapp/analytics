import { addHoursToDate, appNames, asyncForEach } from "./common";
import { getAllAppL1Transactions } from "./gql";
import { sendMessageToGraphite } from "./graphite";

const message = "ardrive.users.l1."; // this is where all of the logs will be stored

async function main() {
  // The date to start looking for data
  let start = new Date(2020, 8, 26); // the beginning history of ardrive
  // let start = new Date(2021, 7, 16);

  // The date to finish looking for data
  let end = new Date();
  end.setHours(0, 0, 0, 0);

  let hoursToQuery: number = 24; // 30 days worth of hours.  The amount of hours to search for in the period i.e. 12, 24 or other range.
  let hoursToAdd: number = 24; // The amount of hours that will be added iteratively
  let daysToQuery = hoursToQuery / 24; // users to name this graphite message

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
      "Collecting unique users from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );

    let allWallets: string[] = [];
    await asyncForEach(appNames, async (appName: string) => {
      const l1Results = await getAllAppL1Transactions(start, end, appName);

      allWallets.push(...l1Results.foundUsers);
      const appUniqueUsers = new Set(l1Results.foundUsers).size;
      console.log(`${appUniqueUsers} users found for ${appName}`);
      let graphiteMessage = message + appName + "." + daysToQuery;
      await sendMessageToGraphite(graphiteMessage, appUniqueUsers, end);
    });

    const uniqueUserCount = new Set(allWallets).size;
    let graphiteMessage = message + daysToQuery;
    await sendMessageToGraphite(graphiteMessage, uniqueUserCount, end);
    console.log(`Unique ArDrive Users Found: ${uniqueUserCount}`);

    console.log(
      "Completed analytics from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );
    start = addHoursToDate(start, hoursToAdd);
  }
}

main();
