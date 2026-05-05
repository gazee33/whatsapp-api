"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Phone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { usePlatformStore } from "@/stores/platform-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { SearchInput } from "@/components/shared/search-input";
import { CardGridSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";

export default function PlatformBusinessesPage() {
  const businesses = usePlatformStore((s) => s.businesses);
  const pagination = usePlatformStore((s) => s.pagination);
  const isLoading = usePlatformStore((s) => s.isLoading);
  const fetchBusinesses = usePlatformStore((s) => s.fetchBusinesses);
  const createBusiness = usePlatformStore((s) => s.createBusiness);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", whatsappPhoneNumber: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchBusinesses({ q: search || undefined, page, limit: 20 });
  }, [fetchBusinesses, search, page]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createBusiness({
        name: form.name,
        whatsappPhoneNumber: form.whatsappPhoneNumber || undefined,
      });
      setDialogOpen(false);
      setForm({ name: "", whatsappPhoneNumber: "" });
      fetchBusinesses({ q: search || undefined, page, limit: 20 });
    } catch {
      // error handled by interceptor
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Businesses</h1>
          <p className="text-sm text-muted-foreground">
            Manage all registered businesses on the platform.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Business
        </Button>
      </div>

      <SearchInput
        placeholder="Search businesses..."
        value={search}
        onChange={handleSearch}
      />

      <Separator />

      {isLoading ? (
        <CardGridSkeleton count={6} columns={3} />
      ) : businesses.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No businesses found"
          description={
            search
              ? `No businesses matching "${search}".`
              : "Get started by adding your first business."
          }
          action={
            !search && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Business
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((b) => (
              <Link key={b.id} href={`/platform/businesses/${b.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {b.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {b.whatsappPhoneNumber && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {b.whatsappPhoneNumber}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-muted-foreground">
                        {b.orderCount ?? 0} orders
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(b.createdAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} (
                {pagination.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Business</DialogTitle>
            <DialogDescription>
              Create a new business on the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp Phone Number</Label>
              <Input
                id="phone"
                value={form.whatsappPhoneNumber}
                onChange={(e) =>
                  setForm({ ...form, whatsappPhoneNumber: e.target.value })
                }
                placeholder="15550783881"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={!form.name.trim()}
            >
              Create Business
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
