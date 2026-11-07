import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, ShoppingCart, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ResponsiveList from '../components/ui/ResponsiveList';
import Pagination from '../components/ui/Pagination';
import Card, { CardBody } from '../components/ui/Card';

export default function Purchases() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Query purchases with pagination
  const {
    data: purchasesResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['purchases', page],
    queryFn: async () => {
      const res = await api.get('/purchases', { params: { page, limit: 20 } });
      return res.data || {};
    },
  });

  const purchases = purchasesResponse?.data || [];
  const pagination = purchasesResponse?.pagination || { total: 0, totalPages: 1 };

  const handlePageChange = (newPage) => {
    setSearchParams({ page: String(newPage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const columns = useMemo(
    () => [
      {
        header: 'Purchase No',
        accessor: (p) => <span className="font-semibold text-text">{p.purchaseNo}</span>,
      },
      {
        header: 'Date',
        accessor: (p) => <span className="text-muted">{formatDate(p.date)}</span>,
      },
      {
        header: 'Supplier',
        accessor: (p) => <span className="font-medium text-text">{p.supplier?.name || '—'}</span>,
      },
      {
        header: 'Total',
        align: 'right',
        isNumeric: true,
        accessor: (p) => <span className="font-medium text-text">{formatCurrency(p.grandTotal)}</span>,
      },
      {
        header: 'Paid',
        align: 'right',
        isNumeric: true,
        accessor: (p) => <span className="text-muted">{formatCurrency(p.paidAmount)}</span>,
      },
      {
        header: 'Due',
        align: 'right',
        isNumeric: true,
        accessor: (p) => (
          <span
            className={`font-semibold ${
              p.dueAmount > 0 && p.status !== 'cancelled' ? 'text-danger' : 'text-text'
            }`}
          >
            {formatCurrency(p.dueAmount)}
          </span>
        ),
      },
      {
        header: 'Status',
        accessor: (p) => (
          <Badge variant={p.status === 'cancelled' ? 'danger' : 'success'} size="sm">
            {p.status === 'cancelled' ? 'Cancelled' : 'Active'}
          </Badge>
        ),
      },
    ],
    []
  );

  const renderMobileCard = (purchase) => {
    const isCancelled = purchase.status === 'cancelled';
    return (
      <Card className="hover:border-primary/50 transition-colors shadow-xs">
        <CardBody className="p-3.5 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-bold text-sm text-text block">{purchase.purchaseNo}</span>
              <span className="text-xs text-muted">{formatDate(purchase.date)}</span>
            </div>
            <Badge variant={isCancelled ? 'danger' : 'success'} size="sm">
              {isCancelled ? 'Cancelled' : 'Active'}
            </Badge>
          </div>

          <div className="text-xs font-medium text-text">
            Supplier: <span className="font-semibold">{purchase.supplier?.name || '—'}</span>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 tabular-nums">
            <div>
              <span className="text-muted block text-[11px]">Total</span>
              <span className="font-semibold text-text">{formatCurrency(purchase.grandTotal)}</span>
            </div>
            <div className="text-center">
              <span className="text-muted block text-[11px]">Paid</span>
              <span className="text-muted font-medium">{formatCurrency(purchase.paidAmount)}</span>
            </div>
            <div className="text-right">
              <span className="text-muted block text-[11px]">Due</span>
              <span
                className={`font-bold ${
                  purchase.dueAmount > 0 && !isCancelled ? 'text-danger' : 'text-text'
                }`}
              >
                {formatCurrency(purchase.dueAmount)}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <PageHeader
        title="Purchases"
        description="View past vendor bills, inward stock entries, and supplier liabilities."
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/purchases/new')}
            className="gap-2 w-full sm:w-auto min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            <span>New Purchase</span>
          </Button>
        }
      />

      {/* Content States */}
      {isError ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 sm:p-12 text-center shadow-xs">
          <AlertTriangle className="h-8 w-8 text-danger mb-2" />
          <h3 className="text-base font-semibold text-danger">Failed to load purchases</h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            {error?.response?.data?.message || error?.message || 'An error occurred'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-4 min-h-[44px]">
            Try Again
          </Button>
        </div>
      ) : purchases.length === 0 && !isLoading ? (
        <EmptyState
          icon={ShoppingCart}
          title="No purchases recorded yet"
          description="Create your first purchase entry to add inventory and update supplier accounts."
          actionLabel="New Purchase"
          onAction={() => navigate('/purchases/new')}
        />
      ) : (
        <>
          <ResponsiveList
            data={purchases}
            columns={columns}
            loading={isLoading}
            renderMobileCard={renderMobileCard}
            onRowClick={(p) => navigate(`/purchases/${p._id}`)}
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
    </div>
  );
}
