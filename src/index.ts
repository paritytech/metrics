import { getInput, setFailed, setOutput } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { Context } from "@actions/github/lib/context";
import { writeFile } from "fs/promises";
import { Converter } from "showdown";

import { getMetrics } from "./analytics";
import { generateSite } from "./render";
import { generateCoreLogger } from "./util";

const getRepo = (ctx: Context) => {
  let repo = getInput("repo", { required: false });
  if (!repo) {
    repo = ctx.repo.repo;
  }

  let owner = getInput("owner", { required: false });
  if (!owner) {
    owner = ctx.repo.owner;
  }

  return { repo, owner };
};

const repo = getRepo(context);

setOutput("repo", `${repo.owner}/${repo.repo}`);

const token = getInput("GITHUB_TOKEN", { required: true });
const logger = generateCoreLogger();
getMetrics(getOctokit(token), logger, repo)
  .then(async (result) => {
    await writeFile("./report.md", result.summary.stringify());

    // We set the report for both outputs
    if (result.prMetrics) {
      setOutput("pr-report", JSON.stringify(result.prMetrics));
    } else {
      logger.warn("No 'pr-report' generated as output");
    }
    if (result.issueMetrics) {
      setOutput("issue-report", JSON.stringify(result.issueMetrics));
    } else {
      logger.warn("No 'issue-report' generated as output");
    }

    // We write the HTML file
    const converter = new Converter({ ghCodeBlocks: true });
    const htmlText = converter.makeHtml(result.summary.stringify());
    console.log("Converting text to HTML");
    await writeFile(
      "./index.html",
      generateSite(`${repo.owner}/${repo.repo}`, htmlText),
    );

    // We finally write the job output
    await result.summary.write();
  })
  .catch(setFailed);
