'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AuditLogItem } from '@/types';
import { formatISTDateTime } from '@/lib/calculations/financial';
import { RefreshCw, Globe } from 'lucide-react';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/audit?limit=100');
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <AdminLayout adminName="Venkateswara Rao">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">
              Audit & Regulatory Logs
            </h1>
            <p className="text-xs text-[#6B7280]">
              Operational records of report submissions, edits, approvals, and user logins
            </p>
          </div>

          <button
            onClick={fetchLogs}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFFFFF] border border-[#E7E9ED] text-[#111827] hover:bg-[#F7F8FA]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-[#F3F4F6] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center bg-[#FFFFFF] rounded-xl border border-[#E7E9ED]">
            <p className="text-sm font-semibold text-[#111827]">No audit logs yet</p>
          </div>
        ) : (
          <div className="bg-[#FFFFFF] rounded-xl border border-[#E7E9ED] shadow-xs divide-y divide-[#E7E9ED] overflow-hidden">
            {logs.map((log) => (
              <div key={log.id} className="p-4 flex items-start justify-between gap-4 text-xs hover:bg-[#F7F8FA] transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono font-semibold text-[11px] px-2 py-0.5 rounded-md ${
                        log.action.includes('SUBMITTED') || log.action.includes('APPROVED')
                          ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                          : log.action.includes('REJECTED')
                          ? 'bg-rose-50 text-[#DC2626] border border-rose-200'
                          : 'bg-[#F7F8FA] text-[#111827] border border-[#E7E9ED]'
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="font-semibold text-[#111827]">
                      {log.entity_type} {log.entity_id ? `(#${log.entity_id.slice(-6)})` : ''}
                    </span>
                  </div>

                  {log.metadata && (
                    <p className="text-[11px] font-mono text-[#6B7280] truncate max-w-md">
                      {JSON.stringify(log.metadata)}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-[#6B7280]">
                    <span>By: {log.user ? `${log.user.name} (${log.user.email})` : 'System'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {log.ip_address || '127.0.0.1'}
                    </span>
                  </div>
                </div>

                <div className="text-right whitespace-nowrap text-[11px] text-[#6B7280] shrink-0 font-mono">
                  {formatISTDateTime(log.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
