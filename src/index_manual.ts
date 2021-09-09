import { getAvgPerByteFee, getMempoolSize } from "./arweave";

export async function main () {
    let pendingTxs = await getMempoolSize()
    let avgPrice = await getAvgPerByteFee(pendingTxs)
    console.log (avgPrice)
};


main();