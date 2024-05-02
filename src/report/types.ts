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
  };
  totalMetrics: {
    reviews: TotalMetrics;
    mergeTime: TotalMetrics;
    timeToFirstReview: TotalMetrics;
  };
  reviewers: ({ month: string } & Reviewer)[];
  topReviewer?: Reviewer | null;
}

export interface IssuesMetrics {
  open: number;
  closed: number;
  /** Amount of events per month  */
  monthlyTotals: {
    /** New issues per month */
    creation: MonthWithMatch[];
    /** Total comments per month */
    comments: MonthWithMatch[];
    /** Closed issues per month */
    closed: MonthWithMatch[];
  };
  /** Events per month */
  monthlyMetrics: {
    /** Comments per month */
    comments: MonthMetrics[];
    /** Time to close */
    closeTime: MonthMetrics[];
    /** Time to first comment per month */
    timeToFirstComment: MonthMetrics[];
  };
  totalMetrics: {
    comments: TotalMetrics;
    closeTime: TotalMetrics;
    timeToFirstComment: TotalMetrics;
  };
}

export type MonthWithMatch = [string, number];
export type TotalMetrics = { median: number | null; average: number | null };
export type MonthMetrics = TotalMetrics & { month: string };

export type DurationWithInitialDate = {
  date: string;
  daysSinceCreation: number;
};
