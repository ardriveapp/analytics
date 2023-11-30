import {
  addHoursToDate,
  asyncForEach,
  getMinBlock,
  uploaderAppNames,
} from "./utilities";
import { getAllAppL1Transactions } from "./gql_L1";
import { sendBundlesToGraphite } from "./graphite";

const message = "uploader.l1."; // this is where all of the logs will be stored

async function main() {
  // The date to start looking for data
  let start = new Date(2022, 9, 15);
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
    const end = new Date(addHoursToDate(start, hoursToQuery));
    console.log(
      "Collecting uploader stats from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );

    await asyncForEach(uploaderAppNames, async (uploader: string) => {
      console.log(`...${uploader}`);
      const l1Results = await getAllAppL1Transactions(
        start,
        end,
        uploader,
        minBlock
      );

      await sendBundlesToGraphite(message, l1Results.bundleTxs, end);
    });

    console.log(
      "Completed uploader analytics from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );
    start = addHoursToDate(start, hoursToQuery);
    minBlock = await getMinBlock(start);
  }
}

main();
