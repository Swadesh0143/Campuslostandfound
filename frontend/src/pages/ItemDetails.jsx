import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Eye,
  Clock,
  ShieldCheck,
  QrCode,
  Flag,
  Share2,
  Phone,
  Mail,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Laptop,
  Briefcase,
  CreditCard,
  BookOpen,
  Shirt,
  Key,
  Watch,
  FolderOpen,
} from 'lucide-react';
import { getItem, getContactInfo } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { QRModal } from '../components/QRModal';
import { ReportAbuseModal } from '../components/ReportAbuseModal';
import { useToast } from '../components/Toast';
import { CATEGORIES } from '../config';

const CATEGORY_ICONS = {
  electronics: Laptop,
  bags: Briefcase,
  id_cards: CreditCard,
  books: BookOpen,
  clothing: Shirt,
  keys: Key,
  accessories: Watch,
  other: HelpCircle,
};

export function ItemDetails() {
  const { itemId } = useParams();
  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Contact info reveal state
  const [contactInfo, setContactInfo] = useState(null);
  const [isLoadingContact, setIsLoadingContact] = useState(false);
  const [contactError, setContactError] = useState(null);

  // Modals
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isAbuseModalOpen, setIsAbuseModalOpen] = useState(false);

  const toast = useToast();

  useEffect(() => {
    let isMounted = true;

    async function loadItem() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getItem(itemId);
        if (isMounted) {
          if (response.success && response.item) {
            setItem(response.item);
          } else {
            setError(response.error || 'Item report not found.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Error connecting to CampusFind server.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (itemId) {
      loadItem();
    }

    return () => {
      isMounted = false;
    };
  }, [itemId]);

  const handleRevealContact = async () => {
    if (contactInfo) return; // already revealed
    setIsLoadingContact(true);
    setContactError(null);

    try {
      const response = await getContactInfo(itemId);
      if (response.success && response.data) {
        setContactInfo(response.data);
        toast.success('Contact information safely revealed.');
      } else {
        setContactError(response.error || 'Unable to retrieve contact details.');
      }
    } catch (err) {
      setContactError(err.message || 'Failed to reveal contact information.');
      toast.error(err.message || 'Contact retrieval failed.');
    } finally {
      setIsLoadingContact(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 flex justify-center">
        <LoadingSpinner size="lg" text="Loading report details..." />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="card-premium p-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Report Not Available</h2>
          <p className="mt-2 text-sm text-slate-600 max-w-sm">
            {error || 'This report may have been deleted, resolved, or removed by campus moderators.'}
          </p>
          <div className="mt-6 flex gap-3">
            <Link to="/items" className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              Return to Browse
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isLost = item.type === 'lost';
  const IconComponent = CATEGORY_ICONS[item.category] || HelpCircle;
  const categoryMeta = CATEGORIES.find((c) => c.id === item.category);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button & Action Toolbar */}
      <div className="flex items-center justify-between">
        <Link
          to="/items"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Listings
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsQRModalOpen(true)}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            title="Generate QR poster for physical campus boards"
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>QR Code</span>
          </button>

          <button
            onClick={() => setIsAbuseModalOpen(true)}
            className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
            title="Report inappropriate listing"
            aria-label="Report listing"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Details Card */}
      <div className="card-premium overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Photograph or Category Graphic */}
        <div className="relative min-h-[320px] md:min-h-full bg-slate-100 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-200/80">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover max-h-[480px]"
            />
          ) : (
            <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
              <IconComponent className="w-24 h-24 stroke-[1.2] mb-3 text-indigo-400" />
              <span className="text-sm font-medium text-slate-500">
                No photograph provided
              </span>
              <span className="text-xs text-slate-400 mt-1">
                Category: {categoryMeta?.label || item.category}
              </span>
            </div>
          )}

          {/* Type Badge */}
          <div className="absolute top-4 left-4">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-sm ${
                isLost
                  ? 'bg-rose-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isLost ? 'Lost Item' : 'Found Item'}
            </span>
          </div>

          {/* Status Badge */}
          <div className="absolute top-4 right-4">
            <StatusBadge status={item.status} className="shadow-md backdrop-blur-md bg-white/95" />
          </div>
        </div>

        {/* Content Details Column */}
        <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Meta Tags */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg">
                {categoryMeta?.label || item.category}
              </span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date {isLost ? 'lost' : 'found'}: {item.eventDate}</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {item.name}
            </h1>

            {/* Location */}
            <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
              <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900">Reported Location:</span>
                <p className="mt-0.5 text-slate-600">{item.location}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Description & Distinguishing Features
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-white p-3 rounded-xl border border-slate-100">
                {item.description}
              </p>
            </div>

            {/* Reporter Display Name */}
            <div className="text-xs text-slate-500 flex items-center justify-between pt-2">
              <span>Reported by: <strong className="text-slate-800">{item.contactName}</strong></span>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Eye className="w-3 h-3" />
                <span>{item.viewCount || 1} views</span>
              </div>
            </div>
          </div>

          {/* Contact Privacy Box */}
          <div className="pt-4 border-t border-slate-100">
            {item.status === 'returned' ? (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-bold">Item Successfully Returned / Recovered!</p>
                  <p className="text-blue-700 mt-0.5">This report is now closed and contact details are no longer accessible.</p>
                </div>
              </div>
            ) : item.status === 'archived' ? (
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs">
                This listing has been archived.
              </div>
            ) : contactInfo ? (
              <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <span>Reporter Contact Details</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-indigo-100 space-y-1.5 text-xs">
                  <p className="text-slate-500">Contact Person: <strong className="text-slate-900">{contactInfo.contactName}</strong></p>
                  <p className="text-slate-500 flex items-center gap-1.5">
                    <span>Direct Details:</span>
                    <strong className="text-indigo-700 font-mono text-sm">{contactInfo.contactMethod}</strong>
                  </p>
                </div>
                <p className="text-[11px] text-indigo-800 leading-tight">
                  {contactInfo.safetyNotice}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleRevealContact}
                  disabled={isLoadingContact}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-white shadow-sm transition active:scale-95 flex items-center justify-center gap-2 ${
                    isLost ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  <span>
                    {isLoadingContact
                      ? 'Retrieving Contact Details...'
                      : isLost
                      ? 'Contact Owner to Return Item'
                      : 'Contact Finder to Claim Item'}
                  </span>
                </button>

                {contactError && (
                  <p className="text-xs text-rose-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {contactError}
                  </p>
                )}

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Contact info is protected from automated crawlers and public search indexes</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <QRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        itemId={item.itemId}
        itemName={item.name}
      />

      <ReportAbuseModal
        isOpen={isAbuseModalOpen}
        onClose={() => setIsAbuseModalOpen(false)}
        itemId={item.itemId}
        itemName={item.name}
      />
    </div>
  );
}
