import { ActionLogger, IssueNode } from "../github/types";
import {
  calculateEventsPerMonth,
  extractMatchesFromDate,
  gatherValuesPerMonth,
} from "../util";
import { IssuesMetrics } from "./types";
import { calculateDaysBetweenDates, toTotalMetrics } from "./utils";

export class IssueAnalytics {
  constructor(private readonly logger: ActionLogger) {}

  getAnalytics(issues: IssueNode[]): IssuesMetrics {
    const monthlyTotals = this.generateMonthlyTotals(issues);
    const monthlyMetrics = this.generateMonthlyAverages(issues);
    const totalMetrics = this.generateTotalMetrics(issues);

    return {
      open: issues.filter(({ state }) => state === "OPEN").length,
      closed: issues.filter(({ state }) => state === "CLOSED").length,
      monthlyTotals,
      monthlyMetrics,
      totalMetrics,
    };
  }

  generateMonthlyTotals(issues: IssueNode[]): IssuesMetrics["monthlyTotals"] {
    this.logger.debug("Calculating monthly metrics");
    const creation = calculateEventsPerMonth(
      issues.map((issue) => issue.createdAt as string),
    );
    const comments = extractMatchesFromDate(
      issues
        .filter((issue) => issue.comments.totalCount > 0)
        .map((i) => {
          return {
            date: i.createdAt as string,
            comments: i.comments.totalCount,
          };
        }),
      (value) => value.comments,
    );

    const closeDates = issues
      .filter((issue) => !!(issue.closedAt as string))
      .map(({ closedAt }) => closedAt as string);
    const closedPrPerMonth = calculateEventsPerMonth(closeDates);

    return {
      creation,
      comments,
      closed: closedPrPerMonth,
    };
  }

  generateMonthlyAverages(
    issues: IssueNode[],
  ): IssuesMetrics["monthlyMetrics"] {
    this.logger.debug("Calculating monthly averages");
    const averageTimeToFirstComment = gatherValuesPerMonth(
      issues
        .filter(({ comments }) => comments.totalCount > 0)
        .map((issue) => {
          if (!issue.comments.nodes) {
            return null;
          }
          return {
            date: issue.comments.nodes[0]?.createdAt as string,
            daysToFirstComment: calculateDaysBetweenDates(
              issue.createdAt as string,
              issue.comments.nodes[0]?.createdAt as string,
            ),
          };
        })
        .filter((i) => i !== null),
      (value) => value.daysToFirstComment,
    );

    const averageTimeToClose = gatherValuesPerMonth(
      issues
        .filter(({ closedAt }) => !!(closedAt as string | null))
        .map((issue) => {
          return {
            date: issue.closedAt as string,
            daysToClose: calculateDaysBetweenDates(
              issue.createdAt as string,
              issue.closedAt as string,
            ),
          };
        }),
      (value) => value.daysToClose,
    );

    const averageCommentsPerMonth = gatherValuesPerMonth(
      issues.map((issue) => {
        return {
          date: issue.createdAt as string,
          comments: issue.comments.totalCount,
        };
      }),
      (reviews) => reviews.comments,
    );

    return {
      timeToFirstComment: averageTimeToFirstComment,
      closeTime: averageTimeToClose,
      comments: averageCommentsPerMonth,
    };
  }

  generateTotalMetrics(issues: IssueNode[]): IssuesMetrics["totalMetrics"] {
    this.logger.debug("Calculating the metrics on the totality of time");

    const totalComments = issues.map(({ comments }) => comments.totalCount);
    const totalCloseTime = issues
      .map((issue) =>
        (issue.closedAt as string | null)
          ? calculateDaysBetweenDates(
              issue.createdAt as string,
              issue.closedAt as string,
            )
          : -1,
      )
      .filter((v) => v > -1);
    const totalTimeToFirstComment = issues
      .filter(({ comments }) => comments.nodes && comments.nodes.length > 0)
      .map((issue) =>
        calculateDaysBetweenDates(
          issue.createdAt as string,
          issue.comments.nodes?.[0]?.createdAt as string,
        ),
      );
    return {
      comments: toTotalMetrics(totalComments),
      closeTime: toTotalMetrics(totalCloseTime),
      timeToFirstComment: toTotalMetrics(totalTimeToFirstComment),
    };
  }
}
