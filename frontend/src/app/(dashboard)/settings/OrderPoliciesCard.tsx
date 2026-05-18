"use client";

import { FileText, Receipt } from "lucide-react";
import { useLanguage } from "@/i18n/language-context";
import { Label } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ConfirmationStyle } from "@/lib/types";

export interface OrderPoliciesValue {
  confirmationStyle: ConfirmationStyle;
  cancellationPolicy: string;
}

interface OrderPoliciesCardProps {
  value: OrderPoliciesValue;
  onChange: (next: OrderPoliciesValue) => void;
}

const CANCELLATION_MAX = 1000;

const CONFIRMATION_OPTIONS: {
  value: ConfirmationStyle;
  labelKey: string;
  descKey: string;
}[] = [
  {
    value: "summary",
    labelKey: "settings.confirmation_summary",
    descKey: "settings.confirmation_summary_desc",
  },
  {
    value: "itemized",
    labelKey: "settings.confirmation_itemized",
    descKey: "settings.confirmation_itemized_desc",
  },
  {
    value: "minimal",
    labelKey: "settings.confirmation_minimal",
    descKey: "settings.confirmation_minimal_desc",
  },
];

export function OrderPoliciesCard({ value, onChange }: OrderPoliciesCardProps) {
  const { t } = useLanguage();

  const patch = (partial: Partial<OrderPoliciesValue>) =>
    onChange({ ...value, ...partial });

  const policyLength = value.cancellationPolicy.length;
  const counterTone =
    policyLength > CANCELLATION_MAX
      ? "text-destructive"
      : policyLength > CANCELLATION_MAX * 0.9
      ? "text-amber-600 dark:text-amber-400"
      : "text-muted-foreground";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          {t("settings.order_policies")}
        </CardTitle>
        <CardDescription>{t("settings.order_policies_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Confirmation style */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
            {t("settings.confirmation_style")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("settings.confirmation_style_desc")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {CONFIRMATION_OPTIONS.map((opt) => {
              const selected = value.confirmationStyle === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => patch({ confirmationStyle: opt.value })}
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

        <Separator />

        {/* Cancellation policy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="cancellationPolicy">
              {t("settings.cancellation_policy")}
            </Label>
            <span className={`text-xs font-mono ${counterTone}`}>
              {policyLength} / {CANCELLATION_MAX}
            </span>
          </div>
          <textarea
            id="cancellationPolicy"
            rows={4}
            maxLength={CANCELLATION_MAX}
            placeholder={t("settings.cancellation_policy_placeholder")}
            value={value.cancellationPolicy}
            onChange={(e) => patch({ cancellationPolicy: e.target.value })}
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>
      </CardContent>
    </Card>
  );
}
