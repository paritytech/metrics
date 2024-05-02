import { summary } from "@actions/core";

import { RepositoryApi } from "./github/repository";
import {
  ActionLogger,
  GitHubClient,
  IssueNode,
  PullRequestNode,
} from "./github/types";
import { IssueAnalytics } from "./report/issues";
import { PullRequestAnalytics } from "./report/pullRequests";
import { IssuesMetrics, PullRequestMetrics } from "./report/types";
import { generateSummary } from "./reporter";

type MetricsReport = {
  prMetrics: PullRequestMetrics;
  issueMetrics: IssuesMetrics;
  summary: typeof summary;
};

export const getData = async (
  api: GitHubClient,
  logger: ActionLogger,
  repo: { owner: string; repo: string },
): Promise<{ prs: PullRequestNode[]; issues: IssueNode[] }> => {
  const repoApi = new RepositoryApi(api, logger, repo);
  const prs = await repoApi.getPullRequests();
  const issues = await repoApi.getIssues();
  return { prs, issues };
};

export const calculateMetrics = (
  logger: ActionLogger,
  repo: { owner: string; repo: string },
  prs: PullRequestNode[],
  issues: IssueNode[],
): MetricsReport => {
  const prReporter = new PullRequestAnalytics(logger, repo);
  const prReport = prReporter.fetchMetricsForPullRequests(prs);

  const issuesReport = new IssueAnalytics(logger);
  const issueReport = issuesReport.getAnalytics(issues);

  const sum = generateSummary(repo, prReport, issueReport);

  return { prMetrics: prReport, issueMetrics: issueReport, summary: sum };
};

export const getMetrics = async (
  api: GitHubClient,
  logger: ActionLogger,
  repo: { owner: string; repo: string },
): Promise<MetricsReport> => {
  const { prs, issues } = await getData(api, logger, repo);
  return calculateMetrics(logger, repo, prs, issues);
};
