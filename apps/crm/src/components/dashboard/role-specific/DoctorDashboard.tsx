'use client';
import { useState, useEffect } from 'react';
import {
  StatCard,
  SalesChart,
  UpcomingAppointments,
  ClientFeedback,
  TopServicesChart,
  TopSellingProductsChart,
  DynamicDateFilter
} from '../index';

import {
  FaUserMd,
  FaStethoscope,
  FaHeartbeat,
  FaCalendarCheck,
  FaUserInjured,
  FaNotesMedical,
  FaPrescription,
  FaHospitalUser,
  FaUserNurse,
  FaDna,
  FaVial,
  FaSyncAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaRupeeSign,
  FaChartLine,
  FaClock,
  FaBriefcase,
  FaHospital,
  FaVideo,
  FaWallet,
  FaArrowUp,
  FaArrowDown
} from "react-icons/fa";

interface DoctorDashboardMetrics {
  totalPatients: number;
  totalAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  cancelledAppointments: number;
  totalRevenue: number;
  todayRevenue: number;
  averageConsultationTime: number;
  patientSatisfaction: number;
  topServices: Array<{
    serviceName: string;
    count: number;
    totalRevenue: number;
  }>;
  recentAppointments: Array<{
    id: string;
    patient: string;
    service: string;
    date: string;
    time: string;
    status: string;
  }>;
  totalClinicVisit: number;
  totalVideoCallConsultation: number;
  bookingHours: number;
  totalExpenses: number;
  totalBusiness: number;
  profit: number;
  loss: number;
}

interface DoctorDashboardProps {
  metrics: DoctorDashboardMetrics | null;
  loading: boolean;
  error: string | null;
  filterType: 'preset' | 'custom';
  presetPeriod: 'day' | 'month' | 'year' | 'all';
  startDate: string;
  endDate: string;
  onFilterChange: (
    newFilterType: 'preset' | 'custom',
    newPresetPeriod?: 'day' | 'month' | 'year' | 'all',
    newStartDate?: string,
    newEndDate?: string
  ) => void;
}

