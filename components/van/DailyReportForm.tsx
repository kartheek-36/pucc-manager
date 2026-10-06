'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { dailyReportSchema } from '@/lib/validations/report';
import {
  formatINR,
  calculateNetCollection,
  calculateTotalTests,
  getTodayISTDateString,
  formatISTTime,
} from '@/lib/calculations/financial';
import {
  CheckCircle2,
  Minus,
  Plus,
  ArrowLeft,
  Truck,
  RotateCcw,
  Sparkles,
  Info,
  Calendar,
  Sliders,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '../ui/Toast';
import { DailyReport, Van } from '@/types';
import { broadcastClientSync } from '@/lib/sync/client';

interface DailyReportFormProps {
  van: Van;
  availableVans?: Van[];
  existingReport?: DailyReport | null;
  onVanSelect?: (vanId: string) => void;
  onSubmitted?: (report?: DailyReport) => void;
}

interface FormValues {
  report_date: string;
  van_id: string;
  petrol_tests: number;
  diesel_tests: number;
  other_tests: number;
  total_tests: number;
  total_collection: number;
  expenses: number;
  notes?: string | null;
}

export function DailyReportForm({
  van,
  availableVans = [],
  existingReport,
  onVanSelect,
  onSubmitted,
}: DailyReportFormProps) {
  // Only shows receipt if user explicitly submits during this active session
  const [justSubmittedReport, setJustSubmittedReport] = useState<DailyReport | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const todayStr = getTodayISTDateString();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(dailyReportSchema) as any,
    defaultValues: {
      report_date: todayStr,
      van_id: van.id,
      petrol_tests: existingReport?.petrol_tests ?? 0,
      diesel_tests: existingReport?.diesel_tests ?? 0,
      other_tests: existingReport?.other_tests ?? 0,
      total_tests: existingReport?.total_tests ?? 0,
      total_collection: existingReport?.total_collection ?? 0,
      expenses: existingReport?.expenses ?? 0,
      notes: existingReport?.notes ?? '',
    },
  });

  const lastSyncedReportIdRef = React.useRef<string | null>(existingReport?.id || null);

  // Re-sync form default values only if van or existingReport id actually changes
  useEffect(() => {
    setValue('van_id', van.id);
    if (existingReport && existingReport.id !== lastSyncedReportIdRef.current) {
      lastSyncedReportIdRef.current = existingReport.id;
      setValue('petrol_tests', existingReport.petrol_tests);
      setValue('diesel_tests', existingReport.diesel_tests);
      setValue('other_tests', existingReport.other_tests);
      setValue('total_tests', existingReport.total_tests);
      setValue('total_collection', existingReport.total_collection);
      setValue('expenses', existingReport.expenses);
      setValue('notes', existingReport.notes || '');
    }
  }, [van.id, existingReport, setValue]);

  const petrol = watch('petrol_tests') || 0;
  const diesel = watch('diesel_tests') || 0;
  const other = watch('other_tests') || 0;
  const totalCol = watch('total_collection') || 0;
  const expenses = watch('expenses') || 0;

  // Auto-calculated fields
  const computedTotalTests = calculateTotalTests(Number(petrol), Number(diesel), Number(other));
  const computedNetCollection = calculateNetCollection(Number(totalCol), Number(expenses));

  useEffect(() => {
    setValue('total_tests', computedTotalTests, { shouldValidate: true });
  }, [computedTotalTests, setValue]);

  // Stepper helper functions for quick one-hand tapping
  const stepCount = (field: 'petrol_tests' | 'diesel_tests' | 'other_tests', delta: number) => {
    const current = Number(watch(field) || 0);
    const updated = Math.max(0, current + delta);
    setValue(field, updated, { shouldValidate: true });
  };

  // Quick preset actions
  const handleAutoEstimateCollection = () => {
    // Standard RTO testing avg fee is ₹150 per test
    const estimated = computedTotalTests * 150;
    setValue('total_collection', estimated, { shouldValidate: true });
    toast(`Estimated collection set to ₹${estimated.toLocaleString('en-IN')}`, 'info');
  };

  const handleResetCounts = () => {
    setValue('petrol_tests', 0, { shouldValidate: true });
    setValue('diesel_tests', 0, { shouldValidate: true });
    setValue('other_tests', 0, { shouldValidate: true });
    setValue('total_collection', 0, { shouldValidate: true });
    setValue('expenses', 0, { shouldValidate: true });
  };

  const onSubmit = async (values: FormValues, e?: React.BaseSyntheticEvent) => {
    e?.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const isUpdating = Boolean(existingReport?.id);
      const endpoint = isUpdating ? `/api/reports/${existingReport!.id}` : '/api/reports';
      const method = isUpdating ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const json = await res.json();

      if (!json.success) {
        toast(json.error?.message || 'Failed to submit report', 'error');
        return;
      }

      setJustSubmittedReport(json.data);
      toast(isUpdating ? 'Report updated successfully!' : '✓ Report submitted successfully!', 'success');
      broadcastClientSync({
        type: isUpdating ? 'REPORT_UPDATED' : 'REPORT_SUBMITTED',
        vanId: van.id,
        reportId: json.data?.id,
        reportDate: values.report_date,
      });
      if (onSubmitted) onSubmitted(json.data);
    } catch {
      toast('Network error while submitting report', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS RECEIPT VIEW (Shown ONLY immediately after the operator clicks submit)
  if (justSubmittedReport) {
    return (
      <div className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E7E9ED] space-y-5 shadow-xs">
        <div className="flex flex-col items-center text-center space-y-1.5 pt-2">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#16A34A] flex items-center justify-center border border-emerald-200">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#111827]">✓ Report Submitted</h2>
          <p className="text-xs text-[#6B7280]">
            {van.van_number} ({van.registration_number}) • {justSubmittedReport.report_date}
          </p>
        </div>

        {/* Receipt Metrics */}
        <div className="bg-[#F7F8FA] rounded-xl p-4 border border-[#E7E9ED] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E9ED]">
            <span className="text-xs text-[#6B7280]">Today's Collection</span>
            <span className="text-xl font-bold text-[#111827]">
              {formatINR(justSubmittedReport.total_collection)}
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-[#E7E9ED]">
            <span className="text-xs text-[#6B7280]">Total Tests</span>
            <span className="text-lg font-bold text-[#111827]">
              {justSubmittedReport.total_tests} Tests
            </span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-[#E7E9ED]">
            <span className="text-xs text-[#6B7280]">Submitted Time</span>
            <span className="text-xs font-semibold text-[#111827]">
              {formatISTTime(justSubmittedReport.submitted_at || new Date())}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6B7280]">Net Collection</span>
            <span className="text-sm font-bold text-[#16A34A]">
              {formatINR(justSubmittedReport.net_collection)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => setJustSubmittedReport(null)}
            className="w-full h-11 rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] text-[#111827] font-semibold text-xs hover:bg-[#F7F8FA] transition-colors flex items-center justify-center gap-2"
          >
            <Sliders className="w-4 h-4 text-[#1D4ED8]" />
            Adjust / Edit Submission Options
          </button>

          <Link
            href="/van/dashboard"
            className="w-full h-11 rounded-lg bg-[#1D4ED8] text-white font-semibold text-xs hover:bg-[#1E40AF] transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // DEFAULT VIEW: ALWAYS SHOWS ALL OPTIONS & INPUTS DIRECTLY
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-[#FFFFFF] rounded-xl p-5 border border-[#E7E9ED] space-y-6 shadow-xs pb-24"
    >
      {/* Informative Banner if report already exists for today */}
      {existingReport && (
        <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#1D4ED8] shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1D4ED8] uppercase tracking-wider">
                Today's Report Recorded ({existingReport.status})
              </span>
              <span className="text-[11px] font-mono font-semibold text-[#1D4ED8]">
                {formatISTTime(existingReport.submitted_at || new Date())}
              </span>
            </div>
            <p className="text-xs text-[#4B5563] mt-1 leading-relaxed">
              Current total: <strong className="text-[#111827]">{formatINR(existingReport.total_collection)}</strong> ({existingReport.total_tests} tests).
              The options below are editable. Make adjustments and click <strong>Update Report</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Van Options & Header */}
      <div className="border-b border-[#E7E9ED] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5" />
            <span>{existingReport ? 'Edit Daily Report Options' : 'Submit Daily Report Options'}</span>
          </div>

          {availableVans.length > 1 ? (
            <div className="mt-1 flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#6B7280]" />
              <select
                value={van.id}
                onChange={(e) => {
                  if (onVanSelect) onVanSelect(e.target.value);
                  setValue('van_id', e.target.value);
                }}
                className="text-base font-bold text-[#111827] bg-[#F7F8FA] border border-[#E7E9ED] rounded-lg px-2.5 py-1 outline-none focus:border-[#1D4ED8]"
              >
                {availableVans.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.van_number} ({v.registration_number})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-lg font-bold text-[#111827]">
                {van.van_number}
              </h2>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-[#F7F8FA] text-[#6B7280] border border-[#E7E9ED]">
                {van.registration_number}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-[#F7F8FA] px-3 py-1.5 rounded-lg border border-[#E7E9ED]">
          <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
          <span className="text-xs font-bold text-[#111827] font-mono">{todayStr}</span>
        </div>
      </div>

      {/* Quick Helper Actions Bar */}
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#F7F8FA] border border-[#E7E9ED]">
        <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
          Quick Tools
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleAutoEstimateCollection}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#FFFFFF] border border-[#E7E9ED] text-[#1D4ED8] hover:bg-blue-50 flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-[#1D4ED8]" />
            Estimate Collection
          </button>
          <button
            type="button"
            onClick={handleResetCounts}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#FFFFFF] border border-[#E7E9ED] text-[#6B7280] hover:bg-slate-100 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      {/* STEP 1: TESTS WITH STEPPERS & QUICK PILLS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
            STEP 1: VEHICLE TESTS
          </span>
          <span className="text-xs font-bold text-[#1D4ED8] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
            TOTAL: {computedTotalTests} TESTS
          </span>
        </div>

        {/* Stepper Rows: Petrol, Diesel, Other */}
        <div className="space-y-3">
          {/* Petrol */}
          <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E7E9ED] space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-[#111827] block">Petrol</span>
                <span className="text-[11px] text-[#6B7280]">2-Wheelers & 4-Wheelers</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => stepCount('petrol_tests', -1)}
                  className="w-10 h-10 rounded-lg bg-[#FFFFFF] border border-[#E7E9ED] text-[#111827] flex items-center justify-center font-bold hover:bg-slate-100 active:scale-95 transition-all text-base"
                  aria-label="Decrement petrol"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="0"
                  {...register('petrol_tests', { valueAsNumber: true })}
                  className="w-14 h-10 text-center text-lg font-bold rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] text-[#111827] outline-none focus:border-[#1D4ED8]"
                />
                <button
                  type="button"
                  onClick={() => stepCount('petrol_tests', 1)}
                  className="w-10 h-10 rounded-lg bg-[#FFFFFF] border border-[#E7E9ED] text-[#111827] flex items-center justify-center font-bold hover:bg-slate-100 active:scale-95 transition-all text-base"
                  aria-label="Increment petrol"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Add Pills */}
            <div className="flex items-center gap-2 pt-1 border-t border-[#E7E9ED]/70">
              <span className="text-[10px] text-[#6B7280] font-medium">Quick add:</span>
              {[1, 5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => stepCount('petrol_tests', num)}
                  className="px-2 py-0.5 rounded-md bg-[#FFFFFF] border border-[#E7E9ED] text-[11px] font-semibold text-[#1D4ED8] hover:bg-blue-50 active:scale-95 transition-all"
                >
                  +{num}
                </button>
              ))}
            </div>
          </div>

          {/* Diesel */}
          <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E7E9ED] space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-[#111827] block">Diesel</span>
                <span className="text-[11px] text-[#6B7280]">Light & Heavy Commercial</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => stepCount('diesel_tests', -1)}
                  className="w-10 h-10 rounded-lg bg-[#FFFFFF] border border-[#E7E9ED] text-[#111827] flex items-center justify-center font-bold hover:bg-slate-100 active:scale-95 transition-all text-base"
                  aria-label="Decrement diesel"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="0"
                  {...register('diesel_tests', { valueAsNumber: true })}
                  className="w-14 h-10 text-center text-lg font-bold rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] text-[#111827] outline-none focus:border-[#1D4ED8]"
                />
                <button
                  type="button"
                  onClick={() => stepCount('diesel_tests', 1)}
                  className="w-10 h-10 rounded-lg bg-[#FFFFFF] border border-[#E7E9ED] text-[#111827] flex items-center justify-center font-bold hover:bg-slate-100 active:scale-95 transition-all text-base"
                  aria-label="Increment diesel"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Add Pills */}
            <div className="flex items-center gap-2 pt-1 border-t border-[#E7E9ED]/70">
              <span className="text-[10px] text-[#6B7280] font-medium">Quick add:</span>
              {[1, 5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => stepCount('diesel_tests', num)}
                  className="px-2 py-0.5 rounded-md bg-[#FFFFFF] border border-[#E7E9ED] text-[11px] font-semibold text-[#1D4ED8] hover:bg-blue-50 active:scale-95 transition-all"
                >
                  +{num}
                </button>
              ))}
            </div>
          </div>

          {/* Other */}
          <div className="p-3.5 rounded-xl bg-[#F7F8FA] border border-[#E7E9ED] space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-[#111827] block">Other</span>
                <span className="text-[11px] text-[#6B7280]">CNG, LPG, Hybrid & EV</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => stepCount('other_tests', -1)}
                  className="w-10 h-10 rounded-lg bg-[#FFFFFF] border border-[#E7E9ED] text-[#111827] flex items-center justify-center font-bold hover:bg-slate-100 active:scale-95 transition-all text-base"
                  aria-label="Decrement other"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="0"
                  {...register('other_tests', { valueAsNumber: true })}
                  className="w-14 h-10 text-center text-lg font-bold rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] text-[#111827] outline-none focus:border-[#1D4ED8]"
                />
                <button
                  type="button"
                  onClick={() => stepCount('other_tests', 1)}
                  className="w-10 h-10 rounded-lg bg-[#FFFFFF] border border-[#E7E9ED] text-[#111827] flex items-center justify-center font-bold hover:bg-slate-100 active:scale-95 transition-all text-base"
                  aria-label="Increment other"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Add Pills */}
            <div className="flex items-center gap-2 pt-1 border-t border-[#E7E9ED]/70">
              <span className="text-[10px] text-[#6B7280] font-medium">Quick add:</span>
              {[1, 5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => stepCount('other_tests', num)}
                  className="px-2 py-0.5 rounded-md bg-[#FFFFFF] border border-[#E7E9ED] text-[11px] font-semibold text-[#1D4ED8] hover:bg-blue-50 active:scale-95 transition-all"
                >
                  +{num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 1 Total Pill */}
        <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-between">
          <span className="text-xs font-semibold text-[#1D4ED8]">TOTAL TESTS COUNT</span>
          <span className="text-xl font-bold text-[#1D4ED8]">{computedTotalTests}</span>
        </div>
      </div>

      {/* STEP 2: COLLECTION & EXPENSES */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block">
          STEP 2: FINANCIAL OPTIONS
        </span>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#111827] block mb-1">
              Today's Gross Collection (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-[#6B7280] font-bold text-sm">₹</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                {...register('total_collection', { valueAsNumber: true })}
                className="w-full h-11 pl-8 pr-3 text-lg font-bold rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] text-[#111827] outline-none focus:border-[#1D4ED8]"
              />
            </div>
            {errors.total_collection && (
              <p className="text-xs text-[#DC2626] mt-1">{errors.total_collection.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-[#111827]">
                Expenses (₹)
              </label>
              <div className="flex items-center gap-1.5">
                {[0, 100, 200].map((expVal) => (
                  <button
                    key={expVal}
                    type="button"
                    onClick={() => setValue('expenses', expVal, { shouldValidate: true })}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F7F8FA] border border-[#E7E9ED] text-[#6B7280] hover:text-[#111827]"
                  >
                    ₹{expVal}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-3 text-[#6B7280] font-bold text-sm">₹</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                {...register('expenses', { valueAsNumber: true })}
                className="w-full h-11 pl-8 pr-3 text-lg font-bold rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] text-[#111827] outline-none focus:border-[#1D4ED8]"
              />
            </div>
            {errors.expenses && (
              <p className="text-xs text-[#DC2626] mt-1">{errors.expenses.message}</p>
            )}
          </div>

          {/* NET Collection Display */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#16A34A] uppercase tracking-wider block">NET COLLECTION</span>
              <span className="text-[11px] text-[#6B7280]">Collection minus expenses</span>
            </div>
            <span className="text-2xl font-black text-[#16A34A]">{formatINR(computedNetCollection)}</span>
          </div>
        </div>
      </div>

      {/* STEP 3: NOTES */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block">
          STEP 3: SHIFT NOTES / REMARKS (OPTIONAL)
        </label>
        <textarea
          rows={2}
          placeholder="e.g. Highway location shift at 2 PM, printer ribbon restocked, normal rush"
          {...register('notes')}
          className="w-full p-3 rounded-lg border border-[#E7E9ED] bg-[#FFFFFF] text-sm text-[#111827] outline-none focus:border-[#1D4ED8] resize-none"
        />
      </div>

      {/* BOTTOM STICKY BUTTON */}
      <div className="fixed bottom-14 left-0 right-0 p-3 bg-[#FFFFFF]/95 backdrop-blur-xs border-t border-[#E7E9ED] z-30 max-w-md mx-auto">
        <button
          type="submit"
          disabled={submitting}
          className="w-full h-12 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-[#FFFFFF] text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          {submitting
            ? 'Saving Report...'
            : existingReport
            ? 'UPDATE DAILY REPORT'
            : 'SUBMIT DAILY REPORT'}
        </button>
      </div>
    </form>
  );
}
