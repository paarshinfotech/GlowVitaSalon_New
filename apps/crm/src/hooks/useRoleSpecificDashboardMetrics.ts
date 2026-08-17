import { useState, useEffect, useCallback } from 'react';
import { useCrmAuth } from './useCrmAuth';

interface CancelledAppointments {
  count: number;
  revenueLoss: number;
}

interface DashboardMetrics {
  totalRevenue: number;
  totalBookings: number;
  bookingHours: number;
  sellingServicesRevenue: number;
  sellingProductsRevenue: number;
  cancelledAppointments: CancelledAppointments;
  upcomingAppointments: number;
  totalBusiness: number;
  completedAppointments: number;
  totalExpense: number;
  totalCounterSale: number;
}

interface SupplierDashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  pendingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  avgOrderValue: number;
  inventoryValue: number;
  topSellingProducts: Array<{
    name: string;
    sales: number;
    revenue: number;
  }>;
  recentOrders: Array<{
    id: string;
    customer: string;
    date: string;
    amount: number;
    status: string;
  }>;
}

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

interface UseRoleSpecificDashboardMetricsReturn {
  metrics: DashboardMetrics | SupplierDashboardMetrics | DoctorDashboardMetrics | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  role: string | null;
}

// Updated to accept custom date range parameters
export const useRoleSpecificDashboardMetrics = (
  filterType?: 'preset' | 'custom',
  presetPeriod?: 'day' | 'month' | 'year' | 'all',
  startDate?: string,
  endDate?: string
): UseRoleSpecificDashboardMetricsReturn => {
  const { isCrmAuthenticated, isLoading: authLoading, user, role } = useCrmAuth();
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      // Don't fetch if user is not authenticated
      if (!isCrmAuthenticated || !role) {
        return;
      }

      setLoading(true);
      setError(null);

      // Build query params based on role
      let url = `/api/crm/${role.toLowerCase()}/metrics`;

      // Handle custom date range
      if (filterType === 'custom' && startDate && endDate) {
        // For custom date ranges, we need to pass the dates as query parameters
        url += `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      }
      // Handle preset periods
      else if (presetPeriod && presetPeriod !== 'all') {
        url += `?period=${presetPeriod}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || `Failed to fetch ${role} dashboard metrics`);
      }

      setMetrics(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to fetch ${role} dashboard metrics`;
      setError(errorMessage);
      console.error(`Error fetching ${role} dashboard metrics:`, err);
    } finally {
      setLoading(false);
    }
  }, [isCrmAuthenticated, user, role, filterType, presetPeriod, startDate, endDate]);

  useEffect(() => {
    // Only fetch metrics when authentication state is determined and user is authenticated
    if (!authLoading && isCrmAuthenticated && role) {
      fetchMetrics();
    } else if (!authLoading && (!isCrmAuthenticated || !role)) {
      // If user is not authenticated or role is not available, stop loading
      setLoading(false);
    }
  }, [isCrmAuthenticated, authLoading, role, fetchMetrics]);

  const refresh = () => {
    fetchMetrics();
  };

  // Combine auth loading state with our own loading state
  const combinedLoading = authLoading || loading;

  return {
    metrics,
    loading: combinedLoading,
    error,
    refresh,
    role: role
  };
};