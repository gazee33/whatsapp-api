"use client";

import { useState } from "react";
import { Clock, CalendarOff, X } from "lucide-react";
import { useLanguage } from "@/i18n/language-context";
import { Input, Label } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import type { DaySchedule, AfterHoursPolicy } from "@/lib/types";

export interface OperatingHoursValue {
  weeklySchedule: DaySchedule[];
  closureExceptions: string[];
  afterHoursPolicy: AfterHoursPolicy;
}

interface OperatingHoursCardProps {
  value: OperatingHoursValue;
  onChange: (next: OperatingHoursValue) => void;
}

const DEFAULT_DAYS: DaySchedule[] = [
  { day: "mon", open: true, from: "09:00", to: "22:00" },
  { day: "tue", open: true, from: "09:00", to: "22:00" },
  { day: "wed", open: true, from: "09:00", to: "22:00" },
  { day: "thu", open: true, from: "09:00", to: "22:00" },
  { day: "fri", open: true, from: "09:00", to: "22:00" },
  { day: "sat", open: true, from: "09:00", to: "22:00" },
  { day: "sun", open: false, from: "09:00", to: "22:00" },
];

const DAY_LABEL_KEYS: Record<string, string> = {
  mon: "settings.day_mon",
  tue: "settings.day_tue",
  wed: "settings.day_wed",
  thu: "settings.day_thu",
  fri: "settings.day_fri",
  sat: "settings.day_sat",
  sun: "settings.day_sun",
};

const AFTER_HOURS_OPTIONS: { value: AfterHoursPolicy; labelKey: string; descKey: string }[] = [
  {
    value: "inform_only",
    labelKey: "settings.after_hours_inform_only",
    descKey: "settings.after_hours_inform_only_desc",
  },
  {
    value: "collect_order",
    labelKey: "settings.after_hours_collect_order",
    descKey: "settings.after_hours_collect_order_desc",
  },
  {
    value: "silence",
    labelKey: "settings.after_hours_silence",
    descKey: "settings.after_hours_silence_desc",
  },
];

export function OperatingHoursCard({ value, onChange }: OperatingHoursCardProps) {
  const { t } = useLanguage();
  const [exceptionDraft, setExceptionDraft] = useState("");

  const schedule = value.weeklySchedule.length > 0 ? value.weeklySchedule : DEFAULT_DAYS;

  const patch = (partial: Partial<OperatingHoursValue>) =>
    onChange({ ...value, ...partial });

  const updateDay = (index: number, changes: Partial<DaySchedule>) => {
    const next = schedule.map((d, i) => (i === index ? { ...d, ...changes } : d));
    patch({ weeklySchedule: next });
  };

  const addException = (raw: string) => {
    const d = raw.trim();
    if (!d || value.closureExceptions.includes(d)) return;
    // Basic date format check: YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    patch({ closureExceptions: [...value.closureExceptions, d] });
    setExceptionDraft("");
  };

  const removeException = (d: string) => {
    patch({ closureExceptions: value.closureExceptions.filter((x) => x !== d) });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          {t("settings.operating_hours")}
        </CardTitle>
        <CardDescription>{t("settings.operating_hours_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Per-day schedule */}
        <div className="space-y-2">
          <Label>{t("settings.weekly_schedule")}</Label>
          <div className="rounded-lg border divide-y">
            {schedule.map((day, index) => (
              <div
                key={day.day}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <Switch
                  checked={day.open}
                  onCheckedChange={(v) => updateDay(index, { open: v })}
                  aria-label={t(DAY_LABEL_KEYS[day.day] ?? day.day)}
                />
                <span className="w-10 text-sm font-medium shrink-0">
                  {t(DAY_LABEL_KEYS[day.day] ?? day.day)}
                </span>
                {day.open ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={day.from}
                      onChange={(e) => updateDay(index, { from: e.target.value })}
                      className="h-8 w-[110px]"
                      aria-label={t("settings.from_time")}
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <Input
                      type="time"
                      value={day.to}
                      onChange={(e) => updateDay(index, { to: e.target.value })}
                      className="h-8 w-[110px]"
                      aria-label={t("settings.to_time")}
                    />
                  </div>
                ) : (
                  <span className="flex-1 text-xs text-muted-foreground italic">
                    {t("settings.day_closed")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Closure exceptions */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <CalendarOff className="h-3.5 w-3.5 text-muted-foreground" />
            {t("settings.closure_exceptions")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("settings.closure_exceptions_desc")}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background p-2 min-h-[44px]">
            {value.closureExceptions.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 px-2 py-1 text-xs font-medium border border-rose-200 dark:border-rose-900"
              >
                {d}
                <button
                  type="button"
                  onClick={() => removeException(d)}
                  className="hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-sm p-0.5"
                  aria-label={t("settings.remove_exception")}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={exceptionDraft}
              onChange={(e) => setExceptionDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addException(exceptionDraft);
                } else if (
                  e.key === "Backspace" &&
                  !exceptionDraft &&
                  value.closureExceptions.length > 0
                ) {
                  removeException(
                    value.closureExceptions[value.closureExceptions.length - 1]
                  );
                }
              }}
              placeholder={t("settings.closure_exceptions_placeholder")}
              className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <Separator />

        {/* After-hours policy */}
        <div className="space-y-2">
          <Label>{t("settings.after_hours_policy")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("settings.after_hours_policy_desc")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {AFTER_HOURS_OPTIONS.map((opt) => {
              const selected = value.afterHoursPolicy === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => patch({ afterHoursPolicy: opt.value })}
                  aria-pressed={selected}
                  className={`text-start rounded-lg border p-3 transition-all ${
                    selected
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                      : "border-input hover:border-muted-foreground/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t(opt.labelKey)}</span>
                    {selected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(opt.descKey)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
