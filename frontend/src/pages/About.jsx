import React from 'react';
import {
  Cloud,
  ShieldCheck,
  Database,
  Lock,
  Layers,
  Server,
  Zap,
  DollarSign,
  FileText,
  Key,
} from 'lucide-react';
import { config } from '../config';

export function About() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Title */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
          <Cloud className="w-3.5 h-3.5 text-indigo-600" />
          Cloud Computing Engineering & Architecture
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          About {config.appName}
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          A production-grade, 100% serverless web application engineered for campus communities to report, discover, and recover lost personal belongings with cryptographic ownership and contact privacy.
        </p>
      </div>

      {/* Cloud Architecture Overview */}
      <section className="card-premium p-6 sm:p-8 space-y-6 bg-white">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">
            AWS Serverless Cloud Architecture
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* API Gateway */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              <span>Amazon API Gateway</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">HTTP API v2</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Provides high-speed, cost-effective HTTP endpoints with CORS preflight support, payload validation, and request dispatching to backend Lambda functions.
            </p>
          </div>

          {/* AWS Lambda */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <Server className="w-4 h-4" />
              <span>AWS Lambda</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Serverless Compute</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Executes business logic on-demand with Node.js 20 and AWS SDK v3. Automatically scales from 0 to thousands of requests with zero idle server costs.
            </p>
          </div>

          {/* PostgreSQL */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <Database className="w-4 h-4" />
              <span>PostgreSQL</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Relational Database</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Stores item reports, abuse reports, and salted ownership-token hashes with transactional consistency.
            </p>
          </div>

          {/* Amazon S3 */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <Lock className="w-4 h-4" />
              <span>Amazon S3</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Private Object Storage</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Fully private bucket with Block Public Access enabled. Client images are uploaded directly using short-lived (5-minute) presigned PUT URLs with MIME type and size checks.
            </p>
          </div>

          {/* Amazon Cognito */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Amazon Cognito</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Admin User Pool</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Secures administrative routes and moderation actions for campus staff. Public reporting remains frictionless without forced account barriers.
            </p>
          </div>

          {/* CloudWatch */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>Amazon CloudWatch</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">Logs & Retention</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Aggregates execution logs with a strict 14-day retention policy to prevent unbounded log accumulation and eliminate unexpected cloud storage costs.
            </p>
          </div>
        </div>
      </section>

      {/* Security & Cryptographic Ownership */}
      <section className="card-premium p-6 sm:p-8 space-y-5 bg-white">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <Key className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">
            Cryptographic Report Ownership Model
          </h2>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <p>
            Traditional campus lost-and-found platforms suffer from either mandatory student signup friction or insecure public edit links. <strong>CampusFind solves this through backend cryptographic tokenization:</strong>
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong>High Entropy Generation:</strong> When a report is filed, the Lambda backend generates a 256-bit cryptographically random token (<code className="font-mono text-indigo-600">crypto.randomBytes(32)</code>) and a 128-bit salt.
            </li>
            <li>
              <strong>Hashed Persistence:</strong> Only the SHA-256 hash and salt are stored in PostgreSQL. The raw token is returned exactly once in the response.
            </li>
            <li>
              <strong>Timing Attack Prevention:</strong> When updating or deleting, the user supplies their token via header <code className="font-mono text-indigo-600">X-Management-Token</code>. The backend verifies it using <code className="font-mono text-indigo-600">crypto.timingSafeEqual</code> to prevent side-channel timing attacks.
            </li>
            <li>
              <strong>Zero Leakage:</strong> Management tokens are never embedded in public endpoints, never returned in search queries, and never encoded in shareable QR codes.
            </li>
          </ol>
        </div>
      </section>

      {/* Cost Safeguards */}
      <section className="card-premium p-6 sm:p-8 space-y-4 bg-emerald-50/50 border-emerald-200">
        <div className="flex items-center gap-2.5 pb-3 border-b border-emerald-200">
          <DollarSign className="w-5 h-5 text-emerald-700" />
          <h2 className="text-lg font-bold text-emerald-950">
            Student Promotional Credit Safeguard ($200 Budget)
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
          To ensure maximum safety for student AWS accounts, this application does <strong>not</strong> provision any always-on servers (no EC2 instances, no NAT Gateways, no RDS Aurora multi-AZ clusters).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs">
            <span className="font-bold text-slate-900">Baseline Idle Cost</span>
            <p className="text-xl font-extrabold text-emerald-600 mt-1">$0.00 / month</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Zero requests = Zero charges</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs">
            <span className="font-bold text-slate-900">Active Campus Run Cost</span>
            <p className="text-xl font-extrabold text-emerald-600 mt-1">&lt; $0.50 / month</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Covers thousands of reports</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs">
            <span className="font-bold text-slate-900">AWS Credit Lifespan</span>
            <p className="text-xl font-extrabold text-emerald-600 mt-1">200+ Months</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Safely preserved</p>
          </div>
        </div>
      </section>
    </div>
  );
}
