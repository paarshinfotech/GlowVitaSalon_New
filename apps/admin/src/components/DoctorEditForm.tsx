"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  useUpdateDoctorMutation,
  useGetSubscriptionPlansQuery,
  useGetConsultationsQuery,
  useGetSuperDataQuery
} from '@repo/store/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@repo/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@repo/ui/tabs';
import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { Label } from '@repo/ui/label';
import { Textarea } from '@repo/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui/select';
import { Checkbox } from '@repo/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card';
import { Badge } from '@repo/ui/badge';
import { Switch } from '@repo/ui/switch';
import {
  Trash2, UploadCloud, CheckCircle2, Users, Eye, EyeOff, Map, X, FileText,
  Clock, RefreshCw, MapPinIcon, MapPin, Zap, CreditCard, Smartphone, Landmark,
  User, Briefcase, Stethoscope, FileDown
} from 'lucide-react';
import { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY } from '../../../../packages/config/config';

const rawApiKey = NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const GOOGLE_MAPS_API_KEY = rawApiKey.toString().trim().replace(/['"“”]/g, '');

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

interface GooglePlacesResult {
  description: string;
  place_id: string;
}

export interface Doctor {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  registrationNumber: string;
  doctorType: string;
  specialties: string[];
  subSpecializations: string[];
  diseases: string[];
  experience: string;
  clinicName: string;
  clinicAddress: string;
  state: string;
  city: string;
  pincode: string;
  location?: { lat: number, lng: number } | null;
  status?: 'Approved' | 'Pending' | 'Rejected';
  profileImage?: string;
  qualification?: string;
  registrationYear?: string;
  physicalConsultationStartTime: string;
  physicalConsultationEndTime: string;
  faculty?: string;
  assistantName: string;
  assistantContact: string;
  assistantEmail?: string;
  assistantGender?: string;
  doctorAvailability: 'Online' | 'Offline';
  createdAt?: string;
  updatedAt?: string;
  landline?: string;
  workingWithHospital?: boolean;
  videoConsultation?: boolean;
  gallery?: string[];
  documents?: Record<string, any> & {
    otherDocs?: string[];
    otherDocsStatus?: string[];
    otherDocsAdminRejectionReason?: string[];
  };
  subscription?: {
    startDate?: string;
    endDate?: string;
    plan?: any;
    status?: string;
    history?: any[];
  };
}

interface DoctorEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: Doctor | null;
  onSuccess?: () => void;
}

// ─── TABS ───────────────────────────────────────────────────────────────────

// 1. Profile Tab (Editable)
const ProfileTab = ({
  formData,
  setFormData,
  onSave,
  isSaving
}: {
  formData: Doctor;
  setFormData: React.Dispatch<React.SetStateAction<Doctor>>;
  onSave: (data: Partial<Doctor>) => void;
  isSaving: boolean;
}) => {
  const { data: superData = [], isLoading: isSuperDataLoading } = useGetSuperDataQuery(undefined);

  const allSpecialties = useMemo(() => superData.filter((d: any) => d.type === 'specialization'), [superData]);
  const allSubSpecializations = useMemo(() => superData.filter((d: any) => d.type === 'subSpecialization'), [superData]);
  const allDiseases = useMemo(() => superData.filter((d: any) => d.type === 'disease'), [superData]);

  // Filter sub-specs whose parentId matches one of the selected specialties
  const filteredSubSpecs = useMemo(() => {
    const selectedSpecNames = formData.specialties || [];
    return allSubSpecializations.filter((ss: any) => {
      const parent = allSpecialties.find((s: any) => s._id === ss.parentId);
      return parent && selectedSpecNames.includes(parent.name);
    });
  }, [allSubSpecializations, allSpecialties, formData.specialties]);

  const toggleSpecialty = (specialtyName: string) => {
    const currentSpecs = formData.specialties || [];
    const newSpecs = currentSpecs.includes(specialtyName)
      ? currentSpecs.filter((name: string) => name !== specialtyName)
      : [...currentSpecs, specialtyName];
    // Clear sub-specs when specialty changes (they are specialty-dependent)
    setFormData(prev => ({ ...prev, specialties: newSpecs, subSpecializations: [] }));
  };

  const toggleSubSpec = (subSpecName: string) => {
    const currentSubs = formData.subSpecializations || [];
    const newSubs = currentSubs.includes(subSpecName)
      ? currentSubs.filter((name: string) => name !== subSpecName)
      : [...currentSubs, subSpecName];
    // Preserve diseases when sub-specs change
    setFormData(prev => ({ ...prev, subSpecializations: newSubs }));
  };

  const toggleDisease = (diseaseName: string) => {
    const currentDiseases = formData.diseases || [];
    const newDiseases = currentDiseases.includes(diseaseName)
      ? currentDiseases.filter((name: string) => name !== diseaseName)
      : [...currentDiseases, diseaseName];
    setFormData(prev => ({ ...prev, diseases: newDiseases }));
  };

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Doctor Professional Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center mb-6">
          <div className="relative group w-28 h-28 rounded-full overflow-hidden border-2 border-primary/20 bg-muted">
            {formData.profileImage ? (
              <img
                src={formData.profileImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <UploadCloud className="h-6 w-6 text-white" />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Click to upload doctor profile image</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
            <Select
              value={formData.gender || 'male'}
              onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              disabled
              className="bg-muted cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              disabled
              className="bg-muted cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="qualification">Qualification</Label>
            <Input
              id="qualification"
              value={formData.qualification || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, qualification: e.target.value }))}
              placeholder="e.g. MBBS, MD"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="experience">Experience (Years)</Label>
            <Input
              id="experience"
              type="number"
              value={formData.experience || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
              placeholder="e.g. 5"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registrationYear">Registration Year</Label>
            <Input
              id="registrationYear"
              value={formData.registrationYear || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, registrationYear: e.target.value }))}
              placeholder="e.g. 2015"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="faculty">Faculty / Department</Label>
            <Input
              id="faculty"
              value={formData.faculty || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, faculty: e.target.value }))}
              placeholder="e.g. Cardiology"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Registration Number <span className="text-red-500">*</span></Label>
            <Input
              id="registrationNumber"
              value={formData.registrationNumber || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, registrationNumber: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold text-lg">Specialties</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-2 border rounded-lg bg-muted/20">
            {isSuperDataLoading ? <p>Loading specialties...</p> : (
              allSpecialties.map((spec: any) => (
                <div key={spec._id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`spec-${spec._id}`}
                    checked={formData.specialties?.includes(spec.name) || false}
                    onCheckedChange={() => toggleSpecialty(spec.name)}
                  />
                  <Label htmlFor={`spec-${spec._id}`} className="text-sm cursor-pointer">{spec.name}</Label>
                </div>
              ))
            )}
          </div>
        </div>

        {filteredSubSpecs.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">Sub-specialization</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-2 border rounded-lg bg-muted/20">
              {filteredSubSpecs.map((ss: any) => (
                <div key={ss._id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`sub-${ss._id}`}
                    checked={formData.subSpecializations?.includes(ss.name) || false}
                    onCheckedChange={() => toggleSubSpec(ss.name)}
                  />
                  <Label htmlFor={`sub-${ss._id}`} className="text-sm cursor-pointer">{ss.name}</Label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold text-lg">Diseases Treated</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-2 border rounded-lg bg-muted/20">
            {isSuperDataLoading ? <p>Loading diseases...</p> : (
              allDiseases.map((disease: any) => (
                <div key={disease._id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`disease-${disease._id}`}
                    checked={formData.diseases?.includes(disease.name) || false}
                    onCheckedChange={() => toggleDisease(disease.name)}
                  />
                  <Label htmlFor={`disease-${disease._id}`} className="text-sm cursor-pointer">{disease.name}</Label>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            type="button"
            onClick={() => onSave({
              name: formData.name,
              gender: formData.gender,
              qualification: formData.qualification,
              experience: formData.experience,
              registrationYear: formData.registrationYear,
              faculty: formData.faculty,
              registrationNumber: formData.registrationNumber,
              specialties: formData.specialties,
              subSpecializations: formData.subSpecializations || [],
              diseases: formData.diseases,
              profileImage: formData.profileImage,
            })}
            disabled={isSaving}
          >
            {isSaving ? (
              <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              'Save Profile Info'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// 2. Clinic Details Tab (Editable)
const ClinicDetailsTab = ({
  formData,
  setFormData,
  onSave,
  isSaving
}: {
  formData: Doctor;
  setFormData: React.Dispatch<React.SetStateAction<Doctor>>;
  onSave: (data: Partial<Doctor>) => void;
  isSaving: boolean;
}) => {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GooglePlacesResult[]>([]);
  const [authError, setAuthError] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.Marker | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  // Load Google Maps script
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;

    const checkGoogleMaps = () => {
      if ((window as any).google?.maps) {
        setIsGoogleMapsLoaded(true);
        return true;
      }
      return false;
    };

    if (checkGoogleMaps()) return;

    const scriptId = 'google-maps-native-script';
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      if (checkGoogleMaps()) return;
      const checkInterval = setInterval(() => {
        if (checkGoogleMaps()) clearInterval(checkInterval);
      }, 500);
      return () => clearInterval(checkInterval);
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,drawing,geometry&v=weekly`;
    script.async = true;
    script.defer = true;

    (window as any).gm_authFailure = () => {
      setAuthError(true);
    };

    script.onload = () => setIsGoogleMapsLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!isMapOpen || !isGoogleMapsLoaded || !GOOGLE_MAPS_API_KEY) return;

    const initMap = () => {
      if (!mapContainer.current || !window.google) return;

      if (map.current) {
        google.maps.event.clearInstanceListeners(map.current);
      }

      const center = formData.location
        ? { lat: formData.location.lat, lng: formData.location.lng }
        : { lat: 23.2599, lng: 77.4126 };

      map.current = new google.maps.Map(mapContainer.current, {
        center,
        zoom: formData.location ? 15 : 5,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: false,
      });

      geocoder.current = new google.maps.Geocoder();
      autocompleteService.current = new google.maps.places.AutocompleteService();
      placesService.current = new google.maps.places.PlacesService(map.current);

      if (marker.current) {
        marker.current.setMap(null);
      }

      marker.current = new google.maps.Marker({
        position: center,
        map: map.current,
        draggable: true,
        animation: google.maps.Animation.DROP,
      });

      marker.current.addListener('dragend', () => {
        const position = marker.current!.getPosition();
        if (position) {
          const lat = position.lat();
          const lng = position.lng();
          setFormData(prev => ({ ...prev, location: { lat, lng } }));
          fetchAddress({ lat, lng });
        }
      });

      map.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setFormData(prev => ({ ...prev, location: { lat, lng } }));
        if (marker.current) {
          marker.current.setPosition({ lat, lng });
        }
        fetchAddress({ lat, lng });
      });
    };

    const timeoutId = setTimeout(initMap, 500);
    return () => {
      clearTimeout(timeoutId);
      if (marker.current) {
        marker.current.setMap(null);
      }
    };
  }, [isMapOpen, isGoogleMapsLoaded]);

  const handleSearch = async (query: string) => {
    if (!query.trim() || !autocompleteService.current) {
      setSearchResults([]);
      return;
    }
    try {
      autocompleteService.current.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'IN' },
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSearchResults(predictions.map(p => ({
              description: p.description,
              place_id: p.place_id,
            })));
          } else {
            setSearchResults([]);
          }
        }
      );
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAddress = async (loc: { lat: number; lng: number }) => {
    if (!geocoder.current) return;
    try {
      geocoder.current.geocode({ location: loc }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          const result = results[0];
          let state = '';
          let city = '';
          let pincode = '';

          result.address_components.forEach((component) => {
            if (component.types.includes('administrative_area_level_1')) {
              state = component.long_name;
            }
            if (component.types.includes('locality')) {
              city = component.long_name;
            }
            if (component.types.includes('postal_code')) {
              pincode = component.long_name;
            }
          });

          setFormData(prev => ({
            ...prev,
            clinicAddress: result.formatted_address,
            city: city || prev.city,
            state: state || prev.state,
            pincode: pincode || prev.pincode,
          }));
        }
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSearchResultSelect = (result: GooglePlacesResult) => {
    if (!placesService.current) return;
    placesService.current.getDetails(
      {
        placeId: result.place_id,
        fields: ['geometry', 'formatted_address', 'address_components'],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          let state = '';
          let city = '';
          let pincode = '';

          place.address_components?.forEach((component) => {
            if (component.types.includes('administrative_area_level_1')) {
              state = component.long_name;
            }
            if (component.types.includes('locality')) {
              city = component.long_name;
            }
            if (component.types.includes('postal_code')) {
              pincode = component.long_name;
            }
          });

          setFormData(prev => ({
            ...prev,
            location: { lat, lng },
            clinicAddress: place.formatted_address || result.description,
            city: city || prev.city,
            state: state || prev.state,
            pincode: pincode || prev.pincode,
          }));

          if (map.current) {
            map.current.setCenter({ lat, lng });
            map.current.setZoom(15);
          }
          if (marker.current) {
            marker.current.setPosition({ lat, lng });
          }
          setSearchResults([]);
          setSearchQuery('');
        }
      }
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Clinic & Location Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clinicName">Clinic Name <span className="text-red-500">*</span></Label>
              <Input
                id="clinicName"
                value={formData.clinicName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, clinicName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="landline">Landline</Label>
              <Input
                id="landline"
                value={formData.landline || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, landline: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">State <span className="text-red-500">*</span></Label>
              <Input
                id="state"
                value={formData.state || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
              <Input
                id="city"
                value={formData.city || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode <span className="text-red-500">*</span></Label>
              <Input
                id="pincode"
                value={formData.pincode || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location Coordinates <span className="text-red-500">*</span></Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={formData.location ? `${formData.location.lat.toFixed(6)}, ${formData.location.lng.toFixed(6)}` : ''}
                placeholder="Choose location from map"
              />
              <Button type="button" variant="outline" onClick={() => setIsMapOpen(true)}>
                <Map className="mr-2 h-4 w-4" />
                Choose from Map
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinicAddress">Clinic Address <span className="text-red-500">*</span></Label>
            <Textarea
              id="clinicAddress"
              rows={3}
              value={formData.clinicAddress || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, clinicAddress: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Physical Consultation Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.physicalConsultationStartTime || '09:00'}
                onChange={(e) => setFormData(prev => ({ ...prev, physicalConsultationStartTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Physical Consultation End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.physicalConsultationEndTime || '17:00'}
                onChange={(e) => setFormData(prev => ({ ...prev, physicalConsultationEndTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20">
              <div className="flex flex-col space-y-0.5">
                <Label>Video Consultation</Label>
                <span className="text-xs text-muted-foreground">Does the doctor offer virtual appointments?</span>
              </div>
              <Switch
                checked={formData.videoConsultation || false}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, videoConsultation: checked }))}
              />
            </div>
            <div className="flex items-center justify-between border p-3 rounded-lg bg-muted/20">
              <div className="flex flex-col space-y-0.5">
                <Label>Working with Hospital</Label>
                <span className="text-xs text-muted-foreground">Is the doctor affiliated with a hospital?</span>
              </div>
              <Switch
                checked={formData.workingWithHospital || false}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, workingWithHospital: checked }))}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              type="button"
              onClick={() => onSave({
                clinicName: formData.clinicName,
                clinicAddress: formData.clinicAddress,
                state: formData.state,
                city: formData.city,
                pincode: formData.pincode,
                location: formData.location,
                physicalConsultationStartTime: formData.physicalConsultationStartTime,
                physicalConsultationEndTime: formData.physicalConsultationEndTime,
                videoConsultation: formData.videoConsultation,
                workingWithHospital: formData.workingWithHospital,
                landline: formData.landline,
              })}
              disabled={isSaving}
            >
              {isSaving ? (
                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                'Save Clinic Details'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
        <DialogContent className="sm:max-w-5xl h-[80vh] p-0 flex flex-col">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Select Precise Clinic Location</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col relative overflow-hidden">
            <div className="absolute top-4 left-4 right-4 z-[100] max-w-md">
              <Input
                placeholder="Search clinic area..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                className="bg-white shadow-lg"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-[110]">
                  {searchResults.map((res) => (
                    <div
                      key={res.place_id}
                      className="p-2 hover:bg-slate-100 cursor-pointer text-sm truncate"
                      onClick={() => handleSearchResultSelect(res)}
                    >
                      {res.description}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div ref={mapContainer} className="w-full h-full bg-slate-100" />
          </div>
          <DialogFooter className="p-4 border-t flex items-center justify-end gap-2 bg-slate-50">
            <Button variant="ghost" onClick={() => setIsMapOpen(false)}>Cancel</Button>
            <Button onClick={() => setIsMapOpen(false)} disabled={!formData.location}>Select Location</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// 3. Assistant Tab (Editable)
const AssistantTab = ({
  formData,
  setFormData,
  onSave,
  isSaving
}: {
  formData: Doctor;
  setFormData: React.Dispatch<React.SetStateAction<Doctor>>;
  onSave: (data: Partial<Doctor>) => void;
  isSaving: boolean;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assistant Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="assistantName">Assistant Name</Label>
            <Input
              id="assistantName"
              value={formData.assistantName || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, assistantName: e.target.value }))}
              placeholder="Name of assistant"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assistantContact">Assistant Contact Number</Label>
            <Input
              id="assistantContact"
              value={formData.assistantContact || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, assistantContact: e.target.value }))}
              placeholder="Contact number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assistantEmail">Assistant Email</Label>
            <Input
              id="assistantEmail"
              type="email"
              value={formData.assistantEmail || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, assistantEmail: e.target.value }))}
              placeholder="Email address"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assistantGender">Assistant Gender</Label>
            <Select
              value={formData.assistantGender || ''}
              onValueChange={(val) => setFormData(prev => ({ ...prev, assistantGender: val }))}
            >
              <SelectTrigger id="assistantGender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            type="button"
            onClick={() => onSave({
              assistantName: formData.assistantName,
              assistantContact: formData.assistantContact,
              assistantEmail: formData.assistantEmail,
              assistantGender: formData.assistantGender,
            })}
            disabled={isSaving}
          >
            {isSaving ? (
              <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              'Save Assistant Details'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// 4. Subscription Tab (Editable)
const SubscriptionTab = ({
  doctor,
  onSuccess,
  onClose
}: {
  doctor: Doctor;
  onSuccess?: () => void;
  onClose?: () => void;
}) => {
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedRenewalPlan, setSelectedRenewalPlan] = useState<any>(null);
  const [isRenewing, setIsRenewing] = useState(false);
  const { data: plans = [], isLoading: plansLoading } = useGetSubscriptionPlansQuery(undefined);
  const token = useSelector((state: any) => state.adminAuth?.token);

  const handleRenewClick = () => {
    setSelectedRenewalPlan(null);
    setIsRenewModalOpen(true);
    loadRazorpayScript();
  };

  const submitRenewal = async () => {
    if (!doctor._id || !selectedRenewalPlan) {
      toast.error("Please select a plan");
      return;
    }

    const planAmount = selectedRenewalPlan.discountedPrice && selectedRenewalPlan.discountedPrice > 0
      ? selectedRenewalPlan.discountedPrice
      : selectedRenewalPlan.price;

    const activateRenewal = async (paymentId?: string, paymentOrderId?: string) => {
      const response = await fetch('/api/admin/subscription-renewal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          userId: doctor._id,
          userType: 'doctor',
          planId: selectedRenewalPlan._id,
          ...(paymentId && { paymentId, paymentOrderId, paymentMethod: 'online' }),
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const msg = data.schedulingMode === 'Scheduled'
          ? 'Plan scheduled — will activate after current subscription ends.'
          : 'Subscription renewed successfully!';
        toast.success(msg);
        setIsRenewModalOpen(false);
        if (onSuccess) onSuccess();
      } else {
        throw new Error(data.message || "Failed to renew");
      }
    };

    if (!planAmount || planAmount <= 0) {
      try {
        setIsRenewing(true);
        await activateRenewal();
      } catch (error: any) {
        toast.error(error?.message || "Failed to process subscription");
      } finally {
        setIsRenewing(false);
      }
      return;
    }

    setIsRenewing(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Payment gateway failed to load');
        return;
      }

      const orderRes = await fetch('/api/admin/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          amount: planAmount,
          currency: 'INR',
          receipt: `admin_doc_${selectedRenewalPlan._id}_${Date.now()}`,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.id) {
        throw new Error(orderData.message || 'Failed to create payment order');
      }

      setIsRenewModalOpen(false);
      if (onClose) onClose();

      await new Promise<void>((resolve, reject) => {
        let rzp: any;
        try {
          rzp = new (window as any).Razorpay({
            key: orderData.key_id || 'rzp_test_SLBxzQHGTzUTCO',
            amount: Math.round(planAmount * 100),
            currency: 'INR',
            order_id: orderData.id,
            name: 'GlowVita Admin',
            description: `${selectedRenewalPlan.name} – ${doctor.name}`,
            image: 'https://glowvita.com/logo.png',
            theme: { color: '#7c3aed' },
            retry: { enabled: true, max_count: 3 },
            modal: {
              ondismiss: () => {
                setIsRenewModalOpen(true);
                reject(new Error('Payment cancelled'));
              },
              escape: true,
            },
            handler: async (response: any) => {
              try {
                const verifyRes = await fetch('/api/admin/payments/verify', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || ''}`
                  },
                  body: JSON.stringify(response),
                });
                const verifyData = await verifyRes.json();
                if (!verifyData.success) throw new Error('Payment verification failed');

                await activateRenewal(response.razorpay_payment_id, response.razorpay_order_id);
                resolve();
              } catch (err: any) {
                setIsRenewModalOpen(true);
                reject(err);
              }
            },
          });
        } catch (initErr: any) {
          reject(initErr);
          return;
        }
        rzp.open();
      });
    } catch (error: any) {
      if (error?.message !== 'Payment cancelled') {
        toast.error(error?.message || 'Failed to renew subscription');
        setIsRenewModalOpen(true);
      }
    } finally {
      setIsRenewing(false);
    }
  };

  const currentPlanName = doctor.subscription?.plan && typeof doctor.subscription.plan === 'object'
    ? (doctor.subscription.plan as any).name
    : "No Active Plan";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Current Subscription</CardTitle>
          <Button type="button" onClick={handleRenewClick} size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Renew Subscription
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Current Plan</Label>
                <div className="text-xl font-bold flex items-center gap-2 mt-1">
                  {currentPlanName}
                  <Badge variant={doctor.subscription?.status === 'Active' ? 'default' : 'destructive'}>
                    {doctor.subscription?.status || 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Start Date</Label>
                  <div className="font-medium mt-1">
                    {doctor.subscription?.startDate ? new Date(doctor.subscription.startDate).toLocaleDateString() : '-'}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">End Date</Label>
                  <div className="font-medium mt-1">
                    {doctor.subscription?.endDate ? new Date(doctor.subscription.endDate).toLocaleDateString() : '-'}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg flex flex-col justify-center items-center text-center">
              {doctor.subscription?.endDate ? (() => {
                const now = new Date();
                const end = new Date(doctor.subscription.endDate);
                now.setHours(0, 0, 0, 0);
                const endOnly = new Date(end);
                endOnly.setHours(0, 0, 0, 0);
                const diffTime = endOnly.getTime() - now.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays >= 0) return (
                  <>
                    <span className="text-3xl font-bold text-green-600">{diffDays}</span>
                    <span className="text-sm text-muted-foreground mt-1">Days Remaining</span>
                  </>
                ); else return (
                  <>
                    <span className="text-3xl font-bold text-red-600">{Math.abs(diffDays)}</span>
                    <span className="text-sm text-muted-foreground mt-1">Days Overdue</span>
                  </>
                );
              })() : <span className="text-muted-foreground">No duration info</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Subscription History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {doctor.subscription?.history?.length ? (
              <div className="relative space-y-6 pl-8 border-l-2 border-muted-foreground/20 ml-2 mt-4 mb-4">
                {[...doctor.subscription.history]
                  .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                  .map((item, index) => {
                    const matchedPlan = plans.find((p: any) => p._id === item.plan || p.id === item.plan);
                    const planName = (item.plan && typeof item.plan === 'object') ? item.plan.name : (matchedPlan?.name || 'Subscription Plan');
                    return (
                      <div key={index} className="relative">
                        <div className="absolute -left-[2.6rem] top-1.5 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-4 border">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-sm">{planName}</h4>
                              <div className="grid grid-cols-2 gap-4 mt-2 text-xs text-muted-foreground">
                                <div>From: {new Date(item.startDate).toLocaleDateString()}</div>
                                <div>To: {new Date(item.endDate).toLocaleDateString()}</div>
                              </div>
                            </div>
                            <Badge variant={item.status === 'Active' ? 'default' : 'secondary'}>{item.status}</Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">No subscription history available</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isRenewModalOpen} onOpenChange={setIsRenewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Subscription</DialogTitle>
            <DialogDescription>Choose a plan to renew this doctor's subscription.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[50vh] overflow-y-auto">
            {plansLoading ? <p>Loading plans...</p> : (
              plans.map((plan: any) => (
                <div
                  key={plan._id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedRenewalPlan?._id === plan._id ? 'border-primary bg-primary/5 ring-1' : ''}`}
                  onClick={() => setSelectedRenewalPlan(plan)}
                >
                  <div className="flex justify-between font-semibold">
                    <span>{plan.name}</span>
                    <span>₹{plan.discountedPrice || plan.price}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{plan.duration} {plan.durationType}</div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenewModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={submitRenewal} disabled={isRenewing || !selectedRenewalPlan}>
              {isRenewing ? 'Processing...' : 'Pay & Renew'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// 5. Gallery Tab (View Only)
const GalleryTab = ({ doctor }: { doctor: Doctor | null }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (!doctor) return <div>No doctor data</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Doctor Gallery</CardTitle>
      </CardHeader>
      <CardContent>
        {doctor.gallery && doctor.gallery.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {doctor.gallery.map((src, index) => (
              <div key={index} className="relative aspect-video border rounded-lg overflow-hidden cursor-pointer" onClick={() => setPreviewImage(src)}>
                <img src={src} alt="Gallery" className="object-cover w-full h-full" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">No gallery images uploaded yet</p>
        )}

        {previewImage && (
          <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
            <DialogContent className="sm:max-w-3xl flex items-center justify-center p-0 overflow-hidden bg-black">
              <Button size="icon" variant="ghost" className="absolute top-2 right-2 text-white hover:bg-white/20" onClick={() => setPreviewImage(null)}>
                <X className="h-6 w-6" />
              </Button>
              <img src={previewImage} alt="Preview" className="max-h-[70vh] object-contain max-w-full" />
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

// 6. Documents Tab (View Only)
const DocumentsTab = ({ doctor }: { doctor: Doctor | null }) => {
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  if (!doctor) return <div>No doctor data</div>;

  const docTypes = [
    { key: 'aadharCard', label: 'Aadhar Card' },
    { key: 'panCard', label: 'PAN Card' },
    { key: 'medicalRegCert', label: 'Medical Registration Certificate' },
    { key: 'medicalDegreeCert', label: 'Medical Degree Certificate' },
    { key: 'clinicDetails', label: 'Clinic Details Document' }
  ];

  const otherDocs: string[] = doctor.documents?.otherDocs || [];
  const otherDocsStatus: string[] = doctor.documents?.otherDocsStatus || [];
  const otherDocsReason: string[] = doctor.documents?.otherDocsAdminRejectionReason || [];

  const openPreview = (url: string, title: string) => {
    setPreviewDoc(url);
    setPreviewTitle(title);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Standard Documents */}
        {docTypes.map((doc) => {
          const fileUrl = doctor.documents?.[doc.key];
          const status = doctor.documents?.[`${doc.key}Status`] || 'pending';
          const reason = doctor.documents?.[`${doc.key}AdminRejectionReason`];

          return (
            <div key={doc.key} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-muted/10 gap-4">
              <div className="space-y-1">
                <span className="font-semibold text-sm">{doc.label}</span>
                {reason && <p className="text-xs text-red-500">Rejection Reason: {reason}</p>}
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary'}>
                  {status}
                </Badge>
                {fileUrl ? (
                  <Button size="sm" variant="outline" onClick={() => openPreview(fileUrl, doc.label)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Not Uploaded</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Other Documents Section */}
        {otherDocs.length > 0 && (
          <>
            <div className="pt-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2 mb-3">
                Other Documents ({otherDocs.length})
              </h4>
              <div className="space-y-3">
                {otherDocs.map((fileUrl, idx) => {
                  const status = otherDocsStatus[idx] || 'pending';
                  const reason = otherDocsReason[idx];
                  const label = `Other Document ${idx + 1}`;

                  return (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-amber-50/30 gap-4">
                      <div className="space-y-1">
                        <span className="font-semibold text-sm">{label}</span>
                        {reason && <p className="text-xs text-red-500">Rejection Reason: {reason}</p>}
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary'}>
                          {status}
                        </Badge>
                        {fileUrl ? (
                          <Button size="sm" variant="outline" onClick={() => openPreview(fileUrl, label)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not Uploaded</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {otherDocs.length === 0 && (
          <div className="pt-2 border-t">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pb-2">
              Other Documents
            </h4>
            <p className="text-sm text-muted-foreground italic">No other documents uploaded.</p>
          </div>
        )}

        {previewDoc && (
          <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
            <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Document Preview — {previewTitle}</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center bg-slate-50 p-4 rounded-lg">
                {previewDoc.toLowerCase().includes('.pdf') ? (
                  <iframe src={previewDoc} className="w-full h-[60vh] border rounded" />
                ) : (
                  <img src={previewDoc} alt="Document" className="max-h-[60vh] object-contain" />
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => setPreviewDoc(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

// 7. Patients Tab (View Only)
const PatientsTab = ({ doctor }: { doctor: Doctor | null }) => {
  const { data = [], isLoading } = useGetConsultationsQuery({
    doctorId: doctor?._id || ''
  }, { skip: !doctor?._id });

  const consultations = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray((data as any).consultations)) {
      return (data as any).consultations;
    }
    if (data && typeof data === 'object' && Array.isArray((data as any).data)) {
      return (data as any).data;
    }
    return [];
  }, [data]);

  if (!doctor) return <div>No doctor data</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Doctor Patients / Consultations</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-4 text-muted-foreground">Loading consultations...</p>
        ) : consultations.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">No consultations found for this doctor</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4 font-semibold text-muted-foreground">Patient Name</th>
                  <th className="text-left py-2 px-4 font-semibold text-muted-foreground">Phone Number</th>
                  <th className="text-left py-2 px-4 font-semibold text-muted-foreground">Date</th>
                  <th className="text-left py-2 px-4 font-semibold text-muted-foreground">Time</th>
                  <th className="text-left py-2 px-4 font-semibold text-muted-foreground">Consultation Type</th>
                  <th className="text-left py-2 px-4 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {consultations.map((item: any) => (
                  <tr key={item._id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-2 px-4 font-medium">{item.patientName}</td>
                    <td className="py-2 px-4">{item.phoneNumber || 'N/A'}</td>
                    <td className="py-2 px-4">
                      {item.appointmentDate ? new Date(item.appointmentDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-2 px-4">{item.appointmentTime || 'N/A'}</td>
                    <td className="py-2 px-4 capitalize">{item.consultationType || 'Physical'}</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          item.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                        }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── MAIN FORM COMPONENT ───────────────────────────────────────────────────

export function DoctorEditForm({ isOpen, onClose, doctor, onSuccess }: DoctorEditFormProps) {
  const [formData, setFormData] = useState<Doctor>({
    name: '', email: '', phone: '', gender: 'male', registrationNumber: '',
    doctorType: 'Physician', specialties: [], subSpecializations: [], diseases: [], experience: '',
    clinicName: '', clinicAddress: '', state: '', city: '', pincode: '',
    physicalConsultationStartTime: '09:00', physicalConsultationEndTime: '17:00',
    assistantName: '', assistantContact: '', doctorAvailability: 'Online',
    workingWithHospital: false, videoConsultation: false
  });
  const [isSavingTab, setIsSavingTab] = useState(false);
  const [updateDoctor] = useUpdateDoctorMutation();

  useEffect(() => {
    if (isOpen && doctor) {
      setFormData({ ...doctor });
    }
  }, [doctor, isOpen]);

  const handleSaveTab = async (partialData: Partial<Doctor>) => {
    if (!doctor?._id) return;
    try {
      setIsSavingTab(true);
      await updateDoctor({ id: doctor._id, ...partialData }).unwrap();
      toast.success("Details updated successfully");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to update doctor details");
    } finally {
      setIsSavingTab(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Doctor: {doctor?.name}</DialogTitle>
          <DialogDescription>Update the doctor's details across different tabs. Each tab has its own Save button.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full py-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="clinic">Clinic Details</TabsTrigger>
            <TabsTrigger value="assistant">Assistant</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <ProfileTab
              formData={formData}
              setFormData={setFormData}
              onSave={handleSaveTab}
              isSaving={isSavingTab}
            />
          </TabsContent>

          <TabsContent value="clinic" className="mt-4">
            <ClinicDetailsTab
              formData={formData}
              setFormData={setFormData}
              onSave={handleSaveTab}
              isSaving={isSavingTab}
            />
          </TabsContent>

          <TabsContent value="assistant" className="mt-4">
            <AssistantTab
              formData={formData}
              setFormData={setFormData}
              onSave={handleSaveTab}
              isSaving={isSavingTab}
            />
          </TabsContent>

          <TabsContent value="subscription" className="mt-4">
            <SubscriptionTab
              doctor={doctor}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          </TabsContent>

          <TabsContent value="gallery" className="mt-4">
            <GalleryTab doctor={doctor} />
          </TabsContent>

          <TabsContent value="document" className="mt-4">
            <DocumentsTab doctor={doctor} />
          </TabsContent>

          <TabsContent value="patients" className="mt-4">
            <PatientsTab doctor={doctor} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
