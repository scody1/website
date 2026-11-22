'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit2, Lock, Plus, Trash2 } from 'lucide-react';
import { adminFetch, errorMessage } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { formatDateTime } from '@/lib/shared/format';
import { SUPER_ADMIN_ROLE, type AdminUser, type Permission, type Role } from '@/lib/shared/roles';
import { useAdmin } from './AdminApp';
import { Badge, Button, Card, ErrorBox, Field, Input, Modal, Select, Spinner, Textarea } from './ui';

interface AuditEntry { id: number; userEmail: string; action: string; details: string; ip: string; createdAt: string }
interface PermModule { key: string; label: string; permissions: readonly { key: Permission; label: string }[] }

export default function TabUsers() {
  const { user: me, can } = useAdmin();
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<PermModule[]>([]);
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nu, setNu] = useState({ name: '', email: '', role: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Partial<Role> | null>(null);
  const manageUsers = can('users.manage');
  const manageRoles = can('roles.manage');
  const isSuper = me.role === SUPER_ADMIN_ROLE;

  const load = useCallback(async () => {
    setError(null);
    try {
      const [{ users }, r] = await Promise.all([
        adminFetch<{ users: AdminUser[] }>('/api/admin/users'),
        adminFetch<{ roles: Role[]; modules: PermModule[] }>('/api/admin/roles')
      ]);
      setUsers(users);
      setRoles(r.roles);
      setModules(r.modules);
      if (can('audit.view')) setAudit((await adminFetch<{ entries: AuditEntry[] }>('/api/admin/audit')).entries);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [can]);
  useEffect(() => {
    load();
  }, [load]);

  /** Roles this admin may hand out (no escalation beyond their own permissions). */
  const assignable = useMemo(
    () => roles.filter((r) => isSuper || (r.key !== SUPER_ADMIN_ROLE && r.permissions.every((p) => me.permissions.includes(p)))),
    [roles, isSuper, me.permissions]
  );
  useEffect(() => {
    if (!nu.role && assignable.length) setNu((x) => ({ ...x, role: assignable.find((r) => r.key === 'STAFF')?.key || assignable[assignable.length - 1].key }));
  }, [assignable, nu.role]);

  const patch = async (u: AdminUser, body: Record<string, unknown>, msg: string) => {
    try {
      await adminFetch(`/api/admin/users/${u.id}`, { method: 'PATCH', json: body });
      showToast('Updated', msg);
      load();
    } catch (err) {
      showToast('Not allowed', errorMessage(err), 'error');
    }
  };

  const resetPassword = (u: AdminUser) => {
    const pw = prompt(`Temporary password for ${u.email} (min 10 characters, letters and numbers). They must change it at next sign-in:`);
    if (pw) patch(u, { password: pw }, `Temporary password set for ${u.email}. Their other sessions were signed out.`);
  };

  const removeUser = async (u: AdminUser) => {
    if (!confirm(`Delete ${u.email}? Consider deactivating instead to keep their history.`)) return;
    try {
      await adminFetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      showToast('Not allowed', errorMessage(err), 'error');
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminFetch('/api/admin/users', { method: 'POST', json: nu });
      showToast('User added', `${nu.email} can now sign in with the temporary password you set.`);
      setNu({ name: '', email: '', role: nu.role, password: '' });
      load();
    } catch (err) {
      showToast('Could not add user', errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeRole = async (r: Role) => {
    if (!confirm(`Delete the role "${r.name}"?`)) return;
    try {
      await adminFetch(`/api/admin/roles/${r.id}`, { method: 'DELETE' });
      showToast('Role deleted', r.name, 'info');
      load();
    } catch (err) {
      showToast('Cannot delete role', errorMessage(err), 'error');
    }
  };

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!users) return <Spinner />;

  const roleName = (key: string) => roles.find((r) => r.key === key)?.name || key;

  return (
    <div className="space-y-6">
      <Card title="Admin users" subtitle="Everyone signs in with their own email and password. Role changes take effect immediately.">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-parchment-100 text-maroon-700 text-[10px] uppercase">
              <tr><th className="p-2 text-left">User</th><th className="p-2 text-left">Role</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Last sign-in</th><th className="p-2" /></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((u) => {
                const locked = u.id === me.id || !manageUsers || (u.role === SUPER_ADMIN_ROLE && !isSuper);
                return (
                  <tr key={u.id}>
                    <td className="p-2"><p className="font-bold">{u.name}{u.id === me.id && ' (you)'}</p><p className="text-stone-500">{u.email}</p></td>
                    <td className="p-2">
                      {locked ? (
                        <span className="font-semibold">{u.roleName}</span>
                      ) : (
                        <Select value={u.role} onChange={(e) => patch(u, { role: e.target.value }, `${u.email} is now ${roleName(e.target.value)}.`)} className="w-48">
                          {!assignable.some((r) => r.key === u.role) && <option value={u.role}>{u.roleName}</option>}
                          {assignable.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                        </Select>
                      )}
                    </td>
                    <td className="p-2">
                      {u.isActive ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge> : <Badge className="bg-stone-100 text-stone-500 border-stone-200">Deactivated</Badge>}
                      {u.mustChangePassword && <Badge className="ml-1 bg-amber-50 text-amber-800 border-amber-200">Temp password</Badge>}
                    </td>
                    <td className="p-2">{formatDateTime(u.lastLoginAt)}</td>
                    <td className="p-2 text-right whitespace-nowrap space-x-1">
                      {!locked && (
                        <>
                          <Button variant="ghost" onClick={() => resetPassword(u)}>Reset password</Button>
                          <Button variant="ghost" onClick={() => patch(u, { isActive: !u.isActive }, u.isActive ? `${u.email} deactivated and signed out.` : `${u.email} re-activated.`)}>
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <button onClick={() => removeUser(u)} className="text-rose-600 p-1 align-middle" aria-label="Delete user"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {manageUsers && (
          <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end mt-5 bg-parchment-50 p-4 rounded-2xl border border-gold-300/40">
            <Field label="Name"><Input required value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" required autoComplete="off" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} /></Field>
            <Field label="Role">
              <Select value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value })}>
                {assignable.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label="Temporary password"><Input type="password" required autoComplete="new-password" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} /></Field>
            <Button type="submit" loading={busy}>Add user</Button>
          </form>
        )}
      </Card>

      <Card
        title="Roles & permissions"
        subtitle="Each role is a set of permissions, grouped by module. Edit a role and every user with it gets the change on their next click."
        actions={manageRoles ? <Button onClick={() => setEditing({ name: '', description: '', permissions: [] })}><Plus className="w-4 h-4" /> New role</Button> : null}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {roles.map((r) => {
            const total = modules.reduce((n, m) => n + m.permissions.length, 0);
            const canTouch = manageRoles && !r.isSystem && r.key !== me.role && (isSuper || r.permissions.every((p) => me.permissions.includes(p)));
            return (
              <div key={r.id} className="border border-stone-200 rounded-2xl p-4 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-maroon-700 flex items-center gap-1.5">{r.isSystem && <Lock className="w-3.5 h-3.5" />}{r.name}</p>
                    <p className="text-[11px] text-stone-500">{r.description || '—'}</p>
                  </div>
                  <div className="flex gap-1">
                    {canTouch && <button onClick={() => setEditing(r)} className="p-1 text-maroon-700" aria-label={`Edit ${r.name}`}><Edit2 className="w-4 h-4" /></button>}
                    {canTouch && <button onClick={() => removeRole(r)} className="p-1 text-rose-600" aria-label={`Delete ${r.name}`}><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
                <p className="text-[11px] mt-2">
                  <strong>{r.permissions.length}</strong> of {total} permissions · <strong>{r.userCount}</strong> user{r.userCount === 1 ? '' : 's'}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {modules.map((m) => {
                    const n = m.permissions.filter((p) => r.permissions.includes(p.key)).length;
                    if (!n) return null;
                    return (
                      <Badge key={m.key} className={n === m.permissions.length ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-sky-50 text-sky-700 border-sky-200'}>
                        {m.label}{n === m.permissions.length ? '' : ` ${n}/${m.permissions.length}`}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {audit && (
        <Card title="Audit log" subtitle="Sign-ins, user and role changes, settings changes, exports and integration changes (latest 300).">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-[11px]">
              <tbody className="divide-y divide-stone-100">
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td className="p-1.5 whitespace-nowrap text-stone-500">{formatDateTime(a.createdAt)}</td>
                    <td className="p-1.5">{a.userEmail || '—'}</td>
                    <td className="p-1.5 font-mono">{a.action}</td>
                    <td className="p-1.5 text-stone-600">{a.details}</td>
                    <td className="p-1.5 text-stone-400">{a.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editing && (
        <RoleEditor
          role={editing}
          modules={modules}
          grantable={isSuper ? null : me.permissions}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function RoleEditor({ role, modules, grantable, onClose, onSaved }: {
  role: Partial<Role>;
  modules: PermModule[];
  /** null = may grant everything (Super Admin) */
  grantable: Permission[] | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState(role.name || '');
  const [description, setDescription] = useState(role.description || '');
  const [perms, setPerms] = useState<Set<Permission>>(new Set(role.permissions || []));
  const [saving, setSaving] = useState(false);
  const allowed = (p: Permission) => grantable === null || grantable.includes(p);

  const toggle = (p: Permission) => {
    if (!allowed(p)) return;
    setPerms((s) => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });
  };
  const toggleModule = (m: PermModule, on: boolean) => {
    setPerms((s) => {
      const n = new Set(s);
      m.permissions.forEach((p) => {
        if (!allowed(p.key)) return;
        if (on) n.add(p.key);
        else n.delete(p.key);
      });
      return n;
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { name, description, permissions: Array.from(perms) };
      if (role.id) await adminFetch(`/api/admin/roles/${role.id}`, { method: 'PUT', json: body });
      else await adminFetch('/api/admin/roles', { method: 'POST', json: body });
      showToast('Role saved', `${name} — ${perms.size} permission${perms.size === 1 ? '' : 's'}.`);
      onSaved();
    } catch (err) {
      showToast('Could not save role', errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={role.id ? `Edit role: ${role.name}` : 'New role'} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Role name *"><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Packing Staff" /></Field>
          <Field label="Description" className="sm:col-span-2"><Textarea rows={1} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this person does" /></Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {modules.map((m) => {
            const on = m.permissions.filter((p) => perms.has(p.key)).length;
            const all = on === m.permissions.length;
            return (
              <div key={m.key} className="bg-white border border-stone-200 rounded-2xl p-3">
                <label className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-stone-100 cursor-pointer">
                  <span className="font-bold text-maroon-700 text-sm">{m.label}</span>
                  <span className="flex items-center gap-2 text-[11px] text-stone-500">
                    {on}/{m.permissions.length}
                    <input type="checkbox" checked={all} ref={(el) => { if (el) el.indeterminate = on > 0 && !all; }}
                      onChange={(e) => toggleModule(m, e.target.checked)} className="w-4 h-4 accent-maroon-700" aria-label={`All ${m.label} permissions`} />
                  </span>
                </label>
                <ul className="space-y-1.5">
                  {m.permissions.map((p) => (
                    <li key={p.key}>
                      <label className={`flex items-start gap-2 text-xs ${allowed(p.key) ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`} title={allowed(p.key) ? '' : 'You do not have this permission yourself'}>
                        <input type="checkbox" checked={perms.has(p.key)} disabled={!allowed(p.key)} onChange={() => toggle(p.key)} className="w-4 h-4 mt-0.5 accent-maroon-700" />
                        <span>{p.label}<span className="block text-[10px] text-stone-400 font-mono">{p.key}</span></span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-200">
          <span className="text-xs text-stone-500">{perms.size} permission{perms.size === 1 ? '' : 's'} selected</span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>{role.id ? 'Save role' : 'Create role'}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
