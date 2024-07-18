import {
  ActionLogger,
  Author,
  IssueNode,
  PullRequestNode,
} from "../github/types";
import { calculateEventsPerMonth, gatherValuesPerMonth } from "../util";
import { PullRequestAnalytics } from "./pullRequests";
import { MonthWithMatch } from "./types";

export interface UserMetrics {
  created: MonthWithMatch[];
  closed: MonthWithMatch[];
  reviewsPerMonth: MonthWithMatch[];
  commentsPerReview: MonthWithMatch[];
}

export class UserAnalytics {
  constructor(
    private readonly logger: ActionLogger,
    repo: { owner: string; repo: string },
    private readonly author: string
  ) {
    logger.debug(
      `Reporter has been configured for ${author}'s contribution in ${repo.owner}/${repo.repo}`
    );
  }

  private isAuthor(author: Author): boolean {
    return (
      author?.login?.toLocaleUpperCase() === this.author.toLocaleUpperCase()
    );
  }

  public generatePullRequestsMetrics(prList: PullRequestNode[]): UserMetrics {
    const authorship = this.generateMetricsForPullRequestsAuthorship(prList);
    const reviews = this.generateMetricsForPullRequestsReviews(prList);
    return { ...authorship, ...reviews };
  }

  private generateMetricsForPullRequestsAuthorship(prList: PullRequestNode[]): {
    created: MonthWithMatch[];
    closed: MonthWithMatch[];
  } {
    console.log("Filtering only PRS that belong to", this.author);
    const userPRs = prList.filter((pr) => this.isAuthor(pr.author));
    console.log(
      "Authors",
      userPRs.map((pr) => pr.author.login)
    );
    const prs = PullRequestAnalytics.getPullRequestAverages(userPRs);
    console.log(prs.map((pr) => pr));

    const creation = calculateEventsPerMonth(prs.map((pr) => pr.creation));
    console.log("creation", creation);

    const closeDates = prs
      .filter((pr) => pr.close)
      .map(({ close }) => close?.date as string);
    const closedPrPerMonth = calculateEventsPerMonth(closeDates);
    console.log("close dates", closedPrPerMonth);

    return {
      created: creation,
      closed: closedPrPerMonth,
    };
  }

  private generateMetricsForPullRequestsReviews(prList: PullRequestNode[]): {
    reviewsPerMonth: MonthWithMatch[];
    commentsPerReview: MonthWithMatch[];
  } {
    console.log("Filtering only PRS that belong to", this.author);
    // Get the PRs that were NOT created by the user
    const nonUserPRs = prList.filter((pr) => !this.isAuthor(pr.author));

    const userReviews = nonUserPRs
      .flatMap((pr) => pr.reviews.nodes)
      .filter((review) => this.isAuthor(review.author));
    const reviewsPerMonth = calculateEventsPerMonth(
      userReviews.map((r) => r.submittedAt as string).filter((date) => !!date)
    );
    console.log("reviewsPerMonth", reviewsPerMonth);
    const commentsPerPr = nonUserPRs
      .map((pr) => ({
        date: pr.createdAt,
        comments: pr.reviews.nodes.reduce(
          (value, review) =>
            value +
            // We get the amount of comments in each review
            (this.isAuthor(review.author) ? review.comments.totalCount : 0),
          0
        ),
      }))
      // We only want prs where they participated
      .filter((r) => r.comments > 0);
    //
    const commentsPerPRPerMonth = gatherValuesPerMonth(
      commentsPerPr,
      (val) => val.comments
    );
    console.log("commentsPerPRPerMonth", commentsPerPRPerMonth);

    return {
      reviewsPerMonth,
      commentsPerReview: commentsPerPRPerMonth.map(
        ({ month, average }) => [month, average] as MonthWithMatch
      ),
    };
  }
}
