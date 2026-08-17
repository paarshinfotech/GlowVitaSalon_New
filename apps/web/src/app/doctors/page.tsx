"use client";

import { useState, useEffect } from 'react';
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { Footer } from "../../../../../packages/ui/src/footer";
import {
  Video,
  Clock,
  Shield,
  Users,
  Award,
  Heart,
  ArrowRight,
  Activity,
  MapPin,
  Calendar,
  Stethoscope,
  Star,
  Building,
  User,
  Search,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@repo/ui/cn";
import { FeatureCard } from "../../components/landing/FeatureCard";
import SpecialitiesSectionWithData from "../../components/landing/SpecialitiesSection";
import { HeroSection } from "../../components/doctors/HeroSection";
import { ServicesSection } from "../../components/doctors/ServicesSection";
import { DoctorTestimonials } from "../../components/landing/DoctorTestimonials";
import { useGetPublicDoctorsQuery, useCheckDoctorWishlistStatusQuery, useAddDoctorToWishlistMutation, useRemoveDoctorFromWishlistMutation } from '@repo/store/services/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Doctor {
  _id: string;
  id?: string;
  name: string;
  phone: string;
  email: string,
  specialty?: string;
  specialties?: string[];
  subSpecializations?: string[];
  doctorType?: string;
  experience?: string | number;
  rating?: number;
  totalReviews?: number;
  patientSatisfaction?: number;
  consultationFee?: number;
  location?: {
    clinic: string;
    address: string;
    distance: string;
  };
  clinicName?: string;
  clinicAddress?: string;
  city?: string;
  state?: string;
  education?: string[];
  qualification?: string;
  languages?: string[];
  availableToday?: boolean;
  nextAvailable?: string;
  image?: string;
  profileImage?: string;
  isVerified?: boolean;
  hasVideoConsult?: boolean;
  videoConsultation?: boolean;
  hasHomeVisit?: boolean;
  status?: string;
  registrationNumber?: string;
}

// Transform API doctor data to component format
const transformDoctor = (apiDoctor: any): Doctor => {
  // Calculate patient satisfaction percentage based on rating if not provided
  const calculateSatisfaction = (rating: number, totalReviews: number): number => {
    if (totalReviews === 0) return 0;
    // Convert rating (out of 5) to percentage
    // Assuming 4+ rating is considered positive feedback
    return Math.round((rating / 5) * 100);
  };

  const doctorRating = apiDoctor.rating || 4.2;
  const doctorReviews = apiDoctor.totalReviews || 0;

  return {
    _id: apiDoctor._id,
    id: apiDoctor.id || apiDoctor._id,
    name: apiDoctor.name || 'Unknown Doctor',
    phone: apiDoctor.phone,
    email: apiDoctor.email,
    specialty: apiDoctor.doctorType || (apiDoctor.specialties && apiDoctor.specialties[0]) || 'General Medicine',
    specialties: apiDoctor.specialties || [],
    subSpecializations: apiDoctor.subSpecializations || [],
    doctorType: apiDoctor.doctorType,
    experience: typeof apiDoctor.experience === 'string' ? parseInt(apiDoctor.experience) || 0 : apiDoctor.experience || 0,
    rating: doctorRating,
    totalReviews: doctorReviews,
    patientSatisfaction: apiDoctor.patientSatisfaction || calculateSatisfaction(doctorRating, doctorReviews),
    consultationFee: apiDoctor.consultationFee || 100,
    location: {
      clinic: apiDoctor.clinicName || 'Clinic',
      address: apiDoctor.clinicAddress || `${apiDoctor.city || ''}, ${apiDoctor.state || ''}`.trim() || 'Address not available',
      distance: '0 km'
    },
    clinicName: apiDoctor.clinicName,
    clinicAddress: apiDoctor.clinicAddress,
    city: apiDoctor.city,
    state: apiDoctor.state,
    education: apiDoctor.qualification ? [apiDoctor.qualification] : [],
    qualification: apiDoctor.qualification,
    languages: ['English'], // Default language
    availableToday: apiDoctor.status === 'Approved',
    nextAvailable: apiDoctor.status === 'Approved' ? 'Available' : 'Not Available',
    image: apiDoctor.profileImage,
    profileImage: apiDoctor.profileImage,
    isVerified: apiDoctor.status === 'Approved',
    hasVideoConsult: apiDoctor.videoConsultation || false,
    videoConsultation: apiDoctor.videoConsultation,
    hasHomeVisit: false,
    status: apiDoctor.status,
    registrationNumber: apiDoctor.registrationNumber
  };
};

