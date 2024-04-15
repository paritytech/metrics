import type { GitHub } from "@actions/github/lib/utils";

export interface ActionLogger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string | Error): void;
  error(message: string | Error): void;
}

export type GitHubClient = InstanceType<typeof GitHub>;

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
  state: "OPEN" | "CLOSED" | "MERGED";
  mergedAt: string | null;
  additions: number;
  deletions: number;
  reviews: {
    totalCount: number;
    nodes: {
      submittedAt: string | null;
      state: "APPROVED" | "COMMENTED" | "CHANGES_REQUESTED";
      author: { login: string; avatarUrl: string };
    }[];
  };
}

export interface IssueNode {
  title: string;
  number: number;
  state: "OPEN" | "CLOSED";
  createdAt: string;
  closedAt: string | null;
  comments: {
    totalCount: number;
    nodes: {
      createdAt: string;
      author: { login: string };
    }[];
  };
}
