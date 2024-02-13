import { summary } from "@actions/core";

import {
  DurationWithInitialDate,
  MonthWithMatch,
  PullRequestAverage,
  PullRequestMetrics,
} from "./analytics";
import { ActionLogger } from "./github/types";
import {
  calculateAverage,
  calculateAveragePerMonth,
  extractMatchesFromDate,
} from "./util";

export const generateSummary = (
  repo: { owner: string; repo: string },
  metrics: PullRequestMetrics,
  prAverage: PullRequestAverage[],
  monthMetrics: { opened: MonthWithMatch[]; closed: MonthWithMatch[] },
  logger: ActionLogger,
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
    timeToClose: calculateAverage(filteredTimeToClose),
    timeToFirstReview: calculateAverage(filteredTimeToFirstReview),
    additions: calculateAverage(prAverage.map(({ additions }) => additions)),
    deletions: calculateAverage(prAverage.map(({ deletions }) => deletions)),
    creation: "",
    reviews: calculateAverage(prAverage.map(({ reviews }) => reviews)),
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
        section Average reviews
        ${average.reviews} : 0, ${average.reviews}
  \`\`\``;

  text = text
    .addHeading("PR review average", 3)
    .addEOL()
    .addRaw(averageReviews)
    .addEOL();

  const averageTimeToFirstReview = calculateAveragePerMonth(
    prAverage
      .map(({ review }) => review)
      .filter((r) => !!r) as DurationWithInitialDate[],
    (value) => value.daysSinceCreation,
  );

  console.log("averageTimeToFirstReview", averageTimeToFirstReview);

  const averageTimeToClose = calculateAveragePerMonth(
    prAverage
      .map(({ close }) => close)
      .filter((c) => !!c) as DurationWithInitialDate[],
    (value) => value.daysSinceCreation,
  );

  console.log("averageTimeToClose", averageTimeToClose);

  text = text
    .addHeading("Average duration per month", 3)
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Average time to first review (days)",
        averageTimeToFirstReview,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Average time to merge (days)",
        averageTimeToClose,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Average reviews per PR per month",
        calculateAveragePerMonth(
          prAverage.map((pr) => {
            return { date: pr.creation, reviews: pr.reviews };
          }),
          (value) => value.reviews,
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
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Lines changed per month",
        calculateAveragePerMonth(
          prAverage.map((pr) => {
            return {
              date: pr.creation,
              daysSinceCreation: Math.abs(pr.additions - pr.deletions),
            };
          }),
          (value) => value.daysSinceCreation,
        ),
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Reviews per month",
        extractMatchesFromDate(
          prAverage
            .filter((pr) => !!pr.review)
            .map((pr) => {
              return {
                date: pr.review?.date as string,
                reviews: pr.reviews,
              };
            }),
          (pr) => pr.reviews,
          false,
        ),
      ),
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