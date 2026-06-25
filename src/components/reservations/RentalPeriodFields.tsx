"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { formatDate } from "@/lib/format";
import {
  DEFAULT_RENTAL_TIME,
  combineDateAndTime,
  findLatestAvailableEndDay,
  findNextAvailableStartDay,
  getCalendarDays,
  isEndDayDisabled,
  isSameDay,
  isStartDayDisabled,
  parseDatetimeLocalValue,
  startOfDay,
  toDatetimeLocalValue,
} from "@/lib/rental-availability";
import type { BlockedReservationPeriod } from "@/types/api";

type RentalPeriodFieldsProps = {
  startValue: string;
  endValue: string;
  blockedPeriods: BlockedReservationPeriod[];
  vehicleRentable: boolean;
  disabled?: boolean;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function RentalDateCalendar({
  label,
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  isDayDisabled,
  hint,
  disabled,
}: {
  label: string;
  month: Date;
  onMonthChange: (month: Date) => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  isDayDisabled: (day: Date) => boolean;
  hint: string | null;
  disabled?: boolean;
}) {
  const days = useMemo(() => getCalendarDays(month), [month]);
  const today = startOfDay(new Date());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-[#3563E9]/30 hover:text-[#3563E9] disabled:opacity-50"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-28 text-center text-sm font-medium text-gray-700">
            {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(month)}
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:border-[#3563E9]/30 hover:text-[#3563E9] disabled:opacity-50"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} className="text-center text-[11px] font-medium uppercase text-gray-400">
              {weekday}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const inMonth = day.getMonth() === month.getMonth();
            const unavailable = isDayDisabled(day);
            const selected = selectedDate ? isSameDay(day, selectedDate) : false;
            const isToday = isSameDay(day, today);

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={disabled || unavailable || !inMonth}
                onClick={() => onSelectDate(day)}
                className={[
                  "h-9 rounded-lg text-sm transition",
                  !inMonth ? "invisible" : "",
                  unavailable
                    ? "cursor-not-allowed bg-gray-100 text-gray-300 line-through"
                    : selected
                      ? "bg-[#3563E9] font-semibold text-white"
                      : isToday
                        ? "border border-[#3563E9]/40 text-[#3563E9] hover:bg-[#3563E9]/10"
                        : "text-gray-700 hover:bg-[#3563E9]/10 hover:text-[#3563E9]",
                ].join(" ")}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {hint ? <p className="text-xs text-gray-600">{hint}</p> : null}
    </div>
  );
}

export function RentalPeriodFields({
  startValue,
  endValue,
  blockedPeriods,
  vehicleRentable,
  disabled = false,
  onStartChange,
  onEndChange,
}: RentalPeriodFieldsProps) {
  const parsedStart = parseDatetimeLocalValue(startValue);
  const parsedEnd = parseDatetimeLocalValue(endValue);
  const [startTime, setStartTime] = useState(parsedStart?.time ?? DEFAULT_RENTAL_TIME);
  const [endTime, setEndTime] = useState(parsedEnd?.time ?? DEFAULT_RENTAL_TIME);
  const [startMonth, setStartMonth] = useState(parsedStart?.date ?? new Date());
  const [endMonth, setEndMonth] = useState(parsedEnd?.date ?? new Date());

  useEffect(() => {
    if (parsedStart?.time) {
      setStartTime(parsedStart.time);
    }
  }, [parsedStart?.time]);

  useEffect(() => {
    if (parsedEnd?.time) {
      setEndTime(parsedEnd.time);
    }
  }, [parsedEnd?.time]);

  const startDatetime = parsedStart ? combineDateAndTime(parsedStart.date, startTime) : null;

  const nextAvailableStart = useMemo(
    () => findNextAvailableStartDay(new Date(), blockedPeriods, startTime),
    [blockedPeriods, startTime],
  );

  const latestAvailableEnd = useMemo(() => {
    if (!startDatetime) return null;
    return findLatestAvailableEndDay(startDatetime, blockedPeriods, endTime);
  }, [blockedPeriods, endTime, startDatetime]);

  const startHint = !vehicleRentable
    ? "This vehicle cannot be rented until its status changes."
    : nextAvailableStart
      ? `Next available pick-up date: ${formatDate(nextAvailableStart)}`
      : "No available pick-up dates in the next 90 days.";

  const endHint = !startDatetime
    ? "Select a pick-up date first."
    : latestAvailableEnd
      ? `You can return until ${formatDate(latestAvailableEnd)} at ${endTime}.`
      : "No available return dates for the selected pick-up.";

  const handleStartDateSelect = (date: Date) => {
    onStartChange(toDatetimeLocalValue(date, startTime));

    const endDate = parsedEnd?.date ?? null;
    const newStart = combineDateAndTime(date, startTime);

    if (!endDate || combineDateAndTime(endDate, endTime) <= newStart) {
      const suggestedEnd = findLatestAvailableEndDay(newStart, blockedPeriods, endTime);
      if (suggestedEnd) {
        onEndChange(toDatetimeLocalValue(suggestedEnd, endTime));
      } else {
        const fallbackEnd = new Date(newStart);
        fallbackEnd.setDate(fallbackEnd.getDate() + 1);
        onEndChange(toDatetimeLocalValue(fallbackEnd, endTime));
      }
    }
  };

  const handleEndDateSelect = (date: Date) => {
    onEndChange(toDatetimeLocalValue(date, endTime));
  };

  return (
    <div className="md:col-span-2 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Rental dates</h3>
        <p className="mt-1 text-xs text-gray-500">
          Unavailable dates are disabled. Pick an open date on the calendar.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <RentalDateCalendar
            label="Pick-up date"
            month={startMonth}
            onMonthChange={setStartMonth}
            selectedDate={parsedStart?.date ?? null}
            onSelectDate={handleStartDateSelect}
            isDayDisabled={(day) => !vehicleRentable || isStartDayDisabled(day, blockedPeriods, startTime)}
            hint={startHint}
            disabled={disabled}
          />
          <label className="block text-xs font-medium text-gray-600">
            Pick-up time
            <input
              type="time"
              value={startTime}
              disabled={disabled}
              onChange={(event) => {
                const time = event.target.value;
                setStartTime(time);
                if (parsedStart) {
                  onStartChange(toDatetimeLocalValue(parsedStart.date, time));
                }
              }}
              className="admin-input mt-1"
              required
            />
          </label>
        </div>

        <div className="space-y-3">
          <RentalDateCalendar
            label="Return date"
            month={endMonth}
            onMonthChange={setEndMonth}
            selectedDate={parsedEnd?.date ?? null}
            onSelectDate={handleEndDateSelect}
            isDayDisabled={(day) =>
              !vehicleRentable ||
              !startDatetime ||
              isEndDayDisabled(day, startDatetime, blockedPeriods, endTime)
            }
            hint={endHint}
            disabled={disabled || !startDatetime}
          />
          <label className="block text-xs font-medium text-gray-600">
            Return time
            <input
              type="time"
              value={endTime}
              disabled={disabled || !startDatetime}
              onChange={(event) => {
                const time = event.target.value;
                setEndTime(time);
                if (parsedEnd) {
                  onEndChange(toDatetimeLocalValue(parsedEnd.date, time));
                }
              }}
              className="admin-input mt-1"
              required
            />
          </label>
        </div>
      </div>
    </div>
  );
}
