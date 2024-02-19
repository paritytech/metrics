import { summary } from "@actions/core";

import { RepositoryApi } from "./github/repository";
import { ActionLogger, GitHubClient } from "./github/types";
import { IssueAnalytics } from "./report/issues";
import { PullRequestAnalytics } from "./report/pullRequests";
import { IssuesMetrics, PullRequestMetrics } from "./report/types";
import { generateSummary } from "./reporter";

type MetricsReport = {
  prMetrics: PullRequestMetrics;
  issueMetrics: IssuesMetrics;
  summary: typeof summary;
};

export const getMetrics = async (
  api: GitHubClient,
  logger: ActionLogger,
  repo: { owner: string; repo: string },
): Promise<MetricsReport> => {
  const repoApi = new RepositoryApi(api, logger, repo);
  const prReporter = new PullRequestAnalytics(repoApi, logger, repo);
  const prReport = await prReporter.fetchMetricsForPullRequests();

  const issuesReport = new IssueAnalytics(repoApi, logger);
  const issueReport = await issuesReport.getAnalytics();

  const sum = generateSummary(repo, prReport, issueReport);
  return { prMetrics: prReport, issueMetrics: issueReport, summary: sum };
};
