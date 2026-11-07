import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Receipt, AlertCircle, History, CreditCard } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate } from '../utils/format';
import useDebounce from '../hooks/useDebounce';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card, { CardBody } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Toast from '../components/ui/Toast';
import EmptyState from '../components/ui/EmptyState';
import ResponsiveList from '../components/ui/ResponsiveList';
import Pagination from '../components/ui/Pagination';
import Badge from '../components/ui/Badge';

export default function Billing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Receive Payment / Advance Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Customers Query for the modal
  const { data: customersResponse } = useQuery({
    queryKey: ['customers-billing-modal'],
    queryFn: async () => {
      const res = await api.get('/customers', { params: { limit: 100 } });
      return res.data;
    },
    enabled: isPaymentModalOpen,
  });

  const customers = customersResponse?.data || [];

  const recordPaymentMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(`/customers/${selectedCustomerId}/payments`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-ledger'] });
      setIsPaymentModalOpen(false);
      setSelectedCustomerId('');
      setPaymentAmount('');
      setPaymentNote('');
      setPaymentError('');
      setToastMessage({
        type: 'success',
        message: `Advance / Payment of ${formatCurrency(data?.entry?.amount || Number(paymentAmount))} recorded successfully.`,
      });
    },
    onError: (err) => {
      setPaymentError(
        err.response?.data?.message || err.message || 'Failed to record payment'
      );
    },
  });

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    setPaymentError('');

    if (!selectedCustomerId) {
      setPaymentError('Please select a customer');
      return;
    }
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentError('Please enter a valid amount greater than 0');
      return;
    }

    recordPaymentMutation.mutate({
      amount: amt,
      paymentMode,
      date: paymentDate,
      note: paymentNote.trim(),
    });
  };

  // Reset to page 1 on search change
  useEffect(() => {
    if (debouncedSearch && page !== 1) {
      setSearchParams({ page: '1' });
    }
  }, [debouncedSearch]);

  const {
    data: salesResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['sales', debouncedSearch, page],
    queryFn: async () => {
      const res = await api.get('/sales', {
        params: { search: debouncedSearch, page, limit: 20 },
      });
      return res.data;
    },
  });

  const invoices = salesResponse?.data || [];
  const pagination = salesResponse?.pagination || { total: 0, totalPages: 1 };

  const handlePageChange = (newPage) => {
    setSearchParams({ page: String(newPage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const columns = useMemo(
    () => [
      {
        header: 'Invoice No',
        accessor: (inv) => (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-primary">{inv.invoiceNo}</span>
            {inv.isHistorical && (
              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 whitespace-nowrap">
                Past Record
              </span>
            )}
          </div>
        ),
      },
      {
        header: 'Date',
        accessor: (inv) => <span className="text-muted">{formatDate(inv.date)}</span>,
      },
      {
        header: 'Customer',
        accessor: (inv) => (
          <div>
            <span className="font-medium text-text block">{inv.customerSnapshot?.name || 'Customer'}</span>
            {inv.customerSnapshot?.phone && (
              <span className="text-xs text-muted block">{inv.customerSnapshot.phone}</span>
            )}
          </div>
        ),
      },
      {
        header: 'Grand Total',
        align: 'right',
        isNumeric: true,
        accessor: (inv) => <span className="font-medium tabular-nums">{formatCurrency(inv.grandTotal)}</span>,
      },
      {
        header: 'Paid Amount',
        align: 'right',
        isNumeric: true,
        accessor: (inv) => (
          <span className="font-medium tabular-nums text-success">{formatCurrency(inv.paidAmount)}</span>
        ),
      },
      {
        header: 'Balance Due',
        align: 'right',
        isNumeric: true,
        accessor: (inv) => (
          <span className={`font-bold tabular-nums ${inv.dueAmount > 0 ? 'text-danger' : 'text-slate-500'}`}>
            {formatCurrency(inv.dueAmount)}
          </span>
        ),
      },
    ],
    []
  );

  const renderMobileCard = (inv) => {
    const isSettled = (inv.dueAmount || 0) <= 0;
    return (
      <Card className="hover:border-primary/50 transition-colors shadow-xs">
        <CardBody className="p-3.5 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-primary block">{inv.invoiceNo}</span>
                {inv.isHistorical && (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                    Past Record
                  </span>
                )}
              </div>
              <span className="text-xs text-muted">{formatDate(inv.date)}</span>
            </div>
            <Badge variant={isSettled ? 'success' : 'danger'} size="sm">
              {isSettled ? 'Settled' : 'Payment Due'}
            </Badge>
          </div>

          <div className="text-xs text-text">
            <span className="font-semibold">{inv.customerSnapshot?.name || 'Customer'}</span>
            {inv.customerSnapshot?.phone && (
              <span className="text-muted ml-1.5">({inv.customerSnapshot.phone})</span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 tabular-nums">
            <div>
              <span className="text-muted block text-[11px]">Total</span>
              <span className="font-semibold text-text">{formatCurrency(inv.grandTotal)}</span>
            </div>
            <div className="text-center">
              <span className="text-muted block text-[11px]">Paid</span>
              <span className="text-success font-medium">{formatCurrency(inv.paidAmount)}</span>
            </div>
            <div className="text-right">
              <span className="text-muted block text-[11px]">Due</span>
              <span className={`font-bold ${inv.dueAmount > 0 ? 'text-danger' : 'text-slate-500'}`}>
                {formatCurrency(inv.dueAmount)}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Billing &amp; Invoices"
        description="Create and manage customer GST sales invoices with stock deduction and ledgers."
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              onClick={() => setIsPaymentModalOpen(true)}
              className="gap-2 min-h-[44px]"
              title="Record customer advance deposit or date-wise payment"
            >
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <span>Receive Advance / Payment</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/billing/new?mode=past')}
              className="gap-2 min-h-[44px]"
              title="Record an old invoice for past customer without deducting inventory stock"
            >
              <History className="h-4 w-4 text-amber-600" />
              <span>Record Past Bill</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/billing/new')}
              className="gap-2 min-h-[44px]"
            >
              <Plus className="h-4 w-4" />
              <span>New Invoice</span>
            </Button>
          </div>
        }
      />

      {/* Filter / Search Card */}
      <Card className="shadow-xs">
        <CardBody className="p-3 sm:p-4">
          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Search by invoice number or customer name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              rightElement={<Search className="h-4 w-4 text-muted" />}
              className="w-full"
            />
          </div>
        </CardBody>
      </Card>

      {/* Invoices List */}
      {isError ? (
        <div className="p-8 text-center bg-red-50 rounded-lg border border-red-200">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-danger mb-3">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-danger">
            {error?.response?.data?.message || error?.message || 'Failed to load invoices'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-3 min-h-[44px]">
            Retry
          </Button>
        </div>
      ) : invoices.length === 0 && !isLoading ? (
        <EmptyState
          icon={Receipt}
          title={searchInput ? 'No matching invoices found' : 'No sales invoices created yet'}
          description={
            searchInput
              ? 'Try modifying your search query to find the invoice.'
              : 'Click "New Invoice" to sell goods to a customer, deduct stock, and generate a GST invoice.'
          }
          action={
            !searchInput && (
              <Button
                variant="primary"
                onClick={() => navigate('/billing/new')}
                className="gap-2 min-h-[44px]"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Invoice</span>
              </Button>
            )
          }
        />
      ) : (
        <>
          <ResponsiveList
            data={invoices}
            columns={columns}
            loading={isLoading}
            renderMobileCard={renderMobileCard}
            onRowClick={(inv) => navigate(`/billing/${inv._id}`)}
          />

          <Pagination
            currentPage={pagination.page || page}
            totalPages={pagination.totalPages || 1}
            total={pagination.total || 0}
            limit={pagination.limit || 20}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* Receive Payment / Advance Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Receive Customer Payment / Advance"
        description="Record a date-wise advance deposit or payment received from a customer."
        maxWidth="max-w-md"
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          {paymentError && (
            <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-2.5 text-xs text-danger">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{paymentError}</span>
            </div>
          )}

          <Select
            label="Customer"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            required
            placeholder="Select customer..."
          >
            {customers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} {c.phone ? `(${c.phone})` : ''}
              </option>
            ))}
          </Select>

          <Input
            label="Amount (₹)"
            type="number"
            step="any"
            min="0.01"
            placeholder="0.00"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            required
          />

          <Select
            label="Payment Mode"
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            required
          >
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
          </Select>

          <Input
            label="Receipt / Advance Date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />

          <Input
            label="Note / Reference (Optional)"
            placeholder="e.g. Advance deposit, Cash memo #44"
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPaymentModalOpen(false)}
              disabled={recordPaymentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={recordPaymentMutation.isPending}
            >
              Save Receipt
            </Button>
          </div>
        </form>
      </Modal>

      {/* Toast */}
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.message}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
