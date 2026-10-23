import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Shield, Cloud, Heart, Phone, MapPin, ExternalLink } from 'lucide-react';
import { config } from '../config';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-20 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                {config.appName}
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {config.tagline} Centralized, secure cloud platform connecting students and campus staff to recover lost personal belongings.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{config.campusName} — Main Campus</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Quick Navigation
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/items" className="hover:text-white transition">
                  Browse Active Reports
                </Link>
              </li>
              <li>
                <Link to="/report/lost" className="hover:text-white transition">
                  Report a Lost Item
                </Link>
              </li>
              <li>
                <Link to="/report/found" className="hover:text-white transition">
                  Report a Found Belonging
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition">
                  Cloud Architecture & Viva Guide
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="hover:text-white transition flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  Staff Moderation Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Campus Support & Security */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Campus Safety & Support
            </h4>
            <div className="space-y-3 text-sm text-slate-400">
              <p>
                Found an item containing university identification, cash, or credit cards? Please hand it directly to Campus Security.
              </p>
              <div className="flex items-center gap-2 text-xs text-indigo-300 font-medium bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <Phone className="w-4 h-4 shrink-0 text-indigo-400" />
                <span>Security Hotline: (555) 019-2834</span>
              </div>
            </div>
          </div>

          {/* AWS Cloud Architecture Specs */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-indigo-400" />
              AWS Cloud Stack
            </h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">API Gateway</span>
                <span className="font-mono text-indigo-300">HTTP API v2</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Compute</span>
                <span className="font-mono text-indigo-300">AWS Lambda (Node.js)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Database</span>
                <span className="font-mono text-indigo-300">PostgreSQL</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Storage</span>
                <span className="font-mono text-indigo-300">Amazon S3 (Private + Presigned)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Authentication</span>
                <span className="font-mono text-indigo-300">Amazon Cognito</span>
              </div>
            </div>
            <div className="mt-4 p-2.5 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-[11px] text-emerald-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>PostgreSQL hosting is provider-dependent</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {config.appName} — {config.campusName}. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Engineered with serverless security & privacy in mind.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
