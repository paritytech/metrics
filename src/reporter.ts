import { summary } from "@actions/core";

import { IssuesMetrics, PullRequestMetrics } from "./report/types";
import { calculateAverage } from "./util";

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

  const totalMedianTimeToClose = calculateAverage(
    prMetrics.monthlyMedians.mergeTime.map(([_, median]) => median),
  );
  const totalMedianTimeToFirstReview = calculateAverage(
    prMetrics.monthlyMedians.timeToFirstReview.map(([_, median]) => median),
  );
  const totalMedianReviews = calculateAverage(
    prMetrics.monthlyMedians.reviews.map(([_, median]) => median),
  );



  const totalAverageTimeToClose = calculateAverage(
    prMetrics.monthlyAverages.mergeTime.map(([_, average]) => average),
  );
  const totalAverageTimeToFirstReview = calculateAverage(
    prMetrics.monthlyAverages.timeToFirstReview.map(([_, average]) => average),
  );
  const totalAverageReviews = calculateAverage(
    prMetrics.monthlyAverages.reviews.map(([_, average]) => average),
  );

  const medianReviews = `\`\`\`mermaid
    gantt
        title Average PR time (days)
        dateFormat  X
        axisFormat %s
        section To close
        Average ${totalAverageTimeToClose} : 0, ${totalAverageTimeToClose}
        Median ${totalMedianTimeToClose} : 0, ${totalMedianTimeToClose}
        section To first review
        Average ${totalAverageTimeToFirstReview} : 0, ${totalAverageTimeToFirstReview}
        Median ${totalMedianTimeToFirstReview} : 0, ${totalMedianTimeToFirstReview}
        section Reviews per PR
        Average ${totalAverageReviews} : 0, ${totalAverageReviews}
        Median ${totalMedianReviews} : 0, ${totalMedianReviews}
  \`\`\``;

  text = text
    .addHeading("PR review median", 3)
    .addEOL()
    .addRaw(medianReviews)
    .addEOL();

  text = text
    .addHeading("Median duration per month", 3)
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Median time to first review (days)",
        prMetrics.monthlyMedians.timeToFirstReview,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Median time to merge (days)",
        prMetrics.monthlyMedians.mergeTime,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Median reviews per PR per month",
        prMetrics.monthlyMedians.reviews,
      ),
    )
    .addEOL();

  const averageReviews = `\`\`\`mermaid
    gantt
        title Average PR time (days)
        dateFormat  X
        axisFormat %s
        section To close
        ${totalAverageTimeToClose} : 0, ${totalAverageTimeToClose}
        section To first review
        ${totalAverageTimeToFirstReview} : 0, ${totalAverageTimeToFirstReview}
        section Reviews per PR
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
        prMetrics.monthlyAverages.timeToFirstReview,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Average time to merge (days)",
        prMetrics.monthlyAverages.mergeTime,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Average reviews per PR per month",
        prMetrics.monthlyAverages.reviews,
      ),
    )
    .addEOL();

  text = text
    .addHeading("Metrics over time", 3)
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "New PRs per month",
        prMetrics.monthlyMetrics.creation,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Merged PRs per month",
        prMetrics.monthlyMetrics.closed,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Lines changed per month",
        prMetrics.monthlyMedians.linesChanged,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Reviews per month",
        prMetrics.monthlyMetrics.reviews,
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

  const totalMedianTimeToClose = calculateAverage(
    issueMetrics.monthlyMedians.closeTime.map(([_, median]) => median),
  );
  const totalMedianTimeToFirstComment = calculateAverage(
    issueMetrics.monthlyMedians.timeToFirstComment.map(([_, median]) => median),
  );
  const totalMedianComments = calculateAverage(
    issueMetrics.monthlyMedians.comments.map(([_, median]) => median),
  );

  const totalAverageTimeToClose = calculateAverage(
    issueMetrics.monthlyAverages.closeTime.map(([_, average]) => average),
  );
  const totalAverageTimeToFirstComment = calculateAverage(
    issueMetrics.monthlyAverages.timeToFirstComment.map(
      ([_, average]) => average,
    ),
  );
  const totalAverageComments = calculateAverage(
    issueMetrics.monthlyAverages.comments.map(([_, average]) => average),
  );

  const medianIssueState = `\`\`\`mermaid
    gantt
        title Average activity time (days)
        dateFormat  X
        axisFormat %s
        section Time to close
        Median : 0, ${totalMedianTimeToClose}
        Average : 0, ${totalAverageTimeToClose}
        section Time to first comment
        Median : 0, ${totalMedianTimeToFirstComment}
        Average : 0, ${totalAverageTimeToFirstComment}
        section Average comments
        ${totalMedianComments} : 0, ${totalMedianComments}
  \`\`\``;

  text = text
    .addHeading("Issue comment median", 3)
    .addEOL()
    .addRaw(medianIssueState)
    .addEOL();

  text = text
    .addHeading("Median duration per month", 3)
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Median time to first comment (days)",
        issueMetrics.monthlyMedians.timeToFirstComment,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Median time to close (days)",
        issueMetrics.monthlyMedians.closeTime,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Median comments per issue per month",
        issueMetrics.monthlyMedians.comments,
      ),
    )
    .addEOL();

  text = text
    .addHeading("Issue comment average", 3)
    .addEOL();

  text = text
    .addHeading("Average duration per month", 3)
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Average time to first comment (days)",
        issueMetrics.monthlyAverages.timeToFirstComment,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Average time to close (days)",
        issueMetrics.monthlyAverages.closeTime,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Average comments per issue per month",
        issueMetrics.monthlyAverages.comments,
      ),
    )
    .addEOL();

  text = text
    .addHeading("Metrics over time", 3)
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "New issues per month",
        issueMetrics.monthlyMetrics.creation,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Closed issues per month",
        issueMetrics.monthlyMetrics.closed,
      ),
    )
    .addEOL()
    .addRaw(
      monthWithMatchToGanttChart(
        "Comments per month",
        issueMetrics.monthlyMetrics.comments,
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
