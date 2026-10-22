import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Flag,
  Trash2,
  RefreshCw,
  LogOut,
  FolderOpen,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { authState } from '../services/auth';
import {
  getAdminItems,
  updateItemModeration,
  getAdminReports,
  resolveAdminReport,
} from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';

export function AdminDashboard() {
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'queue' | 'reports'
  const [items, setItems] = useState([]);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const adminToken = authState.getToken();
  const adminUser = authState.getUser();

  useEffect(() => {
    if (!authState.isAuthenticated()) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const loadAdminData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [itemsRes, reportsRes] = await Promise.allSettled([
        getAdminItems(adminToken),
        getAdminReports(adminToken),
      ]);

      if (itemsRes.status === 'fulfilled' && itemsRes.value.success) {
        setItems(itemsRes.value.items || []);
      } else {
        console.warn('Failed to load admin items:', itemsRes.reason);
      }

      if (reportsRes.status === 'fulfilled' && reportsRes.value.success) {
        setReports(reportsRes.value.reports || []);
      } else {
        console.warn('Failed to load admin reports:', reportsRes.reason);
      }
    } catch (err) {
      setError(err.message || 'Error loading administrative data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      loadAdminData();
    }
  }, [adminToken]);

  const handleModerateItem = async (itemId, newModStatus, newStatus = null) => {
    try {
      await updateItemModeration(
        itemId,
        { moderationStatus: newModStatus, ...(newStatus ? { status: newStatus } : {}) },
        adminToken
      );

      setItems((prev) =>
        prev.map((i) =>
          i.itemId === itemId
            ? { ...i, moderationStatus: newModStatus, ...(newStatus ? { status: newStatus } : {}) }
            : i
        )
      );

      toast.success(`Item ${itemId.substring(0, 8)} moderation set to '${newModStatus}'`);
    } catch (err) {
      toast.error(err.message || 'Moderation action failed.');
    }
  };

  const handleResolveReport = async (reportId, resolution) => {
    try {
      await resolveAdminReport(reportId, resolution, adminToken);
      setReports((prev) =>
        prev.map((r) => (r.reportId === reportId ? { ...r, status: resolution } : r))
      );
      toast.success(`Abuse report ${resolution}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update report resolution.');
    }
  };

  const flaggedItems = items.filter(
    (i) => i.moderationStatus === 'flagged' || i.status === 'under_review'
  );
  const pendingReports = reports.filter((r) => r.status === 'pending');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Administrative Moderation Portal
            </h1>
            <p className="text-xs text-slate-500">
              Logged in as <strong className="text-slate-800">{adminUser?.username || 'Administrator'}</strong> ({adminUser?.role || 'Staff'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAdminData}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            title="Refresh database records"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => {
              authState.logout();
              navigate('/');
            }}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 text-rose-600 hover:text-rose-700"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-premium p-4">
          <span className="text-xs font-semibold text-slate-500">Total Listings</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
        </div>
        <div className="card-premium p-4">
          <span className="text-xs font-semibold text-amber-600">Flagged for Review</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{flaggedItems.length}</p>
        </div>
        <div className="card-premium p-4">
          <span className="text-xs font-semibold text-rose-600">Pending Abuse Reports</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">{pendingReports.length}</p>
        </div>
        <div className="card-premium p-4">
          <span className="text-xs font-semibold text-emerald-600">Active Approved</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {items.filter((i) => i.status === 'active' && i.moderationStatus === 'approved').length}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('items')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition ${
            activeTab === 'items'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          All Reports ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Moderation Queue</span>
          {flaggedItems.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
              {flaggedItems.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Abuse Reports</span>
          {pendingReports.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px]">
              {pendingReports.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Contents */}
      {isLoading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner text="Retrieving administrative records..." />
        </div>
      ) : activeTab === 'items' ? (
        /* All Items Table */
        <div className="card-premium overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-3.5">Item Name</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Moderation</th>
                  <th className="p-3.5 text-right">Moderator Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No reports in database.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.itemId} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 font-bold text-slate-900">
                        <Link
                          to={`/items/${item.itemId}`}
                          className="hover:text-indigo-600 flex items-center gap-1"
                          target="_blank"
                        >
                          <span>{item.name}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                      </td>
                      <td className="p-3.5 uppercase font-semibold text-[11px]">
                        <span
                          className={
                            item.type === 'lost' ? 'text-rose-600' : 'text-emerald-600'
                          }
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 capitalize">{item.category}</td>
                      <td className="p-3.5 text-slate-600 line-clamp-1 max-w-[150px]">
                        {item.location}
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.moderationStatus === 'approved'
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.moderationStatus === 'flagged'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {item.moderationStatus || 'approved'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                        {item.moderationStatus !== 'approved' && (
                          <button
                            onClick={() => handleModerateItem(item.itemId, 'approved')}
                            className="btn-secondary text-[10px] py-1 px-2 text-emerald-700 hover:bg-emerald-50"
                            title="Approve Listing"
                          >
                            Approve
                          </button>
                        )}
                        {item.moderationStatus !== 'hidden' && (
                          <button
                            onClick={() => handleModerateItem(item.itemId, 'hidden')}
                            className="btn-secondary text-[10px] py-1 px-2 text-rose-700 hover:bg-rose-50"
                            title="Hide from public"
                          >
                            Hide
                          </button>
                        )}
                        {item.status !== 'archived' && (
                          <button
                            onClick={() => handleModerateItem(item.itemId, item.moderationStatus, 'archived')}
                            className="btn-secondary text-[10px] py-1 px-2 text-slate-700"
                            title="Archive Item"
                          >
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'queue' ? (
        /* Moderation Queue Tab */
        <div className="space-y-4">
          {flaggedItems.length === 0 ? (
            <div className="card-premium p-12 text-center flex flex-col items-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
              <h3 className="text-base font-bold text-slate-900">
                Moderation Queue is Clear!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                There are no flagged items requiring attention right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flaggedItems.map((item) => (
                <div key={item.itemId} className="card-premium p-5 border-amber-200 bg-amber-50/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 uppercase flex items-center gap-1">
                      <Flag className="w-3.5 h-3.5" /> Flagged for Review
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{item.name}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2">{item.description}</p>
                  <div className="text-xs text-slate-500">
                    Location: <strong>{item.location}</strong> • Contact: <strong>{item.contactName} ({item.contactMethod})</strong>
                  </div>
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleModerateItem(item.itemId, 'approved')}
                      className="btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700"
                    >
                      Approve & Unflag
                    </button>
                    <button
                      onClick={() => handleModerateItem(item.itemId, 'hidden')}
                      className="btn-danger text-xs py-1.5 px-3"
                    >
                      Hide Listing
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Abuse Reports Tab */
        <div className="card-premium overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-3.5">Report ID</th>
                  <th className="p-3.5">Target Item</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Reporter Context</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No abuse reports filed.
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => (
                    <tr key={r.reportId} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 font-mono text-[11px] text-slate-500">
                        {r.reportId.substring(0, 8)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        <Link
                          to={`/items/${r.itemId}`}
                          className="hover:text-indigo-600 flex items-center gap-1"
                          target="_blank"
                        >
                          <span>{r.itemName || r.itemId.substring(0, 8)}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                      </td>
                      <td className="p-3.5 font-semibold text-rose-600 uppercase text-[10px]">
                        {r.reason}
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-[200px] truncate">
                        {r.details || 'No additional details'}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : r.status === 'actioned'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                        {r.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleResolveReport(r.reportId, 'actioned')}
                              className="btn-secondary text-[10px] py-1 px-2 text-emerald-700 hover:bg-emerald-50"
                            >
                              Action
                            </button>
                            <button
                              onClick={() => handleResolveReport(r.reportId, 'dismissed')}
                              className="btn-secondary text-[10px] py-1 px-2 text-slate-600 hover:bg-slate-100"
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
