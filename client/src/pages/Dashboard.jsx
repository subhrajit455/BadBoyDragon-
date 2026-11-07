import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  Clock,
  Warehouse,
  AlertTriangle,
  Truck,
  CreditCard,
  Plus,
  Users,
  Building2,
  Package,
  ArrowRight,
  Eye,
  AlertCircle,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import logoUrl from '../assets/logo.png';
import {
  TableWrapper,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from '../components/ui/Table';

export default function Dashboard() {
  const navigate = useNavigate();

  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get('/dashboard');
      return res.data?.data || {};
    },
    refetchInterval: 30000, // refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-danger mb-3">
          <AlertCircle className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-danger">
          {error?.response?.data?.message || error?.message || 'Failed to load dashboard metrics'}
        </p>
        <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const stats = dashboardData || {};
  const recentSales = stats.recentSales || [];

  return (
    <div className="space-y-6">
      {/* Brand Header Banner with Logo & Sibham Enterprises */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-border bg-gradient-to-r from-surface via-slate-50 to-orange-50/20 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white p-2 shadow-sm border border-slate-200/80 flex-shrink-0">
            <img
              src={logoUrl}
              alt="Sibham Enterprises Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold tracking-tight text-text">
                Sibham Enterprises
              </h1>
              <Badge variant="warning" size="sm" className="font-semibold uppercase tracking-wider text-[10px]">
                Business Control Center
              </Badge>
            </div>
            <p className="text-xs text-muted mt-1">
              Real-time sales performance, customer ledgers, inventory valuation &amp; billing overview.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Button
            variant="secondary"
            onClick={() => navigate('/purchases/new')}
            className="gap-2 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>New Purchase</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/billing/new')}
            className="gap-2 text-xs font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Invoice</span>
          </Button>
        </div>
      </div>

      {/* Primary Financial & Sales Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Orders */}
        <Card className="hover:shadow-md transition-shadow">
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Total Orders
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold tracking-tight text-text tabular-nums">
                {stats.totalOrders || 0}
              </span>
            </div>
            <div className="mt-1">
              <span className="text-xs text-muted">Customer sales invoices created</span>
            </div>
          </CardBody>
        </Card>

        {/* Total Revenue */}
        <Card className="hover:shadow-md transition-shadow">
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Total Revenue
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-sidebar-accent">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold tracking-tight text-text tabular-nums">
                {formatCurrency(stats.totalRevenue || 0)}
              </span>
            </div>
            <div className="mt-1">
              <span className="text-xs text-muted">Gross sales invoiced to date</span>
            </div>
          </CardBody>
        </Card>

        {/* Total Collected */}
        <Card className="hover:shadow-md transition-shadow">
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Total Collected
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold tracking-tight text-emerald-600 tabular-nums">
                {formatCurrency(stats.totalCollected || 0)}
              </span>
            </div>
            <div className="mt-1">
              <span className="text-xs text-muted">Payment received from customers</span>
            </div>
          </CardBody>
        </Card>

        {/* Balance Due (Receivables) */}
        <Card className="hover:shadow-md transition-shadow">
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Total Receivables
              </span>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  (stats.totalDue || 0) > 0
                    ? 'bg-red-50 text-red-600'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <span
                className={`text-2xl font-bold tracking-tight tabular-nums ${
                  (stats.totalDue || 0) > 0 ? 'text-red-600' : 'text-text'
                }`}
              >
                {formatCurrency(stats.totalDue || 0)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted">
              <span>Outstanding customer dues</span>
              {(stats.totalCustomerAdvance || 0) > 0 && (
                <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {formatCurrency(stats.totalCustomerAdvance)} advance held
                </span>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Secondary Operational Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Inventory Valuation */}
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">
                <Warehouse className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted">Stock Valuation</p>
                <p className="text-lg font-bold text-text tabular-nums">
                  {formatCurrency(stats.inventoryValuation || 0)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Low Stock Items */}
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${
                  (stats.lowStockCount || 0) > 0
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted">Low Stock Alerts</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-text tabular-nums">
                    {stats.lowStockCount || 0} items
                  </p>
                  {(stats.lowStockCount || 0) > 0 && (
                    <Badge variant="warning" size="sm">
                      Reorder
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Total Purchases (Procurement) */}
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 flex-shrink-0">
                <Truck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted">Procurement Spend</p>
                <p className="text-lg font-bold text-text tabular-nums">
                  {formatCurrency(stats.totalPurchaseSpend || 0)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Supplier Payables */}
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 flex-shrink-0">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted">Supplier Payables</p>
                <p
                  className={`text-lg font-bold tabular-nums ${
                    (stats.totalPurchaseDue || 0) > 0 ? 'text-orange-600' : 'text-text'
                  }`}
                >
                  {formatCurrency(stats.totalPurchaseDue || 0)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Directory Quick Counts Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          onClick={() => navigate('/inventory')}
          className="flex items-center justify-between rounded border border-border bg-surface p-4 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-700">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted">Active Products</p>
              <p className="text-base font-semibold text-text tabular-nums">
                {stats.totalProducts || 0}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted" />
        </div>

        <div
          onClick={() => navigate('/ledgers')}
          className="flex items-center justify-between rounded border border-border bg-surface p-4 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-700">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted">Active Customers</p>
              <p className="text-base font-semibold text-text tabular-nums">
                {stats.totalCustomers || 0}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted" />
        </div>

        <div
          onClick={() => navigate('/purchases')}
          className="flex items-center justify-between rounded border border-border bg-surface p-4 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-700">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted">Active Suppliers</p>
              <p className="text-base font-semibold text-text tabular-nums">
                {stats.totalSuppliers || 0}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted" />
        </div>
      </div>

      {/* Recent Sales Invoices Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <h2 className="text-base font-semibold text-text">Recent Sales Invoices</h2>
            <p className="text-xs text-muted mt-0.5">
              Latest transactions, payment progress, and balance dues.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/billing')}
            className="text-primary hover:text-primary-hover gap-1 font-medium"
          >
            <span>View All Invoices</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardBody className="p-0">
          {recentSales.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={ShoppingBag}
                title="No sales yet"
                description="Create your first customer sales invoice to start tracking revenue and orders."
                action={
                  <Button
                    variant="primary"
                    onClick={() => navigate('/billing/new')}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Invoice</span>
                  </Button>
                }
              />
            </div>
          ) : (
            <TableWrapper>
              <TableHead>
                <TableRow>
                  <TableHeader>Invoice No</TableHeader>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Customer</TableHeader>
                  <TableHeader className="text-right">Grand Total</TableHeader>
                  <TableHeader className="text-right">Paid</TableHeader>
                  <TableHeader className="text-right">Due</TableHeader>
                  <TableHeader className="text-center">Status</TableHeader>
                  <TableHeader className="text-right">Action</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentSales.map((sale) => {
                  const grandTotal = Number(sale.grandTotal) || 0;
                  const paid = Number(sale.paidAmount) || 0;
                  const due = Number(sale.dueAmount) || 0;
                  const isPaid = due <= 0;
                  const isPartial = paid > 0 && due > 0;

                  return (
                    <TableRow
                      key={sale._id}
                      onClick={() => navigate(`/billing/${sale._id}`)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <TableCell className="font-semibold text-primary">
                        {sale.invoiceNo}
                      </TableCell>
                      <TableCell className="text-muted text-xs">
                        {formatDate(sale.date || sale.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-text">
                          {sale.customerSnapshot?.name || 'Walk-in / Cash Customer'}
                        </div>
                        {sale.customerSnapshot?.phone && (
                          <div className="text-xs text-muted">
                            {sale.customerSnapshot.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-text">
                        {formatCurrency(grandTotal)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-emerald-600">
                        {formatCurrency(paid)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        <span className={due > 0 ? 'text-danger' : 'text-slate-400'}>
                          {formatCurrency(due)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {isPaid ? (
                          <Badge variant="success">PAID</Badge>
                        ) : isPartial ? (
                          <Badge variant="warning">PARTIAL</Badge>
                        ) : (
                          <Badge variant="danger">UNPAID</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/billing/${sale._id}`);
                          }}
                          className="h-9 w-9 sm:h-8 sm:w-8 p-0 min-h-0 inline-flex items-center justify-center text-slate-500 hover:text-primary"
                          aria-label={`View invoice ${sale.invoiceNo}`}
                        >
                          <Eye className="h-5 w-5 sm:h-4 sm:w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </TableWrapper>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

