import { getAllAppL2Transactions } from "./gql_L2";
import { Uploader } from "./types";
const fs = require("fs");
export async function main() {
  let appName = "ArDrive-App-Android";
  let start = new Date(2023, 1, 26); // the beginning of eth denver
  start.setHours(0, 0, 0, 0);

  // The date to finish looking for data
  let end = new Date(2023, 2, 5);
  end.setHours(0, 0, 0, 0);

  console.log(
    "Collecting all %s stats from %s to %s",
    appName,
    start.toLocaleString(),
    end.toLocaleString()
  );
  console.log(
    "--------------------------------------------------------------------------------"
  );

  const topMobileUploaders = await getAllAppL2Transactions(start, end, appName);
  const bundleTxs = topMobileUploaders.bundleTxs;
  let owners: Uploader[] = [];
  for (let i = 0; i < topMobileUploaders.bundleTxs.length; i += 1) {
    if (owners[`${bundleTxs[i].owner}`] === undefined) {
      owners[bundleTxs[i].owner] = bundleTxs[i].dataSize;
    } else {
      owners[bundleTxs[i].owner] += bundleTxs[i].dataSize;
    }
  }
  console.log(owners);
}

main();
