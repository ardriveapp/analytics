import {
  addHoursToDate,
  appNames,
  asyncForEach,
  getMinBlock,
  loadLatestJsonFile,
  saveDataToJsonFile,
} from "./utilities";
import { getAllAppL2Drives } from "./gql_L2";
import { sendMessageToGraphite } from "./graphite";
const fs = require("fs");
const message = "ardrive.users.l2"; // this is where all of the logs will be stored
let filePath = "unique_ardrive_users.json";

async function main() {
  // The date to start looking for data
  let start = new Date(2020, 8, 26); // the beginning history of ardrive

  // The date to finish looking for data
  let end = new Date();
  end.setHours(0, 0, 0, 0);

  let hoursToQuery: number = 24; // The amount of hours to search for in the period i.e. 12, 24 or other range.

  console.log(
    "Collecting all new user counts, based on new drives created, in %s hour increments from %s to %s",
    hoursToQuery,
    start.toLocaleString(),
    end.toLocaleString()
  );
  console.log(
    "--------------------------------------------------------------------------------"
  );

  // Load the JSON file
  const loadedData = loadLatestJsonFile();
  let totalUniqueArDriveUsers: string[] =
    loadedData?.totalUniqueArDriveUsers || [];
  let blockHeight: number = loadedData?.lastBlockScanned || 0;
  let lastBlockScanned: number = blockHeight;

  console.log("Starting from the last block: ", blockHeight);

  while (start < end) {
    const end = new Date(addHoursToDate(start, hoursToQuery));
    console.log(
      "Collecting stats from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );

    const users: string[] = [];

    await asyncForEach(appNames, async (appName: string) => {
      console.log(`...${appName}`);
      const l2Results = await getAllAppL2Drives(
        start,
        end,
        appName,
        blockHeight
      );

      l2Results.driveTxs.forEach((tx) => {
        if (tx.blockHeight > lastBlockScanned) {
          lastBlockScanned = tx.blockHeight;
        }
        users.push(tx.owner);
      });
    });

    console.log("%s users found across all apps: ", users.length);
    const uniqueUsersSet = new Set(users);
    const uniqueUsers = [...uniqueUsersSet];
    console.log("%s unique users found:", uniqueUsers.length);

    const oldUserTotalCount = totalUniqueArDriveUsers.length;
    const combinedUsers = totalUniqueArDriveUsers.concat(uniqueUsers);
    const combinedUsersSet = new Set(combinedUsers);
    totalUniqueArDriveUsers = [...combinedUsersSet];
    const newUsersAdded = totalUniqueArDriveUsers.length - oldUserTotalCount;
    console.log("New users added: ", newUsersAdded);
    console.log("Total users: ", totalUniqueArDriveUsers.length);
    await sendMessageToGraphite(`${message}.newUsers`, newUsersAdded, end);

    await sendMessageToGraphite(
      `${message}.totalUniqueUsers`,
      totalUniqueArDriveUsers.length,
      end
    );

    console.log(
      "Completed analytics from %s to %s",
      start.toLocaleString(),
      end.toLocaleString()
    );
    blockHeight = await getMinBlock(start);
    start = addHoursToDate(start, hoursToQuery);
  }

  start = addHoursToDate(start, hoursToQuery); // the end date for user collection

  const data = {
    lastBlockScanned,
    totalUniqueArDriveUsers,
  };
  const baseFileName = `output_l2`;
  await saveDataToJsonFile(data, baseFileName, lastBlockScanned);
}

main();
