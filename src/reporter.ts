/* eslint-disable @typescript-eslint/no-shadow */
import { summary } from "@actions/core";
import { average } from "simple-statistics";

import {
  IssuesMetrics,
  MonthMetrics,
  PullRequestMetrics,
} from "./report/types";

export const generateSummary = (
  repo: { owner: string; repo: string },
  prMetrics: PullRequestMetrics,
  issueMetrics: IssuesMetrics,
): typeof summary => {
  let text = summary.addHeading(`Metrics for ${repo.owner}/${repo.repo}`, 1);

  text = generatePrSummary(prMetrics, text);

  text = generateIssueSummary(issueMetrics, text);

  return text;
};

const generatePrSummary = (
  prMetrics: PullRequestMetrics,
  text: typeof summary,
): typeof summary => {
  const prChart = `\`\`\`mermaid
  pie title Pull Requests for the repository
  "Open" : ${prMetrics.open}
  "Merged" : ${prMetrics.merged}
  "Closed" : ${prMetrics.closed}
  \`\`\``;

  text = summary
    .addHeading("Pull Requests", 1)
    .addEOL()
    .addRaw(prChart)
    .addEOL();

  const medianReviews = `\`\`\`mermaid
    gantt
        title Average PR time (days)
        dateFormat  X
        axisFormat %s
        section To close
        Average ${prMetrics.totalMetrics.mergeTime.average} : 0, ${prMetrics.totalMetrics.mergeTime.average}
        Median ${prMetrics.totalMetrics.mergeTime.median} : 0, ${prMetrics.totalMetrics.mergeTime.median}
        section To first review
        Average ${prMetrics.totalMetrics.timeToFirstReview.average} : 0, ${prMetrics.totalMetrics.timeToFirstReview.average}
        Median ${prMetrics.totalMetrics.timeToFirstReview.median} : 0, ${prMetrics.totalMetrics.timeToFirstReview.median}
        section Reviews per PR
        Average ${prMetrics.totalMetrics.reviews.average} : 0, ${prMetrics.totalMetrics.reviews.average}
        Median ${prMetrics.totalMetrics.reviews.median} : 0, ${prMetrics.totalMetrics.reviews.median}
  \`\`\``;

  text = text
    .addHeading("PR review", 3)
    .addEOL()
    .addRaw(medianReviews)
    .addEOL();

  text = text
    .addHeading("Duration per month", 3)
    .addEOL()
    .addRaw(
      monthWithMetricsToGanttChart(
        "Time to first review (hours)",
        prMetrics.monthlyMetrics.timeToFirstReview,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMetricsToGanttChart(
        "Time to merge (hours)",
        prMetrics.monthlyMetrics.mergeTime,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMetricsToGanttChart(
        "Reviews per PR per month",
        prMetrics.monthlyMetrics.reviews,
      ),
    )
    .addEOL();

  text = text
    .addHeading("Metrics over time", 3)
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "New PRs per month",
        prMetrics.monthlyTotals.creation,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Merged PRs per month",
        prMetrics.monthlyTotals.closed,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMetricsToGanttChart(
        "Lines changed per month",
        prMetrics.monthlyMetrics.linesChanged,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Reviews per month",
        prMetrics.monthlyTotals.reviews,
      ),
    )
    .addEOL();

  // Top reviewers
  const topReviewers = `\`\`\`mermaid
  gantt
    title Top reviewer per month
    dateFormat X
    axisFormat %s
    ${prMetrics.reviewers
      .map(
        ({ month, user, reviews }) =>
          `section ${month}\n    ${user} : 0, ${reviews}`,
      )
      .join("\n    ")}
  \`\`\``;

  text = text
    .addHeading("Top reviewers", 3)
    .addEOL()
    .addRaw(topReviewers)
    .addEOL();

  const reviewerOfTheMonth = prMetrics.reviewers.at(-1);
  if (reviewerOfTheMonth)
    text = text
      .addHeading("Reviewer of the month", 4)
      .addImage(
        reviewerOfTheMonth.avatar ?? "",
        `${reviewerOfTheMonth.user}'s avatar`,
      )
      .addEOL()
      .addRaw(
        `@${reviewerOfTheMonth.user} with ${reviewerOfTheMonth.reviews} reviews!`,
      )
      .addEOL();

  if (prMetrics.topReviewer) {
    const { topReviewer } = prMetrics;
    text = text
      .addHeading("Top reviewer", 3)
      .addEOL()
      .addImage(topReviewer.avatar, `${topReviewer.user}'s avatar`)
      .addEOL()
      .addRaw(
        `@${topReviewer.user} with a **total of ${topReviewer.reviews} reviews**!`,
      );
  }
  return text;
};

const generateIssueSummary = (
  issueMetrics: IssuesMetrics,
  text: typeof summary,
): typeof summary => {
  const prChart = `\`\`\`mermaid
  pie title Issues for the repository
  "Open" : ${issueMetrics.open}
  "Closed" : ${issueMetrics.closed}
  \`\`\``;

  text = summary.addHeading("Issues", 1).addEOL().addRaw(prChart).addEOL();

  const totalMedianTimeToClose = Math.round(
    average(issueMetrics.monthlyMetrics.closeTime.map(({ median }) => median)),
  );
  const totalMedianTimeToFirstComment = Math.round(
    average(
      issueMetrics.monthlyMetrics.timeToFirstComment.map(
        ({ median }) => median,
      ),
    ),
  );
  const totalMedianComments = Math.round(
    average(issueMetrics.monthlyMetrics.comments.map(({ median }) => median)),
  );

  const totalAverageTimeToClose = Math.round(
    average(
      issueMetrics.monthlyMetrics.closeTime.map(({ average }) => average),
    ),
  );
  const totalAverageTimeToFirstComment = Math.round(
    average(
      issueMetrics.monthlyMetrics.timeToFirstComment.map(
        ({ average }) => average,
      ),
    ),
  );
  const totalAverageComments = Math.round(
    average(issueMetrics.monthlyMetrics.comments.map(({ average }) => average)),
  );

  const medianIssueState = `\`\`\`mermaid
    gantt
        title Average activity time (days)
        dateFormat  X
        axisFormat %s
        section Time to close
        Median ${totalMedianTimeToClose} : 0, ${totalMedianTimeToClose}
        Average ${totalAverageTimeToClose} : 0, ${totalAverageTimeToClose}
        section Time to first comment
        Median ${totalMedianTimeToFirstComment} : 0, ${totalMedianTimeToFirstComment}
        Average ${totalAverageTimeToFirstComment} : 0, ${totalAverageTimeToFirstComment}
        section Average comments
        Median ${totalMedianComments} : 0, ${totalMedianComments}
        Average ${totalAverageComments} : 0, ${totalAverageComments}
  \`\`\``;

  text = text
    .addHeading("Issue comment", 3)
    .addEOL()
    .addRaw(medianIssueState)
    .addEOL();

  text = text
    .addHeading("Duration per month", 3)
    .addEOL()
    .addRaw(
      monthWithMetricsToGanttChart(
        "Time to first comment (days)",
        issueMetrics.monthlyMetrics.timeToFirstComment,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMetricsToGanttChart(
        "Time to close (days)",
        issueMetrics.monthlyMetrics.closeTime,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMetricsToGanttChart(
        "Comments per issue per month",
        issueMetrics.monthlyMetrics.comments,
      ),
    )
    .addEOL();

  text = text
    .addHeading("Metrics over time", 3)
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "New issues per month",
        issueMetrics.monthlyTotals.creation,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Closed issues per month",
        issueMetrics.monthlyTotals.closed,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Comments per month",
        issueMetrics.monthlyTotals.comments,
      ),
    )
    .addEOL();

  return text;
};

const monthWithMatchToGanttChart = (
  title: string,
  months: [string, number][],
): string => `\`\`\`mermaid
gantt
  title ${title}
  dateFormat X
  axisFormat %s
  ${months
    .map(
      ([month, matches]) => `section ${month}\n    ${matches} : 0, ${matches}`,
    )
    .join("\n    ")}
\`\`\``;

const monthWithMetricsToGanttChart = (
  title: string,
  months: MonthMetrics[],
): string => `\`\`\`mermaid
gantt
  title ${title}
  dateFormat X
  axisFormat %s
  ${months
    .map(
      ({ month, median, average }) =>
        `section ${month}\n    Average ${average} : 0, ${average}\n    Median ${median} : 0, ${median}`,
    )
    .join("\n    ")}
\`\`\``;
