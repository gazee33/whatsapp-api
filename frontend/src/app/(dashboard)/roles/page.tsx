"use client";

import { useEffect, useState, useCallback } from "react";
import { tenantClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkeletonBlock } from "@/components/shared/skeletons";
import { PageLoading } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Role, PermissionsResponse } from "@/lib/types";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Lock,
  Key,
  Check,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [permissionsCatalog, setPermissionsCatalog] =
    useState<PermissionsResponse | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await tenantClient.get("/roles");
      setRoles(res.data.roles ?? res.data);
    } catch {
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await tenantClient.get("/permissions");
      setPermissionsCatalog(res.data);
    } catch { /* ignore */ }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Create Role Dialog ──
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!createName) return;
    setCreating(true);
    try {
      await tenantClient.post("/roles", {
        name: createName,
        description: createDescription || undefined,
      });
      toast.success("Role created");
      setCreateOpen(false);
      setCreateName("");
      setCreateDescription("");
      fetchRoles();
    } catch {
      toast.error("Failed to create role");
    } finally {
      setCreating(false);
    }
  };

  // ── Edit Role Dialog ──
  const [editOpen, setEditOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editing, setEditing] = useState(false);

  const openEdit = (role: Role) => {
    if (role.isSystem) {
      toast.error("System roles cannot be edited");
      return;
    }
    setEditRole(role);
    setEditName(role.name);
    setEditDescription(role.description ?? "");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editRole) return;
    setEditing(true);
    try {
      await tenantClient.put(`/roles/${editRole.id}`, {
        name: editName,
        description: editDescription || undefined,
      });
      toast.success("Role updated");
      setEditOpen(false);
      fetchRoles();
    } catch {
      toast.error("Failed to update role");
    } finally {
      setEditing(false);
    }
  };

  // ── Delete Role ──
  const deleteRole = async (role: Role) => {
    if (role.isSystem) {
      toast.error("System roles cannot be deleted");
      return;
    }
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      await tenantClient.delete(`/roles/${role.id}`);
      toast.success("Role deleted");
      fetchRoles();
    } catch {
      toast.error("Failed to delete role");
    }
  };

  // ── Permissions Dialog ──
  const [permOpen, setPermOpen] = useState(false);
  const [permRole, setPermRole] = useState<Role | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [assigningPerms, setAssigningPerms] = useState(false);

  const openPermDialog = (role: Role) => {
    setPermRole(role);
    const existingIds = new Set(
      (role.permissions ?? []).map((p) => p.id)
    );
    setCheckedIds(existingIds);
    if (!permissionsCatalog) fetchPermissions();
    setPermOpen(true);
  };

  const togglePerm = (permId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  const handleAssignPermissions = async () => {
    if (!permRole) return;
    setAssigningPerms(true);
    try {
      await tenantClient.post(`/roles/${permRole.id}/permissions`, {
        permissionIds: [...checkedIds],
      });
      toast.success("Permissions updated");
      setPermOpen(false);
      fetchRoles();
    } catch {
      toast.error("Failed to update permissions");
    } finally {
      setAssigningPerms(false);
    }
  };

  // ── Remove Permission ──
  const removePermission = async (roleId: string, permId: string) => {
    try {
      await tenantClient.delete(`/roles/${roleId}/permissions/${permId}`);
      toast.success("Permission removed");
      fetchRoles();
    } catch {
      toast.error("Failed to remove permission");
    }
  };

  const toggleExpand = async (roleId: string) => {
    if (expandedRole === roleId) {
      setExpandedRole(null);
      return;
    }
    setExpandedRole(roleId);
  };

  if (loading)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <SkeletonBlock className="h-7 w-20" />
            <SkeletonBlock className="mt-1 h-3 w-56" />
          </div>
          <SkeletonBlock className="h-9 w-32" />
        </div>
        <SkeletonBlock className="h-px w-full" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="h-4 w-4" />
                  <div>
                    <div className="flex items-center gap-2">
                      <SkeletonBlock className="h-4 w-28" />
                      {i === 0 && (
                        <SkeletonBlock className="h-5 w-16 rounded-full" />
                      )}
                    </div>
                    <SkeletonBlock className="mt-0.5 h-3 w-48" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="h-5 w-20 rounded-full" />
                  <SkeletonBlock className="h-5 w-16 rounded-full" />
                  <div className="flex items-center gap-1">
                    <SkeletonBlock className="h-8 w-8 rounded-md" />
                    <SkeletonBlock className="h-8 w-8 rounded-md" />
                    <SkeletonBlock className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  const categoryNames: Record<string, string> = {};
  if (permissionsCatalog?.permissions) {
    Object.entries(permissionsCatalog.permissions).forEach(
      ([cat]) => {
        const words = cat.replace(/([A-Z])/g, " $1");
        categoryNames[cat] =
          words.charAt(0).toUpperCase() + words.slice(1);
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles</h1>
          <p className="text-sm text-muted-foreground">
            Manage roles and their permissions
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Role</DialogTitle>
              <DialogDescription>
                Define a new role for your team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="create-role-name">Name</Label>
                <Input
                  id="create-role-name"
                  placeholder="Kitchen Staff"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role-desc">Description</Label>
                <Input
                  id="create-role-desc"
                  placeholder="Can view orders and update status"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} loading={creating}>
                <Shield className="h-4 w-4" />
                Create Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {roles.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No roles defined"
          description="Create your first role to manage team permissions."
          action={
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  Create Role
                </Button>
              </DialogTrigger>
            </Dialog>
          }
        />
      ) : (
        <div className="space-y-3">
          {roles.map((role) => {
            const isExpanded = expandedRole === role.id;
            const perms = role.permissions ?? [];
            return (
              <Card key={role.id}>
                <div
                  className="p-5 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleExpand(role.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{role.name}</span>
                          {role.isSystem && (
                            <Badge variant="warning" className="text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              System
                            </Badge>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {role.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          <Key className="h-3 w-3 mr-1" />
                          {perms.length} permission
                          {perms.length !== 1 ? "s" : ""}
                        </Badge>
                        {role.userCount !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {role.userCount} user
                            {role.userCount !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(role)}
                          title={
                            role.isSystem
                              ? "System roles cannot be edited"
                              : "Edit role"
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPermDialog(role)}
                          title="Manage permissions"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRole(role)}
                          disabled={role.isSystem}
                          title={
                            role.isSystem
                              ? "System roles cannot be deleted"
                              : "Delete role"
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <>
                    <Separator />
                    <CardContent className="p-4">
                      {perms.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          No permissions assigned. Click the key icon to assign
                          permissions.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {perms.map((perm) => (
                            <Badge
                              key={perm.id}
                              variant="secondary"
                              className="text-xs flex items-center gap-1"
                            >
                              {perm.name}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removePermission(role.id, perm.id);
                                }}
                                className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5"
                                title={`Remove ${perm.name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Role Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update {editRole?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-role-name">Name</Label>
              <Input
                id="edit-role-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role-desc">Description</Label>
              <Input
                id="edit-role-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} loading={editing}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Permissions</DialogTitle>
            <DialogDescription>
              Assign permissions to {permRole?.name}
            </DialogDescription>
          </DialogHeader>

          {!permissionsCatalog?.permissions ? (
            <div className="py-8">
              <PageLoading message="Loading permissions..." />
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <Tabs
                defaultValue={Object.keys(permissionsCatalog.permissions)[0]}
                className="flex flex-col h-full"
              >
                <TabsList className="shrink-0 flex-wrap h-auto gap-1">
                  {Object.entries(permissionsCatalog.permissions).map(
                    ([cat]) => (
                      <TabsTrigger
                        key={cat}
                        value={cat}
                        className="text-xs"
                      >
                        {categoryNames[cat] ?? cat}
                      </TabsTrigger>
                    )
                  )}
                </TabsList>

                <div className="flex-1 overflow-y-auto mt-3 pr-1">
                  {Object.entries(permissionsCatalog.permissions).map(
                    ([cat, perms]) => (
                      <TabsContent
                        key={cat}
                        value={cat}
                        className="mt-0 space-y-1"
                      >
                        {perms.map((perm) => {
                          const isChecked = checkedIds.has(perm.id);
                          return (
                            <label
                              key={perm.id}
                              className={cn(
                                "flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50",
                                isChecked && "border-primary/50 bg-primary/5"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => togglePerm(perm.id)}
                                className="h-4 w-4 rounded border-primary accent-primary"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {perm.name}
                                  </span>
                                  <code className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
                                    {perm.code}
                                  </code>
                                </div>
                                {perm.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {perm.description}
                                  </p>
                                )}
                              </div>
                              {isChecked && (
                                <Check className="h-4 w-4 text-primary shrink-0" />
                              )}
                            </label>
                          );
                        })}
                      </TabsContent>
                    )
                  )}
                </div>
              </Tabs>
            </div>
          )}

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setPermOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignPermissions}
              loading={assigningPerms}
            >
              <Check className="h-4 w-4" />
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
