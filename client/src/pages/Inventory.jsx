import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Warehouse,
  Sliders,
  Check,
  AlertTriangle,
  AlertCircle,
  Save,
  Search,
  Scale,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatNumber } from '../utils/format';
import useDebounce from '../hooks/useDebounce';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Toast from '../components/ui/Toast';
import Card, { CardBody } from '../components/ui/Card';
import ResponsiveList from '../components/ui/ResponsiveList';
import Pagination from '../components/ui/Pagination';
import ManageUnitsModal from '../components/products/ManageUnitsModal';

export default function Inventory() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Adjust Modal State
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [managingUnitsProduct, setManagingUnitsProduct] = useState(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState('');

  // Editable selling prices state
  const [sellingPricesState, setSellingPricesState] = useState({});
  const [savingRowId, setSavingRowId] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [toastMessage, setToastMessage] = useState(null);

  // Reset to page 1 on search change
  useEffect(() => {
    if (debouncedSearch && page !== 1) {
      setSearchParams({ page: '1' });
    }
  }, [debouncedSearch]);

  // Fetch Inventory items
  const {
    data: inventoryResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['inventory', debouncedSearch, page],
    queryFn: async () => {
      const res = await api.get('/inventory', {
        params: { search: debouncedSearch.trim() || undefined, page, limit: 20 },
      });
      return res.data || {};
    },
  });

  const inventoryItems = inventoryResponse?.data || [];
  const pagination = inventoryResponse?.pagination || { total: 0, totalPages: 1 };

  const handlePageChange = (newPage) => {
    setSearchParams({ page: String(newPage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Stock Adjustment Mutation
  const adjustMutation = useMutation({
    mutationFn: async ({ productId, newQty, reason }) => {
      const res = await api.post(`/inventory/${productId}/adjust`, {
        newQty: Number(newQty),
        reason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setAdjustingProduct(null);
      setNewQuantity('');
      setAdjustReason('');
      setAdjustError('');
      setToastMessage({ message: 'Stock adjusted successfully', type: 'success' });
    },
    onError: (err) => {
      setAdjustError(
        err.response?.data?.message || err.message || 'Failed to adjust stock'
      );
    },
  });

  // Selling Price Save Mutation (via PUT /api/products/:id)
  const saveSellingPriceMutation = useMutation({
    mutationFn: async ({ productId, updatedUnits }) => {
      // Fetch full product first to keep other attributes intact
      const prodRes = await api.get(`/products/${productId}`);
      const fullProd = prodRes.data?.data;

      const payload = {
        name: fullProd.name,
        category: fullProd.category,
        hsn: fullProd.hsn || '',
        gstRate: fullProd.gstRate,
        minStock: fullProd.minStock,
        baseUnit: fullProd.baseUnit,
        units: updatedUnits,
      };

      const res = await api.put(`/products/${productId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSavingRowId(null);
      setToastMessage({ message: 'Selling prices updated successfully', type: 'success' });
    },
    onError: (err) => {
      setSavingRowId(null);
      setToastMessage({
        message: err.response?.data?.message || err.message || 'Failed to save selling prices',
        type: 'danger',
      });
    },
  });

  const handlePriceChange = (productId, unitName, priceValue) => {
    setSellingPricesState((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [unitName]: priceValue,
      },
    }));
  };

  const handleSavePrices = (product) => {
    setSavingRowId(product._id);
    const productEdits = sellingPricesState[product._id] || {};

    const updatedUnits = (product.units || []).map((u) => {
      const editedPrice = productEdits[u.name];
      return {
        name: u.name,
        factor: u.factor,
        sellingPrice: editedPrice !== undefined ? Number(editedPrice) : u.sellingPrice || 0,
      };
    });

    saveSellingPriceMutation.mutate({
      productId: product._id,
      updatedUnits,
    });
  };

  const handleOpenAdjust = (product) => {
    setAdjustingProduct(product);
    setNewQuantity(product.currentStock);
    setAdjustReason('');
    setAdjustError('');
  };

  const handleConfirmAdjust = (e) => {
    e.preventDefault();
    if (!adjustReason.trim()) {
      setAdjustError('A reason for the adjustment is required');
      return;
    }
    if (newQuantity === '' || Number(newQuantity) < 0) {
      setAdjustError('New quantity must be a non-negative number');
      return;
    }
    adjustMutation.mutate({
      productId: adjustingProduct._id,
      newQty: newQuantity,
      reason: adjustReason.trim(),
    });
  };

  const columns = useMemo(
    () => [
      {
        header: 'Product',
        accessor: (product) => (
          <div>
            <span className="font-semibold text-text">{product.name}</span>
            <span className="block text-xs font-normal text-muted">{product.category}</span>
          </div>
        ),
      },
      {
        header: 'Current Stock',
        align: 'right',
        isNumeric: true,
        accessor: (product) => (
          <span className="font-bold text-base text-text tabular-nums">
            {formatNumber(product.currentStock, 2)}{' '}
            <span className="text-xs font-normal text-muted">{product.baseUnit}</span>
          </span>
        ),
      },
      {
        header: 'Avg Cost (ex. GST)',
        align: 'right',
        isNumeric: true,
        accessor: (product) => (
          <span className="text-text font-medium tabular-nums">
            {formatCurrency(product.avgCost)}
            <span className="block text-[11px] text-muted font-normal">per {product.baseUnit}</span>
          </span>
        ),
      },
      {
        header: 'Last Purchase Rate',
        align: 'right',
        isNumeric: true,
        accessor: (product) =>
          product.lastPurchaseRate > 0 ? (
            <span className="text-text font-medium tabular-nums">
              {formatCurrency(product.lastPurchaseRate)}
              <span className="block text-[11px] text-muted font-normal">per {product.baseUnit}</span>
            </span>
          ) : (
            '—'
          ),
      },
      {
        header: 'Selling Prices',
        className: 'min-w-[280px]',
        accessor: (product) => {
          const units = product.units || [];
          return (
            <div className="flex flex-wrap items-center gap-2">
              {units.map((u) => {
                const currentVal =
                  sellingPricesState[product._id]?.[u.name] !== undefined
                    ? sellingPricesState[product._id][u.name]
                    : u.sellingPrice || '';

                return (
                  <div
                    key={u.name}
                    className="flex items-center gap-1.5 rounded border border-border bg-slate-50 px-2 py-1 text-xs"
                  >
                    <span className="font-medium text-text">{u.name}: ₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={currentVal}
                      onChange={(e) => handlePriceChange(product._id, u.name, e.target.value)}
                      placeholder="0.00"
                      className="w-20 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-left text-xs tabular-nums text-text focus:border-primary focus:outline-none"
                    />
                  </div>
                );
              })}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleSavePrices(product)}
                loading={savingRowId === product._id}
                className="h-7 text-xs px-2.5 gap-1"
                title="Save unit prices"
              >
                <Save className="h-3 w-3" />
                <span>Save</span>
              </Button>
            </div>
          );
        },
      },
      {
        header: 'Status',
        accessor: (product) => {
          const currentStock = Number(product.currentStock) || 0;
          const minStock = Number(product.minStock) || 0;
          const isOut = currentStock <= 0;
          const isLow = currentStock <= minStock && !isOut;
          if (isOut) return <Badge variant="danger" size="sm">Out of stock</Badge>;
          if (isLow) return <Badge variant="warning" size="sm">Low stock</Badge>;
          return <Badge variant="success" size="sm">In stock</Badge>;
        },
      },
      {
        header: 'Actions',
        align: 'right',
        accessor: (product) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setManagingUnitsProduct(product)}
              className="gap-1 text-xs px-2"
              title="Manage selling & conversion units"
            >
              <Scale className="h-3.5 w-3.5 text-primary" />
              <span>Units</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleOpenAdjust(product)}
              className="gap-1 text-xs px-2"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Adjust</span>
            </Button>
          </div>
        ),
      },
    ],
    [sellingPricesState, savingRowId]
  );

  const renderMobileCard = (product) => {
    const currentStock = Number(product.currentStock) || 0;
    const minStock = Number(product.minStock) || 0;
    const isOut = currentStock <= 0;
    const isLow = currentStock <= minStock && !isOut;
    const units = product.units || [];

    return (
      <Card className="hover:border-primary/50 transition-colors shadow-xs">
        <CardBody className="p-3.5 space-y-3">
          {/* Title & Status */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-bold text-sm text-text block">{product.name}</span>
              <span className="text-xs text-muted">{product.category}</span>
            </div>
            {isOut ? (
              <Badge variant="danger" size="sm">Out of stock</Badge>
            ) : isLow ? (
              <Badge variant="warning" size="sm">Low stock</Badge>
            ) : (
              <Badge variant="success" size="sm">In stock</Badge>
            )}
          </div>

          {/* Stock & Cost info */}
          <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 tabular-nums">
            <div>
              <span className="text-muted block text-[11px]">Current Stock</span>
              <span className="font-bold text-sm text-text">
                {formatNumber(product.currentStock, 2)}{' '}
                <span className="text-xs font-normal text-muted">{product.baseUnit}</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-muted block text-[11px]">Avg Cost (ex. GST)</span>
              <span className="font-semibold text-text">
                {formatCurrency(product.avgCost)}{' '}
                <span className="text-[11px] font-normal text-muted">/{product.baseUnit}</span>
              </span>
            </div>
          </div>

          {/* Unit Prices */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
              Selling Prices
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {units.map((u) => {
                const currentVal =
                  sellingPricesState[product._id]?.[u.name] !== undefined
                    ? sellingPricesState[product._id][u.name]
                    : u.sellingPrice || '';

                return (
                  <div
                    key={u.name}
                    className="flex items-center gap-1 rounded border border-border bg-slate-50 px-2 py-1 text-xs"
                  >
                    <span className="font-medium text-text">{u.name}: ₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={currentVal}
                      onChange={(e) => handlePriceChange(product._id, u.name, e.target.value)}
                      placeholder="0.00"
                      className="w-20 rounded border border-slate-300 bg-white px-1.5 py-1 text-left text-xs tabular-nums text-text focus:border-primary focus:outline-none min-h-[36px]"
                    />
                  </div>
                );
              })}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleSavePrices(product)}
                loading={savingRowId === product._id}
                className="text-xs px-3 min-h-[36px] gap-1"
              >
                <Save className="h-3 w-3" />
                <span>Save</span>
              </Button>
            </div>
          </div>

          {/* Card Action Buttons */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setManagingUnitsProduct(product)}
              className="flex-1 gap-1.5 text-xs min-h-[44px]"
            >
              <Scale className="h-4 w-4 text-primary" />
              <span>Units</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleOpenAdjust(product)}
              className="flex-1 gap-1.5 text-xs min-h-[44px]"
            >
              <Sliders className="h-4 w-4" />
              <span>Adjust</span>
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.message}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Inventory &amp; Stock Valuation"
        description="Real-time stock balances, weighted average acquisition costs (ex. GST), and unit selling prices."
      />

      {/* Search Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:max-w-sm">
          <Input
            placeholder="Search inventory by product or HSN..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            rightElement={<Search className="h-4 w-4 text-muted" />}
            className="w-full"
          />
        </div>
        <div className="text-xs text-muted">
          {pagination.total > 0 ? `${pagination.total} products` : `${inventoryItems.length} products`}
        </div>
      </div>

      {/* Content States */}
      {isError ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 sm:p-12 text-center shadow-xs">
          <AlertTriangle className="h-8 w-8 text-danger mb-2" />
          <h3 className="text-base font-semibold text-danger">Failed to load inventory</h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            {error?.response?.data?.message || error?.message || 'An error occurred'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-4 min-h-[44px]">
            Try Again
          </Button>
        </div>
      ) : inventoryItems.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface p-12 text-center shadow-xs">
          <Warehouse className="h-10 w-10 text-muted mb-3" />
          <h3 className="text-base font-semibold text-text">No inventory items found</h3>
          <p className="mt-1 text-sm text-muted">
            Add products or create purchase orders to build inventory stock.
          </p>
        </div>
      ) : (
        <>
          <ResponsiveList
            data={inventoryItems}
            columns={columns}
            loading={isLoading}
            renderMobileCard={renderMobileCard}
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

      {/* Adjust Quantity Modal */}
      {adjustingProduct && (
        <Modal
          isOpen={!!adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          title={`Adjust Stock — ${adjustingProduct.name}`}
          description="Override stock count due to audit corrections, physical count, or damages."
          maxWidth="max-w-md"
        >
          <form onSubmit={handleConfirmAdjust} className="space-y-4">
            {adjustError && (
              <div className="rounded border border-red-200 bg-red-50 p-2.5 text-xs text-danger font-medium flex items-start gap-1.5">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{adjustError}</span>
              </div>
            )}

            <div className="rounded border border-border bg-slate-50 p-3 text-xs text-muted">
              Current recorded inventory:{' '}
              <span className="font-bold text-text tabular-nums">
                {adjustingProduct.currentStock} {adjustingProduct.baseUnit}
              </span>
            </div>

            <Input
              label={`New Quantity (${adjustingProduct.baseUnit})`}
              type="number"
              step="any"
              min="0"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="Reason for Adjustment"
              placeholder="e.g. Broken bags during unloading / monthly audit"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAdjustingProduct(null)}
                disabled={adjustMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={adjustMutation.isPending}
              >
                Confirm Adjustment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Manage Units Modal */}
      {managingUnitsProduct && (
        <ManageUnitsModal
          isOpen={!!managingUnitsProduct}
          onClose={() => setManagingUnitsProduct(null)}
          product={managingUnitsProduct}
        />
      )}
    </div>
  );
}
