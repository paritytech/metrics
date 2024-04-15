import moment from "moment";

/** Return the difference of two dates as a positive integer */
export const calculateDaysBetweenDates = (
  date1: string,
  date2: string,
): number => Math.abs(moment(date2).diff(date1, "days"));
