import moment from "moment";

import { RepositoryApi } from "./github/repository";
import {
  ActionLogger,
  GitHubClient,
  PullRequestList,
  PullRequestReviewList,
} from "./github/types";
import { generateSummary } from "./reporter";
import { splitDates } from "./util";
import { summary } from "@actions/core";

export interface PullRequestMetrics {
  open: number;
  closed: number;
  merged: number;
}

export type DurationWithInitialDate = {
  date: string;
  daysSinceCreation: number;
};

export interface PullRequestAverage {
  number: number;
  close?: DurationWithInitialDate;
  review?: DurationWithInitialDate;
  timeToClose: number | null;
  timeToFirstReview: number | null;
}

export type MonthWithMatch = { month: string; matches: number };

class ReportGenerator {
  private prList: PullRequestList | null = null;
  private readonly repoApi: RepositoryApi;

  constructor(
    private readonly api: GitHubClient,
    private readonly logger: ActionLogger,
    private readonly repo: { owner: string; repo: string },
  ) {
    logger.debug(`Reporter has been configured for ${repo.owner}/${repo.repo}`);
    this.repoApi = new RepositoryApi(this.api, this.logger, this.repo);
  }

  async getPullRequests(): Promise<PullRequestMetrics> {
    if (!this.prList) {
      this.prList = await this.repoApi.getPullRequests();
    }

    const openPrs = this.prList.reduce(
      (count, { state }) => count + (state === "open" ? 1 : 0),
      0,
    );
    const mergedPrs = this.prList.filter(({ merged_at }) => !!merged_at).length;
    const closedPrs = this.prList.length - openPrs - mergedPrs;

    const prMetric: PullRequestMetrics = {
      open: openPrs,
      closed: closedPrs,
      merged: mergedPrs,
    };

    return prMetric;
  }

  async getPullRequestAverages(): Promise<PullRequestAverage[]> {
    if (!this.prList) {
      this.prList = await this.repoApi.getPullRequests();
    }

    const averages: PullRequestAverage[] = [];

    // for (const pr of this.prList.reverse().slice(0, 25)) {
    for (const pr of this.prList.reverse()) {
      const creation = moment(pr.created_at);
      const review = await this.repoApi.getPullRequestInfo(pr.number);

      const firstReview = review?.submitted_at ?? null;
      const timeToFirstReview =
        firstReview != null
          ? moment(firstReview).diff(creation, "days")
          : null;
      const timeToClose =
        pr.merged_at != null
          ? moment(pr.merged_at).diff(creation, "days")
          : null;
      averages.push({
        number: pr.number,
        timeToClose,
        timeToFirstReview,
        close: timeToClose
          ? { date: pr.merged_at as string, daysSinceCreation: timeToClose }
          : undefined,
        review: timeToFirstReview
          ? {
              date: firstReview as string,
              daysSinceCreation: timeToFirstReview,
            }
          : undefined,
      });
    }

    return averages;
  }

  async getPullRequestMetricsPerMonth(): Promise<{
    opened: MonthWithMatch[];
    closed: MonthWithMatch[];
  }> {
    if (!this.prList) {
      this.prList = await this.repoApi.getPullRequests();
    }

    const creations = this.prList.map(({ created_at }) => created_at);
    const closeDates = this.prList
      .filter((pr) => pr.merged_at)
      .map(({ merged_at }) => merged_at as string);

    const opened = splitDates(creations);
    const closed = splitDates(closeDates);

    return { opened, closed };
  }
}

const sortReviews = (
  first: PullRequestReviewList[number],
  second: PullRequestReviewList[number],
): number => {
  if (first.submitted_at) {
    if (second.submitted_at) {
      return first.submitted_at > second.submitted_at ? 1 : -1;
    } else {
      return 1;
    }
  } else if (second.submitted_at) {
    return -1;
  }

  return 0;
};

export const getMetrics = async (
  api: GitHubClient,
  logger: ActionLogger,
  repo: { owner: string; repo: string },
): Promise<typeof summary> => {
  const gen = new ReportGenerator(api, logger, repo);
  const monthMetrics = await gen.getPullRequestMetricsPerMonth();
  const pr = await gen.getPullRequests();

  const averages = await gen.getPullRequestAverages();
  console.log(averages);

  const report = generateSummary(repo, pr, averages, monthMetrics);
  return report;
};
