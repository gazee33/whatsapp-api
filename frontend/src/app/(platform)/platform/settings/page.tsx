"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Save,
  Brain,
  Puzzle,
  FileText,
  Activity,
} from "lucide-react";
import { usePlatformStore } from "@/stores/platform-store";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { SkeletonBlock, FormSkeleton } from "@/components/shared/skeletons";
import { toast } from "sonner";

const LLM_PROVIDERS = [
  { value: "gemini", label: "Gemini" },
  { value: "openai", label: "OpenAI" },
  { value: "ollama", label: "Ollama" },
  { value: "groq", label: "Groq" },
  { value: "opencode", label: "OpenCode" },
  { value: "mock", label: "Mock" },
];

const ALL_FEATURE_FLAGS = [
  "interactiveListMessagesEnabled" as const,
  "interactiveButtonsMessagesEnabled" as const,
  "complaintToolEnabled" as const,
  "orderStatusToolEnabled" as const,
  "flagCustomerToolEnabled" as const,
  "autoUpsellEnabled" as const,
];

type FeatureFlag = (typeof ALL_FEATURE_FLAGS)[number];

const FEATURE_FLAG_META: Record<FeatureFlag, { labelKey: string; descriptionKey: string }> = {
  interactiveListMessagesEnabled: {
    labelKey: "platform_settings.interactive_list",
    descriptionKey: "platform_settings.interactive_list_desc",
  },
  interactiveButtonsMessagesEnabled: {
    labelKey: "platform_settings.interactive_buttons",
    descriptionKey: "platform_settings.interactive_buttons_desc",
  },
  complaintToolEnabled: {
    labelKey: "platform_settings.complaint_tool",
    descriptionKey: "platform_settings.complaint_tool_desc",
  },
  orderStatusToolEnabled: {
    labelKey: "platform_settings.order_status_tool",
    descriptionKey: "platform_settings.order_status_tool_desc",
  },
  flagCustomerToolEnabled: {
    labelKey: "platform_settings.flag_customer_tool",
    descriptionKey: "platform_settings.flag_customer_tool_desc",
  },
  autoUpsellEnabled: {
    labelKey: "platform_settings.auto_upsell",
    descriptionKey: "platform_settings.auto_upsell_desc",
  },
};

