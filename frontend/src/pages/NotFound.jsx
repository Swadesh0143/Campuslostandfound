import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="card-premium p-10 max-w-md w-full text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
          <Compass className="w-8 h-8" />
        </div>
        <span className="text-4xl font-extrabold text-indigo-600">404</span>
        <h1 className="text-xl font-bold text-slate-900 mt-2">Page Not Found</h1>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed max-w-xs">
          The campus page or report link you are looking for does not exist or may have been moved.
        </p>
        <div className="mt-6 flex gap-3">
          <Link to="/" className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5" />
            Home
          </Link>
          <Link to="/items" className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            Browse Reports
          </Link>
        </div>
      </div>
    </div>
  );
}
