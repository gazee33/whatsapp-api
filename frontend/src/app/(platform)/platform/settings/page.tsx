"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Save,
  Brain,
  Puzzle,
  FileText,
  Activity,
  ArrowUp,
  ArrowDown,
  Shield,
  Headset,
  X,
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

  // Prompt sections
  const [enableCustomPrompt, setEnableCustomPrompt] = useState(false);
  const [promptVersion, setPromptVersion] = useState("1.0");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [identityTemplate, setIdentityTemplate] = useState("");
  const [workflowTemplate, setWorkflowTemplate] = useState("");
  const [guardrailsTemplate, setGuardrailsTemplate] = useState("");
  const [toolsTemplate, setToolsTemplate] = useState("");
  const [interactiveTemplate, setInteractiveTemplate] = useState("");

  // Manager Assistant prompt sections (platform-level)
  const [managerEnabled, setManagerEnabled] = useState(false);
  const [managerIdentityTemplate, setManagerIdentityTemplate] = useState("");
  const [managerWorkflowTemplate, setManagerWorkflowTemplate] = useState("");
  const [managerGuardrailsTemplate, setManagerGuardrailsTemplate] = useState("");
  const [managerToolsTemplate, setManagerToolsTemplate] = useState("");

  // Tenant rule validation (Phase 3)
  const [forbiddenPatterns, setForbiddenPatterns] = useState<string>("[]");
  const [maxCustomRuleLength, setMaxCustomRuleLength] = useState<string>("500");

  // Phase 7: provider failover order + global forbidden words
  const [providerFailoverOrder, setProviderFailoverOrder] = useState<string[]>([]);
  const [globalForbiddenWords, setGlobalForbiddenWords] = useState<string[]>([]);
  const [forbiddenWordInput, setForbiddenWordInput] = useState("");

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
      setIdentityTemplate(config.identityTemplate ?? "");
      setWorkflowTemplate(config.workflowTemplate ?? "");
      setGuardrailsTemplate(config.guardrailsTemplate ?? "");
      setToolsTemplate(config.toolsTemplate ?? "");
      setInteractiveTemplate(config.interactiveTemplate ?? "");
      setManagerEnabled(config.managerEnabled ?? false);
      setManagerIdentityTemplate(config.managerIdentityTemplate ?? "");
      setManagerWorkflowTemplate(config.managerWorkflowTemplate ?? "");
      setManagerGuardrailsTemplate(config.managerGuardrailsTemplate ?? "");
      setManagerToolsTemplate(config.managerToolsTemplate ?? "");
      setForbiddenPatterns(config.forbiddenPatterns ?? "[]");
      setMaxCustomRuleLength(String(config.maxCustomRuleLength ?? 500));
      try {
        const fo = JSON.parse(config.providerFailoverOrder ?? "[]");
        setProviderFailoverOrder(Array.isArray(fo) ? fo : []);
      } catch {
        setProviderFailoverOrder([]);
      }
      try {
        const gfw = JSON.parse(config.globalForbiddenWords ?? "[]");
        setGlobalForbiddenWords(Array.isArray(gfw) ? gfw : []);
      } catch {
        setGlobalForbiddenWords([]);
      }
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

  const SECTION_DEFAULTS = {
    identityTemplate: "",
    workflowTemplate: "",
    guardrailsTemplate: "",
    toolsTemplate: "",
    interactiveTemplate: "",
  } as const;

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
        promptTemplate: parsed ? JSON.stringify(parsed) : promptTemplate,
        identityTemplate,
        workflowTemplate,
        guardrailsTemplate,
        toolsTemplate,
        interactiveTemplate,
        managerEnabled,
        managerIdentityTemplate,
        managerWorkflowTemplate,
        managerGuardrailsTemplate,
        managerToolsTemplate,
        forbiddenPatterns,
        maxCustomRuleLength: parseInt(maxCustomRuleLength, 10) || 500,
        providerFailoverOrder: JSON.stringify(providerFailoverOrder),
        globalForbiddenWords: JSON.stringify(globalForbiddenWords),
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
    maxToolIterations, featureFlags, enableCustomPrompt, promptTemplate,
    identityTemplate, workflowTemplate, guardrailsTemplate, toolsTemplate,
    interactiveTemplate, managerEnabled, managerIdentityTemplate,
    managerWorkflowTemplate, managerGuardrailsTemplate, managerToolsTemplate,
    forbiddenPatterns, maxCustomRuleLength,
    providerFailoverOrder, globalForbiddenWords,
    isActive, updateConfig, t,
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

        {/* Prompt Sections */}
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
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground rounded-lg border border-dashed px-3 py-2">
              <span>{t("platform_settings.current_version")}: <span className="font-mono font-medium">{promptVersion}</span></span>
              <span className="text-xs opacity-60">auto-bumped on save</span>
            </div>

            {([
              { key: "identityTemplate", value: identityTemplate, set: setIdentityTemplate, rows: 6, titleKey: "section_identity", descKey: "section_identity_desc", phKey: "section_identity_placeholders" },
              { key: "workflowTemplate", value: workflowTemplate, set: setWorkflowTemplate, rows: 8, titleKey: "section_workflow", descKey: "section_workflow_desc", phKey: "section_workflow_placeholders" },
              { key: "guardrailsTemplate", value: guardrailsTemplate, set: setGuardrailsTemplate, rows: 8, titleKey: "section_guardrails", descKey: "section_guardrails_desc", phKey: "section_guardrails_placeholders" },
              { key: "toolsTemplate", value: toolsTemplate, set: setToolsTemplate, rows: 8, titleKey: "section_tools", descKey: "section_tools_desc", phKey: "section_tools_placeholders" },
              { key: "interactiveTemplate", value: interactiveTemplate, set: setInteractiveTemplate, rows: 8, titleKey: "section_interactive", descKey: "section_interactive_desc", phKey: "section_interactive_placeholders" },
            ] as const).map(({ key, value, set, rows, titleKey, descKey, phKey }) => (
              <div key={key} className="space-y-2 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">{t(`platform_settings.${titleKey}`)}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{t(`platform_settings.${descKey}`)}</p>
                  </div>
                  {value.trim() && (
                    <button
                      type="button"
                      onClick={() => set(SECTION_DEFAULTS[key as keyof typeof SECTION_DEFAULTS])}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                    >
                      {t("platform_settings.reset_section")}
                    </button>
                  )}
                </div>
                <textarea
                  rows={rows}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={`Leave empty to use system default…`}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y font-mono"
                />
                <p className="text-xs text-muted-foreground font-mono">{t(`platform_settings.${phKey}`)}</p>
                {value.trim() && (
                  <div className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Custom override active
                  </div>
                )}
              </div>
            ))}

            {/* Legacy monolithic template — collapsed by default */}
            <details className="group">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground list-none flex items-center gap-1.5 transition-colors">
                <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                {t("platform_settings.template")} (legacy fallback)
              </summary>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm">{t("platform_settings.enable_custom")}</Label>
                    <p className="text-xs text-muted-foreground">{t("platform_settings.enable_custom_desc")}</p>
                  </div>
                  <Switch checked={enableCustomPrompt} onCheckedChange={setEnableCustomPrompt} />
                </div>
                <textarea
                  rows={12}
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  disabled={!enableCustomPrompt}
                  placeholder="JSON template…"
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none font-mono disabled:opacity-40"
                />
                <p className="text-xs text-muted-foreground">{t("platform_settings.available_placeholders")}</p>
              </div>
            </details>
          </CardContent>
        </Card>

        {/* Manager Assistant Prompt */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Headset className="h-4 w-4" />
              Manager Assistant
            </CardTitle>
            <CardDescription>
              System prompt for the manager-side AI agent (talks to restaurant
              owners on WhatsApp, not customers). Placeholders:{" "}
              <code className="text-xs">{"{restaurantName}"}</code>,{" "}
              <code className="text-xs">{"{managerName}"}</code>,{" "}
              <code className="text-xs">{"{businessId}"}</code>,{" "}
              <code className="text-xs">{"{currency}"}</code>,{" "}
              <code className="text-xs">{"{currentDateTime}"}</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Enable Manager Assistant</Label>
                <p className="text-xs text-muted-foreground">
                  When disabled, messages from manager phones are not routed differently.
                </p>
              </div>
              <Switch checked={managerEnabled} onCheckedChange={setManagerEnabled} />
            </div>

            {([
              {
                key: "managerIdentityTemplate",
                value: managerIdentityTemplate,
                set: setManagerIdentityTemplate,
                rows: 6,
                title: "Identity",
                desc: "Who the agent is and the context it operates in.",
              },
              {
                key: "managerWorkflowTemplate",
                value: managerWorkflowTemplate,
                set: setManagerWorkflowTemplate,
                rows: 8,
                title: "Workflow",
                desc: "How the agent handles read vs. write vs. destructive requests.",
              },
              {
                key: "managerGuardrailsTemplate",
                value: managerGuardrailsTemplate,
                set: setManagerGuardrailsTemplate,
                rows: 8,
                title: "Guardrails",
                desc: "Non-overridable rules — confirmation gates, scoping, secrets.",
              },
              {
                key: "managerToolsTemplate",
                value: managerToolsTemplate,
                set: setManagerToolsTemplate,
                rows: 8,
                title: "Tools",
                desc: "Inventory of available manager_* tool families.",
              },
            ] as const).map(({ key, value, set, rows, title, desc }) => (
              <div key={key} className="space-y-2 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">{title}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  {value.trim() && (
                    <button
                      type="button"
                      onClick={() => set("")}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <textarea
                  rows={rows}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder="Leave empty to use system default…"
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y font-mono"
                />
                {value.trim() && (
                  <div className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Custom override active
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tenant Rule Validation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              {t("platform_settings.tenant_validation")}
            </CardTitle>
            <CardDescription>
              {t("platform_settings.tenant_validation_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxCustomRuleLength">{t("platform_settings.max_custom_rule_length")}</Label>
              <Input
                id="maxCustomRuleLength"
                type="number"
                min="50"
                max="5000"
                value={maxCustomRuleLength}
                onChange={(e) => setMaxCustomRuleLength(e.target.value)}
                className="max-w-[200px]"
              />
              <p className="text-xs text-muted-foreground">{t("platform_settings.max_custom_rule_length_desc")}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="forbiddenPatterns">{t("platform_settings.forbidden_patterns")}</Label>
              <textarea
                id="forbiddenPatterns"
                rows={6}
                value={forbiddenPatterns}
                onChange={(e) => setForbiddenPatterns(e.target.value)}
                placeholder='["ignore previous", "skip confirmation", "submit without"]'
                className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y font-mono"
              />
              <p className="text-xs text-muted-foreground">{t("platform_settings.forbidden_patterns_desc")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Provider Failover Order */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4" />
              {t("platform.failover_order.title")}
            </CardTitle>
            <CardDescription>
              {t("platform.failover_order.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Available providers to add */}
            <div className="flex flex-wrap gap-2">
              {["opencode", "gemini", "groq", "openai", "ollama"].map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={providerFailoverOrder.includes(p)}
                  onClick={() => setProviderFailoverOrder((prev) => [...prev, p])}
                  className="rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  + {p}
                </button>
              ))}
            </div>
            {/* Ordered list with move up/down and remove */}
            {providerFailoverOrder.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {t("platform.failover_order.no_providers_selected")}
              </p>
            ) : (
              <ol className="space-y-1.5">
                {providerFailoverOrder.map((p, idx) => (
                  <li
                    key={p}
                    className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2"
                  >
                    <span className="text-xs font-mono text-muted-foreground w-5 text-center">
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium">{p}</span>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() =>
                        setProviderFailoverOrder((prev) => {
                          const next = [...prev];
                          [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                          return next;
                        })
                      }
                      className="p-1 rounded hover:bg-accent disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === providerFailoverOrder.length - 1}
                      onClick={() =>
                        setProviderFailoverOrder((prev) => {
                          const next = [...prev];
                          [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                          return next;
                        })
                      }
                      className="p-1 rounded hover:bg-accent disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setProviderFailoverOrder((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-1 rounded hover:bg-destructive/10 text-destructive"
                      aria-label="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* Global Forbidden Words */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              {t("platform.forbidden_words.title")}
            </CardTitle>
            <CardDescription>
              {t("platform.forbidden_words.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Chip input */}
            <div className="flex gap-2">
              <Input
                placeholder={t("platform.forbidden_words.add_word")}
                value={forbiddenWordInput}
                onChange={(e) => setForbiddenWordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const word = forbiddenWordInput.trim().replace(/,$/, "");
                    if (word && !globalForbiddenWords.includes(word)) {
                      setGlobalForbiddenWords((prev) => [...prev, word]);
                    }
                    setForbiddenWordInput("");
                  }
                }}
                className="max-w-[260px]"
              />
            </div>
            {globalForbiddenWords.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                {t("platform.forbidden_words.no_words")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {globalForbiddenWords.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive"
                  >
                    {word}
                    <button
                      type="button"
                      onClick={() =>
                        setGlobalForbiddenWords((prev) => prev.filter((w) => w !== word))
                      }
                      className="ml-0.5 hover:opacity-70"
                      aria-label={`Remove ${word}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
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
