import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, AlertCircle, Scale } from 'lucide-react';
import api from '../../lib/api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';

const otherUnitSchema = z.object({
  name: z.string().min(1, 'Please select a unit'),
  factor: z.coerce.number().positive('Factor must be greater than 0'),
});

const productFormSchema = z
  .object({
    name: z.string().min(1, 'Product name is required').trim(),
    baseUnit: z.string().min(1, 'Base unit is required'),
    gstRate: z.coerce.number(),
    hsn: z.string().trim().default(''),
    otherUnits: z.array(otherUnitSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const base = data.baseUnit?.toLowerCase();
    const names = data.otherUnits.map((u) => u.name?.toLowerCase());

    if (names.includes(base)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Secondary unit cannot be the same as the base unit',
        path: ['otherUnits'],
      });
    }

    if (new Set(names).size !== names.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate units in additional conversion units',
        path: ['otherUnits'],
      });
    }
  });

export default function ProductModal({
  isOpen,
  onClose,
  onSubmitProduct,
  isSubmitting = false,
  serverError = '',
  initialName = '',
}) {
  // Fetch master units list
  const { data: unitsData } = useQuery({
    queryKey: ['meta-units'],
    queryFn: async () => {
      const res = await api.get('/meta/units');
      return res.data?.units || ['bag', 'kg', 'ton', 'piece', 'brass'];
    },
    staleTime: Infinity,
  });

  const masterUnits = unitsData?.length
    ? unitsData
    : ['bag', 'kg', 'ton', 'piece', 'brass'];

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      baseUnit: 'bag',
      gstRate: 18,
      hsn: '',
      otherUnits: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'otherUnits',
  });

  const watchedBaseUnit = watch('baseUnit') || 'bag';
  const watchedOtherUnits = watch('otherUnits');

  useEffect(() => {
    if (isOpen) {
      reset({
        name: initialName || '',
        baseUnit: masterUnits[0] || 'bag',
        gstRate: 18,
        hsn: '',
        otherUnits: [],
      });
    }
  }, [isOpen, reset, masterUnits, initialName]);

  const onFormSubmit = (formData) => {
    const normalizedBaseUnit = formData.baseUnit.trim().toLowerCase();
    const constructedUnits = [
      {
        name: normalizedBaseUnit,
        factor: 1,
        sellingPrice: 0,
      },
      ...formData.otherUnits.map((u) => ({
        name: u.name.trim().toLowerCase(),
        factor: Number(u.factor),
        sellingPrice: 0,
      })),
    ];

    const payload = {
      name: formData.name.trim(),
      category: 'General',
      hsn: formData.hsn.trim(),
      gstRate: Number(formData.gstRate),
      minStock: 0,
      baseUnit: normalizedBaseUnit,
      units: constructedUnits,
    };

    onSubmitProduct(payload);
  };

  const gstOptions = [
    { value: 0, label: '0%' },
    { value: 5, label: '5%' },
    { value: 12, label: '12%' },
    { value: 18, label: '18%' },
    { value: 28, label: '28%' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Product"
      description="Create a product with base unit, GST rate, and optional secondary units."
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
        {serverError && (
          <div className="flex items-start gap-2.5 rounded border border-red-200 bg-red-50 p-3 text-sm text-danger">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Core Product Fields */}
        <div className="space-y-4">
          <Input
            label="Product Name"
            placeholder="e.g. UltraTech Cement, River Sand, TMT Steel 12mm"
            required
            {...register('name')}
            error={errors.name?.message}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Select
                label="Base Unit"
                required
                options={masterUnits.map((u) => ({ value: u, label: u }))}
                {...register('baseUnit')}
                error={errors.baseUnit?.message}
              />
              <p className="mt-1 text-xs text-muted">
                Storage &amp; stock unit (1 {watchedBaseUnit} = factor 1.0)
              </p>
            </div>

            <div>
              <Select
                label="GST %"
                required
                options={gstOptions}
                {...register('gstRate')}
                error={errors.gstRate?.message}
              />
            </div>
          </div>

          <Input
            label="HSN Code (Optional)"
            placeholder="e.g. 2523, 7214"
            {...register('hsn')}
            error={errors.hsn?.message}
          />
        </div>

        {/* Other Units Section */}
        <div className="rounded border border-border bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-primary" />
              <label className="text-xs font-semibold uppercase tracking-wider text-text">
                Other Units (Optional)
              </label>
            </div>
            <button
              type="button"
              onClick={() =>
                append({
                  name:
                    masterUnits.find((u) => u !== watchedBaseUnit) ||
                    masterUnits[0] ||
                    'ton',
                  factor: 1,
                })
              }
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Unit</span>
            </button>
          </div>

          {errors.otherUnits?.message && (
            <p className="text-xs text-danger font-medium">
              {errors.otherUnits.message}
            </p>
          )}

          {fields.length === 0 ? (
            <p className="text-xs text-muted italic">
              No additional units defined. Product will only use {watchedBaseUnit}.
            </p>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => {
                const currentUnitName =
                  watchedOtherUnits?.[index]?.name || 'unit';
                const currentFactor =
                  watchedOtherUnits?.[index]?.factor || 1;

                return (
                  <div
                    key={field.id}
                    className="rounded border border-border bg-surface p-3 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-end gap-2">
                      <div className="w-1/2">
                        <Select
                          label={index === 0 ? 'Unit' : undefined}
                          options={masterUnits
                            .filter((u) => u !== watchedBaseUnit)
                            .map((u) => ({ value: u, label: u }))}
                          {...register(`otherUnits.${index}.name`)}
                          error={errors.otherUnits?.[index]?.name?.message}
                        />
                      </div>

                      <div className="w-1/2">
                        <Input
                          label={
                            index === 0
                              ? `1 ${currentUnitName} = [n] ${watchedBaseUnit}`
                              : undefined
                          }
                          type="number"
                          step="any"
                          min="0.000001"
                          placeholder={`1 ${currentUnitName} = n ${watchedBaseUnit}`}
                          {...register(`otherUnits.${index}.factor`)}
                          error={errors.otherUnits?.[index]?.factor?.message}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="rounded p-2 text-muted hover:text-danger hover:bg-red-50 transition-colors"
                        title="Remove unit"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="text-xs text-muted bg-slate-50 px-2 py-1 rounded font-mono">
                      1 {currentUnitName} = {currentFactor || '?'} {watchedBaseUnit}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
          >
            Save Product
          </Button>
        </div>
      </form>
    </Modal>
  );
}
