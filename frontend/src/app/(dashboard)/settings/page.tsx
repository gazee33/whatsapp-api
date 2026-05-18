"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBusinessStore } from "@/stores/business-store";
import { useLanguage } from "@/i18n/language-context";
import { AIBehaviorCard, type AIBehaviorValue } from "./AIBehaviorCard";
import { OperatingHoursCard, type OperatingHoursValue } from "./OperatingHoursCard";
import { OrderRulesCard, type OrderRulesValue } from "./OrderRulesCard";
import { BrandPresenceCard, type BrandPresenceValue } from "./BrandPresenceCard";
import { OrderPoliciesCard, type OrderPoliciesValue } from "./OrderPoliciesCard";
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
import { Switch } from "@/components/ui/switch";
import { SkeletonBlock, FormSkeleton } from "@/components/shared/skeletons";
import { toast } from "sonner";
import {
  Store,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  DollarSign,
  Save,
  Truck,
  Package,
  Utensils,
  Settings2,
  Plus,
  Trash2,
  Route,
} from "lucide-react";
import type { DeliveryTier } from "@/lib/types";

const CURRENCIES = [
  { value: "SAR", label: "SAR - Saudi Riyal" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "AED", label: "AED - UAE Dirham" },
];

const LANGUAGES = [
  { value: "en", labelKey: "settings.english" },
  { value: "ar", labelKey: "settings.arabic" },
];

const DEFAULT_AI_BEHAVIOR: AIBehaviorValue = {
  tonePreset: "casual",
  upsellEnabled: false,
  upsellMaxPerOrder: 1,
  customInstructions: "",
  escalationKeywords: [],
};

const DEFAULT_OPERATING_HOURS: OperatingHoursValue = {
  weeklySchedule: [],
  closureExceptions: [],
  afterHoursPolicy: "inform_only",
};

const DEFAULT_ORDER_RULES: OrderRulesValue = {
  minOrderValue: 0,
  maxOrderItemCount: null,
  featuredItems: [],
  hiddenItems: [],
};

const DEFAULT_BRAND_PRESENCE: BrandPresenceValue = {
  logoUrl: "",
  coverUrl: "",
  mapsUrl: "",
  showAddressByName: false,
};

const DEFAULT_ORDER_POLICIES: OrderPoliciesValue = {
  confirmationStyle: "summary",
  cancellationPolicy: "",
};

