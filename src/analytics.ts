import { summary } from "@actions/core";

import { RepositoryApi } from "./github/repository";
import {
  ActionLogger,
  GitHubClient,
  IssueNode,
  PullRequestNode,
  Repo,
} from "./github/types";
import { IssueAnalytics } from "./report/issues";
import { PullRequestAnalytics } from "./report/pullRequests";
import { IssuesMetrics, PullRequestMetrics } from "./report/types";
import { UserAnalytics } from "./report/user";
import { generateSummary, generateUserSummary } from "./reporter";

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

export const calculateUserMetrics = (
  logger: ActionLogger,
  repos: Repo[],
  prs: PullRequestNode[],
  issues: IssueNode[],
  author: string,
): Pick<MetricsReport, "summary"> => {
  const userReport = new UserAnalytics(logger, author);
  const userMetrics = userReport.generateMetrics(prs, issues);
  const userSummary = generateUserSummary(author, repos, userMetrics);
  return { summary: userSummary };
};

export const calculateRepoMetrics = (
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

export const getRepoMetrics = async (
  api: GitHubClient,
  logger: ActionLogger,
  repo: { owner: string; repo: string },
): Promise<MetricsReport> => {
  const { prs, issues } = await getData(api, logger, repo);
  return calculateRepoMetrics(logger, repo, prs, issues);
};

export const getUserMetrics = async (
  api: GitHubClient,
  logger: ActionLogger,
  repos: Repo[],
  author: string,
): Promise<Pick<MetricsReport, "summary">> => {
  const prs: PullRequestNode[] = [];
  const issues: IssueNode[] = [];
  for (const { owner, repo } of repos) {
    const data = await getData(api, logger, { owner, repo });
    prs.push(...data.prs);
    issues.push(...data.issues);
  }
  return calculateUserMetrics(logger, repos, prs, issues, author);
};
