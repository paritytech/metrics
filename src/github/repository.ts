import ISSUE_LIST_QUERY from "./queries/IssueList";
import PULL_REQUEST_LIST_QUERY from "./queries/PullRequestList";
import {
  ActionLogger,
  GitHubClient,
  IssueNode,
  PageInfoQuery,
  PullRequestNode,
} from "./types";

interface PullRequestList {
  repository: {
    pullRequests: {
      totalCount: number;
      nodes: PullRequestNode[];
      pageInfo: PageInfoQuery;
    };
  };
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

const WAIT_TIME = 60_000;
const PAGE_BREAK = 5;

/** API class that uses the default token to access the data from the pull request and the repository */
export class RepositoryApi {
  constructor(
    private readonly api: GitHubClient,
    private readonly logger: ActionLogger,
    private readonly repo: { owner: string; repo: string }
  ) {
    logger.debug(`API has been set up for ${repo.owner}/${repo.repo}`);
  }

  async getPullRequests(): Promise<PullRequestNode[]> {
    const prs: PullRequestNode[] = [];
    let cursor: string | null = null;
    let hasNextPage: boolean = false;
    let currentPage: number = 0;

    this.logger.info(
      `Extracting all PR information from ${this.repo.owner}/${this.repo.repo}`
    );
    do {
      const query: PullRequestList = await this.api.graphql<PullRequestList>(
        PULL_REQUEST_LIST_QUERY,
        {
          cursor,
          ...this.repo,
        }
      );

      const totalPages =
        Math.floor(query.repository.pullRequests.totalCount / 50) + 1;
      this.logger.info(`Querying page ${++currentPage}/${totalPages}`);
      const { nodes, pageInfo } = query.repository.pullRequests;
      prs.push(...nodes);
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;
      if (hasNextPage && currentPage % PAGE_BREAK === 0) {
        this.logger.debug(
          `Pausing for ${WAIT_TIME / 1000} seconds to not hit secondary limits`
        );
        await new Promise<void>((resolve) =>
          setTimeout(() => resolve(), WAIT_TIME)
        );
      }
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
      `Extracting all issue information from ${this.repo.owner}/${this.repo.repo}`
    );
    do {
      const query: IssueList = await this.api.graphql<IssueList>(
        ISSUE_LIST_QUERY,
        {
          cursor,
          ...this.repo,
        }
      );
      const totalPages =
        Math.floor(query.repository.issues.totalCount / 50) + 1;
      this.logger.info(`Querying page ${++currentPage}/${totalPages}`);
      const { nodes, pageInfo } = query.repository.issues;
      issues.push(...nodes);
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;

      if (hasNextPage && currentPage % PAGE_BREAK === 0) {
        this.logger.debug(
          `Pausing for ${WAIT_TIME / 1000} seconds to not hit secondary limits`
        );
        await new Promise<void>((resolve) =>
          setTimeout(() => resolve(), WAIT_TIME)
        );
      }
    } while (hasNextPage);

    this.logger.info(`Found information for ${issues.length} issues`);

    return issues;
  }
}
