import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@repo/ui/dialog";
import { CardHeader, CardTitle } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select";
import { useUpdateSupplierMutation, useGetSubscriptionPlansQuery, useRenewPlanMutation } from "@repo/store/api";
import { toast } from "sonner";
import { Loader2, Upload, MapPin, Calendar, CheckCircle, AlertCircle, Clock, Zap, CreditCard, Smartphone, Landmark, RefreshCw } from "lucide-react";
import { Badge } from "@repo/ui/badge";
import { Card, CardContent } from "@repo/ui/card";

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

// Reusing the unified interface or defining relevant parts
interface Supplier {
  _id: string;
  firstName: string;
  lastName: string;
  shopName: string;
  email: string;
  mobile: string;
  address: string;
  city: string;
  pincode: string;
  supplierType: string;
  businessRegistrationNo?: string;
  location?: {
    type: string;
    coordinates: number[];
  };
  licenseFiles?: string[];
  profileImage?: string;
  subscription?: {
    plan?: any;
    status: string;
    startDate?: string;
    endDate?: string;
    history?: any[];
  };
}

interface SupplierEditFormProps {
  supplier: Supplier;
  isOpen: boolean;
  onClose: () => void;
  refetch: () => void;
  supplierTypes?: { id: string; name: string }[];
}

