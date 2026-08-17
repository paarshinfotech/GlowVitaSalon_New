"use client";

import { cn } from "@repo/ui/cn";
import { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Search,
  Heart,
  Brain,
  Eye,
  Bone,
  Baby,
  Stethoscope,
  Zap,
  Users,
  Activity,
  Scissors,
  Pill,
  Shield,
  HeartHandshake,
  Smile,
  Waves,
  Target,
  FlaskConical,
  Gauge,
  Moon,
  Sparkles,
  Flower2,
  UserCheck,
  Clock,
  Thermometer
} from "lucide-react";
import { useGetPublicDoctorsQuery } from '@repo/store/services/api';
import { useState, useEffect } from 'react';

interface Specialty {
  id: string;
  name: string;
  icon: LucideIcon;
  slug: string;
  category?: "primary" | "specialty" | "diagnostic";
}

interface SpecialitiesProps {
  specialties: Specialty[];
  subSpecialties: any[];
}

function SpecialtyItem({ specialty }: { specialty: Specialty }) {
  const Icon = specialty.icon;
  
  return (
    <Link 
      href={`/doctors/find-doctor?specialty=${encodeURIComponent(specialty.name)}`}
      className="group relative block"
    >
      <div className={cn(
        "flex flex-col items-center text-center p-6 rounded-2xl transition-all duration-300",
        "hover:bg-primary/5 hover:scale-105 cursor-pointer",
        "transform-gpu will-change-transform",
        "border border-transparent hover:border-primary/20"
      )}>
        {/* Icon */}
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-all duration-300",
          "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white group-hover:scale-110"
        )}>
          <Icon className="h-6 w-6" />
        </div>
        
        {/* Specialty Name */}
        <h3 className={cn(
          "font-semibold text-foreground transition-all duration-300",
          "group-hover:text-primary text-sm leading-tight"
        )}>
          {specialty.name}
        </h3>
        
        {/* Subtle underline animation */}
        <div className={cn(
          "h-0.5 w-0 bg-primary mt-2 transition-all duration-300 rounded-full",
          "group-hover:w-8"
        )} />
      </div>
    </Link>
  );
}

// Function to get appropriate icon for subspecialties
const getSubSpecialtyIcon = (name: string): LucideIcon => {
  const n = name.toLowerCase();
  if (n.includes('cosmetology') || n.includes('aesthetic')) return Sparkles;
  if (n.includes('trichology') || n.includes('hair')) return Scissors;
  if (n.includes('dermoscopy')) return Search;
  if (n.includes('laser')) return Zap;
  if (n.includes('pediat')) return Baby;
  if (n.includes('venereology')) return Shield;
  if (n.includes('mycology')) return Bone;
  if (n.includes('allergy') || n.includes('allergology')) return Heart;
  if (n.includes('pigment')) return Target;
  if (n.includes('acne')) return Smile;
  return Stethoscope;
};

