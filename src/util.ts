import { debug, error, info, warning } from "@actions/core";
import moment from "moment";

import { ActionLogger } from "./github/types";
import { MonthWithMatch } from "./report/types";

export function generateCoreLogger(): ActionLogger {
  return { info, debug, warn: warning, error };
}

/**
 * Extract the matches calculated from a date
 * @param dates An object that extends { date: string } with it's own custom value
 * @param getAmount The method to extract such custom value from the object to add to the metrics
 * @param returnAverage True if the result should be the average for the metrics for a month,
 * false if it must be the accumulation
 * @returns Returns an array of tuples - a month in the "MM YY" format and a corresponding number of matches.
 */
export const extractMatchesFromDate = <T extends { date: string }>(
  dates: T[],
  getAmount: (value: T) => number,
  returnAverage: boolean,
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
      let matches: number;
      // If we have it set to get the average on that time
      if (returnAverage) {
        // We get the average of time
        matches = calculateAverage(currentMonthValues);
      } else {
        // Else, we simply add the total amount
        matches = currentMonthValues.reduce((a, b) => a + b, 0);
      }
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

export const extractMediansFromDate = <T extends { date: string }>(
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

      // We get the element in the center
      const median = currentMonthValues.sort()[Math.round((currentMonthValues.length - 1) / 2)]
      // We push the previous match and reset it
      monthsWithMatches.push([currentMonth.format("MMM YYYY"), median]);

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
    false,
  );

/**
 * Given an array of objects with a date, it returns the average of times a metric occurs
 * @param dates An object with a .date property which is a string and
 * a second property that contains the value to use in average
 * @param getAmount How to extract the value from the given object
 */
export const calculateAveragePerMonth = <T extends { date: string }>(
  datesWithValue: T[],
  getAmount: (value: T) => number,
): MonthWithMatch[] => extractMatchesFromDate(datesWithValue, getAmount, true);



/** Calculates the round number average over an array of numbers */
export const calculateAverage = (values: number[]): number =>
  Math.round(values.reduce((a, t) => a + t, 0) / values.length);
