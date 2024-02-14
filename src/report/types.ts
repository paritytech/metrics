export interface PullRequestMetrics {
  open: number;
  closed: number;
  merged: number;
  /** Amount of events per month  */
  monthlyMetrics: {
    /** New PRs per month */
    creation: MonthWithMatch[];
    /** Total reviews per month */
    reviews: MonthWithMatch[];
    /** Closed PR per month */
    closed: MonthWithMatch[];
  };
  /** Average of events per month */
  monthlyAverages: {
    /** Average reviews per month */
    reviews: MonthWithMatch[];
    /** Average time to merge */
    mergeTime: MonthWithMatch[];
    /** Average time to first review per month */
    timeToFirstReview: MonthWithMatch[];
    /** Average lines changed per month */
    linesChanged: MonthWithMatch[];
  };
}

export type MonthWithMatch = [string, number];

export type DurationWithInitialDate = {
  date: string;
  daysSinceCreation: number;
};
