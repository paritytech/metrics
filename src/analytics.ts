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
import { UserAnalytics } from "./report/user";
import { generateSummary, generateUserSummary } from "./reporter";

type MetricsReport = {
  prMetrics?: PullRequestMetrics;
  issueMetrics?: IssuesMetrics;
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
  author?: string,
): MetricsReport => {
  if (author) {
    const userReport = new UserAnalytics(logger, repo, author);
    const userMetrics = userReport.generateMetrics(prs, issues);
    const userSummary = generateUserSummary(author, repo, userMetrics);
    return { summary: userSummary };
  }
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
  author?: string,
): Promise<MetricsReport> => {
  const { prs, issues } = await getData(api, logger, repo);
  return calculateMetrics(logger, repo, prs, issues, author);
};
