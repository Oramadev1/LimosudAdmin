import type { BlockedReservationPeriod } from "@/types/api";

export const DEFAULT_RENTAL_TIME = "10:00";

export function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function endOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

export function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const value = new Date(date);
  value.setHours(hours || 0, minutes || 0, 0, 0);
  return value;
}

export function toDatetimeLocalValue(date: Date, time: string): string {
  const combined = combineDateAndTime(date, time);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${combined.getFullYear()}-${pad(combined.getMonth() + 1)}-${pad(combined.getDate())}T${pad(combined.getHours())}:${pad(combined.getMinutes())}`;
}

export function parseDatetimeLocalValue(value: string): { date: Date; time: string } | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    date: startOfDay(date),
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

export function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

export function isDayBlocked(day: Date, blockedPeriods: BlockedReservationPeriod[]): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  return blockedPeriods.some((period) =>
    rangesOverlap(dayStart, dayEnd, new Date(period.start_datetime), new Date(period.end_datetime)),
  );
}

export function isStartDayDisabled(
  day: Date,
  blockedPeriods: BlockedReservationPeriod[],
  startTime = DEFAULT_RENTAL_TIME,
): boolean {
  const today = startOfDay(new Date());
  if (startOfDay(day) < today) {
    return true;
  }

  const startCandidate = combineDateAndTime(day, startTime);
  const minimumEnd = new Date(startCandidate.getTime() + 60 * 60 * 1000);

  return blockedPeriods.some((period) =>
    rangesOverlap(
      startCandidate,
      minimumEnd,
      new Date(period.start_datetime),
      new Date(period.end_datetime),
    ),
  );
}

export function isEndDayDisabled(
  day: Date,
  startDatetime: Date,
  blockedPeriods: BlockedReservationPeriod[],
  endTime = DEFAULT_RENTAL_TIME,
): boolean {
  if (startOfDay(day) < startOfDay(startDatetime)) {
    return true;
  }

  const endCandidate = combineDateAndTime(day, endTime);
  if (endCandidate <= startDatetime) {
    return true;
  }

  return blockedPeriods.some((period) =>
    rangesOverlap(
      startDatetime,
      endCandidate,
      new Date(period.start_datetime),
      new Date(period.end_datetime),
    ),
  );
}

export function findNextAvailableStartDay(
  from: Date,
  blockedPeriods: BlockedReservationPeriod[],
  startTime = DEFAULT_RENTAL_TIME,
  maxDays = 90,
): Date | null {
  const cursor = startOfDay(from);

  for (let index = 0; index < maxDays; index += 1) {
    if (!isStartDayDisabled(cursor, blockedPeriods, startTime)) {
      return new Date(cursor);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return null;
}

export function findLatestAvailableEndDay(
  startDatetime: Date,
  blockedPeriods: BlockedReservationPeriod[],
  endTime = DEFAULT_RENTAL_TIME,
  maxDays = 90,
): Date | null {
  const cursor = startOfDay(startDatetime);
  let latest: Date | null = null;

  for (let index = 0; index < maxDays; index += 1) {
    if (!isEndDayDisabled(cursor, startDatetime, blockedPeriods, endTime)) {
      latest = new Date(cursor);
    } else if (latest) {
      break;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return latest;
}

export function getCalendarDays(month: Date): Date[] {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}
