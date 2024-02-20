import "dotenv/config";
import { getOctokit } from "@actions/github";
import chalk from "chalk";
import { envsafe, str } from "envsafe";
import { writeFile } from "fs/promises";
import { Converter } from "showdown";

import { getMetrics } from "./analytics";
import { ActionLogger } from "./github/types";
import TEMPLATE from "./template";

const env = envsafe({
  OWNER: str({
    desc: "Owner of the repository",
    example: "bullrich",
  }),
  REPO: str({
    desc: "Name of the repository",
    example: "metrics",
  }),
  GITHUB_TOKEN: str({
    example: "Personal Access Token",
  }),
});

const chalkLogger: ActionLogger = {
  debug: (msg) => console.debug(chalk.gray(msg)),
  info: (msg) => console.log(chalk.green(msg)),
  warn: console.warn,
  error: console.error,
};

const action = async () => {
  const report = await getMetrics(getOctokit(env.GITHUB_TOKEN), chalkLogger, {
    owner: env.OWNER,
    repo: env.REPO,
  });
  const markdownContent = report.summary.stringify();
  await writeFile("./report.md", markdownContent);
  const converter = new Converter({ ghCodeBlocks: true });
  const htmlText = converter.makeHtml(markdownContent);
  console.log("Converting text to HTML");
  await writeFile(
    "./index.html",
    TEMPLATE.replace("%NAME%", `${env.OWNER}/${env.REPO}`).replace(
      "%CONTENT%",
      htmlText,
    ),
  );
};

action()
  .then(() => console.log("Finished"))
  .catch(console.error);
