import { appNames, asyncForEach } from "./common";
import { getBundleTransactions_ASC } from "./gql";
import { BundleTx, ResultSet } from "./types";

async function main() {
  let totalBundledData = 0;
  const start = new Date(2020, 8, 1);
  const end = new Date(2022, 6, 29);

  console.log(
    "Getting all ArDrive Data from from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );
  const bundleTxs: BundleTx[] = await getBundleTransactions_ASC(start, end);
  console.log(`Bundles found: ${bundleTxs.length}`);
  for (let i = 0; i < bundleTxs.length; i += 1) {
    totalBundledData += bundleTxs[i].dataSize;
  }

  console.log(
    `Total bundled data found ${totalBundledData} across ${bundleTxs.length} bundles`
  );
}

main();
