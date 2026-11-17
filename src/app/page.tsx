import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Clock,
  FileCheck2,
  FileSpreadsheet,
  Lock,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs">
              <Activity className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900">Interview Schedule</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              Enterprise 10k Ready
            </span>
          </div>

          <nav className="flex items-center gap-3">
            <Link
              href="/student/login"
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Student Portal
            </Link>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Admin Sign In
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/70 px-3 py-1 text-xs font-semibold text-indigo-700">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            University Placement Drive Orchestration Engine
          </div>

          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl leading-tight">
            Train-grade interview tracking for 10,000 university students.
          </h1>

          <p className="mt-5 text-base sm:text-lg leading-relaxed text-slate-600 max-w-2xl mx-auto">
            When an interview completes 15 minutes early or runs late, downstream candidates receive instantaneous live ETA updates on their phone without refreshing.
          </p>
        </div>

        {/* PRIMARY AUTHENTICATION GATEWAY — TWO CLEAR CHOICES */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {/* Choice 1: Student Login */}
          <div className="group rounded-3xl border-2 border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-slate-900 hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                <Smartphone className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-xl font-bold text-slate-900 tracking-tight">
                Candidate & Student Portal
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Log in with your University Registration Number and 6-digit access PIN. View your real-time interview ETA, queue position, signal venue arrival, and receive live panel calls.
              </p>
              <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live Train-Style Expected Time (ETA)
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Personal QR Venue Check-in Pass
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Peer Privacy (Strictly isolated credentials)
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <Link
                href="/student/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-slate-800"
              >
                Sign In as Student
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Choice 2: Admin Login */}
          <div className="group rounded-3xl border-2 border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-slate-900 hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-xl font-bold text-slate-900 tracking-tight">
                Placement Admin & Staff Portal
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Individual named accounts for Owners, Placement Admins, Panel Managers, and Attendance Operators. Manage multi-panel queues, call candidates, record attendance, and generate official Word documents.
              </p>
              <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Individual Account Tracking (Audit Trail)
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Venue Attendance Desk & Rapid QR Verification
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Official Word (.DOCX) Report Generation
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <Link
                href="/admin/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
              >
                Sign In as Administrator
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<Clock className="h-5 w-5 text-indigo-600" />}
            title="Train-Style ETA Rippling"
            description="Pure deterministic scheduling engine computes exact ripples across multi-panel sessions when interviews run early or over schedule."
          />
          <FeatureCard
            icon={<FileSpreadsheet className="h-5 w-5 text-emerald-600" />}
            title="Smart Spreadsheet Importer"
            description="Ingests legacy .xls, .xlsx, and .csv cohorts, decodes fractional Excel timestamps (0.375 → 9:00 AM), and prevents duplicate enrollments."
          />
          <FeatureCard
            icon={<FileCheck2 className="h-5 w-5 text-amber-600" />}
            title="Official Word (.DOCX) Reports"
            description="Exports certified, professionally formatted Microsoft Word reports with repeated headers, student subsections, and attendance metrics."
          />
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5 text-slate-700" />}
            title="Multi-Admin Audit Trail"
            description="Strict RBAC ensuring every attendance mutation, panel call, or queue reorder is permanently logged to an individual admin identity."
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200/80">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}
