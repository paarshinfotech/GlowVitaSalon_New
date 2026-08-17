"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  useGetPatientsQuery,
  useCreatePatientMutation,
  useUpdatePatientMutation,
  useDeletePatientMutation,
  useGetAppointmentsQuery,
  useGetCrmReviewsQuery,
  useGetCrmClientOrdersQuery,
  useGetCrmOrdersQuery,
  useGetBillingRecordsQuery,
} from '@repo/store/api';
import { useCrmAuth } from '@/hooks/useCrmAuth';
import ClientProfileModal from '../clients/components/ClientProfileModal';
import { Client } from '../clients/types';
import { Button } from "@repo/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/table";
import { Pagination } from "@repo/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@repo/ui/dialog';
import { Input } from '@repo/ui/input';
import { Textarea } from '@repo/ui/textarea';
import { Label } from '@repo/ui/label';
import {
  Plus, Search, FileDown, Eye, Edit, Trash2,
  Users, UserPlus, UserX, HeartPulse,
  Building2, Video, CalendarCheck, User, ChevronDown
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

type Patient = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  lastConsultation?: string;
  totalConsultations?: number;
  status?: 'Active' | 'Inactive' | 'New';
  birthdayDate?: string;
  gender?: 'Male' | 'Female' | 'Other';
  country?: string;
  occupation?: string;
  profileImage?: string;
  address?: string;
  notes?: string;
  lastVisit?: string;
  nextVisit?: string;
  totalVisits?: number;
  visitType?: 'physical' | 'video' | 'appointment';
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'Active': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'Inactive': return 'bg-gray-100 text-gray-600 border border-gray-200';
    case 'New': return 'bg-blue-100 text-blue-700 border border-blue-200';
    default: return 'bg-blue-100 text-blue-700 border border-blue-200';
  }
};

const getVisitTypeLabel = (visitType?: string) => {
  switch (visitType) {
    case 'physical': return { label: 'Clinic Visit', color: 'bg-violet-100 text-violet-700' };
    case 'video': return { label: 'Video Call', color: 'bg-sky-100 text-sky-700' };
    case 'appointment': return { label: 'Appointment', color: 'bg-amber-100 text-amber-700' };
    default: return { label: 'Appointment', color: 'bg-amber-100 text-amber-700' };
  }
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

type FilterType = 'all' | 'physical' | 'video' | 'appointment';

const FILTER_TABS: { key: FilterType; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'All', icon: Users },
  { key: 'physical', label: 'Visit Clinic', icon: Building2 },
  { key: 'video', label: 'Video Call', icon: Video },
  { key: 'appointment', label: 'Appointment', icon: CalendarCheck },
];

