import React, { useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Printer,
  Download,
  Edit3,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw,
  Receipt,
  FileCheck,
  Trash2,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, numberToWords } from '../utils/format';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Card, { CardBody } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import logoUrl from '../assets/logo.png';

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const printRef = useRef(null);

  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [actionError, setActionError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Fetch quotation
  const {
    data: quotationResponse,
    isLoading: quotationLoading,
    isError: quotationError,
    error,
  } = useQuery({
    queryKey: ['quotation', id],
    queryFn: async () => {
      const res = await api.get(`/quotations/${id}`);
      return res.data?.data;
    },
  });

  // Fetch business settings
  const { data: settingsResponse } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data?.data;
    },
  });

  const quotation = quotationResponse;
  const settings = settingsResponse || {
    businessName: 'Sibham Enterprises',
    gstin: '',
    address: '',
    phone: '',
    state: '',
  };

  // Status mutation (open <-> rejected)
  const statusMutation = useMutation({
    mutationFn: async (newStatus) => {
      const res = await api.patch(`/quotations/${id}/status`, {
        status: newStatus,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setActionError('');
    },
    onError: (err) => {
      setActionError(
        err.response?.data?.message || err.message || 'Failed to update status'
      );
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/quotations/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      navigate('/quotations');
    },
    onError: (err) => {
      setDeleteError(
        err.response?.data?.message || err.message || 'Failed to delete quotation'
      );
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!quotation) return;

    try {
      setDownloadingPDF(true);
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const primaryColor = [194, 65, 12]; // #C2410C
      const darkColor = [15, 23, 42]; // #0F172A
      const mutedColor = [100, 116, 139]; // #64748B

      // Brand Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...darkColor);
      doc.text(settings.businessName || 'Sibham Enterprises', 14, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...mutedColor);
      let y = 23;
      if (settings.address) {
        doc.text(settings.address, 14, y);
        y += 4;
      }
      const phoneGst = [
        settings.phone ? `Phone: ${settings.phone}` : '',
        settings.gstin ? `GSTIN: ${settings.gstin}` : '',
        settings.state ? `State: ${settings.state}` : '',
      ]
        .filter(Boolean)
        .join('  |  ');
      if (phoneGst) {
        doc.text(phoneGst, 14, y);
        y += 5;
      }

      // Title Banner (Right Header)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(...primaryColor);
      doc.text('ESTIMATE / QUOTATION', 196, 18, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...darkColor);
      doc.text(`No: ${quotation.quotationNo}`, 196, 24, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...mutedColor);
      doc.text(`Date: ${formatDate(quotation.date)}`, 196, 29, {
        align: 'right',
      });
      if (quotation.validUntil) {
        doc.text(
          `Valid Until: ${formatDate(quotation.validUntil)}`,
          196,
          34,
          { align: 'right' }
        );
      }
      doc.text(`Status: ${quotation.status.toUpperCase()}`, 196, 39, {
        align: 'right',
      });

      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 44, 196, 44);

      // Customer Info Box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...darkColor);
      doc.text('Estimate Prepared For (Customer):', 14, 50);

      const cust = quotation.customerSnapshot || {};
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(cust.name || 'Customer', 14, 55);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...mutedColor);
      let custY = 60;
      if (cust.address) {
        doc.text(cust.address, 14, custY);
        custY += 4;
      }
      const custMeta = [
        cust.phone ? `Phone: ${cust.phone}` : '',
        cust.state ? `State: ${cust.state}` : '',
        cust.gstin ? `GSTIN: ${cust.gstin}` : '',
      ]
        .filter(Boolean)
        .join('  |  ');
      if (custMeta) {
        doc.text(custMeta, 14, custY);
        custY += 4;
      }

      // Line items table
      const tableRows = quotation.items.map((it, idx) => [
        idx + 1,
        it.productName,
        it.hsn || '-',
        it.quantity,
        it.unit,
        `Rs. ${Number(it.rate).toFixed(2)}`,
        `Rs. ${Number(it.taxableAmount).toFixed(2)}`,
        `${it.gstRate}%`,
        `Rs. ${Number(it.amount).toFixed(2)}`,
      ]);

      autoTable(doc, {
        startY: Math.max(custY + 3, 68),
        head: [
          [
            '#',
            'Item Description',
            'HSN',
            'Qty',
            'Unit',
            'Rate',
            'Taxable',
            'GST',
            'Total Amount',
          ],
        ],
        body: tableRows,
        theme: 'striped',
        headStyles: {
          fillColor: darkColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left',
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 16 },
          3: { cellWidth: 14, halign: 'right' },
          4: { cellWidth: 16 },
          5: { cellWidth: 22, halign: 'right' },
          6: { cellWidth: 24, halign: 'right' },
          7: { cellWidth: 14, halign: 'right' },
          8: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          textColor: darkColor,
        },
        margin: { left: 14, right: 14 },
      });

      const finalY = doc.lastAutoTable.finalY + 6;

      // Left Column: Amount in words & Notes
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...darkColor);
      doc.text('Amount in Words:', 14, finalY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...mutedColor);
      const words = numberToWords(quotation.grandTotal);
      doc.text(words, 14, finalY + 4, { maxWidth: 110 });

      if (quotation.notes) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...darkColor);
        doc.text('Terms / Remarks:', 14, finalY + 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...mutedColor);
        doc.text(quotation.notes, 14, finalY + 16, { maxWidth: 110 });
      }

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(180, 83, 9); // warning amber
      doc.text(
        '* This is an estimate, not a tax invoice. Prices are subject to availability.',
        14,
        finalY + 28
      );

      // Right Column: Financial Totals
      const summaryX = 135;
      let sumY = finalY;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...mutedColor);
      doc.text('Subtotal (Taxable):', summaryX, sumY);
      doc.text(`Rs. ${Number(quotation.subtotal).toFixed(2)}`, 196, sumY, {
        align: 'right',
      });
      sumY += 5;

      if (quotation.igst > 0) {
        doc.text('Integrated GST (IGST):', summaryX, sumY);
        doc.text(`Rs. ${Number(quotation.igst).toFixed(2)}`, 196, sumY, {
          align: 'right',
        });
        sumY += 5;
      } else {
        doc.text('Central GST (CGST):', summaryX, sumY);
        doc.text(`Rs. ${Number(quotation.cgst).toFixed(2)}`, 196, sumY, {
          align: 'right',
        });
        sumY += 5;

        doc.text('State GST (SGST):', summaryX, sumY);
        doc.text(`Rs. ${Number(quotation.sgst).toFixed(2)}`, 196, sumY, {
          align: 'right',
        });
        sumY += 5;
      }

      // Grand Total Box
      doc.setDrawColor(...primaryColor);
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(summaryX - 2, sumY, 65, 8, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...primaryColor);
      doc.text('Estimated Total:', summaryX + 2, sumY + 5.5);
      doc.text(`Rs. ${Number(quotation.grandTotal).toFixed(2)}`, 194, sumY + 5.5, {
        align: 'right',
      });

      // Signature
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...darkColor);
      doc.text(`For ${settings.businessName || 'Sibham Enterprises'}`, 196, sumY + 25, {
        align: 'right',
      });
      doc.setFont('helvetica', 'normal');
      doc.text('Authorized Signatory', 196, sumY + 32, { align: 'right' });

      doc.save(`${quotation.quotationNo || 'Quotation'}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      window.print();
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleConvertToInvoice = () => {
    if (!quotation || quotation.status !== 'open') return;
    navigate('/billing/new', { state: { quotation } });
  };

  if (quotationLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (quotationError || !quotation) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto bg-surface rounded-xl border border-border shadow-sm">
        <AlertCircle className="h-10 w-10 text-danger mx-auto mb-3" />
        <h2 className="text-base font-semibold text-text">Quotation Not Found</h2>
        <p className="text-sm text-muted mt-1">
          {error?.response?.data?.message ||
            error?.message ||
            'The requested quotation could not be loaded.'}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/quotations')}
          className="mt-4"
        >
          Back to Quotations
        </Button>
      </div>
    );
  }

  const isOpen = quotation.status === 'open';
  const isConverted = quotation.status === 'converted';
  const isRejected = quotation.status === 'rejected';

  const linkedSaleId = quotation.saleId?._id || quotation.saleId;
  const linkedInvoiceNo = quotation.saleId?.invoiceNo;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Action Bar (hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/quotations')}
          className="gap-2 text-muted hover:text-text self-start min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Quotations</span>
        </Button>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto [&>button]:flex-1 [&>button]:sm:flex-none">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 shadow-sm min-h-[44px]"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadPDF}
            loading={downloadingPDF}
            disabled={downloadingPDF}
            className="gap-1.5 shadow-sm min-h-[44px]"
          >
            <Download className="h-4 w-4" />
            <span>{downloadingPDF ? 'Generating...' : 'Download PDF'}</span>
          </Button>

          {/* Open Status Actions */}
          {isOpen && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/quotations/${id}/edit`)}
                className="gap-1.5 text-text hover:bg-slate-100"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => statusMutation.mutate('rejected')}
                loading={statusMutation.isPending}
                disabled={statusMutation.isPending}
                className="gap-1.5 text-danger hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
                <span>Mark Rejected</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleConvertToInvoice}
                className="gap-2 shadow-sm"
              >
                <Receipt className="h-4 w-4" />
                <span>Convert to Invoice</span>
              </Button>
            </>
          )}

          {/* Rejected Status Action: Allow Reopening */}
          {isRejected && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => statusMutation.mutate('open')}
              loading={statusMutation.isPending}
              disabled={statusMutation.isPending}
              className="gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reopen Quotation</span>
            </Button>
          )}

          {/* Delete Action (only if not converted to an invoice) */}
          {!isConverted && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setDeleteError('');
                setIsDeleteModalOpen(true);
              }}
              className="gap-1.5 shadow-sm min-h-[44px]"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-danger text-sm flex items-center justify-between print:hidden">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError('')}
            className="text-danger hover:text-red-900 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Converted Callout Banner */}
      {isConverted && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between print:hidden shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <div>
              <span className="font-semibold text-sm">Quotation Converted</span>
              <p className="text-xs text-emerald-700">
                This estimate was accepted and converted into a sales tax invoice.
              </p>
            </div>
          </div>
          {linkedSaleId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/billing/${linkedSaleId}`)}
              className="gap-2 border-emerald-300 text-emerald-800 bg-white hover:bg-emerald-50"
            >
              <FileCheck className="h-4 w-4 text-emerald-600" />
              <span>
                View {linkedInvoiceNo ? `Invoice (${linkedInvoiceNo})` : 'Invoice'}
              </span>
            </Button>
          )}
        </div>
      )}

      {/* Main Quotation Document Container: horizontal scroll container on mobile so document is never squashed */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 py-1">
        <div
          ref={printRef}
          className="min-w-[680px] sm:min-w-0 rounded-xl border border-border bg-surface p-6 sm:p-10 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0 print:m-0 print:min-w-0"
        >
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-border pb-6">
          {/* Business Info */}
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-xl border border-border bg-white p-2 shadow-sm flex items-center justify-center flex-shrink-0">
              <img
                src={logoUrl}
                alt="Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-text">
                {settings.businessName || 'Sibham Enterprises'}
              </h2>
              <p className="text-xs text-primary font-medium">
                Building Materials &amp; Hardware
              </p>
              {settings.address && (
                <p className="text-xs text-muted mt-1 max-w-sm">
                  {settings.address}
                </p>
              )}
              <div className="flex flex-wrap gap-x-3 text-xs text-muted mt-1">
                {settings.phone && <span>Phone: {settings.phone}</span>}
                {settings.gstin && <span>• GSTIN: {settings.gstin}</span>}
                {settings.state && <span>• State: {settings.state}</span>}
              </div>
            </div>
          </div>

          {/* Quotation Metadata (Right Header) */}
          <div className="text-left sm:text-right space-y-1.5">
            <div className="inline-block px-3 py-1 rounded bg-slate-100 text-text font-bold text-xs uppercase tracking-wider border border-slate-200">
              QUOTATION / ESTIMATE
            </div>
            <div className="text-2xl font-extrabold text-primary tracking-tight tabular-nums">
              {quotation.quotationNo}
            </div>
            <div className="text-xs text-muted flex items-center sm:justify-end gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>Date: {formatDate(quotation.date)}</span>
            </div>
            {quotation.validUntil && (
              <div className="text-xs text-muted flex items-center sm:justify-end gap-1.5">
                <span>Valid Until: {formatDate(quotation.validUntil)}</span>
              </div>
            )}
            <div className="pt-1">
              {isOpen && (
                <Badge variant="info" size="sm">
                  Status: Open
                </Badge>
              )}
              {isConverted && (
                <Badge variant="success" size="sm">
                  Status: Converted
                </Badge>
              )}
              {isRejected && (
                <Badge variant="default" size="sm">
                  Status: Rejected
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Customer Snapshot Box */}
        <div className="rounded-lg border border-border bg-slate-50/70 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-1">
            Estimate Prepared For
          </span>
          <div className="font-bold text-sm text-text">
            {quotation.customerSnapshot?.name || 'Customer'}
          </div>
          {quotation.customerSnapshot?.address && (
            <div className="text-xs text-muted mt-0.5">
              {quotation.customerSnapshot.address}
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 text-xs text-muted mt-1.5">
            {quotation.customerSnapshot?.phone && (
              <span>Phone: {quotation.customerSnapshot.phone}</span>
            )}
            {quotation.customerSnapshot?.state && (
              <span>State: {quotation.customerSnapshot.state}</span>
            )}
            {quotation.customerSnapshot?.gstin && (
              <span>GSTIN: {quotation.customerSnapshot.gstin}</span>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-y border-border bg-slate-50 text-muted font-semibold">
                <th className="py-2.5 px-3 w-8 text-center">#</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3">HSN</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                <th className="py-2.5 px-3 text-right">GST %</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quotation.items?.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 text-center text-muted font-mono">
                    {index + 1}
                  </td>
                  <td className="py-3 px-3 font-semibold text-text">
                    {item.productName}
                  </td>
                  <td className="py-3 px-3 text-muted">{item.hsn || '-'}</td>
                  <td className="py-3 px-3 text-right tabular-nums font-medium text-text">
                    {item.quantity}
                  </td>
                  <td className="py-3 px-3 text-muted">{item.unit}</td>
                  <td className="py-3 px-3 text-right tabular-nums text-text">
                    ₹{Number(item.rate).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-text">
                    ₹{Number(item.taxableAmount).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-muted">
                    {item.gstRate}%
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums font-bold text-text">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Disclaimer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Words, Notes & Disclaimer */}
          <div className="space-y-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-1">
                Estimated Amount in Words
              </span>
              <p className="text-xs font-semibold text-text bg-slate-50 p-2.5 rounded-lg border border-border">
                {numberToWords(quotation.grandTotal)}
              </p>
            </div>

            {quotation.notes && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-1">
                  Terms / Remarks
                </span>
                <p className="text-xs text-text bg-slate-50 p-2.5 rounded-lg border border-border whitespace-pre-line">
                  {quotation.notes}
                </p>
              </div>
            )}

            <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>
                <strong>Notice:</strong> This is an estimate, not a tax invoice.
                Prices and stock availability are guaranteed only upon invoice conversion.
              </span>
            </div>
          </div>

          {/* Numerical Totals */}
          <div className="space-y-2.5 bg-slate-50/60 p-4 rounded-xl border border-border">
            <div className="flex justify-between text-xs text-text">
              <span className="text-muted">Subtotal (Taxable Value):</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(quotation.subtotal)}
              </span>
            </div>

            {quotation.igst > 0 ? (
              <div className="flex justify-between text-xs text-text">
                <span className="text-muted">Integrated GST (IGST):</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(quotation.igst)}
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-xs text-text">
                  <span className="text-muted">Central GST (CGST):</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(quotation.cgst)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-text">
                  <span className="text-muted">State GST (SGST):</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(quotation.sgst)}
                  </span>
                </div>
              </>
            )}

            <div className="pt-2 border-t border-border flex justify-between items-baseline">
              <span className="text-sm font-bold text-text">Estimated Total:</span>
              <span className="text-xl font-extrabold text-primary tabular-nums">
                {formatCurrency(quotation.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Document Footer Signatory */}
        <div className="pt-8 border-t border-border flex justify-between items-end text-xs">
          <div className="text-muted text-[11px]">
            Thank you for considering our services.
          </div>
          <div className="text-center">
            <div className="font-semibold text-text mb-12">
              For {settings.businessName || 'Sibham Enterprises'}
            </div>
            <div className="pt-1 border-t border-slate-300 text-muted text-[11px]">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
      </div>
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !deleteMutation.isPending && setIsDeleteModalOpen(false)}
        title="Delete Quotation"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-text">
            Are you sure you want to delete quotation{' '}
            <span className="font-bold text-primary">{quotation.quotationNo}</span>?
          </p>
          <p className="text-xs text-muted">
            This will permanently remove this quotation. This action cannot be undone.
          </p>

          {deleteError && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-danger border border-red-200">
              {deleteError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              loading={deleteMutation.isPending}
              disabled={deleteMutation.isPending}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

