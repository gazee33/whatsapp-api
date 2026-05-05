"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Plus, Trash2, Shield } from "lucide-react";
import { platformClient } from "@/lib/api-client";
import type { User as UserType } from "@/lib/types";
import {
  Card,
  CardContent,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TableSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";

export default function PlatformUsersPage() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [adding, setAdding] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    platformClient
      .get("/platform/users")
      .then((r) => {
        setUsers(r.data);
      })
      .catch(() => {
        /* error handled by interceptor */
      })
      .finally(() => setLoading(false));
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleAdd = async () => {
    setAdding(true);
    try {
      await platformClient.post("/platform/users", {
        email: addForm.email,
        password: addForm.password,
        name: addForm.name || undefined,
      });
      setAddOpen(false);
      setAddForm({ email: "", password: "", name: "" });
      fetchUsers();
    } catch {
      // error handled by interceptor
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await platformClient.delete(`/platform/users/${deleteId}`);
      setDeleteId(null);
      fetchUsers();
    } catch {
      // error handled by interceptor
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage platform-level users and administrators.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <Separator />

      {loading ? (
        <TableSkeleton columns={6} rows={8} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No platform users found"
          description="Add your first platform user to get started."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 sm:px-4 py-3 text-left font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">
                      Email
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                      Roles
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                      Created
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-right font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 sm:px-4 py-3 font-medium">
                        {user.name || "—"}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {user.email}
                      </td>
                      <td className="px-3 sm:px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {user.roles && user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <Badge
                                key={role.id}
                                variant="secondary"
                                className="gap-1"
                              >
                                <Shield className="h-3 w-3" />
                                {role.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No roles
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <Badge variant={user.isActive ? "success" : "destructive"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(user.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Platform User</DialogTitle>
            <DialogDescription>
              Create a new user with platform-level access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) =>
                  setAddForm({ ...addForm, name: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={addForm.email}
                onChange={(e) =>
                  setAddForm({ ...addForm, email: e.target.value })
                }
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">Password</Label>
              <Input
                id="add-password"
                type="password"
                value={addForm.password}
                onChange={(e) =>
                  setAddForm({ ...addForm, password: e.target.value })
                }
                placeholder="Enter password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              loading={adding}
              disabled={!addForm.email.trim() || !addForm.password.trim()}
            >
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              loading={deleting}
            >
              <Trash2 className="h-4 w-4" />
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
