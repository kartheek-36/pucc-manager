'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { User, Van, Role } from '@/types';
import {
  Truck,
  Phone,
  Mail,
  Edit3,
  X,
  RefreshCw,
  UserPlus,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [vans, setVans] = useState<Van[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editVanId, setEditVanId] = useState<string>('');
  const [editActive, setEditActive] = useState<boolean>(true);
  const [editRole, setEditRole] = useState<Role>('VAN_OPERATOR');
  const [saving, setSaving] = useState(false);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<Role>('VAN_OPERATOR');
  const [newVanId, setNewVanId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const { toast } = useToast();

  const fetchData = async (isManualSync = false) => {
    try {
      if (isManualSync) setSyncing(true);
      else setLoading(true);

      const [uRes, vRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/vans'),
      ]);
      const uJson = await uRes.json();
      const vJson = await vRes.json();

      if (uJson.success) setUsers(uJson.data);
      if (vJson.success) setVans(vJson.data);

      setLastSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      if (isManualSync) {
        toast('Users and van assignments synced with fleet database', 'success');
      }
    } catch (e) {
      console.error(e);
      toast('Failed to sync users and fleet data', 'error');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditPhone(user.phone || '');
    setEditVanId(user.van_id || '');
    setEditActive(user.is_active);
    setEditRole(user.role);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          name: editName,
          phone: editPhone || null,
          is_active: editActive,
          van_id: editVanId || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast(`User ${editName} synced & updated successfully`, 'success');
        setEditingUser(null);
        await fetchData();
      } else {
        toast(json.error?.message || 'Update failed', 'error');
      }
    } catch {
      toast('Network error saving user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newName || !newEmail) {
      toast('Name and email are required', 'error');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          phone: newPhone || null,
          role: newRole,
          van_id: newVanId || null,
          is_active: true,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast(`Operator ${newName} created and synced with fleet`, 'success');
        setShowCreateModal(false);
        setNewName('');
        setNewEmail('');
        setNewPhone('');
        setNewVanId('');
        await fetchData();
      } else {
        toast(json.error?.message || 'Failed to create user', 'error');
      }
    } catch {
      toast('Network error creating user', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout adminName="Venkateswara Rao">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header with Title and Sync Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">
              User & Operator Management
            </h1>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Sync operator logins, assigned vans, contact records, and system permissions
              {lastSyncTime && <span className="ml-2 font-mono text-[11px] text-[#1D4ED8]">Last synced: {lastSyncTime}</span>}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(true)}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#FFFFFF] border border-[#E7E9ED] text-[#111827] hover:bg-[#F7F8FA] transition-colors shadow-2xs disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#1D4ED8] ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Fleet'}</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#1D4ED8] text-white hover:bg-[#1E40AF] transition-colors shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Operator</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-[#F3F4F6] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => {
              const assignedVan = vans.find((v) => v.id === u.van_id);

              return (
                <div
                  key={u.id}
                  className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E7E9ED] shadow-xs space-y-4 hover:border-[#1D4ED8] transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-base font-bold text-[#111827]">
                          {u.name}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-blue-50 text-[#1D4ED8] border border-blue-200'
                            }`}
                          >
                            {u.role === 'ADMIN' ? 'Head Admin' : 'Van Operator'}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                              u.is_active
                                ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                                : 'bg-[#F7F8FA] text-[#6B7280] border border-[#E7E9ED]'
                            }`}
                          >
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 rounded-lg border border-[#E7E9ED] text-[#6B7280] hover:text-[#111827] hover:bg-[#F7F8FA] transition-colors"
                        title="Edit Operator & Assignment"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs pt-1 border-t border-[#E7E9ED]">
                      <div className="flex items-center gap-2 text-[#6B7280]">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[#111827] truncate font-mono text-[11px]">{u.email}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[#6B7280]">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[#111827]">{u.phone || 'No phone recorded'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Synced Van Assignment Banner */}
                  <div className="pt-2 border-t border-[#E7E9ED]">
                    <div className="p-2.5 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-[#6B7280] block">
                            Assigned Fleet Unit
                          </span>
                          <span className="text-xs font-bold text-[#111827]">
                            {assignedVan
                              ? `${assignedVan.van_number} (${assignedVan.registration_number})`
                              : u.role === 'ADMIN'
                              ? 'All 3 Vans (Full Fleet)'
                              : 'No Van Assigned'}
                          </span>
                        </div>
                      </div>
                      {assignedVan && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FFFFFF] rounded-xl p-5 max-w-sm w-full space-y-4 border border-[#E7E9ED] shadow-xl animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">
                    Edit Operator Assignment
                  </h3>
                  <p className="text-[11px] text-[#6B7280]">Syncing directly with van logins</p>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1 rounded-md text-[#6B7280] hover:bg-[#F7F8FA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#6B7280]">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] text-sm text-[#111827] outline-none focus:border-[#1D4ED8]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#6B7280]">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] text-sm text-[#111827] outline-none focus:border-[#1D4ED8]"
                  />
                </div>

                {editingUser.role === 'VAN_OPERATOR' && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#6B7280]">
                      Assigned Pollution Van (Auto-syncs login)
                    </label>
                    <select
                      value={editVanId}
                      onChange={(e) => setEditVanId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] text-sm text-[#111827] outline-none focus:border-[#1D4ED8]"
                    >
                      <option value="">No Van Assigned</option>
                      {vans.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.van_number} ({v.registration_number})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium text-[#6B7280]">Account Active</span>
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="w-4 h-4 text-[#1D4ED8] rounded border-[#E7E9ED] focus:ring-0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#E7E9ED]">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 h-9 text-xs font-semibold text-[#6B7280] hover:bg-[#F7F8FA] rounded-lg border border-[#E7E9ED]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 h-9 text-xs font-semibold bg-[#1D4ED8] text-white rounded-lg hover:bg-[#1E40AF] disabled:opacity-50"
                >
                  {saving ? 'Syncing...' : 'Save & Sync'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Operator Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FFFFFF] rounded-xl p-5 max-w-sm w-full space-y-4 border border-[#E7E9ED] shadow-xl animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">
                    Add New Fleet Operator
                  </h3>
                  <p className="text-[11px] text-[#6B7280]">Create operator and assign van</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-md text-[#6B7280] hover:bg-[#F7F8FA]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#6B7280]">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Shinde"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] text-sm text-[#111827] outline-none focus:border-[#1D4ED8]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#6B7280]">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. operator4@rtovan.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] text-sm text-[#111827] outline-none focus:border-[#1D4ED8]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#6B7280]">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98220 99999"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] text-sm text-[#111827] outline-none focus:border-[#1D4ED8]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#6B7280]">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as Role)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] text-sm text-[#111827] outline-none focus:border-[#1D4ED8]"
                  >
                    <option value="VAN_OPERATOR">Van Operator</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                {newRole === 'VAN_OPERATOR' && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#6B7280]">Assigned Pollution Van</label>
                    <select
                      value={newVanId}
                      onChange={(e) => setNewVanId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] text-sm text-[#111827] outline-none focus:border-[#1D4ED8]"
                    >
                      <option value="">No Van Assigned</option>
                      {vans.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.van_number} ({v.registration_number})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#E7E9ED]">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-9 text-xs font-semibold text-[#6B7280] hover:bg-[#F7F8FA] rounded-lg border border-[#E7E9ED]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 h-9 text-xs font-semibold bg-[#1D4ED8] text-white rounded-lg hover:bg-[#1E40AF] disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create & Sync'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
