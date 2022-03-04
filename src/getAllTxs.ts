import { countDistinct } from "./common";
import { getAllDrives } from "./gql";
import { ArDriveStat } from "./types";

export async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(2020, 8, 26); // the beginning history of ardrive
  const end = new Date();
  const name = "ArDrive_All_Drives_Report_" + today + ".csv";
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;

  const csvWriter = createCsvWriter({
    path: name,
    header: [
      { id: "address", title: "ADDRESS" },
      { id: "privacy", title: "PRIVACY" },
      { id: "appName", title: "APPNAME" },
      { id: "driveId", title: "DRIVEID" },
      { id: "tx", title: "TX" },
      { id: "data", title: "DATA" },
      { id: "blockTimeStamp", title: "BLOCKTIMESTAMP" },
    ],
  });

  console.log(
    "Getting all ArDrive Drive IDs from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );
  const allDrives: ArDriveStat[] = await getAllDrives(start, end);

  console.log("Total Drive IDs found: %s", allDrives.length);
  console.log(
    "Total Unique Drives IDs: %s",
    countDistinct(allDrives, allDrives.length)
  );
  csvWriter.writeRecords(allDrives).then(() => {
    console.log("...Done getting all drives");
  });
}

main();
