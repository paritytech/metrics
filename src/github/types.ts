import type { GitHub } from "@actions/github/lib/utils";

import { IssuesQuery, PullRequestsQuery } from "./queries";

export interface ActionLogger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string | Error): void;
  error(message: string | Error): void;
}

export type Repo = {owner:string; repo:string};

export type GitHubClient = InstanceType<typeof GitHub>;

export type Author = { login: string };

// NonNullable is abused to not have to use a million of '?' signs
export type PullRequestNode = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<PullRequestsQuery["repository"]>["pullRequests"]
    >["nodes"]
  >[number]
>;
// Have you ever seen a more beautiful type declaration?
export type IssueNode = NonNullable<
  NonNullable<
    NonNullable<NonNullable<IssuesQuery["repository"]>["issues"]>["nodes"]
  >[number]
>;
