import moment from "moment";

import { ActionLogger, PullRequestNode } from "../github/types";
import {
  calculateEventsPerMonth,
  extractMatchesFromDate,
  gatherValuesPerMonth,
} from "../util";
import { DurationWithInitialDate, PullRequestMetrics, Reviewer } from "./types";
import { toTotalMetrics } from "./utils";

export interface PullRequestInfo {
  number: number;
  creation: string;
  author: string;
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
    private readonly logger: ActionLogger,
    repo: { owner: string; repo: string },
  ) {
    logger.debug(`Reporter has been configured for ${repo.owner}/${repo.repo}`);
  }

  fetchMetricsForPullRequests(prList: PullRequestNode[]): PullRequestMetrics {
    const prMetric = {
      open: prList.filter(({ state }) => state === "OPEN").length,
      closed: prList.filter(({ state }) => state === "CLOSED").length,
      merged: prList.filter(({ state }) => state === "MERGED").length,
    };

    const prs = PullRequestAnalytics.getPullRequestAverages(prList);
    const monthlyTotals = this.generateMonthlyTotals(prs);
    const monthlyMetrics = this.generateMonthlyMetrics(prs);
    const totalMetrics = this.generateTotalMetrics(prs);

    const reviewList = prList.flatMap((pr) => pr.reviews?.nodes);
    const reviewers = this.getTopMonthlyReviewers(
      reviewList as NonNullable<PullRequestNode["reviews"]>["nodes"],
    );

    const topReviewer = this.getTopReviewer(
      reviewList.filter((r) => !!r?.author?.login) as NonNullable<
        PullRequestNode["reviews"]
      >["nodes"],
    );

    return {
      ...prMetric,
      monthlyTotals,
      monthlyMetrics,
      totalMetrics,
      reviewers,
      topReviewer,
    };
  }

  generateMonthlyTotals(
    prList: PullRequestInfo[],
  ): PullRequestMetrics["monthlyTotals"] {
    this.logger.debug("Calculating monthly metrics");
    const creation = calculateEventsPerMonth(prList.map((pr) => pr.creation));
    const reviews = extractMatchesFromDate(
      prList
        .filter((pr) => !!pr.review)
        .map((pr) => pr.review as DurationWithInitialDate),
      (value) => value.daysSinceCreation,
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

  generateMonthlyMetrics(
    prs: PullRequestInfo[],
  ): PullRequestMetrics["monthlyMetrics"] {
    this.logger.debug("Calculating monthly averages");

    const averageTimeToFirstReview = gatherValuesPerMonth(
      prs
        .map(({ review }) => review)
        .filter((r) => !!r) as DurationWithInitialDate[],
      (value) => value.daysSinceCreation,
    );

    const averageTimeToClose = gatherValuesPerMonth(
      prs
        .map(({ close }) => close)
        .filter((c) => !!c) as DurationWithInitialDate[],
      (value) => value.daysSinceCreation,
    );

    const linesChanged = gatherValuesPerMonth(
      prs.map((pr) => {
        return {
          date: pr.creation,
          daysSinceCreation: Math.abs(pr.additions - pr.deletions),
        };
      }),
      (value) => value.daysSinceCreation,
    );

    const averageReviewsPerMonth = gatherValuesPerMonth(
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

  static getPullRequestAverages(prList: PullRequestNode[]): PullRequestInfo[] {
    const averages: PullRequestInfo[] = [];

    for (const pr of prList) {
      const creation = moment(pr.createdAt as string);

      if (!pr.reviews?.nodes || !pr.author) {
        continue;
      }
      const reviews = pr.reviews.nodes;

      const firstReview: string | null =
        reviews.length > 0 ? (reviews[0]?.submittedAt as string) : null;
      const timeToFirstReview =
        firstReview != null
          ? moment(firstReview).diff(creation, "hours")
          : null;
      const timeToClose =
        pr.mergedAt != null
          ? moment(pr.mergedAt as string).diff(creation, "hours")
          : null;
      averages.push({
        number: pr.number,
        creation: pr.createdAt as string,
        author: pr.author?.login,
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

  /** Returns the reviewer who gave the biggest amount of reviews per month */
  getTopMonthlyReviewers(
    reviews: NonNullable<PullRequestNode["reviews"]>["nodes"],
  ): PullRequestMetrics["reviewers"] {
    if (!reviews || reviews.length === 0) {
      return [];
    }
    reviews.sort((a, b) =>
      moment(a?.submittedAt as string).diff(
        moment(b?.submittedAt as string),
        "days",
      ),
    );

    // We get the month of the first date
    let currentMonth = moment(reviews[0]?.submittedAt as string).startOf(
      "month",
    );

    const monthsWithMatches: PullRequestMetrics["reviewers"] = [];
    let reviewsPerUser: { user: string; reviews: number; avatar: string }[] =
      [];

    for (const review of reviews) {
      if (!review) {
        continue;
      }

      if (!(review.submittedAt as string | null)) {
        this.logger.debug(
          `Skipping review from ${review.author?.login} as it is has a null date`,
        );
        continue;
      } else if (!review.author?.login) {
        this.logger.debug(
          `Skipping review ${review.submittedAt} because author object is empty`,
        );
        continue;
      }
      // If it happened in the same month
      if (
        currentMonth.diff(moment(review.submittedAt as string), "month") == 0
      ) {
        const reviewerIndex = reviewsPerUser
          .map((u) => u.user)
          .indexOf(review.author?.login);
        if (reviewerIndex > -1) {
          // If the user exists, we increment his reviews
          reviewsPerUser[reviewerIndex].reviews += 1;
        } else {
          // Else we push a new user
          reviewsPerUser.push({
            user: review.author.login,
            reviews: 1,
            avatar: review.author.avatarUrl as string,
          });
        }
      } else {
        // If the month is over, we check who reviewed the most that month
        let topReviewer: { user: string; reviews: number; avatar: string } = {
          user: "",
          reviews: -1,
          avatar: "",
        };

        for (const monthlyReviewer of reviewsPerUser) {
          if (monthlyReviewer.reviews > topReviewer.reviews) {
            topReviewer = monthlyReviewer;
          }
        }
        // If there was at least one review, we add it to that month's top reviewer
        if (topReviewer.reviews > 0) {
          monthsWithMatches.push({
            month: currentMonth.format("MMM YYYY"),
            ...topReviewer,
          });
        }

        // We move the month to the next one
        currentMonth = moment(review.submittedAt as string).startOf("month");
        // We reset the monthly review object
        reviewsPerUser = [];
        // We add a review to the current user
        reviewsPerUser.push({
          user: review.author.login,
          reviews: 1,
          avatar: review.author.avatarUrl as string,
        });
      }
    }

    return monthsWithMatches;
  }

  /** Returns the reviewer who gave the biggest amount of reviews */
  getTopReviewer(
    reviews: NonNullable<PullRequestNode["reviews"]>["nodes"],
  ): PullRequestMetrics["topReviewer"] {
    if (!reviews || reviews.length === 0) {
      return null;
    }

    const usersWithReviews: Reviewer[] = [];
    for (const r of reviews) {
      if (!r?.author) {
        continue;
      }
      const {
        author: { login, avatarUrl },
      } = r;
      const index = usersWithReviews.map((u) => u.user).indexOf(login);
      if (index > -1) {
        usersWithReviews[index].reviews += 1;
      } else {
        usersWithReviews.push({
          user: login,
          avatar: avatarUrl as string,
          reviews: 1,
        });
      }
    }

    let topReviewer: PullRequestMetrics["topReviewer"] = null;
    for (const candidate of usersWithReviews) {
      if (!topReviewer || candidate.reviews > topReviewer.reviews) {
        topReviewer = candidate;
      }
    }

    return topReviewer;
  }

  generateTotalMetrics(
    prs: PullRequestInfo[],
  ): PullRequestMetrics["totalMetrics"] {
    this.logger.debug("Calculating the metrics on the totality of time");

    const mergeTimeTotal = prs
      .map(({ close }) => close?.daysSinceCreation ?? 0)
      .filter((d) => d !== 0)
      .map((v) => v / 24);
    const timeToFirstTotal = prs
      .map(({ review }) => review?.daysSinceCreation ?? 0)
      .filter((d) => d !== 0)
      .map((v) => v / 24);
    const reviewsTotal = prs.map((pr) => pr.reviews);
    return {
      mergeTime: toTotalMetrics(mergeTimeTotal),
      reviews: toTotalMetrics(reviewsTotal),
      timeToFirstReview: toTotalMetrics(timeToFirstTotal),
    };
  }
}
