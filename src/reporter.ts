import { summary } from "@actions/core";
import { PullRequestMetrics } from "./report/types";
import {
  calculateAverage
} from "./util";

export const generateSummary = (
  repo: { owner: string; repo: string },
  metrics: PullRequestMetrics,
): typeof summary => {
  const prChart = `\`\`\`mermaid
  pie title Pull Requests for the repository
  "Open" : ${metrics.open}
  "Merged" : ${metrics.merged}
  "Closed" : ${metrics.closed}
  \`\`\``;

  let text = summary
    .addHeading(`Pull Request metrics for ${repo.owner}/${repo.repo}`, 2)
    .addHeading("PRs states", 3)
    .addEOL()
    .addRaw(prChart)
    .addEOL();

  const totalAverageTimeToClose = calculateAverage(metrics.monthlyAverages.mergeTime.map(([_,average]) => average));
  const totalAverageTimeToFirstReview = calculateAverage(metrics.monthlyAverages.timeToFirstReview.map(([_,average]) => average));
  const totalAverageReviews = calculateAverage(metrics.monthlyAverages.reviews.map(([_,average])=>average));

  const averageReviews = `\`\`\`mermaid
    gantt
        title Average Reviews time (days)
        dateFormat  X
        axisFormat %s
        section Time to close
        ${totalAverageTimeToClose} : 0, ${totalAverageTimeToClose}
        section Time to first review
        ${totalAverageTimeToFirstReview} : 0, ${totalAverageTimeToFirstReview}
        section Average reviews
        ${totalAverageReviews} : 0, ${totalAverageReviews}
  \`\`\``;

  text = text
    .addHeading("PR review average", 3)
    .addEOL()
    .addRaw(averageReviews)
    .addEOL();

  text = text
    .addHeading("Average duration per month", 3)
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Average time to first review (days)",
        metrics.monthlyAverages.timeToFirstReview,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Average time to merge (days)",
        metrics.monthlyAverages.mergeTime,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Average reviews per PR per month",
        metrics.monthlyAverages.reviews
      ),
    )
    .addEOL();

  text = text
    .addHeading("Metrics over time", 3)
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart("New PRs per month", metrics.monthlyMetrics.creation),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart("Merged PRs per month", metrics.monthlyMetrics.closed),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Lines changed per month",
        metrics.monthlyAverages.linesChanged
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Reviews per month",
        metrics.monthlyMetrics.reviews
      ),
    )
    .addEOL();

  return text;
};

const monthWithMatchToGanttChart = (
  title: string,
  months: [string,number][],
): string => `\`\`\`mermaid
gantt
  title ${title}
  dateFormat X
  axisFormat %s
  ${months
    .map(
      ([ month, matches ]) =>
        `section ${month}\n    ${matches} : 0, ${matches}`,
    )
    .join("\n    ")}
\`\`\``;
