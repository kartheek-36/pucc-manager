'use client';

import React from 'react';
import Link from 'next/link';
import { DailyReport } from '@/types';
import { formatINR } from '@/lib/calculations/financial';
import { FileSpreadsheet, FileText, Eye } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '../ui/Toast';

interface ReportsTableProps {
  reports: DailyReport[];
  loading?: boolean;
}

export function ReportsTable({ reports, loading }: ReportsTableProps) {
  const { toast } = useToast();

  const exportCSV = () => {
    if (!reports || reports.length === 0) {
      toast('No reports to export', 'info');
      return;
    }

    const headers = [
      'Date',
      'Van',
      'Registration Number',
      'Petrol Tests',
      'Diesel Tests',
      'Other Tests',
      'Total Tests',
      'Collection (INR)',
      'Expenses (INR)',
      'Net Collection (INR)',
      'Status',
    ];

    const rows = reports.map((r) => [
      r.report_date,
      r.van?.van_number || 'Van',
      r.van?.registration_number || '',
      r.petrol_tests,
      r.diesel_tests,
      r.other_tests,
      r.total_tests,
      r.total_collection,
      r.expenses,
      r.net_collection,
      r.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RTO_PUC_Reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('CSV file downloaded successfully!', 'success');
  };

  const exportPDF = () => {
    if (!reports || reports.length === 0) {
      toast('No reports to export', 'info');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(14);
      doc.text('RTO Pollution Van Manager - Daily Reports', 14, 15);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 21);

      const tableData = reports.map((r) => [
        r.report_date,
        r.van?.van_number || 'Van',
        r.van?.registration_number || '',
        r.petrol_tests,
        r.diesel_tests,
        r.other_tests,
        r.total_tests,
        `Rs. ${r.total_collection}`,
        `Rs. ${r.expenses}`,
        `Rs. ${r.net_collection}`,
        r.status,
      ]);

      autoTable(doc, {
        head: [[
          'Date',
          'Van',
          'Reg No',
          'Petrol',
          'Diesel',
          'Other',
          'Tests',
          'Collection',
          'Expenses',
          'Net',
          'Status',
        ]],
        body: tableData,
        startY: 25,
        theme: 'plain',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [29, 78, 216], textColor: [255, 255, 255], fontStyle: 'bold' },
      });

      doc.save(`RTO_PUC_Reports_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast('PDF report downloaded successfully!', 'success');
    } catch {
      toast('Failed to generate PDF', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-[#F3F4F6] animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="bg-[#FFFFFF] rounded-xl p-8 border border-[#E7E9ED] text-center">
        <p className="text-sm font-semibold text-[#111827]">
          No reports yet
        </p>
        <p className="text-xs text-[#6B7280] mt-1">
          Your daily collection reports will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#6B7280]">
          Showing {reports.length} report{reports.length === 1 ? '' : 's'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#FFFFFF] border border-[#E7E9ED] hover:bg-[#F7F8FA] text-[#111827] transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#16A34A]" />
            Export CSV
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#FFFFFF] border border-[#E7E9ED] hover:bg-[#F7F8FA] text-[#111827] transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-[#1D4ED8]" />
            Export PDF
          </button>
        </div>
      </div>

      {/* MOBILE VERSION: Cards (320px - 430px) */}
      <div className="md:hidden space-y-3">
        {reports.map((report) => (
          <Link
            key={report.id}
            href={`/admin/reports/${report.id}`}
            className="block bg-[#FFFFFF] rounded-xl p-4 border border-[#E7E9ED] shadow-xs space-y-2 hover:border-[#1D4ED8] transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#6B7280] font-mono">
                {report.report_date}
              </span>
              <span className="text-xs font-semibold text-[#16A34A]">
                ✓ {report.status}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-sm font-bold text-[#111827]">
                  {report.van?.van_number || 'Van'}
                </span>
                <span className="text-xs text-[#6B7280] block">
                  {report.total_tests} Tests
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-[#111827] block">
                  {formatINR(report.total_collection)}
                </span>
                <span className="text-xs font-semibold text-[#16A34A]">
                  Net {formatINR(report.net_collection)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* DESKTOP / TABLET VERSION: Clean Compact Table */}
      <div className="hidden md:block bg-[#FFFFFF] rounded-xl border border-[#E7E9ED] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F8FA] border-b border-[#E7E9ED] text-[#6B7280] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Van</th>
                <th className="py-3 px-4">Tests</th>
                <th className="py-3 px-4 text-right">Collection</th>
                <th className="py-3 px-4 text-right">Expenses</th>
                <th className="py-3 px-4 text-right">Net</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E9ED] font-medium text-[#111827]">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-[#F7F8FA] transition-colors">
                  <td className="py-3 px-4 font-semibold text-[#111827] font-mono">
                    {report.report_date}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#111827]">
                      {report.van?.van_number || 'Van'}
                    </div>
                    <div className="text-[11px] font-mono text-[#6B7280]">
                      {report.van?.registration_number}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-[#111827]">{report.total_tests}</span>
                    <span className="text-[#6B7280] text-[11px] ml-1">
                      ({report.petrol_tests}P / {report.diesel_tests}D / {report.other_tests}O)
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-[#111827]">
                    {formatINR(report.total_collection)}
                  </td>
                  <td className="py-3 px-4 text-right text-[#DC2626]">
                    {formatINR(report.expenses)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-[#16A34A]">
                    {formatINR(report.net_collection)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-[#16A34A] border border-emerald-200">
                      {report.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/admin/reports/${report.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-[#1D4ED8] hover:bg-[#EFF6FF]"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
