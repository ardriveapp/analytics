import { getMinBlock } from "./common";
import { getAllObservationReports } from "./gql_L2";
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
  const appName = 'AR-IO Observer'
  const today = new Date().toISOString().slice(0, 10);
  const name = "AR.IO_Observation_Reports_" + today + ".csv";
  // The date to start looking for data
  let start = new Date(2023, 9, 18); // the beginning history of ardrive
  // let start = new Date(2021, 5, 10);

  // The date to finish looking for data
  let end = new Date();
  end.setHours(0, 0, 0, 0);

  let minBlock = await getMinBlock(start);
  console.log(
    "Collecting ar.io observation reports from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );

  const createCsvWriter = require("csv-writer").createObjectCsvWriter;

  const csvWriter = createCsvWriter({
    path: name,
    header: [
      { id: "owner", title: "OWNER" },
      { id: "id", title: "TXID" },
      { id: "blockHeight", title: "BLOCKHEIGHT" },
      { id: "friendlyDate", title: "FRIENDLYDATE" },
      { id: "dataSize", title: "DATASIZE" },
      { id: "appName", title: "APPNAME" },
      { id: "appVersion", title: "APPVERSION" },
      { id: "contentType", title: "CONTENTTYPE" },
      { id: "bundledIn", title: "BUNDLEDIN" },
    ],
  });

  const allReports = await getAllObservationReports(
    start,
    end,
    appName,
    minBlock
  );

  csvWriter.writeRecords(allReports.fileDataTxs).then(() => {
    // console.log("...Done writing all ArDrive Community Fees transactions");
  });

  console.log(
    "Completed analytics from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );
}

main();
