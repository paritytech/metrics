export type Reviewer = { user: string; avatar: string; reviews: number };

export interface PullRequestMetrics {
  open: number;
  closed: number;
  merged: number;
  /** Amount of events per month  */
  monthlyTotals: {
    /** New PRs per month */
    creation: MonthWithMatch[];
    /** Total reviews per month */
    reviews: MonthWithMatch[];
    /** Closed PR per month */
    closed: MonthWithMatch[];
  };
  monthlyMetrics: {
    /** Reviews per month */
    reviews: MonthMetrics[];
    /** Time to merge */
    mergeTime: MonthMetrics[];
    /** Time to first review per month */
    timeToFirstReview: MonthMetrics[];
    /** Lines changed per month */
    linesChanged: MonthMetrics[];
  },
  reviewers: ({ month: string } & Reviewer)[];
  topReviewer?: Reviewer | null;
}

export interface IssuesMetrics {
  open: number;
  closed: number;
  /** Amount of events per month  */
  monthlyMetrics: {
    /** New issues per month */
    creation: MonthWithMatch[];
    /** Total comments per month */
    comments: MonthWithMatch[];
    /** Closed issues per month */
    closed: MonthWithMatch[];
  };
  /** Average of events per month */
  monthlyAverages: {
    /** Average comments per month */
    comments: MonthWithMatch[];
    /** Average time to close */
    closeTime: MonthWithMatch[];
    /** Average time to first comment per month */
    timeToFirstComment: MonthWithMatch[];
  };
  monthlyMedians: {
    /** Median comments per month */
    comments: MonthWithMatch[];
    /** Median time to close */
    closeTime: MonthWithMatch[];
    /** Median time to first comment per month */
    timeToFirstComment: MonthWithMatch[];
  };
}

export type MonthWithMatch = [string, number];
export type MonthMetrics = { month: string, median: number, average: number };

export type DurationWithInitialDate = {
  date: string;
  daysSinceCreation: number;
};
