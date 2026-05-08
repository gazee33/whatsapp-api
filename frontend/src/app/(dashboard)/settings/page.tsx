"use client";

import { useEffect, useState } from "react";
import { useBusinessStore } from "@/stores/business-store";
import { useLanguage } from "@/i18n/language-context";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SkeletonBlock, FormSkeleton } from "@/components/shared/skeletons";
import { toast } from "sonner";
import {
  Store,
  Clock,
  MessageSquare,
  Sparkles,
  DollarSign,
  Save,
} from "lucide-react";

const CURRENCIES = [
  { value: "SAR", label: "SAR - Saudi Riyal" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "AED", label: "AED - UAE Dirham" },
];

export default function SettingsPage() {
  const { t } = useLanguage();
  const { settings, fetchSettings, updateSettings, isLoading } =
    useBusinessStore();

  const [name, setName] = useState("");
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const [aiRules, setAiRules] = useState("");
  const [currency, setCurrency] = useState("SAR");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchSettings().then(() => setLoaded(true));
  }, [fetchSettings]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (settings) {
      setName(settings.name || "");
      setOpeningTime(settings.openingTime || "");
      setClosingTime(settings.closingTime || "");
      setWelcomeMsg(settings.welcomeMsg || "");
      setAiRules(settings.aiRules || "");
      setCurrency(settings.currency || "SAR");
    }
  }, [settings]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        name,
        openingTime,
        closingTime,
        welcomeMsg,
        aiRules,
        currency,
      });
      toast.success(t("settings.saved"));
    } catch {
      toast.error(t("settings.save_failed"));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded || isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <SkeletonBlock className="h-7 w-24" />
            <SkeletonBlock className="mt-1 h-3 w-56" />
          </div>
          <SkeletonBlock className="h-9 w-36" />
        </div>
        <SkeletonBlock className="h-px w-full" />
        <FormSkeleton sections={2} fieldsPerSection={3} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("settings.subtitle")}
          </p>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="h-4 w-4" />
          {t("common.save_changes")}
        </Button>
      </div>

      <Separator />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="h-4 w-4" />
              {t("settings.restaurant_details")}
            </CardTitle>
            <CardDescription>
              {t("settings.restaurant_details_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("settings.restaurant_name")}</Label>
              <Input
                id="name"
                placeholder={t("settings.restaurant_name_placeholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="openingTime" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("settings.opening_time")}
                </Label>
                <Input
                  id="openingTime"
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closingTime" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("settings.closing_time")}
                </Label>
                <Input
                  id="closingTime"
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency" className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                {t("settings.currency")}
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder={t("settings.select_currency")} />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              {t("settings.customer_communication")}
            </CardTitle>
            <CardDescription>
              {t("settings.customer_communication_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="welcomeMsg">{t("settings.welcome_message")}</Label>
              <textarea
                id="welcomeMsg"
                rows={3}
                placeholder={t("settings.welcome_message_placeholder")}
                value={welcomeMsg}
                onChange={(e) => setWelcomeMsg(e.target.value)}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aiRules" className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                {t("settings.ai_rules")}
              </Label>
              <textarea
                id="aiRules"
                rows={5}
                placeholder={t("settings.ai_rules_placeholder")}
                value={aiRules}
                onChange={(e) => setAiRules(e.target.value)}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {t("settings.ai_rules_help")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
