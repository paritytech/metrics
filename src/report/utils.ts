import moment from "moment";
import { average, median } from "simple-statistics";

import { TotalMetrics } from "./types";

/** Return the difference of two dates as a positive integer */
export const calculateDaysBetweenDates = (
  date1: string,
  date2: string,
): number => Math.abs(moment(date2).diff(date1, "days"));

export const toTotalMetrics = (metrics: number[]): TotalMetrics => {
  if (metrics.length > 0) {
    return {
      median: Math.round(median(metrics)),
      average: Math.round(average(metrics)),
    };
  }

  return {
    median: -1,
    average: -1,
  };
};
