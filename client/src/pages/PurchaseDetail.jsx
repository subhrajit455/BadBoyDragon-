import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Printer,
  XCircle,
  AlertCircle,
  Calendar,
  Building2,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate } from '../utils/format';
import Card, { CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';

export default function PurchaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Cancel Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  // Fetch purchase detail
  const {
    data: purchaseResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['purchase', id],
    queryFn: async () => {
      const res = await api.get(`/purchases/${id}`);
      return res.data?.data;
    },
  });

  const purchase = purchaseResponse;

  // Cancel Purchase Mutation
  const cancelMutation = useMutation({
    mutationFn: async (reason) => {
      const res = await api.post(`/purchases/${id}/cancel`, { reason });
      return res.data;
    },
    onSuccess: () => {
      // Invalidate related TanStack Query caches
      queryClient.invalidateQueries({ queryKey: ['purchase', id] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] });

      setIsCancelModalOpen(false);
      setCancelReason('');
      setCancelError('');
    },
    onError: (err) => {
      setCancelError(
        err.response?.data?.message || err.message || 'Failed to cancel purchase'
      );
    },
  });

  const handleConfirmCancel = (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError('Please provide a reason for cancellation');
      return;
    }
    setCancelError('');
    cancelMutation.mutate(cancelReason.trim());
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" className="text-primary mb-2" />
      </div>
    );
  }

  if (isError || !purchase) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-danger mb-2" />
        <h3 className="text-base font-semibold text-danger">Failed to load purchase</h3>
        <p className="text-sm text-slate-600 mt-1">
          {error?.response?.data?.message || error?.message || 'Purchase not found'}
        </p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/purchases')} className="mt-4">
          Back to Purchases
        </Button>
      </div>
    );
  }

  const isCancelled = purchase.status === 'cancelled';

  return (
    <div className="space-y-6 max-w-4xl mx-auto print:max-w-none print:m-0 print:p-0">
      {/* Top action bar (hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/purchases')}
          className="gap-2 self-start min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Purchases</span>
        </Button>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto [&>button]:flex-1 [&>button]:sm:flex-none">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 min-h-[44px]"
          >
            <Printer className="h-4 w-4" />
            <span>Print Invoice</span>
          </Button>

          {!isCancelled && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setCancelReason('');
                setCancelError('');
                setIsCancelModalOpen(true);
              }}
              className="gap-1.5 min-h-[44px]"
            >
              <XCircle className="h-4 w-4" />
              <span>Cancel Purchase</span>
            </Button>
          )}
        </div>
      </div>

      {/* Cancellation Notice Banner */}
      {isCancelled && (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-danger">
          <div className="flex items-center gap-2 font-semibold">
            <XCircle className="h-5 w-5 flex-shrink-0" />
            <span>This purchase was cancelled on {formatDate(purchase.cancelledAt)}</span>
          </div>
          <p className="mt-1 text-xs text-red-800 ml-7">
            Reason: <span className="font-medium">{purchase.cancelReason || 'No reason provided'}</span>
          </p>
        </div>
      )}

      {/* Printable Purchase Voucher Card: horizontal scroll container on mobile so document is never squashed */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 py-1">
        <Card className="min-w-[640px] sm:min-w-0 shadow-sm print:border-none print:shadow-none print:min-w-0">
          <CardBody className="p-6 sm:p-8 space-y-8">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6 gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Goods Inward / Purchase Receipt
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-text">
                {purchase.purchaseNo}
              </h1>
              {purchase.supplierInvoiceNo && (
                <p className="text-xs text-muted mt-0.5">
                  Supplier Ref: <span className="font-semibold text-text">{purchase.supplierInvoiceNo}</span>
                </p>
              )}
            </div>

            <div className="text-left sm:text-right">
              <Badge
                variant={isCancelled ? 'danger' : 'success'}
                size="md"
                className="mb-2"
              >
                {isCancelled ? 'CANCELLED' : 'ACTIVE / VERIFIED'}
              </Badge>
              <p className="text-xs text-muted">
                Date: <span className="font-medium text-text">{formatDate(purchase.date)}</span>
              </p>
            </div>
          </div>

          {/* Supplier Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 rounded border border-border bg-slate-50/50 p-4">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">
                Supplier Information
              </p>
              <h3 className="text-base font-bold text-text mt-1">
                {purchase.supplier?.name || 'Unknown Supplier'}
              </h3>
              {purchase.supplier?.phone && (
                <p className="text-xs text-muted mt-0.5">Phone: {purchase.supplier.phone}</p>
              )}
              {purchase.supplier?.address && (
                <p className="text-xs text-muted mt-0.5">Address: {purchase.supplier.address}</p>
              )}
            </div>

            <div className="sm:text-right">
              {purchase.supplier?.gstin && (
                <p className="text-xs text-muted">
                  GSTIN:{' '}
                  <span className="font-mono font-semibold text-text uppercase">
                    {purchase.supplier.gstin}
                  </span>
                </p>
              )}
              {purchase.paymentMode && (
                <p className="text-xs text-muted mt-1">
                  Payment Mode:{' '}
                  <span className="font-semibold text-text">{purchase.paymentMode}</span>
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-text border-collapse">
              <thead>
                <tr className="border-b border-border bg-slate-50 text-xs font-semibold text-muted uppercase">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">HSN</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3 text-right">Base Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate (ex. GST)</th>
                  <th className="py-2.5 px-3 text-right">GST %</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {purchase.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 text-xs text-muted">{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-text">{item.productName}</td>
                    <td className="py-3 px-3 font-mono text-xs text-muted">{item.hsn || '—'}</td>
                    <td className="py-3 px-3 text-right tabular-nums font-mono">{item.quantity}</td>
                    <td className="py-3 px-3 text-xs text-text">{item.unit}</td>
                    <td className="py-3 px-3 text-right tabular-nums font-mono text-muted text-xs">
                      {item.baseQty}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-mono">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-mono text-xs">
                      {item.gstRate}%
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-mono font-medium text-text">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t border-border gap-6">
            <div className="max-w-xs text-xs text-muted space-y-1">
              {purchase.notes && (
                <>
                  <span className="font-semibold text-text uppercase tracking-wider block">Notes:</span>
                  <p className="bg-slate-50 p-2.5 rounded border border-border">{purchase.notes}</p>
                </>
              )}
            </div>

            <div className="w-full sm:w-72 space-y-2 text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal (ex. GST):</span>
                <span className="tabular-nums font-medium text-text">
                  {formatCurrency(purchase.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-muted">
                <span>GST Total:</span>
                <span className="tabular-nums font-medium text-text">
                  {formatCurrency(purchase.gstTotal)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-text pt-2 border-t border-border">
                <span>Grand Total:</span>
                <span className="tabular-nums text-primary">
                  {formatCurrency(purchase.grandTotal)}
                </span>
              </div>

              <div className="flex justify-between text-muted pt-1">
                <span>Amount Paid:</span>
                <span className="tabular-nums font-medium text-text">
                  {formatCurrency(purchase.paidAmount)}
                </span>
              </div>

              <div className="flex justify-between font-bold pt-1 border-t border-dashed border-border">
                <span>Due Balance:</span>
                <span
                  className={`tabular-nums ${
                    purchase.dueAmount > 0 ? 'text-danger' : 'text-success'
                  }`}
                >
                  {formatCurrency(purchase.dueAmount)}
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Purchase Voucher"
        description="Reverses all incoming stock and appends reversing ledger entries."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmCancel} className="space-y-4">
          {cancelError && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-danger font-medium flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{cancelError}</span>
            </div>
          )}

          <p className="text-xs text-muted">
            Are you sure you want to cancel purchase{' '}
            <strong className="text-text">{purchase.purchaseNo}</strong>? This action
            cannot be undone.
          </p>

          <Input
            label="Reason for Cancellation"
            placeholder="e.g. Goods returned to supplier due to defects"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
            autoFocus
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCancelModalOpen(false)}
              disabled={cancelMutation.isPending}
            >
              Keep Purchase
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={cancelMutation.isPending}
            >
              Confirm Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