export default function DoctorDashboard({
  metrics,
  loading,
  error,
  filterType,
  presetPeriod,
  startDate,
  endDate,
  onFilterChange
}: DoctorDashboardProps) {

  // Format currency for Indian Rupees
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format numbers with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-IN');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
              <div>
                <div className="h-8 w-64 bg-muted rounded" />
                <div className="h-4 w-80 bg-muted rounded mt-2" />
              </div>
              <div className="w-full md:w-auto">
                <div className="h-12 w-64 bg-muted rounded" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mb-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-80 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mb-6">
            <div className="h-96 bg-muted rounded-lg animate-pulse"></div>
            <div className="h-96 bg-muted rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:justify-between gap-6 mb-6">
              <div>
                <h1 className="text-3xl font-bold font-headline mb-1 bg-gradient-to-r from-foreground via-primary to-primary/80 bg-clip-text text-transparent">
                  Doctor Dashboard
                </h1>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
                  Overview of your patient appointments and medical practice metrics.
                </p>
              </div>
              <div className="w-full md:w-auto">
                <div className="h-12 w-64 bg-muted rounded" />
              </div>
            </div>
          </div>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
            <p className="text-destructive font-medium">Error loading dashboard data</p>
            <p className="text-muted-foreground mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if we have metrics but all values are zero
  const hasNoData = metrics &&
    metrics.totalPatients === 0 &&
    metrics.totalAppointments === 0 &&
    metrics.completedAppointments === 0 &&
    metrics.pendingAppointments === 0 &&
    metrics.totalBusiness === 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold font-headline mb-1 bg-gradient-to-r from-foreground via-primary to-primary/80 bg-clip-text text-transparent">
                Doctor Dashboard
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
                Overview of your patient appointments and medical practice metrics.
              </p>
            </div>
            <div className="w-full md:w-auto space-y-4">
              {/* Dynamic Date Filter Component */}
              <DynamicDateFilter
                filterType={filterType}
                presetPeriod={presetPeriod}
                startDate={startDate}
                endDate={endDate}
                onFilterChange={onFilterChange}
              />

            </div>
          </div>
        </div>

        {/* Stats Cards - Arranged in sequence per Doctor Dashboard Metric Definition Standard */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard
            title="Total Business"
            value={metrics ? formatCurrency(metrics.totalBusiness) : '₹0'}
            subtitle={hasNoData ? "No data" : "Overall business"}
            change={hasNoData ? "No data" : "+11.4%"}
            icon={FaBriefcase}
            iconColor="text-primary"
          />
          <StatCard
            title="Total Revenue"
            value={metrics ? formatCurrency(metrics.totalRevenue) : '₹0'}
            subtitle={hasNoData ? "No data" : "Net earnings"}
            change={hasNoData ? "No data" : "+10.7%"}
            icon={FaRupeeSign}
            iconColor="text-primary"
          />
          <StatCard
            title="Total Patients"
            value={metrics ? formatNumber(metrics.totalPatients) : '0'}
            subtitle={hasNoData ? "No data" : "Patient count"}
            change={hasNoData ? "No data" : "+12.5%"}
            icon={FaUserMd}
            iconColor="text-primary"
          />
          <StatCard
            title="Total Appointments"
            value={metrics ? formatNumber(metrics.totalAppointments) : '0'}
            subtitle={hasNoData ? "No data" : "Appointment count"}
            change={hasNoData ? "No data" : "+15.2%"}
            icon={FaCalendarCheck}
            iconColor="text-primary"
          />

          <StatCard
            title="Total Clinic Visits"
            value={metrics ? formatNumber(metrics.totalClinicVisit) : '0'}
            subtitle={hasNoData ? "No data" : "In-clinic visits"}
            change={hasNoData ? "No data" : "+9.2%"}
            icon={FaHospital}
            iconColor="text-primary"
          />
          <StatCard
            title="Total Video Consultations"
            value={metrics ? formatNumber(metrics.totalVideoCallConsultation) : '0'}
            subtitle={hasNoData ? "No data" : "Video consultations"}
            change={hasNoData ? "No data" : "+14.1%"}
            icon={FaVideo}
            iconColor="text-primary"
          />

          <StatCard
            title="Completed"
            value={metrics ? formatNumber(metrics.completedAppointments) : '0'}
            subtitle={hasNoData ? "No data" : "Completed appointments"}
            change={hasNoData ? "No data" : "+8.3%"}
            icon={FaCheckCircle}
            iconColor="text-primary"
          />
          <StatCard
            title="Pending"
            value={metrics ? formatNumber(metrics.pendingAppointments) : '0'}
            subtitle={hasNoData ? "No data" : "Pending appointments"}
            change={hasNoData ? "No data" : "+5.7%"}
            icon={FaClock}
            iconColor="text-primary"
          />
          <StatCard
            title="Cancelled"
            value={metrics ? formatNumber(metrics.cancelledAppointments) : '0'}
            subtitle={hasNoData ? "No data" : "Cancelled appointments"}
            change={hasNoData ? "No data" : "-3.7%"}
            icon={FaTimesCircle}
            iconColor="text-primary"
          />

          <StatCard
            title="Profit"
            value={metrics ? formatCurrency(metrics.profit) : '₹0'}
            subtitle={hasNoData ? "No data" : "Net profit"}
            change={hasNoData ? "No data" : "+12.1%"}
            icon={FaArrowUp}
            iconColor="text-emerald-500"
          />
          <StatCard
            title="Loss"
            value={metrics ? formatCurrency(metrics.loss) : '₹0'}
            subtitle={hasNoData ? "No data" : "Net loss"}
            change={hasNoData ? "No data" : "-1.4%"}
            icon={FaArrowDown}
            iconColor="text-rose-500"
          />
          <StatCard
            title="Total Expenses"
            value={metrics ? formatCurrency(metrics.totalExpenses) : '₹0'}
            subtitle={hasNoData ? "No data" : "Total expenses"}
            change={hasNoData ? "No data" : "-2.4%"}
            icon={FaWallet}
            iconColor="text-primary"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <TopServicesChart
            filterType={filterType}
            presetPeriod={presetPeriod}
            startDate={startDate}
            endDate={endDate}
          />
          <TopSellingProductsChart
            filterType={filterType}
            presetPeriod={presetPeriod}
            startDate={startDate}
            endDate={endDate}
          />
        </div>

        {/* Revenue Overview Chart */}
        <div className="mb-6">
          <SalesChart
            filterType={filterType}
            presetPeriod={presetPeriod}
            startDate={startDate}
            endDate={endDate}
          />
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <UpcomingAppointments
            filterType={filterType}
            presetPeriod={presetPeriod}
            startDate={startDate}
            endDate={endDate}
          />
          <ClientFeedback />
        </div>
      </div>
    </div>
  );
}