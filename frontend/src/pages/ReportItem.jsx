import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  UploadCloud,
  X,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  QrCode,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { CATEGORIES, config } from '../config';
import { getPresignedUploadUrl, uploadFileToS3, createItem } from '../services/api';
import { useToast } from '../components/Toast';
import { QRModal } from '../components/QRModal';

export function ReportItem({ defaultType = 'lost' }) {
  const location = useLocation();
  const initialType = location.pathname.includes('/found') ? 'found' : defaultType;

  const [type, setType] = useState(initialType);
  const [formData, setFormData] = useState({
    name: '',
    category: 'electronics',
    description: '',
    location: '',
    eventDate: new Date().toISOString().split('T')[0],
    contactName: '',
    contactMethod: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatusText, setSubmitStatusText] = useState('');

  // Result state after successful submission
  const [submissionResult, setSubmissionResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const toast = useToast();

  useEffect(() => {
    setType(location.pathname.includes('/found') ? 'found' : 'lost');
  }, [location.pathname]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setFormErrors((prev) => ({
        ...prev,
        image: 'Please select a valid image (JPG, PNG, or WebP).',
      }));
      return;
    }

    // Validate size (5MB)
    const maxBytes = config.maxImageSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setFormErrors((prev) => ({
        ...prev,
        image: `Image exceeds ${config.maxImageSizeMb}MB maximum limit.`,
      }));
      return;
    }

    setFormErrors((prev) => ({ ...prev, image: null }));
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadProgress(0);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim() || formData.name.trim().length < 3) {
      errors.name = 'Item name must be at least 3 characters.';
    }
    if (!formData.category) {
      errors.category = 'Please choose a category.';
    }
    if (!formData.description.trim() || formData.description.trim().length < 5) {
      errors.description = 'Please provide at least a short description (5+ characters).';
    }
    if (!formData.location.trim() || formData.location.trim().length < 2) {
      errors.location = 'Please state where the item was lost or found.';
    }
    if (!formData.eventDate) {
      errors.eventDate = 'Please select a date.';
    }
    if (!formData.contactName.trim() || formData.contactName.trim().length < 2) {
      errors.contactName = 'Please enter your display name.';
    }
    if (!formData.contactMethod.trim() || formData.contactMethod.trim().length < 3) {
      errors.contactMethod = 'Please provide contact information (e.g. university email or phone number).';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please review the form errors before submitting.');
      return;
    }

    setIsSubmitting(true);
    let uploadedImageKey = null;

    try {
      // 1. Upload image to S3 via presigned URL if file was selected
      if (selectedFile) {
        setSubmitStatusText('Authorizing secure S3 upload...');
        const fileExt = selectedFile.name.split('.').pop() || 'jpg';

        const presignRes = await getPresignedUploadUrl({
          mimeType: selectedFile.type,
          fileExtension: fileExt,
          fileSize: selectedFile.size,
        });

        if (!presignRes.success || !presignRes.data?.uploadUrl) {
          throw new Error(presignRes.error || 'Failed to authorize S3 image upload.');
        }

        const { uploadUrl, objectKey } = presignRes.data;
        uploadedImageKey = objectKey;

        setSubmitStatusText('Uploading image directly to Amazon S3...');
        await uploadFileToS3(uploadUrl, selectedFile, (percent) => {
          setUploadProgress(percent);
        });
      }

      // 2. Persist record to DynamoDB backend
      setSubmitStatusText('Saving report to DynamoDB and generating ownership token...');
      const createRes = await createItem({
        type,
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim(),
        location: formData.location.trim(),
        eventDate: formData.eventDate,
        contactName: formData.contactName.trim(),
        contactMethod: formData.contactMethod.trim(),
        imageKey: uploadedImageKey,
      });

      if (!createRes.success || !createRes.item) {
        throw new Error(createRes.error || 'Backend failed to save item report.');
      }

      // 3. Confirm success
      toast.success(
        type === 'lost'
          ? 'Lost item reported successfully!'
          : 'Found item reported successfully!'
      );

      setSubmissionResult({
        item: createRes.item,
        management: createRes.management,
      });
    } catch (err) {
      console.error('Submission failed:', err);
      toast.error(err.message || 'An error occurred during submission. Please try again.');
    } finally {
      setIsSubmitting(false);
      setSubmitStatusText('');
    }
  };

  const copyToClipboard = async (text, typeTarget) => {
    try {
      await navigator.clipboard.writeText(text);
      if (typeTarget === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } else {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2500);
      }
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Unable to copy automatically.');
    }
  };

  // -------------------------------------------------------------
  // Post-Submission Success State
  // -------------------------------------------------------------
  if (submissionResult) {
    const fullManageUrl = `${window.location.origin}${submissionResult.management.manageUrl}`;
    const publicUrl = `/items/${submissionResult.item.itemId}`;

    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="card-premium p-8 sm:p-10 border-emerald-200 bg-white">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 text-center tracking-tight">
            Report Published Successfully!
          </h2>
          <p className="mt-2 text-sm text-slate-600 text-center">
            Your {submissionResult.item.type} report for <strong className="text-slate-900">{submissionResult.item.name}</strong> is now live on the campus registry.
          </p>

          {/* Critical Management Link Warning Box */}
          <div className="mt-8 p-5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Save Your Private Management Link</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              Anyone with this link can update the report status (e.g. mark it as returned) or delete it. <strong>This link contains your cryptographically secure management token and will only be displayed once.</strong>
            </p>

            <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-amber-200">
              <input
                type="text"
                readOnly
                value={fullManageUrl}
                className="w-full text-xs font-mono text-slate-700 bg-transparent focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(fullManageUrl, 'link')}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Action Navigation */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to={publicUrl}
              className="btn-primary text-xs py-2.5 px-4 flex items-center justify-center gap-1.5"
            >
              <span>View Public Report</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => setShowQR(true)}
              className="btn-secondary text-xs py-2.5 px-4 flex items-center justify-center gap-1.5"
            >
              <QrCode className="w-4 h-4 text-indigo-600" />
              <span>Generate QR Poster</span>
            </button>

            <Link
              to={submissionResult.management.manageUrl}
              className="btn-secondary text-xs py-2.5 px-4 flex items-center justify-center gap-1.5"
            >
              <span>Manage Report Now</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>

        <QRModal
          isOpen={showQR}
          onClose={() => setShowQR(false)}
          itemId={submissionResult.item.itemId}
          itemName={submissionResult.item.name}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // Reporting Form View
  // -------------------------------------------------------------
  const isLost = type === 'lost';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Title & Type Toggle Tabs */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {isLost ? 'Report a Lost Belonging' : 'Report a Found Belonging'}
        </h1>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          {isLost
            ? 'Fill out the details below so campus community members can identify and return your missing item.'
            : 'Thank you for being a good Samaritan! Please report what you found so the rightful owner can claim it.'}
        </p>

        {/* Mode Toggle */}
        <div className="inline-flex p-1 bg-slate-200 rounded-2xl">
          <button
            type="button"
            onClick={() => setType('lost')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition ${
              isLost
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            I Lost Something
          </button>
          <button
            type="button"
            onClick={() => setType('found')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition ${
              !isLost
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            I Found Something
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form noValidate onSubmit={handleSubmit} className="card-premium p-6 sm:p-8 space-y-6">
        {/* Item Name */}
        <div>
          <label htmlFor="field-name" className="block text-xs font-bold text-slate-800 mb-1">
            Item Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="field-name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g. Casio Scientific Calculator, Hydro Flask Water Bottle, Student ID Card..."
            maxLength={100}
            className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
              formErrors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
            }`}
            required
          />
          {formErrors.name && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {formErrors.name}
            </p>
          )}
        </div>

        {/* Category & Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Category */}
          <div>
            <label htmlFor="field-category" className="block text-xs font-bold text-slate-800 mb-1">
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              id="field-category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white"
              required
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Event Date */}
          <div>
            <label htmlFor="field-date" className="block text-xs font-bold text-slate-800 mb-1">
              Date {isLost ? 'Lost' : 'Found'} <span className="text-rose-500">*</span>
            </label>
            <input
              id="field-date"
              name="eventDate"
              type="date"
              value={formData.eventDate}
              onChange={handleInputChange}
              max={new Date().toISOString().split('T')[0]}
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                formErrors.eventDate ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
              }`}
              required
            />
            {formErrors.eventDate && (
              <p className="mt-1 text-xs text-rose-600">{formErrors.eventDate}</p>
            )}
          </div>
        </div>

        {/* Campus Location */}
        <div>
          <label htmlFor="field-location" className="block text-xs font-bold text-slate-800 mb-1">
            Campus Location <span className="text-rose-500">*</span>
          </label>
          <input
            id="field-location"
            name="location"
            type="text"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="e.g. Main Library 2nd Floor Quiet Zone, Student Center Dining Hall, Gym Lockers..."
            maxLength={100}
            className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
              formErrors.location ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
            }`}
            required
          />
          {formErrors.location && (
            <p className="mt-1 text-xs text-rose-600">{formErrors.location}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="field-desc" className="block text-xs font-bold text-slate-800 mb-1">
            Detailed Description <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="field-desc"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Include distinctive markings, color, brand, stickers, keychains, or condition. Do NOT include passwords or sensitive personal security codes."
            maxLength={1000}
            className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
              formErrors.description ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
            }`}
            required
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-1">
            {formErrors.description ? (
              <span className="text-rose-600">{formErrors.description}</span>
            ) : (
              <span>Help the owner or finder verify the item safely</span>
            )}
            <span>{formData.description.length}/1000</span>
          </div>
        </div>

        {/* Optional Photograph Upload (Amazon S3 Presigned URL) */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Optional Photograph
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Uploaded securely directly to a private Amazon S3 bucket. Maximum size: {config.maxImageSizeMb}MB. Supported: JPG, PNG, WebP.
          </p>

          {previewUrl ? (
            <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 overflow-hidden bg-slate-100">
              <img
                src={previewUrl}
                alt="Upload preview"
                className="w-full h-48 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition"
                aria-label="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="photo-upload"
              className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 cursor-pointer bg-slate-50/60 hover:bg-indigo-50/30 transition text-center"
            >
              <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-xs font-semibold text-slate-700">
                Click or drag to select an image
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">
                JPG, PNG, or WebP up to 5MB
              </span>
              <input
                id="photo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
          )}

          {formErrors.image && (
            <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {formErrors.image}
            </p>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Uploading image to S3...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Contact Information & Privacy Section */}
        <div className="pt-4 border-t border-slate-200/80 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Contact & Privacy Information
            </h3>
            <p className="text-xs text-slate-500">
              Your contact details are protected. They are not displayed in public listings and can only be accessed through an explicit inquiry confirmation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-contactName" className="block text-xs font-bold text-slate-800 mb-1">
                Your Display Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="field-contactName"
                name="contactName"
                type="text"
                value={formData.contactName}
                onChange={handleInputChange}
                placeholder="e.g. Alex (Student) or Library Staff"
                maxLength={50}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                  formErrors.contactName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                }`}
                required
              />
              {formErrors.contactName && (
                <p className="mt-1 text-xs text-rose-600">{formErrors.contactName}</p>
              )}
            </div>

            <div>
              <label htmlFor="field-contactMethod" className="block text-xs font-bold text-slate-800 mb-1">
                Protected Contact Method <span className="text-rose-500">*</span>
              </label>
              <input
                id="field-contactMethod"
                name="contactMethod"
                type="text"
                value={formData.contactMethod}
                onChange={handleInputChange}
                placeholder="e.g. alex@campus.edu or 555-0192"
                maxLength={100}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                  formErrors.contactMethod ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                }`}
                required
              />
              {formErrors.contactMethod && (
                <p className="mt-1 text-xs text-rose-600">{formErrors.contactMethod}</p>
              )}
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            By submitting, you agree this report is accurate and adheres to campus guidelines.
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white shadow-sm transition active:scale-95 flex items-center justify-center gap-2 ${
              isLost
                ? 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300'
                : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                <span>{submitStatusText || 'Submitting Report...'}</span>
              </>
            ) : (
              <span>Submit {isLost ? 'Lost Report' : 'Found Report'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
