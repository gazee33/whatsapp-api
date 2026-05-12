"use client";

import { useEffect, useState } from "react";
import { useBusinessStore } from "@/stores/business-store";
import { useLanguage } from "@/i18n/language-context";
import type { DualhookConnection } from "@/lib/types";
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
import { SkeletonBlock } from "@/components/shared/skeletons";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  Plug,
  Unplug,
  Heart,
  AlertTriangle,
  Clock,
  Activity,
} from "lucide-react";
import { API_BASE } from "@/lib/config";

const WEBHOOK_URL = `${API_BASE.replace(/\/api$/, "")}/api/webhook`;

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const axiosErr = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
    return axiosErr.response?.data?.message || axiosErr.response?.data?.error || axiosErr.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

function getHeartbeatColor(status: string | null | undefined): string {
  switch (status) {
    case "OK":
      return "text-emerald-500";
    case "DUE_SOON":
      return "text-amber-500";
    case "OVERDUE":
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
}

function getHeartbeatIcon(status: string | null | undefined) {
  switch (status) {
    case "OK":
      return <Heart className="h-4 w-4 text-emerald-500" />;
    case "DUE_SOON":
      return <Clock className="h-4 w-4 text-amber-500" />;
    case "OVERDUE":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    default:
      return <Heart className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatHeartbeat(dateStr: string | null | undefined): string {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function WhatsAppPage() {
  const {
    business,
    fetchBusiness,
    updateWhatsApp,
    rotateVerifyToken,
    createOnboardingSession,
    confirmHeartbeat,
    disconnectWhatsApp,
    isLoading,
  } = useBusinessStore();

  const { t } = useLanguage();

  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const sessionStatus = searchParams.get("session_status");
    if (sessionStatus === "completed") {
      toast.success(t("whatsapp.connected_banner"));
      fetchBusiness();
    } else if (sessionStatus === "failed") {
      toast.error(t("whatsapp.not_connected_banner"));
    } else if (sessionStatus === "cancelled") {
      toast.info(t("whatsapp.not_connected_desc"));
    }
    // Clean up query params
    if (sessionStatus) {
      const url = new URL(window.location.href);
      url.searchParams.delete("session_status");
      url.searchParams.delete("sessionId");
      url.searchParams.delete("status");
      window.history.replaceState({}, "", url.toString());
    }
  }, [fetchBusiness, t]);

  useEffect(() => {
    fetchBusiness().then(() => setLoaded(true));
  }, [fetchBusiness]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (business) {
      setVerifyToken(business.whatsappVerifyToken || "");
    }
  }, [business]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const session = await createOnboardingSession();
      window.open(session.onboardingUrl, "_blank");
      toast.success(t("whatsapp.connected_desc"));
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to create onboarding session");
      toast.error(msg);
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveAppSecret = async () => {
    setSaving(true);
    try {
      await updateWhatsApp({
        whatsappAppSecret: appSecret || undefined,
      });
      setAppSecret("");
      setShowSecret(false);
      toast.success(t("whatsapp.app_secret_card"));
    } catch {
      toast.error(t("whatsapp.app_secret_desc"));
    } finally {
      setSaving(false);
    }
  };

  const handleRotateVerifyToken = async () => {
    setRotating(true);
    try {
      const newToken = await rotateVerifyToken();
      setVerifyToken(newToken);
      toast.success(t("whatsapp.verify_token"));
    } catch {
      toast.error(t("whatsapp.verify_token"));
    } finally {
      setRotating(false);
    }
  };

  const handleConfirmHeartbeat = async (connectionId: string) => {
    try {
      await confirmHeartbeat(connectionId);
      toast.success(t("whatsapp.heartbeat_label"));
    } catch (err: unknown) {
      const msg = getErrorMessage(err, t("whatsapp.heartbeat_label"));
      toast.error(msg);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    setDisconnectingId(connectionId);
    try {
      await disconnectWhatsApp(connectionId);
      toast.success(t("whatsapp.disconnect"));
    } catch {
      toast.error(t("whatsapp.disconnect"));
    } finally {
      setDisconnectingId(null);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success(t("common.dash"));
  };

  const connections = business?.dualhookConnections || [];
  const hasActiveConnections = connections.some((c) => c.status === "active");

  if (!loaded || isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <SkeletonBlock className="h-7 w-32" />
            <SkeletonBlock className="mt-1 h-3 w-64" />
          </div>
        </div>
        <SkeletonBlock className="h-16 w-full" />
        <SkeletonBlock className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("whatsapp.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("whatsapp.subtitle")}
          </p>
        </div>
      </div>

      <Separator />

      {/* ── Status Banner ── */}
      <Card
        className={
          hasActiveConnections
            ? "border-emerald-500/50 bg-emerald-500/5"
            : "border-muted"
        }
      >
        <CardContent className="flex items-center gap-4 py-4">
          <div className="relative flex h-3 w-3 shrink-0">
            {hasActiveConnections && (
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative h-3 w-3 rounded-full ${
                hasActiveConnections
                  ? "bg-emerald-500"
                  : "bg-muted-foreground/30"
              }`}
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {hasActiveConnections
                ? t("whatsapp.connected_banner")
                : t("whatsapp.not_connected_banner")}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasActiveConnections
                ? t("whatsapp.connected_desc")
                : t("whatsapp.not_connected_desc")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── DualHook Connection Card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="h-4 w-4" />
            {t("whatsapp.connection_card")}
          </CardTitle>
          <CardDescription>
            {t("whatsapp.connection_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections.length > 0 ? (
            <div className="space-y-4">
              {connections.map((conn: DualhookConnection) => (
                <div
                  key={conn.id}
                  className={`rounded-lg border p-4 ${
                    conn.status === "active"
                      ? "border-emerald-500/30"
                      : "border-muted-foreground/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        {conn.status === "active" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium text-sm">
                          {conn.verifiedName || conn.displayPhoneNumber || "WhatsApp Number"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                                                <div>
                          {t("whatsapp.phone_label")}: {" "}
                          <span className="font-mono text-foreground">
                            {conn.displayPhoneNumber || "N/A"}
                          </span>
                        </div>
                                                <div>
                          {t("whatsapp.mode_label")}: {" "}
                          <span className="capitalize">
                            {conn.connectionMode || "unknown"}
                          </span>
                        </div>
                                                <div>
                          {t("whatsapp.waba_label")}: {" "}
                          <span className="font-mono text-foreground">
                            {conn.wabaId?.slice(0, 12) ?? "N/A"}...
                          </span>
                        </div>
                                                <div>
                          {t("whatsapp.phone_id_label")}: {" "}
                          <span className="font-mono text-foreground">
                            {conn.phoneNumberId?.slice(0, 12) ?? "N/A"}...
                          </span>
                        </div>
                      </div>

                      {/* Heartbeat status (coexistence only) */}
                      {conn.connectionMode !== "cloud_api" &&
                        conn.heartbeatStatus && (
                          <div className="flex items-center gap-2 text-xs">
                            {getHeartbeatIcon(conn.heartbeatStatus)}
                            <span
                              className={getHeartbeatColor(
                                conn.heartbeatStatus
                              )}
                            >
                              {t("whatsapp.heartbeat_label")}: {conn.heartbeatStatus}
                            </span>
                            {conn.heartbeatNextDueAt && (
                              <span className="text-muted-foreground">
                                {t("whatsapp.due_prefix")} {formatHeartbeat(conn.heartbeatNextDueAt)}
                              </span>
                            )}
                          </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      {conn.status === "active" &&
                        conn.connectionMode !== "cloud_api" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleConfirmHeartbeat(conn.id)
                            }
                          >
                            <Activity className="h-3.5 w-3.5 mr-1" />
                            {t("whatsapp.opened_whatsapp")}
                          </Button>
                        )}
                      {conn.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(conn.id)}
                          loading={disconnectingId === conn.id}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Unplug className="h-3.5 w-3.5 mr-1" />
                          {t("whatsapp.disconnect")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Plug className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{t("whatsapp.no_connection")}</p>
            </div>
          )}

          <Button
            onClick={handleConnect}
            loading={connecting}
            className="w-full"
            variant={hasActiveConnections ? "outline" : "default"}
          >
            {hasActiveConnections
              ? t("whatsapp.connect_another")
              : t("whatsapp.connect")}
          </Button>
        </CardContent>
      </Card>

      {/* ── Webhook Info ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ExternalLink className="h-4 w-4" />
            {t("whatsapp.webhook_config")}
          </CardTitle>
          <CardDescription>
            {t("whatsapp.webhook_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">{t("whatsapp.webhook_url")}</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border bg-muted/50 px-3 py-2 text-sm font-mono break-all select-all">
                {WEBHOOK_URL}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(WEBHOOK_URL, "webhook-url")}
              >
                {copiedField === "webhook-url" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{t("whatsapp.verify_token")}</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border bg-muted/50 px-3 py-2 text-sm font-mono break-all select-all">
                {verifyToken || t("whatsapp.not_generated")}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotateVerifyToken}
                loading={rotating}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t("whatsapp.rotate")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── App Secret (for Meta signature verification) ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <EyeOff className="h-4 w-4" />
            {t("whatsapp.app_secret_card")}
          </CardTitle>
          <CardDescription>
            {t("whatsapp.app_secret_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="app-secret">
              {t("whatsapp.app_secret_label")}{" "}
              {business?.onboarding?.appSecret && (
                <span className="text-emerald-500 text-xs font-normal ml-1">
                  ({t("whatsapp.configured")})
                </span>
              )}
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="app-secret"
                  type={showSecret ? "text" : "password"}
                  placeholder={t("whatsapp.placeholder_secret")}
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
              <Button onClick={handleSaveAppSecret} loading={saving}>
                {t("common.save_changes")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
