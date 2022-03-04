import { getTransactionStatus } from "./arweave";
import { asyncForEach } from "./common";

const fs = require("fs");

interface status {
  time_init: number;
  balance: number;
  distributions: {
    run: number;
    startTime: Date;
    time: number;
    expend: number;
    totalRecipients: number;
    totalUploaded: string;
    transactions: AstatineTxOutput[];
  }[];
}

interface AstatineTxOutput {
  id: string;
  target: string;
  qty: number;
  dataUploaded: number;
}

export async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const name = "ArDrive_Dust_Transaction_Report_" + today + ".csv";
  let status: status = JSON.parse(
    fs.readFileSync("Dust 11-17-2021 Final status.json").toString()
  );
  let totalFailed: number = 0;
  let failedTransactions: AstatineTxOutput[] = [];
  const createCsvWriter = require("csv-writer").createObjectCsvWriter;

  const csvWriter = createCsvWriter({
    path: name,
    header: [
      { id: "id", title: "ID" },
      { id: "target", title: "TARGET" },
      { id: "qty", title: "QTY" },
      { id: "dataUploaded", title: "DATA UPLOADED" },
    ],
  });

  await asyncForEach(
    status.distributions,
    async (distribution: {
      run: number;
      startTime: Date;
      time: number;
      expend: number;
      totalRecipients: number;
      totalUploaded: string;
      transactions: AstatineTxOutput[];
    }) => {
      console.log("Start time for this run %s", distribution.startTime);
      await asyncForEach(
        distribution.transactions,
        async (transaction: AstatineTxOutput) => {
          const status = await getTransactionStatus(transaction.id);
          if (status === 404) {
            console.log("TX NOT FOUND");
            failedTransactions.push(transaction);
            console.log(transaction);
          } else {
            console.log("TX FOUND");
          }
          console.log("");
        }
      );
    }
  );

  failedTransactions.forEach((failedTransaction: AstatineTxOutput) => {
    totalFailed += failedTransaction.qty;
  });

  console.log("Failed transaction count: %s", failedTransactions.length);
  console.log("Total ARDRIVE not sent: %s", totalFailed);
  csvWriter.writeRecords(failedTransactions).then(() => {
    console.log("...Done writing all ArDrive Community Fees transactions");
  });
}

main();
