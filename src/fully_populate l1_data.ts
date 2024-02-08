import {
  addHoursToDate,
  appNames,
  asyncForEach,
  getMinBlock,
} from "./utilities";
import { getAllAppL1Transactions } from "./gql_L1";
import {
  sendBundlesToGraphite,
  sendFileMetadataToGraphite,
  sendFileDataToGraphite,
  sendFolderMetadataToGraphite,
  sendDriveMetadataToGraphite,
  sendL1CommunityTipsToGraphite,
  sendMessageToGraphite,
  sendSnapshotMetadataToGraphite,
} from "./graphite";

const message = "ardrive.apps.l1."; // this is where all of the logs will be stored

async function main() {
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
  while (start < end) {
    const end = new Date(addHoursToDate(start, hoursToQuery));

    console.log(
      "Collecting stats from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );

    const foundAddresses: string[] = [];

    await asyncForEach(appNames, async (appName: string) => {
      console.log(`...${appName}`);
      const l1Results = await getAllAppL1Transactions(
        start,
        end,
        appName,
        minBlock
      );
      await sendBundlesToGraphite(message, l1Results.bundleTxs, end);
      await sendFileMetadataToGraphite(message, l1Results.fileTxs, end);
      await sendFileDataToGraphite(message, l1Results.fileDataTxs, end);
      await sendFolderMetadataToGraphite(message, l1Results.folderTxs, end);
      await sendDriveMetadataToGraphite(message, l1Results.driveTxs, end);
      await sendSnapshotMetadataToGraphite(message, l1Results.snapshotTxs, end);
      await sendL1CommunityTipsToGraphite(message, l1Results.tipTxs, end);

      const appAddresses: string[] = [];
      l1Results.bundleTxs.forEach((tx) => {
        foundAddresses.push(tx.owner);
        appAddresses.push(tx.owner);
      });
      l1Results.fileDataTxs.forEach((tx) => {
        foundAddresses.push(tx.owner);
        appAddresses.push(tx.owner);
      });
      l1Results.fileTxs.forEach((tx) => {
        foundAddresses.push(tx.owner);
        appAddresses.push(tx.owner);
      });
      l1Results.folderTxs.forEach((tx) => {
        foundAddresses.push(tx.owner);
        appAddresses.push(tx.owner);
      });
      l1Results.driveTxs.forEach((tx) => {
        foundAddresses.push(tx.owner);
        appAddresses.push(tx.owner);
      });
      l1Results.snapshotTxs.forEach((tx) => {
        foundAddresses.push(tx.owner);
        appAddresses.push(tx.owner);
      });
      const uniqueAppUsers = new Set(appAddresses).size;
      await sendMessageToGraphite(
        `ardrive.users.l1.` + appName,
        uniqueAppUsers,
        end
      );
    });
    const uniqueTotalUsers = new Set(foundAddresses).size;
    await sendMessageToGraphite(
      `ardrive.users.l1.totalUsers`,
      uniqueTotalUsers,
      end
    );

    console.log(
      "Completed analytics from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );
    start = addHoursToDate(start, hoursToQuery);
    minBlock = await getMinBlock(start);
  }
}

main();
