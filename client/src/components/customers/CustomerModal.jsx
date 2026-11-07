import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { AlertCircle } from 'lucide-react';
import api from '../../lib/api';

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export default function CustomerModal({
  isOpen,
  onClose,
  onCustomerCreated,
  onSuccess,
  initialName = '',
}) {
  const [name, setName] = useState(initialName || '');
  const [state, setState] = useState('Maharashtra');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setName(initialName || '');
      setState('Maharashtra');
      setPhone('');
      setAddress('');
      setGstin('');
      setErrors({});
      setServerError('');
    }
  }, [isOpen, initialName]);

  const resetForm = () => {
    setName('');
    setState('Maharashtra');
    setPhone('');
    setAddress('');
    setGstin('');
    setErrors({});
    setServerError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Customer name is required';
    }
    if (!state.trim()) {
      newErrors.state = 'State is required for GST determination';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/customers', {
        name: name.trim(),
        state: state.trim(),
        phone: phone.trim(),
        address: address.trim(),
        gstin: gstin.trim().toUpperCase(),
      });

      if (res.data?.success && res.data?.data) {
        const callback = onCustomerCreated || onSuccess;
        if (typeof callback === 'function') {
          callback(res.data.data);
        }
        handleClose();
      }
    } catch (err) {
      setServerError(
        err.response?.data?.message || err.message || 'Failed to save customer'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Customer"
      description="Add a new customer profile for GST billing and ledger tracking."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="flex items-start gap-2.5 rounded border border-red-200 bg-red-50 p-3 text-sm text-danger">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <Input
          label="Customer / Business Name"
          placeholder="e.g. Acme Builders, John Doe"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
          }}
          error={errors.name}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Select
              label="State (for GST calculation)"
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                if (errors.state) setErrors((prev) => ({ ...prev, state: '' }));
              }}
              error={errors.state}
              required
            >
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Input
              label="Phone Number"
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <Input
          label="GSTIN (Optional)"
          placeholder="e.g. 27AAAAA0000A1Z5"
          value={gstin}
          onChange={(e) => setGstin(e.target.value.toUpperCase())}
        />

        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Site / Billing Address (Optional)
          </label>
          <textarea
            rows={2}
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            placeholder="e.g. Plot 42, Sector 9, Pune, Maharashtra"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            Save Customer
          </Button>
        </div>
      </form>
    </Modal>
  );
}

