"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Edit,
  Trash2,
  Building2,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  BarChart3,
  Check,
} from "lucide-react";
import { usePlatformStore } from "@/stores/platform-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SkeletonBlock, StatsSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatDate, ORDER_STATUS_CONFIG } from "@/lib/utils";

const STATUS_BAR_COLORS: Record<string, string> = {
  pending: "bg-yellow-400",
  confirmed: "bg-blue-400",
  preparing: "bg-purple-400",
  ready: "bg-green-400",
  delivered: "bg-emerald-400",
  cancelled: "bg-red-400",
};

export default function BusinessDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const currentBusiness = usePlatformStore((s) => s.currentBusiness);
  const businessStats = usePlatformStore((s) => s.businessStats);
  const isLoading = usePlatformStore((s) => s.isLoading);
  const fetchBusiness = usePlatformStore((s) => s.fetchBusiness);
  const fetchBusinessStats = usePlatformStore((s) => s.fetchBusinessStats);
  const updateBusiness = usePlatformStore((s) => s.updateBusiness);
  const deleteBusiness = usePlatformStore((s) => s.deleteBusiness);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", whatsappPhoneNumber: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBusiness(id);
      fetchBusinessStats(id);
    }
  }, [id, fetchBusiness, fetchBusinessStats]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (currentBusiness) {
      setEditForm({
        name: currentBusiness.name,
        whatsappPhoneNumber: currentBusiness.whatsappPhoneNumber || "",
      });
    }
  }, [currentBusiness]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const statusTotal = useMemo(() => {
    if (!businessStats?.orderStatusBreakdown) return 0;
    return Object.values(businessStats.orderStatusBreakdown).reduce(
      (a, b) => a + b,
      0
    );
  }, [businessStats]);

  const handleCopyApiKey = async () => {
    if (!currentBusiness?.apiKey) return;
    try {
      await navigator.clipboard.writeText(currentBusiness.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = currentBusiness.apiKey;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateBusiness(id, {
        name: editForm.name,
        whatsappPhoneNumber: editForm.whatsappPhoneNumber || undefined,
      });
      setEditOpen(false);
    } catch {
      // error handled by interceptor
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteBusiness(id);
      setDeleteOpen(false);
      router.push("/platform/businesses");
    } catch {
      // error handled by interceptor
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading && !currentBusiness)
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-9 w-9" />
          <div className="flex-1">
            <SkeletonBlock className="h-7 w-48" />
            <SkeletonBlock className="mt-1 h-3 w-48" />
          </div>
          <SkeletonBlock className="h-9 w-20" />
          <SkeletonBlock className="h-9 w-24" />
        </div>
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6 pb-3">
            <SkeletonBlock className="h-5 w-40" />
          </div>
          <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <SkeletonBlock className="h-3 w-16" />
                <SkeletonBlock className="mt-1 h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
        <StatsSkeleton count={3} />
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6 pb-3">
            <SkeletonBlock className="h-5 w-44" />
          </div>
          <div className="px-6 pb-6 space-y-3">
            <SkeletonBlock className="h-4 w-full rounded-full" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <SkeletonBlock className="h-3 w-3 rounded-full" />
                  <SkeletonBlock className="h-3 w-12" />
                  <SkeletonBlock className="ml-auto h-3 w-4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  if (!currentBusiness) {
    return (
      <EmptyState
        icon={Building2}
        title="Business not found"
        description="The requested business could not be found."
        action={
          <Button onClick={() => router.push("/platform/businesses")}>
            <ArrowLeft className="h-4 w-4" />
            Back to Businesses
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/platform/businesses")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {currentBusiness.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Business detail and statistics.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="sm:h-9" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button variant="destructive" size="sm" className="sm:h-9" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className="text-sm text-muted-foreground">Name</span>
              <p className="font-medium">{currentBusiness.name}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Phone</span>
              <p className="font-medium">
                {currentBusiness.whatsappPhoneNumber || "—"}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">API Key</span>
              <div className="flex items-center gap-2">
                <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono max-w-[200px] truncate">
                  {currentBusiness.apiKey}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopyApiKey}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Created</span>
              <p className="font-medium">
                {formatDate(currentBusiness.createdAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {businessStats && (
          <>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Total Orders
                  </span>
                  <ShoppingBag className="h-5 w-5 text-purple-600" />
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {businessStats.totalOrders}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Orders (30 days)
                  </span>
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {businessStats.ordersLast30Days}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Total Revenue
                  </span>
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {formatCurrency(businessStats.totalRevenue)}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {businessStats?.orderStatusBreakdown && statusTotal > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Order Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-4 w-full overflow-hidden rounded-full">
              {Object.entries(businessStats.orderStatusBreakdown).map(
                ([status, count]) => (
                  <div
                    key={status}
                    className={STATUS_BAR_COLORS[status] || "bg-gray-300"}
                    style={{ width: `${(count / statusTotal) * 100}%` }}
                  />
                )
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(businessStats.orderStatusBreakdown).map(
                ([status, count]) => {
                  const config = ORDER_STATUS_CONFIG[status];
                  if (!config || count === 0) return null;
                  return (
                    <div key={status} className="flex items-center gap-2 text-sm">
                      <span
                        className={`h-3 w-3 rounded-full ${STATUS_BAR_COLORS[status] || "bg-gray-300"}`}
                      />
                      <span className="text-muted-foreground">
                        {config.label}
                      </span>
                      <span className="ml-auto font-medium">{count}</span>
                    </div>
                  );
                }
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Business</DialogTitle>
            <DialogDescription>
              Update business information for {currentBusiness.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Business Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">WhatsApp Phone Number</Label>
              <Input
                id="edit-phone"
                value={editForm.whatsappPhoneNumber}
                onChange={(e) =>
                  setEditForm({ ...editForm, whatsappPhoneNumber: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={!editForm.name.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Business</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {currentBusiness.name}? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              loading={deleting}
            >
              <Trash2 className="h-4 w-4" />
              Delete Business
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
