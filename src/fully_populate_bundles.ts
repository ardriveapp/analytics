import { addHoursToDate } from "./common";
import { getBundleTransactions_ASC } from "./gql";
import { sendBundlesToGraphite } from "./graphite";
import { BundleTx } from "./types";

const message = "ardrive.apps.l1."; // this is where all of the logs will be stored

async function main() {
  let today = new Date();
  let allBundles: BundleTx[] = [];

  // The amount of hours to search for i.e. 12, 24 or other range
  let hoursToQuery: number = 12;

  // const start = new Date(2020, 8, 26) // the beginning history of ardrive
  let start = new Date(2021, 9, 1);
  console.log(
    "Running analyytics from %s to %s",
    start.toLocaleString(),
    today.toLocaleString()
  );
  console.log(
    "--------------------------------------------------------------------------------"
  );

  while (start < today) {
    const end = new Date(addHoursToDate(start, hoursToQuery));
    console.log(
      "Bundle stats from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );
    let bundles: BundleTx[] = await getBundleTransactions_ASC(start, end);
    await sendBundlesToGraphite(message, bundles, end);

    let totalData = bundles
      .map((item) => item.dataSize)
      .reduce((prev, curr) => prev + curr, 0);
    let totalTips = bundles
      .map((item) => item.quantity)
      .reduce((prev, curr) => prev + curr, 0);
    console.log("Daily ArDrive stats");
    console.log(
      "  - Bundles: %s, Data: %s, Tips: %s",
      bundles.length,
      totalData,
      totalTips
    );

    start = addHoursToDate(start, hoursToQuery);
    allBundles = allBundles.concat(bundles);
  }

  const totalData = allBundles
    .map((item) => item.dataSize)
    .reduce((prev, curr) => prev + curr, 0);
  const totalTips = allBundles
    .map((item) => item.quantity)
    .reduce((prev, curr) => prev + curr, 0);
  console.log("Total ArDrive stats for this run");
  console.log(
    "  - Bundles: %s, Data: %s, Tips: %s",
    allBundles.length,
    totalData,
    totalTips
  );
}

main();
