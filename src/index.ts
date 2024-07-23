import { getInput, setFailed, setOutput, summary } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { Context } from "@actions/github/lib/context";
import { writeFile } from "fs/promises";
import { Converter } from "showdown";

import { getRepoMetrics, getUserMetrics } from "./analytics";
import { Repo } from "./github/types";
import { generateSite } from "./render";
import { generateCoreLogger } from "./util";

const getRepo = (ctx: Context): Repo[] => {
  const repo = getInput("repo", { required: false });
  if (!repo) {
    return [{ owner: ctx.repo.owner, repo: ctx.repo.repo }];
  }

  const repos = repo.split(",");
  return repos.map((owner_repo) => {
    const [owner, repo] = owner_repo.split("/");
    return { owner, repo };
  });
};

const repo = getRepo(context);

const author = getInput("author", { required: false });

setOutput("repo", `${repo[0].owner}/${repo[0].repo}`);

const writeOutputFile = async (result: typeof summary, title: string) => {
  await writeFile("./report.md", summary.stringify());
  // We write the HTML file
  const converter = new Converter({ ghCodeBlocks: true });
  const htmlText = converter.makeHtml(result.stringify());
  console.log("Converting text to HTML");
  await writeFile("./index.html", generateSite(title, htmlText));

  // We finally write the job output
  await result.write();
};

const token = getInput("GITHUB_TOKEN", { required: true });
const logger = generateCoreLogger();
if (author) {
  getUserMetrics(getOctokit(token), logger, repo, author)
    .then(async ({ summary }) => {
      await writeOutputFile(summary, `Report for ${author}`);
    })
    .catch(setFailed);
} else {
  getRepoMetrics(getOctokit(token), logger, repo[0])
    .then(async (result) => {
      setOutput("pr-report", JSON.stringify(result.prMetrics));
      setOutput("issue-report", JSON.stringify(result.issueMetrics));
      await writeOutputFile(result.summary, `${repo[0].owner}/${repo[0].repo}`);
    })
    .catch(setFailed);
}