// Doctor Card Component matching the requested horizontal design
function DoctorCard({ doctor }: { doctor: Doctor }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Check if doctor is in wishlist
  const { data: wishlistStatusData } = useCheckDoctorWishlistStatusQuery(doctor.id, {
    skip: !isAuthenticated,
  });

  // Wishlist mutations
  const [addDoctorToWishlist] = useAddDoctorToWishlistMutation();
  const [removeDoctorFromWishlist] = useRemoveDoctorFromWishlistMutation();

  const isFavorite = wishlistStatusData?.isInWishlist || false;

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Please login to add doctors to your wishlist");
      router.push("/client-login");
      return;
    }

    try {
      if (isFavorite) {
        // Remove from wishlist
        await removeDoctorFromWishlist(doctor.id).unwrap();
        toast.success("Removed from Wishlist", {
          description: "Doctor removed from your wishlist"
        });
      } else {
        // Add to wishlist
        await addDoctorToWishlist(doctor.id).unwrap();
        toast.success("Added to Wishlist", {
          description: "Doctor added to your wishlist"
        });
      }
    } catch (error: any) {
      console.error("Failed to update wishlist:", error);
      toast.error("Wishlist Update Failed", {
        description: error?.data?.message || "Failed to update wishlist. Please try again."
      });
    }
  };

  return (
    <div className="group bg-white border border-gray-200 rounded-tr-[12px] rounded-bl-[12px] rounded-tl-none rounded-br-none overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-row w-full h-[180px]">

      {/* LEFT: Image Container */}
      <div className="relative w-[100px] sm:w-[125px] h-full flex-shrink-0 bg-gray-50 overflow-hidden rounded-tr-[12px]">
        {doctor.image || doctor.profileImage ? (
          <img
            src={doctor.image || doctor.profileImage || ''}
            alt={doctor.name}
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-102 rounded-tr-[12px]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-tr-[12px]">
            <User className="h-10 w-10 text-gray-300" />
          </div>
        )}
      </div>

      {/* RIGHT: Content */}
      <div className="p-2 flex flex-col justify-between flex-1 min-w-0">
        <div>
          {/* Name and Rating/Wishlist row */}
          <div className="flex justify-between items-center gap-4 mb-1 mt-1">
            <h3 className="text-base font-bold text-black leading-tight line-clamp-1 flex-1">
              {doctor.name.startsWith('Dr.') ? doctor.name : `Dr. ${doctor.name}`}
            </h3>

            <div className="flex items-center gap-1 shrink-0">
              {/* Wishlist Heart */}
              <button
                onClick={handleWishlistToggle}
                className="h-5 w-5 rounded-full flex items-center justify-center transition-all hover:bg-gray-50"
                aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={cn("h-4 w-4 stroke-[1.5]", isFavorite ? "fill-[#834D7D] text-[#834D7D]" : "text-gray-400")} />
              </button>

              {/* Rating */}
              <div className="flex items-center gap-0.5 text-[#b37d97]">
                <Star className="h-4 w-4 stroke-[1.5]" />
                <span className="text-xs font-semibold text-[#b37d97]">{doctor.rating ? doctor.rating.toFixed(1) : '4.2'}</span>
              </div>
            </div>
          </div>

          {/* Qualification Badge */}
          <div className="mb-2">
            <span className="inline-block border border-[#834D7D]/30 text-[#834D7D] rounded-full px-3 py-0.5 text-xs italic font-medium bg-transparent">
              {doctor.qualification || 'MBBS'} ({doctor.specialty})
            </span>
          </div>

          {/* Experience & SubSpecialty */}
          <div className="flex items-center gap-1 text-black text-xs font-medium mb-2">
            <img src="/images/suitcase.png" className="w-3.5 h-3.5 object-contain shrink-0" alt="Experience" />
            <span>{doctor.experience} Years Experience</span>
            {((doctor.subSpecializations && doctor.subSpecializations.length > 0) || doctor.specialty) && (
              <>
                <span className="text-gray-400 mx-1">•</span>
                <span className="text-[#834D7D] truncate">
                  {(doctor.subSpecializations && doctor.subSpecializations.length > 0) 
                    ? doctor.subSpecializations.join(', ') 
                    : doctor.specialty}
                </span>
              </>
            )}
          </div>

          {/* Address */}
          <div className="flex items-start gap-1 text-black text-xs leading-tight line-clamp-2">
            <img src="/images/Location (3).png" className="w-3.5 h-3.5 object-contain shrink-0 mt-0.5" alt="Location" />
            <span>{doctor.clinicAddress || doctor.location?.address || 'Address not available'}</span>
          </div>
        </div>

        {/* Book Button */}
        <div className="flex justify-center mt-1">
          <Button
            asChild
            className="px-5 py-1 bg-gradient-to-r from-[#834D7D] to-[#5E3B5E] hover:from-[#733F6D] hover:to-[#4E2E4E] text-white rounded-full text-xs font-semibold h-8 border-0 shadow-sm transition-all"
          >
            <Link href={`/doctors/${doctor.id}`}>
              Book Appointment
            </Link>
          </Button>
        </div>

      </div>
    </div>
  );
}

