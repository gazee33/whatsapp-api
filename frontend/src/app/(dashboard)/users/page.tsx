"use client";

import { useEffect, useState, useCallback } from "react";
import { tenantClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SkeletonBlock, TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { User, Role } from "@/lib/types";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  UserPlus,
  UserCheck,
  UserX,
} from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await tenantClient.get("/users");
      setUsers(res.data.users ?? res.data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await tenantClient.get("/roles");
      setRoles(res.data.roles ?? res.data);
    } catch { /* ignore */ }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Add User Dialog ──
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!addEmail || !addPassword) return;
    setAdding(true);
    try {
      await tenantClient.post("/users", {
        email: addEmail,
        password: addPassword,
        name: addName || undefined,
      });
      toast.success("User created");
      setAddOpen(false);
      setAddEmail("");
      setAddPassword("");
      setAddName("");
      fetchUsers();
    } catch {
      toast.error("Failed to create user");
    } finally {
      setAdding(false);
    }
  };

  // ── Edit User Dialog ──
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editing, setEditing] = useState(false);

  const openEdit = (user: User) => {
    setEditUser(user);
    setEditName(user.name ?? "");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setEditing(true);
    try {
      await tenantClient.put(`/users/${editUser.id}`, { name: editName });
      toast.success("User updated");
      setEditOpen(false);
      fetchUsers();
    } catch {
      toast.error("Failed to update user");
    } finally {
      setEditing(false);
    }
  };

  // ── Toggle Active ──
  const toggleActive = async (user: User) => {
    try {
      await tenantClient.put(`/users/${user.id}`, {
        isActive: !user.isActive,
      });
      toast.success(user.isActive ? "User deactivated" : "User activated");
      fetchUsers();
    } catch {
      toast.error("Failed to update user");
    }
  };

  // ── Delete User ──
  const deleteUser = async (user: User) => {
    if (!confirm(`Delete user "${user.email}"?`)) return;
    try {
      await tenantClient.delete(`/users/${user.id}`);
      toast.success("User deleted");
      fetchUsers();
    } catch {
      toast.error("Failed to delete user");
    }
  };

  // ── Assign Role Dialog ──
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleUser, setRoleUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [assigning, setAssigning] = useState(false);

  const openRoleDialog = (user: User) => {
    setRoleUser(user);
    setSelectedRole("");
    setRoleOpen(true);
  };

  const handleAssignRole = async () => {
    if (!roleUser || !selectedRole) return;
    setAssigning(true);
    try {
      await tenantClient.post(`/users/${roleUser.id}/roles`, {
        roleId: selectedRole,
      });
      toast.success("Role assigned");
      setRoleOpen(false);
      fetchUsers();
    } catch {
      toast.error("Failed to assign role");
    } finally {
      setAssigning(false);
    }
  };

  // ── Remove Role ──
  const removeRole = async (userId: string, roleId: string) => {
    try {
      await tenantClient.delete(`/users/${userId}/roles/${roleId}`);
      toast.success("Role removed");
      fetchUsers();
    } catch {
      toast.error("Failed to remove role");
    }
  };

  if (loading)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <SkeletonBlock className="h-7 w-20" />
            <SkeletonBlock className="mt-1 h-3 w-56" />
          </div>
          <SkeletonBlock className="h-9 w-28" />
        </div>
        <SkeletonBlock className="h-px w-full" />
        <TableSkeleton />
      </div>
    );

  const availableRoles = roles.filter(
    (r) => !roleUser?.roles?.some((ur) => ur.id === r.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage team members and their access
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Create an account for a new team member
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="add-email">Email</Label>
                <Input
                  id="add-email"
                  type="email"
                  placeholder="user@example.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-password">Password</Label>
                <Input
                  id="add-password"
                  type="password"
                  placeholder="••••••••"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-name">Name (optional)</Label>
                <Input
                  id="add-name"
                  placeholder="Ahmed Mohammed"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} loading={adding}>
                <UserPlus className="h-4 w-4" />
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members"
          description="Add your first team member to get started."
          action={
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
            </Dialog>
          }
        />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Members ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 px-3 sm:px-6 text-xs font-medium text-muted-foreground">
                      User
                    </th>
                    <th className="py-3 px-3 sm:px-6 text-xs font-medium text-muted-foreground hidden sm:table-cell">
                      Roles
                    </th>
                    <th className="py-3 px-3 sm:px-6 text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="py-3 px-3 sm:px-6 text-xs font-medium text-muted-foreground hidden md:table-cell">
                      Last Login
                    </th>
                    <th className="py-3 px-3 sm:px-6 text-xs font-medium text-muted-foreground text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-3 sm:px-6">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {user.name || "—"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 sm:px-6 hidden sm:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {user.roles?.length ? (
                            user.roles.map((role) => (
                              <Badge key={role.id} variant="secondary" className="text-xs group relative">
                                {role.name}
                                {!role.isSystem && (
                                  <button
                                    type="button"
                                    onClick={() => removeRole(user.id, role.id)}
                                    className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No roles
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 sm:px-6">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-block h-2 w-2 rounded-full",
                              user.isActive ? "bg-emerald-500" : "bg-red-500"
                            )}
                          />
                          <span className="text-xs">
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 sm:px-6 text-xs text-muted-foreground hidden md:table-cell">
                        {user.lastLoginAt
                          ? formatDate(user.lastLoginAt)
                          : "Never"}
                      </td>
                      <td className="py-3 px-3 sm:px-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(user)}
                            title="Edit user"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActive(user)}
                            title={user.isActive ? "Deactivate" : "Activate"}
                          >
                            {user.isActive ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openRoleDialog(user)}
                            title="Assign role"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteUser(user)}
                            title="Delete user"
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

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update details for {editUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
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

      {/* Assign Role Dialog */}
      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Give {roleUser?.email} a new role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="role-select">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="role-select">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                      {role.isSystem && " (System)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableRoles.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  All available roles are already assigned.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignRole}
              loading={assigning}
              disabled={!selectedRole}
            >
              <Shield className="h-4 w-4" />
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
