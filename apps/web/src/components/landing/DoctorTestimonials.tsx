'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

export function DoctorTestimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const testimonials = [
    {
      author: "Priya Sharma",
      role: "Patient, Mumbai",
      review:
        "Dr. Mehta was incredibly thorough and patient. He explained everything clearly and I finally have a diagnosis after months of uncertainty.",
      rating: 5,
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
      doctorName: "Dr. Mehta",
    },
    {
      author: "Arjun Nair",
      role: "Patient, Bangalore",
      review:
        "The video consultation was seamless. Dr. Priya listened carefully and prescribed the right treatment. Highly recommend GlowVita's doctor services!",
      rating: 5,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
      doctorName: "Dr. Priya",
    },
    {
      author: "Sunita Verma",
      role: "Patient, Delhi",
      review:
        "Exceptional care and professionalism. Dr. Kapoor's expertise in dermatology is unmatched. My skin condition improved significantly within weeks.",
      rating: 5,
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
      doctorName: "Dr. Kapoor",
    },
    {
      author: "Rahul Gupta",
      role: "Patient, Hyderabad",
      review:
        "Quick consultation, accurate diagnosis. The follow-up care was outstanding. I appreciate how Dr. Singh took time to answer all my questions.",
      rating: 4,
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
      doctorName: "Dr. Singh",
    },
    {
      author: "Meera Pillai",
      role: "Patient, Chennai",
      review:
        "I was nervous about an online consultation, but Dr. Rao made me feel at ease instantly. The prescription was sent digitally within minutes!",
      rating: 5,
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
      doctorName: "Dr. Rao",
    },
    {
      author: "Vijay Khanna",
      role: "Patient, Pune",
      review:
        "Absolutely brilliant experience. Booked, consulted, and got my reports reviewed within an hour. GlowVita doctors are a blessing for busy professionals.",
      rating: 5,
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
      doctorName: "Dr. Ananya",
    },
  ];

  const nextTestimonial = () => setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  const prevTestimonial = () => setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const current = testimonials[currentIndex];

  return (
    <section className="pt-5 container mx-auto px-4 sm:px-6 lg:px-8 bg-background pb-[5.5rem]">
      {/* ── Section Header ── */}
      <div className="mb-6">
        <h2
          className="relative inline-block text-2xl md:text-3xl font-serif font-bold pb-3"
          style={{ color: '#252B42' }}
        >
          Words From Our Patients
          <span
            className="absolute left-0 bottom-0 h-[3px] w-full rounded-full"
            style={{ background: 'linear-gradient(to right, #252B42 0%, #252B42 40%, transparent 100%)' }}
          />
        </h2>
      </div>

      <div className="mx-8 md:mx-12">
        <div
          className="relative pt-10 pb-36 text-center shadow-xl overflow-visible"
          style={{ backgroundColor: '#3D2645' }}
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          {/* ── Left Arrow ── */}
          <button
            onClick={() => { prevTestimonial(); setIsAutoPlaying(false); }}
            onMouseLeave={() => setIsAutoPlaying(true)}
            className="absolute -left-12 top-1/2 -translate-y-1/2 z-20
                       flex items-center justify-center w-10 h-10
                       bg-white rounded-full border border-gray-200 shadow-md
                       hover:bg-gray-50 transition-colors"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-5 h-5 text-gray-800" />
          </button>

          {/* ── Right Arrow ── */}
          <button
            onClick={() => { nextTestimonial(); setIsAutoPlaying(false); }}
            onMouseLeave={() => setIsAutoPlaying(true)}
            className="absolute -right-12 top-1/2 -translate-y-1/2 z-20
                       flex items-center justify-center w-10 h-10
                       bg-gray-900 rounded-full shadow-md
                       hover:bg-gray-700 transition-colors"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* Title and Description */}
          <h3 className="text-white text-2xl md:text-3xl font-bold font-serif mb-4 px-8">
            Patient Testimonials
          </h3>
          <p className="text-white/80 text-xs md:text-sm max-w-2xl mx-auto leading-relaxed px-6">
            Hear from our patients about their healthcare experiences and trusted medical care.
          </p>

          {/* White card */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[38%]
                       w-[90%] max-w-2xl
                       bg-white shadow-xl border border-gray-100
                       px-5 md:px-7 pt-9 pb-7 text-left z-10"
          >
            {/* Opening quote */}
            <span
              className="absolute top-3 left-4 text-4xl font-bold leading-none select-none text-gray-900/10"
              style={{ fontFamily: 'Georgia, serif', color: '#1a1a1a' }}
            >
              &#x201C;
            </span>

            {/* Closing quote */}
            <span
              className="absolute bottom-2 right-4 text-4xl font-bold leading-none select-none text-gray-900/10"
              style={{ fontFamily: 'Georgia, serif', color: '#1a1a1a' }}
            >
              &#x201D;
            </span>

            {/* Avatar + connector + text */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
              {/* Circular avatar + connector */}
              <div className="flex items-center flex-shrink-0">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                  <img
                    src={current.image}
                    alt={current.author}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="hidden md:flex items-center ml-2 w-10 flex-shrink-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#C9956C' }} />
                  <div className="flex-1 h-px" style={{ backgroundColor: '#C9956C' }} />
                </div>
              </div>

              {/* Name + review */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <div>
                    <h4 className="text-sm md:text-base font-bold text-gray-900 leading-tight">{current.author}</h4>
                    <p className="text-gray-500 text-xs">{current.role}</p>
                  </div>
                  <div className="flex flex-col items-center sm:items-end gap-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      <span className="w-1 h-1 rounded-full bg-blue-500 inline-block" />
                      Consulted {current.doctorName}
                    </span>
                    <div className="flex gap-0.5 text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < current.rating ? "fill-current text-yellow-400" : "text-gray-200"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 text-xs md:text-sm leading-relaxed">{current.review}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