export default function DoctorsPage() {
  const { data: doctorsData, isLoading, isError } = useGetPublicDoctorsQuery(undefined);
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [limit, setLimit] = useState(9);
  console.log("Doctors data on doctors page : ", doctorsData)

  const doctors: Doctor[] = doctorsData ? doctorsData.map(transformDoctor) : [];

  const handleMyAppointmentsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Please login to view your appointments");
      router.push("/client-login");
    } else {
      router.push("/profile/appointments");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HeroSection />

      {/* Doctors Section */}
      <section className="pt-5 container mx-auto px-4 sm:px-6 lg:px-8 bg-background pb-[5.5rem]">
        <div className="mb-6">
          <h2
            className="relative inline-block text-2xl md:text-3xl font-serif font-bold pb-3"
            style={{ color: '#252B42' }}
          >
            Expert Doctors & Specialists
            <span
              className="absolute left-0 bottom-0 h-[3px] w-full rounded-full"
              style={{ background: 'linear-gradient(to right, #252B42 0%, #252B42 40%, transparent 100%)' }}
            />
          </h2>
          <p className="text-black text-xs md:text-sm mt-3 max-w-none leading-relaxed md:whitespace-nowrap overflow-x-auto scrollbar-none">
            Connect with experienced doctors and specialists dedicated to providing quality healthcare and personalized treatment.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading doctors...</p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="text-center py-10">
            <div className="bg-red-100 text-red-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold">!</span>
            </div>
            <p className="mt-4 text-muted-foreground">Error loading doctors. Please try again later.</p>
          </div>
        )}

        {/* Doctors Grid */}
        {!isLoading && !isError && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.slice(0, limit).map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
            </div>

            {doctors.length > limit && (
              <div className="flex justify-end mt-8">
                <button
                  onClick={() => setLimit(prev => prev + 9)}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-[#5E3B5E] text-white rounded-full font-semibold transition-all duration-300 hover:bg-[#4E2E4E] hover:shadow-md text-xs md:text-sm"
                >
                  <span>View More</span>
                  <span className="flex items-center justify-center w-5 h-5 bg-white/20 rounded-full">
                    <ArrowRight className="h-3.5 w-3.5 text-white" />
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Specialities Section */}
      <div id="categories">
        <SpecialitiesSectionWithData />
      </div>

      {/* Doctor Testimonials (Words From Our Patients) */}
      <DoctorTestimonials />
    </div>
  );
}