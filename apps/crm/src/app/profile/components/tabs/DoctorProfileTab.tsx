import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Checkbox } from "@repo/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select";
import { useUpdateDoctorProfileMutation, useGetSuperDataQuery } from '@repo/store/api';
import { useAppDispatch } from '@repo/store/hooks';
import { updateUser } from '@repo/store/slices/crmAuthSlice';
import { toast } from 'sonner';
import { Upload, User, Stethoscope } from 'lucide-react';

interface DoctorProfileTabProps {
  doctor: any;
  setDoctor: any;
  handleProfileImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export const DoctorProfileTab = ({ doctor, setDoctor, handleProfileImageUpload }: DoctorProfileTabProps) => {
  const [updateDoctorProfile] = useUpdateDoctorProfileMutation();
  const { data: dropdownData = [] } = useGetSuperDataQuery(undefined);
  const dispatch = useAppDispatch();

  // Extract specialities, sub-specializations and diseases from super data
  const allSpecialties = useMemo(() => dropdownData.filter((d: any) => d.type === 'specialization'), [dropdownData]);
  const allSubSpecializations = useMemo(() => dropdownData.filter((d: any) => d.type === 'subSpecialization'), [dropdownData]);
  const allDiseases = useMemo(() => dropdownData.filter((d: any) => d.type === 'disease'), [dropdownData]);

  // Sub-specs whose parentId matches a selected specialty
  const filteredSubSpecs = useMemo(() => {
    const selectedSpecNames = doctor.specialties || [];
    return allSubSpecializations.filter((ss: any) => {
      const parent = allSpecialties.find((s: any) => s._id === ss.parentId);
      return parent && selectedSpecNames.includes(parent.name);
    });
  }, [allSubSpecializations, allSpecialties, doctor.specialties]);

  // Show all diseases always — stored (DB) ones will be pre-checked
  // Also compute which diseases belong to the currently selected specs/sub-specs
  const filteredDiseases = useMemo(() => allDiseases, [allDiseases]);

  const handleSave = async () => {
    try {
      const result: any = await updateDoctorProfile({
        name: doctor.name,
        gender: doctor.gender,
        registrationNumber: doctor.registrationNumber,
        specialties: doctor.specialties,
        subSpecializations: doctor.subSpecializations || [],
        diseases: doctor.diseases,
        experience: doctor.experience,
        qualification: doctor.qualification,
        registrationYear: doctor.registrationYear,
        faculty: doctor.faculty,
      }).unwrap();

      if (result.success) {
        toast.success(result.message || 'Doctor profile updated successfully');
        dispatch(updateUser({
          name: doctor.name,
          profileImage: doctor.profileImage
        }));
      } else {
        toast.error(result.message || 'Failed to update profile');
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update doctor profile');
    }
  };

  const toggleSpecialty = (specialtyName: string) => {
    const currentSpecs = doctor.specialties || [];
    // Single-select: deselect if clicking the same one, otherwise replace
    const newSpecs = currentSpecs.includes(specialtyName) ? [] : [specialtyName];
    setDoctor({ ...doctor, specialties: newSpecs, subSpecializations: [], diseases: [] });
  };

  const toggleSubSpec = (subSpecName: string) => {
    const currentSubs = doctor.subSpecializations || [];
    const newSubs = currentSubs.includes(subSpecName)
      ? currentSubs.filter((name: string) => name !== subSpecName)
      : [...currentSubs, subSpecName];
    // Do NOT clear diseases when sub-specs change — preserve already-saved diseases
    setDoctor({ ...doctor, subSpecializations: newSubs });
  };

  const toggleDisease = (diseaseName: string) => {
    const currentDiseases = doctor.diseases || [];
    const newDiseases = currentDiseases.includes(diseaseName)
      ? currentDiseases.filter((name: string) => name !== diseaseName)
      : [...currentDiseases, diseaseName];
    setDoctor({ ...doctor, diseases: newDiseases });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Doctor Professional Profile</CardTitle>
        <CardDescription>Update your clinical details and profile information.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        
        {/* Profile Image Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-primary/20 bg-muted">
            {doctor.profileImage ? (
              <img
                src={doctor.profileImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
              </div>
            )}
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleProfileImageUpload}
              />
            </label>
          </div>
          <p className="mt-2 text-[10px] sm:text-xs text-muted-foreground">Click to upload doctor profile image</p>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm sm:text-base">Full Name <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              value={doctor.name || ''}
              onChange={(e) => setDoctor({ ...doctor, name: e.target.value })}
              className="h-10 sm:h-12 rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender" className="text-sm sm:text-base">Gender <span className="text-red-500">*</span></Label>
            <Select
              value={doctor.gender || 'male'}
              onValueChange={(value) => setDoctor({ ...doctor, gender: value })}
            >
              <SelectTrigger id="gender" className="h-10 sm:h-12 rounded-lg">
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
            <Label htmlFor="email" className="text-sm sm:text-base">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={doctor.email || ''}
              disabled
              className="h-10 sm:h-12 rounded-lg bg-muted cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm sm:text-base">Phone Number</Label>
            <Input
              id="phone"
              value={doctor.phone || ''}
              disabled
              className="h-10 sm:h-12 rounded-lg bg-muted cursor-not-allowed"
            />
          </div>
        </div>

        {/* Professional Qualifications */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="qualification" className="text-sm sm:text-base">Qualification</Label>
            <Input
              id="qualification"
              value={doctor.qualification || ''}
              onChange={(e) => setDoctor({ ...doctor, qualification: e.target.value })}
              placeholder="e.g. MBBS, MD"
              className="h-10 sm:h-12 rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="experience" className="text-sm sm:text-base">Experience (Years)</Label>
            <Input
              id="experience"
              type="number"
              value={doctor.experience || ''}
              onChange={(e) => setDoctor({ ...doctor, experience: e.target.value })}
              placeholder="e.g. 5"
              className="h-10 sm:h-12 rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registrationYear" className="text-sm sm:text-base">Registration Year</Label>
            <Input
              id="registrationYear"
              value={doctor.registrationYear || ''}
              onChange={(e) => setDoctor({ ...doctor, registrationYear: e.target.value })}
              placeholder="e.g. 2015"
              className="h-10 sm:h-12 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="faculty" className="text-sm sm:text-base">Faculty / Department</Label>
            <Input
              id="faculty"
              value={doctor.faculty || ''}
              onChange={(e) => setDoctor({ ...doctor, faculty: e.target.value })}
              placeholder="e.g. Cardiology"
              className="h-10 sm:h-12 rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registrationNumber" className="text-sm sm:text-base">Registration Number <span className="text-red-500">*</span></Label>
            <Input
              id="registrationNumber"
              value={doctor.registrationNumber || ''}
              onChange={(e) => setDoctor({ ...doctor, registrationNumber: e.target.value })}
              className="h-10 sm:h-12 rounded-lg"
            />
          </div>
        </div>


        {/* Medical Specialty, Sub-specialization, Diseases Treated */}
        <div className="space-y-4 pt-4 border-t border-border/50">
          <h3 className="font-semibold text-base sm:text-lg">Medical Specialty</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-2 border rounded-lg bg-muted/20">
            {allSpecialties.map((spec: any) => (
              <div key={spec._id} className="flex items-center space-x-2">
                <Checkbox
                  id={`spec-${spec._id}`}
                  checked={doctor.specialties?.includes(spec.name) || false}
                  onCheckedChange={() => toggleSpecialty(spec.name)}
                />
                <Label htmlFor={`spec-${spec._id}`} className="text-xs sm:text-sm cursor-pointer">{spec.name}</Label>
              </div>
            ))}
          </div>
        </div>

        {filteredSubSpecs.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border/50">
            <h3 className="font-semibold text-base sm:text-lg">Sub-specialization:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-2 border rounded-lg bg-muted/20">
              {filteredSubSpecs.map((ss: any) => (
                <div key={ss._id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`sub-${ss._id}`}
                    checked={doctor.subSpecializations?.includes(ss.name) || false}
                    onCheckedChange={() => toggleSubSpec(ss.name)}
                  />
                  <Label htmlFor={`sub-${ss._id}`} className="text-xs sm:text-sm cursor-pointer">{ss.name}</Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredDiseases.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border/50">
            <h3 className="font-semibold text-base sm:text-lg">Diseases Treated</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-2 border rounded-lg bg-muted/20">
              {filteredDiseases.map((disease: any) => (
                <div key={disease._id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`disease-${disease._id}`}
                    checked={doctor.diseases?.includes(disease.name) || false}
                    onCheckedChange={() => toggleDisease(disease.name)}
                  />
                  <Label htmlFor={`disease-${disease._id}`} className="text-xs sm:text-sm cursor-pointer">{disease.name}</Label>
                </div>
              ))}
            </div>
          </div>
        )}

      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} className="h-12 px-6 rounded-lg bg-primary hover:bg-primary/90">
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
};
