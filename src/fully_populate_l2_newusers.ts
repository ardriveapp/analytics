import { addHoursToDate, appNames, asyncForEach, getMinBlock } from "./common";
import { getAllAppL2Drives } from "./gql_L2";
import { sendMessageToGraphite } from "./graphite";
const fs = require("fs");
const message = "ardrive.users.l2."; // this is where all of the logs will be stored
const filePath = "unique_ardrive_users.txt";

async function main() {
  // The date to start looking for data
  let start = new Date(2020, 8, 26); // the beginning history of ardrive
  // let start = new Date(2021, 7, 16);

  // The date to finish looking for data
  let end = new Date();
  end.setHours(0, 0, 0, 0);

  let totalUniqueArDriveUsers: string[] = [];

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

  let blockHeight = 0;

  // Load existing totalUniqueArDriveUsers
  // TO DO
  try {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading the file:", err);
        return;
      }

      // Split the file content into an array of strings based on line breaks
      totalUniqueArDriveUsers = data.split("\n").map((line) => line.trim());

      console.log(
        "Array of unique ardrive users from file:",
        totalUniqueArDriveUsers
      );
    });
  } catch {
    console.log("Error getting file.  Starting new one.");
  }

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
    await sendMessageToGraphite(`${message}newUsers`, newUsersAdded, end);

    await sendMessageToGraphite(
      `${message}totalUniqueUsers`,
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
  const content = totalUniqueArDriveUsers.join("\n");
  fs.writeFile(filePath, content, (err) => {
    if (err) {
      console.error("Error writing to the file:", err);
    } else {
      console.log(`Data saved to ${filePath}`);
    }
  });
}

main();
