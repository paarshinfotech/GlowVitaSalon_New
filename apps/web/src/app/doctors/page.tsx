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
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@repo/ui/cn";
import { FeatureCard } from "../../components/landing/FeatureCard";
import BlogSectionWithData from "../../components/landing/BlogSection";
import TestimonialsSectionWithData from "../../components/landing/TestimonialsSection";
import SpecialitiesSectionWithData from "../../components/landing/SpecialitiesSection";
import { HeroSection } from "../../components/doctors/HeroSection";
import { ServicesSection } from "../../components/doctors/ServicesSection";
import { CtaSection } from "../../components/CtaSection";
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

  const doctorRating = apiDoctor.rating || 4.5;
  const doctorReviews = apiDoctor.totalReviews || 0;

  return {
    _id: apiDoctor._id,
    id: apiDoctor.id || apiDoctor._id,
    name: apiDoctor.name || 'Unknown Doctor',
    phone: apiDoctor.phone,
    email: apiDoctor.email,
    specialty: apiDoctor.doctorType || (apiDoctor.specialties && apiDoctor.specialties[0]) || 'General Medicine',
    specialties: apiDoctor.specialties || [],
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

// Doctor Card Component matching the FeatureCard design
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
    <div
      className="group relative overflow-hidden rounded-md hover:shadow-lg border bg-card transition-all duration-300 hover:-translate-y-1"
    >
      {/* Upper Half: Doctor Image */}
      <div className="aspect-[3/2] relative w-full overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10">
        {doctor.image || doctor.profileImage ? (
          <Image
            src={doctor.image || doctor.profileImage || ''}
            alt={doctor.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="h-20 w-20 text-primary/40" />
          </div>
        )}


        {/* Wishlist Button */}
        <button
          onClick={handleWishlistToggle}
          className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full p-1.5 shadow-md hover:bg-white transition-colors"
          aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className={cn(
              "h-4 w-4",
              isFavorite ? "fill-red-500 text-red-500" : "text-gray-600"
            )}
          />
        </button>

        {/* Rating Badge */}
        <Badge
          variant="default"
          className="absolute top-2 left-2 bg-yellow-400 text-foreground border-0 text-xs px-2 py-0.5 rounded-full font-medium"
        >
          <Star className="h-3 w-3 mr-1 fill-current" />
          {doctor.rating?.toFixed(1)}
        </Badge>


      </div>

      {/* Lower Half: Details */}
      <div className="p-4 flex flex-col justify-between h-fit bg-card">
        <div>
          {/* Doctor Header */}
          <div className="mb-3">
            <h3 className="text-base font-bold text-foreground mb-0.5 group-hover:text-primary transition-colors line-clamp-1">
              {doctor.name}
            </h3>
            <p className="text-xs text-primary font-semibold line-clamp-1 mb-1">
              {doctor.experience} years experience
            </p>
            {/* Patient Satisfaction */}
            {doctor.patientSatisfaction !== undefined && doctor.patientSatisfaction > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-300"
                    style={{ width: `${doctor.patientSatisfaction}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-yellow-600">
                  {doctor.patientSatisfaction}%
                </span>
              </div>
            )}
            {(doctor.totalReviews || 0) > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Patient satisfaction based on {doctor.totalReviews} review{doctor.totalReviews !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Features List */}
          <div className="space-y-1 mb-3">
            {doctor.location?.clinic && (
              <p className="text-xs text-foreground flex items-start">
                <Building className="h-3 w-3 text-primary mr-1.5 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{doctor.location.clinic}</span>
              </p>
            )}
            <p className="text-xs text-foreground flex items-start">
              <MapPin className="h-3 w-3 text-primary mr-1.5 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{doctor.location?.address || 'Address not available'}</span>
            </p>
          </div>

          {/* Specialties Badges */}
          {doctor.specialties && doctor.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {doctor.specialties.slice(0, 3).map((specialty, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary hover:bg-primary/15 border-0"
                >
                  {specialty}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-2">
          <Button
            asChild
            size="sm"
            className="transition-all duration-200 text-xs"
            variant="outline"
          >
            <Link href={`/doctors/${doctor.id}`} className="flex items-center justify-center gap-1">
              Book Appointment
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
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
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight font-headline bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent pb-3 mb-4">
              Top-Rated Medical Doctors
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Discover the best medical doctors in your area with verified
              credentials and excellent patient care
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {doctors.slice(0, 8).map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Specialities Section */}
      <div id="categories">
        <SpecialitiesSectionWithData />
      </div>

      {/* Blog Section */}
      <BlogSectionWithData />

      {/* Testimonials Section */}
      <TestimonialsSectionWithData />

      {/* Quick Actions Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight font-headline bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent pb-3 mb-4">
              Get Started Today
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              Everything you need for your healthcare journey in one place
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Browse Specialties */}
            <Link href="#categories" className="group block">
              <div className="relative p-6 rounded-md transition-all duration-300 hover:bg-primary/5 hover:-translate-y-1 bg-gradient-to-br from-primary/5 to-primary/2">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-primary/15 rounded-md flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:scale-110">
                    <Stethoscope className="h-6 w-6 text-primary group-hover:text-white" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    Browse Specialties
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Find doctors by medical expertise
                  </p>

                  {/* Subtle underline animation */}
                  <div className="h-0.5 w-0 bg-primary mt-3 transition-all duration-300 rounded-full group-hover:w-8" />
                </div>
              </div>
            </Link>

            {/* Featured Doctors */}
            <Link href="/doctors/featured" className="group block">
              <div className="relative p-6 rounded-md transition-all duration-300 hover:bg-blue-500/5 hover:-translate-y-1 bg-gradient-to-br from-blue-500/5 to-blue-500/2">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-500/15 rounded-md flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-blue-500 group-hover:text-white group-hover:scale-110">
                    <Award className="h-6 w-6 text-blue-500 group-hover:text-white" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-blue-600 transition-colors">
                    Featured Doctors
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Top-rated medical professionals
                  </p>

                  {/* Subtle underline animation */}
                  <div className="h-0.5 w-0 bg-blue-500 mt-3 transition-all duration-300 rounded-full group-hover:w-8" />
                </div>
              </div>
            </Link>

            {/* Find Doctor */}
            <Link href="/doctors/find-doctor" className="group block">
              <div className="relative p-6 rounded-md transition-all duration-300 hover:bg-blue-500/5 hover:-translate-y-1 bg-gradient-to-br from-blue-500/5 to-blue-500/2">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-500/15 rounded-md flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-blue-500 group-hover:text-white group-hover:scale-110">
                    <Search className="h-6 w-6 text-blue-500 group-hover:text-white" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-blue-600 transition-colors">
                    Find Doctor
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Search by symptoms or conditions
                  </p>

                  {/* Subtle underline animation */}
                  <div className="h-0.5 w-0 bg-blue-500o mt-3 transition-all duration-300 rounded-full group-hover:w-8" />
                </div>
              </div>
            </Link>

            {/* My Appointments */}
            <button onClick={handleMyAppointmentsClick} className="group block w-full text-left">
              <div className="relative p-6 rounded-md transition-all duration-300 hover:bg-blue-500/5 hover:-translate-y-1 bg-gradient-to-br from-blue-500/5 to-blue-500/2">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-500/15 rounded-md flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-blue-500 group-hover:text-white group-hover:scale-110">
                    <Calendar className="h-6 w-6 text-blue-500 group-hover:text-white" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-blue-600 transition-colors">
                    My Appointments
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    View your upcoming appointments
                  </p>

                  {/* Subtle underline animation */}
                  <div className="h-0.5 w-0 bg-blue-500 mt-3 transition-all duration-300 rounded-full group-hover:w-8" />
                </div>
              </div>
            </button>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CtaSection />

      {/* Why Choose GlowVita Doctors Section */}
      <section className="pt-5 pb-10 container mx-auto px-4 sm:px-6 lg:px-8 bg-background">
        {/* Header – exact same style as WhyChooseUs landing component */}
        <div className="flex items-center gap-3 mb-8">
          <img
            src="/images/9088d72b-b28a-4c94-989b-1d59377b45f5 1.png"
            alt="Question bubbles"
            className="w-12 h-12 flex-shrink-0 object-contain"
          />
          <h2
            className="relative inline-block text-2xl md:text-3xl font-serif font-bold pb-3"
            style={{ color: "#252B42" }}
          >
            Why Customers Choose GlowVita Doctors ?
            <span
              className="absolute left-0 bottom-0 h-[3px] w-full rounded-full"
              style={{
                background:
                  "linear-gradient(to right, #252B42 0%, #252B42 40%, transparent 100%)",
              }}
            />
          </h2>
        </div>

        {/* Row 1 – #FEF0ED stripe */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          {/* Card 1 – Verified Dermatologists */}
          <div
            className="relative flex items-start gap-4 bg-white border border-gray-200 rounded-2xl p-5 overflow-hidden"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-9 rounded-l-2xl" style={{ backgroundColor: "#FEF0ED" }} />
            <img src="/images/stethoscope.png" alt="Verified Dermatologists" className="relative w-8 h-8 flex-shrink-0 mt-0.5" />
            <div className="relative">
              <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">Verified Dermatologists</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Every specialist is carefully verified to ensure trusted and quality care.</p>
            </div>
          </div>

          {/* Card 2 – Easy Appointment Booking */}
          <div
            className="relative flex items-start gap-4 bg-white border border-gray-200 rounded-2xl p-5 overflow-hidden"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-9 rounded-l-2xl" style={{ backgroundColor: "#FEF0ED" }} />
            <img src="/images/calendar (6) 1.png" alt="Easy Appointment Booking" className="relative w-8 h-8 flex-shrink-0 mt-0.5" />
            <div className="relative">
              <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">Easy Appointment Booking</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Book appointments online in just a few clicks at your preferred time.</p>
            </div>
          </div>

          {/* Card 3 – Verified Patient Reviews */}
          <div
            className="relative flex items-start gap-4 bg-white border border-gray-200 rounded-2xl p-5 overflow-hidden"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-9 rounded-l-2xl" style={{ backgroundColor: "#FEF0ED" }} />
            <img src="/images/speech-bubble 1.png" alt="Verified Patient Reviews" className="relative w-8 h-8 flex-shrink-0 mt-0.5" />
            <div className="relative">
              <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">Verified Patient Reviews</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Read authentic feedback from patients before choosing a doctor.</p>
            </div>
          </div>
        </div>

        {/* Row 2 – #EBF3FD stripe */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 4 – Experienced Professionals */}
          <div
            className="relative flex items-start gap-4 bg-white border border-gray-200 rounded-2xl p-5 overflow-hidden"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-9 rounded-l-2xl" style={{ backgroundColor: "#EBF3FD" }} />
            <img src="/images/speech-bubble 1.png" alt="Experienced Professionals" className="relative w-8 h-8 flex-shrink-0 mt-0.5" />
            <div className="relative">
              <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">Experienced Professionals</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Find doctors with years of expertise in treating various skin conditions.</p>
            </div>
          </div>

          {/* Card 5 – Secure Online Payments */}
          <div
            className="relative flex items-start gap-4 bg-white border border-gray-200 rounded-2xl p-5 overflow-hidden"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-9 rounded-l-2xl" style={{ backgroundColor: "#EBF3FD" }} />
            <img src="/images/mortarboard.png" alt="Secure Online Payments" className="relative w-8 h-8 flex-shrink-0 mt-0.5" />
            <div className="relative">
              <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">Secure Online Payments</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Pay safely using trusted payment methods with instant confirmation.</p>
            </div>
          </div>

          {/* Card 6 – Instant Appointment Confirmation */}
          <div
            className="relative flex items-start gap-4 bg-white border border-gray-200 rounded-2xl p-5 overflow-hidden"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-9 rounded-l-2xl" style={{ backgroundColor: "#EBF3FD" }} />
            <img src="/images/check.png" alt="Instant Appointment Confirmation" className="relative w-8 h-8 flex-shrink-0 mt-0.5" />
            <div className="relative">
              <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">Instant Appointment Confirmation</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Receive booking confirmation and reminders instantly.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}