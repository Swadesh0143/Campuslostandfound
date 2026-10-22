import React, { useState } from 'react';
import { X, Flag, AlertTriangle, CheckCircle } from 'lucide-react';
import { submitAbuseReport } from '../services/api';
import { useToast } from './Toast';

export function ReportAbuseModal({ isOpen, onClose, itemId, itemName }) {
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  if (!isOpen || !itemId) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await submitAbuseReport(itemId, { reason, details });
      setSubmitted(true);
      toast.success('Your report has been submitted to campus moderators for review.');
      setTimeout(() => {
        setSubmitted(false);
        setDetails('');
        setReason('spam');
        onClose();
      }, 2000);
    } catch (err) {
      toast.error(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Report Submitted</h3>
            <p className="mt-2 text-xs text-slate-500 max-w-xs">
              Thank you for keeping our campus community safe. Our moderation team will review this listing promptly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <Flag className="w-5 h-5" />
              </div>
              <div>
                <h3 id="report-modal-title" className="text-lg font-bold text-slate-900">
                  Report Listing
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1">
                  Item: {itemName}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="report-reason" className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for reporting <span className="text-rose-500">*</span>
                </label>
                <select
                  id="report-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  required
                >
                  <option value="spam">Spam / Commercial Advertisement</option>
                  <option value="offensive">Offensive, Inappropriate, or Harassing Language</option>
                  <option value="inaccurate">Inaccurate Information or Fake Report</option>
                  <option value="sensitive_info">Exposes Sensitive Identity or Private Info</option>
                  <option value="other">Other Violation</option>
                </select>
              </div>

              <div>
                <label htmlFor="report-details" className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  id="report-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Provide context for the moderator (max 500 characters)..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 float-right">
                  {details.length}/500
                </span>
              </div>

              <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-500 border border-slate-100">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Reports are private and reviewed solely by campus staff. Your IP address is securely hashed to prevent report flooding.
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-xs py-2 px-4"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-danger text-xs py-2 px-4"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