const DEFAULT_FEATURE_FLAGS: Record<FeatureFlag, boolean> = {
  interactiveListMessagesEnabled: true,
  interactiveButtonsMessagesEnabled: true,
  complaintToolEnabled: true,
  orderStatusToolEnabled: true,
  flagCustomerToolEnabled: true,
  autoUpsellEnabled: false,
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

export default function PlatformSettingsPage() {
  const { t } = useLanguage();
  const { config, configLoading, configSaving, fetchConfig, updateConfig } =
    usePlatformStore();

  const [loaded, setLoaded] = useState(false);

  // LLM fields
  const [defaultLLMProvider, setDefaultLLMProvider] = useState("opencode");
  const [defaultLLMModel, setDefaultLLMModel] = useState("");
  const [maxTokens, setMaxTokens] = useState("");
  const [temperature, setTemperature] = useState("");
  const [maxToolIterations, setMaxToolIterations] = useState("6");

  // Feature flags (single object)
  const [featureFlags, setFeatureFlags] = useState<Record<FeatureFlag, boolean>>(DEFAULT_FEATURE_FLAGS);

  // Prompt template
  const [enableCustomPrompt, setEnableCustomPrompt] = useState(false);
  const [promptVersion, setPromptVersion] = useState("1.0");
  const [promptTemplate, setPromptTemplate] = useState("");

  // Status
  const [isActive, setIsActive] = useState(true);
  const [createdAt, setCreatedAt] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig().then(() => setLoaded(true));
  }, [fetchConfig]);

  useEffect(() => {
    if (config) {
      setDefaultLLMProvider(config.defaultLLMProvider || "opencode");
      setDefaultLLMModel(config.defaultLLMModel || "");
      setMaxTokens(config.maxTokens != null ? String(config.maxTokens) : "");
      setTemperature(config.temperature != null ? String(config.temperature) : "");
      setMaxToolIterations(String(config.maxToolIterations ?? 6));
      setFeatureFlags({
        interactiveListMessagesEnabled: config.interactiveListMessagesEnabled ?? true,
        interactiveButtonsMessagesEnabled: config.interactiveButtonsMessagesEnabled ?? true,
        complaintToolEnabled: config.complaintToolEnabled ?? true,
        orderStatusToolEnabled: config.orderStatusToolEnabled ?? true,
        flagCustomerToolEnabled: config.flagCustomerToolEnabled ?? true,
        autoUpsellEnabled: config.autoUpsellEnabled ?? false,
      });
      setEnableCustomPrompt(config.enableCustomPrompt ?? false);
      setPromptVersion(config.promptVersion || "1.0");
      setPromptTemplate(formatJson(config.promptTemplate));
      setIsActive(config.isActive ?? true);
      setCreatedAt(config.createdAt || "");
      setUpdatedAt(config.updatedAt || "");
    }
  }, [config]);

  const validate = useCallback((): string | null => {
    if (enableCustomPrompt && promptTemplate.trim()) {
      try {
        JSON.parse(promptTemplate);
      } catch {
        return t("platform_settings.invalid_json");
      }
    }
    return null;
  }, [enableCustomPrompt, promptTemplate, t]);

  const handleSave = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      const parsed = promptTemplate ? JSON.parse(promptTemplate) : null;

      await updateConfig({
        defaultLLMProvider,
        defaultLLMModel: defaultLLMModel || null,
        maxTokens: maxTokens ? parseInt(maxTokens, 10) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        maxToolIterations: parseInt(maxToolIterations, 10) || 6,
        ...featureFlags,
        enableCustomPrompt,
        promptVersion,
        promptTemplate: parsed ? JSON.stringify(parsed) : promptTemplate,
        isActive,
      });
      toast.success(t("platform_settings.saved"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("platform_settings.save_failed");
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [
    validate, defaultLLMProvider, defaultLLMModel, maxTokens, temperature,
    maxToolIterations, featureFlags, enableCustomPrompt, promptVersion,
    promptTemplate, isActive, updateConfig, t,
  ]);

  if (!loaded || configLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <SkeletonBlock className="h-7 w-40" />
            <SkeletonBlock className="mt-1 h-3 w-56" />
          </div>
          <SkeletonBlock className="h-9 w-36" />
        </div>
        <SkeletonBlock className="h-px w-full" />
        <FormSkeleton sections={3} fieldsPerSection={4} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("platform_settings.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("platform_settings.subtitle")}
          </p>
        </div>
        <Button onClick={handleSave} loading={saving || configSaving}>
          <Save className="h-4 w-4" />
          {t("common.save_changes")}
        </Button>
      </div>

      <Separator />

      <div className="space-y-6">
        {/* LLM Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4" />
              {t("platform_settings.llm_config")}
            </CardTitle>
            <CardDescription>
              {t("platform_settings.llm_config_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">{t("platform_settings.provider")}</Label>
              <Select value={defaultLLMProvider} onValueChange={setDefaultLLMProvider}>
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LLM_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">{t("platform_settings.model")}</Label>
              <Input
                id="model"
                placeholder="deepseek-v4-flash"
                value={defaultLLMModel}
                onChange={(e) => setDefaultLLMModel(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxTokens">{t("platform_settings.max_tokens")}</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  min="1"
                  placeholder="4096"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature">{t("platform_settings.temperature")}</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  placeholder="0.7"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxToolIterations">{t("platform_settings.max_tool_iterations")}</Label>
                <Input
                  id="maxToolIterations"
                  type="number"
                  min="1"
                  placeholder="6"
                  value={maxToolIterations}
                  onChange={(e) => setMaxToolIterations(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Puzzle className="h-4 w-4" />
              {t("platform_settings.feature_flags")}
            </CardTitle>
            <CardDescription>
              {t("platform_settings.feature_flags_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ALL_FEATURE_FLAGS.map((key) => {
              const meta = FEATURE_FLAG_META[key];
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-0.5">
                    <Label>{t(meta.labelKey)}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t(meta.descriptionKey)}
                    </p>
                  </div>
                  <Switch
                    checked={featureFlags[key]}
                    onCheckedChange={(v) =>
                      setFeatureFlags((prev) => ({ ...prev, [key]: v }))
                    }
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Prompt Template */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              {t("platform_settings.prompt_template")}
            </CardTitle>
            <CardDescription>
              {t("platform_settings.prompt_template_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>{t("platform_settings.enable_custom")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("platform_settings.enable_custom_desc")}
                </p>
              </div>
              <Switch
                checked={enableCustomPrompt}
                onCheckedChange={setEnableCustomPrompt}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promptVersion">{t("platform_settings.prompt_version")}</Label>
              <Input
                id="promptVersion"
                placeholder="1.0"
                value={promptVersion}
                onChange={(e) => setPromptVersion(e.target.value)}
                disabled={!enableCustomPrompt}
                className="max-w-[200px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promptTemplate">{t("platform_settings.template")}</Label>
              <textarea
                id="promptTemplate"
                rows={16}
                value={promptTemplate}
                onChange={(e) => setPromptTemplate(e.target.value)}
                disabled={!enableCustomPrompt}
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {t("platform_settings.available_placeholders")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              {t("platform_settings.status")}
            </CardTitle>
            <CardDescription>
              {t("platform_settings.status_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>{t("platform_settings.active")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("platform_settings.active_desc")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isActive ? "bg-emerald-500" : "bg-gray-400"
                    }`}
                  />
                  {isActive ? "Live" : "Disabled"}
                </span>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t("platform_settings.created")}:</span>
                <p className="font-medium">{createdAt ? formatDate(createdAt) : t("common.dash")}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("platform_settings.updated")}:</span>
                <p className="font-medium">{updatedAt ? formatDate(updatedAt) : t("common.dash")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
