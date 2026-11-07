import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  Search,
  FileSpreadsheet,
  UserPlus,
  X,
  UserCheck,
  Calendar,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatNumber } from '../utils/format';
import Card, { CardBody, CardHeader } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import CustomerModal from '../components/customers/CustomerModal';
import ProductModal from '../components/products/ProductModal';
import ManageUnitsModal from '../components/products/ManageUnitsModal';

export default function NewQuotation() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
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
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(e.target)
      ) {
        setIsCustomerSearchOpen(false);
      }
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
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
      const res = await api.get('/customers', {
        params: { status: 'active', limit: 200 },
      });
      return res.data?.data || [];
    },
  });

  const customers = customersResponse || [];
  const selectedCustomer = customers.find((c) => c._id === customerId);

  // Filter customers for combobox
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

  // Fetch all active products
  const { data: allProductsData } = useQuery({
    queryKey: ['products', 'active'],
    queryFn: async () => {
      const res = await api.get('/products', {
        params: { status: 'active', limit: 200 },
      });
      return res.data?.data || [];
    },
  });

  const allProducts = allProductsData || [];

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

  // If in edit mode, fetch existing quotation
  const {
    data: existingQuotation,
    isLoading: quotationLoading,
    isError: quotationError,
  } = useQuery({
    queryKey: ['quotation', id],
    queryFn: async () => {
      const res = await api.get(`/quotations/${id}`);
      return res.data?.data;
    },
    enabled: isEditMode,
  });

  // Pre-fill form when existing quotation loads
  useEffect(() => {
    if (existingQuotation && allProducts.length > 0) {
      if (existingQuotation.status !== 'open') {
        setServerError(
          `Cannot edit this quotation because its status is "${existingQuotation.status}".`
        );
        return;
      }

      setCustomerId(existingQuotation.customer?._id || existingQuotation.customer);
      setCustomerSearch(existingQuotation.customerSnapshot?.name || '');
      setDate(
        existingQuotation.date
          ? new Date(existingQuotation.date).toISOString().split('T')[0]
          : ''
      );
      setValidUntil(
        existingQuotation.validUntil
          ? new Date(existingQuotation.validUntil).toISOString().split('T')[0]
          : ''
      );
      setNotes(existingQuotation.notes || '');

      const loadedItems = existingQuotation.items.map((it) => {
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
  }, [existingQuotation, allProducts]);

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

  // Handle Add Item row
  const handleAddItem = () => {
    const newItem = {
      rowId: Date.now() + Math.random(),
      productDoc: null,
      productId: '',
      productName: '',
      hsn: '',
      baseUnit: '',
      unit: '',
      factor: 1,
      quantity: 1,
      rate: 0,
      gstRate: 18,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Add a specific product from search
  const handleSelectProduct = (prod) => {
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

    const isDuplicate = items.some(
      (it) => it.rowId !== rowId && it.productId === selectedProductId
    );
    if (selectedProductId && isDuplicate) {
      setServerError('This product is already in the quotation. Adjust its quantity instead.');
      return;
    }
    setServerError('');

    const prod =
      directProdDoc || allProducts.find((p) => p._id === selectedProductId);

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

  // Calculations per line item
  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const gstPercent = Number(item.gstRate) || 0;
      const taxable = Math.round(qty * rate * 100) / 100;
      const gst = Math.round(((taxable * gstPercent) / 100) * 100) / 100;
      const total = Math.round((taxable + gst) * 100) / 100;
      const available = item.productDoc?.currentStock || 0;

      return {
        ...item,
        taxable,
        gst,
        total,
        available,
      };
    });
  }, [items]);

  // Filter to items that have a product selected and quantity > 0
  const validItems = useMemo(() => {
    return calculatedItems.filter((it) => it.productId && Number(it.quantity) > 0);
  }, [calculatedItems]);

  // Totals
  const subtotal = validItems.reduce((acc, curr) => acc + curr.taxable, 0);
  const totalGst = validItems.reduce((acc, curr) => acc + curr.gst, 0);
  const grandTotal = Math.round((subtotal + totalGst) * 100) / 100;

  const cgst = isInterState ? 0 : Math.round((totalGst / 2) * 100) / 100;
  const sgst = isInterState ? 0 : Math.round((totalGst - cgst) * 100) / 100;
  const igst = isInterState ? totalGst : 0;

  // Form rule: only mark truly necessary fields required.
  // Required to save: a customer and at least one item with quantity > 0.
  // Stock hint is muted info only with NO blocking warning!
  const hasValidCustomer = Boolean(customerId);
  const hasItems = validItems.length > 0;
  const canSave = hasValidCustomer && hasItems;

  // Mutation to create/update quotation
  const saveQuotationMutation = useMutation({
    mutationFn: async (payload) => {
      if (isEditMode) {
        const res = await api.put(`/quotations/${id}`, payload);
        return res.data;
      }
      const res = await api.post('/quotations', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      if (isEditMode) {
        queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      }

      const targetId = isEditMode ? id : data.data?._id;
      if (targetId) {
        navigate(`/quotations/${targetId}`);
      } else {
        navigate('/quotations');
      }
    },
    onError: (err) => {
      setServerError(
        err.response?.data?.message ||
          err.message ||
          'Failed to save quotation. Please verify input fields.'
      );
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    setServerError('');

    const payload = {
      customerId,
      date,
      validUntil: validUntil || undefined,
      items: validItems.map((item) => ({
        productId: item.productId,
        unit: item.unit,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        gstRate: Number(item.gstRate),
      })),
      notes: notes.trim(),
    };

    saveQuotationMutation.mutate(payload);
  };

  if (isEditMode && quotationLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isEditMode && quotationError) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto bg-surface rounded-xl border border-border shadow-sm">
        <AlertCircle className="h-10 w-10 text-danger mx-auto mb-3" />
        <h2 className="text-base font-semibold text-text">Failed to load quotation</h2>
        <p className="text-sm text-muted mt-1">
          The requested quotation could not be loaded or may not exist.
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/quotations')}
            className="gap-2 text-muted hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text">
              {isEditMode ? 'Edit Quotation' : 'New Quotation'}
            </h1>
            <p className="text-xs text-muted">
              {isEditMode
                ? `Updating ${existingQuotation?.quotationNo || 'Quotation'}`
                : 'Create an official price estimate for a customer'}
            </p>
          </div>
        </div>
      </div>

      {serverError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-danger text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Notice</span>
            <span>{serverError}</span>
          </div>
          <button
            type="button"
            onClick={() => setServerError('')}
            className="text-danger hover:text-red-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Quotation Info Card */}
        <Card>
          <CardHeader className="border-b border-border py-3 px-5">
            <span className="font-semibold text-sm text-text">Customer &amp; Dates</span>
          </CardHeader>
          <CardBody className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Customer Selector */}
              <div className="relative md:col-span-1" ref={customerDropdownRef}>
                <label className="block text-xs font-medium text-text mb-1">
                  Customer <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Input
                    placeholder="Search or select customer..."
                    value={
                      selectedCustomer
                        ? `${selectedCustomer.name} (${selectedCustomer.phone || 'No phone'})`
                        : customerSearch
                    }
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setCustomerId('');
                      setIsCustomerSearchOpen(true);
                    }}
                    onFocus={() => setIsCustomerSearchOpen(true)}
                    rightElement={
                      selectedCustomer ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerId('');
                            setCustomerSearch('');
                          }}
                          className="text-muted hover:text-text p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <Search className="h-4 w-4 text-muted" />
                      )
                    }
                  />

                  {/* Customer Dropdown */}
                  {isCustomerSearchOpen && (
                    <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-surface shadow-lg">
                      <div className="p-2 border-b border-border bg-slate-50">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs text-primary font-medium gap-2 py-1.5"
                          onClick={() => {
                            setCustomerModalInitialName(customerSearch);
                            setIsCustomerModalOpen(true);
                            setIsCustomerSearchOpen(false);
                          }}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>+ Add New Customer &quot;{customerSearch || '...'}&quot;</span>
                        </Button>
                      </div>

                      {customersLoading ? (
                        <div className="p-4 text-center">
                          <Spinner size="sm" />
                        </div>
                      ) : filteredCustomers.length === 0 ? (
                        <div className="p-3 text-center text-xs text-muted">
                          No customer found matching &quot;{customerSearch}&quot;
                        </div>
                      ) : (
                        filteredCustomers.map((cust) => (
                          <div
                            key={cust._id}
                            className={`px-3 py-2 text-xs cursor-pointer hover:bg-slate-100 flex items-center justify-between border-b border-slate-50 ${
                              customerId === cust._id ? 'bg-orange-50 font-medium' : ''
                            }`}
                            onClick={() => {
                              setCustomerId(cust._id);
                              setCustomerSearch(cust.name);
                              setIsCustomerSearchOpen(false);
                            }}
                          >
                            <div>
                              <div className="font-semibold text-text">{cust.name}</div>
                              <div className="text-[11px] text-muted">
                                {cust.phone || 'No phone'} • {cust.state || 'No state'}
                              </div>
                            </div>
                            {customerId === cust._id && (
                              <UserCheck className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {selectedCustomer && (
                  <div className="mt-2 text-xs text-muted bg-slate-50 p-2.5 rounded-lg border border-border">
                    <div className="text-text font-medium">{selectedCustomer.name}</div>
                    <div>{selectedCustomer.address || 'No address registered'}</div>
                    <div className="flex gap-2 text-[11px] mt-0.5">
                      <span>State: {selectedCustomer.state || 'Same State'}</span>
                      {selectedCustomer.gstin && <span>• GSTIN: {selectedCustomer.gstin}</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* Quotation Date */}
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Quotation Date
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  rightElement={<Calendar className="h-4 w-4 text-muted" />}
                />
              </div>

              {/* Valid Until Date */}
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Valid Until <span className="text-muted text-[11px]">(Default +15 days)</span>
                </label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  rightElement={<Calendar className="h-4 w-4 text-muted" />}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Product Items Table Card */}
        <Card>
          <CardHeader className="border-b border-border py-3 px-5 flex items-center justify-between">
            <span className="font-semibold text-sm text-text">Quotation Items</span>
            <span className="text-xs text-muted">
              {validItems.length} {validItems.length === 1 ? 'item' : 'items'}
            </span>
          </CardHeader>
          <CardBody className="p-5 space-y-4">
            {/* Quick Add Product Search Bar */}
            <div className="relative" ref={searchContainerRef}>
              <Input
                placeholder="Type product name to quickly add to quotation..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                rightElement={
                  searchLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <Search className="h-4 w-4 text-muted" />
                  )
                }
              />

              {isSearchOpen && (
                <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-surface shadow-lg">
                  {searchResults.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted">
                      {productSearch.trim()
                        ? `No products found for "${productSearch}".`
                        : 'Type to search products...'}
                    </div>
                  ) : (
                    searchResults.map((prod) => (
                      <div
                        key={prod._id}
                        className="px-3 py-2 text-xs cursor-pointer hover:bg-slate-100 flex items-center justify-between border-b border-slate-50"
                        onClick={() => handleSelectProduct(prod)}
                      >
                        <div>
                          <span className="font-semibold text-text">{prod.name}</span>
                          <span className="text-muted text-[11px] ml-2">
                            ({prod.category || 'General'}) • Available: {prod.currentStock || 0} {prod.baseUnit}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-primary">
                          ₹{prod.units?.[0]?.sellingPrice || 0} / {prod.baseUnit}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Line Items Table */}
            {items.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-border rounded-xl">
                <FileSpreadsheet className="h-8 w-8 text-muted mx-auto mb-2 opacity-50" />
                <p className="text-xs text-muted">
                  No items added yet. Use the search bar above or click &quot;Add Row&quot;.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddItem}
                  className="mt-3 gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Line Row</span>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 text-muted font-medium">
                      <th className="py-2.5 px-3 min-w-[220px] text-left">Product</th>
                      <th className="py-2.5 px-3 min-w-[120px] text-left">Unit</th>
                      <th className="py-2.5 px-3 min-w-[100px] text-left">Qty</th>
                      <th className="py-2.5 px-3 min-w-[110px] text-left">Rate (₹)</th>
                      <th className="py-2.5 px-3 min-w-[90px] text-left">GST %</th>
                      <th className="py-2.5 px-3 min-w-[120px] text-left">Amount (₹)</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {calculatedItems.map((item) => (
                      <tr key={item.rowId} className="hover:bg-slate-50/60">
                        {/* Product Column */}
                        <td className="py-2 px-3 align-top">
                          <Select
                            value={item.productId || ''}
                            onChange={(e) =>
                              handleProductChange(item.rowId, e.target.value)
                            }
                            placeholder="Select a product..."
                            className="text-xs py-1.5"
                          >
                            {allProducts.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.name}
                              </option>
                            ))}
                          </Select>
                          {/* Informational Stock Hint (Non-blocking) */}
                          {item.productId && (
                            <div className="text-[11px] text-muted mt-1">
                              Stock available: {item.available || 0} {item.baseUnit}
                            </div>
                          )}
                        </td>

                        {/* Unit Column */}
                        <td className="py-2 px-3 align-top">
                          <Select
                            value={item.unit || ''}
                            onChange={(e) =>
                              handleUnitChange(item.rowId, e.target.value)
                            }
                            placeholder={!item.unit ? 'Select unit' : null}
                            disabled={!item.productId}
                            className="text-xs py-1.5"
                          >
                            {item.productDoc?.units?.map((u) => (
                              <option key={u.name} value={u.name}>
                                {u.name} (x{u.factor})
                              </option>
                            ))}
                            {item.productId && (
                              <option value="__ADD_UNIT__" className="font-semibold text-primary">
                                + Add unit...
                              </option>
                            )}
                          </Select>
                        </td>

                        {/* Quantity Column */}
                        <td className="py-2 px-3 align-top text-left">
                          <Input
                            type="number"
                            min="0.001"
                            step="any"
                            value={item.quantity}
                            onChange={(e) =>
                              handleFieldChange(item.rowId, 'quantity', e.target.value)
                            }
                            className="text-xs py-1.5 text-left tabular-nums"
                          />
                        </td>

                        {/* Rate Column */}
                        <td className="py-2 px-3 align-top text-left">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={item.rate}
                            onChange={(e) =>
                              handleFieldChange(item.rowId, 'rate', e.target.value)
                            }
                            className="text-xs py-1.5 text-left tabular-nums"
                          />
                        </td>

                        {/* GST % Column */}
                        <td className="py-2 px-3 align-top text-left">
                          <Select
                            value={item.gstRate ?? 18}
                            onChange={(e) =>
                              handleFieldChange(item.rowId, 'gstRate', e.target.value)
                            }
                            placeholder={null}
                            className="text-xs py-1.5 text-left"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </Select>
                        </td>

                        {/* Total Amount Column */}
                        <td className="py-2 px-3 align-top text-left tabular-nums font-semibold text-text">
                          <div className="pt-2">{formatCurrency(item.total)}</div>
                          <div className="text-[10px] text-muted font-normal">
                            Taxable: ₹{formatNumber(item.taxable)}
                          </div>
                        </td>

                        {/* Remove Row Button */}
                        <td className="py-2 px-2 align-top text-center pt-2.5">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.rowId)}
                            className="text-muted hover:text-danger p-1 transition-colors"
                            title="Remove row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddItem}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Row</span>
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Notes & Financial Totals Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notes Card */}
          <Card>
            <CardHeader className="border-b border-border py-3 px-5">
              <span className="font-semibold text-sm text-text">Notes / Terms</span>
            </CardHeader>
            <CardBody className="p-5">
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add quotation remarks, delivery terms, payment terms, etc..."
                className="w-full text-xs rounded-lg border border-border p-3 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none bg-surface"
              />
              <p className="text-[11px] text-muted mt-2">
                Note: This estimate does not deduct inventory stock or create ledger entries until converted to a sale.
              </p>
            </CardBody>
          </Card>

          {/* Totals Summary Card */}
          <Card>
            <CardHeader className="border-b border-border py-3 px-5">
              <span className="font-semibold text-sm text-text">Tax &amp; Total Summary</span>
            </CardHeader>
            <CardBody className="p-5 space-y-3">
              <div className="flex justify-between text-xs text-text">
                <span className="text-muted">Subtotal (Taxable Value):</span>
                <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
              </div>

              {isInterState ? (
                <div className="flex justify-between text-xs text-text">
                  <span className="text-muted">Integrated GST (IGST):</span>
                  <span className="font-medium tabular-nums">{formatCurrency(igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs text-text">
                    <span className="text-muted">Central GST (CGST):</span>
                    <span className="font-medium tabular-nums">{formatCurrency(cgst)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-text">
                    <span className="text-muted">State GST (SGST):</span>
                    <span className="font-medium tabular-nums">{formatCurrency(sgst)}</span>
                  </div>
                </>
              )}

              <div className="pt-2 border-t border-border flex justify-between items-baseline">
                <span className="text-sm font-bold text-text">Estimated Total:</span>
                <span className="text-lg font-bold text-primary tabular-nums">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/quotations')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={!canSave || saveQuotationMutation.isPending}
                  loading={saveQuotationMutation.isPending}
                  className="gap-2 shadow-sm"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>
                    {isEditMode ? 'Update Quotation' : 'Save Quotation'}
                  </span>
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </form>

      {/* Customer Modal */}
      {isCustomerModalOpen && (
        <CustomerModal
          isOpen={isCustomerModalOpen}
          initialName={customerModalInitialName}
          onClose={() => setIsCustomerModalOpen(false)}
          onCustomerCreated={(newCustomer) => {
            setIsCustomerModalOpen(false);
            setCustomerId(newCustomer._id);
            setCustomerSearch(newCustomer.name);
          }}
          onSuccess={(newCustomer) => {
            setIsCustomerModalOpen(false);
            setCustomerId(newCustomer._id);
            setCustomerSearch(newCustomer.name);
          }}
        />
      )}

      {/* Product Modal */}
      {isProductModalOpen && (
        <ProductModal
          isOpen={isProductModalOpen}
          initialName={productModalInitialName}
          errorMessage={productModalError}
          onClose={() => {
            setIsProductModalOpen(false);
            setPendingProductRowId(null);
            setProductModalError('');
          }}
          onSubmit={(formData) => createProductMutation.mutate(formData)}
          loading={createProductMutation.isPending}
        />
      )}

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

