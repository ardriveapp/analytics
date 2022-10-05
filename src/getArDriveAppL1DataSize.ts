import { appNames, asyncForEach, formatBytes } from "./common";
import { getBundleTransactions_ASC } from "./gql";
import { BundleTx, ResultSet } from "./types";

async function main() {
  let totalBundledData = 0;
  let totalBundleTxs = 0;
  const totalAddresses: string[] = [];
  // const start = new Date(2020, 8, 1);
  // const end = new Date(2022, 6, 29);
  let end = new Date();
  // The start date for the query range
  //let start = new Date(2022, 8, 4);
  let start = new Date(2022, 4, 1);
  console.log(
    "Getting all ArDrive Data from from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );
  await asyncForEach(appNames, async (appName: string) => {
    const foundAddresses: string[] = [];
    let appBundledData = 0;
    const bundleTxs: BundleTx[] = await getBundleTransactions_ASC(
      start,
      end,
      appName
    );
    totalBundleTxs += bundleTxs.length;
    for (let i = 0; i < bundleTxs.length; i += 1) {
      appBundledData += bundleTxs[i].dataSize;
      totalBundledData += bundleTxs[i].dataSize;
      foundAddresses.push(bundleTxs[i].owner);
      totalAddresses.push(bundleTxs[i].owner);
    }
    const appUniqueUsers = new Set(foundAddresses).size;
    console.log(
      `Total bundled data found for ${appName} with ${formatBytes(
        appBundledData
      )} across ${bundleTxs.length} bundles and ${appUniqueUsers} unique users`
    );
  });
  const totalUniqueUserCount = new Set(totalAddresses).size;
  console.log(
    `Total bundled data found ${formatBytes(
      totalBundledData
    )} across ${totalBundleTxs} bundles and ${totalUniqueUserCount} unique users`
  );
}

main();
