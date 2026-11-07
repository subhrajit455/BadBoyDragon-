import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  Search,
  AlertTriangle,
  Receipt,
  UserPlus,
  PackagePlus,
  X,
  UserCheck,
  History,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatNumber } from '../utils/format';
import Card, { CardBody, CardHeader } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import CustomerModal from '../components/customers/CustomerModal';
import ProductModal from '../components/products/ProductModal';
import ManageUnitsModal from '../components/products/ManageUnitsModal';

export const COMMON_CONSTRUCTION_UNITS = [
  'pcs',
  'bag',
  'ton',
  'cft',
  'kg',
  'meter',
  'bundle',
  'brass',
  'trip',
  'box',
  'sqft',
  'unit',
];

export default function NewInvoice() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const searchParams = new URLSearchParams(location.search);
  const modeParam = searchParams.get('mode');
  const sourceQuotation = location.state?.quotation || null;
  const isQuotationConversion = Boolean(sourceQuotation);

  const [invoiceMode, setInvoiceMode] = useState(() => {
    if (isQuotationConversion) return 'live';
    return modeParam === 'past' ? 'past' : 'live';
  });
  const isHistorical = invoiceMode === 'past';
  const [customInvoiceNo, setCustomInvoiceNo] = useState('');
  const [quotationId, setQuotationId] = useState(() => sourceQuotation?._id || '');

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerModalInitialName, setCustomerModalInitialName] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productModalInitialName, setProductModalInitialName] = useState('');
  const [productModalError, setProductModalError] = useState('');
  const [pendingProductRowId, setPendingProductRowId] = useState(null);
  const [managingUnitsProduct, setManagingUnitsProduct] = useState(null);
  const [pendingUnitRowId, setPendingUnitRowId] = useState(null);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const customerDropdownRef = useRef(null);

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [serverError, setServerError] = useState('');

  // Product Search State for adding items
  const [productSearch, setProductSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Items State
  // { rowId, productDoc, productId, productName, hsn, baseUnit, unit, factor, quantity, rate, gstRate }
  const [items, setItems] = useState([]);

  // Close search dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setIsCustomerSearchOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Customers list
  const { data: customersResponse, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get('/customers', { params: { status: 'active', limit: 200 } });
      return res.data?.data || [];
    },
  });

  const customers = customersResponse || [];
  const selectedCustomer = customers.find((c) => c._id === customerId);

  // Filter customers for searchable combobox
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.trim().toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.gstin?.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // Fetch all active products (for row selects)
  const { data: allProductsData } = useQuery({
    queryKey: ['products', 'active'],
    queryFn: async () => {
      const res = await api.get('/products', { params: { status: 'active', limit: 200 } });
      return res.data?.data || [];
    },
  });

  const allProducts = allProductsData || [];

  // Pre-fill fields if opened from a quotation
  useEffect(() => {
    if (sourceQuotation && allProducts.length > 0) {
      setQuotationId(sourceQuotation._id);
      if (sourceQuotation.customer?._id || sourceQuotation.customer) {
        setCustomerId(sourceQuotation.customer?._id || sourceQuotation.customer);
      }
      if (sourceQuotation.customerSnapshot?.name) {
        setCustomerSearch(sourceQuotation.customerSnapshot.name);
      }
      if (sourceQuotation.notes) {
        setNotes(sourceQuotation.notes);
      }

      if (sourceQuotation.items?.length > 0) {
        const loadedItems = sourceQuotation.items.map((it) => {
          const prod = allProducts.find(
            (p) => p._id.toString() === (it.product?._id || it.product).toString()
          );
          return {
            rowId: Math.random(),
            productDoc: prod || null,
            productId: it.product?._id || it.product,
            productName: it.productName,
            hsn: it.hsn || '',
            baseUnit: prod?.baseUnit || it.unit,
            unit: it.unit,
            factor: it.factor || 1,
            quantity: it.quantity,
            rate: it.rate,
            gstRate: it.gstRate,
          };
        });
        setItems(loadedItems);
      }
    }
  }, [sourceQuotation, allProducts]);

  // Fetch Business Settings (for state comparison)
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data?.data;
    },
  });

  const businessState = settingsData?.state || '';

  // Determine GST type based on customer state vs business state
  const isInterState = useMemo(() => {
    if (!selectedCustomer?.state || !businessState) return false;
    return (
      selectedCustomer.state.trim().toLowerCase() !==
      businessState.trim().toLowerCase()
    );
  }, [selectedCustomer, businessState]);

  // Product search query
  const { data: searchResultsData, isLoading: searchLoading } = useQuery({
    queryKey: ['products-search', productSearch],
    queryFn: async () => {
      const res = await api.get('/products/search', {
        params: { q: productSearch },
      });
      return res.data?.data || [];
    },
    enabled: isSearchOpen || productSearch.length > 0,
  });

  const searchResults = searchResultsData || [];

  // Create Product Mutation
  const createProductMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/products', payload);
      return res.data?.data;
    },
    onSuccess: (newProd) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-search'] });
      setIsProductModalOpen(false);
      setProductModalError('');
      setProductModalInitialName('');

      if (pendingProductRowId) {
        handleProductChange(pendingProductRowId, newProd._id, newProd);
        setPendingProductRowId(null);
      } else {
        handleSelectProduct(newProd);
      }
    },
    onError: (err) => {
      setProductModalError(
        err.response?.data?.message || err.message || 'Failed to create product'
      );
    },
  });

  // Set of product IDs already in line items (to prevent duplicates)
  const selectedProductIds = useMemo(() => {
    return new Set(items.map((it) => it.productId).filter(Boolean));
  }, [items]);

  // Check if any existing row does not have a product selected or typed
  const hasIncompleteRow = items.some((it) =>
    isHistorical ? !(it.productName && it.productName.trim()) : !it.productId
  );

  // Auto-initialize 1 empty row for typing if in past bill mode and no items
  useEffect(() => {
    if (isHistorical && items.length === 0) {
      setItems([
        {
          rowId: Date.now() + Math.random(),
          productDoc: null,
          productId: '',
          productName: '',
          hsn: '',
          baseUnit: 'pcs',
          unit: 'pcs',
          factor: 1,
          quantity: 1,
          rate: 0,
          gstRate: 0,
        },
      ]);
    }
  }, [isHistorical]);

  // Add an empty line item row (for + Add Item button)
  const handleAddEmptyRow = () => {
    if (hasIncompleteRow) {
      setServerError(
        isHistorical
          ? 'Please enter the item name for the current row before adding another item.'
          : 'Please select a product for the current row before adding another item.'
      );
      return;
    }

    if (!isHistorical) {
      const unselectedProducts = allProducts.filter(
        (p) => !selectedProductIds.has(p._id)
      );

      if (allProducts.length > 0 && unselectedProducts.length === 0) {
        setServerError('All available products have already been added to this invoice.');
        return;
      }
    }

    setServerError('');
    const newItem = {
      rowId: Date.now() + Math.random(),
      productDoc: null,
      productId: '',
      productName: '',
      hsn: '',
      baseUnit: 'pcs',
      unit: 'pcs',
      factor: 1,
      quantity: 1,
      rate: 0,
      gstRate: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Add a specific product from search
  const handleSelectProduct = (prod) => {
    // If product is already added in the invoice, bump quantity on existing row instead of adding duplicate row
    const existingRow = items.find((it) => it.productId === prod._id);
    if (existingRow) {
      setItems((prev) =>
        prev.map((it) =>
          it.productId === prod._id
            ? { ...it, quantity: Number(it.quantity || 0) + 1 }
            : it
        )
      );
      setProductSearch('');
      setIsSearchOpen(false);
      setServerError('');
      return;
    }

    const defaultUnit =
      prod.units?.find(
        (u) => u.name.toLowerCase() === prod.baseUnit?.toLowerCase()
      ) || prod.units?.[0];

    const initialFactor = defaultUnit ? Number(defaultUnit.factor) : 1;
    const initialRate = defaultUnit?.sellingPrice || 0;

    const newItem = {
      rowId: Date.now() + Math.random(),
      productDoc: prod,
      productId: prod._id,
      productName: prod.name,
      hsn: prod.hsn || '',
      baseUnit: prod.baseUnit,
      unit: defaultUnit ? defaultUnit.name : prod.baseUnit,
      factor: initialFactor,
      quantity: 1,
      rate: initialRate,
      gstRate: prod.gstRate ?? 18,
    };

    setItems((prev) => [...prev, newItem]);
    setProductSearch('');
    setIsSearchOpen(false);
    setServerError('');
  };

  // Handle product selection inside a row dropdown
  const handleProductChange = (rowId, selectedProductId, directProdDoc = null) => {
    if (selectedProductId === 'NEW_PRODUCT') {
      setPendingProductRowId(rowId);
      setProductModalInitialName('');
      setIsProductModalOpen(true);
      return;
    }

    // Check if product is already selected in another row (strictly prevent duplicates)
    const isDuplicate = items.some(
      (it) => it.rowId !== rowId && it.productId === selectedProductId
    );
    if (selectedProductId && isDuplicate) {
      setServerError('This product is already in the invoice. Please adjust its quantity instead.');
      return;
    }
    setServerError('');

    const prod = directProdDoc || allProducts.find((p) => p._id === selectedProductId);

    setItems((prev) =>
      prev.map((item) => {
        if (item.rowId === rowId) {
          if (!prod) {
            return {
              ...item,
              productId: '',
              productName: '',
              productDoc: null,
              hsn: '',
              baseUnit: '',
              unit: '',
              factor: 1,
              rate: 0,
            };
          }

          const defaultUnit =
            prod.units?.find(
              (u) => u.name.toLowerCase() === prod.baseUnit?.toLowerCase()
            ) || prod.units?.[0];

          const initialFactor = defaultUnit ? Number(defaultUnit.factor) : 1;
          const initialRate = defaultUnit?.sellingPrice || 0;

          return {
            ...item,
            productDoc: prod,
            productId: prod._id,
            productName: prod.name,
            hsn: prod.hsn || '',
            baseUnit: prod.baseUnit,
            unit: defaultUnit ? defaultUnit.name : prod.baseUnit,
            factor: initialFactor,
            rate: initialRate,
            gstRate: prod.gstRate ?? 18,
          };
        }
        return item;
      })
    );
  };

  // Change unit on an item row
  const handleUnitChange = (rowId, newUnitName) => {
    if (newUnitName === '__ADD_UNIT__') {
      const currentItem = items.find((it) => it.rowId === rowId);
      const prod =
        currentItem?.productDoc ||
        allProducts.find((p) => p._id === currentItem?.productId);
      if (prod) {
        setManagingUnitsProduct(prod);
        setPendingUnitRowId(rowId);
      }
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.rowId === rowId) {
          const matchedUnit = item.productDoc?.units?.find(
            (u) => u.name.toLowerCase() === newUnitName.toLowerCase()
          );

          const newFactor = matchedUnit ? Number(matchedUnit.factor) : 1;
          const newRate =
            matchedUnit && matchedUnit.sellingPrice > 0
              ? matchedUnit.sellingPrice
              : item.rate;

          return {
            ...item,
            unit: newUnitName,
            factor: newFactor,
            rate: newRate,
          };
        }
        return item;
      })
    );
  };

  const handleUnitsSaved = (updatedProduct, newUnitName) => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products-search'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });

    setItems((prev) =>
      prev.map((item) => {
        if (item.productId === updatedProduct._id) {
          const isTargetRow = item.rowId === pendingUnitRowId;
          const targetUnitName =
            isTargetRow && newUnitName ? newUnitName : item.unit;
          const matchedUnit =
            updatedProduct.units?.find(
              (u) => u.name.toLowerCase() === targetUnitName?.toLowerCase()
            ) || updatedProduct.units?.[0];

          return {
            ...item,
            productDoc: updatedProduct,
            unit: matchedUnit ? matchedUnit.name : item.unit,
            factor: matchedUnit ? Number(matchedUnit.factor) : item.factor,
            rate:
              isTargetRow && matchedUnit && matchedUnit.sellingPrice > 0
                ? matchedUnit.sellingPrice
                : item.rate,
          };
        }
        return item;
      })
    );
    setManagingUnitsProduct(null);
    setPendingUnitRowId(null);
  };

  const handleFieldChange = (rowId, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.rowId === rowId) {
          return {
            ...item,
            [field]: value,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (rowId) => {
    setItems((prev) => prev.filter((item) => item.rowId !== rowId));
  };

  // Aggregated required base quantity per product (to flag stock warnings across rows)
  const productStockAggregation = useMemo(() => {
    const agg = {};
    for (const item of items) {
      if (!item.productId) continue;
      const qty = Number(item.quantity) || 0;
      const factor = Number(item.factor) || 1;
      const baseQty = qty * factor;
      agg[item.productId] = (agg[item.productId] || 0) + baseQty;
    }
    return agg;
  }, [items]);

  // Calculations per line item
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const gstPercent = Number(item.gstRate) || 0;
      const taxable = Math.round(qty * rate * 100) / 100;
      const gst = Math.round(((taxable * gstPercent) / 100) * 100) / 100;
      const total = Math.round((taxable + gst) * 100) / 100;
      const baseQtyNeeded = qty * (Number(item.factor) || 1);
      const totalProductNeeded = item.productId ? (productStockAggregation[item.productId] || 0) : 0;
      const available = item.productDoc?.currentStock || 0;
      const exceedsStock = !isHistorical && item.productId && totalProductNeeded > available;

      return {
        ...item,
        taxable,
        gst,
        total,
        baseQtyNeeded,
        available,
        exceedsStock,
      };
    });
  }, [items, productStockAggregation, isHistorical]);

  // Filter to items that have a product selected or typed name, and quantity > 0
  const validItems = useMemo(() => {
    return calculatedItems.filter(
      (it) =>
        (it.productId || (it.productName && it.productName.trim())) &&
        Number(it.quantity) > 0
    );
  }, [calculatedItems]);

  // Totals
  const subtotal = validItems.reduce((acc, curr) => acc + curr.taxable, 0);
  const totalGst = validItems.reduce((acc, curr) => acc + curr.gst, 0);
  const grandTotal = Math.round((subtotal + totalGst) * 100) / 100;

  const cgst = isInterState ? 0 : Math.round((totalGst / 2) * 100) / 100;
  const sgst = isInterState ? 0 : Math.round((totalGst - cgst) * 100) / 100;
  const igst = isInterState ? totalGst : 0;

  const parsedPaidAmount = Math.max(0, Number(paidAmount) || 0);

  const customerAdvance = Math.max(0, -(Number(selectedCustomer?.currentBalance) || 0));
  const advanceToApply = Math.min(
    customerAdvance,
    Math.max(0, grandTotal - parsedPaidAmount)
  );
  const effectiveBalanceDue = Math.max(
    0,
    Math.round((grandTotal - parsedPaidAmount - advanceToApply) * 100) / 100
  );

  // Validation to save: a customer and at least one item with valid product & quantity > 0
  const hasValidCustomer = Boolean(customerId);
  const hasItems = validItems.length > 0;
  const hasAnyStockError = !isHistorical && validItems.some((it) => it.exceedsStock);
  const canSave = hasValidCustomer && hasItems && !hasAnyStockError;

  // Mutation to create sale
  const createSaleMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/sales', payload);
      return res.data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      if (quotationId) {
        queryClient.invalidateQueries({ queryKey: ['quotation', quotationId] });
      }
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });

      const newId = data.data?._id;
      if (newId) {
        navigate(`/billing/${newId}`);
      } else {
        navigate('/billing');
      }
    },
    onError: (err) => {
      setServerError(
        err.response?.data?.message || err.message || 'Failed to create sale invoice'
      );
    },
  });

  const handleSaveInvoice = (e) => {
    e.preventDefault();
    setServerError('');

    if (!hasValidCustomer) {
      setServerError('Please select or add a customer');
      return;
    }
    if (!hasItems) {
      setServerError('Please add at least one line item with a selected product/name and quantity > 0');
      return;
    }
    if (!isHistorical && hasAnyStockError) {
      setServerError('One or more line items exceed currently available inventory stock');
      return;
    }
    if (parsedPaidAmount > grandTotal) {
      setServerError(`Paid amount cannot exceed grand total (${formatCurrency(grandTotal)})`);
      return;
    }

    const payload = {
      customerId,
      date,
      items: validItems.map((it) => ({
        productId: it.productId || undefined,
        productName: it.productName || it.productDoc?.name || '',
        hsn: it.hsn || '',
        unit: it.unit || 'pcs',
        quantity: Number(it.quantity),
        rate: Number(it.rate),
        gstRate: Number(it.gstRate || 0),
      })),
      paidAmount: parsedPaidAmount,
      paymentMode: parsedPaidAmount > 0 ? paymentMode : 'Cash',
      notes: notes.trim(),
      quotationId: quotationId || undefined,
      isHistorical,
      invoiceNo: isHistorical && customInvoiceNo.trim() ? customInvoiceNo.trim() : undefined,
    };

    createSaleMutation.mutate(payload);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/billing')}
            className="text-muted hover:text-text p-1.5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text">
              {isHistorical ? 'Record Past Customer Bill' : 'New GST Invoice'}
            </h1>
            <p className="text-sm text-muted">
              {isHistorical
                ? 'Record past customer transactions from physical registers without deducting warehouse inventory.'
                : 'Select customer, add products, verify tax split, and save.'}
            </p>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs (Hidden when converting from quotation) */}
      {!isQuotationConversion && (
        <div className="flex rounded-lg border border-border bg-white p-1 gap-1 shadow-xs max-w-xl">
          <button
            type="button"
            onClick={() => setInvoiceMode('live')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-md transition-all ${
              invoiceMode === 'live'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-muted hover:text-text hover:bg-slate-50'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Live Sale Invoice</span>
          </button>
          <button
            type="button"
            onClick={() => setInvoiceMode('past')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-md transition-all ${
              invoiceMode === 'past'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-muted hover:text-text hover:bg-slate-50'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Old Customer Past Bill</span>
          </button>
        </div>
      )}

      {/* Past Bill Mode Info Banner */}
      {isHistorical && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex items-start gap-3 shadow-xs">
          <History className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm text-amber-950">Past Record Mode (No Inventory Deduction)</p>
            <p>
              This invoice records historical transactions for old customer accounts. Products, quantities, rates, and GST are posted directly into the customer's ledger statement for the specified date, but <strong>warehouse inventory stock will NOT be checked or deducted</strong>.
            </p>
          </div>
        </div>
      )}

      {sourceQuotation && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <span className="font-bold">Converting from Quotation:</span>
            <span className="font-semibold text-primary">{sourceQuotation.quotationNo}</span>
            <span className="text-muted">({sourceQuotation.customerSnapshot?.name})</span>
          </div>
          <span className="text-muted text-[11px]">
            Quotation will be marked as converted automatically upon saving.
          </span>
        </div>
      )}

      {serverError && (
        <div className="flex items-start gap-2.5 rounded border border-red-200 bg-red-50 p-4 text-sm text-danger">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{serverError}</div>
        </div>
      )}

      <form onSubmit={handleSaveInvoice} className="space-y-6">
        {/* Customer & Invoice Meta Details */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-text">Customer &amp; Date Details</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className={`grid grid-cols-1 gap-4 ${isHistorical ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
              {/* Customer Searchable Selector */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-text">
                    Customer <span className="text-danger">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerModalInitialName(customerSearch.trim());
                      setIsCustomerModalOpen(true);
                    }}
                    className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1"
                  >
                    <UserPlus className="h-3 w-3" />
                    <span>+ Add Customer</span>
                  </button>
                </div>

                <div ref={customerDropdownRef} className="relative">
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-slate-50/80">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-text text-sm truncate">
                            {selectedCustomer.name}
                          </span>
                          <span className="text-xs text-muted">
                            ({selectedCustomer.state || 'Local / Intra-state'})
                          </span>
                          {selectedCustomer.gstin && (
                            <span className="text-[11px] font-mono bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded">
                              {selectedCustomer.gstin}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted mt-1">
                          {selectedCustomer.phone && (
                            <span>Phone: <strong>{selectedCustomer.phone}</strong></span>
                          )}
                          <span>
                            Balance:{' '}
                            <strong
                              className={
                                Number(selectedCustomer.currentBalance) > 0
                                  ? 'text-danger'
                                  : Number(selectedCustomer.currentBalance) < 0
                                  ? 'text-success'
                                  : 'text-muted'
                              }
                            >
                              {formatCurrency(Math.abs(selectedCustomer.currentBalance || 0))}{' '}
                              {Number(selectedCustomer.currentBalance) > 0
                                ? '(Owes)'
                                : Number(selectedCustomer.currentBalance) < 0
                                ? '(Advance)'
                                : '(Settled)'}
                            </strong>
                          </span>
                          <span>• Tax: <strong className="text-text">{isInterState ? 'IGST (Inter-state)' : 'CGST + SGST (Intra-state)'}</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-3">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setCustomerId('');
                            setCustomerSearch('');
                            setIsCustomerSearchOpen(true);
                          }}
                          className="text-xs h-7 px-2"
                        >
                          Change
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerId('');
                            setCustomerSearch('');
                          }}
                          className="text-muted hover:text-danger p-1 rounded transition-colors"
                          title="Remove selected customer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Input
                        placeholder="Type to search customer by name, phone, or GSTIN..."
                        value={customerSearch}
                        onFocus={() => setIsCustomerSearchOpen(true)}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setIsCustomerSearchOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (filteredCustomers.length > 0) {
                              setCustomerId(filteredCustomers[0]._id);
                              setIsCustomerSearchOpen(false);
                              setCustomerSearch('');
                            } else if (customerSearch.trim()) {
                              setCustomerModalInitialName(customerSearch.trim());
                              setIsCustomerModalOpen(true);
                              setIsCustomerSearchOpen(false);
                            }
                          } else if (e.key === 'Escape') {
                            setIsCustomerSearchOpen(false);
                          }
                        }}
                        rightElement={
                          <div className="flex items-center gap-1 text-muted">
                            <Search className="h-4 w-4" />
                          </div>
                        }
                      />

                      {/* Dropdown list of matching customers */}
                      {isCustomerSearchOpen && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg">
                          {customersLoading ? (
                            <div className="p-3 text-center text-xs text-muted">
                              Loading customers...
                            </div>
                          ) : filteredCustomers.length === 0 ? (
                            <div className="p-3 text-center text-xs text-muted space-y-2">
                              <p>
                                {customerSearch
                                  ? `No customer matches "${customerSearch}"`
                                  : 'No active customers registered yet'}
                              </p>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setCustomerModalInitialName(customerSearch.trim());
                                  setIsCustomerModalOpen(true);
                                  setIsCustomerSearchOpen(false);
                                }}
                                className="w-full gap-1.5 text-xs justify-center"
                              >
                                <UserPlus className="h-3.5 w-3.5 text-primary" />
                                <span>
                                  Add new customer {customerSearch ? `"${customerSearch}"` : ''}
                                </span>
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="px-2 py-1 text-[11px] font-semibold text-muted uppercase flex items-center justify-between">
                                <span>Select Customer ({filteredCustomers.length})</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCustomerModalInitialName(customerSearch.trim());
                                    setIsCustomerModalOpen(true);
                                    setIsCustomerSearchOpen(false);
                                  }}
                                  className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1"
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>New Customer</span>
                                </button>
                              </div>
                              {filteredCustomers.map((c) => (
                                <button
                                  key={c._id}
                                  type="button"
                                  onClick={() => {
                                    setCustomerId(c._id);
                                    setIsCustomerSearchOpen(false);
                                    setCustomerSearch('');
                                  }}
                                  className="w-full text-left rounded px-3 py-2 text-xs hover:bg-slate-100 transition-colors flex items-center justify-between group"
                                >
                                  <div>
                                    <p className="font-semibold text-text group-hover:text-primary transition-colors">
                                      {c.name}
                                    </p>
                                    <p className="text-[11px] text-muted">
                                      {c.phone ? `Phone: ${c.phone}` : 'No phone'} • State:{' '}
                                      {c.state || 'Same State'}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span
                                      className={`font-semibold tabular-nums ${
                                        Number(c.currentBalance) > 0
                                          ? 'text-danger'
                                          : Number(c.currentBalance) < 0
                                          ? 'text-success'
                                          : 'text-muted'
                                      }`}
                                    >
                                      {formatCurrency(Math.abs(c.currentBalance || 0))}
                                    </span>
                                    <span className="block text-[10px] text-muted">
                                      {Number(c.currentBalance) > 0
                                        ? 'Owes'
                                        : Number(c.currentBalance) < 0
                                        ? 'Advance'
                                        : 'Settled'}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Date */}
              <div className="sm:col-span-1">
                <Input
                  label={isHistorical ? 'Past Bill Date' : 'Invoice Date'}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              {/* Bill / Invoice No (Historical past records) */}
              {isHistorical && (
                <div className="sm:col-span-1">
                  <Input
                    label="Bill / Invoice No (Optional)"
                    placeholder="e.g. BILL-104 (or auto)"
                    value={customInvoiceNo}
                    onChange={(e) => setCustomInvoiceNo(e.target.value)}
                  />
                  <p className="text-[10px] text-muted mt-1 truncate" title="Leave blank to auto-generate counter invoice number">
                    Blank = auto-generate
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Product Search & Line Items */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-text">
                {isHistorical ? 'Historical Line Items (Self-input products)' : 'Line Items'}
              </h2>
              <p className="text-xs text-muted">
                {isHistorical
                  ? 'Type item name, unit, quantity, rate, and GST %. These will NOT be added to your inventory.'
                  : 'Add products to the invoice via search or the Add Item button.'}
              </p>
            </div>

            {/* Combined Search + Add Icon Action Bar */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isHistorical ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleAddEmptyRow}
                  disabled={hasIncompleteRow}
                  className="gap-1.5 shrink-0"
                  title="Add a new line item row"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Add Item Row</span>
                </Button>
              ) : (
                <>
                  {/* Product Live Search Input with Dropdown */}
                  <div ref={searchContainerRef} className="relative w-full sm:w-72">
                <Input
                  placeholder="Type to search and add product..."
                  value={productSearch}
                  onFocus={() => setIsSearchOpen(true)}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (searchResults.length > 0) {
                        handleSelectProduct(searchResults[0]);
                      } else if (productSearch.trim()) {
                        setProductModalInitialName(productSearch.trim());
                        setIsProductModalOpen(true);
                        setIsSearchOpen(false);
                      }
                    } else if (e.key === 'Escape') {
                      setIsSearchOpen(false);
                    }
                  }}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => {
                        if (searchResults.length > 0) {
                          handleSelectProduct(searchResults[0]);
                        } else {
                          setIsSearchOpen(true);
                        }
                      }}
                      className="text-muted hover:text-text transition-colors p-1"
                      title="Search products"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  }
                />

                {/* Autocomplete Results Dropdown */}
                {isSearchOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg">
                    {searchLoading ? (
                      <div className="p-3 text-center text-xs text-muted">Searching products...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted space-y-2">
                        <p>{productSearch ? `No active products match "${productSearch}"` : 'No active products found'}</p>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setProductModalInitialName(productSearch.trim());
                            setIsProductModalOpen(true);
                            setIsSearchOpen(false);
                          }}
                          className="w-full gap-1.5 text-xs justify-center"
                        >
                          <Plus className="h-3.5 w-3.5 text-primary" />
                          <span>Create new product {productSearch ? `"${productSearch}"` : ''}</span>
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="px-2 py-1 text-[11px] font-semibold text-muted uppercase">
                          Matching Products ({searchResults.length})
                        </div>
                        {searchResults.map((prod) => {
                          const isAlreadyAdded = selectedProductIds.has(prod._id);
                          const isSupplier = prod.sourceType === 'supplier';
                          const supplierName = prod.supplier?.name;
                          return (
                            <button
                              key={prod._id}
                              type="button"
                              onClick={() => handleSelectProduct(prod)}
                              className="w-full text-left rounded px-3 py-2 text-xs hover:bg-slate-100 transition-colors flex items-center justify-between group"
                            >
                              <div>
                                <p className="font-semibold text-text group-hover:text-primary transition-colors flex items-center gap-1.5 flex-wrap">
                                  <span>{prod.name}</span>
                                  {isSupplier ? (
                                    <span className="text-[10px] font-normal text-slate-700 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
                                      Supplier: {supplierName || 'Sourced'}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-normal text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                                      Self Stock
                                    </span>
                                  )}
                                  {isAlreadyAdded && (
                                    <span className="text-[10px] font-normal text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                      In invoice (+1)
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-muted">
                                  HSN: {prod.hsn || '—'}
                                </p>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`font-medium ${
                                    prod.currentStock > 0 ? 'text-success' : 'text-danger'
                                  }`}
                                >
                                  {prod.currentStock} {prod.baseUnit}
                                </span>
                                <span className="block text-[10px] text-muted">in stock</span>
                              </div>
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Add Item Icon Button */}
              <Button
                type="button"
                variant="primary"
                onClick={handleAddEmptyRow}
                disabled={hasIncompleteRow}
                className="gap-1.5 shrink-0"
                title={
                  hasIncompleteRow
                    ? 'Please select a product for the current row before adding another'
                    : 'Add a line item row'
                }
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Item</span>
              </Button>
            </>
          )}
        </div>
          </CardHeader>

          <CardBody className="p-0 overflow-x-auto">
            {items.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted space-y-4">
                <Receipt className="mx-auto h-8 w-8 text-slate-300 mb-1" />
                <p className="max-w-md mx-auto text-xs text-muted">
                  {isHistorical
                    ? 'No items added yet. Click below to add an item.'
                    : 'No products added yet. Use the search box above to quickly find products, or click below to add a line item.'}
                </p>
                <div className="flex items-center justify-center gap-3 pt-1">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleAddEmptyRow}
                    disabled={hasIncompleteRow}
                    className="gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Line Item</span>
                  </Button>
                  {!isHistorical && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setProductModalInitialName('');
                        setIsProductModalOpen(true);
                      }}
                      className="gap-1.5"
                    >
                      <PackagePlus className="h-4 w-4 text-primary" />
                      <span>New Product</span>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <table className="w-full text-left text-sm text-text border-collapse">
                <thead className="border-b border-border bg-slate-50 text-xs font-semibold text-muted uppercase">
                  <tr>
                    <th className="px-4 py-3 min-w-[240px] text-left">Product</th>
                    <th className="px-4 py-3 min-w-[130px] text-left">Unit</th>
                    <th className="px-4 py-3 min-w-[110px] text-left">Quantity</th>
                    <th className="px-4 py-3 min-w-[130px] text-left">Rate</th>
                    <th className="px-4 py-3 min-w-[100px] text-left">GST %</th>
                    <th className="px-4 py-3 min-w-[120px] text-left">Amount</th>
                    <th className="px-3 py-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {calculatedItems.map((item) => {
                    const availableUnits = item.productDoc?.units || [];
                    const availableProductsForRow = allProducts.filter(
                      (p) => !selectedProductIds.has(p._id) || p._id === item.productId
                    );

                    return (
                      <tr key={item.rowId} className="align-top hover:bg-slate-50/50">
                        {/* Product Selector / Name */}
                        <td className="px-4 py-3">
                          {isHistorical ? (
                            <div className="space-y-1">
                              <Input
                                placeholder="Type item name (e.g. Red Bricks, River Sand)..."
                                value={item.productName || ''}
                                onChange={(e) =>
                                  handleFieldChange(item.rowId, 'productName', e.target.value)
                                }
                                wrapperClassName="space-y-0"
                                className="text-sm font-semibold"
                                required
                              />
                              <p className="text-[10px] text-muted">
                                Self-input item • Will not be added to inventory
                              </p>
                            </div>
                          ) : (
                            <>
                              <Select
                                value={item.productId}
                                onChange={(e) => handleProductChange(item.rowId, e.target.value)}
                                placeholder="Select product..."
                                wrapperClassName="space-y-0"
                                required
                              >
                                <option value="NEW_PRODUCT" className="font-semibold text-primary">
                                  + Add new product
                                </option>
                                {availableProductsForRow.map((p) => {
                                  const isSupplier = p.sourceType === 'supplier';
                                  const tag = isSupplier
                                    ? `Supplier: ${p.supplier?.name || 'Sourced'}`
                                    : 'Self Stock';
                                  return (
                                    <option key={p._id} value={p._id}>
                                      {p.name} [{tag}] ({p.currentStock} {p.baseUnit} in stock)
                                    </option>
                                  );
                                })}
                              </Select>

                              {item.productDoc && (
                                <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
                                  {item.productDoc.sourceType === 'supplier' ? (
                                    <span className="text-[10px] text-slate-700 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
                                      🏢 Supplier: {item.productDoc.supplier?.name || 'Sourced'}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                                      📍 Self / Direct Stock
                                    </span>
                                  )}
                                  <span className="text-muted">
                                    Available: <strong>{item.available} {item.baseUnit}</strong>
                                  </span>
                                  {item.hsn && <span className="text-muted">• HSN: {item.hsn}</span>}
                                </div>
                              )}

                              {item.exceedsStock && (
                                <div className="flex items-center gap-1 text-xs text-danger font-semibold mt-1">
                                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span>
                                    Exceeds stock! (Needed: {productStockAggregation[item.productId]}{' '}
                                    {item.baseUnit})
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </td>

                        {/* Unit Select */}
                        <td className="px-4 py-3">
                          {isHistorical ? (
                            <Select
                              value={item.unit || 'pcs'}
                              onChange={(e) => handleFieldChange(item.rowId, 'unit', e.target.value)}
                              wrapperClassName="space-y-0"
                            >
                              {COMMON_CONSTRUCTION_UNITS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </Select>
                          ) : (
                            <Select
                              value={item.unit}
                              onChange={(e) => handleUnitChange(item.rowId, e.target.value)}
                              placeholder="Select unit"
                              wrapperClassName="space-y-0"
                              disabled={!item.productId}
                              required
                            >
                              {availableUnits.map((u) => (
                                <option key={u.name} value={u.name}>
                                  {u.name} {u.factor !== 1 ? `(${u.factor} ${item.baseUnit})` : ''}
                                </option>
                              ))}
                              {item.productId && (
                                <option value="__ADD_UNIT__" className="font-semibold text-primary">
                                  + Add unit...
                                </option>
                              )}
                            </Select>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="px-4 py-3 text-left">
                          <Input
                            type="number"
                            step="any"
                            min="0.0001"
                            value={item.quantity}
                            onChange={(e) => handleFieldChange(item.rowId, 'quantity', e.target.value)}
                            wrapperClassName="space-y-0"
                            className="text-left"
                            disabled={!isHistorical && !item.productId}
                            required
                          />
                        </td>

                        {/* Rate */}
                        <td className="px-4 py-3 text-left">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            value={item.rate}
                            onChange={(e) => handleFieldChange(item.rowId, 'rate', e.target.value)}
                            wrapperClassName="space-y-0"
                            className="text-left"
                            disabled={!isHistorical && !item.productId}
                            required
                          />
                        </td>

                        {/* GST % */}
                        <td className="px-4 py-3 text-left">
                          <Select
                            value={item.gstRate}
                            onChange={(e) => handleFieldChange(item.rowId, 'gstRate', Number(e.target.value))}
                            placeholder={null}
                            wrapperClassName="space-y-0"
                            disabled={!isHistorical && !item.productId}
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </Select>
                        </td>

                        {/* Line Amount */}
                        <td className="px-4 py-3 text-left tabular-nums font-semibold">
                          <p className="text-text">{formatCurrency(item.total)}</p>
                          <p className="text-[11px] text-muted font-normal">
                            Tax: {formatCurrency(item.gst)}
                          </p>
                        </td>

                        {/* Remove */}
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.rowId)}
                            className="text-muted hover:text-danger p-1 rounded transition-colors"
                            title="Remove row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        {/* Invoice Summary & Payment Footer */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column: Notes */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-text">Notes &amp; Remarks (Optional)</h2>
            </CardHeader>
            <CardBody>
              <textarea
                rows={4}
                className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                placeholder="Additional instructions, delivery vehicle number, terms..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardBody>
          </Card>

          {/* Right Column: Tax Breakdown, Grand Total & Payment */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-text">Summary &amp; Settlement</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between text-sm text-muted">
                <span>Taxable Subtotal:</span>
                <span className="tabular-nums font-medium text-text">{formatCurrency(subtotal)}</span>
              </div>

              {isInterState ? (
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>IGST (Inter-state):</span>
                  <span className="tabular-nums font-medium text-text">{formatCurrency(igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm text-muted">
                    <span>CGST:</span>
                    <span className="tabular-nums font-medium text-text">{formatCurrency(cgst)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted">
                    <span>SGST:</span>
                    <span className="tabular-nums font-medium text-text">{formatCurrency(sgst)}</span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold text-text">
                <span>Grand Total:</span>
                <span className="tabular-nums text-primary text-lg">{formatCurrency(grandTotal)}</span>
              </div>

              {/* Fresh Payment Input */}
              <div className="pt-2">
                <Input
                  label="Fresh Cash / Payment Received Now (Optional)"
                  type="number"
                  step="any"
                  min="0"
                  max={grandTotal}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="text-left"
                />
                {Number(paidAmount) > 0 && (
                  <div className="mt-2">
                    <Select
                      label="Payment Mode"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      placeholder={null}
                      required
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI / QR</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                      <option value="Cheque">Cheque</option>
                    </Select>
                  </div>
                )}
              </div>

              {/* Balance Due */}
              <div className="flex items-center justify-between rounded bg-slate-50 p-3 text-sm">
                <span className="font-semibold text-text">Net Balance Due:</span>
                <span
                  className={`tabular-nums font-bold text-base ${
                    effectiveBalanceDue > 0 ? 'text-danger' : 'text-success'
                  }`}
                >
                  {formatCurrency(effectiveBalanceDue)}
                  {effectiveBalanceDue === 0 && advanceToApply > 0 && (
                    <span className="ml-1.5 text-xs font-normal text-emerald-600 block sm:inline">
                      (Settled via Advance)
                    </span>
                  )}
                </span>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-3">
                <Button
                  type="submit"
                  variant={isHistorical ? 'warning' : 'primary'}
                  loading={createSaleMutation.isPending}
                  disabled={!canSave || createSaleMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {isHistorical ? 'Save Past Customer Bill' : 'Save & Generate Invoice'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </form>

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        initialName={customerModalInitialName}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setCustomerModalInitialName('');
        }}
        onCustomerCreated={(newCust) => {
          queryClient.invalidateQueries({ queryKey: ['customers'] });
          queryClient.setQueryData(['customers'], (old = []) => [newCust, ...(Array.isArray(old) ? old : [])]);
          setCustomerId(newCust._id);
          setCustomerModalInitialName('');
        }}
        onSuccess={(newCust) => {
          queryClient.invalidateQueries({ queryKey: ['customers'] });
          queryClient.setQueryData(['customers'], (old = []) => [newCust, ...(Array.isArray(old) ? old : [])]);
          setCustomerId(newCust._id);
          setCustomerModalInitialName('');
        }}
      />

      {/* Product Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        initialName={productModalInitialName}
        onClose={() => {
          setIsProductModalOpen(false);
          setPendingProductRowId(null);
          setProductModalError('');
          setProductModalInitialName('');
        }}
        onSubmitProduct={(payload) => {
          createProductMutation.mutate(payload);
        }}
        isSubmitting={createProductMutation.isPending}
        serverError={productModalError}
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
