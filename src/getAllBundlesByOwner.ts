import { getAllBundlesByOwner } from "./gql_L2";

const fs = require("fs");
export async function main() {
  let owner = ""; // add public wallet address here
  const fileName = owner + '_l1+l2_bundles.txt'
  // The date to start looking for bundles
  let start = new Date(2020, 10, 1);
  start.setHours(0, 0, 0, 0);

  // The date to finish looking for bundles
  let end = new Date();
  end.setHours(0, 0, 0, 0);

  console.log(
    "Collecting all bundles uploaded by %s from %s to %s",
    owner,
    start.toLocaleString(),
    end.toLocaleString()
  );
  console.log(
    "--------------------------------------------------------------------------------"
  );

  const bundles = await getAllBundlesByOwner(start, end, owner);

  /*
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;
  const csvWriter = createCsvWriter({
    path: name,
    header: [
      { id: "foundL1Transactions", title: "FOUNDL1TRANSACTIONS" },
      { id: "foundL2Transactions", title: "FOUNDL2TRANSACTIONS" },
      { id: "foundDataItemData", title: "FOUNDDATAITEMDATA" },
      { id: "foundBundledData", title: "FOUNDBUNDLEDDATA" },
      { id: "uniqueTotalUsers", title: "UNIQUETOTALUSERS" },
    ],
  });*/

  const bundlesToProcess: string[] = []
  bundles.forEach((bundle) => { 
    if (bundle.bundledInTxId) {
      // console.log ("Nested bundle %s", bundle.bundledInTxId)
      bundlesToProcess.push(`curl -X POST -H "Authorization: Bearer testing" -H "Content-Type: application/json" "http://localhost:4000/ar-io/admin/queue-tx" -d '{ "id": "${bundle.bundledInTxId}" }'`);
    } else {
      // console.log ("Top level bundle %s", bundle.txId)
      bundlesToProcess.push(`curl -X POST -H "Authorization: Bearer testing" -H "Content-Type: application/json" "http://localhost:4000/ar-io/admin/queue-tx" -d '{ "id": "${bundle.txId}" }'`);;
    }
  })
  const uniqueBundles = [...new Set(bundlesToProcess)];
  console.log("Found %s unique bundles.", uniqueBundles.length)
  const data = uniqueBundles.join('\n');
  //const data = JSON.stringify(bundlesToProcess, null, 2);
  fs.writeFile(fileName, data, (err) => {
    if (err) {
      console.error('Error writing to file:', err);
    } else {
      console.log('Successfully wrote unbundling commands to the file.');
    }
  });
}

main();
