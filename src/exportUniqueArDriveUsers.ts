import { appNames, asyncForEach, getMinBlock } from "./common";
import { getAllAppL1Transactions } from "./gql_L1";
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
  const name = "ArDrive_All_Unique_Users_" + today + ".csv";
  // The date to start looking for data
  let start = new Date(2020, 8, 20); // the beginning history of ardrive
  // let start = new Date(2021, 5, 10);

  // The date to finish looking for data
  let end = new Date();
  end.setHours(0, 0, 0, 0);

  // The amount of hours to search for in the period i.e. 12, 24 or other range
  let hoursToQuery: number = 12;

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
      { id: "bundles", title: "BUNDLES" },
      { id: "dataSize", title: "DATASIZE" },
      { id: "l1transactions", title: "L1TRANSACTIONS" },
      { id: "fileDataTxs", title: "FILEDATATXS" },
      { id: "fileMetadataTxs", title: "FILEMETADATATXS" },
      { id: "folderTxs", title: "FOLDERTXS" },
      { id: "driveTxs", title: "DRIVETXS" },
      { id: "snapshotTxs", title: "SNAPSHOTTXS" },
    ],
  });

  const users: {
    [userName: string]: User;
  } = {};

  await asyncForEach(appNames, async (appName: string) => {
    console.log(`...${appName}`);
    const l1Results = await getAllAppL1Transactions(
      start,
      end,
      appName,
      minBlock
    );

    l1Results.bundleTxs.forEach((tx) => {
      if (users[tx.owner]) {
        users[tx.owner].bundles += 1;
        users[tx.owner].l1transactions += 1;
      } else {
        users[tx.owner] = {
          owner: tx.owner,
          bundles: 1,
          dataSize: 0,
          l1transactions: 1,
          fileDataTxs: 0,
          fileMetadataTxs: 0,
          folderTxs: 0,
          driveTxs: 0,
          snapshotTxs: 0,
        };
      }
    });
    l1Results.fileDataTxs.forEach((tx) => {
      if (users[tx.owner]) {
        users[tx.owner].dataSize += tx.dataSize;
        users[tx.owner].fileDataTxs += 1;
        users[tx.owner].l1transactions += 1;
      } else {
        users[tx.owner] = {
          owner: tx.owner,
          bundles: 0,
          dataSize: tx.dataSize,
          l1transactions: 1,
          fileDataTxs: 1,
          fileMetadataTxs: 0,
          folderTxs: 0,
          driveTxs: 0,
          snapshotTxs: 0,
        };
      }
    });
    l1Results.fileTxs.forEach((tx) => {
      if (users[tx.owner]) {
        users[tx.owner].dataSize += tx.dataSize;
        users[tx.owner].fileMetadataTxs += 1;
        users[tx.owner].l1transactions += 1;
      } else {
        users[tx.owner] = {
          owner: tx.owner,
          bundles: 0,
          dataSize: tx.dataSize,
          l1transactions: 1,
          fileDataTxs: 0,
          fileMetadataTxs: 1,
          folderTxs: 0,
          driveTxs: 0,
          snapshotTxs: 0,
        };
      }
    });
    l1Results.folderTxs.forEach((tx) => {
      if (users[tx.owner]) {
        users[tx.owner].dataSize += tx.dataSize;
        users[tx.owner].folderTxs += 1;
        users[tx.owner].l1transactions += 1;
      } else {
        users[tx.owner] = {
          owner: tx.owner,
          bundles: 0,
          dataSize: tx.dataSize,
          l1transactions: 1,
          fileDataTxs: 0,
          fileMetadataTxs: 0,
          folderTxs: 1,
          driveTxs: 0,
          snapshotTxs: 0,
        };
      }
    });
    l1Results.driveTxs.forEach((tx) => {
      if (users[tx.owner]) {
        users[tx.owner].dataSize += tx.dataSize;
        users[tx.owner].driveTxs += 1;
        users[tx.owner].l1transactions += 1;
      } else {
        users[tx.owner] = {
          owner: tx.owner,
          bundles: 0,
          dataSize: tx.dataSize,
          l1transactions: 1,
          fileDataTxs: 0,
          fileMetadataTxs: 0,
          folderTxs: 0,
          driveTxs: 1,
          snapshotTxs: 0,
        };
      }
    });
    l1Results.snapshotTxs.forEach((tx) => {
      if (users[tx.owner]) {
        users[tx.owner].dataSize += tx.dataSize;
        users[tx.owner].snapshotTxs += 1;
        users[tx.owner].l1transactions += 1;
      } else {
        users[tx.owner] = {
          owner: tx.owner,
          bundles: 0,
          dataSize: tx.dataSize,
          l1transactions: 1,
          fileDataTxs: 0,
          fileMetadataTxs: 0,
          folderTxs: 0,
          driveTxs: 0,
          snapshotTxs: 1,
        };
      }
    });
    console.log("Finished %s", appName);
  });

  csvWriter.writeRecords(users).then(() => {
    // console.log("...Done writing all ArDrive Community Fees transactions");
  });

  let data = JSON.stringify(users, null, 5);

  fs.writeFile("ardrive_users.json", data, (err) => {
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
