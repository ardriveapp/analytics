import col from "ansi-colors";
import * as Gql from "ar-gql";
import axios from "axios";
import { appendFile } from "fs/promises";
import { EOL } from "os";

const main = async () => {
  try {
    console.log(col.green("main begins"));

    const query = `query($cursor: String, $minBlock: Int, $maxBlock: Int) {
			blocks(
				height: {
					min: $minBlock,
					max: $maxBlock,
				}
				sort: HEIGHT_ASC
				first: 100
				after: $cursor
			){
				pageInfo{ hasNextPage }
				edges {
					cursor
					node {
						height
						timestamp
					}
				}
			}
		}`;
    interface GQLBlock {
      cursor: string;
      node: {
        height: number;
        timestamp: number;
      };
    }
    interface GQLBlocks {
      data: {
        blocks: {
          pageInfo: { hasNextPage: boolean };
          edges: GQLBlock[];
        };
      };
    }

    const variables = {
      minBlock: 0,
      maxBlock: Number(
        (await axios.get("https://arweave.net/info")).data.height
      ),
    };

    let hasNextPage = true;
    let cursor = "";

    while (hasNextPage) {
      const res: unknown = await Gql.run(query, {
        ...variables,
        cursor,
      });
      const {
        data: {
          blocks: { pageInfo, edges },
        },
      } = res as GQLBlocks;

      if (edges && edges.length) {
        for (const block of edges) {
          const line = block.node.height + "," + block.node.timestamp + EOL;
          await appendFile("block-timestamps.log", line);
        }
        cursor = edges[edges.length - 1].cursor;
      }
      hasNextPage = pageInfo.hasNextPage;
    }

    console.log(col.green("main ends"));
  } catch (e) {
    console.log(e);
  }
};
main();
