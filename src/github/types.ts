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
export type PullRequestGet =
  Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];
export type IssueCommentList =
  Endpoints["GET /repos/{owner}/{repo}/issues/comments"]["response"]["data"];

 export interface PageInfoQuery {
    endCursor: string | null;
    startCursor: string | null;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }
  
 export interface PullRequestNode {
    title: string;
    number: number;
    createdAt: string;
    mergedAt: string | null;
    additions: number;
    reviews: {
      totalCount: number;
      nodes: {
        submittedAt: string;
        state: "APPROVED" | "COMMENTED" | "CHANGES_REQUESTED";
        author: { login: string };
      }[];
    };
  }
  
  export interface PullRequestListGQL {
    repository: {
      pullRequests: {
        nodes: PullRequestNode[];
        pageInfo: PageInfoQuery;
      };
    };
  }
