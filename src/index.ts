import { getInput, setFailed, setOutput } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { Context } from "@actions/github/lib/context";
import { writeFile } from "fs/promises";

import { getMetrics } from "./analytics";
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
getMetrics(getOctokit(token), generateCoreLogger(), repo)
  .then(async (result) => {
    // We write the job output
    await result.summary.write();
    await writeFile("./report.md", result.summary.stringify());

    // We set the report for both outputs
    setOutput("pr-report", JSON.stringify(result.prMetrics));
    setOutput("issue-report", JSON.stringify(result.issueMetrics));
  })
  .catch(setFailed);
