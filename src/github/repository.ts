import {
  ActionLogger,
  GitHubClient,
  PullRequestList,
  PullRequestReviewList,
} from "./types";

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
    console.log(pullRequests);
    return pullRequests;
  }

  async getPullRequestInfo(
    number: number,
  ): Promise<PullRequestReviewList[number] | null> {
    this.logger.info(
      `Fetching data from ${this.repo.owner}/${this.repo.repo}#${number}`,
    );

    const reviews = await this.api.rest.pulls.listReviews({
      ...this.repo,
      pull_number: number,
      per_page: 1,
    });
    if (reviews.data.length > 0) {
      const [firstReview] = reviews.data;
      this.logger.debug(JSON.stringify(firstReview));
      return firstReview;
    } else {
      return null;
    }
  }
}
