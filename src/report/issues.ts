import { RepositoryApi } from "../github/repository";
import { ActionLogger, IssueNode } from "../github/types";
import {
  calculateAveragePerMonth,
  calculateEventsPerMonth,
  extractMatchesFromDate,
  extractMediansFromDate,
} from "../util";
import { IssuesMetrics } from "./types";
import { calculateDaysBetweenDates } from "./utils";

export class IssueAnalytics {
  constructor(
    private readonly api: RepositoryApi,
    private readonly logger: ActionLogger,
  ) { }

  async getAnalytics(): Promise<IssuesMetrics> {
    const issues = await this.api.getIssues();
    const monthlyMetrics = this.generateMonthlyMetrics(issues);
    const monthlyAverages = this.generateMonthlyAverages(issues);
    const monthlyMedians = this.generateMonthlyMedians(issues);

    return {
      open: issues.filter(({ state }) => state === "OPEN").length,
      closed: issues.filter(({ state }) => state === "CLOSED").length,
      monthlyMetrics,
      monthlyAverages,
      monthlyMedians,
    };
  }

  generateMonthlyMetrics(issues: IssueNode[]): IssuesMetrics["monthlyMetrics"] {
    this.logger.debug("Calculating monthly metrics");
    const creation = calculateEventsPerMonth(
      issues.map((issue) => issue.createdAt),
    );
    const comments = extractMatchesFromDate(
      issues
        .filter((issue) => issue.comments.totalCount > 0)
        .map((i) => {
          return { date: i.createdAt, comments: i.comments.totalCount };
        }),
      (value) => value.comments,
      false,
    );

    const closeDates = issues
      .filter((issue) => !!issue.closedAt)
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
  ): IssuesMetrics["monthlyAverages"] {
    this.logger.debug("Calculating monthly averages");
    const averageTimeToFirstComment = calculateAveragePerMonth(
      issues
        .filter(({ comments }) => comments.totalCount > 0)
        .map((issue) => {
          return {
            date: issue.comments.nodes[0].createdAt as string,
            daysToFirstComment: calculateDaysBetweenDates(
              issue.createdAt,
              issue.comments.nodes[0].createdAt as string,
            ),
          };
        }),
      (value) => value.daysToFirstComment,
    );

    const averageTimeToClose = calculateAveragePerMonth(
      issues
        .filter(({ closedAt }) => !!closedAt)
        .map((issue) => {
          return {
            date: issue.closedAt as string,
            daysToClose: calculateDaysBetweenDates(
              issue.createdAt,
              issue.closedAt as string,
            ),
          };
        }),
      (value) => value.daysToClose,
    );

    const averageCommentsPerMonth = calculateAveragePerMonth(
      issues.map((issue) => {
        return { date: issue.createdAt, comments: issue.comments.totalCount };
      }),
      (reviews) => reviews.comments,
    );

    return {
      timeToFirstComment: averageTimeToFirstComment,
      closeTime: averageTimeToClose,
      comments: averageCommentsPerMonth,
    };
  }

  generateMonthlyMedians(
    issues: IssueNode[],
  ): IssuesMetrics["monthlyMedians"] {
    this.logger.debug("Calculating monthly averages");
    const averageTimeToFirstComment = calculateAveragePerMonth(
      issues
        .filter(({ comments }) => comments.totalCount > 0)
        .map((issue) => {
          return {
            date: issue.comments.nodes[0].createdAt as string,
            daysToFirstComment: calculateDaysBetweenDates(
              issue.createdAt,
              issue.comments.nodes[0].createdAt as string,
            ),
          };
        }),
      (value) => value.daysToFirstComment,
    );

    const medianTimeToClose = extractMediansFromDate(
      issues
        .filter(({ closedAt }) => !!closedAt)
        .map((issue) => {
          return {
            date: issue.closedAt as string,
            daysToClose: calculateDaysBetweenDates(
              issue.createdAt,
              issue.closedAt as string,
            ),
          };
        }),
      (value) => value.daysToClose,
    );

    const medianCommentsPerMonth = extractMediansFromDate(
      issues.map((issue) => {
        return { date: issue.createdAt, comments: issue.comments.totalCount };
      }),
      (reviews) => reviews.comments,
    );

    return {
      timeToFirstComment: averageTimeToFirstComment,
      closeTime: medianTimeToClose,
      comments: medianCommentsPerMonth,
    };
  }
}
