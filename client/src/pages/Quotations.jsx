import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, FileSpreadsheet, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate } from '../utils/format';
import useDebounce from '../hooks/useDebounce';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card, { CardBody } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ResponsiveList from '../components/ui/ResponsiveList';
import Pagination from '../components/ui/Pagination';

export default function Quotations() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Reset to page 1 on search change
  useEffect(() => {
    if (debouncedSearch && page !== 1) {
      setSearchParams({ page: '1' });
    }
  }, [debouncedSearch]);

  const {
    data: quotationsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['quotations', debouncedSearch, page],
    queryFn: async () => {
      const res = await api.get('/quotations', {
        params: { search: debouncedSearch, page, limit: 20 },
      });
      return res.data;
    },
  });

  const quotations = quotationsResponse?.data || [];
  const pagination = quotationsResponse?.pagination || { total: 0, totalPages: 1 };

  const handlePageChange = (newPage) => {
    setSearchParams({ page: String(newPage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return (
          <Badge variant="info" size="sm">
            Open
          </Badge>
        );
      case 'converted':
        return (
          <Badge variant="success" size="sm">
            Converted
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="default" size="sm">
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="default" size="sm">
            {status}
          </Badge>
        );
    }
  };

  const columns = useMemo(
    () => [
      {
        header: 'Quotation No',
        accessor: (quo) => <span className="font-semibold text-primary">{quo.quotationNo}</span>,
      },
      {
        header: 'Date',
        accessor: (quo) => <span className="text-muted text-xs">{formatDate(quo.date)}</span>,
      },
      {
        header: 'Customer',
        accessor: (quo) => (
          <div>
            <div className="font-medium text-text">{quo.customerSnapshot?.name || 'Customer'}</div>
            {quo.customerSnapshot?.phone && (
              <div className="text-xs text-muted">{quo.customerSnapshot.phone}</div>
            )}
          </div>
        ),
      },
      {
        header: 'Total (₹)',
        align: 'right',
        isNumeric: true,
        accessor: (quo) => (
          <span className="font-medium tabular-nums text-text">{formatCurrency(quo.grandTotal)}</span>
        ),
      },
      {
        header: 'Status',
        align: 'center',
        accessor: (quo) => getStatusBadge(quo.status),
      },
    ],
    []
  );

  const renderMobileCard = (quo) => (
    <Card className="hover:border-primary/50 transition-colors shadow-xs">
      <CardBody className="p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="font-bold text-sm text-primary block">{quo.quotationNo}</span>
            <span className="text-xs text-muted">{formatDate(quo.date)}</span>
          </div>
          {getStatusBadge(quo.status)}
        </div>

        <div className="text-xs text-text">
          <span className="font-semibold">{quo.customerSnapshot?.name || 'Customer'}</span>
          {quo.customerSnapshot?.phone && (
            <span className="text-muted ml-1.5">({quo.customerSnapshot.phone})</span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 tabular-nums">
          <span className="text-muted">Estimated Total</span>
          <span className="font-extrabold text-sm text-text">{formatCurrency(quo.grandTotal)}</span>
        </div>
      </CardBody>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Quotations &amp; Estimates"
        description="Create estimates for customers and convert approved quotes into sales invoices."
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/quotations/new')}
            className="gap-2 w-full sm:w-auto min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            <span>New Quotation</span>
          </Button>
        }
      />

      {/* Filter / Search Card */}
      <Card className="shadow-xs">
        <CardBody className="p-3 sm:p-4">
          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Search by quotation no or customer name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              rightElement={<Search className="h-4 w-4 text-muted" />}
              className="w-full"
            />
          </div>
        </CardBody>
      </Card>

      {/* Quotations List */}
      {isError ? (
        <div className="p-8 text-center bg-red-50 rounded-lg border border-red-200">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-danger mb-3">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-danger">
            {error?.response?.data?.message || error?.message || 'Failed to load quotations'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-3 min-h-[44px]">
            Retry
          </Button>
        </div>
      ) : quotations.length === 0 && !isLoading ? (
        <EmptyState
          icon={FileSpreadsheet}
          title={searchInput ? 'No matching quotations' : 'No quotations created yet'}
          description={
            searchInput
              ? `No quotation found matching "${searchInput}". Try searching something else.`
              : 'Create your first quotation or estimate for a customer.'
          }
          action={
            searchInput ? (
              <Button variant="secondary" size="sm" onClick={() => setSearchInput('')} className="min-h-[44px]">
                Clear search
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => navigate('/quotations/new')}
                className="gap-2 min-h-[44px]"
              >
                <Plus className="h-4 w-4" />
                <span>Create Quotation</span>
              </Button>
            )
          }
        />
      ) : (
        <>
          <ResponsiveList
            data={quotations}
            columns={columns}
            loading={isLoading}
            renderMobileCard={renderMobileCard}
            onRowClick={(quo) => navigate(`/quotations/${quo._id}`)}
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

