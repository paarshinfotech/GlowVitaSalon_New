import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select";
import { useUpdateDoctorProfileMutation } from '@repo/store/api';
import { toast } from 'sonner';
import { UserRound, AlertCircle } from 'lucide-react';

interface AssistantTabProps {
  doctor: any;
  setDoctor: any;
}

interface FieldErrors {
  assistantName?: string;
  assistantContact?: string;
  assistantEmail?: string;
}

const NAME_REGEX = /^[a-zA-Z ]*$/;
const EMAIL_REGEX = /^[a-z0-9._\-@]+$/;
const VALID_EMAIL_FORMAT = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/;

export const AssistantTab = ({ doctor, setDoctor }: AssistantTabProps) => {
  const [updateDoctorProfile] = useUpdateDoctorProfileMutation();
  const [errors, setErrors] = useState<FieldErrors>({});

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: FieldErrors = {};

    // Full Name
    const name = (doctor.assistantName || '').trim();
    if (!name) {
      newErrors.assistantName = 'Please enter a valid full name using letters only.';
    } else if (!NAME_REGEX.test(name)) {
      newErrors.assistantName = 'Please enter a valid full name using letters only.';
    } else if (name.length < 2 || name.length > 50) {
      newErrors.assistantName = 'Please enter a valid full name using letters only.';
    }

    // Mobile Number
    const mobile = (doctor.assistantContact || '').trim();
    if (!mobile) {
      newErrors.assistantContact = 'Please enter a valid 10-digit mobile number.';
    } else if (!/^\d{10}$/.test(mobile)) {
      newErrors.assistantContact = 'Please enter a valid 10-digit mobile number.';
    }

    // Email Address — optional, only validate format if filled
    const email = (doctor.assistantEmail || '').trim();
    if (email && !VALID_EMAIL_FORMAT.test(email)) {
      newErrors.assistantEmail = 'Please enter a valid email address.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Field Handlers ─────────────────────────────────────────────────────────

  // Full Name: allow only letters and spaces
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!NAME_REGEX.test(val)) return; // block invalid chars
    if (val.length > 50) return;       // block beyond max
    setDoctor({ ...doctor, assistantName: val });
    if (errors.assistantName) setErrors(prev => ({ ...prev, assistantName: undefined }));
  };

  // Mobile: allow only digits, max 10
  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // strip non-digits
    if (val.length > 10) return;
    setDoctor({ ...doctor, assistantContact: val });
    if (errors.assistantContact) setErrors(prev => ({ ...prev, assistantContact: undefined }));
  };

  // Block non-digit keystrokes on mobile field
  const handleMobileKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  // Email: auto-lowercase, no spaces, only valid chars
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/\s/g, '');
    if (val && !EMAIL_REGEX.test(val)) return; // block invalid chars
    setDoctor({ ...doctor, assistantEmail: val });
    if (errors.assistantEmail) setErrors(prev => ({ ...prev, assistantEmail: undefined }));
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;

    try {
      const result: any = await updateDoctorProfile({
        assistantName: doctor.assistantName?.trim(),
        assistantContact: doctor.assistantContact?.trim(),
        assistantEmail: doctor.assistantEmail?.trim(),
        assistantGender: doctor.assistantGender,
      }).unwrap();

      if (result.success) {
        toast.success(result.message || 'Assistant details saved successfully');
      } else {
        toast.error(result.message || 'Failed to save assistant details');
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to save assistant details');
    }
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <CardTitle>Doctor Assistant Details</CardTitle>
        <CardDescription>
          Update your assistant's personal and contact information.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="assistantName" className="text-sm sm:text-base">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="assistantName"
              type="text"
              value={doctor.assistantName || ''}
              onChange={handleNameChange}
              placeholder="e.g. Rahul Sharma"
              className={`h-10 sm:h-12 rounded-lg ${errors.assistantName ? 'border-red-500 focus-visible:ring-red-400' : ''}`}
            />
            {errors.assistantName && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {errors.assistantName}
              </p>
            )}
          </div>

          {/* Mobile Number */}
          <div className="space-y-2">
            <Label htmlFor="assistantContact" className="text-sm sm:text-base">
              Mobile Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="assistantContact"
              type="tel"
              inputMode="numeric"
              value={doctor.assistantContact || ''}
              onChange={handleMobileChange}
              onKeyDown={handleMobileKeyDown}
              placeholder="10-digit mobile number"
              maxLength={10}
              className={`h-10 sm:h-12 rounded-lg ${errors.assistantContact ? 'border-red-500 focus-visible:ring-red-400' : ''}`}
            />
            {errors.assistantContact && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {errors.assistantContact}
              </p>
            )}
          </div>

          {/* Email Address */}
          <div className="space-y-2">
            <Label htmlFor="assistantEmail" className="text-sm sm:text-base">
              Email Address
            </Label>
            <Input
              id="assistantEmail"
              type="email"
              value={doctor.assistantEmail || ''}
              onChange={handleEmailChange}
              placeholder="e.g. assistant@gmail.com"
              className={`h-10 sm:h-12 rounded-lg ${errors.assistantEmail ? 'border-red-500 focus-visible:ring-red-400' : ''}`}
            />
            {errors.assistantEmail && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {errors.assistantEmail}
              </p>
            )}
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="assistantGender" className="text-sm sm:text-base">
              Gender
            </Label>
            <Select
              value={doctor.assistantGender || ''}
              onValueChange={(value) => setDoctor({ ...doctor, assistantGender: value })}
            >
              <SelectTrigger id="assistantGender" className="h-10 sm:h-12 rounded-lg">
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
      </CardContent>

      <CardFooter>
        <Button
          onClick={handleSave}
          className="h-12 px-6 rounded-lg bg-primary hover:bg-primary/90"
        >
          Save Assistant Details
        </Button>
      </CardFooter>
    </Card>
  );
};
