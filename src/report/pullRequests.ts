import moment from "moment";

import { RepositoryApi } from "../github/repository";
import { ActionLogger, PullRequestNode } from "../github/types";
import {
  calculateAveragePerMonth,
  calculateEventsPerMonth,
  extractMatchesFromDate,
} from "../util";
import { DurationWithInitialDate, PullRequestMetrics } from "./types";

interface PullRequestInfo {
  number: number;
  creation: string;
  /** Amount of reviews */
  reviews: number;
  /** Date and duration until it was closed */
  close?: DurationWithInitialDate;
  /** Date and duration until it received its first review */
  review?: DurationWithInitialDate;
  additions: number;
  deletions: number;
}

export class PullRequestAnalytics {
  constructor(
    private readonly api: RepositoryApi,
    private readonly logger: ActionLogger,
    private readonly repo: { owner: string; repo: string },
  ) {
    logger.debug(`Reporter has been configured for ${repo.owner}/${repo.repo}`);
  }

  async fetchMetricsForPullRequests(): Promise<PullRequestMetrics> {
    const prList = await this.api.getPullRequests();

    const prMetric = {
      open: prList.filter(({ state }) => state === "OPEN").length,
      closed: prList.filter(({ state }) => state === "CLOSED").length,
      merged: prList.filter(({ state }) => state === "MERGED").length,
    };

    const prs = this.getPullRequestAverages(prList);
    const monthlyMetrics = this.generateMonthlyMetrics(prs);
    const monthlyAverages = this.generateMonthlyAverages(prs);

    const reviewers = this.getTopReviewers(
      prList.flatMap((pr) => pr.reviews.nodes),
    );

    return { ...prMetric, monthlyMetrics, monthlyAverages, reviewers };
  }

  generateMonthlyMetrics(
    prList: PullRequestInfo[],
  ): PullRequestMetrics["monthlyMetrics"] {
    this.logger.debug("Calculating monthly metrics");
    const creation = calculateEventsPerMonth(prList.map((pr) => pr.creation));
    const reviews = extractMatchesFromDate(
      prList
        .filter((pr) => !!pr.review)
        .map((pr) => pr.review as DurationWithInitialDate),
      (value) => value.daysSinceCreation,
      false,
    );

    const closeDates = prList
      .filter((pr) => pr.close)
      .map(({ close }) => close?.date as string);

    const closedPrPerMonth = calculateEventsPerMonth(closeDates);

    return {
      creation,
      reviews,
      closed: closedPrPerMonth,
    };
  }

  generateMonthlyAverages(
    prs: PullRequestInfo[],
  ): PullRequestMetrics["monthlyAverages"] {
    this.logger.debug("Calculating monthly averages");
    const averageTimeToFirstReview = calculateAveragePerMonth(
      prs
        .map(({ review }) => review)
        .filter((r) => !!r) as DurationWithInitialDate[],
      (value) => value.daysSinceCreation,
    );

    const averageTimeToClose = calculateAveragePerMonth(
      prs
        .map(({ close }) => close)
        .filter((c) => !!c) as DurationWithInitialDate[],
      (value) => value.daysSinceCreation,
    );

    const linesChanged = calculateAveragePerMonth(
      prs.map((pr) => {
        return {
          date: pr.creation,
          daysSinceCreation: Math.abs(pr.additions - pr.deletions),
        };
      }),
      (value) => value.daysSinceCreation,
    );

    const averageReviewsPerMonth = calculateAveragePerMonth(
      prs.map((pr) => {
        return { date: pr.creation, reviews: pr.reviews };
      }),
      (reviews) => reviews.reviews,
    );

    return {
      timeToFirstReview: averageTimeToFirstReview,
      mergeTime: averageTimeToClose,
      linesChanged,
      reviews: averageReviewsPerMonth,
    };
  }

  getPullRequestAverages(prList: PullRequestNode[]): PullRequestInfo[] {
    const averages: PullRequestInfo[] = [];

    for (const pr of prList) {
      const creation = moment(pr.createdAt);

      const firstReview =
        pr.reviews.nodes.length > 0 ? pr.reviews.nodes[0].submittedAt : null;
      const timeToFirstReview =
        firstReview != null ? moment(firstReview).diff(creation, "days") : null;
      const timeToClose =
        pr.mergedAt != null ? moment(pr.mergedAt).diff(creation, "days") : null;
      averages.push({
        number: pr.number,
        creation: pr.createdAt,
        close: timeToClose
          ? { date: pr.mergedAt as string, daysSinceCreation: timeToClose }
          : undefined,
        review: timeToFirstReview
          ? {
            date: firstReview as string,
            daysSinceCreation: timeToFirstReview,
          }
          : undefined,
        additions: pr.additions,
        deletions: pr.deletions,
        reviews: pr.reviews.totalCount,
      });
    }

    return averages;
  }

  getTopReviewers(
    reviews: PullRequestNode["reviews"]["nodes"],
  ): PullRequestMetrics["reviewers"] {
    if (reviews.length === 0) {
      return [];
    }
    reviews.sort((a, b) => (a.submittedAt > b.submittedAt ? 1 : -1));

    // We get the month of the first date
    let currentMonth = moment(reviews[0].submittedAt).startOf("month");

    const monthsWithMatches: PullRequestMetrics["reviewers"] = [];
    let reviewsPerUser: Map<string, number> = new Map<string, number>();

    for (const review of reviews) {
      // If it happened in the same month
      if (currentMonth.diff(moment(review.submittedAt), "month") == 0) {
        const authorReviews = reviewsPerUser.get(review.author.login) ?? 0;
        // We add an extra review for the user
        reviewsPerUser.set(review.author.login, authorReviews + 1);
      } else {
        // If the month is over, we check who reviewed the most that month
        let topReviewer: { user: string, reviews: number, avatar: string } = { user: "", reviews: -1, avatar: "" };
        for (const [user, nrOfReviews] of reviewsPerUser) {
          if (nrOfReviews > topReviewer.reviews) {
            topReviewer = { user, reviews: nrOfReviews, avatar: review.author.avatarUrl };
          }
        }
        // If there was at least one review, we add it to that month's top reviewer
        if (topReviewer.reviews > 0) {
          monthsWithMatches.push({
            month: currentMonth.format("MMM YYYY"),
            ...topReviewer
          });
        }

        // We move the month to the next one
        currentMonth = moment(review.submittedAt).startOf("month");
        // We reset the monthly review object
        reviewsPerUser = new Map<string, number>();
        // We add a review to the current user
        reviewsPerUser.set(review.author.login, 1);
      }
    }

    return monthsWithMatches;
  }
}
