import { fetchJoinedGateways, getObserverUptime } from "./arnsCache";
import {
  formatGatewayUrl,
  formatObserverHealthCheckUrl,
  getMinBlock,
} from "./utilities";
import { getAllObservationReports } from "./gql_L2";
const fs = require("fs");
export type User = {
  owner: string;
  bundles: number;
  dataSize: number;
  l1transactions: number;
  fileDataTxs: number;
  fileMetadataTxs: number;
  folderTxs: number;
  driveTxs: number;
  snapshotTxs: number;
};

const contract = "bLAgYxAdX2Ry-nt6aH2ixgvJXbpsEYm28NgJgyqfs-U"; // testnet
//const contract = "3aX8Ck5_IRLA3L9o4BJLOWxJDrmLLIPoUGZxqOfmHDI"; // devnet
const gatewaysUrl = `https://api.arns.app/v1/contract/${contract}/gateways`;

async function main() {
  const appName = "AR-IO Observer";
  const start = new Date().toISOString().slice(0, 10);
  const name = "AR.IO_Network_Stats_" + start + ".csv";

  const createCsvWriter = require("csv-writer").createObjectCsvWriter;

  const csvWriter = createCsvWriter({
    path: name,
    header: [
      { id: "gatewayWallet", title: "GATEWAYWALLET" },
      { id: "gatewayUrl", title: "GATEWAYURL" },
      { id: "observerWallet", title: "OBSERVERWALLET" },
      { id: "observerUptime", title: "OBSERVERUPTIME" },
    ],
  });

  const gateways = await fetchJoinedGateways(gatewaysUrl);
  const stats: {
    gatewayWallet: string;
    gatewayUrl: string;
    observerWallet: string;
    observerUptime: number;
  }[] = [];
  for (const gateway in gateways) {
    const gatewayUrl = formatGatewayUrl(gateways[gateway]);
    const observerUptime = await getObserverUptime(gateways[gateway]);
    stats.push({
      gatewayWallet: gateway,
      gatewayUrl,
      observerWallet: gateways[gateway].observerWallet,
      observerUptime,
    });
    console.log(
      `Gateway Wallet ${gateway} Gateway Url ${gatewayUrl} Observer Wallet ${gateways[gateway].observerWallet} Observer Uptime ${observerUptime}`
    );
  }

  const end = new Date().toISOString().slice(0, 10);

  csvWriter.writeRecords(stats);

  console.log(
    "Completed getting network stats.  Started %s to %s",
    start.toLocaleString(),
    end.toLocaleString()
  );
}

main();
