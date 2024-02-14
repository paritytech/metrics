import { getInput, setFailed, setOutput } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { Context } from "@actions/github/lib/context";

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
  .then(async (result) => await result.write())
  .catch(setFailed);
