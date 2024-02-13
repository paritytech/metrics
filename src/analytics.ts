import { summary } from "@actions/core";
import moment from "moment";

import { RepositoryApi } from "./github/repository";
import {
  ActionLogger,
  GitHubClient,
  PullRequestNode,
  PullRequestReviewList
} from "./github/types";
import { generateSummary } from "./reporter";
import { calculateEventsPerMonth } from "./util";

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
  creation:string;
  reviews:number;
  close?: DurationWithInitialDate;
  review?: DurationWithInitialDate;
  timeToClose: number | null;
  timeToFirstReview: number | null;
  additions: number;
  deletions: number;
}

export type MonthWithMatch = { month: string; matches: number };

class ReportGenerator {
  private prList: PullRequestNode[] | null = null;
  private readonly repoApi: RepositoryApi;

  constructor(
    private readonly api: GitHubClient,
    private readonly logger: ActionLogger,
    private readonly repo: { owner: string; repo: string },
  ) {
    logger.debug(`Reporter has been configured for ${repo.owner}/${repo.repo}`);
    this.repoApi = new RepositoryApi(this.api, this.logger, this.repo);
  }

  async getPullRequestAverages(): Promise<PullRequestMetrics & {averages:PullRequestAverage[]}> {
    if(!this.prList){
      this.prList = await this.repoApi.getPullRequestsGql();
    }

    console.log("STATES", this.prList.map(({state}) => state));

    const prMetric: PullRequestMetrics = {
      open: this.prList.filter(({state}) => state === "OPEN").length,
      closed: this.prList.filter(({state}) => state === "CLOSED").length,
      merged: this.prList.filter(({state}) => state === "MERGED").length,
    };

    const averages: PullRequestAverage[] = [];

    for (const pr of this.prList) {
      const creation = moment(pr.createdAt);

      const firstReview = (pr.reviews.nodes.length > 0) ? pr.reviews.nodes[0].submittedAt : null;
      const timeToFirstReview =
        firstReview != null ? moment(firstReview).diff(creation, "days") : null;
      const timeToClose =
        pr.mergedAt != null
          ? moment(pr.mergedAt).diff(creation, "days")
          : null;
      averages.push({
        number: pr.number,
        timeToClose,
        timeToFirstReview,
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
        reviews: pr.reviews.totalCount
      });
    }

    return {...prMetric,averages};
  }

  async getPullRequestMetricsPerMonth(): Promise<{
    opened: MonthWithMatch[];
    closed: MonthWithMatch[];
  }> {

    if(!this.prList){
      this.prList = await this.repoApi.getPullRequestsGql();
    }

    const creations = this.prList.map(({ createdAt }) => createdAt);
    const closeDates = this.prList
      .filter((pr) => pr.mergedAt)
      .map(({ mergedAt }) => mergedAt as string);

    const opened = calculateEventsPerMonth(creations);
    const closed = calculateEventsPerMonth(closeDates);

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

  const prWithAverage = await gen.getPullRequestAverages();
  console.log("averages", {open:prWithAverage.open, closed:prWithAverage.closed, merged:prWithAverage.merged});
  const monthMetrics = await gen.getPullRequestMetricsPerMonth();

  return generateSummary(repo, prWithAverage, prWithAverage.averages, monthMetrics, logger);
};
