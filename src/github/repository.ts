import {
  ActionLogger,
  GitHubClient,
  PullRequestGet,
  PullRequestList,
  PullRequestListGQL,
  PullRequestNode,
  PullRequestReviewList,
} from "./types";

export const PULL_REQUEST_LIST_QUERY = `
  query PullRequests($cursor: String, $owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      pullRequests(
        first: 100
        orderBy: {field: UPDATED_AT, direction: ASC}
        after: $cursor
      ) {
        nodes {
          ... on PullRequest {
            title
            number
            state
            createdAt
            mergedAt
            additions
            deletions
            reviews(first: 100) {
              totalCount
              nodes {
                ... on PullRequestReview {
                  submittedAt
                  state
                  author {
                    login
                  }
                }
              }
            }
          }
        }
        pageInfo {
          endCursor
          startCursor
          hasNextPage
          hasPreviousPage
        }
      }
    }
  }`;

/** API class that uses the default token to access the data from the pull request and the repository */
export class RepositoryApi {
  constructor(
    private readonly api: GitHubClient,
    private readonly logger: ActionLogger,
    private readonly repo: { owner: string; repo: string },
  ) {
    logger.debug(`Setup api for ${repo.owner}/${repo.repo}`);
  }

  async getPullRequests(): Promise<PullRequestList> {
    this.logger.info("Fetching pull requests");
    const pullRequests = await this.api.paginate(this.api.rest.pulls.list, {
      ...this.repo,
      state: "all",
    });
    this.logger.debug(JSON.stringify(pullRequests));
    return pullRequests;
  }

  async getPullRequestsGql(): Promise<PullRequestNode[]> {
    const prs: PullRequestNode[] = [];
    let cursor: string | null = null;
    let hasNextPage: boolean = false;
    let currentPage: number = 0;

    do {
      this.logger.debug(`Querying page ${currentPage++}`);
      const query: PullRequestListGQL =
        await this.api.graphql<PullRequestListGQL>(PULL_REQUEST_LIST_QUERY, {
          cursor,
          ...this.repo,
        });
      const { nodes, pageInfo } = query.repository.pullRequests;
      prs.push(...nodes);
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;
    } while (hasNextPage);

    this.logger.info(`Found information for ${prs.length} pull requests`);

    return prs;
  }

  async getPullRequestInfo(
    number: number,
  ): Promise<PullRequestGet & { firstReview?: PullRequestReviewList[number] }> {
    this.logger.info(
      `Fetching data from ${this.repo.owner}/${this.repo.repo}#${number}`,
    );

    const pr = await this.api.rest.pulls.get({
      ...this.repo,
      pull_number: number,
    });

    const reviews = await this.api.rest.pulls.listReviews({
      ...this.repo,
      pull_number: number,
      per_page: 1,
    });
    if (reviews.data.length > 0) {
      const [firstReview] = reviews.data;
      this.logger.debug(JSON.stringify(firstReview));
      return { ...pr.data, firstReview };
    } else {
      return pr.data;
    }
  }
}
