import { debug, error, info, warning } from "@actions/core";
import moment from "moment";

import { DurationWithInitialDate, MonthWithMatch } from "./analytics";
import { ActionLogger } from "./github/types";

export function generateCoreLogger(): ActionLogger {
  return { info, debug, warn: warning, error };
}

export const splitDates = (dates: string[]): MonthWithMatch[] => {
  // We first sort all the dates
  dates.sort();

  console.log("splitDates dates sorted", dates);

  // We get the month of the first date
  const firstMonth = moment(dates[0]).format("MMM YYYY");
  // Using the MMM YYYY without a date converts the date to the beginning of the month
  let currentMonth = moment(firstMonth);

  const monthsWithMatches: MonthWithMatch[] = [];

  let currentMonthWithMatch: MonthWithMatch = { month: firstMonth, matches: 1 };
  for (const date of dates) {
    // If it happened in the same month
    if (currentMonth.diff(moment(date), "month") == 0) {
      currentMonthWithMatch.matches += 1;
    } else {
      // If the new date has more than one month of difference
      // We change the currentMonth variable to the following one
      const newMonth = moment(date).format("MMM YYYY");
      currentMonth = moment(newMonth);

      // We push the previous match and reset it
      monthsWithMatches.push(currentMonthWithMatch);

      currentMonthWithMatch = { month: newMonth, matches: 1 };
    }
  }

  console.log("Matches", monthsWithMatches);

  return monthsWithMatches;
};

export const getAverageAmountPerMonth = (
  dates: DurationWithInitialDate[],
): MonthWithMatch[] => {
  // We first sort all the dates
  dates.sort((a, b) => (a.date > b.date ? 1 : -1));

  console.log("Sorting dates", dates);

  // We get the month of the first date
  let currentMonthName = moment(dates[0].date).format("MMM YYYY");
  // Using the MMM YYYY without a date converts the date to the beginning of the month
  let currentMonth = moment(currentMonthName);

  const monthsWithMatches: MonthWithMatch[] = [];

  let collectionOfTime: number[] = [];
  for (const { date, daysSinceCreation } of dates) {
    // If it happened in the same month
    if (currentMonth.diff(moment(date), "month") == 0) {
      console.log(
        "adding for month %s the value",
        currentMonthName,
        daysSinceCreation,
      );
      collectionOfTime.push(daysSinceCreation);
    } else {
      // We get the average of time
      const averageOfTime = calculateAverage(collectionOfTime);
      // We push the previous match and reset it
      monthsWithMatches.push({
        month: currentMonthName,
        matches: averageOfTime,
      });

      // We change the currentMonth variable to the following one
      currentMonthName = moment(date).format("MMM YYYY");
      currentMonth = moment(currentMonthName);

      // We reset the collection of time with the new value
      collectionOfTime = [daysSinceCreation];

      console.log("New date", currentMonthName, date);
    }
  }

  return monthsWithMatches;
};

/** Calculates the round number average over an array of numbers */
export const calculateAverage = (values: number[]): number =>
  Math.round(values.reduce((a, t) => a + t, 0) / values.length);
