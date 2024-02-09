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
    nrOfReviews: Math.round(
      prAverage.reduce((a, { nrOfReviews }) => nrOfReviews + a, 0) /
        prAverage.length,
    ),
  };

  const averageReviews = `\`\`\`mermaid
    gantt
        title Average Reviews time (hours)
        dateFormat  X
        axisFormat %s
        section Reviews per PR
        ${average.nrOfReviews} : 0, ${average.nrOfReviews}
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

  const prDetailedChart = perPRChart(prAverage);

  text = text
    .addHeading("Average duration per month", 3)
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Average time to first review (hours)",
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
        "Average time to merge (hours)",
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

type GanttMatch = [number, string][];

const perPRChart = (
  prs: PullRequestAverage[],
): {
  timeToCloseGanttChart: string;
  timeToFirstReviewGanttChart: string;
  amountOfReviewsGanttChart: string;
} => {
  const highestTimeToClose = Math.max(
    ...prs.map(({ timeToClose }) => timeToClose ?? 0),
  );
  const highestTimeToFirstReview = Math.max(
    ...prs.map(({ timeToFirstReview }) => timeToFirstReview ?? 0),
  );

  const timeToCloseGantt: GanttMatch = [];
  const timeToFirstReviewGantt: GanttMatch = [];
  const amountOfReviews: GanttMatch = [];

  // Generate gantt chart per PR
  for (const pr of prs) {
    if (pr.timeToClose && pr.timeToClose > 0) {
      timeToCloseGantt.push([
        pr.number,
        `${pr.timeToClose} : 0, ${pr.timeToClose}`,
      ]);
    }
    if (pr.timeToFirstReview && pr.timeToFirstReview > 0) {
      timeToFirstReviewGantt.push([
        pr.number,
        `${pr.timeToFirstReview} : 0, ${pr.timeToFirstReview}`,
      ]);
    }
    amountOfReviews.push([
      pr.number,
      `${pr.nrOfReviews} : 0, ${pr.nrOfReviews}`,
    ]);
  }

  const timeToCloseGanttChart = `\`\`\`mermaid
    gantt
      title Time to close PR (hours)
      dateFormat X
      axisFormat %s
      ${timeToCloseGantt
        .map(([number, msg]) => `section #${number}\n      ${msg}`)
        .join("\n      ")}
  \`\`\``;

  const timeToFirstReviewGanttChart = `\`\`\`mermaid
    gantt
      title Time to first review (hours)
      dateFormat X
      axisFormat %s
      ${timeToFirstReviewGantt
        .map(([number, msg]) => `section #${number}\n      ${msg}`)
        .join("\n      ")}
  \`\`\``;

  const amountOfReviewsGanttChart = `\`\`\`mermaid
    gantt
      title Amount of reviews
      dateFormat X
      axisFormat %s
      ${amountOfReviews
        .map(([number, msg]) => `section #${number}\n      ${msg}`)
        .join("\n      ")}
  \`\`\``;

  return {
    timeToCloseGanttChart,
    timeToFirstReviewGanttChart,
    amountOfReviewsGanttChart,
  };
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
