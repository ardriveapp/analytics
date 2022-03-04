import { countDistinct } from "./common";
import { getAllFolders } from "./gql";

export async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(2020, 8, 26); // the beginning history of ardrive
  const end = new Date();
  const name = "ArDrive_All_Folders_Report_" + today + ".csv";
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;

  const csvWriter = createCsvWriter({
    path: name,
    header: [{ id: "folderId", title: "FOLDERID" }],
  });

  console.log(
    "Getting all ArDrive Folder IDs from %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );
  const allFolders = await getAllFolders(start, end);

  console.log("Total Folder IDs found: %s", allFolders.length);
  console.log(
    "Total Unique Folder IDs: %s",
    countDistinct(allFolders, allFolders.length)
  );
  csvWriter.writeRecords(allFolders).then(() => {
    console.log("...Done getting all folders");
  });
}

main();
