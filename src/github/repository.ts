import ISSUE_LIST_QUERY from "./queries/IssueList";
import PULL_REQUEST_LIST_QUERY from "./queries/PullRequestList";
import {
  ActionLogger,
  GitHubClient,
  IssueNode,
  PageInfoQuery,
  PullRequestNode,
  RateLimitsQuery,
} from "./types";

interface PullRequestList {
  repository: {
    pullRequests: {
      totalCount: number;
      nodes: PullRequestNode[];
      pageInfo: PageInfoQuery;
    };
  };
  rateLimit: RateLimitsQuery
}

interface IssueList {
  repository: {
    issues: {
      totalCount: number;
      nodes: IssueNode[];
      pageInfo: PageInfoQuery;
    };
  };
}

/** API class that uses the default token to access the data from the pull request and the repository */
export class RepositoryApi {
  constructor(
    private readonly api: GitHubClient,
    private readonly logger: ActionLogger,
    private readonly repo: { owner: string; repo: string },
  ) {
    logger.debug(`API has been set up for ${repo.owner}/${repo.repo}`);
  }

  async getPullRequests(): Promise<PullRequestNode[]> {
    const prs: PullRequestNode[] = [];
    let cursor: string | null = null;
    let hasNextPage: boolean = false;
    let currentPage: number = 0;

    this.logger.info(
      `Extracting all PR information from ${this.repo.owner}/${this.repo.repo}`,
    );
    do {
      const query: PullRequestList = await this.api.graphql<PullRequestList>(
        PULL_REQUEST_LIST_QUERY,
        {
          cursor,
          ...this.repo,
        },
      );
      const totalPages =
        Math.floor(query.repository.pullRequests.totalCount / 100) + 1;
      this.logger.info(`Querying page ${++currentPage}/${totalPages}`);
      const { nodes, pageInfo } = query.repository.pullRequests;
      prs.push(...nodes);
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;
    } while (hasNextPage);

    this.logger.info(`Found information for ${prs.length} pull requests`);

    return prs;
  }

  async getIssues(): Promise<IssueNode[]> {
    const issues: IssueNode[] = [];
    let cursor: string | null = null;
    let hasNextPage: boolean = false;
    let currentPage: number = 0;

    this.logger.info(
      `Extracting all issue information from ${this.repo.owner}/${this.repo.repo}`,
    );
    do {
      const query: IssueList = await this.api.graphql<IssueList>(
        ISSUE_LIST_QUERY,
        {
          cursor,
          ...this.repo,
        },
      );
      const totalPages =
        Math.floor(query.repository.issues.totalCount / 100) + 1;
      this.logger.info(`Querying page ${++currentPage}/${totalPages}`);
      const { nodes, pageInfo } = query.repository.issues;
      issues.push(...nodes);
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;
    } while (hasNextPage);

    this.logger.info(`Found information for ${issues.length} issues`);

    return issues;
  }
}
