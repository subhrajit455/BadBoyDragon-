import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function SupplierModal({ isOpen, onClose, onSupplierCreated }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/suppliers', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      if (onSupplierCreated && data.data) {
        onSupplierCreated(data.data);
      }
      handleClose();
    },
    onError: (err) => {
      setError(
        err.response?.data?.message || err.message || 'Failed to create supplier'
      );
    },
  });

  const handleClose = () => {
    setName('');
    setPhone('');
    setAddress('');
    setError('');
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Supplier name is required');
      return;
    }
    setError('');
    createMutation.mutate({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Supplier"
      description="Quickly register a supplier or vendor."
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-2.5 text-xs text-danger font-medium">
            {error}
          </div>
        )}

        <Input
          label="Supplier Name"
          placeholder="e.g. UltraTech Cement Agency"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <Input
          label="Phone Number"
          placeholder="e.g. 9876543210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <Input
          label="Address"
          placeholder="e.g. Station Road, Industrial Area"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={createMutation.isPending}
          >
            Save Supplier
          </Button>
        </div>
      </form>
    </Modal>
  );
}

