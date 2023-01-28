import { arweave } from "./arweave";
import { asyncForEach, retryFetch, sleep } from "./common";
import Arweave from "arweave";
const fs = require("fs");

export const goldSky = Arweave.init({
  host: "arweave.net", // Arweave Gateway
  port: 443,
  protocol: "https",
  timeout: 600000,
  logging: false,
});

// export const gateways = ["https://arweave-search.goldsky.com"];
export const gateways = ["https://arweave.net"];
// export const gateways = ["http://test.arweave.ardrive.io:3002"];
// export const gateways = ["https://arweave.net"];

// Index of the currently used gateway into gateways.
let currentGateway: number = 0;

// Switches to the next gateway in the gateways array
function switchGateway() {
  currentGateway = (currentGateway + 1) % gateways.length;
  console.log("Switched gateway to " + gateways[currentGateway]);
}

// Chooses the current gateway and runs a callback with it.
// If an error occurs, the call is retried and the gateway is switched automatically.
export async function queryGoldSkyGateway(
  query: (url: string) => Promise<any>
): Promise<any> {
  const initialGatewayIndex = currentGateway;
  let tries: number = 0;
  while (true) {
    try {
      return await query(gateways[currentGateway]);
    } catch (err) {
      // console.log(err);
      console.log(
        "Gateway error with " + gateways[currentGateway] + ", retrying..."
      );
      tries += 1;
      await sleep(2500);
      if (tries >= 5) {
        tries = 0;
        switchGateway();
        if (currentGateway === initialGatewayIndex) {
          // We've tried all gateways, nothing left to do.
          return Promise.reject(err);
        }
      }
    }
  }
}

// Sums up every data transaction for a start and end period and returns newest results first
export async function getMetaplexTransactions(): Promise<string[]> {
  let cursor: string = "";
  let hasNextPage = true;
  let bundleTxIds: string[] = [];

  while (hasNextPage) {
    const query = {
      query: `query {
        transactions(
                owners:["OTMg8ZLV6Yj2huV6ClMhmW-A0BwGiLvxRQ2VS9T0pCk"]
            first: 100
            after: "${cursor}"
          sort: HEIGHT_ASC
        ) {
          pageInfo {
            hasNextPage
          }
          edges {
            cursor
            node {
              id
              block {
                height
              }
              tags {
                name
                value
              }
              bundledIn {
                id
              }
            }
          }
        }
      }`,
    };

    try {
      const transactions = await queryGoldSkyGateway(async (url: string) => {
        const response = await arweave.api.post(url + "/graphql", query);
        const { data } = response.data;
        if (data === undefined) {
          console.log(
            "Get All L1 Transactions... Undefined data returned from Gateway"
          );
          return 0;
        } else {
          const { transactions } = data;
          return transactions;
        }
      });
      if (transactions === 0) {
        await sleep(1000);
      } else {
        hasNextPage = transactions.pageInfo.hasNextPage;
        const { edges } = transactions;
        edges.forEach((edge: any) => {
          cursor = edge.cursor;
          const { node } = edge;
          const { block } = node;
          if (block !== null) {
            if (node.bundledIn) {
              bundleTxIds.push(node.bundledIn.id); // we only care about bundles
            }
          }
        });
      }
    } catch (err) {
      console.log(err);
      console.log("Error getting transactions");
      hasNextPage = false;
    }
  }

  console.log("Txs Found: %s", bundleTxIds.length);
  bundleTxIds = [...new Set(bundleTxIds)];
  console.log("Unique Bundles Found: %s", bundleTxIds.length);

  return bundleTxIds;
}

export async function main() {
  let bundleTxIds = await getMetaplexTransactions();
  let messagesToSend: string[] = [];
  for (let i = 0; i < bundleTxIds.length; i++) {
    messagesToSend.push(
      `@aws sqs send-message --message-body {"id": "${bundleTxIds[i]}" --queue-url https://sqs.us-east-1.amazonaws.com/766398747845/import-bundles --chatbot-replace-curly-quotes enable  --chatbot-remove-markdown enable --region us-east-1`
    );
  }
  let jsonContent = JSON.stringify(bundleTxIds);

  /*await asyncForEach(bundleTxIds, async (bundleTxId: string) => {
    const response = await retryFetch(
      `https://arweave.net/tx/${bundleTxId}/status`
    );
    const txDetails = JSON.parse(await response.data);
    console.log(txDetails);
  }); */

  fs.writeFile("pizajo_arweave.net.json", jsonContent, "utf8", function (err) {
    if (err) {
      console.log("An error occured while writing JSON Object to File.");
      return console.log(err);
    }
  });
}

main();