export default function SupplierEditForm({ supplier, isOpen, onClose, refetch, supplierTypes = [] }: SupplierEditFormProps) {
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState<Partial<Supplier>>({});
  const [updateSupplier, { isLoading: isUpdating }] = useUpdateSupplierMutation();

  // Subscription state
  const { data: plans = [] } = useGetSubscriptionPlansQuery(undefined);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  // const [renewPlan, { isLoading: isRenewing }] = useRenewPlanMutation(); // Using manual fetch for now as per previous pattern
  const [selectedRenewalPlan, setSelectedRenewalPlan] = useState<any>(null);
  const [isRenewingManual, setIsRenewingManual] = useState(false);

  const token = useSelector((state: any) => state.adminAuth?.token);

  useEffect(() => {
    if (supplier) {
      setFormData({
        firstName: supplier.firstName,
        lastName: supplier.lastName,
        shopName: supplier.shopName,
        email: supplier.email,
        mobile: supplier.mobile,
        address: supplier.address,
        city: supplier.city,
        pincode: supplier.pincode,
        supplierType: supplier.supplierType,
        businessRegistrationNo: supplier.businessRegistrationNo,
        location: supplier.location,
        profileImage: supplier.profileImage
      });
    }
  }, [supplier]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profileImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async () => {
    try {
      await updateSupplier({ id: supplier._id, ...formData }).unwrap();
      toast.success("Supplier updated successfully");
      refetch();
      // Don't close immediately, let user see success or close manually
    } catch (error: any) {
      console.error("Failed to update supplier:", error);
    }
  };

  const handleRenewSubscription = async () => {
    if (!selectedRenewalPlan) return;

    const planAmount = selectedRenewalPlan.discountedPrice && selectedRenewalPlan.discountedPrice > 0
      ? selectedRenewalPlan.discountedPrice
      : selectedRenewalPlan.price;

    const activateRenewal = async (paymentId?: string, paymentOrderId?: string) => {
      const res = await fetch('/api/admin/subscription-renewal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem("adminToken") || ''}`
        },
        body: JSON.stringify({
          userId: supplier._id,
          userType: 'supplier',
          planId: selectedRenewalPlan._id,
          ...(paymentId && { paymentId, paymentOrderId, paymentMethod: 'online' }),
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Renewal failed');

      if (data.success !== false) {
        const msg = data.schedulingMode === 'Scheduled'
          ? 'Plan scheduled — will activate after the current subscription ends.'
          : 'Subscription renewed successfully!';
        toast.success(msg);
      } else {
        throw new Error(data.message || "Failed to renew");
      }
      setIsRenewModalOpen(false);
      setSelectedRenewalPlan(null);
      refetch();
    };

    // Free / trial plan
    if (!planAmount || planAmount <= 0) {
      setIsRenewingManual(true);
      try {
        await activateRenewal();
      } catch (error: any) {
        console.error("Failed to renew subscription:", error);
        toast.error(error?.message || "Failed to process subscription. Please try again.");
      } finally {
        setIsRenewingManual(false);
      }
      return;
    }

    // Paid plan
    setIsRenewingManual(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Payment gateway failed to load. Please refresh and try again.');
        return;
      }

      const orderRes = await fetch('/api/admin/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem("adminToken") || ''}`
        },
        body: JSON.stringify({
          amount: planAmount,
          currency: 'INR',
          receipt: `admin_supp_${selectedRenewalPlan._id}_${Date.now()}`,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.id) {
        throw new Error(orderData.message || 'Failed to create payment order');
      }

      setIsRenewModalOpen(false);
      if (onClose) onClose(); // Close the outer dialog so Radix UI focus trap doesn't block Razorpay iframe

      await new Promise<void>((resolve, reject) => {
        let rzp: any;
        try {
          rzp = new (window as any).Razorpay({
            key: orderData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_SLBxzQHGTzUTCO',
            amount: Math.round(planAmount * 100),
            currency: 'INR',
            order_id: orderData.id,
            name: 'GlowVita Admin',
            description: `${selectedRenewalPlan.name} – ${selectedRenewalPlan.duration} ${selectedRenewalPlan.durationType} for ${supplier.shopName}`,
            image: 'https://glowvita.com/logo.png',
            theme: { color: '#7c3aed' },
            retry: { enabled: true, max_count: 3 },
            modal: {
              ondismiss: () => {
                setIsRenewModalOpen(true);
                reject(new Error('Payment cancelled by user'));
              },
              escape: true,
              backdropClose: false,
            },
            handler: async (response: any) => {
              try {
                const verifyRes = await fetch('/api/admin/payments/verify', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || localStorage.getItem("adminToken") || ''}`
                  },
                  body: JSON.stringify(response),
                });
                const verifyData = await verifyRes.json();
                if (!verifyData.success) throw new Error('Payment verification failed.');

                await activateRenewal(response.razorpay_payment_id, response.razorpay_order_id);
                resolve();
              } catch (err: any) {
                setIsRenewModalOpen(true);
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
      setIsRenewingManual(false);
    }
  };

  if (!supplier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Supplier: {supplier.shopName}</DialogTitle>
          <DialogDescription>Manage supplier details and subscription.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile Details</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
          </TabsList>

          {/* PROFILE TAB */}
          <TabsContent value="profile" className="space-y-4 py-4">
            <div className="flex flex-col items-center mb-6">
              <div className="relative group w-32 h-32 rounded-full overflow-hidden border-2 border-primary/20 bg-muted">
                {formData.profileImage ? (
                  <img
                    src={formData.profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Upload className="h-6 w-6 text-white" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Click to upload profile image</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={formData.firstName || ''}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={formData.lastName || ''}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Shop Name</Label>
                <Input
                  value={formData.shopName || ''}
                  onChange={(e) => handleChange('shopName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  disabled
                  value={formData.email || ''}
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input
                  value={formData.mobile || ''}
                  onChange={(e) => handleChange('mobile', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier Type</Label>
                <Select
                  value={formData.supplierType || ''}
                  onValueChange={(val) => handleChange('supplierType', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                    {supplierTypes.length === 0 && (
                      <>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Consumables">Consumables</SelectItem>
                        <SelectItem value="Furniture">Furniture</SelectItem>
                        <SelectItem value="Software">Software</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Business Reg. No</Label>
                <Input
                  value={formData.businessRegistrationNo || ''}
                  onChange={(e) => handleChange('businessRegistrationNo', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={formData.city || ''}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  value={formData.pincode || ''}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                />
              </div>
            </div>



            <div className="flex justify-end pt-4">
              <Button onClick={handleUpdate} disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </TabsContent>

          {/* SUBSCRIPTION TAB */}
          <TabsContent value="subscription" className="space-y-6 py-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Current Plan</CardTitle>
                  <Badge variant={supplier.subscription?.status === 'Active' ? 'default' : 'destructive'}>
                    {supplier.subscription?.status || 'No Active Plan'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block">Plan Name</span>
                    <span className="font-semibold text-lg">
                      {typeof supplier.subscription?.plan === 'object'
                        ? supplier.subscription.plan?.name
                        : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Expires On</span>
                    <span className="font-medium">
                      {supplier.subscription?.endDate
                        ? new Date(supplier.subscription.endDate).toLocaleDateString()
                        : '-'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <Button onClick={() => {
                      setSelectedRenewalPlan(null);
                      setIsRenewModalOpen(true);
                      loadRazorpayScript();
                    }} className="w-full sm:w-auto">
                      <Clock className="mr-2 h-4 w-4" />
                      Renew Subscription
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* History Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-md">History</h3>
              <div className="space-y-4">
                {supplier.subscription?.history?.length ? (
                  <div className="relative space-y-6 pl-8 border-l-2 border-muted-foreground/20 ml-2 mt-4 mb-4">
                    {[...supplier.subscription.history]
                      .sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                      .map((historyItem: any, index: number) => {
                        const planId = typeof historyItem.plan === 'object' && historyItem.plan !== null ? (historyItem.plan._id || historyItem.plan.$oid || historyItem.plan.id) : historyItem.plan;
                        const matchedPlan = plans.find((p: any) => p._id === planId || p.id === planId);
                        const planName = (typeof historyItem.plan === 'object' && historyItem.plan?.name) ? historyItem.plan.name : (matchedPlan?.name || 'Unknown Plan');
                        const hPrice = (matchedPlan?.discountedPrice && matchedPlan.discountedPrice > 0) ? matchedPlan.discountedPrice : (matchedPlan?.price || 0);

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
                                      {planName}
                                    </h4>
                                    <span className="text-sm font-black text-primary">
                                      ₹{hPrice.toLocaleString('en-IN')}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="flex flex-col">
                                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">From</span>
                                      <span className="text-xs font-semibold">
                                        {historyItem.startDate ? new Date(historyItem.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Until</span>
                                      <span className="text-xs font-semibold">
                                        {historyItem.endDate ? new Date(historyItem.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div
                                  className={`
                                    px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight
                                    ${historyItem.status === 'Active'
                                      ? 'bg-green-100 text-green-700 border border-green-200'
                                      : historyItem.status === 'Scheduled'
                                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                        : historyItem.status === 'Expired'
                                          ? 'bg-red-100 text-red-700 border border-red-200'
                                          : 'bg-muted text-muted-foreground border border-muted-foreground/10'
                                    }
                                  `}
                                >
                                  {historyItem.status}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 border text-center">
                    No subscription history available
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* RENEW MODAL */}
      <Dialog open={isRenewModalOpen} onOpenChange={setIsRenewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Select a Plan</Label>
            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
              {plans.map((plan: any) => (
                <div
                  key={plan._id}
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${selectedRenewalPlan?._id === plan._id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-accent'}`}
                  onClick={() => setSelectedRenewalPlan(plan)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{plan.name}</span>
                    <span className="font-bold">₹{plan.discountedPrice || plan.price}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{plan.duration} days</div>
                </div>
              ))}
            </div>

            {selectedRenewalPlan && (() => {
              const amt = selectedRenewalPlan.discountedPrice && selectedRenewalPlan.discountedPrice > 0
                ? selectedRenewalPlan.discountedPrice
                : selectedRenewalPlan.price;
              return amt > 0 ? (
                <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground border-t pt-3 mt-2">
                  <span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Card</span>
                  <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> UPI</span>
                  <span className="flex items-center gap-1.5"><Landmark className="h-3.5 w-3.5" /> Net Banking</span>
                  <span className="opacity-60 text-[10px]">Secured by Razorpay</span>
                </div>
              ) : null;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenewModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRenewSubscription} disabled={!selectedRenewalPlan || isRenewingManual} className="min-w-[160px]">
              {isRenewingManual ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Processing...
                </span>
              ) : selectedRenewalPlan ? (() => {
                const amt = selectedRenewalPlan.discountedPrice && selectedRenewalPlan.discountedPrice > 0
                  ? selectedRenewalPlan.discountedPrice
                  : selectedRenewalPlan.price;

                const isStatusActive = supplier.subscription?.status === 'Active' &&
                  (!supplier.subscription?.endDate || new Date(supplier.subscription.endDate) > new Date());

                if (amt > 0) {
                  return (
                    <span className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      {isStatusActive ? `Pay ₹${amt} & Schedule` : `Pay ₹${amt} & Renew`}
                    </span>
                  );
                }
                return (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {isStatusActive ? 'Schedule Plan' : 'Renew Now'}
                  </span>
                );
              })() : 'Select a Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
