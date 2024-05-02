import { debug, error, info, warning } from "@actions/core";
import moment from "moment";
import { average, median } from "simple-statistics";

import { ActionLogger } from "./github/types";
import { MonthMetrics, MonthWithMatch } from "./report/types";
import { toTotalMetrics } from "./report/utils";

export function generateCoreLogger(): ActionLogger {
  return { info, debug, warn: warning, error };
}

/**
 * Extract the matches calculated from a date
 * @param dates An object that extends { date: string } with it's own custom value
 * @param getAmount The method to extract such custom value from the object to add to the metrics
 * @returns Returns an array of tuples - a month in the "MM YY" format and a corresponding number of matches.
 */
export const extractMatchesFromDate = <T extends { date: string }>(
  dates: T[],
  getAmount: (value: T) => number,
): MonthWithMatch[] => {
  if (dates.length === 0) {
    return [];
  }
  dates.sort((a, b) => (a.date > b.date ? 1 : -1));

  // We get the month of the first date
  let currentMonth = moment(dates[0].date).startOf("month");

  const monthsWithMatches: MonthWithMatch[] = [];

  let currentMonthValues: number[] = [];
  for (const dateObj of dates) {
    const amountToAdd = getAmount(dateObj);
    // If it happened in the same month
    if (currentMonth.diff(moment(dateObj.date), "month") == 0) {
      currentMonthValues.push(amountToAdd);
    } else {
      // We simply add the total amount
      const matches = currentMonthValues.reduce((a, b) => a + b, 0);
      // We push the previous match and reset it
      monthsWithMatches.push([currentMonth.format("MMM YYYY"), matches]);

      // We change the currentMonth variable to the following one
      currentMonth = moment(dateObj.date).startOf("month");

      // We reset the collection of time with the new value
      currentMonthValues = [amountToAdd];
    }
  }

  return monthsWithMatches;
};

/**
 * Calculates how many times a date is repeated in a given month
 */
export const calculateEventsPerMonth = (dates: string[]): MonthWithMatch[] =>
  extractMatchesFromDate(
    dates.map((date) => {
      return { date };
    }),
    () => 1,
  );

/**
 * Extract the median and averages values calculated from a date
 * @param dates An object that extends { date: string } with it's own custom value
 * @param getAmount The method to extract such custom value from the object to add to the metrics
 * @returns Returns an array of { month: string; median: number; average: number } - a month in
 * the "MM YY" format and the median and average per month.
 */
export const gatherValuesPerMonth = <T extends { date: string }>(
  dates: T[],
  getAmount: (value: T) => number,
): MonthMetrics[] => {
  if (dates.length === 0) {
    return [];
  }
  dates.sort((a, b) => (a.date > b.date ? 1 : -1));

  // We get the month of the first date
  let currentMonth = moment(dates[0].date).startOf("month");

  const monthsWithMatches: MonthMetrics[] = [];

  let currentMonthValues: number[] = [];
  for (const dateObj of dates) {
    const amountToAdd = getAmount(dateObj);
    // If it happened in the same month
    if (currentMonth.diff(moment(dateObj.date), "month") == 0) {
      currentMonthValues.push(amountToAdd);
    } else {
      // We push the previous match and reset it
      monthsWithMatches.push({
        month: currentMonth.format("MMM YYYY"),
        ...toTotalMetrics(currentMonthValues)
      });

      // We change the currentMonth variable to the following one
      currentMonth = moment(dateObj.date).startOf("month");

      // We reset the collection of time with the new value
      currentMonthValues = [amountToAdd];
    }
  }

  return monthsWithMatches;
};
