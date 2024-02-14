import PULL_REQUEST_LIST_QUERY from "./queries/PullRequestList";
import {
  ActionLogger,
  GitHubClient,
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
      const totalPages = Math.floor(
        query.repository.pullRequests.totalCount / 100,
      );
      this.logger.info(`Querying page ${currentPage++}/${totalPages}`);
      const { nodes, pageInfo } = query.repository.pullRequests;
      prs.push(...nodes);
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;
    } while (hasNextPage);

    this.logger.info(`Found information for ${prs.length} pull requests`);

    return prs;
  }
}
