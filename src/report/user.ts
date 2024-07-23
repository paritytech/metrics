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
  participatedIssuesPerMonth: MonthWithMatch[];
  nonOrgParticipatedIssuesPerMonth: MonthWithMatch[];
}

export class UserAnalytics {
  constructor(
    private readonly logger: ActionLogger,
    private readonly author: string,
  ) {
    logger.debug(
      `Reporter has been configured for ${author}'s contribution`,
    );
  }

  private isAuthor(author?: Author | null): boolean {
    return (
      author?.login?.toLocaleUpperCase() === this.author.toLocaleUpperCase()
    );
  }

  public generateMetrics(
    prList: PullRequestNode[],
    issues: IssueNode[],
  ): UserMetrics {
    const authorship = this.generateMetricsForPullRequestsAuthorship(prList);
    const reviews = this.generateMetricsForPullRequestsReviews(prList);
    const issueMetrics = this.generateIssuesMetrics(issues);
    return { ...authorship, ...reviews, ...issueMetrics };
  }

  private generateMetricsForPullRequestsAuthorship(
    prList: PullRequestNode[],
  ): Pick<UserMetrics, "created" | "closed"> {
    this.logger.debug(`Filtering PRs that belong to ${this.author}`);
    const userPRs = prList.filter((pr) => this.isAuthor(pr.author));
    this.logger.debug(
      `Found ${userPRs.length} PRs belonging to '${this.author}'`,
    );
    const prs = PullRequestAnalytics.getPullRequestAverages(userPRs);

    const creation = calculateEventsPerMonth(prs.map((pr) => pr.creation));

    const closeDates = prs
      .filter((pr) => pr.close)
      .map(({ close }) => close?.date as string);
    const closedPrPerMonth = calculateEventsPerMonth(closeDates);
    this.logger.debug(
      `Found ${closeDates.length} PRs merged by '${this.author}'`,
    );

    return {
      created: creation,
      closed: closedPrPerMonth,
    };
  }

  private generateMetricsForPullRequestsReviews(
    prList: PullRequestNode[],
  ): Pick<UserMetrics, "reviewsPerMonth" | "commentsPerReview"> {
    this.logger.debug(`Filtering PRs that does not belong to '${this.author}'`);
    // Get the PRs that were NOT created by the user
    const nonUserPRs = prList.filter((pr) => !this.isAuthor(pr.author));

    const userReviews = nonUserPRs
      .flatMap((pr) => pr.reviews?.nodes)
      .filter((review) => this.isAuthor(review?.author));

    this.logger.debug(
      `Found ${userReviews.length} reviews made by '${this.author}'`,
    );
    const reviewsPerMonth = calculateEventsPerMonth(
      userReviews.map((r) => r?.submittedAt as string).filter((date) => !!date),
    );
    const commentsPerPr = nonUserPRs
      .map((pr) => {
        return {
          date: pr.createdAt as string,
          comments: pr.reviews?.nodes?.reduce(
            (value, review) =>
              value +
              // We get the amount of comments in each review
              (this.isAuthor(review?.author)
                ? (review?.comments.totalCount ?? 0)
                : 0),
            0,
          ),
        };
      })
      // We only want prs where they participated
      .filter(({ comments }) => comments && comments > 0);
    //
    const commentsPerPRPerMonth = gatherValuesPerMonth(
      commentsPerPr,
      (val) => val.comments as number,
    );

    return {
      reviewsPerMonth,
      commentsPerReview: commentsPerPRPerMonth.map(
        ({ month, average }) => [month, average] as MonthWithMatch,
      ),
    };
  }

  private generateIssuesMetrics(
    issues: IssueNode[],
  ): Pick<
    UserMetrics,
    "participatedIssuesPerMonth" | "nonOrgParticipatedIssuesPerMonth"
  > {
    // Issues where the author has commented
    const participatedIssues = issues.filter((i) =>
      i.comments.nodes?.some((issue) => this.isAuthor(issue?.author)),
    );

    const participatedIssuesPerMonth = calculateEventsPerMonth(
      participatedIssues.map(({ createdAt }) => createdAt as string),
    );
    this.logger.debug(
      `'${this.author}' has participated in ${participatedIssues.length} issues`,
    );

    // Issues that do not belong to org members
    const nonOrgIssues = participatedIssues
      // Issues opened by external contributors
      .filter((i) => i.authorAssociation === "NONE");

    const nonOrgParticipatedIssuesPerMonth = calculateEventsPerMonth(
      nonOrgIssues.map(({ createdAt }) => createdAt as string),
    );

    return { participatedIssuesPerMonth, nonOrgParticipatedIssuesPerMonth };
  }
}
