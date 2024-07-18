import "dotenv/config";
import { getOctokit } from "@actions/github";
import chalk from "chalk";
import { exec } from "child_process";
import { envsafe, str } from "envsafe";
import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { Converter } from "showdown";

import { calculateMetrics, getData } from "./analytics";
import { ActionLogger, IssueNode, PullRequestNode } from "./github/types";
import { generateSite } from "./render";

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
  AUTHOR: str({
    example: "bullrich",
    default: undefined,
  }),
});

const chalkLogger: ActionLogger = {
  debug: (msg) => console.debug(chalk.gray(msg)),
  info: (msg) => console.log(chalk.green(msg)),
  warn: console.warn,
  error: console.error,
};

const repo = {
  owner: env.OWNER,
  repo: env.REPO,
};

const author: string | undefined = env.AUTHOR;

const fetchInformation = async (): Promise<{
  prs: PullRequestNode[];
  issues: IssueNode[];
}> => {
  const cacheDirName = `.cache/${repo.owner}-${repo.repo}`;
  if (existsSync(cacheDirName)) {
    chalkLogger.info(`Fetching data from cache in ${cacheDirName}`);
    const prFile = await readFile(`${cacheDirName}/prs.json`, "utf-8");
    const issueFile = await readFile(`${cacheDirName}/issues.json`, "utf-8");
    return {
      prs: JSON.parse(prFile) as PullRequestNode[],
      issues: JSON.parse(issueFile) as IssueNode[],
    };
  }
  const { prs, issues } = await getData(
    getOctokit(env.GITHUB_TOKEN),
    chalkLogger,
    repo,
  );

  chalkLogger.info(`Writing data to cache in ${cacheDirName}`);
  await mkdir(cacheDirName, { recursive: true });
  await writeFile(`${cacheDirName}/prs.json`, JSON.stringify(prs, null, 2));
  await writeFile(
    `${cacheDirName}/issues.json`,
    JSON.stringify(issues, null, 2),
  );
  return { prs, issues };
};

function getCommandLine(): string {
  // "win64" is not inside the enum, so we must circumvent it somehow
  if (process.platform.startsWith("win")) {
    return "start";
  }

  switch (process.platform) {
    case "darwin":
      return "open";
    case "win32":
      return "start";
    default:
      return "xdg-open";
  }
}

const action = async () => {
  const { prs, issues } = await fetchInformation();
  const report = calculateMetrics(chalkLogger, repo, prs, issues, author);

  const markdownContent = report.summary.stringify();
  await writeFile("./report.md", markdownContent);
  const converter = new Converter({ ghCodeBlocks: true });
  const htmlText = converter.makeHtml(markdownContent);
  console.log("Converting text to HTML");
  await writeFile(
    "./index.html",
    generateSite(`${env.OWNER}/${env.REPO}`, htmlText),
  );
  exec(`${getCommandLine()} ./index.html`);
};

action()
  .then(() => console.log("Finished"))
  .catch(console.error);