export default function SettingsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { settings, fetchSettings, updateSettings, isLoading } =
    useBusinessStore();

  const [name, setName] = useState("");
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const [currency, setCurrency] = useState("SAR");

  // Phase 3 AI Behavior
  const [aiBehavior, setAiBehavior] = useState<AIBehaviorValue>(DEFAULT_AI_BEHAVIOR);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);

  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [dineInEnabled, setDineInEnabled] = useState(true);
  const [pickupEnabled, setPickupEnabled] = useState(true);

  const [deliveryTiers, setDeliveryTiers] = useState<DeliveryTier[]>([]);
  const [maxDeliveryDistanceKm, setMaxDeliveryDistanceKm] = useState("");

  const [estimatedPrepTimeMinutes, setEstimatedPrepTimeMinutes] = useState("");
  const [paymentMethodsStr, setPaymentMethodsStr] = useState("");
  const [isTemporarilyClosed, setIsTemporarilyClosed] = useState(false);
  const [defaultLanguage, setDefaultLanguage] = useState("en");

  // Phase 5 — Operational must-haves
  const [operatingHours, setOperatingHours] = useState<OperatingHoursValue>(DEFAULT_OPERATING_HOURS);
  const [orderRules, setOrderRules] = useState<OrderRulesValue>(DEFAULT_ORDER_RULES);

  // Phase 6 — UX polish
  const [brandPresence, setBrandPresence] = useState<BrandPresenceValue>(DEFAULT_BRAND_PRESENCE);
  const [orderPolicies, setOrderPolicies] = useState<OrderPoliciesValue>(DEFAULT_ORDER_POLICIES);

  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchSettings().then(() => setLoaded(true));
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setName(settings.name || "");
      setOpeningTime(settings.openingTime || "");
      setClosingTime(settings.closingTime || "");
      setWelcomeMsg(settings.welcomeMsg || "");
      setCurrency(settings.currency || "SAR");

      // AI Behavior — fall back to legacy `aiRules` when `customInstructions` is empty
      let parsedEscalation: string[] = [];
      try {
        const ek = JSON.parse(settings.escalationKeywords || "[]");
        if (Array.isArray(ek)) parsedEscalation = ek.filter((k): k is string => typeof k === "string");
      } catch { /* fall through to empty */ }

      setAiBehavior({
        tonePreset: (settings.tonePreset as AIBehaviorValue["tonePreset"]) || "casual",
        upsellEnabled: settings.upsellEnabled ?? false,
        upsellMaxPerOrder: settings.upsellMaxPerOrder ?? 1,
        customInstructions: settings.customInstructions || settings.aiRules || "",
        escalationKeywords: parsedEscalation,
      });

      setAddress(settings.address || "");
      setLatitude(settings.latitude != null ? String(settings.latitude) : "");
      setLongitude(settings.longitude != null ? String(settings.longitude) : "");
      setPhoneNumber(settings.phoneNumber || "");
      setDeliveryEnabled(settings.deliveryEnabled ?? false);
      setDineInEnabled(settings.dineInEnabled ?? true);
      setPickupEnabled(settings.pickupEnabled ?? true);

      try {
        const tiers = JSON.parse(settings.deliveryTiers || "[]");
        setDeliveryTiers(Array.isArray(tiers) ? tiers : []);
      } catch {
        setDeliveryTiers([]);
      }

      setMaxDeliveryDistanceKm(
        settings.maxDeliveryDistanceKm != null
          ? String(settings.maxDeliveryDistanceKm)
          : ""
      );
      setEstimatedPrepTimeMinutes(
        settings.estimatedPrepTimeMinutes != null
          ? String(settings.estimatedPrepTimeMinutes)
          : ""
      );

      try {
        const methods = JSON.parse(settings.paymentMethods || '["cash","card"]');
        setPaymentMethodsStr(Array.isArray(methods) ? methods.join(", ") : "cash, card");
      } catch {
        setPaymentMethodsStr("cash, card");
      }

      setIsTemporarilyClosed(settings.isTemporarilyClosed ?? false);
      setDefaultLanguage(settings.defaultLanguage || "en");

      // Phase 5 — Operational must-haves
      let parsedWeeklySchedule: OperatingHoursValue["weeklySchedule"] = [];
      try {
        const ws = JSON.parse(settings.weeklySchedule || "[]");
        if (Array.isArray(ws)) parsedWeeklySchedule = ws;
      } catch { /* keep default */ }

      let parsedClosureExceptions: string[] = [];
      try {
        const ce = JSON.parse(settings.closureExceptions || "[]");
        if (Array.isArray(ce)) parsedClosureExceptions = ce.filter((x): x is string => typeof x === "string");
      } catch { /* keep default */ }

      let parsedFeaturedItems: string[] = [];
      try {
        const fi = JSON.parse(settings.featuredItems || "[]");
        if (Array.isArray(fi)) parsedFeaturedItems = fi.filter((x): x is string => typeof x === "string");
      } catch { /* keep default */ }

      let parsedHiddenItems: string[] = [];
      try {
        const hi = JSON.parse(settings.hiddenItems || "[]");
        if (Array.isArray(hi)) parsedHiddenItems = hi.filter((x): x is string => typeof x === "string");
      } catch { /* keep default */ }

      setOperatingHours({
        weeklySchedule: parsedWeeklySchedule,
        closureExceptions: parsedClosureExceptions,
        afterHoursPolicy: settings.afterHoursPolicy || "inform_only",
      });

      setOrderRules({
        minOrderValue: settings.minOrderValue ?? 0,
        maxOrderItemCount: settings.maxOrderItemCount ?? null,
        featuredItems: parsedFeaturedItems,
        hiddenItems: parsedHiddenItems,
      });

      // Phase 6 — UX polish
      setBrandPresence({
        logoUrl: settings.logoUrl || "",
        coverUrl: settings.coverUrl || "",
        mapsUrl: settings.mapsUrl || "",
        showAddressByName: settings.showAddressByName ?? false,
      });

      setOrderPolicies({
        confirmationStyle: settings.confirmationStyle || "summary",
        cancellationPolicy: settings.cancellationPolicy || "",
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setFieldError(null);
    try {
      const paymentMethodsArr = paymentMethodsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await updateSettings({
        name,
        openingTime,
        closingTime,
        welcomeMsg,
        currency,
        address: address || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        phoneNumber: phoneNumber || null,
        deliveryEnabled,
        dineInEnabled,
        pickupEnabled,
        deliveryTiers: deliveryTiers.length > 0 ? JSON.stringify(deliveryTiers) : null,
        maxDeliveryDistanceKm: maxDeliveryDistanceKm
          ? parseFloat(maxDeliveryDistanceKm)
          : null,
        estimatedPrepTimeMinutes: estimatedPrepTimeMinutes
          ? parseInt(estimatedPrepTimeMinutes, 10)
          : null,
        paymentMethods: JSON.stringify(paymentMethodsArr),
        isTemporarilyClosed,
        defaultLanguage,
        // Phase 3 — AI Behavior
        tonePreset: aiBehavior.tonePreset,
        upsellEnabled: aiBehavior.upsellEnabled,
        upsellMaxPerOrder: aiBehavior.upsellMaxPerOrder,
        customInstructions: aiBehavior.customInstructions,
        escalationKeywords: JSON.stringify(aiBehavior.escalationKeywords),
        // Phase 5 — Operational must-haves
        weeklySchedule: JSON.stringify(operatingHours.weeklySchedule),
        closureExceptions: JSON.stringify(operatingHours.closureExceptions),
        afterHoursPolicy: operatingHours.afterHoursPolicy,
        minOrderValue: orderRules.minOrderValue,
        maxOrderItemCount: orderRules.maxOrderItemCount,
        featuredItems: JSON.stringify(orderRules.featuredItems),
        hiddenItems: JSON.stringify(orderRules.hiddenItems),
        // Phase 6 — UX polish
        logoUrl: brandPresence.logoUrl || null,
        coverUrl: brandPresence.coverUrl || null,
        mapsUrl: brandPresence.mapsUrl || null,
        showAddressByName: brandPresence.showAddressByName,
        confirmationStyle: orderPolicies.confirmationStyle,
        cancellationPolicy: orderPolicies.cancellationPolicy,
      });

      toast.success(t("settings.saved"), {
        action: {
          label: t("settings.view_in_simulator"),
          onClick: () => router.push("/simulator"),
        },
      });
    } catch (err) {
      const e = err as Error & { field?: string };
      if (e.field) {
        setFieldError({ field: e.field, message: e.message });
        toast.error(e.message);
      } else {
        toast.error(e.message || t("settings.save_failed"));
      }
    } finally {
      setSaving(false);
    }
  };

  const addTier = () => {
    const lastMax = deliveryTiers.length > 0 ? deliveryTiers[deliveryTiers.length - 1].maxKm : 0;
    setDeliveryTiers([...deliveryTiers, { maxKm: lastMax + 5, fee: 0 }]);
  };

  const updateTier = (index: number, field: keyof DeliveryTier, value: number) => {
    const tiers = [...deliveryTiers];
    tiers[index] = { ...tiers[index], [field]: value };
    setDeliveryTiers(tiers);
  };

  const removeTier = (index: number) => {
    setDeliveryTiers(deliveryTiers.filter((_, i) => i !== index));
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
        {/* Basic Info */}
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

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {t("settings.address")}
              </Label>
              <Input
                id="address"
                placeholder={t("settings.address_placeholder")}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t("settings.address_desc")}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">{t("settings.latitude")}</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">{t("settings.longitude")}</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {t("settings.phone_number")}
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder={t("settings.phone_number_placeholder")}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Phase 6 — Brand Presence (after basic info) */}
        <BrandPresenceCard value={brandPresence} onChange={setBrandPresence} />

        {/* Order Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              {t("settings.order_types")}
            </CardTitle>
            <CardDescription>
              {t("settings.order_types_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>{t("settings.delivery")}</Label>
                </div>
              </div>
              <Switch
                checked={deliveryEnabled}
                onCheckedChange={setDeliveryEnabled}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Utensils className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>{t("settings.dine_in")}</Label>
                </div>
              </div>
              <Switch
                checked={dineInEnabled}
                onCheckedChange={setDineInEnabled}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Store className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>{t("settings.pickup")}</Label>
                </div>
              </div>
              <Switch
                checked={pickupEnabled}
                onCheckedChange={setPickupEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Phase 5 — Order Rules (after order types) */}
        <OrderRulesCard
          value={orderRules}
          onChange={setOrderRules}
          currency={currency}
        />

        {deliveryEnabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Route className="h-4 w-4" />
                {t("settings.delivery_tiers")}
              </CardTitle>
              <CardDescription>
                {t("settings.delivery_tiers_desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deliveryTiers.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("settings.delivery_no_tiers")}</p>
              )}
              {deliveryTiers.map((tier, index) => (
                <div key={index} className="flex items-start gap-2 rounded-lg border p-3">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("settings.delivery_max_km")}</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        value={tier.maxKm}
                        onChange={(e) => updateTier(index, "maxKm", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("settings.delivery_fee_sar")}</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        value={tier.fee}
                        onChange={(e) => updateTier(index, "fee", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-5 shrink-0 text-destructive"
                    onClick={() => removeTier(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addTier}>
                <Plus className="h-4 w-4" />
                {t("settings.delivery_add_tier")}
              </Button>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="maxDistance">{t("settings.delivery_max_distance")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="maxDistance"
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder={t("settings.delivery_max_distance_km")}
                    value={maxDeliveryDistanceKm}
                    onChange={(e) => setMaxDeliveryDistanceKm(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <span className="text-xs text-muted-foreground">{t("settings.delivery_km_unit")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Operations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="h-4 w-4" />
              {t("settings.operations")}
            </CardTitle>
            <CardDescription>
              {t("settings.operations_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prepTime">{t("settings.prep_time")}</Label>
                <Input
                  id="prepTime"
                  type="number"
                  min="1"
                  placeholder={t("settings.prep_time_placeholder")}
                  value={estimatedPrepTimeMinutes}
                  onChange={(e) => setEstimatedPrepTimeMinutes(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultLanguage">{t("settings.default_language")}</Label>
                <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                  <SelectTrigger id="defaultLanguage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {t(l.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethods">{t("settings.payment_methods")}</Label>
              <Input
                id="paymentMethods"
                placeholder={t("settings.payment_methods_placeholder")}
                value={paymentMethodsStr}
                onChange={(e) => setPaymentMethodsStr(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>{t("settings.temporarily_closed")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("settings.temporarily_closed_desc")}
                </p>
              </div>
              <Switch
                checked={isTemporarilyClosed}
                onCheckedChange={setIsTemporarilyClosed}
              />
            </div>
          </CardContent>
        </Card>

        {/* Phase 5 — Operating Hours */}
        <OperatingHoursCard value={operatingHours} onChange={setOperatingHours} />

        {/* Customer Communication */}
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
          </CardContent>
        </Card>

        {/* Phase 6 — Order Policies */}
        <OrderPoliciesCard value={orderPolicies} onChange={setOrderPolicies} />

        {/* Phase 3 — AI Behavior */}
        <AIBehaviorCard
          value={aiBehavior}
          onChange={setAiBehavior}
          fieldError={fieldError}
          onClearFieldError={() => setFieldError(null)}
        />
      </div>
    </div>
  );
}
