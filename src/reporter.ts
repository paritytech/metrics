import { summary } from "@actions/core";

import {
  DurationWithInitialDate,
  MonthWithMatch,
  PullRequestAverage,
  PullRequestMetrics,
} from "./analytics";
import { splitDatesWithAmount } from "./util";

export const generateSummary = (
  repo: { owner: string; repo: string },
  metrics: PullRequestMetrics,
  prAverage: PullRequestAverage[],
  monthMetrics: { opened: MonthWithMatch[]; closed: MonthWithMatch[] },
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

  const filteredTimeToFirstReview = prAverage
    .filter(({ timeToFirstReview }) => !!timeToFirstReview)
    .map(({ timeToFirstReview }) => timeToFirstReview as number);
  const filteredTimeToClose = prAverage
    .filter(({ timeToClose }) => !!timeToClose)
    .map(({ timeToClose }) => timeToClose as number);

  const average: Omit<PullRequestAverage, "number"> = {
    timeToClose: Math.round(
      filteredTimeToClose.reduce((a, t) => a + t, 0) /
        filteredTimeToClose.length,
    ),
    timeToFirstReview: Math.round(
      filteredTimeToFirstReview.reduce((a, t) => a + t, 0) /
        filteredTimeToFirstReview.length,
    ),
  };

  const averageReviews = `\`\`\`mermaid
    gantt
        title Average Reviews time (days)
        dateFormat  X
        axisFormat %s
        section Time to close
        ${average.timeToClose} : 0, ${average.timeToClose}
        section Time to first review
        ${average.timeToFirstReview} : 0, ${average.timeToFirstReview}
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
        splitDatesWithAmount(
          prAverage
            .map(({ review }) => review)
            .filter((r) => !!r) as DurationWithInitialDate[],
        ),
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Average time to merge (days)",
        splitDatesWithAmount(
          prAverage
            .map(({ close }) => close)
            .filter((c) => !!c) as DurationWithInitialDate[],
        ),
      ),
    )
    .addEOL();

  text = text
    .addHeading("Metrics over time", 3)
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart("New PRs per month", monthMetrics.opened),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart("Merged PRs per month", monthMetrics.closed),
    )
    .addEOL();

  return text;
};

const monthWithMatchToGanttChart = (
  title: string,
  months: MonthWithMatch[],
): string => `\`\`\`mermaid
gantt
  title ${title}
  dateFormat X
  axisFormat %s
  ${months
    .map(
      ({ month, matches }) =>
        `section ${month}\n    ${matches} : 0, ${matches}`,
    )
    .join("\n    ")}
\`\`\``;
