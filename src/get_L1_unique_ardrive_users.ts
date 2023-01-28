import { getUniqueArDriveUsersInPeriod } from "./common";

// Gets all unique users who have uploaded to ArDrive in the given time range
export async function main() {
  let start = new Date(2021, 0, 1);
  let end = new Date(2022, 0, 1);
  // let end = new Date();

  const uniqueUsers = await getUniqueArDriveUsersInPeriod(start, end);
  console.log(uniqueUsers);
}

main();
