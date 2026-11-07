import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Scale,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ArrowRightLeft,
  Info,
} from 'lucide-react';
import api from '../../lib/api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatCurrency, formatNumber } from '../../utils/format';

export default function ManageUnitsModal({
  isOpen,
  onClose,
  product,
  onSuccess,
}) {
  const queryClient = useQueryClient();

  // Master units
  const { data: unitsData } = useQuery({
    queryKey: ['meta-units'],
    queryFn: async () => {
      const res = await api.get('/meta/units');
      return res.data?.units || [];
    },
    staleTime: Infinity,
  });

  const masterUnits = unitsData || [];

  // Working copy of units for this product
  // [{ name, factor, sellingPrice }]
  const [units, setUnits] = useState([]);
  const [newlyAddedUnit, setNewlyAddedUnit] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form for adding a new unit
  const [isCustomName, setIsCustomName] = useState(false);
  const [unitSelectName, setUnitSelectName] = useState('');
  const [customUnitName, setCustomUnitName] = useState('');
  // 'baseToNew': 1 [base] = N [new] (factor = 1 / N)
  // 'newToBase': 1 [new] = N [base] (factor = N)
  const [direction, setDirection] = useState('baseToNew');
  const [conversionN, setConversionN] = useState('');
  const [newSellingPrice, setNewSellingPrice] = useState('');

  const baseUnit = product?.baseUnit?.toLowerCase() || '';

  useEffect(() => {
    if (product && product.units) {
      setUnits(
        product.units.map((u) => ({
          name: u.name,
          factor: Number(u.factor),
          sellingPrice: Number(u.sellingPrice) || 0,
        }))
      );
      setErrorMessage('');
      setNewlyAddedUnit('');
      resetAddForm();
    }
  }, [product, isOpen]);

  const resetAddForm = () => {
    setIsCustomName(false);
    setUnitSelectName('');
    setCustomUnitName('');
    setDirection('baseToNew');
    setConversionN('');
    setNewSellingPrice('');
  };

  const effectiveNewUnitName = (
    isCustomName ? customUnitName : unitSelectName
  )
    .trim()
    .toLowerCase();

  // Helper text calculation
  const liveHelper = useMemo(() => {
    if (!effectiveNewUnitName || !conversionN || Number(conversionN) <= 0) {
      return '';
    }
    const n = Number(conversionN);
    if (direction === 'baseToNew') {
      const factor = Math.round((1 / n) * 1e8) / 1e8;
      return `1 ${baseUnit} = ${n} ${effectiveNewUnitName} (1 ${effectiveNewUnitName} = ${factor} ${baseUnit})`;
    } else {
      return `1 ${effectiveNewUnitName} = ${n} ${baseUnit}`;
    }
  }, [baseUnit, effectiveNewUnitName, conversionN, direction]);

  // Handle adding new unit row to staging
  const handleStageUnit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!effectiveNewUnitName) {
      setErrorMessage('Please choose or enter a unit name');
      return;
    }

    if (effectiveNewUnitName.length > 20) {
      setErrorMessage('Unit name cannot exceed 20 characters');
      return;
    }

    if (effectiveNewUnitName === baseUnit) {
      setErrorMessage(
        `"${effectiveNewUnitName}" is already the base unit for this product`
      );
      return;
    }

    const alreadyExists = units.some(
      (u) => u.name.toLowerCase() === effectiveNewUnitName
    );
    if (alreadyExists) {
      setErrorMessage(`Unit "${effectiveNewUnitName}" is already configured`);
      return;
    }

    const n = Number(conversionN);
    if (!n || n <= 0) {
      setErrorMessage('Conversion number must be greater than 0');
      return;
    }

    // Compute factor (stored per base unit)
    const factor =
      direction === 'baseToNew'
        ? Math.round((1 / n) * 1e8) / 1e8
        : Math.round(n * 1e8) / 1e8;

    const price = newSellingPrice !== '' ? Number(newSellingPrice) : 0;
    if (price < 0) {
      setErrorMessage('Selling price cannot be negative');
      return;
    }

    const newEntry = {
      name: effectiveNewUnitName,
      factor,
      sellingPrice: price,
    };

    setUnits((prev) => [...prev, newEntry]);
    setNewlyAddedUnit(effectiveNewUnitName);
    resetAddForm();
  };

  // Handle removing a non-base unit
  const handleRemoveUnit = (unitName) => {
    if (unitName.toLowerCase() === baseUnit) {
      setErrorMessage('Cannot remove the base unit');
      return;
    }
    setUnits((prev) =>
      prev.filter((u) => u.name.toLowerCase() !== unitName.toLowerCase())
    );
  };

  // Handle editing selling price of an existing unit in the list
  const handlePriceEdit = (unitName, newPrice) => {
    setUnits((prev) =>
      prev.map((u) =>
        u.name.toLowerCase() === unitName.toLowerCase()
          ? { ...u, sellingPrice: Number(newPrice) || 0 }
          : u
      )
    );
  };

  // Mutation to save units via PATCH /api/products/:id/units
  const saveUnitsMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.patch(`/products/${product._id}/units`, {
        units: payload,
      });
      return res.data?.data;
    },
    onSuccess: (updatedProduct) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-search'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });

      if (onSuccess) {
        onSuccess(updatedProduct, newlyAddedUnit);
      }
      onClose();
    },
    onError: (err) => {
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          'Failed to update product units'
      );
    },
  });

  const handleSave = () => {
    setErrorMessage('');
    // Ensure base unit is included with factor = 1
    const hasBase = units.some(
      (u) => u.name.toLowerCase() === baseUnit && Number(u.factor) === 1
    );
    if (!hasBase) {
      setErrorMessage(`Units must include the base unit "${baseUnit}" with factor 1.`);
      return;
    }

    saveUnitsMutation.mutate(units);
  };

  if (!isOpen || !product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Units — ${product.name}`}
      description="Configure multiple selling and purchasing conversion units for this material."
      maxWidth="max-w-xl"
    >
      <div className="space-y-5">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-danger text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Existing Units List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-text uppercase tracking-wider">
            <span>Configured Units ({units.length})</span>
            <span className="text-[11px] text-muted normal-case font-normal">
              Base unit: <strong className="text-primary">{baseUnit}</strong>
            </span>
          </div>

          <div className="divide-y divide-border rounded-lg border border-border bg-slate-50/50 overflow-hidden">
            {units.map((u) => {
              const isBase = u.name.toLowerCase() === baseUnit;
              return (
                <div
                  key={u.name}
                  className="flex items-center justify-between p-3 text-xs bg-surface"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text capitalize">
                        {u.name}
                      </span>
                      {isBase ? (
                        <Badge variant="info" size="sm">
                          Base Unit (x1)
                        </Badge>
                      ) : (
                        <span className="text-muted text-[11px]">
                          1 {u.name} = {u.factor} {baseUnit}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Selling price input */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted text-[11px]">Sell Price: ₹</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={u.sellingPrice ?? ''}
                        onChange={(e) => handlePriceEdit(u.name, e.target.value)}
                        placeholder="0.00"
                        className="w-20 rounded border border-border bg-surface px-2 py-1 text-xs text-left tabular-nums focus:border-primary focus:outline-none"
                      />
                    </div>

                    {/* Remove button */}
                    {!isBase ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveUnit(u.name)}
                        className="text-muted hover:text-danger p-1 rounded transition-colors"
                        title="Remove unit"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <div className="w-6" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Unit Section */}
        <form
          onSubmit={handleStageUnit}
          className="rounded-xl border border-dashed border-border bg-slate-50/70 p-4 space-y-3.5"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-text">
            <span className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span>Add Conversion Unit</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsCustomName(!isCustomName);
                setErrorMessage('');
              }}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              {isCustomName ? '← Choose from standard list' : '+ Enter custom unit name'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Unit Name Input / Select */}
            <div>
              <label className="block text-xs font-medium text-text mb-1 text-left">
                Unit Name <span className="text-danger">*</span>
              </label>
              {isCustomName ? (
                <Input
                  placeholder="e.g. foot, trolley, brass"
                  value={customUnitName}
                  onChange={(e) => setCustomUnitName(e.target.value)}
                  maxLength={20}
                  className="text-left py-1.5 text-xs"
                  required
                />
              ) : (
                <Select
                  value={unitSelectName}
                  onChange={(e) => setUnitSelectName(e.target.value)}
                  placeholder="Select standard unit..."
                  className="text-left py-1.5 text-xs"
                >
                  {masterUnits
                    .filter(
                      (m) =>
                        m.toLowerCase() !== baseUnit &&
                        !units.some((u) => u.name.toLowerCase() === m.toLowerCase())
                    )
                    .map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </Select>
              )}
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-xs font-medium text-text mb-1 text-left">
                Selling Price (₹) <span className="text-muted text-[11px]">(Optional)</span>
              </label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={newSellingPrice}
                onChange={(e) => setNewSellingPrice(e.target.value)}
                className="text-left py-1.5 text-xs"
              />
            </div>
          </div>

          {/* Conversion Mode Toggle & Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-text text-left">
                Conversion Formula <span className="text-danger">*</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  setDirection(direction === 'baseToNew' ? 'newToBase' : 'baseToNew')
                }
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
              >
                <ArrowRightLeft className="h-3 w-3" />
                <span>Switch direction</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {direction === 'baseToNew' ? (
                <>
                  <span className="text-xs font-semibold text-text whitespace-nowrap">
                    1 {baseUnit} =
                  </span>
                  <Input
                    type="number"
                    step="any"
                    min="0.00000001"
                    placeholder="e.g. 300"
                    value={conversionN}
                    onChange={(e) => setConversionN(e.target.value)}
                    className="text-left py-1.5 text-xs flex-1"
                    required
                  />
                  <span className="text-xs font-semibold text-text capitalize whitespace-nowrap">
                    {effectiveNewUnitName || 'new unit'}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xs font-semibold text-text capitalize whitespace-nowrap">
                    1 {effectiveNewUnitName || 'new unit'} =
                  </span>
                  <Input
                    type="number"
                    step="any"
                    min="0.00000001"
                    placeholder="e.g. 0.02"
                    value={conversionN}
                    onChange={(e) => setConversionN(e.target.value)}
                    className="text-left py-1.5 text-xs flex-1"
                    required
                  />
                  <span className="text-xs font-semibold text-text whitespace-nowrap">
                    {baseUnit}
                  </span>
                </>
              )}
            </div>

            {liveHelper && (
              <div className="p-2 rounded bg-blue-50 border border-blue-200 text-blue-900 text-[11px] flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
                <span>
                  Resulting factor: <strong>{liveHelper}</strong>
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add to Product Units</span>
            </Button>
          </div>
        </form>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={saveUnitsMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={saveUnitsMutation.isPending}
            className="gap-1.5 shadow-sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Save Units</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}

