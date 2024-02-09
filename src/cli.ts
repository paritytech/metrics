import "dotenv/config";
import { getOctokit } from "@actions/github";
import chalk from "chalk";
import { envsafe, str } from "envsafe";

import { RepositoryApi } from "./github/repository";
import { ActionLogger } from "./github/types";
import { getMetrics } from "./analytics";
import {writeFile} from "fs/promises"

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
  await writeFile("./report.md", report);
};

action()
  .then(() => console.log("Finished"))
  .catch(console.error);
