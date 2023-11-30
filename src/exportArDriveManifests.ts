import { appNames, asyncForEach, getMinBlock } from "./utilities";
import { getAllAppL2Manifests } from "./gql_L2";
import { ArFSFileDataTx } from "./types";
const fs = require("fs");
export type User = {
  owner: string;
  bundles: number;
  dataSize: number;
  l1transactions: number;
  fileDataTxs: number;
  fileMetadataTxs: number;
  folderTxs: number;
  driveTxs: number;
  snapshotTxs: number;
};

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const name = "ArDrive_All_Manifests_" + today + ".csv";
  // The date to start looking for data
  let start = new Date(2020, 8, 20); // the beginning history of ardrive
  // let start = new Date(2021, 5, 10);

  // The date to finish looking for data
  let end = new Date();
  end.setHours(0, 0, 0, 0);

  let minBlock = await getMinBlock(start);
  console.log(
    "Collecting stats from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );

  const createCsvWriter = require("csv-writer").createObjectCsvWriter;

  const csvWriter = createCsvWriter({
    path: name,
    header: [
      { id: "owner", title: "OWNER" },
      { id: "id", title: "TXID" },
      { id: "dataSize", title: "DATASIZE" },
      { id: "appName", title: "APPNAME" },
      { id: "appVersion", title: "APPVERSION" },
      { id: "appPlatform", title: "APPPLATFORM" },
      { id: "appPlatformVersion", title: "APPPLATFORMVERSION" },
    ],
  });
  const allManifests: ArFSFileDataTx[] = [];

  await asyncForEach(appNames, async (appName: string) => {
    console.log(`...${appName}`);
    const fileDataTxs = await getAllAppL2Manifests(
      start,
      end,
      appName,
      minBlock
    );

    fileDataTxs.forEach((tx) => {
      allManifests.push(tx);
    });
    console.log("Finished %s", appName);
  });

  csvWriter.writeRecords(allManifests).then(() => {
    // console.log("...Done writing all ArDrive Community Fees transactions");
  });

  let data = JSON.stringify(allManifests, null, 5);

  console.log("%s manifests found", allManifests.length);
  fs.writeFile("ardrive_manifests.json", data, (err) => {
    if (err) throw err;
    console.log("Data written to file");
  });
  console.log(
    "Completed analytics from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );
}

main();
