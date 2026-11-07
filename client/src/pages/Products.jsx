import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Filter,
  Package,
  Edit2,
  Archive,
  RotateCcw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '../lib/api';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import Toast from '../components/ui/Toast';
import {
  TableWrapper,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from '../components/ui/Table';
import ProductModal from '../components/products/ProductModal';

export default function Products() {
  const queryClient = useQueryClient();

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [serverError, setServerError] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Fetch Products with TanStack Query
  const {
    data: productsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products', searchTerm, selectedCategory, selectedStatus, currentPage],
    queryFn: async () => {
      const params = {
        page: currentPage,
        limit: 15,
        search: searchTerm,
        category: selectedCategory,
        status: selectedStatus,
      };
      const res = await api.get('/products', { params });
      return res.data;
    },
    keepPreviousData: true,
  });

  const products = productsResponse?.data || [];
  const categories = productsResponse?.categories || [];
  const pagination = productsResponse?.pagination || { total: 0, totalPages: 1 };

  // Create Product Mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/products', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsModalOpen(false);
      setEditingProduct(null);
      setToastMessage({ message: 'Product created successfully', type: 'success' });
    },
    onError: (err) => {
      setServerError(
        err.response?.data?.message || err.message || 'Failed to create product'
      );
    },
  });

  // Update Product Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put(`/products/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsModalOpen(false);
      setEditingProduct(null);
      setToastMessage({ message: 'Product updated successfully', type: 'success' });
    },
    onError: (err) => {
      setServerError(
        err.response?.data?.message || err.message || 'Failed to update product'
      );
    },
  });

  // Toggle Active/Archive Status Mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, currentStatus }) => {
      const res = await api.patch(`/products/${id}/status`, { isActive: !currentStatus });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setToastMessage({
        message: data?.message || 'Product status updated',
        type: 'info',
      });
    },
    onError: (err) => {
      setToastMessage({
        message: err.response?.data?.message || 'Failed to update status',
        type: 'danger',
      });
    },
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setServerError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setServerError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (payload) => {
    setServerError('');
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct._id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Stock Badge Logic
  const getStockBadge = (stock, minStock, baseUnit) => {
    const current = Number(stock) || 0;
    const min = Number(minStock) || 0;

    if (current <= 0) {
      return (
        <Badge variant="danger" size="sm">
          Out of Stock ({current} {baseUnit})
        </Badge>
      );
    }
    if (current <= min) {
      return (
        <Badge variant="warning" size="sm">
          Low Stock ({current} {baseUnit})
        </Badge>
      );
    }
    return (
      <Badge variant="success" size="sm">
        {current} {baseUnit}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.message}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Products &amp; Materials"
        description="Manage construction items, base inventory units, and multiple packaging ratios."
        actions={
          <Button variant="primary" onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </Button>
        }
      />

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 rounded border border-border bg-surface p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Search products by name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            wrapperClassName="space-y-0"
            className="pl-9"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted pointer-events-none" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-44">
            <Select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              wrapperClassName="space-y-0"
              placeholder=""
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-36">
            <Select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              wrapperClassName="space-y-0"
              placeholder=""
            >
              <option value="active">Active Only</option>
              <option value="archived">Archived</option>
              <option value="all">All Status</option>
            </Select>
          </div>
        </div>
      </div>

      {/* List States: Loading, Error, Empty, Data */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded border border-border bg-surface p-16 shadow-sm">
          <Spinner size="lg" className="text-primary mb-3" />
          <p className="text-sm font-medium text-muted">Loading product catalog...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center rounded border border-red-200 bg-red-50 p-12 text-center shadow-sm">
          <AlertTriangle className="h-8 w-8 text-danger mb-2" />
          <h3 className="text-base font-semibold text-danger">Failed to load products</h3>
          <p className="mt-1 text-sm text-slate-600">
            {error?.response?.data?.message || error?.message || 'An unexpected error occurred'}
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-4">
            Try Again
          </Button>
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={searchTerm || selectedCategory !== 'all' ? 'No matching products' : 'No products added yet'}
          description={
            searchTerm || selectedCategory !== 'all'
              ? 'Try modifying your search or filter criteria.'
              : 'Start by adding cement, sand, steel, or other construction inventory items.'
          }
          actionLabel={searchTerm || selectedCategory !== 'all' ? undefined : 'Add First Product'}
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="space-y-4">
          <TableWrapper>
            <TableHead>
              <tr>
                <TableHeader>Product Name</TableHeader>
                <TableHeader>Category</TableHeader>
                <TableHeader>HSN</TableHeader>
                <TableHeader align="right">GST %</TableHeader>
                <TableHeader>Base Unit</TableHeader>
                <TableHeader>Other Units</TableHeader>
                <TableHeader>Stock Status</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader align="right">Actions</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {products.map((product) => {
                const secondaryUnits = (product.units || []).filter(
                  (u) => u.name.toLowerCase() !== product.baseUnit.toLowerCase()
                );

                return (
                  <TableRow key={product._id}>
                    <TableCell className="font-medium text-text">
                      <div>
                        <span>{product.name}</span>
                        {product.minStock > 0 && (
                          <span className="block text-[11px] text-muted">
                            Min: {product.minStock} {product.baseUnit}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-text">
                        {product.category}
                      </span>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted">
                      {product.hsn || '—'}
                    </TableCell>

                    <TableCell align="right" isNumeric>
                      {product.gstRate}%
                    </TableCell>

                    <TableCell className="font-medium text-text">
                      {product.baseUnit}
                    </TableCell>

                    <TableCell>
                      {secondaryUnits.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {secondaryUnits.map((u) => (
                            <span
                              key={u.name}
                              className="text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono"
                              title={`1 ${u.name} = ${u.factor} ${product.baseUnit}`}
                            >
                              1 {u.name} = {u.factor} {product.baseUnit}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted italic">None</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {getStockBadge(product.currentStock, product.minStock, product.baseUnit)}
                    </TableCell>

                    <TableCell>
                      <Badge variant={product.isActive ? 'success' : 'default'} size="sm">
                        {product.isActive ? 'Active' : 'Archived'}
                      </Badge>
                    </TableCell>

                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(product)}
                          title="Edit Product"
                          className="p-1.5 text-muted hover:text-text"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            statusMutation.mutate({
                              id: product._id,
                              currentStatus: product.isActive,
                            })
                          }
                          title={product.isActive ? 'Archive Product' : 'Restore Product'}
                          className={`p-1.5 ${
                            product.isActive
                              ? 'text-muted hover:text-danger'
                              : 'text-muted hover:text-success'
                          }`}
                        >
                          {product.isActive ? (
                            <Archive className="h-4 w-4" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TableWrapper>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-2 pt-4">
              <span className="text-xs text-muted">
                Showing page <span className="font-semibold text-text">{pagination.page}</span> of{' '}
                <span className="font-semibold text-text">{pagination.totalPages}</span> ({pagination.total} products)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product Add / Edit Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        initialProduct={editingProduct}
        onSubmitProduct={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        serverError={serverError}
      />
    </div>
  );
}