export default function PatientsPage() {
  const { user, role } = useCrmAuth();
  const vendorId = user?.vendorId || user?._id;

  const { data: patients = [], isLoading, isError, refetch } = useGetPatientsQuery(void 0, { refetchOnMountOrArgChange: true });
  const [createPatient] = useCreatePatientMutation();
  const [updatePatient] = useUpdatePatientMutation();
  const [deletePatient] = useDeletePatientMutation();

  const { data: appointmentsResponse } = useGetAppointmentsQuery({ vendorId }, { skip: !user?._id });
  const { data: reviewsResponse } = useGetCrmReviewsQuery({ filter: "all", entityType: "all" }, { skip: !user?._id });
  const { data: clientOrdersResponse } = useGetCrmClientOrdersQuery({}, { skip: !user?._id });
  const { data: generalOrdersResponse } = useGetCrmOrdersQuery({}, { skip: !user?._id });
  const { data: billingResponse } = useGetBillingRecordsQuery({ vendorId }, { skip: !vendorId });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Profile View modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedPatientForView, setSelectedPatientForView] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'client-details' | 'appointments' | 'orders' | 'reviews' | 'payment-history'>('overview');

  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', birthdayDate: '',
    gender: '', country: '', occupation: '', profileImage: '', address: '', notes: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Full Name
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required.';
    } else if (!/^[A-Za-z\s]+$/.test(formData.fullName.trim())) {
      errors.fullName = 'Only letters and spaces are allowed.';
    } else if (formData.fullName.trim().length < 3) {
      errors.fullName = 'Full name must be at least 3 characters.';
    } else if (formData.fullName.trim().length > 100) {
      errors.fullName = 'Full name cannot exceed 100 characters.';
    }

    // Email
    if (!formData.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    // Phone
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(formData.phone.trim())) {
      errors.phone = 'Phone number must contain exactly 10 digits.';
    }

    // Country
    if (!formData.country.trim()) {
      errors.country = 'Please select a country.';
    }

    // Birthday
    if (formData.birthdayDate) {
      const bday = new Date(formData.birthdayDate);
      if (isNaN(bday.getTime())) {
        errors.birthdayDate = 'Please enter a valid date.';
      } else if (bday > new Date()) {
        errors.birthdayDate = 'Birthday cannot be a future date.';
      }
    }

    // Gender
    if (!formData.gender) {
      errors.gender = 'Please select a gender.';
    }

    // Occupation (optional but max length)
    if (formData.occupation.trim().length > 100) {
      errors.occupation = 'Occupation cannot exceed 100 characters.';
    }

    // Address (optional but max length)
    if (formData.address.trim().length > 500) {
      errors.address = 'Address cannot exceed 500 characters.';
    }

    // Notes (optional but max length)
    if (formData.notes.trim().length > 1000) {
      errors.notes = 'Notes cannot exceed 1000 characters.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => { refetch(); }, [refetch]);

  const filteredPatients = useMemo(() => {
    return patients.filter((patient: Patient) => {
      const matchesSearch =
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone.includes(searchTerm);
      const matchesFilter =
        activeFilter === 'all' ||
        patient.visitType === activeFilter ||
        (activeFilter === 'appointment' && !patient.visitType);
      return matchesSearch && matchesFilter;
    });
  }, [patients, searchTerm, activeFilter]);

  const lastItemIndex = currentPage * itemsPerPage;
  const firstItemIndex = lastItemIndex - itemsPerPage;
  const currentItems = filteredPatients.slice(firstItemIndex, lastItemIndex);
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);

  const handleOpenModal = (patient?: Patient) => {
    if (patient) {
      setFormData({
        fullName: patient.name, email: patient.email, phone: patient.phone,
        birthdayDate: patient.birthdayDate || '', gender: patient.gender || '',
        country: patient.country || '', occupation: patient.occupation || '',
        profileImage: patient.profileImage || '', address: patient.address || '',
        notes: patient.notes || ''
      });
    } else {
      setFormData({ fullName: '', email: '', phone: '', birthdayDate: '', gender: '', country: '', occupation: '', profileImage: '', address: '', notes: '' });
    }
    setFormErrors({});
    setSelectedPatient(patient || null);
    setIsModalOpen(true);
  };

  const handleViewPatient = (patient: Patient) => {
    setSelectedPatientForView(patient);
    setActiveTab('overview');
    setIsProfileModalOpen(true);
  };

  const handleDeleteClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedPatient) {
      try {
        await deletePatient(selectedPatient._id || selectedPatient.id).unwrap();
        toast.success('Patient deleted successfully!');
        setIsDeleteModalOpen(false);
        setSelectedPatient(null);
      } catch {
        toast.error('Failed to delete patient');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Clear error on change
    setFormErrors(prev => ({ ...prev, [name]: '' }));
    if (name === 'phone') {
      setFormData(prev => ({ ...prev, phone: value.replace(/\D/g, '').slice(0, 10) }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormErrors(prev => ({ ...prev, [name]: '' }));
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFormErrors(prev => ({ ...prev, profileImage: 'Only JPG, JPEG, PNG, and WEBP files are allowed.' }));
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormErrors(prev => ({ ...prev, profileImage: 'Image size must not exceed 5MB.' }));
      e.target.value = '';
      return;
    }

    setFormErrors(prev => ({ ...prev, profileImage: '' }));
    const reader = new FileReader();
    reader.onloadend = () => setFormData(prev => ({ ...prev, profileImage: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSavePatient = async () => {
    if (!validateForm()) {
      return;
    }
    const existingPatient = patients.find((p: Patient) => {
      if (selectedPatient) return (p._id !== selectedPatient._id) && (p.email === formData.email || p.phone === formData.phone);
      return p.email === formData.email || p.phone === formData.phone;
    });
    if (existingPatient) {
      toast.error('A patient with this email or phone already exists.');
      return;
    }
    const patientData = {
      name: formData.fullName, email: formData.email, phone: formData.phone,
      birthdayDate: formData.birthdayDate, gender: formData.gender, country: formData.country,
      occupation: formData.occupation, profileImage: formData.profileImage,
      address: formData.address, notes: formData.notes
    };
    try {
      if (selectedPatient) {
        await updatePatient({ id: selectedPatient._id || selectedPatient.id, ...patientData }).unwrap();
        toast.success('Patient updated successfully!');
      } else {
        await createPatient(patientData).unwrap();
        toast.success('New patient created successfully!');
      }
      setIsModalOpen(false);
      setFormErrors({});
      setFormData({ fullName: '', email: '', phone: '', birthdayDate: '', gender: '', country: '', occupation: '', profileImage: '', address: '', notes: '' });
    } catch {
      toast.error('Failed to save patient. Please try again.');
    }
  };

  // Calculations for ClientProfileModal
  const appointments: any[] = useMemo(() => {
    const r: any = appointmentsResponse;
    if (Array.isArray(r)) return r;
    if (Array.isArray(r?.data)) return r.data;
    if (Array.isArray(r?.appointments)) return r.appointments;
    if (Array.isArray(r?.data?.appointments)) return r.data.appointments;
    return [];
  }, [appointmentsResponse]);

  const billings: any[] = useMemo(() => {
    const r: any = billingResponse;
    if (Array.isArray(r)) return r;
    if (Array.isArray(r?.data)) return r.data;
    if (Array.isArray(r?.billings)) return r.billings;
    return [];
  }, [billingResponse]);

  const allReviews: any[] = useMemo(() => {
    const r: any = reviewsResponse;
    if (Array.isArray(r)) return r;
    if (r?.success && Array.isArray(r?.reviews)) return r.reviews;
    if (Array.isArray(r?.reviews)) return r.reviews;
    if (Array.isArray(r?.data?.reviews)) return r.data.reviews;
    return [];
  }, [reviewsResponse]);

  const allOrders: any[] = useMemo(() => {
    let combined: any[] = [];
    const r1: any = clientOrdersResponse;
    if (Array.isArray(r1)) combined = [...combined, ...r1];
    else if (Array.isArray(r1?.data)) combined = [...combined, ...r1.data];

    const r2: any = generalOrdersResponse;
    if (Array.isArray(r2)) combined = [...combined, ...r2];
    else if (Array.isArray(r2?.data)) combined = [...combined, ...r2.data];
    return combined;
  }, [clientOrdersResponse, generalOrdersResponse]);

  const { bookingsById, totalsById, completedById, cancelledById } = useMemo(() => {
    const countsById = new Map<string, number>();
    const totalsById = new Map<string, number>();
    const completedCountById = new Map<string, number>();
    const cancelledCountById = new Map<string, number>();

    const emailToPatientId = new Map<string, string>();
    const phoneToPatientId = new Map<string, string>();
    const nameToPatientId = new Map<string, string>();
    const allPatientIds = new Set<string>();

    patients.forEach((p: Patient) => {
      const id = String(p._id || p.id);
      allPatientIds.add(id);
      if (p.email) emailToPatientId.set(p.email.toLowerCase().trim(), id);
      if (p.phone) phoneToPatientId.set(p.phone.replace(/\D/g, ""), id);
      if (p.name) nameToPatientId.set(p.name.toLowerCase().trim(), id);
    });

    (appointments || []).forEach((appt: any) => {
      const rawPatientId = appt?.patientId || appt?.client?._id || appt?.client || appt?.clientId;
      let patientId = rawPatientId != null ? String(rawPatientId) : "";

      if (!patientId || !allPatientIds.has(patientId)) {
        const apptEmail = (appt?.email || appt?.client?.email || appt?.clientEmail || "").toLowerCase().trim();
        const apptPhone = (appt?.phoneNumber || appt?.phone || appt?.client?.phone || appt?.clientPhone || "").replace(/\D/g, "");
        const apptName = (appt?.patientName || appt?.name || appt?.client?.name || appt?.clientName || "").toLowerCase().trim();

        if (apptEmail && emailToPatientId.has(apptEmail)) {
          patientId = emailToPatientId.get(apptEmail)!;
        } else if (apptPhone && phoneToPatientId.has(apptPhone)) {
          patientId = phoneToPatientId.get(apptPhone)!;
        } else if (apptName && nameToPatientId.has(apptName)) {
          patientId = nameToPatientId.get(apptName)!;
        }
      }

      if (!patientId) return;

      const amount = Number(appt?.finalAmount ?? appt?.totalAmount ?? appt?.amount ?? appt?.price ?? 0) || 0;
      const status = String(appt?.status || "").toLowerCase();

      countsById.set(patientId, (countsById.get(patientId) || 0) + 1);

      if (status === "completed") {
        totalsById.set(patientId, (totalsById.get(patientId) || 0) + amount);
        completedCountById.set(patientId, (completedCountById.get(patientId) || 0) + 1);
      } else if (status === "cancelled") {
        cancelledCountById.set(patientId, (cancelledCountById.get(patientId) || 0) + 1);
      }
    });

    (billings || []).forEach((bill: any) => {
      const rawPatientId = bill?.clientId?._id || bill?.clientId;
      let patientId = rawPatientId != null ? String(rawPatientId) : "";

      if (!patientId || !allPatientIds.has(patientId)) {
        const billEmail = (bill?.clientInfo?.email || "").toLowerCase().trim();
        const billPhone = (bill?.clientInfo?.phone || "").replace(/\D/g, "");
        const billName = (bill?.clientInfo?.fullName || "").toLowerCase().trim();

        if (billEmail && emailToPatientId.has(billEmail)) {
          patientId = emailToPatientId.get(billEmail)!;
        } else if (billPhone && phoneToPatientId.has(billPhone)) {
          patientId = phoneToPatientId.get(billPhone)!;
        } else if (billName && nameToPatientId.has(billName)) {
          patientId = nameToPatientId.get(billName)!;
        }
      }

      if (!patientId) return;

      const amount = Number(bill?.totalAmount ?? 0);
      const status = String(bill?.paymentStatus || "").toLowerCase();

      if (bill.billingType === "Counter Bill" || !bill.appointmentId) {
        countsById.set(patientId, (countsById.get(patientId) || 0) + 1);

        if (status === "completed") {
          totalsById.set(patientId, (totalsById.get(patientId) || 0) + amount);
          completedCountById.set(patientId, (completedCountById.get(patientId) || 0) + 1);
        }
      }
    });

    return {
      bookingsById: countsById,
      totalsById,
      completedById: completedCountById,
      cancelledById: cancelledCountById,
    };
  }, [appointments, billings, patients]);

  const profileClient: Client | null = useMemo(() => {
    if (!selectedPatientForView) return null;
    const pId = String(selectedPatientForView._id || selectedPatientForView.id || '');
    return {
      _id: pId,
      fullName: selectedPatientForView.name || '',
      email: selectedPatientForView.email || '',
      phone: selectedPatientForView.phone || '',
      birthdayDate: selectedPatientForView.birthdayDate || '',
      gender: (selectedPatientForView.gender as 'Male' | 'Female' | 'Other') || 'Other',
      country: selectedPatientForView.country || '',
      occupation: selectedPatientForView.occupation || '',
      profilePicture: selectedPatientForView.profileImage || '',
      address: selectedPatientForView.address || '',
      preferences: selectedPatientForView.notes || '',
      lastVisit: selectedPatientForView.lastVisit || selectedPatientForView.lastConsultation || '',
      totalBookings: selectedPatientForView.totalVisits || selectedPatientForView.totalConsultations || 0,
      totalSpent: totalsById.get(pId) || 0,
      status: (selectedPatientForView.status as 'Active' | 'Inactive' | 'New') || 'New',
      source: 'offline',
    };
  }, [selectedPatientForView, totalsById]);

  const profileClientAppointments = useMemo(() => {
    if (!selectedPatientForView || !appointments) return [];
    const targetId = String(selectedPatientForView._id || selectedPatientForView.id || '');
    const targetEmail = (selectedPatientForView.email || "").toLowerCase().trim();
    const targetPhone = (selectedPatientForView.phone || "").replace(/\D/g, "");
    const targetName = (selectedPatientForView.name || "").toLowerCase().trim();

    return appointments.filter((appt: any) => {
      const rawId = appt?.patientId || appt?.client?._id || appt?.client || appt?.clientId;
      const apptId = rawId != null ? String(rawId) : "";
      if (apptId && apptId === targetId) return true;

      const apptEmail = (appt?.email || appt?.client?.email || appt?.clientEmail || "").toLowerCase().trim();
      if (targetEmail && apptEmail && targetEmail === apptEmail) return true;

      const apptPhone = (appt?.phoneNumber || appt?.phone || appt?.client?.phone || appt?.clientPhone || "").replace(/\D/g, "");
      if (targetPhone && apptPhone && targetPhone === apptPhone) return true;

      const apptName = (appt?.patientName || appt?.name || appt?.client?.name || appt?.clientName || "").toLowerCase().trim();
      if (targetName && apptName && targetName === apptName) return true;

      return false;
    });
  }, [selectedPatientForView, appointments]);

  const profileClientOrders = useMemo(() => {
    if (!selectedPatientForView || !allOrders) return [];
    const targetId = String(selectedPatientForView._id || selectedPatientForView.id || '');
    const targetEmail = (selectedPatientForView.email || "").toLowerCase().trim();
    const targetPhone = (selectedPatientForView.phone || "").replace(/\D/g, "");
    const targetName = (selectedPatientForView.name || "").toLowerCase().trim();

    return allOrders.filter((order: any) => {
      const rawUserId = order.userId?._id || order.userId;
      const orderUserId = rawUserId != null ? String(rawUserId) : "";
      if (orderUserId && orderUserId === targetId) return true;

      const orderEmail = (order.email || "").toLowerCase().trim();
      if (targetEmail && orderEmail && targetEmail === orderEmail) return true;

      const orderPhone = (order.contactNumber || order.phone || "").replace(/\D/g, "");
      if (targetPhone && orderPhone && targetPhone === orderPhone) return true;

      const orderName = (order.customerName || order.user?.fullName || order.name || "").toLowerCase().trim();
      if (targetName && orderName && targetName === orderName) return true;

      return false;
    });
  }, [selectedPatientForView, allOrders]);

  const profileClientBillings = useMemo(() => {
    if (!selectedPatientForView || !billings) return [];
    const targetId = String(selectedPatientForView._id || selectedPatientForView.id || '');
    const targetEmail = (selectedPatientForView.email || "").toLowerCase().trim();
    const targetPhone = (selectedPatientForView.phone || "").replace(/\D/g, "");
    const targetName = (selectedPatientForView.name || "").toLowerCase().trim();

    return billings.filter((bill: any) => {
      const rawId = bill?.clientId?._id || bill?.clientId;
      const billClientId = rawId != null ? String(rawId) : "";
      if (billClientId && billClientId === targetId) return true;

      const billEmail = (bill?.clientInfo?.email || "").toLowerCase().trim();
      if (targetEmail && billEmail && targetEmail === billEmail) return true;

      const billPhone = (bill?.clientInfo?.phone || "").replace(/\D/g, "");
      if (targetPhone && billPhone && targetPhone === billPhone) return true;

      const billName = (bill?.clientInfo?.fullName || "").toLowerCase().trim();
      if (targetName && billName && targetName === billName) return true;

      return false;
    });
  }, [selectedPatientForView, billings]);

  // Stat counts
  const newPatientsCount = useMemo(() => patients.filter((p: Patient) => p.status === 'New').length, [patients]);
  const totalConsultations = useMemo(() => patients.reduce((acc: number, p: Patient) => acc + (p.totalVisits || p.totalConsultations || 0), 0), [patients]);
  const inactiveCount = useMemo(() => patients.filter((p: Patient) => p.status === 'Inactive').length, [patients]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">Loading patients...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Error loading patients. Please try again.</p>
          <Button onClick={() => refetch()} variant="outline">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Header */}
        <div className="mb-2">
          <h1 className="text-3xl font-bold font-headline mb-1 bg-gradient-to-r from-foreground via-primary to-primary/80 bg-clip-text text-transparent">
            Patient Management
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            View, add, and manage your patients and their consultation records.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[
            { label: 'Total Patients', value: patients.length, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'New Patients (30d)', value: newPatientsCount, icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Total Consultations', value: totalConsultations, icon: HeartPulse, color: 'text-sky-600', bg: 'bg-sky-50' },
            { label: 'Inactive Patients', value: inactiveCount, icon: UserX, color: 'text-rose-600', bg: 'bg-rose-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-xl border bg-card p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Table Card */}
        <div className="rounded-xl border bg-card shadow-sm">

          {/* Toolbar: Search (left) | Filter · Add Patient · Export (right) */}
          <div className="px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center gap-3">

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name, email, or phone..."
                className="pl-9 w-full"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>

            {/* Right side: Filter Dropdown · Add Patient · Export */}
            <div className="flex items-center gap-2 ml-auto flex-shrink-0">

              {/* Filter Dropdown */}
              <div className="relative">
                <select
                  value={activeFilter}
                  onChange={(e) => { setActiveFilter(e.target.value as FilterType); setCurrentPage(1); }}
                  className="appearance-none pl-3 pr-9 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground cursor-pointer hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {FILTER_TABS.map(({ key, label }) => {
                    const count = key === 'all'
                      ? patients.length
                      : patients.filter((p: Patient) =>
                          key === 'appointment'
                            ? (!p.visitType || p.visitType === 'appointment')
                            : p.visitType === key
                        ).length;
                    return (
                      <option key={key} value={key}>
                        {label} ({count})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>

              <Button onClick={() => handleOpenModal()} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Patient
              </Button>
              <Button variant="outline" className="gap-2">
                <FileDown className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="p-4">
            <div className="text-sm text-muted-foreground mb-3 font-medium">
              Active Patients: <span className="text-foreground font-semibold">{filteredPatients.length} Patients</span>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="min-w-[160px]">Patient Name</TableHead>
                    <TableHead className="min-w-[180px]">Mail</TableHead>
                    <TableHead className="min-w-[130px]">Contact</TableHead>
                    <TableHead className="min-w-[110px]">Last Visit</TableHead>
                    <TableHead className="min-w-[110px]">Next Visit</TableHead>
                    <TableHead className="min-w-[100px]">Total Visits</TableHead>
                    <TableHead className="min-w-[120px]">Type</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="min-w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No patients found{searchTerm ? ` for "${searchTerm}"` : ''}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentItems.map((patient: Patient) => {
                      const visitInfo = getVisitTypeLabel(patient.visitType);
                      return (
                        <TableRow key={patient._id || patient.id} className="hover:bg-muted/30">
                          {/* Name with Avatar */}
                          <TableCell className="font-medium py-3">
                            <button
                              type="button"
                              onClick={() => handleViewPatient(patient)}
                              className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity focus:outline-none"
                            >
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {patient.profileImage ? (
                                  <img src={patient.profileImage} alt={patient.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-xs font-bold text-primary">{getInitials(patient.name)}</span>
                                )}
                              </div>
                              <span className="text-sm font-semibold leading-tight text-primary hover:underline">{patient.name}</span>
                            </button>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{patient.email}</TableCell>
                          <TableCell className="text-sm">+91 {patient.phone}</TableCell>
                          <TableCell className="text-sm">{formatDate(patient.lastVisit)}</TableCell>
                          <TableCell className="text-sm">{formatDate(patient.nextVisit)}</TableCell>
                          {/* Total Visits Badge */}
                          <TableCell>
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                              {patient.totalVisits || 0}
                            </div>
                          </TableCell>
                          {/* Visit Type Badge */}
                          <TableCell>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${visitInfo.color}`}>
                              {visitInfo.label}
                            </span>
                          </TableCell>
                          {/* Status Badge */}
                          <TableCell>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                              {patient.status || 'New'}
                            </span>
                          </TableCell>
                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleViewPatient(patient)}
                                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleOpenModal(patient)}
                                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-sky-600 hover:bg-sky-50 transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(patient)}
                                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
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
              className="mt-4"
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              totalItems={filteredPatients.length}
            />
          </div>
        </div>
      </div>

      {/* Profile Detail View Modal (matches Client profile view) */}
      <ClientProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedPatientForView(null);
        }}
        client={profileClient}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        bookingsById={bookingsById}
        totalsById={totalsById}
        completedById={completedById}
        cancelledById={cancelledById}
        profileClientAppointments={profileClientAppointments}
        profileClientOrders={profileClientOrders}
        profileClientBillings={profileClientBillings}
        allReviews={allReviews}
        role={role}
        isPatient={true}
        handleAddAppointment={() => {}}
      />

      {/* Add / Edit Patient Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPatient ? 'Edit Patient' : 'Add New Patient'}</DialogTitle>
            <DialogDescription>
              {selectedPatient ? 'Update the details for this patient.' : 'Enter the details for the new patient.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">Profile Photo</p>
              <input id="profileImage" type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
              <label htmlFor="profileImage" className="cursor-pointer">
                <div className={`w-24 h-24 rounded-full border-4 border-dashed transition-colors flex items-center justify-center overflow-hidden bg-muted hover:bg-primary/5 ${
                  formErrors.profileImage ? 'border-destructive' : 'border-border hover:border-primary'
                }`}>
                  {formData.profileImage
                    ? <img src={formData.profileImage} alt="Preview" className="w-full h-full object-cover" />
                    : <div className="text-center"><Plus className="w-6 h-6 text-muted-foreground mx-auto" /><span className="text-xs text-muted-foreground">Add Photo</span></div>}
                </div>
              </label>
              {formErrors.profileImage && (
                <p className="text-xs text-destructive mt-1">{formErrors.profileImage}</p>
              )}
            </div>

            {/* Full Name & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  id="fullName" name="fullName" value={formData.fullName}
                  onChange={handleInputChange} placeholder="e.g., John Doe"
                  className={formErrors.fullName ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                />
                {formErrors.fullName && (
                  <p className="text-xs text-destructive">{formErrors.fullName}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <Input
                  id="email" name="email" type="email" value={formData.email}
                  onChange={handleInputChange}
                  className={formErrors.email ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                />
                {formErrors.email && (
                  <p className="text-xs text-destructive">{formErrors.email}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone <span className="text-destructive">*</span></Label>
                <Input
                  id="phone" name="phone" type="tel" value={formData.phone}
                  onChange={handleInputChange} placeholder="10-digit number"
                  className={formErrors.phone ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                />
                {formErrors.phone && (
                  <p className="text-xs text-destructive">{formErrors.phone}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
                <Input
                  id="country" name="country" value={formData.country}
                  onChange={handleInputChange} placeholder="e.g., India"
                  className={formErrors.country ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                />
                {formErrors.country && (
                  <p className="text-xs text-destructive">{formErrors.country}</p>
                )}
              </div>
            </div>

            {/* Birthday & Gender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="birthdayDate">Birthday <span className="text-destructive">*</span></Label>
                <Input
                  id="birthdayDate" name="birthdayDate" type="date" value={formData.birthdayDate}
                  onChange={handleInputChange}
                  className={formErrors.birthdayDate ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                />
                {formErrors.birthdayDate && (
                  <p className="text-xs text-destructive">{formErrors.birthdayDate}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="gender">Gender <span className="text-destructive">*</span></Label>
                <select
                  id="gender" name="gender" value={formData.gender}
                  onChange={(e) => handleSelectChange('gender', e.target.value)}
                  className={`w-full p-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 ${
                    formErrors.gender
                      ? 'border-destructive focus:ring-destructive/30'
                      : 'border-input focus:ring-ring/30'
                  }`}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {formErrors.gender && (
                  <p className="text-xs text-destructive">{formErrors.gender}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation" name="occupation" value={formData.occupation}
                onChange={handleInputChange} placeholder="e.g., Software Engineer"
                className={formErrors.occupation ? 'border-destructive focus-visible:ring-destructive/30' : ''}
              />
              {formErrors.occupation && (
                <p className="text-xs text-destructive">{formErrors.occupation}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address" name="address" value={formData.address}
                onChange={handleInputChange} placeholder="Enter full address" rows={3}
                className={formErrors.address ? 'border-destructive focus-visible:ring-destructive/30' : ''}
              />
              {formErrors.address && (
                <p className="text-xs text-destructive">{formErrors.address}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes" name="notes" value={formData.notes}
                onChange={handleInputChange} placeholder="Enter any patient notes or preferences" rows={3}
                className={formErrors.notes ? 'border-destructive focus-visible:ring-destructive/30' : ''}
              />
              {formErrors.notes && (
                <p className="text-xs text-destructive">{formErrors.notes}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePatient}>Save Patient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Patient?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>"{selectedPatient?.name}"</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}