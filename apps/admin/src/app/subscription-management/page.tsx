
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGetSubscriptionPlansQuery, useCreateSubscriptionPlanMutation, useUpdateSubscriptionPlanMutation, useDeleteSubscriptionPlanMutation, useGetVendorsQuery, useGetSuppliersQuery, useGetDoctorsQuery, useRenewPlanMutation, useGetRegionsQuery } from '@repo/store/api';
import { setSelectedRegion, selectSelectedRegion, selectCurrentAdmin } from '@repo/store/slices/adminAuthSlice';
import { useAppDispatch, useAppSelector } from '@repo/store/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card';
import { Button } from '@repo/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/ui/table';
import { Pagination } from '@repo/ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@repo/ui/dialog';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { Skeleton } from '@repo/ui/skeleton';
import { Edit2, Plus, Trash2, Eye, Calendar, Users, FileText, BadgeCheck, RefreshCw, AlertCircle, CreditCard, Smartphone, Landmark, Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/select';
import { Switch } from '@repo/ui/switch';
import { toast } from 'sonner';

/* ─── Razorpay script loader (cached) ───────────────────────────────────── */
let rzpScriptLoaded = false;
const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (rzpScriptLoaded || (typeof window !== 'undefined' && (window as any).Razorpay)) {
      rzpScriptLoaded = true;
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => { rzpScriptLoaded = true; resolve(true); };
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

type Plan = {
  _id: string;
  name: string;
  duration: number;
  durationType: string;
  price: number;
  discountedPrice?: number;
  isAvailableForPurchase: boolean;
  status?: string;
  features: string[];
  userTypes: ('vendor' | 'supplier' | 'doctor')[];
  isFeatured?: boolean;
  planType?: 'trial' | 'regular';
  createdAt?: string;
  updatedAt?: string;
};

type Subscription = {
  id: string;
  subscriberId: string;
  subscriberName: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: string;
  history?: Array<{
    plan: { _id: string; name: string } | string;
    status: string;
    startDate: string;
    endDate: string;
    purchaseDate?: string;
  }>;
  userType?: 'vendor' | 'supplier' | 'doctor';
};

type VendorSubPlan = { _id: string; name?: string } | string | undefined;
type VendorItem = {
  _id: string;
  businessName?: string;
  subscription?: {
    plan?: VendorSubPlan;
    startDate?: string;
    endDate?: string;
    status?: string;
  };
};

export default function SubscriptionManagementPage() {
  const dispatch = useAppDispatch();
  const selectedRegion = useAppSelector(selectSelectedRegion);
  const { token } = useAppSelector((state: any) => state.adminAuth);
  const user = useAppSelector(selectCurrentAdmin);
  const userRole = user?.roleName || user?.role;
  const userRegion = user?.assignedRegions?.[0];



  const { data: regionsResponse } = useGetRegionsQuery(undefined);
  const regions: any[] = (regionsResponse as any)?.data || (Array.isArray(regionsResponse) ? regionsResponse : []);

  // Fetch ALL plans to handle Global/Regional filtering on frontend
  const { data: allPlansRaw = [], isLoading, error, refetch } = useGetSubscriptionPlansQuery(undefined);
  const allPlans: Plan[] = Array.isArray(allPlansRaw) ? allPlansRaw : (allPlansRaw as any)?.data || [];

  const { data: vendors = [], isLoading: vendorsLoading, refetch: refetchVendors } = useGetVendorsQuery(selectedRegion ? { regionId: selectedRegion } : undefined);
  const { data: suppliers = [], isLoading: suppliersLoading, refetch: refetchSuppliers } = useGetSuppliersQuery(selectedRegion ? { regionId: selectedRegion } : undefined);
  const { data: doctors = [], isLoading: doctorsLoading, refetch: refetchDoctors } = useGetDoctorsQuery(selectedRegion ? { regionId: selectedRegion } : undefined);
  const [createNewPlan] = useCreateSubscriptionPlanMutation();
  const [updateExistingPlan] = useUpdateSubscriptionPlanMutation();
  const [deletePlan] = useDeleteSubscriptionPlanMutation();

  // Filter plans based on selected region (including Global plans)
  const plans = allPlans.filter(p =>
    !selectedRegion ||
    !(p as any).regionId ||
    (p as any).regionId === selectedRegion
  );

  // Helper to extract date string from MongoDB $date object or raw string
  const getDateValue = (dateInput: any) => {
    if (!dateInput) return '';
    if (typeof dateInput === 'string') return dateInput;
    if (typeof dateInput === 'object' && dateInput.$date) return dateInput.$date;
    return dateInput.toString();
  };

  // Helper to safely parse date without timezone shifts for calendar comparisons
  const getSafeDate = (dateInput: any) => {
    const val = getDateValue(dateInput);
    if (!val) return null;
    const date = new Date(val);
    if (isNaN(date.getTime())) return null;

    // If it's an ISO string (YYYY-MM-DD...), parse parts manually to avoid timezone spillover
    if (typeof val === 'string' && val.includes('-')) {
      const parts = val.split('T')[0].split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts.map(Number);
        return new Date(y, m - 1, d);
      }
    }
    // Fallback to local reconstruction
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  // Helper to determine real-time subscription status
  const getSubStatus = (subscription: any) => {
    const rawStatus = (subscription?.status || 'Pending').toString().trim();
    const normalizedStatus = rawStatus.toLowerCase();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Ensure we have a valid end date
    const endDateVal = getDateValue(subscription?.endDate);
    if (endDateVal) {
      const expiryDate = getSafeDate(endDateVal);

      if (expiryDate && today > expiryDate) {
        return 'Expired';
      }
    }

    const startDateVal = getDateValue(subscription?.startDate);
    if (startDateVal) {
      const startDate = getSafeDate(startDateVal);
      if (startDate && startDate > today) {
        return 'Scheduled';
      }
    }

    // Return capitalized status for UI consistency
    if (normalizedStatus === 'active') return 'Active';
    if (normalizedStatus === 'scheduled') return 'Scheduled';
    if (normalizedStatus === 'pending') return 'Pending';
    if (normalizedStatus === 'expired') return 'Expired';

    return rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
  };

  // Derived subscribers from vendors, suppliers, and doctors (live data)
  const subscribers: (Subscription & { planPrice?: number })[] = [
    ...(Array.isArray(vendors) ? vendors : []).map((v: any) => {
      const plan = v.subscription?.plan;
      const planId = typeof plan === 'object' && plan !== null ? ((plan as any).$oid || (plan as any)._id) : (typeof plan === 'string' ? plan : undefined);
      const planName = (typeof plan === 'object' && plan !== null && (plan as any).name) ? (plan as any).name : undefined;

      // Lookup plan details for revenue calculation
      const planDetails = allPlans.find(p => p._id === planId || p.name === planName);

      return {
        id: v._id,
        subscriberId: v._id,
        subscriberName: v.businessName || 'Vendor',
        planName: planName || planDetails?.name || '-',
        planId,
        planPrice: (planDetails?.discountedPrice && planDetails.discountedPrice > 0) ? planDetails.discountedPrice : planDetails?.price,
        startDate: getDateValue(v.subscription?.startDate),
        endDate: getDateValue(v.subscription?.endDate),
        status: getSubStatus(v.subscription),
        history: (v.subscription as any)?.history || [],
        userType: 'vendor' as const
      };
    }),
    ...(Array.isArray(suppliers) ? suppliers : []).map((s: any) => {
      const plan = s.subscription?.plan;
      const planId = typeof plan === 'object' && plan !== null ? ((plan as any).$oid || (plan as any)._id) : (typeof plan === 'string' ? plan : undefined);
      const planName = (typeof plan === 'object' && plan !== null && (plan as any).name) ? (plan as any).name : undefined;

      const planDetails = allPlans.find(p => p._id === planId || p.name === planName);

      return {
        id: s._id,
        subscriberId: s._id,
        subscriberName: s.shopName || (s.firstName + ' ' + s.lastName) || 'Supplier',
        planName: planName || planDetails?.name || '-',
        planId,
        planPrice: (planDetails?.discountedPrice && planDetails.discountedPrice > 0) ? planDetails.discountedPrice : planDetails?.price,
        startDate: getDateValue(s.subscription?.startDate),
        endDate: getDateValue(s.subscription?.endDate),
        status: getSubStatus(s.subscription),
        history: (s.subscription as any)?.history || [],
        userType: 'supplier' as const
      };
    }),
    ...(Array.isArray(doctors) ? doctors : []).map((d: any) => {
      const plan = d.subscription?.plan;
      const planId = typeof plan === 'object' && plan !== null ? ((plan as any).$oid || (plan as any)._id) : (typeof plan === 'string' ? plan : undefined);
      const planName = (typeof plan === 'object' && plan !== null && (plan as any).name) ? (plan as any).name : undefined;

      const planDetails = allPlans.find(p => p._id === planId || p.name === planName);

      return {
        id: d._id,
        subscriberId: d._id,
        subscriberName: d.clinicName ? `${d.name} (${d.clinicName})` : d.name || 'Doctor',
        planName: planName || planDetails?.name || '-',
        planId,
        planPrice: (planDetails?.discountedPrice && planDetails.discountedPrice > 0) ? planDetails.discountedPrice : planDetails?.price,
        startDate: getDateValue(d.subscription?.startDate),
        endDate: getDateValue(d.subscription?.endDate),
        status: getSubStatus(d.subscription),
        history: (d.subscription as any)?.history || [],
        userType: 'doctor' as const
      };
    })
  ];

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [selectedRenewalPlan, setSelectedRenewalPlan] = useState<Plan | null>(null);
  const [isRenewingManual, setIsRenewingManual] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [renewPlan, { isLoading: isRenewing }] = useRenewPlanMutation(); // Keep for type safety or remove usage if verified

  const [planForm, setPlanForm] = useState({
    name: '',
    duration: '1',
    durationType: 'months',
    price: '',
    discountedPrice: '',
    isAvailableForPurchase: true,
    features: [] as string[],
    userTypes: [] as ('vendor' | 'supplier' | 'doctor')[],
    isFeatured: false,
    planType: 'regular',
    status: 'Active',
    regionId: 'global'
  });

  // Pagination state
  const [currentPlanPage, setCurrentPlanPage] = useState(1);
  const [currentSubPage, setCurrentSubPage] = useState(1);
  const [planItemsPerPage, setPlanItemsPerPage] = useState<number>(5); // Explicit number type
  const [subItemsPerPage, setSubItemsPerPage] = useState<number>(5); // Explicit number type
  const [subscriberRoleFilter, setSubscriberRoleFilter] = useState<string>('all');
  const [subscriberStatusFilter, setSubscriberStatusFilter] = useState<string>('all');

  const durationTypeOptions = [
    { value: 'days', label: 'Days' },
    { value: 'weeks', label: 'Weeks' },
    { value: 'months', label: 'Months' },
    { value: 'years', label: 'Years' },
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field === 'duration') {
      const numValue = Number(value);
      if (numValue > 99) return;
    }
    setPlanForm((prev) => ({
      ...prev,
      [field]: field === 'isAvailableForPurchase' ? value === 'true' : value,
    }));
  };

  const handleOpenPlanModal = (type: 'add' | 'edit', plan?: Plan) => {
    setModalType(type);
    setSelectedPlan(plan || null);

    if (type === 'edit' && plan) {
      setPlanForm({
        name: plan.name,
        duration: plan.duration.toString(),
        durationType: plan.durationType,
        price: plan.price.toString(),
        discountedPrice: plan.discountedPrice?.toString() || '',
        isAvailableForPurchase: plan.isAvailableForPurchase ?? true,
        features: plan.features || [],
        userTypes: plan.userTypes || [],
        isFeatured: plan.isFeatured || false,
        planType: plan.planType || 'regular',
        status: plan.status || 'Active',
        regionId: (plan as any).regionId || 'global'
      });
    } else {
      setPlanForm({
        name: '',
        duration: '1',
        durationType: 'months',
        price: '',
        discountedPrice: '',
        isAvailableForPurchase: true,
        features: [],
        userTypes: [],
        isFeatured: false,
        planType: 'regular',
        status: 'Active',
        regionId: userRole === 'SUPER_ADMIN' || userRole === 'superadmin' ? 'global' : (userRegion || 'global')
      });
    }

    setIsPlanModalOpen(true);
  };

  const handleOpenSubModal = (type: 'edit' | 'view', sub: Subscription) => {
    setModalType(type);
    setSelectedSubscription(sub);
    setIsSubModalOpen(true);
  };

  const handleDeleteClick = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedPlan) {
      try {
        await deletePlan(selectedPlan._id).unwrap();
        toast.success('Plan deleted successfully!');
        setIsDeleteModalOpen(false);
        setSelectedPlan(null);
        refetch();
      } catch (error) {
        console.error('Error deleting plan:', error);
      } finally {
        setIsDeleteModalOpen(false);
      }
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const planData = {
        name: planForm.name,
        duration: parseInt(planForm.duration) || 1,
        durationType: planForm.durationType,
        price: planForm.planType === 'trial' ? 0 : (planForm.price ? parseFloat(planForm.price) : 0),
        discountedPrice: planForm.planType === 'trial' ? 0 : (planForm.discountedPrice ? parseFloat(planForm.discountedPrice) : undefined),
        isAvailableForPurchase: planForm.isAvailableForPurchase,
        status: planForm.status,
        features: planForm.features || [],
        userTypes: planForm.userTypes,
        planType: planForm.planType,
        isFeatured: planForm.isFeatured,
        regionId: (planForm.regionId === 'global' || !planForm.regionId) ? null : planForm.regionId
      };

      if (modalType === 'add') {
        await createNewPlan(planData).unwrap();
        toast.success('Plan created successfully!');
      } else if (selectedPlan) {
        await updateExistingPlan({ _id: selectedPlan._id, ...planData }).unwrap();
        toast.success('Plan updated successfully!');
      }

      setPlanForm({
        name: '',
        duration: '1',
        durationType: 'months',
        price: '',
        discountedPrice: '',
        isAvailableForPurchase: true,
        features: [],
        userTypes: [],
        isFeatured: false,
        planType: 'regular',
        status: 'Active',
        regionId: 'global'
      });

      setIsPlanModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error saving plan:', error);
    }
  };

  const handleOpenRenewModal = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setSelectedRenewalPlan(null);
    setIsRenewModalOpen(true);
    // Preload Razorpay script eagerly so it's ready when admin clicks Pay
    loadRazorpayScript();
  };

  // Reset plan selection when renew modal closes
  useEffect(() => {
    if (!isRenewModalOpen) {
      setSelectedRenewalPlan(null);
    }
  }, [isRenewModalOpen]);

  /* ─── Core activation (called after payment or directly for free plans) ─── */
  const activateRenewal = useCallback(
    async (paymentId?: string, paymentOrderId?: string) => {
      if (!selectedSubscription || !selectedRenewalPlan) return;

      const response = await fetch('/api/admin/subscription-renewal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          userId: selectedSubscription.subscriberId,
          userType: selectedSubscription.userType,
          planId: selectedRenewalPlan._id,
          ...(paymentId && { paymentId, paymentOrderId, paymentMethod: 'online' }),
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const msg = data.schedulingMode === 'Scheduled'
          ? 'Plan scheduled — will activate after the current subscription ends.'
          : 'Subscription renewed successfully!';
        toast.success(msg);
        setIsRenewModalOpen(false);
        setSelectedSubscription(null);
        setSelectedRenewalPlan(null);
        refetchVendors();
        refetchSuppliers();
        refetchDoctors();
      } else {
        throw new Error(data.message || 'Failed to renew subscription');
      }
    },
    [selectedSubscription, selectedRenewalPlan, token, refetchVendors, refetchSuppliers, refetchDoctors]
  );

  const handleRenewSubscription = async () => {
    if (!selectedSubscription || !selectedRenewalPlan) {
      toast.error('Please select a plan to renew');
      return;
    }

    const planAmount = selectedRenewalPlan.discountedPrice && selectedRenewalPlan.discountedPrice > 0
      ? selectedRenewalPlan.discountedPrice
      : selectedRenewalPlan.price;

    // Free / trial plan — skip payment gateway
    if (!planAmount || planAmount <= 0) {
      try {
        setIsRenewingManual(true);
        await activateRenewal();
      } catch (error: any) {
        console.error('Error renewing subscription:', error);
        toast.error(error?.message || 'Failed to process subscription. Please try again.');
      } finally {
        setIsRenewingManual(false);
      }
      return;
    }

    // Paid plan — Razorpay payment gateway
    setIsProcessingPayment(true);
    try {
      // Step 1 — load Razorpay JS
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Payment gateway failed to load. Please refresh and try again.');
        return;
      }

      // Step 2 — create Razorpay order via admin backend
      const orderRes = await fetch('/api/admin/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          amount: planAmount,
          currency: 'INR',
          receipt: `admin_sub_${selectedRenewalPlan._id}_${Date.now()}`,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.id) {
        throw new Error(orderData.message || 'Failed to create payment order');
      }

      // Step 3 — Close modal to escape focus trap, then open Razorpay checkout
      setIsRenewModalOpen(false);

      await new Promise<void>((resolve, reject) => {
        let rzp: any;
        try {
          rzp = new (window as any).Razorpay({
            key: orderData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_SLBxzQHGTzUTCO',
            amount: Math.round(planAmount * 100),
            currency: 'INR',
            order_id: orderData.id,
            name: 'GlowVita Admin',
            description: `${selectedRenewalPlan.name} – ${selectedRenewalPlan.duration} ${selectedRenewalPlan.durationType} for ${selectedSubscription.subscriberName}`,
            image: 'https://glowvita.com/logo.png',
            theme: { color: '#7c3aed' },
            retry: { enabled: true, max_count: 3 },
            modal: {
              ondismiss: () => {
                // Re-open renew dialog on cancel
                setIsRenewModalOpen(true);
                reject(new Error('Payment cancelled by user'));
              },
              escape: true,
              backdropClose: false,
            },
            handler: async (response: any) => {
              try {
                // Step 4 — verify signature
                const verifyRes = await fetch('/api/admin/payments/verify', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || ''}`
                  },
                  body: JSON.stringify(response),
                });
                const verifyData = await verifyRes.json();
                if (!verifyData.success) throw new Error('Payment verification failed.');

                // Step 5 — activate subscription
                await activateRenewal(response.razorpay_payment_id, response.razorpay_order_id);
                resolve();
              } catch (err: any) {
                setIsRenewModalOpen(true); // Re-open on error
                reject(err);
              }
            },
          });
        } catch (initErr: any) {
          reject(new Error('Payment gateway initialization failed: ' + (initErr?.message || 'Unknown error')));
          return;
        }
        rzp.open();
      });
    } catch (error: any) {
      if (error?.message === 'Payment cancelled by user') {
        toast.info('Payment cancelled.');
      } else {
        console.error('Error renewing subscription:', error);
        toast.error(error?.message || 'Failed to process subscription. Please try again.');
        setIsRenewModalOpen(true);
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };


  // Active count derived from live data
  const subscriptionsCount = subscribers.filter((s) => s.status !== 'Pending').length;

  const activeSubscribersCount = subscribers.filter((s) => {
    if (s.status === 'Active') return true;
    if (s.history && s.history.length > 0) {
      return s.history.some(h => getSubStatus({ status: h.status, endDate: h.endDate, startDate: h.startDate }) === 'Active');
    }
    return false;
  }).length;

  const scheduledSubscribersCount = subscribers.filter((s) => {
    if (s.status === 'Scheduled') return true;
    if (s.history && s.history.length > 0) {
      return s.history.some(h => getSubStatus({ status: h.status, endDate: h.endDate, startDate: h.startDate }) === 'Scheduled');
    }
    return false;
  }).length;

  const expiredSubscribersCount = subscribers.filter((s) => {
    const hasActive = s.status === 'Active' || (s.history && s.history.some(h => getSubStatus({ status: h.status, endDate: h.endDate, startDate: h.startDate }) === 'Active'));
    if (hasActive) return false; // If they have an active plan, they are not an inactive salon

    if (s.status === 'Expired') return true;
    if (s.history && s.history.length > 0) {
      return s.history.some(h => getSubStatus({ status: h.status, endDate: h.endDate, startDate: h.startDate }) === 'Expired');
    }
    return false;
  }).length;

  // Total Revenue = SUM of all PAID subscriptions across history (Active + Scheduled + Expired)
  const totalRevenue = subscribers.reduce((acc, sub) => {
    const plansToCount: any[] = [];

    if (sub.planPrice && sub.planPrice > 0) {
      plansToCount.push({
        price: sub.planPrice,
        start: getDateValue(sub.startDate) ? new Date(getDateValue(sub.startDate) as Date).getTime() : null,
        end: getDateValue(sub.endDate) ? new Date(getDateValue(sub.endDate) as Date).getTime() : null
      });
    }

    if (sub.history && sub.history.length > 0) {
      sub.history.forEach(hItem => {
        const hPlanId = typeof hItem.plan === 'object' ? ((hItem.plan as any).$oid || (hItem.plan as any)._id) : hItem.plan;
        const hPlan = allPlans.find(p => p._id === hPlanId || p.name === (hItem.plan as any)?.name);
        const hPrice = (hPlan?.discountedPrice && hPlan.discountedPrice > 0) ? hPlan.discountedPrice : (hPlan?.price || 0);

        if (hPrice > 0) {
          const start = getDateValue(hItem.startDate);
          const end = getDateValue(hItem.endDate);
          plansToCount.push({
            price: hPrice,
            start: start ? new Date(start).getTime() : null,
            end: end ? new Date(end).getTime() : null
          });
        }
      });
    }

    const uniquePlans = plansToCount.filter((p, index, self) => {
      if (!p.start || !p.end) return true;
      return index === self.findIndex(t => t.start === p.start && t.end === p.end);
    });

    const subTotal = uniquePlans.reduce((sum, p) => sum + p.price, 0);
    return acc + subTotal;
  }, 0);

  // Pagination logic with safeguards
  const totalPlanPages = Math.ceil(plans.length / (planItemsPerPage || 1)) || 1;

  const filteredAndSortedSubscribers = subscribers
    .filter((s) => s.status !== 'Pending' &&
      (subscriberRoleFilter === 'all' || s.userType === subscriberRoleFilter) &&
      (subscriberStatusFilter === 'all' || s.status === subscriberStatusFilter))
    .sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateB - dateA;
    });

  const totalSubPages = Math.ceil(filteredAndSortedSubscribers.length / (subItemsPerPage || 1)) || 1;

  const filteredAndSortedPlans = [...plans].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const paginatedPlans = filteredAndSortedPlans.slice(
    (currentPlanPage - 1) * planItemsPerPage,
    currentPlanPage * planItemsPerPage
  );

  const paginatedSubscriptions = filteredAndSortedSubscribers.slice(
    (currentSubPage - 1) * subItemsPerPage,
    currentSubPage * subItemsPerPage
  );

  // Handlers for items per page change with validation
  const handlePlanItemsPerPageChange = (items: number) => {
    const validItems = Math.max(1, Number(items) || 5); // Fallback to 5 if invalid
    setPlanItemsPerPage(validItems);
    setCurrentPlanPage(1); // Reset to first page
  };

  const handleSubItemsPerPageChange = (items: number) => {
    const validItems = Math.max(1, Number(items) || 5); // Fallback to 5 if invalid
    setSubItemsPerPage(validItems);
    setCurrentSubPage(1); // Reset to first page
  };

  if (isLoading || vendorsLoading || suppliersLoading || doctorsLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-8 w-56 mb-6" />

        {/* Stats cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-36 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs skeleton */}
        <div className="mb-6">
          <div className="grid w-full grid-cols-2 max-w-md">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>

        {/* Main content skeleton */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </div>
              <Skeleton className="h-9 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto no-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[...Array(8)].map((_, i) => (
                      <TableHead key={i}><Skeleton className="h-4 w-16" /></TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(8)].map((_, j) => (
                        <TableCell key={j}>
                          {j === 7 ? (
                            <div className="flex gap-1">
                              <Skeleton className="h-8 w-8" />
                              <Skeleton className="h-8 w-8" />
                              <Skeleton className="h-8 w-8" />
                            </div>
                          ) : (
                            <Skeleton className="h-4 w-20" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Skeleton className="h-10 w-full mt-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) return <div>Error: {(error as any).status || 'An error occurred'}</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold font-headline">Subscription Management</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.length}</div>
            <p className="text-xs text-muted-foreground">Available subscription plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptionsCount}</div>
            <p className="text-xs text-muted-foreground">Excluding pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <BadgeCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeSubscribersCount}</div>
            <p className="text-xs text-muted-foreground">Currently active plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Subs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{scheduledSubscribersCount}</div>
            <p className="text-xs text-muted-foreground">Future purchased plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Subscriptions</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiredSubscribersCount}</div>
            <p className="text-xs text-muted-foreground">With expired status</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">All-time subscriptions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subscribers">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="subscribers">Subscriber List</TabsTrigger>
          <TabsTrigger value="plans">Manage Plans</TabsTrigger>
        </TabsList>
        <TabsContent value="subscribers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>All Subscriptions</CardTitle>
                <CardDescription>View and manage all active and inactive user subscriptions.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={subscriberRoleFilter} onValueChange={(val) => { setSubscriberRoleFilter(val); setCurrentSubPage(1); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="User Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={subscriberStatusFilter} onValueChange={(val) => { setSubscriberStatusFilter(val); setCurrentSubPage(1); }}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto no-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subscriber Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSubscriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          No subscriptions available.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedSubscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">{sub.subscriberName}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium 
                              ${sub.userType === 'vendor' ? 'bg-blue-100 text-blue-800' :
                                sub.userType === 'supplier' ? 'bg-purple-100 text-purple-800' :
                                  'bg-teal-100 text-teal-800'}`}>
                              {sub.userType ? sub.userType.charAt(0).toUpperCase() + sub.userType.slice(1) : '-'}
                            </span>
                          </TableCell>
                          <TableCell>{sub.planName}</TableCell>
                          <TableCell>{sub.startDate ? new Date(sub.startDate).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>{sub.endDate ? new Date(sub.endDate).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium
                              ${sub.status === 'Active' ? 'bg-green-100 text-green-800' :
                                sub.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                                  sub.status === 'Expired' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-700'
                              }`}>
                              {sub.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenSubModal('view', sub)}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleOpenRenewModal(sub)}
                            >
                              <RefreshCw className="h-4 w-4" />
                              <span className="sr-only">Renew</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                currentPage={currentSubPage}
                totalPages={totalSubPages}
                onPageChange={(page) => setCurrentSubPage(page)}
                onItemsPerPageChange={handleSubItemsPerPageChange}
                itemsPerPage={subItemsPerPage}
                totalItems={filteredAndSortedSubscribers.length} // Added for "Showing X to Y of Z"
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Manage Subscription Plans</CardTitle>
                  <CardDescription>Create, edit, and delete subscription plans.</CardDescription>
                </div>
                <Button onClick={() => handleOpenPlanModal('add')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Plan
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto overflow-y-auto max-h-[420px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Toggle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPlans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          No plans available.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedPlans.map((plan: Plan) => {
                        const isSuperAdmin = userRole?.toUpperCase() === 'SUPER_ADMIN' || userRole?.toUpperCase() === 'SUPERADMIN';
                        const isGlobalPlan = !(plan as any).regionId;
                        const isRegionalAdminOnGlobalPlan = !isSuperAdmin && isGlobalPlan;
                        // Use backend-computed isRegionallyDisabled (set by GET /subscription-plans for regional admins)
                        // This is already correctly evaluated server-side from the JWT region, no frontend ID parsing needed
                        const isRegionallyDisabled = !!(plan as any).isRegionallyDisabled;


                        return (
                          <TableRow key={plan._id}>
                            <TableCell className="font-medium">{plan.name}</TableCell>
                            <TableCell>
                              {plan.duration} {plan.durationType}
                            </TableCell>
                            <TableCell>
                              {plan.discountedPrice && plan.discountedPrice > 0 ? (
                                <>
                                  <span className="font-bold">₹{plan.discountedPrice}</span>
                                  <span className="text-xs text-muted-foreground line-through ml-1.5">₹{plan.price}</span>
                                </>
                              ) : (
                                <span>₹{plan.price}</span>
                              )}
                            </TableCell>

                            {/* Toggle cell */}
                            <TableCell>
                              {isRegionalAdminOnGlobalPlan ? (
                                // Regional Admin on a Global (Super Admin) Plan → toggle regional disable/enable
                                // Note: backend reads region from JWT token directly, no need to send regionId
                                <Switch
                                  checked={!isRegionallyDisabled}
                                  onCheckedChange={async () => {
                                    try {
                                      const action = isRegionallyDisabled ? 'enable_global' : 'disable_global';
                                      await updateExistingPlan({ _id: plan._id, action }).unwrap();
                                      toast.success(`Plan ${isRegionallyDisabled ? 'enabled' : 'disabled'} for your region`);
                                      refetch();
                                    } catch (err: any) {
                                      const msg = err?.data?.message || 'Failed to update regional status';
                                      toast.error(msg);
                                    }
                                  }}
                                />
                              ) : (
                                // Super Admin OR Regional Admin on their OWN regional plan
                                <Switch
                                  checked={plan.isAvailableForPurchase !== false}
                                  onCheckedChange={async (checked) => {
                                    try {
                                      await updateExistingPlan({ _id: plan._id, isAvailableForPurchase: checked }).unwrap();
                                      toast.success(`Plan is now ${checked ? 'visible' : 'hidden'} to users`);
                                      refetch();
                                    } catch (err) {
                                      toast.error('Failed to update plan visibility');
                                    }
                                  }}
                                />
                              )}
                            </TableCell>

                            {/* Status cell */}
                            <TableCell>
                              {isRegionallyDisabled ? (
                                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                                  DISABLED (REGION)
                                </span>
                              ) : plan.isAvailableForPurchase === false ? (
                                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-100">
                                  {(plan as any).regionId ? 'HIDDEN (REGIONAL)' : 'HIDDEN (GLOBAL)'}
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                  {(plan as any).status === 'Active' ? 'Active' : 'Inactive'}
                                </span>
                              )}
                            </TableCell>

                            {/* Region cell — styled like offers page */}
                            <TableCell>
                              {(plan as any).regionId ? (
                                <div className="flex flex-col gap-1">
                                  <span className="inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                    📍 REGIONAL
                                  </span>
                                  <span className="text-xs font-semibold text-gray-700 ml-1">
                                    {regions.find((r: any) => r._id?.toString() === (plan as any).regionId?.toString())?.name || 'Regional'}
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                  🌐 ALL REGIONS (GLOBAL)
                                </span>
                              )}
                            </TableCell>

                            {/* Actions — hide Edit/Delete for Regional Admin looking at global plans */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {!isRegionalAdminOnGlobalPlan && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleOpenPlanModal('edit', plan)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                      <span className="sr-only">Edit</span>
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => handleDeleteClick(plan)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Delete</span>
                                    </Button>
                                  </>
                                )}
                                {isRegionalAdminOnGlobalPlan && (
                                  <span className="text-[10px] text-muted-foreground italic px-2">Use toggle to manage</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                currentPage={currentPlanPage}
                totalPages={totalPlanPages}
                onPageChange={(page) => setCurrentPlanPage(page)}
                onItemsPerPageChange={handlePlanItemsPerPageChange}
                itemsPerPage={planItemsPerPage}
                totalItems={plans.length}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{modalType === 'edit' ? 'Edit Plan' : 'Add New Plan'}</DialogTitle>
            <DialogDescription>
              {modalType === 'edit' ? 'Update the details for this plan.' : 'Enter the details for the new plan.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePlan}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Plan Name
                </Label>
                <Input
                  id="name"
                  value={planForm.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="col-span-3"
                  placeholder="Enter plan name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Duration</Label>
                <div className="col-span-3 flex gap-2">
                  <Input
                    id="duration"
                    type="number"
                    value={planForm.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    className="w-[100px]"
                    placeholder="e.g., 30"
                    min="1"
                    max="99"
                  />
                  <Select
                    value={planForm.durationType}
                    onValueChange={(value) => handleInputChange('durationType', value)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      {durationTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  Price (₹)
                </Label>
                <Input
                  id="price"
                  type="text"
                  value={planForm.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  className="col-span-3"
                  placeholder="Enter price (e.g., 999 or 999.99)"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="discountedPrice" className="text-right">
                  Discounted Price (₹)
                  <span className="text-xs text-gray-500 block">(Optional)</span>
                </Label>
                <Input
                  id="discountedPrice"
                  type="text"
                  value={planForm.discountedPrice}
                  onChange={(e) => handleInputChange('discountedPrice', e.target.value)}
                  className="col-span-3"
                  placeholder="Enter discounted price (optional)"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Available for Purchase</Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="purchase-yes"
                      name="purchase-availability"
                      checked={planForm.isAvailableForPurchase}
                      onChange={() => handleInputChange('isAvailableForPurchase', 'true')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Label htmlFor="purchase-yes" className="ml-2">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <input
                      type="radio"
                      id="purchase-no"
                      name="purchase-availability"
                      checked={!planForm.isAvailableForPurchase}
                      onChange={() => handleInputChange('isAvailableForPurchase', 'false')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Label htmlFor="purchase-no" className="ml-2">No</Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Featured Plan</Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={planForm.isFeatured}
                    onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Label htmlFor="isFeatured">Show as "Most Popular" in CRM</Label>
                </div>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right mt-2">Plan Type</Label>
                <div className="col-span-3 flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="type-regular"
                      checked={planForm.planType === 'regular'}
                      onChange={() => handleInputChange('planType', 'regular')}
                    />
                    <Label htmlFor="type-regular">Regular</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="type-trial"
                      checked={planForm.planType === 'trial'}
                      onChange={() => handleInputChange('planType', 'trial')}
                    />
                    <Label htmlFor="type-trial">Trial</Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right mt-2">Target Roles</Label>
                <div className="col-span-3 grid grid-cols-2 gap-2">
                  {['vendor', 'supplier', 'doctor'].map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`role-${role}`}
                        checked={planForm.userTypes.includes(role as any)}
                        onChange={(e) => {
                          const newRoles = e.target.checked
                            ? [...planForm.userTypes, role as any]
                            : planForm.userTypes.filter(r => r !== role);
                          setPlanForm(prev => ({ ...prev, userTypes: newRoles }));
                        }}
                      />
                      <Label htmlFor={`role-${role}`} className="capitalize">{role}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right mt-2">Features</Label>
                <div className="col-span-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="new-feature"
                      placeholder="Add a feature..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = (e.currentTarget as HTMLInputElement).value.trim();
                          if (val) {
                            setPlanForm(prev => ({ ...prev, features: [...prev.features, val] }));
                            (e.currentTarget as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {planForm.features.map((f, i) => (
                      <span key={i} className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                        {f}
                        <button
                          type="button"
                          onClick={() => setPlanForm(prev => ({ ...prev, features: prev.features.filter((_, idx) => idx !== i) }))}
                          className="hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {(userRole === 'SUPER_ADMIN' || userRole === 'superadmin') && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="regionId" className="text-right">
                    Region
                  </Label>
                  <Select
                    value={planForm.regionId || 'global'}
                    onValueChange={(value) => handleInputChange('regionId', value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Global (Super Admin only)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      {regions.map((region: any) => (
                        <SelectItem key={region._id} value={region._id}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsPlanModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Plan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSubModalOpen} onOpenChange={setIsSubModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>
              View complete subscription information and history for {selectedSubscription?.subscriberName}
            </DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-6 py-4">
              {/* Current Plan Section */}
              <div className="rounded-lg border bg-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Current Plan</h3>
                  <div className={`
                    px-3 py-1 rounded-full text-xs font-semibold
                    ${selectedSubscription.status === 'Active'
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : selectedSubscription.status === 'Scheduled'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : selectedSubscription.status === 'Expired'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                    }
                  `}>
                    {selectedSubscription.status || 'Unknown'}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Subscriber Name</Label>
                    <p className="font-medium">{selectedSubscription.subscriberName}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Plan Name</Label>
                    <p className="font-medium">{selectedSubscription.planName || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Plan Price</Label>
                    <p className="font-medium text-primary font-bold">₹{(selectedSubscription as any).planPrice?.toLocaleString('en-IN') || '0'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Start Date</Label>
                    <p className="font-medium">
                      {selectedSubscription.startDate
                        ? new Date(selectedSubscription.startDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <p className="font-medium">
                      {selectedSubscription.endDate
                        ? new Date(selectedSubscription.endDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">User Type</Label>
                    <p className="font-medium capitalize">{selectedSubscription.userType || 'N/A'}</p>
                  </div>
                </div>

                {/* Days Remaining/Expired */}
                {selectedSubscription.endDate && (
                  <div className="pt-2 border-t">
                    {(() => {
                      const now = new Date();

                      // Normalize both to start of day for accurate calendar day difference
                      const startDateNormalized = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      const endDateNormalized = getSafeDate(selectedSubscription.endDate);

                      if (!endDateNormalized) return null;

                      const diffTime = endDateNormalized.getTime() - startDateNormalized.getTime();
                      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                      if (diffDays > 0) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-green-600">{diffDays} days</span> remaining
                          </p>
                        );
                      } else if (diffDays === 0) {
                        return (
                          <p className="text-sm text-orange-600 font-semibold">
                            Expires today
                          </p>
                        );
                      } else {
                        return (
                          <p className="text-sm text-muted-foreground">
                            Expired <span className="font-semibold text-red-600">{Math.abs(diffDays)} days ago</span>
                          </p>
                        );
                      }
                    })()}
                  </div>
                )}
              </div>

              {/* Subscription History Section */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Subscription History
                </h3>

                {selectedSubscription.history && selectedSubscription.history.length > 0 ? (
                  <div className="space-y-4">
                    {/* Timeline */}
                    <div className="relative space-y-6 pl-8 border-l-2 border-muted-foreground/20 ml-2">
                      {[...selectedSubscription.history].reverse().map((historyItem, index) => {
                        const hPlanId = typeof historyItem.plan === 'object' ? ((historyItem.plan as any)?.$oid || (historyItem.plan as any)?._id) : historyItem.plan;
                        const hPlan = allPlans.find(p => p._id === hPlanId || p.name === (historyItem.plan as any)?.name);
                        const hPrice = (hPlan?.discountedPrice && hPlan.discountedPrice > 0) ? hPlan.discountedPrice : (hPlan?.price || 0);
                        const hStatus = getSubStatus({ status: historyItem.status, endDate: historyItem.endDate, startDate: historyItem.startDate });

                        return (
                          <div key={index} className="relative">
                            {/* Timeline dot */}
                            <div className="absolute -left-[2.6rem] top-1.5 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                            </div>

                            {/* History card */}
                            <div className="bg-muted/30 rounded-xl p-4 border transition-colors hover:bg-muted/50">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-2 flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-sm text-foreground">
                                      {typeof historyItem.plan === 'object' && historyItem.plan !== null && (historyItem.plan as any).name
                                        ? (historyItem.plan as any).name
                                        : (allPlans.find(p => p._id === hPlanId || p.name === hPlanId)?.name || hPlanId || 'Unknown Plan')}
                                    </h4>
                                    <span className="text-sm font-black text-primary">
                                      ₹{hPrice.toLocaleString('en-IN')}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="flex flex-col">
                                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">From</span>
                                      <span className="text-xs font-semibold">
                                        {(() => {
                                          const dVal = getDateValue(historyItem.startDate);
                                          return dVal ? new Date(dVal).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
                                        })()}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Until</span>
                                      <span className="text-xs font-semibold">
                                        {(() => {
                                          const dVal = getDateValue(historyItem.endDate);
                                          return dVal ? new Date(dVal).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
                                        })()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div
                                  className={`
                                    px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight
                                    ${hStatus === 'Active'
                                      ? 'bg-green-100 text-green-700 border border-green-200'
                                      : hStatus === 'Scheduled'
                                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                        : hStatus === 'Expired'
                                          ? 'bg-red-100 text-red-700 border border-red-200'
                                          : 'bg-muted text-muted-foreground border border-muted-foreground/10'
                                    }
                                  `}
                                >
                                  {hStatus}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 border">
                    <p className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      No subscription history available yet
                    </p>
                    <p className="mt-2 text-xs">
                      Current plan: <span className="font-semibold">{selectedSubscription.planName || 'N/A'}</span>
                      {selectedSubscription.startDate && (
                        <span>
                          {' '}
                          (since{' '}
                          {new Date(selectedSubscription.startDate).toLocaleDateString('en-IN', {
                            month: 'short',
                            year: 'numeric',
                          })}
                          )
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsSubModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plan?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the plan "{selectedPlan?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew Subscription Dialog */}
      <Dialog open={isRenewModalOpen} onOpenChange={setIsRenewModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSubscription?.status === 'Active'
                ? `Schedule Next Plan for ${selectedSubscription?.subscriberName}`
                : `Renew Subscription for ${selectedSubscription?.subscriberName}`}
            </DialogTitle>
            <DialogDescription>
              {selectedSubscription?.status === 'Active'
                ? 'This user has an active subscription. The selected plan will be queued and will activate automatically when the current plan ends.'
                : `Select a plan to renew the subscription for ${selectedSubscription?.subscriberName}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            {plans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No plans available
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {plans.map((plan: Plan) => (
                  <div
                    key={plan._id}
                    onClick={() => setSelectedRenewalPlan(plan)}
                    className={`
                      cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-lg
                      ${selectedRenewalPlan?._id === plan._id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                  >
                    <div className="text-center">
                      <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center gap-2 mb-1">
                        {plan.discountedPrice && plan.discountedPrice > 0 ? (
                          <>
                            <span className="text-3xl font-bold">₹{plan.discountedPrice}</span>
                            <span className="text-sm text-muted-foreground line-through">₹{plan.price}</span>
                          </>
                        ) : (
                          <span className="text-3xl font-bold">₹{plan.price}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        per {plan.duration} {plan.durationType}
                      </p>
                    </div>
                    <ul className="space-y-2 mt-4">
                      {plan.features?.slice(0, 4).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                      {plan.features?.length > 4 && (
                        <li className="text-xs text-muted-foreground">
                          +{plan.features.length - 4} more features
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Payment method row — shown when a paid plan is selected */}
          {selectedRenewalPlan && (() => {
            const amt = selectedRenewalPlan.discountedPrice && selectedRenewalPlan.discountedPrice > 0
              ? selectedRenewalPlan.discountedPrice
              : selectedRenewalPlan.price;
            return amt > 0 ? (
              <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground border-t pt-3">
                <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Card</span>
                <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> UPI</span>
                <span className="flex items-center gap-1.5"><Landmark className="h-3.5 w-3.5" /> Net Banking</span>
                <span className="opacity-60 text-[10px]">Secured by Razorpay</span>
              </div>
            ) : null;
          })()}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsRenewModalOpen(false)} disabled={isRenewingManual || isProcessingPayment}>
              Cancel
            </Button>
            <Button
              onClick={handleRenewSubscription}
              disabled={!selectedRenewalPlan || isRenewingManual || isProcessingPayment}
              className="min-w-[160px]"
            >
              {(isRenewingManual || isProcessingPayment) ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Processing…
                </span>
              ) : selectedRenewalPlan ? (() => {
                const amt = selectedRenewalPlan.discountedPrice && selectedRenewalPlan.discountedPrice > 0
                  ? selectedRenewalPlan.discountedPrice
                  : selectedRenewalPlan.price;
                if (amt > 0) {
                  return (
                    <span className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      {selectedSubscription?.status === 'Active'
                        ? `Pay ₹${amt} & Schedule`
                        : `Pay ₹${amt} & Renew`}
                    </span>
                  );
                }
                return (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {selectedSubscription?.status === 'Active' ? 'Schedule Plan' : 'Renew Now'}
                  </span>
                );
              })() : 'Select a Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
