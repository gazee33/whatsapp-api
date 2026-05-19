"use client";

import { useEffect, useState, useCallback } from "react";
import { tenantClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SkeletonBlock, TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Headset, Plus, Trash2, Crown, Phone } from "lucide-react";

interface Manager {
  id: string;
  phone: string;
  name: string | null;
  isOwner: boolean;
  createdAt: string;
}

export default function ManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchManagers = useCallback(async () => {
    try {
      const res = await tenantClient.get("/managers");
      setManagers(res.data.managers ?? []);
    } catch {
      toast.error("Failed to load managers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  // ── Add Manager Dialog ──
  const [addOpen, setAddOpen] = useState(false);
  const [addPhone, setAddPhone] = useState("");
  const [addName, setAddName] = useState("");
  const [addIsOwner, setAddIsOwner] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!addPhone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    setAdding(true);
    try {
      await tenantClient.post("/managers", {
        phone: addPhone.trim(),
        name: addName.trim() || undefined,
        isOwner: addIsOwner,
      });
      toast.success("Manager added — they can now chat with the assistant on WhatsApp");
      setAddOpen(false);
      setAddPhone("");
      setAddName("");
      setAddIsOwner(false);
      fetchManagers();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast.error(message || "Failed to add manager");
    } finally {
      setAdding(false);
    }
  };

  const deleteManager = async (manager: Manager) => {
    if (
      !confirm(
        `Remove manager access for ${manager.name || manager.phone}? They'll no longer be able to chat with the assistant.`,
      )
    ) {
      return;
    }
    try {
      await tenantClient.delete(`/managers/${manager.id}`);
      toast.success("Manager removed");
      fetchManagers();
    } catch {
      toast.error("Failed to remove manager");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <SkeletonBlock className="h-7 w-32" />
            <SkeletonBlock className="mt-1 h-3 w-72" />
          </div>
          <SkeletonBlock className="h-9 w-32" />
        </div>
        <SkeletonBlock className="h-px w-full" />
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manager Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Phone numbers registered here will get the Manager Assistant on WhatsApp
            instead of the customer-facing agent. Use it to manage your menu,
            settings, AI rules, and orders by chat.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Add manager
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add manager phone</DialogTitle>
              <DialogDescription>
                When a WhatsApp message arrives from this number, it&apos;ll be
                routed to the Manager Assistant.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="add-phone">WhatsApp phone number</Label>
                <Input
                  id="add-phone"
                  placeholder="e.g. 966501234567 (E.164, no +)"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Digits only. We&apos;ll strip a leading + automatically.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-name">Name (optional)</Label>
                <Input
                  id="add-name"
                  placeholder="e.g. Ahmed (Owner)"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={addIsOwner}
                  onChange={(e) => setAddIsOwner(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Mark as owner
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} loading={adding}>
                <Plus className="h-4 w-4" />
                Add manager
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {managers.length === 0 ? (
        <EmptyState
          icon={Headset}
          title="No managers yet"
          description="Add a phone number to enable the Manager Assistant for that number."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add manager
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Headset className="h-4 w-4" />
              Manager phones ({managers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 px-3 sm:px-6 text-xs font-medium text-muted-foreground">
                      Phone
                    </th>
                    <th className="py-3 px-3 sm:px-6 text-xs font-medium text-muted-foreground hidden sm:table-cell">
                      Name
                    </th>
                    <th className="py-3 px-3 sm:px-6 text-xs font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="py-3 px-3 sm:px-6 text-xs font-medium text-muted-foreground hidden md:table-cell">
                      Added
                    </th>
                    <th className="py-3 px-3 sm:px-6 text-xs font-medium text-muted-foreground text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {managers.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-3 sm:px-6">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono text-sm">+{m.phone}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 sm:px-6 text-sm hidden sm:table-cell">
                        {m.name || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 px-3 sm:px-6">
                        {m.isOwner ? (
                          <Badge variant="default" className="gap-1">
                            <Crown className="h-3 w-3" />
                            Owner
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Manager</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 sm:px-6 text-xs text-muted-foreground hidden md:table-cell">
                        {formatDate(m.createdAt)}
                      </td>
                      <td className="py-3 px-3 sm:px-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteManager(m)}
                            title="Remove manager"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
