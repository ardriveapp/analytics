const fs = require("fs");
// Gets all unique users who have uploaded to ArDrive in the given time range
export async function main() {
  let bundleTxIds: string[] = [];
  let bundleData = JSON.parse(fs.readFileSync("bundles.json").toString());

  bundleData.data.transactions.edges.forEach(async (bundleTx: any) => {
    bundleTxIds.push(bundleTx.node.bundledIn.id);
  });
  bundleTxIds = [...new Set(bundleTxIds)];
  console.log(bundleTxIds);
}

main();
