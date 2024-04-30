import { RepositoryApi } from "../github/repository";
import { ActionLogger, IssueNode } from "../github/types";
import {
  calculateAveragePerMonth,
  calculateEventsPerMonth,
  extractMatchesFromDate,
  extractMediansFromDate,
  gatherValuesPerMonth,
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
    const monthlyTotals = this.generateMonthlyTotals(issues);
    const monthlyMetrics = this.generateMonthlyAverages(issues);

    return {
      open: issues.filter(({ state }) => state === "OPEN").length,
      closed: issues.filter(({ state }) => state === "CLOSED").length,
      monthlyTotals,
      monthlyMetrics,
    };
  }

  generateMonthlyTotals(issues: IssueNode[]): IssuesMetrics["monthlyTotals"] {
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
  ): IssuesMetrics["monthlyMetrics"] {
    this.logger.debug("Calculating monthly averages");
    const averageTimeToFirstComment = gatherValuesPerMonth(
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

    const averageTimeToClose = gatherValuesPerMonth(
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

    const averageCommentsPerMonth = gatherValuesPerMonth(
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
}
