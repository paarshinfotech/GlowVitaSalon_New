import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select";
import { Checkbox } from "@repo/ui/checkbox";
import { useUpdateDoctorProfileMutation } from '@repo/store/api';
import { toast } from 'sonner';
import { Building2, Calendar, AlertCircle } from 'lucide-react';

interface ClinicTabProps {
  doctor: any;
  setDoctor: any;
}

interface FieldErrors {
  clinicName?: string;
  clinicAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  doctorType?: string;
  landline?: string;
}

// Landline: 6–13 digits only
const LANDLINE_REGEX = /^[0-9]{6,13}$/;

export const ClinicTab = ({ doctor, setDoctor }: ClinicTabProps) => {
  const [updateDoctorProfile] = useUpdateDoctorProfileMutation();
  const [errors, setErrors] = useState<FieldErrors>({});

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: FieldErrors = {};

    if (!doctor.clinicName?.trim())    newErrors.clinicName    = 'Clinic Name is required.';
    if (!doctor.clinicAddress?.trim()) newErrors.clinicAddress = 'Clinic Address is required.';
    if (!doctor.city?.trim())          newErrors.city          = 'City is required.';
    if (!doctor.state?.trim())         newErrors.state         = 'State is required.';
    if (!doctor.pincode?.trim())       newErrors.pincode       = 'Pincode is required.';
    if (!doctor.doctorType)            newErrors.doctorType    = 'Doctor Type is required.';

    // Landline is optional — validate only if filled
    const landline = (doctor.landline || '').trim();
    if (landline && !LANDLINE_REGEX.test(landline)) {
      newErrors.landline = 'Please enter a valid landline number.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Landline handlers ──────────────────────────────────────────────────────
  // Allow only digits; max 13 chars
  const handleLandlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // strip non-digits
    if (val.length > 13) return;
    setDoctor({ ...doctor, landline: val });
    if (errors.landline) setErrors(prev => ({ ...prev, landline: undefined }));
  };

  const handleLandlineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;

    try {
      const result: any = await updateDoctorProfile({
        clinicName: doctor.clinicName,
        clinicAddress: doctor.clinicAddress,
        state: doctor.state,
        city: doctor.city,
        pincode: doctor.pincode,
        landline: doctor.landline,
        doctorType: doctor.doctorType,
        doctorAvailability: doctor.doctorAvailability,
        workingWithHospital: doctor.workingWithHospital,
        videoConsultation: doctor.videoConsultation,
        physicalConsultationStartTime: doctor.physicalConsultationStartTime || doctor.physicalConsultation?.startTime,
        physicalConsultationEndTime: doctor.physicalConsultationEndTime || doctor.physicalConsultation?.endTime,
      }).unwrap();

      if (result.success) {
        toast.success(result.message || 'Clinic details updated successfully');
      } else {
        toast.error(result.message || 'Failed to update clinic details');
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update clinic details');
    }
  };

  // ── Helper: inline error ───────────────────────────────────────────────────
  const ErrorMsg = ({ msg }: { msg?: string }) =>
    msg ? (
      <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        {msg}
      </p>
    ) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clinic Details</CardTitle>
        <CardDescription>
          Update your clinic's location, landline, and address details.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">

        {/* Row 1: Clinic Name + Landline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="space-y-1.5">
            <Label htmlFor="clinicName" className="text-sm sm:text-base">Clinic Name <span className="text-red-500">*</span></Label>
            <Input
              id="clinicName"
              value={doctor.clinicName || ''}
              onChange={(e) => {
                setDoctor({ ...doctor, clinicName: e.target.value });
                if (errors.clinicName) setErrors(prev => ({ ...prev, clinicName: undefined }));
              }}
              placeholder="Enter clinic name"
              className={`h-10 sm:h-12 rounded-lg ${errors.clinicName ? 'border-red-500 focus-visible:ring-red-400' : ''}`}
            />
            <ErrorMsg msg={errors.clinicName} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="landline" className="text-sm sm:text-base">
              Clinic Landline
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">(Optional, 6–13 digits)</span>
            </Label>
            <Input
              id="landline"
              type="tel"
              inputMode="numeric"
              value={doctor.landline || ''}
              onChange={handleLandlineChange}
              onKeyDown={handleLandlineKeyDown}
              placeholder="e.g. 02223456789"
              maxLength={13}
              className={`h-10 sm:h-12 rounded-lg ${errors.landline ? 'border-red-500 focus-visible:ring-red-400' : ''}`}
            />
            <ErrorMsg msg={errors.landline} />
          </div>

        </div>

        {/* Clinic Address */}
        <div className="space-y-1.5">
          <Label htmlFor="clinicAddress" className="text-sm sm:text-base">Clinic Address <span className="text-red-500">*</span></Label>
          <Textarea
            id="clinicAddress"
            value={doctor.clinicAddress || ''}
            onChange={(e) => {
              setDoctor({ ...doctor, clinicAddress: e.target.value });
              if (errors.clinicAddress) setErrors(prev => ({ ...prev, clinicAddress: undefined }));
            }}
            placeholder="Enter clinic full address"
            className={`min-h-[80px] rounded-lg ${errors.clinicAddress ? 'border-red-500 focus-visible:ring-red-400' : ''}`}
          />
          <ErrorMsg msg={errors.clinicAddress} />
        </div>

        {/* City / State / Pincode */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="space-y-1.5">
            <Label htmlFor="city" className="text-sm sm:text-base">City <span className="text-red-500">*</span></Label>
            <Input
              id="city"
              value={doctor.city || ''}
              onChange={(e) => {
                setDoctor({ ...doctor, city: e.target.value });
                if (errors.city) setErrors(prev => ({ ...prev, city: undefined }));
              }}
              placeholder="City"
              className={`h-10 sm:h-12 rounded-lg ${errors.city ? 'border-red-500 focus-visible:ring-red-400' : ''}`}
            />
            <ErrorMsg msg={errors.city} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="state" className="text-sm sm:text-base">State <span className="text-red-500">*</span></Label>
            <Input
              id="state"
              value={doctor.state || ''}
              onChange={(e) => {
                setDoctor({ ...doctor, state: e.target.value });
                if (errors.state) setErrors(prev => ({ ...prev, state: undefined }));
              }}
              placeholder="State"
              className={`h-10 sm:h-12 rounded-lg ${errors.state ? 'border-red-500 focus-visible:ring-red-400' : ''}`}
            />
            <ErrorMsg msg={errors.state} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pincode" className="text-sm sm:text-base">Pincode <span className="text-red-500">*</span></Label>
            <Input
              id="pincode"
              value={doctor.pincode || ''}
              onChange={(e) => {
                setDoctor({ ...doctor, pincode: e.target.value });
                if (errors.pincode) setErrors(prev => ({ ...prev, pincode: undefined }));
              }}
              placeholder="Pincode"
              className={`h-10 sm:h-12 rounded-lg ${errors.pincode ? 'border-red-500 focus-visible:ring-red-400' : ''}`}
            />
            <ErrorMsg msg={errors.pincode} />
          </div>

        </div>

        {/* Practice & Consultation Details */}
        <div className="space-y-4 pt-4 border-t border-border/50">
          <h3 className="font-semibold text-base sm:text-lg">
            Practice & Consultation
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="doctorType" className="text-sm sm:text-base">Doctor Type <span className="text-red-500">*</span></Label>
              <Select
                value={doctor.doctorType || ''}
                onValueChange={(value) => {
                  setDoctor({ ...doctor, doctorType: value });
                  if (errors.doctorType) setErrors(prev => ({ ...prev, doctorType: undefined }));
                }}
              >
                <SelectTrigger id="doctorType" className={`h-10 sm:h-12 rounded-lg ${errors.doctorType ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select Doctor Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Physician">Physician</SelectItem>
                  <SelectItem value="Surgeon">Surgeon</SelectItem>
                </SelectContent>
              </Select>
              <ErrorMsg msg={errors.doctorType} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doctorAvailability" className="text-sm sm:text-base">Availability</Label>
              <Select
                value={doctor.doctorAvailability || 'Online'}
                onValueChange={(value) => setDoctor({ ...doctor, doctorAvailability: value })}
              >
                <SelectTrigger id="doctorAvailability" className="h-10 sm:h-12 rounded-lg">
                  <SelectValue placeholder="Select Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Offline">Offline</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="physicalConsultationStartTime" className="text-sm sm:text-base">Physical Consultation Start</Label>
              <Input
                id="physicalConsultationStartTime"
                type="time"
                value={doctor.physicalConsultationStartTime || doctor.physicalConsultation?.startTime || '09:00'}
                onChange={(e) => setDoctor({ ...doctor, physicalConsultationStartTime: e.target.value })}
                className="h-10 sm:h-12 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="physicalConsultationEndTime" className="text-sm sm:text-base">Physical Consultation End</Label>
              <Input
                id="physicalConsultationEndTime"
                type="time"
                value={doctor.physicalConsultationEndTime || doctor.physicalConsultation?.endTime || '17:00'}
                onChange={(e) => setDoctor({ ...doctor, physicalConsultationEndTime: e.target.value })}
                className="h-10 sm:h-12 rounded-lg"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="workingWithHospital"
                checked={doctor.workingWithHospital || false}
                onCheckedChange={(checked) => setDoctor({ ...doctor, workingWithHospital: !!checked })}
              />
              <Label htmlFor="workingWithHospital" className="text-sm cursor-pointer">Working with Hospital</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="videoConsultation"
                checked={doctor.videoConsultation || false}
                onCheckedChange={(checked) => setDoctor({ ...doctor, videoConsultation: !!checked })}
              />
              <Label htmlFor="videoConsultation" className="text-sm cursor-pointer">Enable Video Consultation</Label>
            </div>
          </div>
        </div>

      </CardContent>

      <CardFooter>
        <Button
          onClick={handleSave}
          className="h-12 px-6 rounded-lg bg-primary hover:bg-primary/90"
        >
          Save Clinic Details
        </Button>
      </CardFooter>
    </Card>
  );
};
