import {
  IssuesQuery,
  IssuesQueryVariables,
  PullRequestsQuery,
  PullRequestsQueryVariables,
} from "./queries";
import ISSUE_LIST_QUERY from "./queries/IssueList";
import PULL_REQUEST_LIST_QUERY from "./queries/PullRequestList";
import {
  ActionLogger,
  GitHubClient,
  IssueNode,
  PullRequestNode,
} from "./types";

const WAIT_TIME = 60_000;
const PAGE_BREAK = 5;

/** API class that uses the default token to access the data from the pull request and the repository */
export class RepositoryApi {
  constructor(
    private readonly api: GitHubClient,
    private readonly logger: ActionLogger,
    private readonly repo: { owner: string; repo: string },
  ) {
    logger.debug(`API has been set up for ${repo.owner}/${repo.repo}`);
  }

  async gql<Query, Params extends { cursor?: string | null }, Node>(
    graphqlQuery: string,
    params: Params,
    extractParams: (query: Query) => {
      totalCount: number;
      nodes?: (Node | null)[] | null;
      pageInfo: { hasNextPage: boolean; endCursor?: string | null };
    },
  ): Promise<Node[]> {
    const queryNodes: Node[] = [];
    let cursor: string | null = null;
    let hasNextPage: boolean = false;
    let currentPage: number = 0;
    do {
      const query = await this.api.graphql<Query>(graphqlQuery, {
        ...params,
        cursor,
      });

      const { totalCount, nodes, pageInfo } = extractParams(query);

      const totalPages = Math.floor(totalCount / 50) + 1;
      this.logger.info(`Querying page ${++currentPage}/${totalPages}`);
      if (nodes) {
        for (const node of nodes) {
          if (node !== null) {
            queryNodes.push(node);
          }
        }
      }
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor ?? null;
      if (hasNextPage && currentPage % PAGE_BREAK === 0) {
        this.logger.debug(
          `Pausing for ${WAIT_TIME / 1000} seconds to not hit secondary limits`,
        );
        await new Promise<void>((resolve) =>
          setTimeout(() => resolve(), WAIT_TIME),
        );
      }
    } while (hasNextPage);

    return queryNodes;
  }

  async getPullRequests(): Promise<PullRequestNode[]> {
    this.logger.info(
      `Extracting all PR information from ${this.repo.owner}/${this.repo.repo}`,
    );
    const prs = await this.gql<
      PullRequestsQuery,
      PullRequestsQueryVariables,
      PullRequestNode
    >(PULL_REQUEST_LIST_QUERY, this.repo, (query) => {
      if (!query.repository?.pullRequests) {
        throw new Error("query.repository.pullRequests is empty!");
      }
      return query.repository.pullRequests;
    });

    this.logger.info(`Found information for ${prs.length} issues`);

    return prs;
  }

  async getIssues(): Promise<IssueNode[]> {
    this.logger.info(
      `Extracting all issue information from ${this.repo.owner}/${this.repo.repo}`,
    );

    const issues = await this.gql<IssuesQuery, IssuesQueryVariables, IssueNode>(
      ISSUE_LIST_QUERY,
      this.repo,
      (query) => {
        console.log(query.repository);
        if (!query.repository?.issues) {
          throw new Error("query.repository.issues is empty!");
        }
        return query.repository.issues;
      },
    );

    this.logger.info(`Found information for ${issues.length} issues`);

    return issues;
  }
}
