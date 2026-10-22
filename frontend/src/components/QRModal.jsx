import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Copy, Check, ShieldCheck } from 'lucide-react';
import { useToast } from './Toast';

export function QRModal({ isOpen, onClose, itemId, itemName }) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);
  const toast = useToast();

  if (!isOpen || !itemId) return null;

  // Build the public item URL using window.location.origin
  const publicItemUrl = `${window.location.origin}/items/${itemId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicItemUrl);
      setCopied(true);
      toast.success('Public item link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy link automatically.');
    }
  };

  const handleDownloadQR = () => {
    try {
      const svgElement = qrRef.current?.querySelector('svg');
      if (!svgElement) {
        toast.error('Unable to locate QR code element');
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width + 40;
        canvas.height = img.height + 40;
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 20, 20);
          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `CampusFind-QR-${itemId.substring(0, 8)}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          toast.success('QR Code downloaded as PNG!');
        }
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error('Download QR failed:', err);
      toast.error('Failed to download QR code image.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden p-6 flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          aria-label="Close QR Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 id="qr-modal-title" className="text-lg font-bold text-slate-900">
          Share Report via QR Code
        </h3>
        <p className="mt-1 text-xs text-slate-500 line-clamp-1">
          {itemName || 'Item Details'}
        </p>

        {/* QR Code Container */}
        <div
          ref={qrRef}
          className="mt-5 p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-inner flex items-center justify-center"
        >
          <QRCodeSVG
            value={publicItemUrl}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* Privacy verification notice */}
        <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-100">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Encodes only the public item URL. No private contact or management tokens.</span>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 grid grid-cols-2 gap-3 w-full">
          <button
            onClick={handleCopyLink}
            className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={handleDownloadQR}
            className="btn-primary text-xs py-2 px-3 flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}
