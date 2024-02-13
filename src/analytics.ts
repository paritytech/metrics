import { summary } from "@actions/core";

import { RepositoryApi } from "./github/repository";
import { ActionLogger, GitHubClient } from "./github/types";
import { PullRequestAnalytics } from "./report/pullRequests";
import { generateSummary } from "./reporter";

export const getMetrics = async (
  api: GitHubClient,
  logger: ActionLogger,
  repo: { owner: string; repo: string },
): Promise<typeof summary> => {
  const repoApi = new RepositoryApi(api, logger, repo);
  const prReporter = new PullRequestAnalytics(repoApi, logger, repo);

  const prReport = await prReporter.fetchMetricsForPullRequests();

  return generateSummary(repo, prReport);
};