export function SpecialitiesSection({ specialties, subSpecialties }: SpecialitiesProps) {
  return (
    <section id="categories" className="pt-5 container mx-auto px-4 sm:px-6 lg:px-8 bg-background pb-[5.5rem]">
        {/* Section Header */}
        <div className="mb-6">
          <h2
            className="relative inline-block text-2xl md:text-3xl font-serif font-bold pb-3"
            style={{ color: '#252B42' }}
          >
            Find Your Perfect Medical Specialist
            <span
              className="absolute left-0 bottom-0 h-[3px] w-full rounded-full"
              style={{ background: 'linear-gradient(to right, #252B42 0%, #252B42 40%, transparent 100%)' }}
            />
          </h2>
          <p className="text-black text-xs md:text-sm mt-3 max-w-2xl leading-relaxed">
            Connect with expert doctors across all medical specialties for comprehensive healthcare
          </p>
        </div>

        {/* Interactive Specialties Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
          {specialties.map((specialty) => (
            <SpecialtyItem
              key={specialty.id}
              specialty={specialty}
            />
          ))}
        </div>

        {/* Dynamic Sub-Specialities Section */}
        {subSpecialties && subSpecialties.length > 0 && (
          <div className="mt-16 pt-10 border-t border-gray-100">
            <h3 className="text-lg md:text-xl font-serif font-bold text-gray-900 mb-8">
              Popular Sub-Specialties
            </h3>
            <div className="flex gap-6 md:gap-8 overflow-x-auto pb-4 pt-2 justify-start items-start scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {subSpecialties.map((sub, i) => {
                const hasImage = sub.image || sub.imageUrl || (sub.icon && typeof sub.icon === 'string' && (sub.icon.startsWith('http') || sub.icon.startsWith('/') || sub.icon.startsWith('data:')));
                return (
                  <Link
                    key={sub._id || i}
                    href={`/doctors/find-doctor?specialty=${encodeURIComponent(sub.name)}`}
                    className="flex flex-col items-center text-center shrink-0 group"
                    style={{ width: '90px' }}
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-gray-300 flex items-center justify-center mb-3 bg-white transition-all duration-300 group-hover:border-primary group-hover:shadow-md group-hover:scale-105 overflow-hidden">
                      {hasImage ? (
                        <img
                          src={sub.image || sub.imageUrl || sub.icon}
                          alt={sub.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Stethoscope className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                      )}
                    </div>
                    <span className="text-[11px] md:text-xs font-medium text-gray-800 group-hover:text-primary transition-colors leading-tight break-words max-w-full">
                      {sub.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

    </section>
  );
}

// Default export with dynamic data from doctors
export default function SpecialitiesSectionWithData() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [subSpecialties, setSubSpecialties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  useEffect(() => {
    fetch('/api/doctor-superdata')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch');
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          // 1. Filter for main specializations
          const mainSpecs = data.filter((item: any) => item.type === 'specialization');
          const specialtyObjects: Specialty[] = mainSpecs.map((item: any) => ({
            id: item._id || `specialty-${item.name}`,
            name: item.name,
            icon: getSpecialtyIcon(item.name),
            slug: item.name.toLowerCase().replace(/\s+/g, '-'),
            category: "specialty"
          }));
          setSpecialties(specialtyObjects);

          // 2. Filter for sub-specializations
          const subs = data.filter((item: any) => item.type === 'subSpecialization');
          setSubSpecialties(subs);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error loading doctor specialties and subspecialties from superdata:", err);
        setIsError(true);
        setIsLoading(false);
      });
  }, []);
  
  // Function to get appropriate icon for specialty
  const getSpecialtyIcon = (specialtyName: string): LucideIcon => {
    const name = specialtyName.toLowerCase();
    
    // Map specialties to appropriate icons
    if (name.includes('cardio')) return Heart;
    if (name.includes('neuro')) return Brain;
    if (name.includes('eye') || name.includes('ophthal')) return Eye;
    if (name.includes('bone') || name.includes('orthoped')) return Bone;
    if (name.includes('baby') || name.includes('pediat')) return Baby;
    if (name.includes('general') || name.includes('family') || name.includes('internal')) return Stethoscope;
    if (name.includes('emergency')) return Zap;
    if (name.includes('surgery')) return Scissors;
    if (name.includes('pharm')) return Pill;
    if (name.includes('prevent')) return Shield;
    if (name.includes('mental') || name.includes('psych')) return HeartHandshake;
    if (name.includes('dental')) return Smile;
    if (name.includes('physical') || name.includes('therapy')) return Waves;
    if (name.includes('radio')) return Target;
    if (name.includes('laborat')) return FlaskConical;
    if (name.includes('anesthes')) return Gauge;
    if (name.includes('sleep')) return Moon;
    if (name.includes('dermat') || name.includes('skin')) return Sparkles;
    if (name.includes('gynae') || name.includes('women')) return Flower2;
    if (name.includes('geriat')) return UserCheck;
    if (name.includes('urgent') || name.includes('care')) return Clock;
    if (name.includes('infect')) return Thermometer;
    
    // Default icon
    return Stethoscope;
  };

  if (isLoading) {
    // Return loading state with skeleton items
    return (
      <section className="pt-5 container mx-auto px-4 sm:px-6 lg:px-8 bg-background pb-[5.5rem]">
          <div className="text-center mb-16">
            <div className="h-12 bg-muted rounded-lg w-1/2 mx-auto mb-4"></div>
            <div className="h-6 bg-muted rounded-lg w-1/3 mx-auto"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="flex flex-col items-center p-6 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-muted mb-4"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            ))}
          </div>
      </section>
    );
  }

  if (isError) {
    // Return error state
    return (
      <section className="pt-5 container mx-auto px-4 sm:px-6 lg:px-8 bg-background pb-[5.5rem]">
          <div className="text-center">
            <div className="text-red-500 mb-4">Error loading specialties</div>
          </div>
      </section>
    );
  }

  return <SpecialitiesSection specialties={specialties} subSpecialties={subSpecialties} />;
}