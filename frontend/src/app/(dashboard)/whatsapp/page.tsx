"use client";

import { useEffect, useState, useCallback } from "react";
import { useBusinessStore } from "@/stores/business-store";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SkeletonBlock, FormSkeleton } from "@/components/shared/skeletons";
import { toast } from "sonner";
import {
  Radio,
  CheckCircle2,
  XCircle,
  Circle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { API_BASE } from "@/lib/config";

const WEBHOOK_URL = `${API_BASE.replace(/\/api$/, "")}/api/webhook`;

const STEPS = [
  {
    id: 1,
    title: "Create a Meta Developer Account",
    description:
      "Go to developers.facebook.com and sign up (or log in) with your Facebook account. Complete the developer registration process to access the Meta for Developers dashboard.",
    link: { url: "https://developers.facebook.com/", label: "Meta Developer Portal" },
    statusKey: "manual" as const,
  },
  {
    id: 2,
    title: "Create a Facebook App",
    description:
      'In the developer dashboard, click "Create App", select "Business" as the app type, give it a name (e.g., your restaurant name), and submit the creation form. You only need one app per restaurant.',
    link: {
      url: "https://developers.facebook.com/apps/",
      label: "My Apps Dashboard",
    },
    statusKey: "manual" as const,
  },
  {
    id: 3,
    title: "Add the WhatsApp Product",
    description:
      'Inside your new app, click "Add Product" in the sidebar then find and select "WhatsApp". Click "Set up" to add the WhatsApp product to your app. This enables the WhatsApp Cloud API.',
    link: {
      url: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
      label: "WhatsApp Cloud API Docs",
    },
    statusKey: "manual" as const,
  },
  {
    id: 4,
    title: "Get Your Phone Number ID",
    description:
      'Under WhatsApp → API Setup, add your WhatsApp Business phone number. Verify it via SMS or phone call. Once verified, the Phone Number ID appears — copy and paste it below.',
    link: null,
    statusKey: "phoneNumberId" as const,
  },
  {
    id: 5,
    title: "Configure the Webhook",
    description:
      'Under WhatsApp → Configuration, paste the webhook URL and verify token below into the Meta app. Click "Verify and Save" — Meta will send a verification request to our server.',
    link: {
      url: "https://developers.facebook.com/docs/graph-api/webhooks/getting-started",
      label: "Webhooks Guide",
    },
    statusKey: "verifyToken" as const,
  },
  {
    id: 6,
    title: "Enter App Secret & Access Token",
    description:
      'From App Settings → Basic, copy the App Secret. Under WhatsApp → API Setup, click "Generate access token" to get a permanent access token. Paste both below and save.',
    link: null,
    statusKey: "accessToken" as const,
  },
] as const;

export default function WhatsAppPage() {
  const { business, fetchBusiness, updateWhatsApp, rotateVerifyToken, isLoading } =
    useBusinessStore();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    fetchBusiness().then(() => setLoaded(true));
  }, [fetchBusiness]);

  useEffect(() => {
    if (business) {
      setPhoneNumber(business.whatsappPhoneNumber || "");
      setPhoneNumberId(business.whatsappPhoneNumberId || "");
      setVerifyToken(business.whatsappVerifyToken || "");
    }
  }, [business]);

  const onboarding = business?.onboarding;

  const getStepStatus = useCallback(
    (statusKey: (typeof STEPS)[number]["statusKey"]) => {
      if (statusKey === "manual") return "manual";
      if (!onboarding) return "pending";
      if (statusKey === "accessToken") {
        return onboarding.accessToken && onboarding.appSecret
          ? "complete"
          : "pending";
      }
      if (onboarding[statusKey] === true) return "complete";
      return "pending";
    },
    [onboarding]
  );

  const getOverallStatus = () => {
    if (!onboarding) return "loading";
    if (onboarding.isComplete) return "live";
    if (
      onboarding.phoneNumberId ||
      onboarding.accessToken ||
      onboarding.appSecret ||
      onboarding.verifyToken
    ) {
      return "partial";
    }
    return "none";
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success("Copied to clipboard");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateWhatsApp({
        whatsappPhoneNumber: phoneNumber || undefined,
        whatsappPhoneNumberId: phoneNumberId || undefined,
        whatsappAccessToken: accessToken || undefined,
        whatsappAppSecret: appSecret || undefined,
      });
      setAccessToken("");
      setAppSecret("");
      setShowToken(false);
      setShowSecret(false);
      toast.success("WhatsApp credentials saved");
    } catch {
      toast.error("Failed to save credentials");
    } finally {
      setSaving(false);
    }
  };

  const handleRotateVerifyToken = async () => {
    setRotating(true);
    try {
      const newToken = await rotateVerifyToken();
      setVerifyToken(newToken);
      toast.success("Verify token rotated — update it in your Meta app");
    } catch {
      toast.error("Failed to rotate verify token");
    } finally {
      setRotating(false);
    }
  };

  const statusIcon = (status: ReturnType<typeof getStepStatus>) => {
    if (status === "complete")
      return <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />;
    if (status === "manual")
      return <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />;
    return <XCircle className="h-5 w-5 shrink-0 text-muted-foreground/30" />;
  };

  const overallStatus = getOverallStatus();

  if (!loaded || isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <SkeletonBlock className="h-7 w-32" />
            <SkeletonBlock className="mt-1 h-3 w-64" />
          </div>
        </div>
        <SkeletonBlock className="h-px w-full" />
        <FormSkeleton sections={3} fieldsPerSection={3} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Setup</h1>
          <p className="text-sm text-muted-foreground">
            Connect your restaurant to WhatsApp and let the AI assistant handle
            customer orders
          </p>
        </div>
      </div>

      <Separator />

      {/* ── Status Banner ── */}
      <Card
        className={
          overallStatus === "live"
            ? "border-emerald-500/50 bg-emerald-500/5"
            : overallStatus === "partial"
              ? "border-amber-500/50 bg-amber-500/5"
              : "border-muted"
        }
      >
        <CardContent className="flex items-center gap-4 py-4">
          <div className="relative flex h-3 w-3 shrink-0">
            <span
              className={`absolute inset-0 rounded-full ${
                overallStatus === "live"
                  ? "animate-ping bg-emerald-400 opacity-75"
                  : "hidden"
              }`}
            />
            <span
              className={`relative h-3 w-3 rounded-full ${
                overallStatus === "live"
                  ? "bg-emerald-500"
                  : overallStatus === "partial"
                    ? "bg-amber-500"
                    : "bg-muted-foreground/30"
              }`}
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {overallStatus === "live"
                ? "WhatsApp is LIVE"
                : overallStatus === "partial"
                  ? "Partially Configured"
                  : "Not Configured"}
            </p>
            <p className="text-xs text-muted-foreground">
              {overallStatus === "live"
                ? "Your restaurant is receiving real WhatsApp messages. The AI assistant responds automatically."
                : overallStatus === "partial"
                  ? "Some credentials are missing. Complete all 6 steps below to go live."
                  : "Follow the steps below to connect your WhatsApp Business account."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Setup Guide ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            Setup Guide
          </CardTitle>
          <CardDescription>
            Complete these steps in the Meta Developer Portal to connect
            WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {STEPS.map((step) => {
            const status = getStepStatus(step.statusKey);
            const isExpanded = expandedStep === step.id;

            return (
              <div
                key={step.id}
                className="rounded-lg border border-transparent hover:border-border/50 transition-colors"
              >
                <button
                  onClick={() =>
                    setExpandedStep(isExpanded ? null : step.id)
                  }
                  className="flex w-full items-center gap-3 px-3 py-3 text-left"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {step.id}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{step.title}</p>
                  </div>
                  {statusIcon(status)}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-4 space-y-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>

                    {/* Step 5: show webhook URL + verify token */}
                    {step.id === 5 && (
                      <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            Webhook Callback URL
                          </Label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 rounded bg-background px-2.5 py-1.5 text-xs font-mono break-all select-all">
                              {WEBHOOK_URL}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(WEBHOOK_URL, "webhook-url")
                              }
                            >
                              {copiedField === "webhook-url" ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Verify Token</Label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 rounded bg-background px-2.5 py-1.5 text-xs font-mono break-all select-all">
                              {verifyToken || "Not generated yet"}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                verifyToken &&
                                copyToClipboard(verifyToken, "verify-token")
                              }
                              disabled={!verifyToken}
                            >
                              {copiedField === "verify-token" ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 4: show phone number ID input inline */}
                    {step.id === 4 && (
                      <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                        <Label htmlFor="inline-phone-id" className="text-xs">
                          Phone Number ID
                        </Label>
                        <Input
                          id="inline-phone-id"
                          placeholder="123456789012345"
                          value={phoneNumberId}
                          onChange={(e) => setPhoneNumberId(e.target.value)}
                          className="h-9"
                        />
                      </div>
                    )}

                    {/* Step 6: show token + secret fields inline */}
                    {step.id === 6 && (
                      <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="inline-app-secret" className="text-xs">
                            App Secret
                          </Label>
                          <div className="relative">
                            <Input
                              id="inline-app-secret"
                              type={showSecret ? "text" : "password"}
                              placeholder="a1b2c3d4e5f6..."
                              value={appSecret}
                              onChange={(e) =>
                                setAppSecret(e.target.value)
                              }
                              className="h-9 pr-9"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSecret(!showSecret)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showSecret ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="inline-access-token"
                            className="text-xs"
                          >
                            Permanent Access Token
                          </Label>
                          <div className="relative">
                            <Input
                              id="inline-access-token"
                              type={showToken ? "text" : "password"}
                              placeholder="EAA..."
                              value={accessToken}
                              onChange={(e) =>
                                setAccessToken(e.target.value)
                              }
                              className="h-9 pr-9"
                            />
                            <button
                              type="button"
                              onClick={() => setShowToken(!showToken)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showToken ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {step.link && (
                      <a
                        href={step.link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                      >
                        {step.link.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Credential Form ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="h-4 w-4" />
            WhatsApp Credentials
          </CardTitle>
          <CardDescription>
            Enter the credentials from your Meta developer app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="wp-phone">WhatsApp Business Phone Number</Label>
            <Input
              id="wp-phone"
              placeholder="+966557171688"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The phone number linked to your WhatsApp Business account
            </p>
          </div>

          {/* Phone Number ID */}
          <div className="space-y-2">
            <Label htmlFor="wp-phone-id">
              Phone Number ID{" "}
              {onboarding?.phoneNumberId && (
                <span className="text-emerald-500 text-xs font-normal ml-1">
                  (configured)
                </span>
              )}
            </Label>
            <Input
              id="wp-phone-id"
              placeholder="123456789012345"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Found under WhatsApp → API Setup in your Meta app
            </p>
          </div>

          {/* App Secret */}
          <div className="space-y-2">
            <Label htmlFor="wp-app-secret">
              App Secret{" "}
              {onboarding?.appSecret && (
                <span className="text-emerald-500 text-xs font-normal ml-1">
                  (configured)
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="wp-app-secret"
                type={showSecret ? "text" : "password"}
                placeholder="a1b2c3d4e5f6..."
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              From App Settings → Basic in your Meta developer app
            </p>
          </div>

          {/* Access Token */}
          <div className="space-y-2">
            <Label htmlFor="wp-access-token">
              Permanent Access Token{" "}
              {onboarding?.accessToken && (
                <span className="text-emerald-500 text-xs font-normal ml-1">
                  (configured)
                </span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="wp-access-token"
                type={showToken ? "text" : "password"}
                placeholder="EAA..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate under WhatsApp → API Setup in your Meta app. Tokens
              expire after 24h unless you verify your business.
            </p>
          </div>

          <Separator />

          {/* Verify Token */}
          <div className="space-y-2">
            <Label htmlFor="wp-verify-token">
              Verify Token{" "}
              {onboarding?.verifyToken && (
                <span className="text-emerald-500 text-xs font-normal ml-1">
                  (configured)
                </span>
              )}
            </Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border bg-muted/50 px-3 py-2 text-sm font-mono break-all select-all">
                {verifyToken || "Not generated yet"}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotateVerifyToken}
                loading={rotating}
              >
                <RefreshCw className="h-4 w-4" />
                Generate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste this token into the Meta webhook configuration. Rotate it
              anytime — make sure to update it in both places.
            </p>
          </div>

          <Separator />

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} loading={saving}>
              Save Credentials
            </Button>
            {overallStatus === "live" && (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                WhatsApp is live
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
