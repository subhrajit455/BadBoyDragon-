import React, { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  Printer,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  FileText,
  Calendar,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import api from '../lib/api';
import { formatCurrency, formatDate, numberToWords } from '../utils/format';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import logoUrl from '../assets/logo.png';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const printRef = useRef(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Fetch sale invoice
  const {
    data: saleResponse,
    isLoading: saleLoading,
    isError: saleError,
  } = useQuery({
    queryKey: ['sale', id],
    queryFn: async () => {
      const res = await api.get(`/sales/${id}`);
      return res.data?.data;
    },
    enabled: !!id,
  });

  // Fetch settings for business header
  const { data: settingsResponse } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data?.data;
    },
  });

  const sale = saleResponse;
  const settings = settingsResponse || {
    businessName: 'Sibham Enterprises',
    gstin: '65JIGJDF98GLDFG',
    address: 'Deganga, West Bengal - 743423',
    phone: '9876543210',
    state: 'West Bengal',
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/sales/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-ledger'] });
      navigate('/billing');
    },
    onError: (err) => {
      setDeleteError(
        err.response?.data?.message || err.message || 'Failed to delete invoice'
      );
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const getBase64Image = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    if (!sale || !printRef.current) return;

    try {
      setDownloadingPDF(true);

      // Render ONLY the invoice canvas (never includes sidebar, logout button, or app header)
      const element = printRef.current;
      const [canvas, { jsPDF }] = await Promise.all([
        html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        }),
        import('jspdf'),
      ]);

      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 8;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const imgHeight = (canvas.height * printableWidth) / canvas.width;

      if (imgHeight <= printableHeight) {
        doc.addImage(imgData, 'PNG', margin, margin, printableWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = margin;

        doc.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight);
        heightLeft -= printableHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight + margin;
          doc.addPage();
          doc.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight);
          heightLeft -= printableHeight;
        }
      }

      doc.save(`${sale.invoiceNo || 'Tax-Invoice'}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      window.print();
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (saleLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (saleError || !sale) {
    return (
      <div className="p-8 text-center space-y-3">
        <AlertCircle className="mx-auto h-8 w-8 text-danger" />
        <p className="text-base font-semibold text-text">Invoice not found</p>
        <Button variant="secondary" onClick={() => navigate('/billing')}>
          Back to Billing
        </Button>
      </div>
    );
  }

  const isInterState = sale.igst > 0;
  const isPaid = (sale.dueAmount || 0) <= 0;
  const isPartial = (sale.paidAmount || 0) > 0 && (sale.dueAmount || 0) > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Action Bar (hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/billing')}
          className="gap-2 text-muted hover:text-text self-start min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Invoices</span>
        </Button>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto [&>button]:flex-1 [&>button]:sm:flex-none">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            className="gap-2 shadow-sm min-h-[44px]"
          >
            <Printer className="h-4 w-4" />
            <span>Print Invoice</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadPDF}
            loading={downloadingPDF}
            disabled={downloadingPDF}
            className="gap-2 shadow-sm min-h-[44px]"
          >
            <Download className="h-4 w-4" />
            <span>{downloadingPDF ? 'Generating...' : 'Download PDF'}</span>
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setDeleteError('');
              setIsDeleteModalOpen(true);
            }}
            className="gap-2 shadow-sm min-h-[44px]"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Invoice</span>
          </Button>
        </div>
      </div>

      {/* Invoice Document Canvas: horizontal scroll container on mobile so document is never squashed */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 py-1">
        <div
          ref={printRef}
          className="min-w-[680px] sm:min-w-0 rounded-xl border border-border bg-surface p-6 sm:p-10 shadow-md space-y-7 print:border-none print:shadow-none print:p-0 print:m-0 print:min-w-0"
        >
        {/* Top Header: Brand Logo + Business Info + Tax Invoice Badge */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 border-b border-border pb-6">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white p-2 border border-slate-200/80 shadow-sm flex-shrink-0">
              <img
                src={logoUrl}
                alt="Sibham Enterprises Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {settings.businessName || 'Sibham Enterprises'}
              </h1>
              <p className="text-xs font-medium text-slate-600 mt-0.5">
                Dealers in Cement, Steel, River Sand, Stone Aggregates &amp; Building Materials
              </p>
              {settings.address && (
                <div className="flex items-center gap-1.5 text-xs text-muted mt-1">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                  <span>{settings.address}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted mt-1.5">
                {settings.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <strong>{settings.phone}</strong>
                  </span>
                )}
                {settings.gstin && (
                  <span>
                    GSTIN:{' '}
                    <strong className="font-mono bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                      {settings.gstin}
                    </strong>
                  </span>
                )}
                {settings.state && <span>State: <strong>{settings.state}</strong></span>}
              </div>
            </div>
          </div>

          {/* Right Header: Tax Invoice Pill & Invoice Metadata */}
          <div className="text-left sm:text-right flex-shrink-0">
            <div className="flex items-center sm:justify-end gap-1.5 flex-wrap">
              {sale.isHistorical && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                  Past Record
                </span>
              )}
              <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>TAX INVOICE</span>
              </div>
            </div>
            <p className="text-xl font-extrabold text-primary mt-2 font-mono tracking-tight">
              {sale.invoiceNo}
            </p>
            <div className="flex sm:justify-end items-center gap-1.5 text-xs text-muted mt-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Date: <strong>{formatDate(sale.date)}</strong></span>
            </div>
            <div className="mt-2 sm:flex sm:justify-end">
              {isPaid ? (
                <Badge variant="success" className="gap-1 font-bold text-xs px-2.5 py-0.5 shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>PAID</span>
                </Badge>
              ) : isPartial ? (
                <Badge variant="warning" className="gap-1 font-bold text-xs px-2.5 py-0.5 shadow-sm">
                  <Clock className="h-3.5 w-3.5" />
                  <span>PARTIALLY PAID</span>
                </Badge>
              ) : (
                <Badge variant="danger" className="gap-1 font-bold text-xs px-2.5 py-0.5 shadow-sm">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>UNPAID</span>
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Bill To & Dispatch Details Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-50/80 p-4 border border-border">
          {/* Bill To Customer */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1">
              <span>Billed To (Customer Details)</span>
            </p>
            <p className="text-base font-bold text-text">
              {sale.customerSnapshot?.name || 'Walk-in / Cash Customer'}
            </p>
            {sale.customerSnapshot?.address && (
              <p className="text-xs text-muted mt-0.5">{sale.customerSnapshot.address}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted mt-2">
              {sale.customerSnapshot?.phone && (
                <span>
                  Phone: <strong>{sale.customerSnapshot.phone}</strong>
                </span>
              )}
              {sale.customerSnapshot?.gstin && (
                <span>
                  GSTIN:{' '}
                  <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {sale.customerSnapshot.gstin}
                  </strong>
                </span>
              )}
            </div>
          </div>

          {/* Supply & Meta */}
          <div className="sm:border-l sm:border-slate-200/80 sm:pl-4 space-y-1.5 text-xs text-muted">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
              Invoice &amp; Supply Details
            </p>
            <div className="flex justify-between">
              <span>Place of Supply:</span>
              <strong className="text-text">
                {sale.customerSnapshot?.state || settings.state || 'Local State'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>GST Category:</span>
              <strong className="text-text">
                {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Settlement Mode:</span>
              <strong className="text-text flex items-center gap-1">
                <CreditCard className="h-3 w-3 text-slate-400" />
                <span>{sale.paymentMode || 'Cash'}</span>
              </strong>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3">Item Description</th>
                <th className="py-3 px-3 text-center">HSN</th>
                <th className="py-3 px-3 text-right">Qty</th>
                <th className="py-3 px-3 text-center">Unit</th>
                <th className="py-3 px-3 text-right">Rate (₹)</th>
                <th className="py-3 px-3 text-right">Taxable Val (₹)</th>
                <th className="py-3 px-3 text-right">GST %</th>
                <th className="py-3 px-3 text-right">Total Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {(sale.items || []).map((it, idx) => (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50 hover:bg-slate-100/50'}
                >
                  <td className="py-3 px-3 text-xs text-muted text-center">{idx + 1}</td>
                  <td className="py-3 px-3 font-semibold text-text">{it.productName}</td>
                  <td className="py-3 px-3 text-center text-xs text-muted font-mono">
                    {it.hsn || '—'}
                  </td>
                  <td className="py-3 px-3 text-right font-bold tabular-nums text-text">
                    {it.quantity}
                  </td>
                  <td className="py-3 px-3 text-center text-xs text-muted font-medium">
                    {it.unit}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-muted">
                    {formatCurrency(it.rate)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums font-medium text-text">
                    {formatCurrency(it.taxableAmount)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-xs font-semibold text-slate-700">
                    {it.gstRate}%
                  </td>
                  <td className="py-3 px-3 text-right font-bold tabular-nums text-slate-900">
                    {formatCurrency(it.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 pt-2 border-t border-border">
          {/* Left Column: Words, Terms, Notes */}
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Invoice Total (in words):
              </p>
              <p className="text-sm font-bold text-text mt-1 italic">
                {numberToWords(sale.grandTotal)}
              </p>
            </div>

            {sale.notes && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-muted border border-border">
                <span className="font-bold text-text block mb-1">Invoice Notes:</span>
                {sale.notes}
              </div>
            )}

            {sale.payments && sale.payments.length > 0 && (
              <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Date-wise Payments &amp; Advances:
                </p>
                <div className="space-y-1.5 text-xs">
                  {sale.payments.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-200/60 last:border-0">
                      <div>
                        <span className="font-semibold text-text">{formatDate(p.date)}</span>
                        <span className="text-muted ml-1.5">({p.paymentMode})</span>
                        {p.note && <span className="text-muted block text-[11px]">{p.note}</span>}
                      </div>
                      <span className="font-bold text-success tabular-nums">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-[11px] text-muted space-y-1">
              <div className="flex items-center gap-1 font-semibold text-slate-700">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>Terms &amp; Conditions</span>
              </div>
              <p>• Goods once sold and dispatched will not be returned or exchanged.</p>
              <p>• All claims or weight discrepancies must be reported upon delivery.</p>
              <p>• Subject to local district jurisdiction only.</p>
            </div>
          </div>

          {/* Right Column: Tax Breakdown & Final Figures */}
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-muted text-xs">
              <span>Taxable Value:</span>
              <span className="font-semibold text-text tabular-nums text-sm">
                {formatCurrency(sale.subtotal)}
              </span>
            </div>

            {isInterState ? (
              <div className="flex justify-between text-muted text-xs">
                <span>Integrated GST (IGST):</span>
                <span className="font-semibold text-text tabular-nums text-sm">
                  {formatCurrency(sale.igst)}
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-muted text-xs">
                  <span>Central GST (CGST):</span>
                  <span className="font-semibold text-text tabular-nums text-sm">
                    {formatCurrency(sale.cgst)}
                  </span>
                </div>
                <div className="flex justify-between text-muted text-xs">
                  <span>State GST (SGST):</span>
                  <span className="font-semibold text-text tabular-nums text-sm">
                    {formatCurrency(sale.sgst)}
                  </span>
                </div>
              </>
            )}

            {/* Total GST */}
            <div className="flex justify-between text-xs text-slate-600 border-t border-slate-100 pt-1.5">
              <span>Total Tax Amount:</span>
              <span className="font-semibold tabular-nums text-slate-800">
                {formatCurrency(sale.igst || (sale.cgst + sale.sgst))}
              </span>
            </div>

            {/* Grand Total Highlight Box */}
            <div className="flex justify-between items-center rounded-lg bg-slate-900 text-white p-3.5 font-bold shadow-sm">
              <span className="text-sm uppercase tracking-wide">Grand Total:</span>
              <span className="text-xl tabular-nums text-sidebar-accent font-black">
                {formatCurrency(sale.grandTotal)}
              </span>
            </div>

            {/* Paid & Due Breakdown */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-emerald-700">
                <span className="font-semibold">
                  Amount Paid ({sale.paymentMode || 'Cash'}):
                </span>
                <span className="font-bold tabular-nums text-sm">
                  {formatCurrency(sale.paidAmount)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200/80 pt-1.5 font-bold">
                <span className="text-slate-700">Balance Due:</span>
                <span
                  className={`tabular-nums text-sm ${
                    sale.dueAmount > 0 ? 'text-danger' : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(sale.dueAmount)}
                  {sale.dueAmount <= 0 && (
                    <span className="ml-1 text-[11px] font-normal text-emerald-600">
                      (Settled)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Signature Block */}
        <div className="pt-8 flex justify-between items-end border-t border-border">
          <div className="text-[11px] text-muted italic">
            This is a computer generated invoice and does not require a physical seal if authorized digitally.
          </div>
          <div className="text-center w-64 border-t border-slate-400 pt-2">
            <p className="text-xs font-bold text-slate-900 uppercase">
              For {settings.businessName || 'Sibham Enterprises'}
            </p>
            <p className="text-[11px] text-muted mt-1">Authorized Signatory</p>
          </div>
        </div>
      </div>
      </div>
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !deleteMutation.isPending && setIsDeleteModalOpen(false)}
        title="Delete Invoice"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-text">
            Are you sure you want to delete invoice{' '}
            <span className="font-bold text-primary">{sale.invoiceNo}</span>?
          </p>
          <p className="text-xs text-muted">
            This will restore product stock, update the customer ledger, and permanently remove this invoice. This action cannot be undone.
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
