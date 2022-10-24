import { addHoursToDate, asyncForEach, uploaders } from "./common";
import { getAllAppL1Transactions } from "./gql";
import { sendBundlesToGraphite, sendMessageToGraphite } from "./graphite";

const message = "uploader.l1."; // this is where all of the logs will be stored

async function main() {
  // The date to start looking for data
  let start = new Date(2022, 9, 1); // the beginning history of ardrive
  // let start = new Date(2022, 9, 10);

  // The date to finish looking for data
  let end = new Date();
  end.setHours(end.getHours() - 1); // end 1 hour in the past.

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

  while (start < end) {
    const end = new Date(addHoursToDate(start, hoursToQuery));
    console.log(
      "Collecting uploader stats from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );

    const foundAddresses: string[] = [];

    await asyncForEach(uploaders, async (uploader: string) => {
      console.log(`...${uploader}`);
      const l1Results = await getAllAppL1Transactions(start, end, uploader);
      await sendBundlesToGraphite(message, l1Results.bundleTxs, end);

      const appAddresses: string[] = [];
      l1Results.bundleTxs.forEach((tx) => {
        foundAddresses.push(tx.owner);
        appAddresses.push(tx.owner);
      });

      const uniqueAppUsers = new Set(appAddresses).size;
      await sendMessageToGraphite(
        `uploader.l1.users.` + uploader,
        uniqueAppUsers,
        end
      );
    });

    console.log(
      "Completed uploader analytics from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );
    start = addHoursToDate(start, hoursToQuery);
  }
}

main();
