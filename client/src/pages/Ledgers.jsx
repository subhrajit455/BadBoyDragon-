import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Search,
  CreditCard,
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  ArrowLeft,
  Printer,
  Download,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate } from '../utils/format';
import useDebounce from '../hooks/useDebounce';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import Toast from '../components/ui/Toast';
import Pagination from '../components/ui/Pagination';
import CustomerModal from '../components/customers/CustomerModal';
import {
  TableWrapper,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from '../components/ui/Table';

export default function Ledgers() {
  const queryClient = useQueryClient();

  // Active Tab: 'suppliers' | 'customers'
  const [activeTab, setActiveTab] = useState('suppliers');
  // Mobile view: 'list' (shows party cards) | 'statement' (shows statement with back button)
  const [mobileView, setMobileView] = useState('list');

  // Supplier Search, Selection & Pagination
  const [supplierSearch, setSupplierSearch] = useState('');
  const debouncedSupplierSearch = useDebounce(supplierSearch, 300);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [supplierPage, setSupplierPage] = useState(1);

  // Customer Search, Selection & Pagination
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedCustomerSearch = useDebounce(customerSearch, 300);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerPage, setCustomerPage] = useState(1);

  // Supplier Payment Modal State
  const [isSupplierPaymentModalOpen, setIsSupplierPaymentModalOpen] = useState(false);
  const [supplierPaymentAmount, setSupplierPaymentAmount] = useState('');
  const [supplierPaymentMode, setSupplierPaymentMode] = useState('Cash');
  const [supplierPaymentDate, setSupplierPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [supplierPaymentNote, setSupplierPaymentNote] = useState('');
  const [supplierPaymentError, setSupplierPaymentError] = useState('');

  // Customer Payment (Receive Payment) Modal State
  const [isCustomerPaymentModalOpen, setIsCustomerPaymentModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [customerPaymentAmount, setCustomerPaymentAmount] = useState('');
  const [customerPaymentMode, setCustomerPaymentMode] = useState('Cash');
  const [customerPaymentDate, setCustomerPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customerPaymentNote, setCustomerPaymentNote] = useState('');
  const [customerPaymentError, setCustomerPaymentError] = useState('');

  const [toastMessage, setToastMessage] = useState(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Business settings for print & PDF header
  const { data: settingsResponse } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data?.data;
    },
  });

  const settings = settingsResponse || {
    businessName: 'Sibham Enterprises',
    gstin: '19DSCPK9203C1ZX',
    address: 'Government Contractor & General Supplier',
    phone: '',
    state: 'West Bengal',
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async ({
    partyType,
    party,
    entries,
    closingBalance,
  }) => {
    if (!party) return;
    setDownloadingPDF(true);

    try {
      let allEntries = entries;
      try {
        const endpoint =
          partyType === 'supplier'
            ? `/suppliers/${party._id}/ledger`
            : `/customers/${party._id}/ledger`;
        const res = await api.get(endpoint, { params: { limit: 1000 } });
        const fetched = res.data?.data?.entries || res.data?.entries;
        if (Array.isArray(fetched) && fetched.length > 0) {
          allEntries = fetched;
        }
      } catch {
        // Fallback to loaded entries
      }

      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const primaryColor = [194, 65, 12]; // #C2410C
      const darkColor = [15, 23, 42];     // #0F172A
      const mutedColor = [100, 116, 139]; // #64748B

      // 1. Business Header (Left)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(...darkColor);
      doc.text(settings.businessName || 'Sibham Enterprises', 14, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...mutedColor);
      let y = 23;
      if (settings.address) {
        doc.text(settings.address, 14, y);
        y += 4;
      }
      const contactInfo = [
        settings.phone ? `Phone: ${settings.phone}` : '',
        settings.gstin ? `GSTIN: ${settings.gstin}` : '',
        settings.state ? `State: ${settings.state}` : '',
      ]
        .filter(Boolean)
        .join('  |  ');
      if (contactInfo) {
        doc.text(contactInfo, 14, y);
        y += 5;
      }

      // 2. Statement Title (Right Header)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...primaryColor);
      const titleText =
        partyType === 'supplier'
          ? 'SUPPLIER LEDGER STATEMENT'
          : 'CUSTOMER LEDGER STATEMENT';
      doc.text(titleText, 196, 18, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...mutedColor);
      doc.text(`Generated: ${formatDate(new Date())}`, 196, 24, { align: 'right' });

      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, Math.max(y + 2, 30), 196, Math.max(y + 2, 30));

      // 3. Party & Balance Info Box
      const boxY = Math.max(y + 6, 34);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...darkColor);
      doc.text(
        partyType === 'supplier' ? 'Supplier Details:' : 'Customer Details:',
        14,
        boxY
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(party.name || 'Account Statement', 14, boxY + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...mutedColor);
      let partyMetaY = boxY + 10;
      const metaParts = [
        party.phone ? `Phone: ${party.phone}` : '',
        party.gstin ? `GSTIN: ${party.gstin}` : '',
        party.state ? `State: ${party.state}` : '',
      ]
        .filter(Boolean)
        .join('  |  ');
      if (metaParts) {
        doc.text(metaParts, 14, partyMetaY);
        partyMetaY += 4;
      }
      if (party.address) {
        doc.text(party.address, 14, partyMetaY);
        partyMetaY += 4;
      }

      // Current Closing Balance Summary Box (Right side of party box)
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(126, boxY - 1, 70, 19, 2, 2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...mutedColor);
      doc.text('Current Closing Balance', 130, boxY + 4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      if (closingBalance > 0) {
        doc.setTextColor(185, 28, 28); // danger
      } else if (closingBalance < 0) {
        doc.setTextColor(21, 128, 61); // success
      } else {
        doc.setTextColor(...mutedColor);
      }
      doc.text(`Rs. ${Number(Math.abs(closingBalance)).toFixed(2)}`, 130, boxY + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...mutedColor);
      const balanceSubtext =
        partyType === 'supplier'
          ? closingBalance > 0
            ? '(Amount We Owe Supplier)'
            : closingBalance < 0
            ? '(Advance Balance)'
            : '(Settled)'
          : closingBalance > 0
          ? '(Amount Customer Owes Us)'
          : closingBalance < 0
          ? '(Advance Deposit)'
          : '(Settled)';
      doc.text(balanceSubtext, 130, boxY + 14.5);

      // 4. Ledger Entries Table
      const tableStartY = Math.max(partyMetaY + 4, boxY + 22);

      const isSupplier = partyType === 'supplier';
      const headColumns = isSupplier
        ? ['#', 'Date', 'Description / Ref', 'Ref Type', 'Debit (-)', 'Credit (+)', 'Balance']
        : ['#', 'Date', 'Description / Ref', 'Ref Type', 'Debit (+)', 'Credit (-)', 'Balance'];

      const tableRows = allEntries.map((e, idx) => {
        const isDebit = e.type === 'debit';
        const isCredit = e.type === 'credit';
        const debitStr = isDebit ? `Rs. ${Number(e.amount).toFixed(2)}` : '—';
        const creditStr = isCredit ? `Rs. ${Number(e.amount).toFixed(2)}` : '—';
        const balStr = `Rs. ${Number(Math.abs(e.balanceAfter)).toFixed(2)}`;

        return [
          idx + 1,
          formatDate(e.date),
          e.narration || e.refType || '-',
          (e.refType || '').toUpperCase(),
          debitStr,
          creditStr,
          balStr,
        ];
      });

      autoTable(doc, {
        startY: tableStartY,
        head: [headColumns],
        body: tableRows,
        theme: 'striped',
        headStyles: {
          fillColor: darkColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left',
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 22 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 24, fontSize: 7 },
          4: { cellWidth: 26, halign: 'right' },
          5: { cellWidth: 26, halign: 'right' },
          6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          textColor: darkColor,
        },
        margin: { left: 14, right: 14 },
      });

      const safeName = (party.name || 'Party').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeDate = new Date().toISOString().split('T')[0];
      doc.save(`${safeName}-${partyType}-Ledger-${safeDate}.pdf`);
    } catch (err) {
      console.error('Ledger PDF export error:', err);
      window.print();
    } finally {
      setDownloadingPDF(false);
    }
  };

  // -------------------------------------------------------------
  // 1. SUPPLIERS DATA
  // -------------------------------------------------------------
  const {
    data: suppliersResponse,
    isLoading: suppliersLoading,
    isError: suppliersError,
  } = useQuery({
    queryKey: ['suppliers', debouncedSupplierSearch],
    queryFn: async () => {
      const res = await api.get('/suppliers', {
        params: { search: debouncedSupplierSearch, limit: 100 },
      });
      return res.data?.data || [];
    },
  });

  const suppliers = suppliersResponse || [];
  const activeSupplier =
    suppliers.find((s) => s._id === selectedSupplierId) || suppliers[0] || null;
  const currentSupplierId = activeSupplier?._id;

  const {
    data: supplierLedgerData,
    isLoading: supplierLedgerLoading,
    isError: supplierLedgerError,
  } = useQuery({
    queryKey: ['supplier-ledger', currentSupplierId, supplierPage],
    queryFn: async () => {
      if (!currentSupplierId) return null;
      const res = await api.get(`/suppliers/${currentSupplierId}/ledger`, {
        params: { page: supplierPage, limit: 30 },
      });
      return res.data;
    },
    enabled: !!currentSupplierId && activeTab === 'suppliers',
  });

  const recordSupplierPaymentMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(`/suppliers/${currentSupplierId}/payments`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger', currentSupplierId] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });

      setIsSupplierPaymentModalOpen(false);
      setSupplierPaymentAmount('');
      setSupplierPaymentNote('');
      setSupplierPaymentError('');

      if (data?.warning) {
        setToastMessage({
          type: 'warning',
          message: data.warningMessage || 'Payment recorded with advance balance.',
        });
      } else {
        setToastMessage({
          type: 'success',
          message: `Payment of ${formatCurrency(data?.entry?.amount || 0)} recorded successfully.`,
        });
      }
    },
    onError: (err) => {
      setSupplierPaymentError(
        err.response?.data?.message || err.message || 'Failed to record payment'
      );
    },
  });

  const handleSupplierPaymentSubmit = (e) => {
    e.preventDefault();
    const amountNum = parseFloat(supplierPaymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setSupplierPaymentError('Please enter a valid positive payment amount');
      return;
    }
    setSupplierPaymentError('');
    recordSupplierPaymentMutation.mutate({
      amount: amountNum,
      paymentMode: supplierPaymentMode,
      date: supplierPaymentDate,
      note: supplierPaymentNote.trim(),
    });
  };

  // -------------------------------------------------------------
  // 2. CUSTOMERS DATA
  // -------------------------------------------------------------
  const {
    data: customersResponse,
    isLoading: customersLoading,
    isError: customersError,
  } = useQuery({
    queryKey: ['customers', debouncedCustomerSearch],
    queryFn: async () => {
      const res = await api.get('/customers', {
        params: { search: debouncedCustomerSearch, limit: 100 },
      });
      return res.data?.data || [];
    },
  });

  const customers = customersResponse || [];
  const activeCustomer =
    customers.find((c) => c._id === selectedCustomerId) || customers[0] || null;
  const currentCustomerId = activeCustomer?._id;

  const {
    data: customerLedgerData,
    isLoading: customerLedgerLoading,
    isError: customerLedgerError,
  } = useQuery({
    queryKey: ['customer-ledger', currentCustomerId, customerPage],
    queryFn: async () => {
      if (!currentCustomerId) return null;
      const res = await api.get(`/customers/${currentCustomerId}/ledger`, {
        params: { page: customerPage, limit: 30 },
      });
      return res.data;
    },
    enabled: !!currentCustomerId && activeTab === 'customers',
  });

  const recordCustomerPaymentMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(`/customers/${currentCustomerId}/payments`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-ledger', currentCustomerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });

      setIsCustomerPaymentModalOpen(false);
      setCustomerPaymentAmount('');
      setCustomerPaymentNote('');
      setCustomerPaymentError('');

      setToastMessage({
        type: 'success',
        message: `Payment of ${formatCurrency(data?.data?.entry?.amount || customerPaymentAmount)} received successfully.`,
      });
    },
    onError: (err) => {
      setCustomerPaymentError(
        err.response?.data?.message || err.message || 'Failed to record received payment'
      );
    },
  });

  const handleCustomerPaymentSubmit = (e) => {
    e.preventDefault();
    const amountNum = parseFloat(customerPaymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setCustomerPaymentError('Please enter a valid positive payment amount');
      return;
    }
    setCustomerPaymentError('');
    recordCustomerPaymentMutation.mutate({
      amount: amountNum,
      paymentMode: customerPaymentMode,
      date: customerPaymentDate,
      note: customerPaymentNote.trim(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.message}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <div className="print:hidden">
        <PageHeader
          title="Ledgers &amp; Statements"
          description="Track supplier payables and customer receivables with chronological running balance statements."
        />
      </div>

      {/* Tab navigation: Suppliers | Customers */}
      <div className="flex border-b border-border print:hidden">
        <button
          type="button"
          onClick={() => {
            setActiveTab('suppliers');
            setMobileView('list');
          }}
          className={`border-b-2 px-6 py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${
            activeTab === 'suppliers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-text'
          }`}
        >
          Suppliers
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('customers');
            setMobileView('list');
          }}
          className={`border-b-2 px-6 py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${
            activeTab === 'customers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-text'
          }`}
        >
          Customers
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: SUPPLIERS LEDGER */}
      {/* ============================================================== */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 print:block">
          {/* Left Column: Suppliers Directory */}
          <div className={`lg:col-span-4 space-y-4 print:hidden ${mobileView === 'statement' ? 'hidden lg:block' : 'block'}`}>
            <Card className="shadow-xs">
              <CardHeader className="py-3 px-4">
                <div className="relative">
                  <Input
                    placeholder="Search supplier..."
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    wrapperClassName="space-y-0"
                    className="pl-8 text-xs py-2"
                  />
                  <Search className="absolute left-2.5 top-3.5 h-3.5 w-3.5 text-muted pointer-events-none" />
                </div>
              </CardHeader>
              <CardBody className="p-0 max-h-[600px] overflow-y-auto divide-y divide-border">
                {suppliersLoading ? (
                  <div className="p-8 text-center">
                    <Spinner size="md" />
                  </div>
                ) : suppliersError ? (
                  <div className="p-4 text-xs text-danger text-center">
                    Failed to load suppliers
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted">
                    No suppliers found
                  </div>
                ) : (
                  suppliers.map((sup) => {
                    const isSelected = activeSupplier?._id === sup._id;
                    const balance = Number(sup.currentBalance) || 0;
                    const owesUs = balance < 0;
                    const weOwe = balance > 0;

                    return (
                      <button
                        key={sup._id}
                        type="button"
                        onClick={() => {
                          setSelectedSupplierId(sup._id);
                          setSupplierPage(1);
                          setMobileView('statement');
                        }}
                        className={`w-full text-left p-3.5 transition-colors flex items-center justify-between min-h-[52px] ${
                          isSelected
                            ? 'bg-amber-500/10 border-l-4 border-amber-500'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-sm font-semibold text-text truncate">
                            {sup.name}
                          </p>
                          <p className="text-xs text-muted truncate">
                            {sup.phone || sup.gstin || 'No contact'}
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p
                            className={`text-xs font-bold tabular-nums ${
                              weOwe
                                ? 'text-danger'
                                : owesUs
                                ? 'text-success'
                                : 'text-muted'
                            }`}
                          >
                            {formatCurrency(Math.abs(balance))}
                          </p>
                          <span className="text-[10px] text-muted uppercase">
                            {weOwe ? 'Payable' : owesUs ? 'Advance' : 'Settled'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </CardBody>
            </Card>
          </div>

          {/* Right Column: Supplier Statement */}
          <div className={`lg:col-span-8 print:!block print:w-full space-y-4 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
            {/* Mobile Back Button to list */}
            <div className="lg:hidden pb-1 print:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileView('list')}
                className="gap-2 text-muted hover:text-text min-h-[44px]"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Suppliers</span>
              </Button>
            </div>

            {!activeSupplier ? (
              <Card>
                <CardBody className="p-12 text-center text-sm text-muted">
                  Select a supplier to view their running ledger statement.
                </CardBody>
              </Card>
            ) : (
              <Card className="shadow-xs print:border-none print:shadow-none">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-text">
                      {activeSupplier.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted mt-1">
                      {activeSupplier.phone && <span>Phone: {activeSupplier.phone}</span>}
                      {activeSupplier.gstin && <span>GSTIN: {activeSupplier.gstin}</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-muted block">Current Balance</span>
                      <span
                        className={`text-base font-bold tabular-nums ${
                          Number(activeSupplier.currentBalance) > 0
                            ? 'text-danger'
                            : 'text-success'
                        }`}
                      >
                        {formatCurrency(Math.abs(activeSupplier.currentBalance))}
                      </span>
                      <span className="text-[10px] text-muted block -mt-0.5">
                        {Number(activeSupplier.currentBalance) > 0
                          ? '(We owe supplier)'
                          : Number(activeSupplier.currentBalance) < 0
                          ? '(Advance balance)'
                          : '(Settled)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 print:hidden">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handlePrint}
                        className="gap-1.5 min-h-[44px]"
                        title="Print statement"
                      >
                        <Printer className="h-4 w-4" />
                        <span className="hidden sm:inline">Print</span>
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={downloadingPDF}
                        disabled={downloadingPDF}
                        onClick={() =>
                          handleDownloadPDF({
                            partyType: 'supplier',
                            party: activeSupplier,
                            entries:
                              supplierLedgerData?.data?.entries ||
                              supplierLedgerData?.entries ||
                              [],
                            closingBalance: Number(activeSupplier.currentBalance || 0),
                          })
                        }
                        className="gap-1.5 min-h-[44px]"
                        title="Download statement PDF"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Download</span>
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSupplierPaymentAmount('');
                          setSupplierPaymentNote('');
                          setSupplierPaymentError('');
                          setIsSupplierPaymentModalOpen(true);
                        }}
                        className="gap-1.5 min-h-[44px]"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Record Payment</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardBody className="p-3 sm:p-0">
                  {/* Printable Statement Header (visible during window.print) */}
                  <div className="hidden print:!block p-4 border-b border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <h1 className="text-xl font-bold text-text">
                          {settings.businessName || 'Sibham Enterprises'}
                        </h1>
                        <p className="text-xs text-muted">
                          {settings.address || 'Government Contractor & General Supplier'}
                        </p>
                        {settings.gstin && (
                          <p className="text-xs text-muted">GSTIN: {settings.gstin}</p>
                        )}
                        {settings.phone && (
                          <p className="text-xs text-muted">Phone: {settings.phone}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <h2 className="text-base font-bold text-text uppercase tracking-wide">
                          Supplier Ledger Statement
                        </h2>
                        <p className="text-xs text-muted">
                          Statement Date: {formatDate(new Date())}
                        </p>
                      </div>
                    </div>
                  </div>
                  {supplierLedgerLoading ? (
                    <div className="flex h-64 items-center justify-center">
                      <Spinner size="md" />
                    </div>
                  ) : supplierLedgerError ? (
                    <div className="p-8 text-center text-sm text-danger">
                      Failed to load supplier ledger entries.
                    </div>
                  ) : !supplierLedgerData?.data?.entries?.length && !supplierLedgerData?.entries?.length ? (
                    <div className="p-12 text-center text-sm text-muted">
                      No ledger transactions found for this supplier.
                    </div>
                  ) : (
                    <>
                      {/* Mobile Statement Cards (< md) */}
                      <div className="block md:hidden space-y-2.5 print:hidden">
                        {(supplierLedgerData.data?.entries || supplierLedgerData.entries || []).map((entry) => {
                          const isDebit = entry.type === 'debit';
                          const isCredit = entry.type === 'credit';
                          return (
                            <div
                              key={entry._id}
                              className="p-3 rounded-lg border border-border bg-slate-50/50 space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted font-medium">{formatDate(entry.date)}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700 uppercase">
                                  {entry.refType}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-text">{entry.narration || entry.refType}</p>
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 tabular-nums">
                                <div>
                                  {isDebit && (
                                    <span className="text-slate-800 font-medium">Debit (-): {formatCurrency(entry.amount)}</span>
                                  )}
                                  {isCredit && (
                                    <span className="text-primary font-medium">Credit (+): {formatCurrency(entry.amount)}</span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="text-muted text-[11px] mr-1">Bal:</span>
                                  <span
                                    className={`font-bold ${
                                      entry.balanceAfter > 0
                                        ? 'text-danger'
                                        : entry.balanceAfter < 0
                                        ? 'text-success'
                                        : 'text-muted'
                                    }`}
                                  >
                                    {formatCurrency(Math.abs(entry.balanceAfter))}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop Statement Table (>= md) */}
                      <div className="hidden md:block overflow-x-auto print:!block print:overflow-visible">
                        <table className="w-full text-left text-sm text-text border-collapse print:text-xs">
                          <thead className="border-b border-border bg-slate-50 text-xs font-semibold text-muted uppercase">
                            <tr>
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Description / Ref</th>
                              <th className="px-4 py-3 text-right">Debit (-)</th>
                              <th className="px-4 py-3 text-right">Credit (+)</th>
                              <th className="px-4 py-3 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {(supplierLedgerData.data?.entries || supplierLedgerData.entries || []).map((entry) => {
                              const isDebit = entry.type === 'debit';
                              const isCredit = entry.type === 'credit';

                              return (
                                <tr key={entry._id} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                                    {formatDate(entry.date)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="text-sm font-medium text-text">
                                      {entry.narration || entry.refType}
                                    </p>
                                    <span className="text-[10px] text-muted uppercase">
                                      {entry.refType}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-800">
                                    {isDebit ? formatCurrency(entry.amount) : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium tabular-nums text-primary">
                                    {isCredit ? formatCurrency(entry.amount) : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold tabular-nums">
                                    <span
                                      className={
                                        entry.balanceAfter > 0
                                          ? 'text-danger'
                                          : entry.balanceAfter < 0
                                          ? 'text-success'
                                          : 'text-muted'
                                      }
                                    >
                                      {formatCurrency(Math.abs(entry.balanceAfter))}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination for statement */}
                      {supplierLedgerData.pagination && (
                        <div className="p-3 sm:p-4 print:hidden">
                          <Pagination
                            currentPage={supplierLedgerData.pagination.page || supplierPage}
                            totalPages={supplierLedgerData.pagination.totalPages || 1}
                            total={supplierLedgerData.pagination.total || 0}
                            limit={supplierLedgerData.pagination.limit || 30}
                            onPageChange={(p) => setSupplierPage(p)}
                          />
                        </div>
                      )}
                    </>
                  )}
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: CUSTOMERS LEDGER */}
      {/* ============================================================== */}
      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 print:block">
          {/* Left Column: Customers Directory */}
          <div className={`lg:col-span-4 space-y-4 print:hidden ${mobileView === 'statement' ? 'hidden lg:block' : 'block'}`}>
            <Card className="shadow-xs">
              <CardHeader className="py-3 px-4 flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search customer..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    wrapperClassName="space-y-0"
                    className="pl-8 text-xs py-2"
                  />
                  <Search className="absolute left-2.5 top-3.5 h-3.5 w-3.5 text-muted pointer-events-none" />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddCustomerModalOpen(true)}
                  className="gap-1 px-3 py-2 text-xs flex-shrink-0 min-h-[44px]"
                  title="Add Customer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Customer</span>
                </Button>
              </CardHeader>
              <CardBody className="p-0 max-h-[600px] overflow-y-auto divide-y divide-border">
                {customersLoading ? (
                  <div className="p-8 text-center">
                    <Spinner size="md" />
                  </div>
                ) : customersError ? (
                  <div className="p-4 text-xs text-danger text-center">
                    Failed to load customers
                  </div>
                ) : customers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted space-y-3">
                    <p>No customers found</p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsAddCustomerModalOpen(true)}
                      className="gap-1 mx-auto min-h-[44px]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add First Customer</span>
                    </Button>
                  </div>
                ) : (
                  customers.map((cust) => {
                    const isSelected = activeCustomer?._id === cust._id;
                    const balance = Number(cust.currentBalance) || 0;
                    // For customer: balance > 0 means they owe us (RED)
                    const customerOwesUs = balance > 0;
                    const customerAdvance = balance < 0;

                    return (
                      <button
                        key={cust._id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(cust._id);
                          setCustomerPage(1);
                          setMobileView('statement');
                        }}
                        className={`w-full text-left p-3.5 transition-colors flex items-center justify-between min-h-[52px] ${
                          isSelected
                            ? 'bg-amber-500/10 border-l-4 border-amber-500'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-sm font-semibold text-text truncate">
                            {cust.name}
                          </p>
                          <p className="text-xs text-muted truncate">
                            {cust.phone || cust.gstin || cust.state || 'No contact'}
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p
                            className={`text-xs font-bold tabular-nums ${
                              customerOwesUs
                                ? 'text-danger'
                                : customerAdvance
                                ? 'text-success'
                                : 'text-muted'
                            }`}
                          >
                            {formatCurrency(Math.abs(balance))}
                          </p>
                          <span className="text-[10px] text-muted uppercase">
                            {customerOwesUs
                              ? 'Receivable'
                              : customerAdvance
                              ? 'Advance'
                              : 'Settled'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </CardBody>
            </Card>
          </div>

          {/* Right Column: Customer Statement */}
          <div className={`lg:col-span-8 print:!block print:w-full space-y-4 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
            {/* Mobile Back Button to list */}
            <div className="lg:hidden pb-1 print:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileView('list')}
                className="gap-2 text-muted hover:text-text min-h-[44px]"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Customers</span>
              </Button>
            </div>

            {!activeCustomer ? (
              <Card>
                <CardBody className="p-12 text-center text-sm text-muted">
                  Select a customer to view their running ledger statement.
                </CardBody>
              </Card>
            ) : (
              <Card className="shadow-xs print:border-none print:shadow-none">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-text">
                      {activeCustomer.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted mt-1">
                      {activeCustomer.phone && <span>Phone: {activeCustomer.phone}</span>}
                      {activeCustomer.gstin && <span>GSTIN: {activeCustomer.gstin}</span>}
                      {activeCustomer.state && <span>State: {activeCustomer.state}</span>}
                    </div>
                  </div>

                  {(() => {
                    const displayedBal =
                      customerLedgerData?.data?.customer?.currentBalance !== undefined
                        ? customerLedgerData.data.customer.currentBalance
                        : customerLedgerData?.customer?.currentBalance !== undefined
                        ? customerLedgerData.customer.currentBalance
                        : (activeCustomer.currentBalance || 0);

                    return (
                      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                        <div className="text-left sm:text-right">
                          <span className="text-xs text-muted block">Current Balance</span>
                          <span
                            className={`text-base font-bold tabular-nums ${
                              Number(displayedBal) > 0
                                ? 'text-danger'
                                : Number(displayedBal) < 0
                                ? 'text-success'
                                : 'text-muted'
                            }`}
                          >
                            {formatCurrency(Math.abs(displayedBal))}
                          </span>
                          <span className="text-[10px] text-muted block -mt-0.5">
                            {Number(displayedBal) > 0
                              ? '(Customer owes us)'
                              : Number(displayedBal) < 0
                              ? '(Customer advance)'
                              : '(Settled)'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 print:hidden">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handlePrint}
                            className="gap-1.5 min-h-[44px]"
                            title="Print statement"
                          >
                            <Printer className="h-4 w-4" />
                            <span className="hidden sm:inline">Print</span>
                          </Button>

                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            loading={downloadingPDF}
                            disabled={downloadingPDF}
                            onClick={() =>
                              handleDownloadPDF({
                                partyType: 'customer',
                                party: activeCustomer,
                                entries:
                                  customerLedgerData?.data?.entries ||
                                  customerLedgerData?.entries ||
                                  [],
                                closingBalance: Number(displayedBal || 0),
                              })
                            }
                            className="gap-1.5 min-h-[44px]"
                            title="Download statement PDF"
                          >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Download</span>
                          </Button>

                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setCustomerPaymentAmount('');
                              setCustomerPaymentNote('');
                              setCustomerPaymentError('');
                              setIsCustomerPaymentModalOpen(true);
                            }}
                            className="gap-1.5 min-h-[44px]"
                          >
                            <CreditCard className="h-4 w-4" />
                            <span>Receive Payment</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </CardHeader>

                <CardBody className="p-3 sm:p-0">
                  {/* Printable Statement Header (visible during window.print) */}
                  <div className="hidden print:!block p-4 border-b border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <h1 className="text-xl font-bold text-text">
                          {settings.businessName || 'Sibham Enterprises'}
                        </h1>
                        <p className="text-xs text-muted">
                          {settings.address || 'Government Contractor & General Supplier'}
                        </p>
                        {settings.gstin && (
                          <p className="text-xs text-muted">GSTIN: {settings.gstin}</p>
                        )}
                        {settings.phone && (
                          <p className="text-xs text-muted">Phone: {settings.phone}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <h2 className="text-base font-bold text-text uppercase tracking-wide">
                          Customer Ledger Statement
                        </h2>
                        <p className="text-xs text-muted">
                          Statement Date: {formatDate(new Date())}
                        </p>
                      </div>
                    </div>
                  </div>
                  {customerLedgerLoading ? (
                    <div className="flex h-64 items-center justify-center">
                      <Spinner size="md" />
                    </div>
                  ) : customerLedgerError ? (
                    <div className="p-8 text-center text-sm text-danger">
                      Failed to load customer ledger entries.
                    </div>
                  ) : !customerLedgerData?.data?.entries?.length && !customerLedgerData?.entries?.length ? (
                    <div className="p-12 text-center text-sm text-muted">
                      No ledger transactions found for this customer.
                    </div>
                  ) : (
                    <>
                      {/* Mobile Statement Cards (< md) */}
                      <div className="block md:hidden space-y-2.5 print:hidden">
                        {(customerLedgerData.data?.entries || customerLedgerData.entries || []).map((entry) => {
                          const isDebit = entry.type === 'debit';
                          const isCredit = entry.type === 'credit';
                          return (
                            <div
                              key={entry._id}
                              className="p-3 rounded-lg border border-border bg-slate-50/50 space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted font-medium">{formatDate(entry.date)}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700 uppercase">
                                  {entry.refType}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-text">{entry.narration || entry.refType}</p>
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 tabular-nums">
                                <div>
                                  {isDebit && (
                                    <span className="text-danger font-medium">Debit (+): {formatCurrency(entry.amount)}</span>
                                  )}
                                  {isCredit && (
                                    <span className="text-success font-medium">Credit (-): {formatCurrency(entry.amount)}</span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="text-muted text-[11px] mr-1">Bal:</span>
                                  <span
                                    className={`font-bold ${
                                      entry.balanceAfter > 0
                                        ? 'text-danger'
                                        : entry.balanceAfter < 0
                                        ? 'text-success'
                                        : 'text-muted'
                                    }`}
                                  >
                                    {formatCurrency(Math.abs(entry.balanceAfter))}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop Statement Table (>= md) */}
                      <div className="hidden md:block overflow-x-auto print:!block print:overflow-visible">
                        <table className="w-full text-left text-sm text-text border-collapse print:text-xs">
                          <thead className="border-b border-border bg-slate-50 text-xs font-semibold text-muted uppercase">
                            <tr>
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Description / Narration</th>
                              <th className="px-4 py-3 text-right">Debit (+)</th>
                              <th className="px-4 py-3 text-right">Credit (-)</th>
                              <th className="px-4 py-3 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {(customerLedgerData.data?.entries || customerLedgerData.entries || []).map((entry) => {
                              const isDebit = entry.type === 'debit';
                              const isCredit = entry.type === 'credit';

                              return (
                                <tr key={entry._id} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                                    {formatDate(entry.date)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <p className="text-sm font-medium text-text">
                                      {entry.narration || entry.refType}
                                    </p>
                                    <span className="text-[10px] text-muted uppercase">
                                      {entry.refType}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium tabular-nums text-danger">
                                    {isDebit ? formatCurrency(entry.amount) : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium tabular-nums text-success">
                                    {isCredit ? formatCurrency(entry.amount) : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold tabular-nums">
                                    <span
                                      className={
                                        entry.balanceAfter > 0
                                          ? 'text-danger'
                                          : entry.balanceAfter < 0
                                          ? 'text-success'
                                          : 'text-muted'
                                      }
                                    >
                                      {formatCurrency(Math.abs(entry.balanceAfter))}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination for customer statement */}
                      {customerLedgerData.pagination && (
                        <div className="p-3 sm:p-4 print:hidden">
                          <Pagination
                            currentPage={customerLedgerData.pagination.page || customerPage}
                            totalPages={customerLedgerData.pagination.totalPages || 1}
                            total={customerLedgerData.pagination.total || 0}
                            limit={customerLedgerData.pagination.limit || 30}
                            onPageChange={(p) => setCustomerPage(p)}
                          />
                        </div>
                      )}
                    </>
                  )}
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUPPLIER PAYMENT MODAL */}
      {/* ============================================================== */}
      <Modal
        isOpen={isSupplierPaymentModalOpen}
        onClose={() => setIsSupplierPaymentModalOpen(false)}
        title="Record Payment to Supplier"
        description={`Record outgoing payment to ${activeSupplier?.name || 'supplier'}.`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSupplierPaymentSubmit} className="space-y-4">
          {supplierPaymentError && (
            <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-2.5 text-xs text-danger">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{supplierPaymentError}</span>
            </div>
          )}

          <Input
            label="Payment Amount"
            type="number"
            step="any"
            min="0.01"
            placeholder="0.00"
            value={supplierPaymentAmount}
            onChange={(e) => setSupplierPaymentAmount(e.target.value)}
            required
          />

          <Select
            label="Payment Mode"
            value={supplierPaymentMode}
            onChange={(e) => setSupplierPaymentMode(e.target.value)}
            required
          >
            <option value="Cash">Cash</option>
            <option value="UPI">UPI / QR</option>
            <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
            <option value="Cheque">Cheque</option>
          </Select>

          <Input
            label="Payment Date"
            type="date"
            value={supplierPaymentDate}
            onChange={(e) => setSupplierPaymentDate(e.target.value)}
            required
          />

          <Input
            label="Note / Reference (Optional)"
            placeholder="e.g. UTR / Cheque No."
            value={supplierPaymentNote}
            onChange={(e) => setSupplierPaymentNote(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsSupplierPaymentModalOpen(false)}
              disabled={recordSupplierPaymentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={recordSupplierPaymentMutation.isPending}
            >
              Save Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* CUSTOMER PAYMENT (RECEIVE PAYMENT) MODAL */}
      {/* ============================================================== */}
      <Modal
        isOpen={isCustomerPaymentModalOpen}
        onClose={() => setIsCustomerPaymentModalOpen(false)}
        title="Receive Payment from Customer"
        description={`Record payment received from ${activeCustomer?.name || 'customer'}.`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCustomerPaymentSubmit} className="space-y-4">
          {customerPaymentError && (
            <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-2.5 text-xs text-danger">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{customerPaymentError}</span>
            </div>
          )}

          <Input
            label="Received Amount"
            type="number"
            step="any"
            min="0.01"
            placeholder="0.00"
            value={customerPaymentAmount}
            onChange={(e) => setCustomerPaymentAmount(e.target.value)}
            required
          />

          <Select
            label="Payment Mode"
            value={customerPaymentMode}
            onChange={(e) => setCustomerPaymentMode(e.target.value)}
            required
          >
            <option value="Cash">Cash</option>
            <option value="UPI">UPI / QR</option>
            <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
            <option value="Cheque">Cheque</option>
          </Select>

          <Input
            label="Receipt Date"
            type="date"
            value={customerPaymentDate}
            onChange={(e) => setCustomerPaymentDate(e.target.value)}
            required
          />

          <Input
            label="Note / Reference (Optional)"
            placeholder="e.g. Receipt No, Cash memo, UTR"
            value={customerPaymentNote}
            onChange={(e) => setCustomerPaymentNote(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCustomerPaymentModalOpen(false)}
              disabled={recordCustomerPaymentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={recordCustomerPaymentMutation.isPending}
            >
              Receive Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Customer Modal */}
      <CustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onCustomerCreated={(newCust) => {
          queryClient.invalidateQueries({ queryKey: ['customers'] });
          setSelectedCustomerId(newCust._id);
        }}
      />
    </div>
  );
}
