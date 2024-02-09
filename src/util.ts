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

export const splitDatesWithAmount = (
  dates: DurationWithInitialDate[],
): MonthWithMatch[] => {
  // We first sort all the dates
  dates.sort((a, b) => (a.date > b.date ? 1 : -1));

  console.log("Sorting dates", dates);

  // We get the month of the first date
  const firstMonth = moment(dates[0].date).format("MMM YYYY");
  // Using the MMM YYYY without a date converts the date to the beginning of the month
  let currentMonth = moment(firstMonth);

  const monthsWithMatches: MonthWithMatch[] = [];

  let currentMonthWithMatch: MonthWithMatch = { month: firstMonth, matches: 1 };
  for (const {date,hoursSinceCreation} of dates) {
    // If it happened in the same month
    if (currentMonth.diff(moment(date), "month") == 0) {
      currentMonthWithMatch.matches += hoursSinceCreation;
    } else {
      // If the new date has more than one month of difference
      // We change the currentMonth variable to the following one
      const newMonth = moment(date).format("MMM YYYY");
      currentMonth = moment(newMonth);

      console.log("New date", newMonth, date);

      // We push the previous match and reset it
      monthsWithMatches.push(currentMonthWithMatch);

      currentMonthWithMatch = { month: newMonth, matches: 1 };
    }
  }

  return monthsWithMatches;
};
