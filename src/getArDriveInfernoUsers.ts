import { appNames, asyncForEach, dataCompare, formatBytes } from "./common";
import { getAllAppTransactionsByBlocks_Inferno, getAllAppTransactionsByDate_Inferno} from "./gql";
import { InfernoStatus, InfernoUser } from "./types";
const fs = require('fs');

async function main() {
  let jobStart = new Date();
  let appResults: InfernoUser[] = [];
  let allResults: InfernoUser[] = [];
  let minBlock = 0;
  let maxBlock = 0;
  let gqlStart;
  let gqlEnd;
  let startDate: Date;
  let endDate: Date;
  let elligibleUsers = 0;
  let totalGqlRequests = 0;

  //Handle arguments from STDIN
  const myArgs = process.argv.slice(2);
  if ((+myArgs[0] > 0) && (+myArgs[1] > 0)) { // Check if it is a valid block height
    minBlock = +myArgs[0];
    maxBlock = +myArgs[1];
    console.log(
      "%s Running analytics from %s to %s",
      jobStart,
      minBlock,
      maxBlock
    ); 
    gqlStart = minBlock.toString();
    gqlEnd = maxBlock.toString();
  } else { 
    startDate = new Date(myArgs[0]); // 
    endDate = new Date(myArgs[1]);
    if (startDate.toString() === "Invalid Date" || endDate.toString() === "Invalid Date") { // It isnt a block height, so check if it is a date
      console.log ("You have entered an invalid date");
      console.log ("Start Date: %s", startDate.toString());
      console.log ("End Date: %s", endDate.toString());
      return 0;
    } else { // Run with a date
      console.log(
        "%s Running analytics from %s to %s",
        jobStart,
        startDate,
        endDate
      );
      gqlStart = startDate.getDate() + "-" + startDate.getMonth() + "-" + startDate.getFullYear();
      gqlEnd = endDate.getDate() + "-" + endDate.getMonth() + "-" + endDate.getFullYear();
    }
  }

  console.log(
    "--------------------------------------------------------------------------------"
  );

  await asyncForEach(appNames, async (appName: string) => {
    let results;
    if (maxBlock !== 0) { // This means we are querying by blocks and not dates
      results = await getAllAppTransactionsByBlocks_Inferno(minBlock, maxBlock, appName);
      appResults = results.appResults
    } else { // We query by date range instead
      results = await getAllAppTransactionsByDate_Inferno(startDate, endDate, appName);
    }
    console.log ("Made %s GQL requests for %s", results.gqlRequests, appName);
    appResults = results.appResults;
    totalGqlRequests += results.gqlRequests;

    await asyncForEach(appResults, async (result: InfernoUser) => {
      let objIndex = allResults.findIndex((obj => obj.address === result.address));
      if (objIndex >= 0) {
        // If it exists, then we increment the existing data amount
        // console.log ("Existing wallet found %s with %s data", results[objIndex].address, results[objIndex].size);
        allResults[objIndex].size += result.size;
        allResults[objIndex].files += result.files;
      } else {
        // Else we add a new user into our Astatine List
        allResults.push(result);
      };
    });
  });
  
    // sort the results based on data size
    allResults.sort(dataCompare);
    // add up all of the data in the list for a total data size, set their rank and determine if they are eligible
    let totalDataSize = 0
    let totalFiles = 0;
    let rank = 1;
    for (let i = 0; i < allResults.length; i++) {
      totalDataSize += allResults[i].size;
      totalFiles += allResults[i].files;
      allResults[i].rank = rank;
      rank++;
      if (allResults[i].size > 1048576000) { // the minimum amount required
        allResults[i].elligible = true;
        elligibleUsers++;
      } 
    };

  console.log("All Results");
  //console.log(allResults);
  console.log("Total Size collected %s bytes | %s", totalDataSize, formatBytes(totalDataSize));

  if (maxBlock !== 0) {

  } else {
    
  }
  const infernoStatus: InfernoStatus = {
    jobStart,
    jobEnd: new Date,
    gqlStart,
    gqlEnd,
    totalGqlRequests,
    totalDataSize,
    totalFiles,
    infernoUsers: allResults.length,
    elligibleUsers,
    allResults
  };

  let fileName = 'infernoStatus_' + gqlStart + '_to_' + gqlEnd + '.json'
  fs.writeFileSync(fileName, JSON.stringify(infernoStatus, null, 2));
  return "Success"
}

main();
