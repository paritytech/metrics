import type { GitHub } from "@actions/github/lib/utils";
import { Endpoints } from "@octokit/types";

export interface ActionLogger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string | Error): void;
  error(message: string | Error): void;
}

export type GitHubClient = InstanceType<typeof GitHub>;

export type PullRequestList =
  Endpoints["GET /repos/{owner}/{repo}/pulls"]["response"]["data"];
export type PullRequestReviewList =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews"]["response"]["data"];
