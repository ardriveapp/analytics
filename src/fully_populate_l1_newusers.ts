import {
  addHoursToDate,
  appNames,
  asyncForEach,
  getMinBlock,
} from "./utilities";
import { getAllAppL2Drives } from "./gql_L2";
import { sendMessageToGraphite } from "./graphite";
const fs = require("fs");
const message = "ardrive.users.l1"; // this is where all of the logs will be stored
let filePath = "unique_l1ardrive_users.json";

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

  // Write the data to the file
  // Add lastBlockScanned to the top
  // Make JSON instead of txt file
  const data = {
    lastBlockScanned,
    totalUniqueArDriveUsers,
  };
  const jsonString = JSON.stringify(data, null, 2); // 2 is for pretty formatting
  const fileName = `output_l1_${lastBlockScanned}.json`;

  fs.writeFile(fileName, jsonString, (err) => {
    if (err) {
      console.error("Error writing to the file:", err);
    } else {
      console.log(`Data saved to ${filePath}`);
    }
  });
}

main();

function loadLatestJsonFile() {
  const files = fs.readdirSync("."); // Read current directory
  const jsonFiles = files.filter(
    (file) => file.startsWith("output_") && file.endsWith(".json")
  );

  let highestBlockScanned = 0;
  let latestFile = "";

  jsonFiles.forEach((file) => {
    const blockScanned = parseInt(file.match(/output_(\d+)\.json/)?.[1] || "0");
    if (blockScanned > highestBlockScanned) {
      highestBlockScanned = blockScanned;
      latestFile = file;
    }
  });

  if (latestFile) {
    const data = JSON.parse(fs.readFileSync(latestFile, "utf8"));
    console.log("Loaded file:", latestFile);
    console.log(data);
    return data;
  } else {
    console.log("No relevant JSON files found.");
    return null;
  }
}
