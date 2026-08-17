"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@repo/ui/dialog';
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { Label } from '@repo/ui/label';
import { Calendar, User, Package, Star, CreditCard, PieChart, Scissors, FileText, CheckCircle, ShoppingBag, Clock, ChevronDown } from 'lucide-react';
import { Client, Review } from '../types';

const getVisitTypeBadge = (appt: any) => {
  const vType = (appt?.visitType || appt?.type || appt?.consultationType || '').toLowerCase();
  if (vType === 'physical' || vType.includes('clinic')) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">Clinic Visit</span>;
  }
  if (vType === 'video' || vType.includes('video')) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">Video Call</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Appointment</span>;
};

const AppointmentsSection = ({
  appointments,
  activeTab,
  setActiveTab,
  isPatientMode = false,
}: {
  appointments: any[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isPatientMode?: boolean;
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const clientAppts = appointments || [];

  const filteredAppts = clientAppts.filter((appt: any) => {
    if (!isPatientMode || filterType === 'all') return true;
    const vType = (appt?.visitType || appt?.type || appt?.consultationType || '').toLowerCase();
    if (filterType === 'physical') {
      return vType === 'physical' || vType.includes('clinic');
    }
    if (filterType === 'video') {
      return vType === 'video' || vType.includes('video');
    }
    if (filterType === 'appointment') {
      return vType === 'appointment' || (!vType);
    }
    return true;
  });

  const now = new Date();

  const upcoming = filteredAppts
    .filter((appt: any) => {
      const d = new Date(appt?.date || appt?.appointmentDate || 0);
      if (appt.startTime) {
        const [hours, minutes] = appt.startTime.split(':');
        d.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      return d > now;
    })
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const past = filteredAppts
    .filter((appt: any) => {
      const d = new Date(appt?.date || appt?.appointmentDate || 0);
      if (appt.startTime) {
        const [hours, minutes] = appt.startTime.split(':');
        d.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      return d <= now;
    })
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
          <h3 className="text-lg font-semibold text-gray-900 truncate">Appointments</h3>
        </div>

        {/* Filter Dropdown ONLY for Patients */}
        {isPatientMode && (
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground cursor-pointer hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">All Types</option>
              <option value="physical">Visit Clinic</option>
              <option value="video">Video Call</option>
              <option value="appointment">Appointment</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg border">
        <div className="border-b">
          <nav className="flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 py-3 text-sm font-medium px-2 min-w-0 ${activeTab === 'upcoming'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <span className="truncate">Upcoming ({upcoming.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex-1 py-3 text-sm font-medium px-2 min-w-0 ${activeTab === 'past'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <span className="truncate">Past ({past.length})</span>
            </button>
          </nav>
        </div>

        <div className="p-4">
          {activeTab === 'upcoming' && (
            <>
              {upcoming.length > 0 ? (
                <div className="space-y-3">
                  {upcoming.map((appt: any, i: number) => (
                    <div key={i} className="p-4 bg-background rounded-lg border">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground truncate">
                              {appt?.serviceName || appt?.service?.name || 'Service'}
                            </p>
                            {isPatientMode && getVisitTypeBadge(appt)}
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-1">
                            <span>{new Date(appt.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{appt.startTime || '--:--'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-foreground">
                            ₹{Number(appt?.totalAmount ?? appt?.amount ?? 0).toFixed(2)}
                          </p>
                          <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded capitalize">
                            {appt.status || 'Scheduled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No upcoming appointments</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'past' && (
            <>
              {past.length > 0 ? (
                <div className="space-y-3">
                  {past.map((appt: any, i: number) => (
                    <div key={i} className="p-4 bg-background rounded-lg border">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground truncate">
                              {appt?.serviceName || appt?.service?.name || 'Service'}
                            </p>
                            {isPatientMode && getVisitTypeBadge(appt)}
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-1">
                            <span>{new Date(appt.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{appt.startTime || '--:--'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-foreground">
                            ₹{Number(appt?.totalAmount ?? appt?.amount ?? 0).toFixed(2)}
                          </p>
                          <span
                            className={`inline-block mt-1 text-xs px-2 py-1 rounded capitalize ${appt.status === 'completed'
                              ? 'bg-green-500/10 text-green-700'
                              : appt.status === 'cancelled'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-muted text-muted-foreground'
                              }`}
                          >
                            {appt.status || 'Completed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No past appointments</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const formatDateStr = (dateStr?: string) => {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

interface ClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  activeTab: 'overview' | 'client-details' | 'appointments' | 'orders' | 'reviews' | 'payment-history';
  setActiveTab: (
    tab: 'overview' | 'client-details' | 'appointments' | 'orders' | 'reviews' | 'payment-history'
  ) => void;
  bookingsById: Map<string, number>;
  totalsById: Map<string, number>;
  completedById: Map<string, number>;
  cancelledById: Map<string, number>;
  profileClientAppointments: any[];
  profileClientOrders: any[];
  profileClientBillings: any[];
  allReviews: Review[];
  role?: string;
  isPatient?: boolean;
  handleAddAppointment: (client: Client) => void;
}

export default function ClientProfileModal({
  isOpen,
  onClose,
  client: profileClient,
  activeTab,
  setActiveTab,
  bookingsById,
  totalsById,
  completedById,
  cancelledById,
  profileClientAppointments,
  profileClientOrders,
  profileClientBillings,
  allReviews,
  role,
  isPatient,
  handleAddAppointment,
}: ClientProfileModalProps) {
  const [appointmentTab, setAppointmentTab] = useState('upcoming');
  const [paymentTab, setPaymentTab] = useState<'appointments' | 'orders'>('appointments');
  const [paymentCategoryFilter, setPaymentCategoryFilter] = useState<string>('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');

  const isPatientMode = isPatient || role === 'doctor';
  const entityNameTitle = isPatientMode ? 'Patient' : 'Client';
  const entityNameSingular = isPatientMode ? 'patient' : 'client';

  // Hide scrollbar styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .hide-scrollbar::-webkit-scrollbar,
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
      .hide-scrollbar,
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!profileClient) return null;

  const clientReviews = (allReviews || []).filter((review: any) => {
    // 1. Exact ID match
    const rUserId = String(review.userId || review.user?._id || review.client || "");
    if (profileClient?._id && rUserId && rUserId === String(profileClient._id)) {
      return true;
    }

    // 2. Name match
    const rUserName = (review.userName || review.user?.fullName || review.reviewerName || "").toLowerCase().trim();
    if (
      profileClient?.fullName &&
      rUserName &&
      rUserName === profileClient.fullName.toLowerCase().trim()
    ) {
      return true;
    }

    // 3. Email and Phone match
    const rEmail = (review.userEmail || review.user?.email || "").toLowerCase().trim();
    const cEmail = (profileClient?.email || "").toLowerCase().trim();
    if (cEmail && rEmail && cEmail === rEmail) return true;

    const rPhone = (review.userPhone || review.user?.phone || "").replace(/\D/g, "");
    const cPhone = (profileClient?.phone || "").replace(/\D/g, "");
    if (cPhone && rPhone && cPhone === rPhone) return true;

    return false;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] sm:h-[85vh] p-0 overflow-hidden flex flex-col">
        <div className="flex flex-col h-full">
          <DialogHeader className="p-4 border-b sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={
                    profileClient.profilePicture ||
                    `https://placehold.co/80x80.png?text=${profileClient.fullName?.[0] || '?'}`
                  }
                  alt={profileClient.fullName}
                  className="w-12 h-12 rounded-full object-cover border border-gray-200 sm:w-16 sm:h-16"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://placehold.co/80x80.png?text=${encodeURIComponent(profileClient.fullName?.[0] || '?')}`;
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-gray-900 truncate sm:text-xl">
                    {profileClient.fullName}
                  </h2>
                  <p className="text-sm text-gray-600 truncate">{profileClient.email}</p>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-full md:w-32 lg:w-36 xl:w-40 bg-gray-50 border-b md:border-b-0 md:border-r overflow-y-auto flex-shrink-0 flex md:flex-col">
              <div className="p-2 md:p-3 flex md:flex-col overflow-x-auto md:overflow-x-visible scrollbar-hide w-full">
                <div className="flex md:flex-col space-x-1 md:space-x-0 md:space-y-1 min-w-max md:min-w-0">
                  {[
                    { id: 'overview' as const, label: 'Overview', icon: PieChart },
                    { id: 'client-details' as const, label: `${entityNameTitle} Details`, icon: User },
                    { id: 'appointments' as const, label: 'Appointments', icon: Calendar, hide: role === 'supplier' },
                    { id: 'orders' as const, label: 'Orders', icon: Package, hide: isPatientMode },
                    { id: 'reviews' as const, label: 'Reviews', icon: Star },
                    { id: 'payment-history' as const, label: 'Payment History', icon: CreditCard },
                  ].filter(tab => !tab.hide).map((tab) => {
                    const IconComponent = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-col items-center justify-center py-3 px-4 rounded-md text-xs font-medium transition-colors md:w-full ${activeTab === tab.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                      >
                        <IconComponent className="h-5 w-5 mb-1" />
                        <span className="text-xs text-center whitespace-nowrap">
                          {tab.label}
                          {tab.id === 'orders' && ` (${(profileClientOrders?.length || 0) + (profileClientBillings?.length || 0)})`}
                          {tab.id === 'appointments' && ` (${profileClientAppointments.length})`}
                          {tab.id === 'reviews' && ` (${clientReviews.length})`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-gray-900">Overview</h3>
                  </div>
                  {isPatientMode ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="bg-card p-4 rounded-lg border min-h-[100px]">
                        <p className="text-sm text-muted-foreground">Total Sale</p>
                        <p className="text-2xl font-bold text-primary">
                          ₹{(totalsById.get(String(profileClient._id)) || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-card p-4 rounded-lg border min-h-[100px]">
                        <p className="text-sm text-muted-foreground">Total Visits</p>
                        <p className="text-2xl font-bold text-primary">
                          {bookingsById.get(String(profileClient._id)) || profileClient.totalBookings || 0}
                        </p>
                      </div>
                      <div className="bg-card p-4 rounded-lg border min-h-[100px]">
                        <p className="text-sm text-muted-foreground">Last Visit</p>
                        <p className="text-2xl font-bold text-foreground">
                          {formatDateStr(profileClient.lastVisit)}
                        </p>
                      </div>
                      <div className="bg-card p-4 rounded-lg border min-h-[100px]">
                        <p className="text-sm text-muted-foreground">Next Visit</p>
                        <p className="text-2xl font-bold text-foreground">
                          {formatDateStr(profileClient.nextVisit)}
                        </p>
                      </div>
                      <div className="bg-card p-4 rounded-lg border min-h-[100px]">
                        <p className="text-sm text-muted-foreground">Missed Appointment</p>
                        <p className="text-2xl font-bold text-destructive">
                          {cancelledById.get(String(profileClient._id)) || 0}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="bg-card p-4 rounded-lg border min-h-[100px]">
                        <p className="text-sm text-muted-foreground">Total Sale</p>
                        <p className="text-2xl font-bold text-primary">
                          ₹{(totalsById.get(String(profileClient._id)) || 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-card p-4 rounded-lg border min-h-[100px]">
                        <p className="text-sm text-muted-foreground">Total Visits</p>
                        <p className="text-2xl font-bold text-primary">
                          {bookingsById.get(String(profileClient._id)) || 0}
                        </p>
                      </div>
                      <div className="bg-card p-4 rounded-lg border min-h-[100px]">
                        <p className="text-sm text-muted-foreground">Completed</p>
                        <p className="text-2xl font-bold text-green-600">
                          {completedById.get(String(profileClient._id)) || 0}
                        </p>
                      </div>
                      <div className="bg-card p-4 rounded-lg border min-h-[100px]">
                        <p className="text-sm text-muted-foreground">Cancelled</p>
                        <p className="text-2xl font-bold text-destructive">
                          {cancelledById.get(String(profileClient._id)) || 0}
                        </p>
                      </div>
                      <div className="bg-card p-4 rounded-lg border min-h-[100px]">
                        <p className="text-sm text-muted-foreground">Total Reviews</p>
                        <p className="text-2xl font-bold text-primary">{clientReviews.length}</p>
                      </div>
                      <div className="bg-card p-4 rounded-lg border min-h-[100px]">
                        <p className="text-sm text-muted-foreground">Completed Orders</p>
                        <p className="text-2xl font-bold text-green-600">
                          {(profileClientOrders || []).filter((o: any) => o.status === 'Delivered').length}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'client-details' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary flex-shrink-0" />
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{entityNameTitle} Details</h3>
                  </div>

                  <div className="bg-card p-4 rounded-lg border">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                        <p className="text-base font-medium text-foreground mt-1">{profileClient.fullName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Email ID</Label>
                        <p className="text-base font-medium text-foreground mt-1 break-all">
                          {profileClient.email}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Mobile Number</Label>
                        <p className="text-base font-medium text-foreground mt-1">{profileClient.phone}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Gender</Label>
                        <p className="text-base font-medium text-foreground mt-1">
                          {profileClient.gender || 'Not specified'}
                        </p>
                      </div>
                      {profileClient.source !== 'online' && (
                        <>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Country</Label>
                            <p className="text-base font-medium text-foreground mt-1">
                              {profileClient.country || 'Not provided'}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Occupation</Label>
                            <p className="text-base font-medium text-foreground mt-1">
                              {profileClient.occupation || 'Not provided'}
                            </p>
                          </div>
                        </>
                      )}
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Birthday Date
                        </Label>
                        <p className="text-base font-medium text-foreground mt-1">
                          {profileClient.birthdayDate
                            ? new Date(profileClient.birthdayDate).toLocaleDateString()
                            : 'Not provided'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                        <p className="text-base font-medium text-foreground mt-1">
                          {profileClient.address || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appointments' && (
                <AppointmentsSection
                  appointments={profileClientAppointments}
                  activeTab={appointmentTab}
                  setActiveTab={setAppointmentTab}
                  isPatientMode={isPatientMode}
                />
              )}

              {activeTab === 'orders' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary flex-shrink-0" />
                    <h3 className="text-lg font-semibold text-gray-900 truncate">Orders</h3>
                  </div>

                  {profileClientOrders.length > 0 || profileClientBillings.length > 0 ? (
                    <div className="space-y-4">
                      {/* Combine Online Orders and CRM Billings */}
                      {[
                        ...(profileClientOrders || []).map(o => ({ ...o, _type: 'order' })),
                        ...(profileClientBillings || []).map(b => ({ ...b, _type: 'billing' }))
                      ]
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((item: any, i: number) => (
                          <div key={item._id || i} className="bg-card p-4 rounded-lg border hover:shadow-sm transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4 text-primary flex-shrink-0" />
                                  <p className="font-medium text-foreground truncate">
                                    {item._type === 'billing' ? "Sale" : "Order"} #{String(item.invoiceNumber || item._id || '').slice(-6).toUpperCase()}
                                  </p>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {new Date(item.createdAt).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${(item.status === 'Delivered' || item.paymentStatus === 'Completed')
                                      ? 'bg-green-500/10 text-green-700'
                                      : (item.status === 'Cancelled' || item.paymentStatus === 'Cancelled')
                                        ? 'bg-destructive/10 text-destructive'
                                        : 'bg-muted text-muted-foreground'
                                    }`}
                                >
                                  {item.status || item.paymentStatus || 'Pending'}
                                </span>
                                <p className="font-medium text-foreground">
                                  ₹{Number(item.totalAmount || 0).toFixed(2)}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {(item.items || []).map((prod: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b last:border-b-0 gap-2"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                                      {prod.image || prod.productImage ? (
                                        <img
                                          src={prod.image || prod.productImage}
                                          alt={prod.name}
                                          className="w-full h-full object-cover rounded"
                                        />
                                      ) : (
                                        <ShoppingBag className="w-4 h-4" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {prod.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Qty: {prod.quantity} {prod.price ? `@ ₹${prod.price}` : ''}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-sm font-medium text-foreground sm:text-right">
                                    ₹{Number(prod.totalPrice || (prod.price * prod.quantity) || 0).toFixed(2)}
                                  </p>
                                </div>
                              ))}
                            </div>
                            {item.billingType && (
                              <div className="mt-4 pt-2 flex justify-between items-center text-xs text-muted-foreground">
                                <span>Type: {item.billingType}</span>
                                <span>Method: {item.paymentMethod}</span>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="bg-card p-8 rounded-lg border text-center">
                      <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">No sales or orders yet</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        Records will appear here once the {entityNameSingular} makes a purchase.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-primary flex-shrink-0" />
                    <h3 className="text-lg font-semibold text-gray-900 truncate">Reviews</h3>
                  </div>

                  {clientReviews.length === 0 ? (
                    <div className="bg-card p-8 rounded-lg border text-center">
                      <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                        <Star className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">No reviews found</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        This {entityNameSingular} hasn't left any reviews for your services or products yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {clientReviews.map((review: Review) => {
                        const entityName =
                          review.entityDetails?.productName ||
                          review.entityDetails?.serviceName ||
                          review.entityDetails?.salonName ||
                          review.entityDetails?.name ||
                          'General Review';

                        return (
                          <div key={review._id} className="bg-card p-4 rounded-lg border">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${i < review.rating
                                        ? 'text-yellow-500 fill-yellow-500'
                                        : 'text-muted-foreground'
                                        }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs font-medium text-foreground">
                                  {review.rating}/5
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground sm:text-right">
                                {new Date(review.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                              <div
                                className={`p-1 rounded flex-shrink-0 ${review.entityType === 'product'
                                  ? 'bg-primary/10 text-primary'
                                  : review.entityType === 'service'
                                    ? 'bg-primary/10 text-primary'
                                    : review.entityType === 'doctor'
                                      ? 'bg-primary/10 text-primary'
                                      : 'bg-primary/10 text-primary'
                                  }`}
                              >
                                {review.entityType === 'product' ? (
                                  <Package className="w-4 h-4" />
                                ) : review.entityType === 'service' ? (
                                  <Scissors className="w-4 h-4" />
                                ) : review.entityType === 'doctor' ? (
                                  <User className="w-4 h-4" />
                                ) : (
                                  <Package className="w-4 h-4" />
                                )}
                              </div>
                              <p className="text-sm font-medium text-foreground truncate">
                                {entityName}
                              </p>
                            </div>

                            <div className="p-3 bg-muted rounded-lg text-sm text-foreground">
                              "{review.comment}"
                            </div>

                            {!review.isApproved && (
                              <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 font-medium bg-amber-500/10 px-2 py-1 rounded">
                                <Clock className="w-3 h-3" />
                                Pending Approval
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'payment-history' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary flex-shrink-0" />
                    <h3 className="text-lg font-semibold text-gray-900 truncate">Payment History</h3>
                  </div>

                  <div className="bg-primary text-primary-foreground p-4 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div>
                        <p className="text-sm font-medium opacity-80">Total Payment</p>
                        <h3 className="text-xl font-bold">
                          ₹{(totalsById.get(String(profileClient._id)) || 0).toFixed(2)}
                        </h3>
                      </div>
                      <CreditCard className="w-6 h-6 sm:self-end" />
                    </div>
                  </div>

                  <div className="bg-card rounded-lg border">
                    <div className="p-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                        <h4 className="font-medium text-foreground truncate">Transaction History</h4>
                      </div>

                      {/* 2 Filter Dropdowns ONLY for Patients */}
                      {isPatientMode && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* 1st Dropdown: Services / Category Filter */}
                          <div className="relative">
                            <select
                              value={paymentCategoryFilter}
                              onChange={(e) => setPaymentCategoryFilter(e.target.value)}
                              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground cursor-pointer hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            >
                              <option value="all">All Services</option>
                              <option value="services">Services</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          </div>

                          {/* 2nd Dropdown: Visit / Consultation Type Filter */}
                          <div className="relative">
                            <select
                              value={paymentTypeFilter}
                              onChange={(e) => setPaymentTypeFilter(e.target.value)}
                              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground cursor-pointer hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            >
                              <option value="all">All Types</option>
                              <option value="physical">Visit Clinic</option>
                              <option value="video">Video Call</option>
                              <option value="appointment">Appointment</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sub-tabs for Clients (Non-Patient Mode) */}
                    {!isPatientMode && (
                      <div className="border-b">
                        <nav className="flex" aria-label="Tabs">
                          <button
                            onClick={() => setPaymentTab('appointments')}
                            className={`flex-1 py-3 text-sm font-medium px-2 min-w-0 ${paymentTab === 'appointments'
                                ? 'text-primary border-b-2 border-primary'
                                : 'text-muted-foreground hover:text-foreground'
                              }`}
                          >
                            <span className="truncate">Appointments</span>
                          </button>
                          <button
                            onClick={() => setPaymentTab('orders')}
                            className={`flex-1 py-3 text-sm font-medium px-2 min-w-0 ${paymentTab === 'orders'
                                ? 'text-primary border-b-2 border-primary'
                                : 'text-muted-foreground hover:text-foreground'
                              }`}
                          >
                            <span className="truncate">Orders</span>
                          </button>
                        </nav>
                      </div>
                    )}

                    <div className="p-3 space-y-3">
                      {(() => {
                        let items: any[] = [];

                        if (isPatientMode) {
                          const apptItems = profileClientAppointments
                            .filter((appt: any) => String(appt?.status || '').toLowerCase() === 'completed')
                            .map(i => ({ ...i, _type: 'appointment' }));

                          const billItems = profileClientBillings
                            .filter((bill: any) => String(bill?.paymentStatus || '').toLowerCase() === 'completed')
                            .map(i => ({ ...i, _type: 'billing' }));

                          items = [...apptItems, ...billItems];

                          // 1st Filter: Category
                          if (paymentCategoryFilter === 'services') {
                            items = items.filter(i => i._type === 'appointment' || i._type === 'billing');
                          }

                          // 2nd Filter: Visit / Consultation Type
                          if (paymentTypeFilter !== 'all') {
                            items = items.filter(item => {
                              const vType = (item?.visitType || item?.type || item?.consultationType || '').toLowerCase();
                              if (paymentTypeFilter === 'physical') {
                                return vType === 'physical' || vType.includes('clinic');
                              }
                              if (paymentTypeFilter === 'video') {
                                return vType === 'video' || vType.includes('video');
                              }
                              if (paymentTypeFilter === 'appointment') {
                                return vType === 'appointment' || (!vType && item._type === 'appointment');
                              }
                              return true;
                            });
                          }
                        } else {
                          // Standard Client logic
                          if (paymentTab === 'appointments') {
                            items = profileClientAppointments
                              .filter((appt: any) => String(appt?.status || '').toLowerCase() === 'completed')
                              .map(i => ({ ...i, _type: 'appointment' }));
                          } else {
                            const billItems = profileClientBillings
                              .filter((bill: any) => String(bill?.paymentStatus || '').toLowerCase() === 'completed')
                              .map(i => ({ ...i, _type: 'billing' }));
                            const orderItems = profileClientOrders
                              .filter((order: any) => String(order?.paymentStatus || '').toLowerCase() === 'completed' || String(order?.status || '').toLowerCase() === 'delivered')
                              .map(i => ({ ...i, _type: 'order' }));
                            items = [...billItems, ...orderItems];
                          }
                        }

                        items.sort((a: any, b: any) => {
                          const ad = new Date(a?.date || a?.createdAt || 0).getTime();
                          const bd = new Date(b?.date || b?.createdAt || 0).getTime();
                          return bd - ad;
                        });

                        if (items.length === 0) {
                          return (
                            <div className="text-center py-8">
                              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                                <FileText className="w-6 h-6 text-muted-foreground" />
                              </div>
                              <p className="text-muted-foreground font-medium">No payment history</p>
                              <p className="text-sm text-muted-foreground/70 mt-1">
                                Completed transaction records will be listed here.
                              </p>
                            </div>
                          );
                        }

                        return items.map((item: any, idx: number) => {
                          const rawDate = item?.date || item?.createdAt || '';
                          const d = rawDate ? new Date(rawDate) : null;
                          const dateStr = d
                            ? d.toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                            : '';
                          const timeStr =
                            item?.startTime || (d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
                          const amount =
                            Number(item?.finalAmount ?? item?.totalAmount ?? item?.amount ?? item?.price ?? 0) || 0;
                          
                          let title = '';
                          if (item._type === 'billing') title = item.billingType || 'Sale';
                          else if (item._type === 'order') title = 'Order';
                          else title = item?.serviceName || item?.service?.name || 'Appointment';

                          let orderDetails = null;
                          if (item._type === 'order' && Array.isArray(item.items) && item.items.length > 0) {
                            orderDetails = item.items.map((i: any) => `${i.name || i.productName || 'Product'} (x${i.quantity || 1})`).join(', ');
                          } else if (item._type === 'billing') {
                            const bItems: string[] = [];
                            if (Array.isArray(item.services)) {
                              item.services.forEach((s: any) => bItems.push(`${s.serviceName || s.name || 'Service'}`));
                            }
                            if (Array.isArray(item.products)) {
                              item.products.forEach((p: any) => bItems.push(`${p.productName || p.name || 'Product'} (x${p.quantity || 1})`));
                            }
                            if (bItems.length > 0) orderDetails = bItems.join(', ');
                          }

                          return (
                            <div key={item?._id || item?.id || idx} className="p-4 bg-background rounded-lg border">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-medium text-foreground truncate">
                                      {title} {(item.invoiceNumber || (item._type === 'order' && item._id)) && `(#${String(item.invoiceNumber || item._id).slice(-6).toUpperCase()})`}
                                    </p>
                                    {isPatientMode && getVisitTypeBadge(item)}
                                  </div>
                                  {orderDetails && (
                                    <p className="text-sm text-foreground/80 mt-1 line-clamp-2">
                                      {orderDetails}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <p>{dateStr}</p>
                                    <span>•</span>
                                    <p>{timeStr}</p>
                                    {item.paymentMethod && (
                                      <>
                                        <span>•</span>
                                        <p>{item.paymentMethod}</p>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                                      {item?._type === 'billing' || item?._type === 'order' ? "Paid" : "Completed"}
                                    </span>
                                    <p className="font-medium text-foreground">₹{amount.toFixed(2)}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 border-t">
            <div className="flex flex-col-reverse gap-2 w-full sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onClose} className="order-2 sm:order-2">
                Close
              </Button>
              {activeTab === 'appointments' && role !== 'supplier' && (
                <Button
                  variant="default"
                  onClick={() => handleAddAppointment(profileClient)}
                  className="order-1 sm:order-1"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Appointment
                </Button>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}