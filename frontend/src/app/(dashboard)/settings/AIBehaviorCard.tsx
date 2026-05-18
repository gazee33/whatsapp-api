"use client";

import { useState } from "react";
import {
  Sparkles,
  Wand2,
  TrendingUp,
  AlertTriangle,
  X,
} from "lucide-react";
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
import type { TonePreset } from "@/lib/types";

export interface AIBehaviorValue {
  tonePreset: TonePreset;
  upsellEnabled: boolean;
  upsellMaxPerOrder: number;
  customInstructions: string;
  escalationKeywords: string[];
}

interface AIBehaviorCardProps {
  value: AIBehaviorValue;
  onChange: (next: AIBehaviorValue) => void;
  fieldError?: { field: string; message: string } | null;
  onClearFieldError?: () => void;
}

const TONE_OPTIONS: { value: TonePreset; labelKey: string; sampleKey: string }[] = [
  { value: "casual", labelKey: "settings.tone_casual", sampleKey: "settings.tone_casual_sample" },
  { value: "formal", labelKey: "settings.tone_formal", sampleKey: "settings.tone_formal_sample" },
  { value: "playful", labelKey: "settings.tone_playful", sampleKey: "settings.tone_playful_sample" },
  { value: "professional", labelKey: "settings.tone_professional", sampleKey: "settings.tone_professional_sample" },
];

const ESCALATION_SUGGESTIONS = ["manager", "refund", "human", "complaint"];
const ESCALATION_MAX = 20;
const CUSTOM_INSTRUCTIONS_MAX = 500;

export function AIBehaviorCard({ value, onChange, fieldError, onClearFieldError }: AIBehaviorCardProps) {
  const { t } = useLanguage();
  const [escalationDraft, setEscalationDraft] = useState("");

  const patch = (partial: Partial<AIBehaviorValue>) => onChange({ ...value, ...partial });

  const addEscalationKeyword = (raw: string) => {
    const k = raw.trim();
    if (!k || value.escalationKeywords.includes(k) || value.escalationKeywords.length >= ESCALATION_MAX) return;
    patch({ escalationKeywords: [...value.escalationKeywords, k] });
    setEscalationDraft("");
  };

  const removeEscalationKeyword = (k: string) => {
    patch({ escalationKeywords: value.escalationKeywords.filter((x) => x !== k) });
  };

  const customLength = value.customInstructions.length;
  const counterTone =
    customLength > CUSTOM_INSTRUCTIONS_MAX
      ? "text-destructive"
      : customLength > CUSTOM_INSTRUCTIONS_MAX * 0.9
      ? "text-amber-600 dark:text-amber-400"
      : "text-muted-foreground";

  const customInstructionsHasError = fieldError?.field === "customInstructions";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          {t("settings.ai_behavior")}
        </CardTitle>
        <CardDescription>{t("settings.ai_behavior_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tone of voice */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Wand2 className="h-3.5 w-3.5 text-muted-foreground" />
            {t("settings.tone_of_voice")}
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TONE_OPTIONS.map((opt) => {
              const selected = value.tonePreset === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => patch({ tonePreset: opt.value })}
                  aria-pressed={selected}
                  className={`group text-start rounded-lg border p-3 transition-all ${
                    selected
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                      : "border-input hover:border-muted-foreground/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t(opt.labelKey)}</span>
                    {selected && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    &ldquo;{t(opt.sampleKey)}&rdquo;
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Upselling */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <Label>{t("settings.upselling")}</Label>
                <p className="text-xs text-muted-foreground">
                  {value.upsellEnabled
                    ? t("settings.upselling_on_desc")
                    : t("settings.upselling_off_desc")}
                </p>
              </div>
            </div>
            <Switch
              checked={value.upsellEnabled}
              onCheckedChange={(v) => patch({ upsellEnabled: v })}
            />
          </div>
          {value.upsellEnabled && (
            <div className="flex items-center gap-2 pl-6">
              <Label htmlFor="upsellMax" className="text-xs">
                {t("settings.upsell_max_per_order")}
              </Label>
              <Input
                id="upsellMax"
                type="number"
                min="1"
                max="5"
                value={value.upsellMaxPerOrder}
                onChange={(e) =>
                  patch({
                    upsellMaxPerOrder: Math.max(1, Math.min(5, parseInt(e.target.value, 10) || 1)),
                  })
                }
                className="max-w-[80px] h-8"
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Escalation triggers */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
            {t("settings.escalation_triggers")}
          </Label>
          <p className="text-xs text-muted-foreground">{t("settings.escalation_triggers_desc")}</p>
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background p-2 min-h-[44px]">
            {value.escalationKeywords.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 px-2 py-1 text-xs font-medium border border-amber-200 dark:border-amber-900"
              >
                {k}
                <button
                  type="button"
                  onClick={() => removeEscalationKeyword(k)}
                  className="hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-sm p-0.5"
                  aria-label={t("settings.remove_keyword")}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={escalationDraft}
              onChange={(e) => setEscalationDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addEscalationKeyword(escalationDraft);
                } else if (e.key === "Backspace" && !escalationDraft && value.escalationKeywords.length > 0) {
                  removeEscalationKeyword(value.escalationKeywords[value.escalationKeywords.length - 1]);
                }
              }}
              placeholder={
                value.escalationKeywords.length === 0
                  ? t("settings.escalation_input_placeholder_empty")
                  : t("settings.escalation_input_placeholder")
              }
              className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {value.escalationKeywords.length === 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">{t("settings.suggested_keywords")}:</span>
              {ESCALATION_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addEscalationKeyword(s)}
                  className="text-xs px-1.5 py-0.5 rounded border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground/60 transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Custom Instructions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="customInstructions" className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              {t("settings.custom_instructions")}
            </Label>
            <span className={`text-xs font-mono ${counterTone}`}>
              {customLength} / {CUSTOM_INSTRUCTIONS_MAX}
            </span>
          </div>
          <textarea
            id="customInstructions"
            rows={5}
            placeholder={t("settings.custom_instructions_placeholder")}
            value={value.customInstructions}
            onChange={(e) => {
              patch({ customInstructions: e.target.value });
              if (customInstructionsHasError) onClearFieldError?.();
            }}
            className={`flex w-full rounded-lg border bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none ${
              customInstructionsHasError
                ? "border-destructive ring-1 ring-destructive/30"
                : "border-input"
            }`}
          />
          {customInstructionsHasError && (
            <p className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {fieldError!.message}
            </p>
          )}
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
            {t("settings.custom_instructions_warning")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
