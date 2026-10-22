import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Key,
  ShieldCheck,
  CheckCircle,
  Archive,
  Trash2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { verifyManagementToken, updateItemStatus, deleteItem } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';

export function ManageReport() {
  const { itemId } = useParams();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [tokenInput, setTokenInput] = useState(tokenFromUrl);
  const [token, setToken] = useState(tokenFromUrl);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [item, setItem] = useState(null);
  const [allowedActions, setAllowedActions] = useState([]);
  const [verifyError, setVerifyError] = useState(null);

  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  const handleVerify = async (tokenToTest) => {
    if (!tokenToTest || tokenToTest.length !== 64) {
      setVerifyError('Management token must be a 64-character cryptographic hex key.');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const response = await verifyManagementToken(itemId, tokenToTest);
      if (response.success && response.valid) {
        setIsVerified(true);
        setItem(response.item);
        setAllowedActions(response.allowedActions || ['update_status', 'delete_report']);
        setToken(tokenToTest);
        toast.success('Ownership token verified successfully!');
      } else {
        setVerifyError(response.error || 'Invalid or expired management token.');
        setIsVerified(false);
      }
    } catch (err) {
      setVerifyError(err.message || 'Verification failed. Please check token.');
      setIsVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (tokenFromUrl && tokenFromUrl.length === 64) {
      handleVerify(tokenFromUrl);
    }
  }, [tokenFromUrl, itemId]);

  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);

    try {
      const response = await updateItemStatus(itemId, newStatus, token);
      if (response.success) {
        setItem((prev) => ({ ...prev, status: newStatus }));

        if (newStatus === 'returned') {
          // Fire celebration confetti!
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
          toast.success('Congratulations! Report marked as returned/recovered.');
        } else {
          toast.success(`Report status updated to ${newStatus}.`);
        }
      } else {
        toast.error(response.error || 'Failed to update status.');
      }
    } catch (err) {
      toast.error(err.message || 'Status update failed.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsUpdating(true);

    try {
      const response = await deleteItem(itemId, token);
      if (response.success) {
        toast.success('Report successfully deleted.');
        navigate('/items');
      } else {
        toast.error(response.error || 'Failed to delete report.');
      }
    } catch (err) {
      toast.error(err.message || 'Deletion failed.');
    } finally {
      setIsUpdating(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
          <Key className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Manage Your Campus Report
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
          Update status, mark as recovered, or remove your listing without requiring a conventional password.
        </p>
      </div>

      {/* Verification View if not yet verified */}
      {!isVerified ? (
        <div className="card-premium p-6 sm:p-8 space-y-5">
          <div>
            <label htmlFor="token-input" className="block text-xs font-bold text-slate-800 mb-1">
              Enter 64-Character Management Token
            </label>
            <input
              id="token-input"
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value.trim())}
              placeholder="Paste your 64-character token here..."
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              This token was provided when you originally submitted the report.
            </p>
          </div>

          {verifyError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}

          <button
            onClick={() => handleVerify(tokenInput)}
            disabled={isVerifying || !tokenInput}
            className="w-full btn-primary text-xs py-2.5"
          >
            {isVerifying ? 'Verifying Token...' : 'Verify Ownership Token'}
          </button>
        </div>
      ) : (
        /* Verified Management Panel */
        <div className="space-y-6">
          {/* Item Summary Card */}
          <div className="card-premium p-6 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Verified Report Owner
                </span>
              </div>
              <StatusBadge status={item?.status} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {item?.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Type: <strong className="capitalize">{item?.type}</strong> • Event Date: {item?.eventDate}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Link
                to={`/items/${itemId}`}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                target="_blank"
              >
                <span>View Public Report Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Allowed Actions Section */}
          <div className="card-premium p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Available Owner Actions
            </h3>

            <div className="space-y-3">
              {/* Mark as Returned / Recovered */}
              {item?.status !== 'returned' && item?.status !== 'archived' && (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      Mark as Returned / Recovered
                    </h4>
                    <p className="text-xs text-blue-800 mt-0.5">
                      Item was returned to its rightful owner. This will update the status and safely close contact inquiries.
                    </p>
                  </div>
                  <button
                    onClick={() => handleStatusChange('returned')}
                    disabled={isUpdating}
                    className="btn-primary bg-blue-600 hover:bg-blue-700 text-xs py-2 px-4 shrink-0"
                  >
                    Mark Recovered
                  </button>
                </div>
              )}

              {/* Archive Report */}
              {item?.status !== 'archived' && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Archive className="w-4 h-4 text-slate-600" />
                      Archive Report
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Hide this listing from active searches without permanently deleting records.
                    </p>
                  </div>
                  <button
                    onClick={() => handleStatusChange('archived')}
                    disabled={isUpdating}
                    className="btn-secondary text-xs py-2 px-4 shrink-0"
                  >
                    Archive
                  </button>
                </div>
              )}

              {/* Permanent Deletion */}
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-rose-950 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    Permanently Delete Report
                  </h4>
                  <p className="text-xs text-rose-800 mt-0.5">
                    Permanently removes this report and any associated images from AWS DynamoDB and S3.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isUpdating}
                  className="btn-danger text-xs py-2 px-4 shrink-0"
                >
                  Delete Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="card-premium p-6 max-w-sm w-full bg-white space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">
              Permanently Delete Report?
            </h3>
            <p className="text-xs text-slate-500 text-center">
              This action cannot be undone. All database records and uploaded photographs will be permanently deleted.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary text-xs py-2"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger text-xs py-2"
                disabled={isUpdating}
              >
                {isUpdating ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
