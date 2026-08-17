"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, ChevronDown } from "lucide-react";
import { useGetPublicDoctorsQuery } from "@repo/store/services/api";
import { useRouter } from "next/navigation";

const SPECIALTIES = [
  "Dermatologist",
  "Cosmetologist",
  "Trichologist",
  "Gynecologist",
  "Surgeon",
  "Dietitian",
  "Cardiologist",
  "Pediatrician",
  "Orthopedist",
  "Neurologist",
];

export function HeroSection() {
  const router = useRouter();
  const { data: doctorsData, isLoading } = useGetPublicDoctorsQuery(undefined);

  const [category, setCategory] = useState("All");
  const [subcategory, setSubcategory] = useState("All");
  const [location, setLocation] = useState("");
  const [dynamicSpecialties, setDynamicSpecialties] = useState<string[]>([]);

  useEffect(() => {
    if (doctorsData && doctorsData.length > 0) {
      const set = new Set<string>();
      doctorsData.forEach((d: any) => {
        if (d.doctorType?.trim()) set.add(d.doctorType.trim());
        d.specialties?.forEach((s: string) => {
          if (s?.trim()) set.add(s.trim());
        });
      });
      setDynamicSpecialties(Array.from(set));
    }
  }, [doctorsData]);

  const displaySpecialties =
    dynamicSpecialties.length > 0 ? dynamicSpecialties : SPECIALTIES;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category !== "All") params.set("category", category);
    if (subcategory !== "All") params.set("subcategory", subcategory);
    if (location.trim()) params.set("location", location.trim());
    router.push(`/doctors/find-doctor?${params.toString()}`);
  };

  const handleSpecialtyClick = (specialty: string) => {
    router.push(
      `/doctors/find-doctor?search=${encodeURIComponent(specialty)}`
    );
  };

  return (
    <section
      className="relative w-full min-h-[420px] sm:min-h-[500px] lg:h-[650px] pt-8 sm:pt-10 md:pt-16 lg:pt-20 pb-16 flex items-start overflow-hidden"
    >
      {/* Full-width image background */}
      <div className="absolute inset-0">
        <img
          src="/images/Doctor_Bg.png"
          alt="Doctor Background"
          className="h-full w-full pointer-events-none select-none object-cover object-center md:object-[85%_center] lg:object-center"
        />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 w-full max-w-7xl">
        <div className="flex flex-col gap-4 md:gap-5 max-w-[800px]">
          {/* Logo/Brand Name */}
          <div>
            <h3 className="text-amber-100 text-xs sm:text-sm font-light tracking-[0.2em] sm:tracking-[0.3em] uppercase">
              GLOWVITA
            </h3>
          </div>

          {/* Main Heading */}
          <h1
            className="text-amber-50"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: "clamp(42px, 6vw, 70px)",
              lineHeight: "115%",
              letterSpacing: "-0.01em",
              color: "#F7E5C1",
            }}
          >
            Choose the Best
            <br />
            Doctor for You
          </h1>

          {/* Description */}
          <p className="text-gray-200 text-sm sm:text-base md:text-lg lg:text-xl max-w-xl leading-relaxed">
            Choose from top-rated doctors where experienced specialists, modern
            treatments, and exceptional care come together to transform your health.
          </p>

          {/* ── Search Bar ── */}
          <form onSubmit={handleSearch} className="w-full mt-1">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-white rounded-full shadow-lg overflow-hidden">
              {/* Category */}
              <div className="flex flex-col px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-gray-200 min-w-[130px]">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                  Category
                </label>
                <div className="relative flex items-center">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="appearance-none bg-transparent text-sm text-gray-700 font-medium pr-5 focus:outline-none cursor-pointer w-full"
                  >
                    <option value="All">All</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Cosmetology">Cosmetology</option>
                    <option value="General">General</option>
                  </select>
                  <ChevronDown className="absolute right-0 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Subcategory */}
              <div className="flex flex-col px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-gray-200 min-w-[130px]">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                  Subcategory
                </label>
                <div className="relative flex items-center">
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="appearance-none bg-transparent text-sm text-gray-700 font-medium pr-5 focus:outline-none cursor-pointer w-full"
                  >
                    <option value="All">All</option>
                    <option value="Skin">Skin</option>
                    <option value="Hair">Hair</option>
                    <option value="Nails">Nails</option>
                  </select>
                  <ChevronDown className="absolute right-0 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Location */}
              <div className="flex flex-col flex-1 px-4 py-2 sm:py-3 border-b sm:border-b-0 border-gray-200">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                  Location
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Where"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                  />
                  <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                </div>
              </div>

              {/* Search Button */}
              <div className="px-2 py-2 flex items-center">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#C06080" }}
                >
                  Search
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>

          {/* ── Specialty Pills ── */}
          <div className="flex flex-wrap gap-2 mt-1">
            {displaySpecialties.slice(0, 6).map((specialty) => (
              <button
                key={specialty}
                onClick={() => handleSpecialtyClick(specialty)}
                className="px-4 py-1.5 rounded-full border border-white/30 text-white/90 text-xs font-medium hover:bg-white/10 transition-colors duration-200"
              >
                {specialty}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}