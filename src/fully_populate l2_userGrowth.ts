import { addHoursToDate } from "./common";
import { getAllDrives } from "./gql";
import { sendMessageToGraphite } from "./graphite";
import { ArDriveStat } from "./types";

const message = "ardrive.users.l2."; // this is where all of the logs will be stored

async function main() {
  // The date to start looking for data
  let start = new Date(2020, 8, 26); // the beginning history of ardrive
  // let start = new Date(2021, 7, 16);

  // The date to finish looking for data
  let end = new Date();
  end.setHours(0, 0, 0, 0);

  let hoursToQuery: number = 24; // 30 days worth of hours.  The amount of hours to search for in the period i.e. 12, 24 or other range.
  let hoursToAdd: number = 24; // The amount of hours that will be added iteratively

  console.log(
    "Collecting all User Growth stats, based on new drives created, in %s hour increments from %s to %s",
    hoursToQuery,
    start.toLocaleString(),
    end.toLocaleString()
  );
  console.log(
    "--------------------------------------------------------------------------------"
  );

  let allWallets: string[] = [];
  let blockHeight = 0;

  while (start < end) {
    const end = new Date(addHoursToDate(start, hoursToQuery));
    console.log(
      "Collecting unique users from %s to %s starting at blockheight %s",
      start.toLocaleString(),
      end.toLocaleString(),
      blockHeight
    );

    let wallets: string[] = [];
    let currentUserAmount = allWallets.length;
    const allDrives: ArDriveStat[] = await getAllDrives(
      start,
      end,
      blockHeight
    );
    allDrives.forEach((drive) => {
      allWallets.push(drive.address);
      wallets.push(drive.address);
    });
    allWallets = [...new Set(allWallets)];
    wallets = [...new Set(wallets)];

    const totalUniqueUserCount = allWallets.length;
    const dailyGrowth = totalUniqueUserCount - currentUserAmount;
    let graphiteMessage = message + "allUsers";
    await sendMessageToGraphite(graphiteMessage, totalUniqueUserCount, end);
    console.log(`Unique ArDrive Users Found: ${totalUniqueUserCount}`);

    graphiteMessage = message + "dailyGrowth";
    await sendMessageToGraphite(graphiteMessage, dailyGrowth, end);
    console.log(`Unique ArDrive Users Found: ${dailyGrowth}`);

    console.log(
      "Completed analytics from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );
    start = addHoursToDate(start, hoursToAdd);
    if (allDrives.length !== 0) {
      blockHeight = allDrives[allDrives.length - 1].blockHeight;
    }
  }
}

main();
