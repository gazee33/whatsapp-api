"use client";

import { useState } from "react";
import { ShoppingCart, Star, EyeOff, X } from "lucide-react";
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

export interface OrderRulesValue {
  minOrderValue: number;
  maxOrderItemCount: number | null;
  featuredItems: string[];
  hiddenItems: string[];
}

interface OrderRulesCardProps {
  value: OrderRulesValue;
  onChange: (next: OrderRulesValue) => void;
  currency?: string;
}

function ChipInput({
  chips,
  onAdd,
  onRemove,
  placeholder,
  chipClassName,
  removeLabel,
}: {
  chips: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  placeholder: string;
  chipClassName: string;
  removeLabel: string;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background p-2 min-h-[44px]">
      {chips.map((c) => (
        <span
          key={c}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium border ${chipClassName}`}
        >
          {c}
          <button
            type="button"
            onClick={() => onRemove(c)}
            className="rounded-sm p-0.5 opacity-70 hover:opacity-100"
            aria-label={removeLabel}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const v = draft.trim();
            if (v && !chips.includes(v)) onAdd(v);
            setDraft("");
          } else if (e.key === "Backspace" && !draft && chips.length > 0) {
            onRemove(chips[chips.length - 1]);
          }
        }}
        placeholder={placeholder}
        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export function OrderRulesCard({ value, onChange, currency = "SAR" }: OrderRulesCardProps) {
  const { t } = useLanguage();

  const patch = (partial: Partial<OrderRulesValue>) =>
    onChange({ ...value, ...partial });

  const unlimited = value.maxOrderItemCount === null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingCart className="h-4 w-4" />
          {t("settings.order_rules")}
        </CardTitle>
        <CardDescription>{t("settings.order_rules_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Min order value */}
        <div className="space-y-2">
          <Label htmlFor="minOrderValue">{t("settings.min_order_value")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("settings.min_order_value_desc")}
          </p>
          <div className="flex items-center gap-2 max-w-[200px]">
            <Input
              id="minOrderValue"
              type="number"
              min="0"
              step="0.5"
              value={value.minOrderValue}
              onChange={(e) =>
                patch({ minOrderValue: Math.max(0, parseFloat(e.target.value) || 0) })
              }
            />
            <span className="text-xs text-muted-foreground shrink-0">{currency}</span>
          </div>
        </div>

        <Separator />

        {/* Max items per order */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t("settings.max_order_items")}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {unlimited
                  ? t("settings.max_order_items_unlimited_desc")
                  : t("settings.max_order_items_desc")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t("settings.unlimited")}
              </span>
              <Switch
                checked={unlimited}
                onCheckedChange={(v) =>
                  patch({ maxOrderItemCount: v ? null : 10 })
                }
              />
            </div>
          </div>
          {!unlimited && (
            <div className="flex items-center gap-2 pl-0">
              <Input
                type="number"
                min="1"
                max="100"
                value={value.maxOrderItemCount ?? 10}
                onChange={(e) =>
                  patch({
                    maxOrderItemCount: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
                className="max-w-[100px] h-8"
              />
              <span className="text-xs text-muted-foreground">
                {t("settings.items")}
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Featured items */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-muted-foreground" />
            {t("settings.featured_items")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("settings.featured_items_desc")}
          </p>
          <ChipInput
            chips={value.featuredItems}
            onAdd={(v) => patch({ featuredItems: [...value.featuredItems, v] })}
            onRemove={(v) =>
              patch({ featuredItems: value.featuredItems.filter((x) => x !== v) })
            }
            placeholder={t("settings.item_id_placeholder")}
            chipClassName="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900"
            removeLabel={t("settings.remove_item")}
          />
        </div>

        <Separator />

        {/* Hidden items */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            {t("settings.hidden_items")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("settings.hidden_items_desc")}
          </p>
          <ChipInput
            chips={value.hiddenItems}
            onAdd={(v) => patch({ hiddenItems: [...value.hiddenItems, v] })}
            onRemove={(v) =>
              patch({ hiddenItems: value.hiddenItems.filter((x) => x !== v) })
            }
            placeholder={t("settings.item_id_placeholder")}
            chipClassName="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            removeLabel={t("settings.remove_item")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
