import React, { useState, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft, AlertCircle, ShoppingCart } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency } from '../utils/format';
import Card, { CardBody, CardHeader } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import SupplierModal from '../components/suppliers/SupplierModal';
import ProductModal from '../components/products/ProductModal';
import ManageUnitsModal from '../components/products/ManageUnitsModal';

// Memoized Desktop Table Row
const PurchaseItemRow = memo(function PurchaseItemRow({
  row,
  products,
  onProductChange,
  onUnitChange,
  onFieldChange,
  onRemove,
  canRemove,
}) {
  const selectedProd = products.find((p) => p._id === row.productId);
  const availableUnits = selectedProd?.units || [];
  const addedBase = (Number(row.quantity) || 0) * (Number(row.factor) || 1);

  return (
    <tr className="align-top hover:bg-slate-50/50">
      {/* Product */}
      <td className="px-4 py-3">
        <Select
          value={row.productId}
          onChange={(e) => onProductChange(row.id, e.target.value)}
          placeholder="Select Product"
          wrapperClassName="space-y-0"
          required
        >
          <option value="__add_new__" className="font-semibold text-primary">
            + Add new product
          </option>
          {products.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
      </td>

      {/* Unit */}
      <td className="px-4 py-3">
        <Select
          value={row.unit}
          onChange={(e) => onUnitChange(row.id, e.target.value)}
          placeholder="Unit"
          disabled={!row.productId}
          wrapperClassName="space-y-0"
          required
        >
          {availableUnits.map((u) => (
            <option key={u.name} value={u.name}>
              {u.name} {u.factor !== 1 ? `(${u.factor} ${row.baseUnit})` : ''}
            </option>
          ))}
          {row.productId && (
            <option value="__ADD_UNIT__" className="font-semibold text-primary">
              + Add unit...
            </option>
          )}
        </Select>
      </td>

      {/* Quantity */}
      <td className="px-4 py-3 text-left">
        <Input
          type="number"
          step="any"
          min="0.0001"
          value={row.quantity}
          onChange={(e) => onFieldChange(row.id, 'quantity', e.target.value)}
          className="text-left tabular-nums"
          wrapperClassName="space-y-0"
          required
        />
        {row.productId && row.unit && (
          <p className="mt-1 text-left text-xs text-muted tabular-nums">
            = <span className="font-semibold text-primary">{addedBase}</span>{' '}
            {row.baseUnit} added to stock
          </p>
        )}
      </td>

      {/* Rate */}
      <td className="px-4 py-3 text-left">
        <Input
          type="number"
          step="any"
          min="0"
          value={row.rate}
          onChange={(e) => onFieldChange(row.id, 'rate', e.target.value)}
          className="text-left tabular-nums"
          wrapperClassName="space-y-0"
          required
        />
        {selectedProd?.gstRate ? (
          <span className="block mt-1 text-left text-[11px] text-muted">
            GST: {selectedProd.gstRate}%
          </span>
        ) : null}
      </td>

      {/* Line Amount */}
      <td className="px-4 py-3 text-left tabular-nums font-medium text-text pt-5">
        {formatCurrency(row.lineAmount)}
      </td>

      {/* Remove Row */}
      <td className="px-3 py-3 text-center pt-4">
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          disabled={!canRemove}
          className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-muted hover:text-danger disabled:opacity-30 disabled:hover:text-muted transition-colors rounded-lg"
          title="Remove row"
          aria-label="Remove row"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
});

// Memoized Mobile Card
const PurchaseItemCard = memo(function PurchaseItemCard({
  row,
  products,
  onProductChange,
  onUnitChange,
  onFieldChange,
  onRemove,
  canRemove,
}) {
  const selectedProd = products.find((p) => p._id === row.productId);
  const availableUnits = selectedProd?.units || [];
  const addedBase = (Number(row.quantity) || 0) * (Number(row.factor) || 1);

  return (
    <div className="rounded-lg border border-border bg-surface p-3.5 space-y-3 shadow-sm">
      {/* Row 1: Product dropdown */}
      <div>
        <Select
          label="Product"
          value={row.productId}
          onChange={(e) => onProductChange(row.id, e.target.value)}
          placeholder="Select Product"
          wrapperClassName="space-y-1"
          required
        >
          <option value="__add_new__" className="font-semibold text-primary">
            + Add new product
          </option>
          {products.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Row 2: Unit dropdown + Quantity (2 columns) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Select
            label="Unit"
            value={row.unit}
            onChange={(e) => onUnitChange(row.id, e.target.value)}
            placeholder="Unit"
            disabled={!row.productId}
            wrapperClassName="space-y-1"
            required
          >
            {availableUnits.map((u) => (
              <option key={u.name} value={u.name}>
                {u.name} {u.factor !== 1 ? `(${u.factor} ${row.baseUnit})` : ''}
              </option>
            ))}
            {row.productId && (
              <option value="__ADD_UNIT__" className="font-semibold text-primary">
                + Add unit...
              </option>
            )}
          </Select>
        </div>
        <div>
          <Input
            label="Quantity"
            type="number"
            step="any"
            min="0.0001"
            value={row.quantity}
            onChange={(e) => onFieldChange(row.id, 'quantity', e.target.value)}
            className="text-left tabular-nums"
            wrapperClassName="space-y-1"
            required
          />
        </div>
      </div>

      {/* Conversion helper under Row 2 */}
      {row.productId && row.unit && (
        <p className="text-left text-xs text-muted tabular-nums">
          = <span className="font-semibold text-primary">{addedBase}</span>{' '}
          {row.baseUnit} added to stock
        </p>
      )}

      {/* Row 3: Rate + GST % (2 columns) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Input
            label="Rate / Unit (ex. GST)"
            type="number"
            step="any"
            min="0"
            value={row.rate}
            onChange={(e) => onFieldChange(row.id, 'rate', e.target.value)}
            className="text-left tabular-nums"
            wrapperClassName="space-y-1"
            required
          />
        </div>
        <div>
          <Input
            label="GST Rate"
            value={selectedProd?.gstRate ? `${selectedProd.gstRate}%` : '0%'}
            disabled
            className="text-left bg-slate-50 text-muted"
            wrapperClassName="space-y-1"
          />
        </div>
      </div>

      {/* Row 4: Line amount (bold) + Remove row button */}
      <div className="flex items-center justify-between pt-2 border-t border-dashed border-border">
        <div>
          <span className="text-xs text-muted block">Line Amount:</span>
          <span className="text-sm font-bold text-text tabular-nums">
            {formatCurrency(row.lineAmount)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          disabled={!canRemove}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted hover:text-danger disabled:opacity-30 disabled:hover:text-muted transition-colors rounded-lg"
          title="Remove row"
          aria-label="Remove row"
        >
          <Trash2 className="h-5 w-5 text-danger" />
        </button>
      </div>
    </div>
  );
});

export default function NewPurchase() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Supplier modal state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Product modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [targetRowIdForProduct, setTargetRowIdForProduct] = useState(null);
  const [productServerError, setProductServerError] = useState('');
  const [managingUnitsProduct, setManagingUnitsProduct] = useState(null);
  const [pendingUnitRowId, setPendingUnitRowId] = useState(null);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [serverError, setServerError] = useState('');

  // Items State
  const [items, setItems] = useState([
    {
      id: 1,
      productId: '',
      unit: '',
      quantity: 1,
      rate: 0,
      factor: 1,
      baseUnit: '',
    },
  ]);

  // Fetch active Suppliers
  const { data: suppliersResponse, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await api.get('/suppliers', { params: { status: 'active', limit: 100 } });
      return res.data?.data || [];
    },
  });

  // Fetch active Products
  const { data: productsResponse, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/products', { params: { status: 'active', limit: 200 } });
      return res.data?.data || [];
    },
  });

  const suppliers = suppliersResponse || [];
  const products = productsResponse || [];

  // Mutation to create a new product from row modal
  const createProductMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/products', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      const newProd = data?.data;
      if (newProd && targetRowIdForProduct) {
        setItems((prev) =>
          prev.map((item) => {
            if (item.id === targetRowIdForProduct) {
              const defaultUnit =
                newProd.units?.find(
                  (u) => u.name.toLowerCase() === newProd.baseUnit?.toLowerCase()
                ) || newProd.units?.[0];

              return {
                ...item,
                productId: newProd._id,
                unit: defaultUnit ? defaultUnit.name : newProd.baseUnit,
                factor: defaultUnit ? Number(defaultUnit.factor) : 1,
                baseUnit: newProd.baseUnit,
                rate: item.rate || 0,
              };
            }
            return item;
          })
        );
      }
      setIsProductModalOpen(false);
      setTargetRowIdForProduct(null);
      setProductServerError('');
    },
    onError: (err) => {
      setProductServerError(
        err.response?.data?.message || err.message || 'Failed to create product'
      );
    },
  });

  // Handle product selection on a row
  const handleProductChange = useCallback((rowId, selectedProductId) => {
    if (selectedProductId === '__add_new__') {
      setTargetRowIdForProduct(rowId);
      setProductServerError('');
      setIsProductModalOpen(true);
      return;
    }

    const selectedProd = products.find((p) => p._id === selectedProductId);

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === rowId) {
          if (!selectedProd) {
            return {
              ...item,
              productId: '',
              unit: '',
              factor: 1,
              baseUnit: '',
              rate: 0,
            };
          }

          // Default unit to baseUnit
          const defaultUnit =
            selectedProd.units?.find(
              (u) => u.name.toLowerCase() === selectedProd.baseUnit?.toLowerCase()
            ) || selectedProd.units?.[0];

          return {
            ...item,
            productId: selectedProd._id,
            unit: defaultUnit ? defaultUnit.name : selectedProd.baseUnit,
            factor: defaultUnit ? Number(defaultUnit.factor) : 1,
            baseUnit: selectedProd.baseUnit,
            rate: item.rate || 0,
          };
        }
        return item;
      })
    );
  }, [products]);

  // Handle unit selection on a row
  const handleUnitChange = useCallback((rowId, newUnitName) => {
    if (newUnitName === '__ADD_UNIT__') {
      const currentItem = items.find((it) => it.id === rowId);
      const prod = products.find((p) => p._id === currentItem?.productId);
      if (prod) {
        setManagingUnitsProduct(prod);
        setPendingUnitRowId(rowId);
      }
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === rowId) {
          const selectedProd = products.find((p) => p._id === item.productId);
          const foundUnit = selectedProd?.units?.find(
            (u) => u.name.toLowerCase() === newUnitName.toLowerCase()
          );

          return {
            ...item,
            unit: newUnitName,
            factor: foundUnit ? Number(foundUnit.factor) : 1,
          };
        }
        return item;
      })
    );
  }, [items, products]);

  const handleUnitsSaved = useCallback((updatedProduct, newUnitName) => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products-search'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });

    setItems((prev) =>
      prev.map((item) => {
        if (item.productId === updatedProduct._id) {
          const isTargetRow = item.id === pendingUnitRowId;
          const targetUnitName =
            isTargetRow && newUnitName ? newUnitName : item.unit;
          const matchedUnit =
            updatedProduct.units?.find(
              (u) => u.name.toLowerCase() === targetUnitName?.toLowerCase()
            ) || updatedProduct.units?.[0];

          return {
            ...item,
            unit: matchedUnit ? matchedUnit.name : item.unit,
            factor: matchedUnit ? Number(matchedUnit.factor) : item.factor,
          };
        }
        return item;
      })
    );
    setManagingUnitsProduct(null);
    setPendingUnitRowId(null);
  }, [pendingUnitRowId, queryClient]);

  const handleItemFieldChange = useCallback((rowId, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === rowId) {
          return {
            ...item,
            [field]: value,
          };
        }
        return item;
      })
    );
  }, []);

  const handleAddRow = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        productId: '',
        unit: '',
        quantity: 1,
        rate: 0,
        factor: 1,
        baseUnit: '',
      },
    ]);
  }, []);

  const handleRemoveRow = useCallback((rowId) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== rowId) : prev));
  }, []);

  // Calculations
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const factor = Number(item.factor) || 1;
      const lineAmount = qty * rate;
      const addedBaseQty = qty * factor;

      const prod = products.find((p) => p._id === item.productId);
      const gstRate = prod?.gstRate || 0;
      const gstAmount = (lineAmount * gstRate) / 100;

      return {
        ...item,
        lineAmount,
        addedBaseQty,
        gstRate,
        gstAmount,
      };
    });
  }, [items, products]);

  const subtotal = useMemo(
    () => calculatedItems.reduce((acc, curr) => acc + curr.lineAmount, 0),
    [calculatedItems]
  );
  const gstTotal = useMemo(
    () => calculatedItems.reduce((acc, curr) => acc + curr.gstAmount, 0),
    [calculatedItems]
  );
  const grandTotal = subtotal + gstTotal;
  const numericPaid = Math.max(0, Number(paidAmount) || 0);
  const balanceDue = Math.max(0, grandTotal - numericPaid);

  // Mutation to create purchase
  const createPurchaseMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/purchases', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] });

      const purchaseId = data.data?._id;
      if (purchaseId) {
        navigate(`/purchases/${purchaseId}`);
      } else {
        navigate('/purchases');
      }
    },
    onError: (err) => {
      setServerError(
        err.response?.data?.message || err.message || 'Failed to record purchase'
      );
    },
  });

  const handleSavePurchase = (e) => {
    e.preventDefault();
    setServerError('');

    if (!supplierId) {
      setServerError('Please select a supplier');
      return;
    }

    if (items.length === 0 || !items.some((i) => i.productId)) {
      setServerError('Please select at least one valid product');
      return;
    }

    for (const item of items) {
      if (!item.productId) {
        setServerError('All line rows must have a selected product');
        return;
      }
      if (!item.unit) {
        setServerError('All line rows must specify a valid unit');
        return;
      }
      if (Number(item.quantity) <= 0) {
        setServerError('Item quantities must be greater than zero');
        return;
      }
      if (Number(item.rate) < 0) {
        setServerError('Item rates cannot be negative');
        return;
      }
    }

    if (numericPaid > grandTotal) {
      setServerError('Paid amount cannot exceed the grand total');
      return;
    }

    const payload = {
      supplierId,
      date,
      supplierInvoiceNo: supplierInvoiceNo.trim() || undefined,
      notes: notes.trim() || undefined,
      paidAmount: numericPaid,
      paymentMode: numericPaid > 0 ? paymentMode : 'Cash',
      items: items.map((i) => ({
        productId: i.productId,
        unit: i.unit,
        quantity: Number(i.quantity),
        rate: Number(i.rate),
      })),
    };

    createPurchaseMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/purchases')}
            className="p-2 min-h-[44px] min-w-[44px]"
            aria-label="Back to purchases"
          >
            <ArrowLeft className="h-5 w-5 text-muted" />
          </Button>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-text">New Purchase</h1>
            <p className="text-xs sm:text-sm text-muted">Record inward materials and update inventory stock</p>
          </div>
        </div>
      </div>

      {serverError && (
        <div className="flex items-center gap-3 rounded border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSavePurchase} className="space-y-6 pb-28 md:pb-6">
        {/* Supplier & Document Metadata Card */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-text">Purchase Information</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Supplier Select */}
              <div>
                <div className="flex items-center justify-between pb-1.5">
                  <label className="block text-sm font-medium text-text">
                    Supplier <span className="text-danger">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSupplierModalOpen(true)}
                    className="text-xs font-semibold text-primary hover:text-primary-hover min-h-[32px] px-1 inline-flex items-center"
                  >
                    + Add Supplier
                  </button>
                </div>
                <Select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  placeholder="Select a supplier"
                  disabled={suppliersLoading}
                  required
                >
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} {s.phone ? `(${s.phone})` : ''}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Purchase Date */}
              <div>
                <Input
                  label="Purchase Date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              {/* Supplier Invoice No */}
              <div>
                <Input
                  label="Supplier Invoice / Bill No."
                  placeholder="e.g. INV-98745 (Optional)"
                  value={supplierInvoiceNo}
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Line Items Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-text">Purchase Line Items</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddRow}
              className="gap-1.5 min-h-[44px] w-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Add Row</span>
            </Button>
          </CardHeader>

          <CardBody className="p-0 sm:p-0">
            {/* Mobile Card List (< md) */}
            <div className="md:hidden p-3 space-y-3">
              {calculatedItems.map((row) => (
                <PurchaseItemCard
                  key={row.id}
                  row={row}
                  products={products}
                  onProductChange={handleProductChange}
                  onUnitChange={handleUnitChange}
                  onFieldChange={handleItemFieldChange}
                  onRemove={handleRemoveRow}
                  canRemove={items.length > 1}
                />
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddRow}
                className="w-full gap-1.5 min-h-[44px] mt-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Line Row</span>
              </Button>
            </div>

            {/* Desktop Table View (md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-text border-collapse">
                <thead className="border-b border-border bg-slate-50 text-xs font-semibold text-muted uppercase">
                  <tr>
                    <th className="px-4 py-3 min-w-[220px] text-left">Product</th>
                    <th className="px-4 py-3 min-w-[140px] text-left">Unit</th>
                    <th className="px-4 py-3 min-w-[120px] text-left">Quantity</th>
                    <th className="px-4 py-3 min-w-[140px] text-left">Rate / Unit (ex. GST)</th>
                    <th className="px-4 py-3 min-w-[140px] text-left">Amount</th>
                    <th className="px-3 py-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {calculatedItems.map((row) => (
                    <PurchaseItemRow
                      key={row.id}
                      row={row}
                      products={products}
                      onProductChange={handleProductChange}
                      onUnitChange={handleUnitChange}
                      onFieldChange={handleItemFieldChange}
                      onRemove={handleRemoveRow}
                      canRemove={items.length > 1}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Footer Card */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Notes */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-text">Notes</h3>
            </CardHeader>
            <CardBody>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional supplier delivery remarks, transport details, etc."
                className="w-full rounded border border-border bg-surface p-3 text-base sm:text-sm text-text placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[100px]"
              />
            </CardBody>
          </Card>

          {/* Payment & Totals */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-text">Payment &amp; Financial Summary</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="space-y-2 text-sm border-b border-border pb-3">
                <div className="flex justify-between text-muted">
                  <span>Subtotal (ex. GST):</span>
                  <span className="tabular-nums font-medium text-text">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>GST Total:</span>
                  <span className="tabular-nums font-medium text-text">
                    {formatCurrency(gstTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-text pt-1 border-t border-dashed border-border">
                  <span>Grand Total:</span>
                  <span className="tabular-nums text-primary">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Payment inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Input
                    label="Amount Paid Now"
                    type="number"
                    step="any"
                    min="0"
                    max={grandTotal}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="text-left tabular-nums"
                  />
                </div>
                <div>
                  <Select
                    label="Payment Mode"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    placeholder={null}
                    disabled={numericPaid <= 0}
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </Select>
                </div>
              </div>

              {/* Balance Due */}
              <div className="flex items-center justify-between rounded bg-slate-50 p-3 text-sm">
                <span className="font-semibold text-text">Balance Due:</span>
                <span
                  className={`tabular-nums font-bold text-base ${
                    balanceDue > 0 ? 'text-danger' : 'text-success'
                  }`}
                >
                  {formatCurrency(balanceDue)}
                </span>
              </div>

              {/* Desktop Save Button */}
              <div className="hidden md:flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={createPurchaseMutation.isPending}
                  disabled={createPurchaseMutation.isPending}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  Save Purchase
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Mobile Sticky Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border px-4 py-3 flex items-center justify-between shadow-lg pb-safe md:hidden">
          <div>
            <span className="text-xs text-muted block">Grand Total:</span>
            <span className="text-base font-bold text-primary tabular-nums">
              {formatCurrency(grandTotal)}
            </span>
          </div>
          <Button
            type="submit"
            variant="primary"
            loading={createPurchaseMutation.isPending}
            disabled={createPurchaseMutation.isPending}
            className="min-h-[44px] px-5"
          >
            Save Purchase
          </Button>
        </div>
      </form>

      {/* Supplier Modal */}
      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSupplierCreated={(newSupplier) => {
          setSupplierId(newSupplier._id);
        }}
      />

      {/* Add Product Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setTargetRowIdForProduct(null);
          setProductServerError('');
        }}
        onSubmitProduct={(payload) => {
          createProductMutation.mutate(payload);
        }}
        isSubmitting={createProductMutation.isPending}
        serverError={productServerError}
      />

      {/* Manage Units Modal */}
      {managingUnitsProduct && (
        <ManageUnitsModal
          product={managingUnitsProduct}
          isOpen={Boolean(managingUnitsProduct)}
          onClose={() => {
            setManagingUnitsProduct(null);
            setPendingUnitRowId(null);
          }}
          onSaved={handleUnitsSaved}
        />
      )}
    </div>
  );
}
