import { addHoursToDate, appNames, asyncForEach } from "./common";
import { getAllAppL2Transactions } from "./gql_L2";
import {
  sendBundlesToGraphite,
  sendDriveMetadataToGraphite,
  sendFileDataToGraphite,
  sendFileMetadataToGraphite,
  sendFolderMetadataToGraphite,
  sendMessageToGraphite,
  sentL1CommunityTipsToGraphite,
} from "./graphite";

const message = "ardrive.users.l2."; // this is where all of the logs will be stored

async function main() {
  // The date to start looking for data
  let start = new Date(2020, 8, 26); // the beginning history of ardrive
  // let start = new Date(2021, 7, 16);

  // The date to finish looking for data
  let end = new Date();
  end.setHours(0, 0, 0, 0);

  let hoursToQuery: number = 24; // 30 days worth of hours.  The amount of hours to search for in the period i.e. 12, 24 or other range.
  let hoursToAdd: number = 24; // The amount of hours that will be added iteratively

  console.log(
    "Collecting all User Growth stats, based on new drives created, in %s hour increments from %s to %s",
    hoursToQuery,
    start.toLocaleString(),
    end.toLocaleString()
  );
  console.log(
    "--------------------------------------------------------------------------------"
  );

  let blockHeight = 0;
  let nextBlockHeight = 0;

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
      const l2Results = await getAllAppL2Transactions(
        start,
        end,
        appName,
        blockHeight
      );
      await sendBundlesToGraphite(message, l2Results.bundleTxs, end);
      await sendFileMetadataToGraphite(message, l2Results.fileTxs, end);
      await sendFileDataToGraphite(message, l2Results.fileDataTxs, end);
      await sendFolderMetadataToGraphite(message, l2Results.folderTxs, end);
      await sendDriveMetadataToGraphite(message, l2Results.driveTxs, end);
      await sentL1CommunityTipsToGraphite(message, l2Results.tipTxs, end);
      if (l2Results.lastBlock > blockHeight) {
        nextBlockHeight = l2Results.lastBlock;
      }
      const appAddresses: string[] = [];
      l2Results.bundleTxs.forEach((tx) => {
        foundAddresses.push(tx.owner);
        appAddresses.push(tx.owner);
      });
      l2Results.fileDataTxs.forEach((tx) => {
        foundAddresses.push(tx.owner);
        appAddresses.push(tx.owner);
      });
      l2Results.fileTxs.forEach((tx) => {
        foundAddresses.push(tx.owner);
        appAddresses.push(tx.owner);
      });
      l2Results.folderTxs.forEach((tx) => {
        foundAddresses.push(tx.owner);
        appAddresses.push(tx.owner);
      });
      l2Results.driveTxs.forEach((tx) => {
        foundAddresses.push(tx.owner);
        appAddresses.push(tx.owner);
      });
      const uniqueAppUsers = new Set(appAddresses).size;
      await sendMessageToGraphite(
        `ardrive.users.l2.` + appName,
        uniqueAppUsers,
        end
      );
    });

    blockHeight = nextBlockHeight;
    const uniqueTotalUsers = new Set(foundAddresses).size;
    await sendMessageToGraphite(
      `ardrive.users.l2.totalUsers`,
      uniqueTotalUsers,
      end
    );

    console.log(
      "Completed analytics from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );
    start = addHoursToDate(start, hoursToQuery);
  }
}

main();
