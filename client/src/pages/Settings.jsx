import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Card, { CardHeader, CardBody, CardFooter } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import { INDIAN_STATES } from '../components/customers/CustomerModal';

export default function Settings() {
  const { user, changePassword } = useAuth();
  const queryClient = useQueryClient();

  // -------------------------------------------------------------
  // 1. BUSINESS SETTINGS STATE
  // -------------------------------------------------------------
  const [businessName, setBusinessName] = useState('');
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const [businessError, setBusinessError] = useState('');
  const [businessSuccess, setBusinessSuccess] = useState('');

  // Fetch current business settings
  const { data: settingsResponse, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data?.data;
    },
  });

  useEffect(() => {
    if (settingsResponse) {
      setBusinessName(settingsResponse.businessName || '');
      setGstin(settingsResponse.gstin || '');
      setState(settingsResponse.state || 'Maharashtra');
      setAddress(settingsResponse.address || '');
      setPhone(settingsResponse.phone || '');
    }
  }, [settingsResponse]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put('/settings', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setBusinessSuccess('Business details updated successfully.');
      setBusinessError('');
    },
    onError: (err) => {
      setBusinessError(
        err.response?.data?.message || err.message || 'Failed to update settings'
      );
      setBusinessSuccess('');
    },
  });

  const handleBusinessSubmit = (e) => {
    e.preventDefault();
    setBusinessError('');
    setBusinessSuccess('');

    if (!businessName.trim()) {
      setBusinessError('Business name is required');
      return;
    }

    updateSettingsMutation.mutate({
      businessName: businessName.trim(),
      gstin: gstin.trim().toUpperCase(),
      state: state.trim(),
      address: address.trim(),
      phone: phone.trim(),
    });
  };

  // -------------------------------------------------------------
  // 2. CHANGE PASSWORD STATE
  // -------------------------------------------------------------
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordServerError, setPasswordServerError] = useState('');
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');

  const validatePassword = () => {
    const errs = {};
    if (!currentPassword) {
      errs.currentPassword = 'Current password is required';
    }
    if (!newPassword) {
      errs.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      errs.newPassword = 'New password must be at least 6 characters long';
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordServerError('');
    setPasswordSuccessMessage('');

    if (!validatePassword()) {
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccessMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
    } catch (err) {
      setPasswordServerError(err.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text">Settings</h1>
        <p className="text-sm text-muted">
          Configure business details printed on GST invoices and manage admin credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Admin Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-text flex items-center gap-2">
                <SettingsIcon className="h-4 w-4 text-muted" />
                <span>Admin Profile</span>
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted uppercase tracking-wider">Name</p>
                <p className="text-sm font-medium text-text mt-0.5">{user?.name || 'Super Admin'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted uppercase tracking-wider">Email</p>
                <p className="text-sm font-medium text-text mt-0.5">{user?.email || 'admin@construction.local'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted uppercase tracking-wider">Role</p>
                <span className="mt-1 inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-text">
                  Single Administrator
                </span>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Business Profile & Change Password */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Details Form */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-text flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span>Business Details &amp; GST Profile</span>
              </h2>
              <p className="text-xs text-muted mt-1">
                These details will be displayed in invoice headers and used to determine intra-state (CGST+SGST) vs inter-state (IGST) tax split.
              </p>
            </CardHeader>

            <form onSubmit={handleBusinessSubmit}>
              <CardBody className="space-y-4">
                {businessError && (
                  <div className="flex items-start gap-2.5 rounded border border-red-200 bg-red-50 p-3 text-sm text-danger">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>{businessError}</span>
                  </div>
                )}

                {businessSuccess && (
                  <div className="flex items-start gap-2.5 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-success">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>{businessSuccess}</span>
                  </div>
                )}

                <Input
                  label="Business / Shop Name"
                  placeholder="e.g. Royal Building Materials"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Input
                      label="GSTIN"
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    />
                  </div>

                  <div>
                    <Select
                      label="State (for GST calculation)"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Input
                      label="Phone / Mobile Number"
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Shop / Billing Address
                  </label>
                  <textarea
                    rows={2}
                    className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                    placeholder="e.g. Shop No. 4, Station Road, Pune, Maharashtra 411001"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </CardBody>

              <CardFooter className="flex justify-end border-t border-border pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  loading={updateSettingsMutation.isPending}
                >
                  Save Business Details
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Change Password Form */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-text flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                <span>Change Password</span>
              </h2>
              <p className="text-xs text-muted mt-1">
                Ensure your account is using a strong password with at least 6 characters.
              </p>
            </CardHeader>

            <form onSubmit={handlePasswordSubmit}>
              <CardBody className="space-y-4">
                {passwordServerError && (
                  <div className="flex items-start gap-2.5 rounded border border-red-200 bg-red-50 p-3 text-sm text-danger">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>{passwordServerError}</span>
                  </div>
                )}

                {passwordSuccessMessage && (
                  <div className="flex items-start gap-2.5 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-success">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>{passwordSuccessMessage}</span>
                  </div>
                )}

                <Input
                  label="Current Password"
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (passwordErrors.currentPassword) {
                      setPasswordErrors((prev) => ({ ...prev, currentPassword: '' }));
                    }
                  }}
                  error={passwordErrors.currentPassword}
                  required
                  rightElement={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowCurrent((prev) => !prev)}
                      className="text-muted hover:text-text p-1"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />

                <Input
                  label="New Password"
                  id="newPassword"
                  name="newPassword"
                  type={showNew ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordErrors.newPassword) {
                      setPasswordErrors((prev) => ({ ...prev, newPassword: '' }));
                    }
                  }}
                  error={passwordErrors.newPassword}
                  required
                  rightElement={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNew((prev) => !prev)}
                      className="text-muted hover:text-text p-1"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />

                <Input
                  label="Confirm New Password"
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (passwordErrors.confirmPassword) {
                      setPasswordErrors((prev) => ({ ...prev, confirmPassword: '' }));
                    }
                  }}
                  error={passwordErrors.confirmPassword}
                  required
                  rightElement={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm((prev) => !prev)}
                      className="text-muted hover:text-text p-1"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
              </CardBody>

              <CardFooter className="flex justify-end border-t border-border pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  loading={passwordLoading}
                >
                  Update Password
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
