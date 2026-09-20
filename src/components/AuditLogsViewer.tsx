import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import { fetchAuditLogs } from '../lib/invitations';
import { ShieldCheck, RefreshCw, Clock, Filter, FileText } from 'lucide-react';

export default function AuditLogsViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await fetchAuditLogs();
      setLogs(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filterAction === 'all') return true;
    return log.action === filterAction;
  });

  return (
    <div className="flex flex-col gap-6 select-text fade-in">
      {/* Header Banner */}
      <div className="bg-navy border border-paper/10 p-6 rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col gap-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-blood" />
            <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-blood">
              Cryptographic Audit Log &amp; Non-Repudiation Trail
            </span>
          </div>
          <h3 className="font-display text-xl font-bold text-paper/90">
            Editorial Security &amp; Publishing Audit Trail
          </h3>
          <p className="font-serif text-xs text-paper/50 leading-relaxed">
            Immutable, append-only records of publishing events, role modifications, article deletions, and external reviewer invitations. Cannot be modified or deleted by any user or administrator.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="text-paper/60 hover:text-blood text-xs flex items-center gap-2 font-sans uppercase tracking-wider cursor-pointer border border-paper/15 px-3 py-2 rounded-sm"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh Logs
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-3">
        <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-paper/40 flex items-center gap-1">
          <Filter size={10} /> Filter Action:
        </span>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="bg-navy border border-paper/15 text-paper font-sans text-[10px] uppercase tracking-wider py-1 px-2.5 rounded-sm focus:outline-none focus:border-blood cursor-pointer"
        >
          <option value="all">All Logged Actions</option>
          <option value="publish_article">Publishing &amp; Dispatch</option>
          <option value="create_invitation">Review Invitations Issued</option>
          <option value="revoke_invitation">Review Invitations Revoked</option>
          <option value="role_change">Role &amp; Privilege Changes</option>
          <option value="delete_article">Article Deletions</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-navy border border-paper/10 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-paper/10 bg-midnight text-[9px] font-sans font-bold tracking-widest uppercase text-paper/40">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Actor Email &amp; Role</th>
                <th className="py-3 px-4">Details &amp; Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper/5 font-serif text-xs text-paper/70">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-paper/30 italic">
                    No matching audit log records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-paper/[0.02] transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[10px] text-paper/40">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-sans text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-xs border bg-blood/10 text-blood-light border-blood/30">
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-paper/90 text-xs">{log.actorEmail}</span>
                        <span className="font-sans text-[8px] uppercase tracking-wider text-paper/40">{log.actorRole}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-serif text-paper/70 leading-relaxed">
                      {log.details}
                      <span className="block font-mono text-[9px] text-paper/30 mt-0.5">
                        Target: {log.targetCollection}/{log.targetId}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
