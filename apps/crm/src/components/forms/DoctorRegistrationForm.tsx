"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { toast } from 'sonner';
import { useRegisterDoctorCrmMutation } from '@repo/store/api';
import { Label } from '@repo/ui/label';
import { Checkbox } from '@repo/ui/checkbox';
import { Skeleton } from '@repo/ui/skeleton';
import {
  CheckCircle, Stethoscope, User, HeartPulse, Microscope, ArrowRight, ArrowLeft,
  Eye, EyeOff, ShieldCheck, Mail, Smartphone, RefreshCw, Map as MapIcon, GraduationCap,
  ChevronRight, ChevronDown,
} from 'lucide-react';
import { cn } from '@repo/ui/cn';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@repo/ui/dialog';
import { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY } from '@repo/config/config';

const rawApiKey = NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const GOOGLE_MAPS_API_KEY = rawApiKey.toString().trim().replace(/['"""]/g, '');

interface GooglePlacesResult {
  description: string;
  place_id: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  gender: string;
  doctorType: string;
  specialties: string[];
  subSpecializations: string[];
  diseases: string[];
  experience: string;
  qualification: string;
  registrationNumber: string;
  clinicName: string;
  clinicAddress: string;
  state: string;
  city: string;
  pincode: string;
  location: { lat: number; lng: number } | null;
  physicalConsultationStartTime: string;
  physicalConsultationEndTime: string;
  assistantName: string;
  assistantContact: string;
  doctorAvailability: string;
  workingWithHospital: boolean;
  videoConsultation: boolean;
  referredByCode: string;
}

// 3-step indicator
const StepIndicator = ({ currentStep, setStep }: { currentStep: number; setStep: (step: number) => void }) => {
  return (
    <div className="w-full mb-4 mt-2">
      <div className="flex space-x-2">
        <div
          className={cn("h-1 flex-1 rounded-full transition-colors cursor-pointer",
            currentStep >= 1 ? "bg-purple-600" : "bg-gray-200")}
          onClick={() => currentStep > 1 && setStep(1)}
        />
        <div
          className={cn("h-1 flex-1 rounded-full transition-colors cursor-pointer",
            currentStep >= 2 ? "bg-purple-600" : "bg-gray-200")}
          onClick={() => currentStep > 2 && setStep(2)}
        />
        <div
          className={cn("h-1 flex-1 rounded-full transition-colors cursor-pointer",
            currentStep >= 3 ? "bg-purple-600" : "bg-gray-200")}
          onClick={() => currentStep > 3 && setStep(3)}
        />
      </div>
    </div>
  );
};

export function DoctorRegistrationForm({ onSuccess, email }: { onSuccess: () => void; email?: string }) {
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const [phoneOtp, setPhoneOtp] = useState('');
  const [isPhoneOtpSent, setIsPhoneOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  const [isOtpLoading, setIsOtpLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: email || '',
    phone: '',
    password: '',
    confirmPassword: '',
    gender: 'male',
    doctorType: '',
    specialties: [],
    subSpecializations: [],
    diseases: [],
    experience: '0',
    qualification: '',
    registrationNumber: '',
    clinicName: '',
    clinicAddress: '',
    state: '',
    city: '',
    pincode: '',
    location: null,
    physicalConsultationStartTime: '00:00',
    physicalConsultationEndTime: '00:00',
    assistantName: 'N/A',
    assistantContact: '0000000000',
    doctorAvailability: 'Online',
    workingWithHospital: false,
    videoConsultation: true,
    referredByCode: '',
  });

  const [step, setStep] = useState(1);
  const [createDoctor, { isLoading }] = useRegisterDoctorCrmMutation();

  const [isMapOpen, setIsMapOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GooglePlacesResult[]>([]);
  const [authError, setAuthError] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const mapContainer = React.useRef<HTMLDivElement | null>(null);
  const map = React.useRef<google.maps.Map | null>(null);
  const marker = React.useRef<google.maps.Marker | null>(null);
  const geocoder = React.useRef<google.maps.Geocoder | null>(null);
  const autocompleteService = React.useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = React.useRef<google.maps.places.PlacesService | null>(null);

  // ── Superdata derived lists ─────────────────────────────────────────────
  const allSpecialties = useMemo(
    () => dropdownData.filter((d: any) => d.type === 'specialization'),
    [dropdownData]
  );
  const allSubSpecializations = useMemo(
    () => dropdownData.filter((d: any) => d.type === 'subSpecialization'),
    [dropdownData]
  );
  const allDiseases = useMemo(
    () => dropdownData.filter((d: any) => d.type === 'disease'),
    [dropdownData]
  );

  // All specialties from superdata (no doctorType filter)
  const filteredSpecialties = useMemo(() => allSpecialties, [allSpecialties]);

  // SubSpecializations whose parentId matches a selected specialty
  const filteredSubSpecializations = useMemo(() => {
    if (formData.specialties.length === 0) return [];
    return allSubSpecializations.filter((ss: any) =>
      formData.specialties.includes(ss.parentId)
    );
  }, [allSubSpecializations, formData.specialties]);

  // Diseases grouped by subSpecialization; parentId of disease points to subSpecialization._id
  // If no subSpecializations are selected, show diseases under selected specialties directly
  const filteredDiseases = useMemo(() => {
    const diseaseMap = new Map<string, { id: string; diseases: any[] }>();

    if (formData.subSpecializations.length > 0) {
      // Group diseases by their parent subSpecialization
      formData.subSpecializations.forEach((subId: string) => {
        const sub = allSubSpecializations.find((ss: any) => ss._id === subId);
        if (!sub) return;
        const diseases = allDiseases.filter((d: any) => d.parentId === subId);
        if (diseases.length > 0) {
          diseaseMap.set(sub.name, { id: subId, diseases });
        }
      });
    } else if (formData.specialties.length > 0) {
      // Fallback: diseases directly under selected specialties
      formData.specialties.forEach((specId: string) => {
        const spec = allSpecialties.find((s: any) => s._id === specId);
        if (!spec) return;
        const diseases = allDiseases.filter((d: any) => d.parentId === specId);
        if (diseases.length > 0) {
          diseaseMap.set(spec.name, { id: specId, diseases });
        }
      });
    }
    return Array.from(diseaseMap.entries()); // [groupName, {id, diseases[]}]
  }, [allDiseases, allSubSpecializations, allSpecialties, formData.subSpecializations, formData.specialties]);

  // ── Sync email prop ──────────────────────────────────────────────────────
  useEffect(() => {
    if (email) setFormData(prev => ({ ...prev, email }));
  }, [email]);

  // ── Fetch public superdata (no auth required) ────────────────────────────
  useEffect(() => {
    fetch('/api/public/doctor-superdata')
      .then(res => res.json())
      .then((data: any) => {
        if (Array.isArray(data)) setDropdownData(data);
      })
      .catch(err => console.error('Failed to load specializations:', err))
      .finally(() => setIsLoadingDropdowns(false));
  }, []);

  // ── Fetch public superdata (no auth required) ────────────────────────────
  useEffect(() => {
    fetch('/api/public/doctor-superdata')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDropdownData(data);
      })
      .catch(err => console.error('Failed to load specializations:', err))
      .finally(() => setIsLoadingDropdowns(false));
  }, []);

  // ── OTP handlers ─────────────────────────────────────────────────────────
  const handleSendEmailOtp = async () => {
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsOtpLoading(true);
    try {
      const res = await fetch('/api/crm/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json();
      if (data.success) { setIsEmailOtpSent(true); toast.success(data.message); }
      else toast.error(data.message);
    } catch { toast.error("Failed to send email OTP"); }
    finally { setIsOtpLoading(false); }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length < 6) { toast.error("Please enter a valid OTP"); return; }
    setIsOtpLoading(true);
    try {
      const res = await fetch('/api/crm/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: emailOtp }),
      });
      const data = await res.json();
      if (data.success) { toast.success(data.message); setIsEmailVerified(true); }
      else { toast.error(data.message); setEmailOtp(''); }
    } catch { toast.error("Failed to verify email OTP"); }
    finally { setIsOtpLoading(false); }
  };

  const handleSendPhoneOtp = async () => {
    if (!formData.phone || formData.phone.length < 10) {
      toast.error("Please enter a valid phone number"); return;
    }
    setIsOtpLoading(true);
    try {
      const res = await fetch('/api/crm/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone }),
      });
      const data = await res.json();
      if (data.success) { setIsPhoneOtpSent(true); toast.success(data.message || 'OTP sent to your mobile number'); }
      else toast.error(data.message || 'Failed to send OTP');
    } catch { toast.error("Failed to send phone OTP"); }
    finally { setIsOtpLoading(false); }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp || phoneOtp.length < 6) { toast.error("Please enter a valid OTP"); return; }
    setIsOtpLoading(true);
    try {
      const res = await fetch('/api/crm/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, otp: phoneOtp }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Phone verified successfully!'); setIsPhoneVerified(true); }
      else { toast.error(data.message || 'Invalid phone OTP'); setPhoneOtp(''); }
    } catch { toast.error("Failed to verify phone OTP"); }
    finally { setIsOtpLoading(false); }
  };

  // ── Doctor type options ──────────────────────────────────────────────────
  // (kept for internal use / backend compat — not shown in UI)

  // ── Change handlers ───────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === "name") {
      // Allow letters, spaces, dots and hyphens (for names like "Dr. Smith-Jones")
      finalValue = value.replace(/[^a-zA-Z\s.\-]/g, "");
    } else if (name === "phone") {
      finalValue = value.replace(/\D/g, "").slice(0, 10);
      setIsPhoneVerified(false);
      setIsPhoneOtpSent(false);
    } else if (name === "email") {
      if (email) return;
      finalValue = value.replace(/[^a-zA-Z0-9@.]/g, "");
      setIsEmailVerified(false);
      setIsEmailOtpSent(false);
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleDoctorTypeChange = (typeName: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setFormData(prev => ({ ...prev, doctorType: typeName, specialties: [], subSpecializations: [], diseases: [] }));
  };

  const handleSpecialtyChange = (specId: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setFormData(prev => {
      // Single-select: clicking the already-selected one deselects it, otherwise replace
      const newSpecialties = prev.specialties.includes(specId) ? [] : [specId];

      // Clear subSpecs and diseases when specialty changes
      return { ...prev, specialties: newSpecialties, subSpecializations: [], diseases: [] };
    });
  };

  const handleSubSpecChange = (subId: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setFormData(prev => {
      const newSubSpecs = prev.subSpecializations.includes(subId)
        ? prev.subSpecializations.filter(id => id !== subId)
        : [...prev.subSpecializations, subId];

      // Remove diseases whose parent subSpec was deselected
      const newDiseases = prev.diseases.filter(dId => {
        const disease = allDiseases.find((d: any) => d._id === dId);
        if (!disease) return false;
        return newSubSpecs.includes(disease.parentId) || prev.specialties.includes(disease.parentId);
      });

      return { ...prev, subSpecializations: newSubSpecs, diseases: newDiseases };
    });
  };

  const handleDiseaseChange = (diseaseId: string) => {
    setFormData(prev => ({
      ...prev,
      diseases: prev.diseases.includes(diseaseId)
        ? prev.diseases.filter(id => id !== diseaseId)
        : [...prev.diseases, diseaseId],
    }));
  };

  // ── Submission ────────────────────────────────────────────────────────────
  const handleActualSubmit = async () => {
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match."); return;
    }

    // Convert IDs → names for backend storage
    const specialtyNames = formData.specialties
      .map(id => allSpecialties.find((s: any) => s._id === id)?.name)
      .filter(Boolean);

    const subSpecNames = formData.subSpecializations
      .map(id => allSubSpecializations.find((ss: any) => ss._id === id)?.name)
      .filter(Boolean);

    const diseaseNames = formData.diseases
      .map(id => allDiseases.find((d: any) => d._id === id)?.name)
      .filter(Boolean);

    // Full name is passed as-is — no splitting
    const submissionData = {
      name: formData.name.trim(),
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      gender: formData.gender,
      doctorType: formData.doctorType,
      specialties: specialtyNames,
      subSpecializations: subSpecNames,
      diseases: diseaseNames,
      experience: formData.experience,
      qualification: formData.qualification,
      registrationNumber: formData.registrationNumber,
      clinicName: formData.clinicName || 'N/A',
      clinicAddress: formData.clinicAddress || 'N/A',
      state: formData.state || 'N/A',
      city: formData.city || 'N/A',
      pincode: formData.pincode || '000000',
      location: formData.location ?? { lat: 0, lng: 0 },
      physicalConsultationStartTime: formData.physicalConsultationStartTime,
      physicalConsultationEndTime: formData.physicalConsultationEndTime,
      assistantName: formData.assistantName,
      assistantContact: formData.assistantContact,
      doctorAvailability: formData.doctorAvailability,
      workingWithHospital: formData.workingWithHospital,
      videoConsultation: formData.videoConsultation,
      referredByCode: formData.referredByCode,
    };

    try {
      await createDoctor(submissionData).unwrap();
      toast.success(`Dr. ${formData.name.trim()}'s registration submitted successfully!`);
      onSuccess();
    } catch (err) {
      toast.error((err as any)?.data?.message || "Registration failed. Please try again.");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault(); e.stopPropagation(); return false;
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (step === 3) await handleActualSubmit();
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.name) newErrors.name = 'Name is required';
    else if (!/^[a-zA-Z\s.\-]+$/.test(formData.name)) newErrors.name = 'Name can only contain letters, spaces, dots and hyphens';

    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    else if (!isEmailVerified) newErrors.email = 'Please verify your email address';

    if (!formData.phone) newErrors.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(formData.phone)) newErrors.phone = 'Phone must be 10 digits';
    else if (!isPhoneVerified) newErrors.phone = 'Please verify your phone number';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(formData.password))
      newErrors.password = 'Must contain uppercase, lowercase, number and special character';

    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    if (!formData.registrationNumber) newErrors.registrationNumber = 'Registration number is required';

    if (formData.referredByCode && formData.referredByCode.trim() !== '') {
      if (!/^[a-zA-Z0-9_]+$/.test(formData.referredByCode) ||
        formData.referredByCode.length < 6 || formData.referredByCode.length > 20)
        newErrors.referredByCode = 'Referral code must be 6-20 alphanumeric characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (formData.specialties.length === 0) newErrors.specialties = 'Please select at least one specialty';
    if (!formData.experience) newErrors.experience = 'Experience is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.clinicAddress) newErrors.clinicAddress = 'Address is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.pincode) newErrors.pincode = 'Pincode is required';
    else if (!/^\d{6}$/.test(formData.pincode)) newErrors.pincode = 'Pincode must be 6 digits';
    if (!formData.location) newErrors.location = 'Location is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const navigateToNextStep = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (step === 1 && !validateStep1()) { toast.error("Please fill all required fields correctly."); return; }
    if (step === 2 && !validateStep2()) { toast.error("Please complete required professional details."); return; }
    if (step < 3) setStep(s => s + 1);
  };

  const navigateToPrevStep = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (step > 1) setStep(s => s - 1);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && step < 3) { e.preventDefault(); e.stopPropagation(); }
  };

  const renderError = (fieldName: keyof FormData) => {
    if (errors[fieldName]) return <p className="text-red-500 text-sm mt-1">{errors[fieldName]}</p>;
    return null;
  };

  // ── Google Maps ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    const originalError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('IntersectionObserver')) return;
      originalError.apply(console, args);
    };
    const checkGoogleMaps = () => { if ((window as any).google?.maps) { setIsGoogleMapsLoaded(true); return true; } return false; };
    if (checkGoogleMaps()) return;
    const scriptId = 'google-maps-native-script';
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      if (checkGoogleMaps()) return;
      const checkInterval = setInterval(() => { if (checkGoogleMaps()) clearInterval(checkInterval); }, 500);
      return () => clearInterval(checkInterval);
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,drawing&v=weekly`;
    script.async = true; script.defer = true;
    (window as any).gm_authFailure = () => { setAuthError(true); toast.error("Google Maps Authentication Failed."); };
    script.onload = () => setIsGoogleMapsLoaded(true);
    document.head.appendChild(script);
    return () => { console.error = originalError; };
  }, []);

  useEffect(() => {
    if (!isMapOpen || !isGoogleMapsLoaded || !GOOGLE_MAPS_API_KEY) return;
    const initMap = () => {
      if (!mapContainer.current || !window.google) return;
      if (map.current) google.maps.event.clearInstanceListeners(map.current);
      const center = formData.location ? { lat: formData.location.lat, lng: formData.location.lng } : { lat: 23.2599, lng: 77.4126 };
      if (mapContainer.current) {
        const rect = mapContainer.current.getBoundingClientRect();
        if (rect.height === 0) { setTimeout(initMap, 200); return; }
      } else return;
      map.current = new google.maps.Map(mapContainer.current, {
        center, zoom: formData.location ? 15 : 5,
        mapTypeControl: true, streetViewControl: true, fullscreenControl: false,
      });
      geocoder.current = new google.maps.Geocoder();
      autocompleteService.current = new google.maps.places.AutocompleteService();
      placesService.current = new google.maps.places.PlacesService(map.current);
      if (marker.current) marker.current.setMap(null);
      if (formData.location) {
        marker.current = new google.maps.Marker({ position: center, map: map.current, draggable: true, animation: google.maps.Animation.DROP });
        marker.current.addListener('dragend', () => {
          const pos = marker.current!.getPosition();
          if (pos) { setFormData(prev => ({ ...prev, location: { lat: pos.lat(), lng: pos.lng() } })); fetchAddress({ lat: pos.lat(), lng: pos.lng() }); }
        });
      }
      map.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat(); const lng = e.latLng.lng();
        setFormData(prev => ({ ...prev, location: { lat, lng } }));
        if (marker.current) marker.current.setMap(null);
        if (map.current) {
          marker.current = new google.maps.Marker({ position: { lat, lng }, map: map.current, draggable: true, animation: google.maps.Animation.DROP });
          marker.current.addListener('dragend', () => {
            const pos = marker.current!.getPosition();
            if (pos) { setFormData(prev => ({ ...prev, location: { lat: pos.lat(), lng: pos.lng() } })); fetchAddress({ lat: pos.lat(), lng: pos.lng() }); }
          });
        }
        fetchAddress({ lat, lng });
      });
    };
    const timeoutId = setTimeout(initMap, 500);
    return () => { clearTimeout(timeoutId); if (marker.current) marker.current.setMap(null); };
  }, [isMapOpen, isGoogleMapsLoaded]);

  const handleSearch = async (query: string) => {
    if (!query || !autocompleteService.current) { setSearchResults([]); return; }
    try {
      autocompleteService.current.getPlacePredictions(
        { input: query, componentRestrictions: { country: 'IN' } },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions)
            setSearchResults(predictions.map(p => ({ description: p.description, place_id: p.place_id })));
          else setSearchResults([]);
        }
      );
    } catch { setSearchResults([]); }
  };

  const fetchAddress = async (location: { lat: number; lng: number }) => {
    if (!geocoder.current) return;
    geocoder.current.geocode({ location }, (results, status) => {
      if (status === 'OK' && results && results.length > 0) {
        const result = results[0];
        let state = '', city = '', pincode = '';
        result.address_components.forEach(c => {
          if (c.types.includes('administrative_area_level_1')) state = c.long_name;
          if (c.types.includes('locality')) city = c.long_name;
          if (c.types.includes('postal_code')) pincode = c.long_name;
        });
        setFormData(prev => ({ ...prev, clinicAddress: result.formatted_address, state: state || prev.state, city: city || prev.city, pincode: pincode || prev.pincode }));
      }
    });
  };

  const handleSearchResultSelect = (result: GooglePlacesResult) => {
    if (!placesService.current) return;
    placesService.current.getDetails({ placeId: result.place_id, fields: ['geometry', 'formatted_address', 'address_components'] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat(); const lng = place.geometry.location.lng();
          let state = '', city = '', pincode = '';
          place.address_components?.forEach(c => {
            if (c.types.includes('administrative_area_level_1')) state = c.long_name;
            if (c.types.includes('locality')) city = c.long_name;
            if (c.types.includes('postal_code')) pincode = c.long_name;
          });
          setFormData(prev => ({ ...prev, location: { lat, lng }, clinicAddress: place.formatted_address || result.description, state: state || prev.state, city: city || prev.city, pincode: pincode || prev.pincode }));
          if (map.current) { map.current.setCenter({ lat, lng }); map.current.setZoom(15); }
          if (marker.current) marker.current.setPosition({ lat, lng });
          setSearchResults([]); setSearchQuery('');
        }
      }
    );
  };

  // ── Step renders ──────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-500">
      <div className="mb-4 sm:mb-6">
        <p className="text-base sm:text-lg text-gray-500 mb-2">Account setup</p>
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">Create your account</h1>
        <p className="text-gray-600 text-base sm:text-lg">Enter your personal details to get started.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
        <div>
          <Input id="name" name="name" placeholder="Full Name" onChange={handleChange} value={formData.name}
            onKeyDown={handleInputKeyDown} className="h-12 sm:h-14 px-4 sm:px-5 text-base sm:text-lg" required />
          {renderError('name')}
        </div>
        <div>
          <Input id="registrationNumber" name="registrationNumber" placeholder="Registration Number"
            onChange={handleChange} value={formData.registrationNumber} onKeyDown={handleInputKeyDown}
            className="h-12 sm:h-14 px-4 sm:px-5 text-base sm:text-lg" required />
          {renderError('registrationNumber')}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
        {/* Email OTP */}
        <div className="space-y-3 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-semibold flex items-center gap-1">Email <span className="text-red-500">*</span></Label>
            {isEmailVerified && <span className="text-green-600 text-xs font-bold flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Verified</span>}
          </div>
          <div className="flex gap-2">
            <Input id="email" name="email" type="email" placeholder="Email Address" onChange={handleChange}
              value={formData.email} onKeyDown={handleInputKeyDown} disabled={isEmailVerified || isOtpLoading || !!email}
              className={cn("h-12 flex-1 sm:h-14 px-4 sm:px-5 text-base sm:text-lg bg-white", isEmailVerified && "border-green-300 bg-green-50 text-green-800")} required />
            {!isEmailVerified && (
              <Button type="button" onClick={handleSendEmailOtp} disabled={isOtpLoading || !formData.email || !!email}
                className="h-12 sm:h-14 px-4 rounded-xl font-bold bg-purple-100 text-purple-700 hover:bg-purple-200">
                {isEmailOtpSent ? "Resend" : "Send OTP"}
              </Button>
            )}
          </div>
          {renderError('email')}
          {isEmailOtpSent && !isEmailVerified && (
            <div className="pt-2 animate-in fade-in slide-in-from-top-2">
              <div className="flex gap-2">
                <Input type="text" placeholder="OTP" maxLength={6} value={emailOtp}
                  onChange={e => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} disabled={isOtpLoading}
                  className="h-12 sm:h-14 flex-1 text-center text-lg tracking-widest font-black bg-white" />
                <Button type="button" onClick={handleVerifyEmailOtp} disabled={isOtpLoading || emailOtp.length < 6}
                  className="h-12 sm:h-14 px-6 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                  {isOtpLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Verify"}
                </Button>
              </div>
            </div>
          )}
        </div>
        {/* Phone OTP */}
        <div className="space-y-3 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-semibold flex items-center gap-1">Phone <span className="text-red-500">*</span></Label>
            {isPhoneVerified && <span className="text-green-600 text-xs font-bold flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Verified</span>}
          </div>
          <div className="flex gap-2">
            <Input id="phone" name="phone" type="tel" placeholder="Phone Number" onChange={handleChange}
              value={formData.phone} onKeyDown={handleInputKeyDown} maxLength={10}
              disabled={isPhoneVerified || isOtpLoading}
              className={cn("h-12 flex-1 sm:h-14 px-4 sm:px-5 text-base sm:text-lg bg-white", isPhoneVerified && "border-green-300 bg-green-50 text-green-800")} required />
            {!isPhoneVerified && (
              <Button type="button" onClick={handleSendPhoneOtp} disabled={isOtpLoading || formData.phone.length < 10}
                className="h-12 sm:h-14 px-4 rounded-xl font-bold bg-purple-100 text-purple-700 hover:bg-purple-200">
                {isPhoneOtpSent ? "Resend" : "Send OTP"}
              </Button>
            )}
          </div>
          {renderError('phone')}
          {isPhoneOtpSent && !isPhoneVerified && (
            <div className="pt-2 animate-in fade-in slide-in-from-top-2">
              <div className="flex gap-2">
                <Input type="text" placeholder="OTP" maxLength={6} value={phoneOtp}
                  onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} disabled={isOtpLoading}
                  className="h-12 sm:h-14 flex-1 text-center text-lg tracking-widest font-black bg-white" />
                <Button type="button" onClick={handleVerifyPhoneOtp} disabled={isOtpLoading || phoneOtp.length < 6}
                  className="h-12 sm:h-14 px-6 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                  {isOtpLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Verify"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
        <div className="relative">
          <Input id="password" name="password" type={showPassword ? "text" : "password"}
            placeholder="Password (min. 8 characters)" onChange={handleChange} value={formData.password}
            onKeyDown={handleInputKeyDown} className="h-12 sm:h-14 px-4 sm:px-5 text-base sm:text-lg w-full" required />
          <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10"
            onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>
          {renderError('password')}
        </div>
        <div className="relative">
          <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password" onChange={handleChange} value={formData.confirmPassword}
            onKeyDown={handleInputKeyDown} className="h-12 sm:h-14 px-4 sm:px-5 text-base sm:text-lg w-full" required />
          <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
            {showConfirmPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>
          {renderError('confirmPassword')}
        </div>
      </div>
      <div>
        <Input id="referredByCode" name="referredByCode" placeholder="Referral Code (Optional)"
          onChange={handleChange} value={formData.referredByCode} onKeyDown={handleInputKeyDown}
          className="h-12 sm:h-14 px-4 sm:px-5 text-base sm:text-lg" />
        {renderError('referredByCode')}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in-50 duration-500">
      <div className="mb-2">
        <p className="text-base sm:text-lg text-gray-500 mb-2">Professional Details</p>
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">Tell us about your practice</h1>
        <p className="text-gray-600 text-base sm:text-lg">Your specialty, qualifications and experience.</p>
      </div>

      {/* Medical Specialty — Single Select */}
      <div className="animate-in fade-in-50 duration-300">
        <Label className="text-base font-semibold mb-2 block">
          Medical Specialty <span className="text-red-500">*</span>
        </Label>
        <div className="overflow-y-auto max-h-48 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pr-1">
            {isLoadingDropdowns
              ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              : filteredSpecialties.length === 0
                ? <p className="col-span-4 text-sm text-gray-400 py-2">No specialties found.</p>
                : filteredSpecialties.map((spec: any) => (
                  <div key={spec._id} onClick={e => handleSpecialtyChange(spec._id, e)}
                    className={cn("p-2 border rounded-lg cursor-pointer flex flex-col items-center justify-center text-center transition-all duration-200 h-16",
                      formData.specialties.includes(spec._id)
                        ? "border-purple-400 ring-2 ring-purple-100 bg-purple-50/50"
                        : "border-gray-200 hover:border-purple-200 hover:bg-gray-50")}>
                    <Microscope className="h-5 w-5 text-purple-600 mb-1" />
                    <span className="font-medium text-xs sm:text-sm leading-tight">{spec.name}</span>
                  </div>
                ))
            }
          </div>
        </div>
        {renderError('specialties')}
      </div>

      {/* Sub-specialization — shown only when specialties are selected AND sub-specs exist */}
      {formData.specialties.length > 0 && filteredSubSpecializations.length > 0 && (
        <div className="animate-in fade-in-50 duration-300">
          <Label className="text-base font-semibold mb-2 block">Sub-specialization <span className="text-gray-400 text-sm font-normal">(Optional)</span></Label>
          <div className="overflow-y-auto max-h-40 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pr-1">
              {filteredSubSpecializations.map((sub: any) => (
                <div key={sub._id} onClick={e => handleSubSpecChange(sub._id, e)}
                  className={cn("p-2 border rounded-lg cursor-pointer flex flex-col items-center justify-center text-center transition-all duration-200 h-14",
                    formData.subSpecializations.includes(sub._id)
                      ? "border-indigo-400 ring-2 ring-indigo-100 bg-indigo-50/50"
                      : "border-gray-200 hover:border-indigo-200 hover:bg-gray-50")}>
                  <ChevronRight className="h-4 w-4 text-indigo-500 mb-0.5" />
                  <span className="font-medium text-xs leading-tight">{sub.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Diseases — shown when specialty or sub-spec is selected and diseases exist */}
      {filteredDiseases.length > 0 && (
        <div className="animate-in fade-in-50 duration-300">
          <Label className="text-base font-semibold mb-2 block">
            Diseases Treated <span className="text-gray-400 text-sm font-normal">(Multi-select)</span>
          </Label>
          <div className="space-y-3">
            {filteredDiseases.map(([groupName, groupData]) => (
              <div key={groupData.id} className="border rounded-lg p-3 bg-gray-50/50">
                <p className="text-sm font-semibold text-gray-600 mb-2">{groupName}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {groupData.diseases.map((disease: any) => (
                    <div key={disease._id} className="flex items-center space-x-2">
                      <Checkbox id={disease._id} checked={formData.diseases.includes(disease._id)}
                        onCheckedChange={() => handleDiseaseChange(disease._id)} className="h-3.5 w-3.5" />
                      <Label htmlFor={disease._id} className="text-xs font-normal cursor-pointer">{disease.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience + Qualification */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
        <div>
          <Label className="text-sm font-semibold mb-1 block">Years of Experience <span className="text-red-500">*</span></Label>
          <Input name="experience" type="number" min="0" max="60" placeholder="e.g. 5"
            onChange={handleChange} value={formData.experience} onKeyDown={handleInputKeyDown}
            className="h-12 sm:h-14 px-4 sm:px-5 text-base sm:text-lg" />
          {renderError('experience')}
        </div>
        <div>
          <Label className="text-sm font-semibold mb-1 block">Qualification <span className="text-red-500">*</span></Label>
          <Input name="qualification" placeholder="e.g. MBBS, MD, MS" onChange={handleChange}
            value={formData.qualification} onKeyDown={handleInputKeyDown}
            className="h-12 sm:h-14 px-4 sm:px-5 text-base sm:text-lg" />
          {renderError('qualification')}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-500">
      <div className="mb-4 sm:mb-6">
        <p className="text-base sm:text-lg text-gray-500 mb-2">Location setup</p>
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">Where is your clinic located?</h1>
        <p className="text-gray-600 text-base sm:text-lg">Set your clinic location and address details.</p>
      </div>
      <div>
        <Input name="clinicName" placeholder="Clinic Name" onChange={handleChange}
          value={formData.clinicName === 'N/A' ? '' : formData.clinicName}
          className="h-12 sm:h-14 px-4 sm:px-5 text-base sm:text-lg" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location" className="text-base sm:text-lg">Location</Label>
        <div className="flex flex-col gap-3">
          <Input id="location"
            value={formData.location ? `${formData.location.lat.toFixed(6)}, ${formData.location.lng.toFixed(6)}` : ''}
            placeholder="Select location from map" readOnly className="flex-1 h-12 sm:h-14 px-4 sm:px-5 text-base sm:text-lg" />
          {renderError('location')}
          <Button type="button" variant="outline" size="lg" onClick={() => setIsMapOpen(true)}
            className="w-full h-12 sm:h-14 px-4 sm:px-5 text-base sm:text-lg">
            <MapIcon className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Choose from Map
          </Button>
        </div>
      </div>
      <div>
        <Input name="clinicAddress" placeholder="Full Address" onChange={handleChange}
          value={formData.clinicAddress} required className="h-12 sm:h-14 px-4 sm:px-5 text-base sm:text-lg" />
        {renderError('clinicAddress')}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
        <div>
          <Input name="state" placeholder="State" onChange={handleChange} value={formData.state}
            required className="h-12 sm:h-14 px-4 sm:px-5 text-base sm:text-lg" />
          {renderError('state')}
        </div>
        <div>
          <Input name="city" placeholder="City" onChange={handleChange} value={formData.city}
            required className="h-12 sm:h-14 px-4 sm:px-5 text-base sm:text-lg" />
          {renderError('city')}
        </div>
        <div>
          <Input name="pincode" placeholder="Pincode" onChange={handleChange} value={formData.pincode}
            required className="h-12 sm:h-14 px-4 sm:px-5 text-base sm:text-lg" />
          {renderError('pincode')}
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return null;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pt-2 overflow-y-auto max-h-[calc(100vh-20px)]">
        {/* Top nav buttons */}
        <div className="fixed top-4 sm:top-8 left-4 sm:left-10 right-4 sm:right-10 flex justify-between items-center z-20">
          <Button type="button" variant="outline"
            onClick={step === 1 ? () => window.history.back() : navigateToPrevStep}
            className="px-3 sm:px-4 py-2 text-base sm:text-lg text-gray-600 border-gray-300 hover:bg-gray-50 h-10 sm:h-auto">
            ← {step === 1 ? 'Back to Role Selection' : 'Back'}
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={navigateToNextStep}
              className="bg-black text-white px-4 sm:px-6 py-2 rounded-md hover:bg-gray-800 font-medium text-base sm:text-lg h-10 sm:h-auto">
              Continue →
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading} form="registration-form"
              className="bg-black text-white px-4 sm:px-6 py-2 rounded-md hover:bg-gray-800 font-medium text-base sm:text-lg h-10 sm:h-auto">
              {isLoading ? "Submitting..." : "Complete Registration"}
            </Button>
          )}
        </div>

        <div className="mt-16 sm:mt-8">
          <StepIndicator currentStep={step} setStep={setStep} />
        </div>

        <form id="registration-form" onSubmit={handleFinalSubmit} className="space-y-4 sm:space-y-6 pb-8 mt-4">
          <div className="flex flex-col justify-start" style={{ minHeight: 'calc(100vh - 200px)' }}>
            {renderStepContent()}
          </div>
        </form>

        {/* Map Modal */}
        <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Select Location</DialogTitle>
              <DialogDescription>
                Search for a location, click on the map, or drag the marker to select the exact position.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 flex flex-col max-h-[50vh] overflow-y-auto">
              <div className="relative">
                <Input placeholder="Search for a location" value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); handleSearch(e.target.value); }}
                  className="w-full" />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 border rounded-md bg-white shadow-lg max-h-48 overflow-y-auto mt-1">
                    {searchResults.map(result => (
                      <div key={result.place_id} className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0 text-sm"
                        onClick={() => handleSearchResultSelect(result)}>
                        {result.description}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {formData.location && (
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <strong>Selected:</strong> {formData.location.lat.toFixed(6)}, {formData.location.lng.toFixed(6)}
                </div>
              )}
              <div className="relative border rounded-lg overflow-hidden" style={{ height: '300px' }}>
                <div ref={mapContainer} className="w-full h-full" />
                {authError && (
                  <div className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center p-4 text-center z-10">
                    <p className="text-red-600 font-bold mb-2">Google Maps Error</p>
                    <p className="text-xs text-red-500 mb-4">InvalidKeyMapError: The API key is rejected.</p>
                    <button onClick={() => window.location.reload()}
                      className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 font-semibold">
                      Reload Page
                    </button>
                  </div>
                )}
                {!isGoogleMapsLoaded && !authError && (
                  <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                    <p className="text-gray-600">Loading map...</p>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• Click anywhere on the map to place the marker</p>
                <p>• Drag the marker to adjust the location</p>
                <p>• Use the search box to find specific places</p>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsMapOpen(false)}>Cancel</Button>
              <Button type="button" onClick={() => setIsMapOpen(false)}>Confirm Location</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

export const DoctorRegistrationFormWithSuspense = (props: { onSuccess: () => void }) => (
  <Suspense fallback={<div>Loading...</div>}>
    <DoctorRegistrationForm {...props} />
  </Suspense>
);
