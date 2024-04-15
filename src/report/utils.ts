import moment from "moment";

/** Return the difference of two dates as a positive integer */
export const calculateDaysBetweenDates = (
  date1: string,
  date2: string,
): number => Math.abs(moment(date2).diff(date1, "days"));

export const waitUntilTime = async (time: string): Promise<void> => {
  const targetTime = new Date(time);
  return await new Promise<void>((resolve) => {
    const timeDifference = targetTime.getTime() - Date.now();

    if (timeDifference > 0) {
      setTimeout(resolve, timeDifference);
    } else {
      resolve(); // Target time is in the past (or right now)
    }
  });
};

export const secondsToTime = (time: string): string => {
  const targetTime = new Date(time);
  const timeDifference = targetTime.getTime() - Date.now();
  const date = new Date();
  date.setSeconds(timeDifference);
  return date.toISOString().substr(11, 8);
}
