import { NextResponse } from "next/server";
import mongoose from 'mongoose';
import DoctorConsultation from '@repo/lib/models/Vendor/DoctorConsultation.model';
import DoctorModel from '@repo/lib/models/Vendor/Docters.model';
import ReviewModel from '@repo/lib/models/Review/Review.model';
import _db from '@repo/lib/db';
import { authMiddlewareCrm } from '@/middlewareCrm.js';

await _db();

// Helper function to calculate date ranges based on filter period
const getDateRanges = (period) => {
  const now = new Date();

  let startDate, endDate;

  if (period === 'day') {
    // Today only
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === 'month') {
    // Current month
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === 'year') {
    // Current year
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else {
    // All time (last year for testing purposes)
    startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { startDate, endDate };
};

// Helper function to parse custom date ranges from query parameters
const getCustomDateRanges = (startDateStr, endDateStr) => {
  let startDate, endDate;

  if (startDateStr && endDateStr) {
    // Parse the custom date range
    startDate = new Date(startDateStr);
    endDate = new Date(endDateStr);
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
};

// Main handler function for the doctor metrics endpoint
async function getDoctorMetricsHandler(request) {
  try {
    // Use userId and convert to string based on other routes in the app
    const doctorId = (request.user.userId || request.user.id).toString();
    let doctorObjectId;
    try {
      doctorObjectId = new mongoose.Types.ObjectId(doctorId);
    } catch (e) {
      console.warn("Invalid doctor ID format for ObjectId conversion:", doctorId);
    }

    // Get filter parameters from query parameters
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'all';
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');

    // Determine date ranges based on parameters
    let startDate, endDate;
    if (startDateParam && endDateParam) {
      // Use custom date range
      const customDates = getCustomDateRanges(startDateParam, endDateParam);
      startDate = customDates.startDate;
      endDate = customDates.endDate;
    } else {
      // Use preset period
      const presetDates = getDateRanges(period);
      startDate = presetDates.startDate;
      endDate = presetDates.endDate;
    }

    const matchQuery = doctorObjectId 
      ? { $or: [{ doctorId: doctorId }, { doctorId: doctorObjectId }] }
      : { doctorId: doctorId };

    const reviewMatchQuery = doctorObjectId
      ? { $or: [{ entityId: doctorId }, { entityId: doctorObjectId }], entityType: 'doctor' }
      : { entityId: doctorId, entityType: 'doctor' };

    // 1. Total Patients (unique patients who had consultations with this doctor)
    let totalPatientsResult = await DoctorConsultation.aggregate([
      {
        $match: {
          ...matchQuery,
          appointmentDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$patientId"
        }
      },
      {
        $count: "totalPatients"
      }
    ]);
    const totalPatients = totalPatientsResult.length > 0 ? totalPatientsResult[0].totalPatients : 0;

    // 2. Total Appointments (Consultations)
    let totalAppointments = await DoctorConsultation.countDocuments({
      ...matchQuery,
      appointmentDate: { $gte: startDate, $lte: endDate }
    });

    // 3. Completed Appointments
    let completedAppointments = await DoctorConsultation.countDocuments({
      ...matchQuery,
      status: 'completed',
      appointmentDate: { $gte: startDate, $lte: endDate }
    });

    // 4. Pending Appointments
    let pendingAppointments = await DoctorConsultation.countDocuments({
      ...matchQuery,
      status: { $in: ['scheduled', 'confirmed', 'in-progress', 'rescheduled'] },
      appointmentDate: { $gte: startDate, $lte: endDate }
    });

    // 5. Cancelled Appointments
    let cancelledAppointments = await DoctorConsultation.countDocuments({
      ...matchQuery,
      status: 'cancelled',
      appointmentDate: { $gte: startDate, $lte: endDate }
    });

    // 6. Total Revenue from completed consultations (gross service revenue)
    let revenueAggregation = await DoctorConsultation.aggregate([
      {
        $match: {
          ...matchQuery,
          status: 'completed',
          appointmentDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$consultationFee" }
        }
      }
    ]);
    const totalServiceRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue || 0 : 0;

    // 7. Today's Revenue
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let todayRevenueAggregation = await DoctorConsultation.aggregate([
      {
        $match: {
          ...matchQuery,
          status: 'completed',
          appointmentDate: { $gte: todayStart, $lte: todayEnd }
        }
      },
      {
        $group: {
          _id: null,
          todayRevenue: { $sum: "$consultationFee" }
        }
      }
    ]);
    const todayRevenue = todayRevenueAggregation.length > 0 ? todayRevenueAggregation[0].todayRevenue || 0 : 0;

    // 8. Average Consultation Time (duration field in completed consultations)
    let avgConsultationTimeAggregation = await DoctorConsultation.aggregate([
      {
        $match: {
          ...matchQuery,
          status: 'completed',
          appointmentDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: "$duration" }
        }
      }
    ]);
    const averageConsultationTime = avgConsultationTimeAggregation.length > 0 ? avgConsultationTimeAggregation[0].avgDuration || 0 : 0;

    // 9. Patient Satisfaction (average rating from reviews)
    let patientSatisfactionAggregation = await ReviewModel.aggregate([
      {
        $match: {
          ...reviewMatchQuery,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" }
        }
      }
    ]);
    const patientSatisfaction = patientSatisfactionAggregation.length > 0 ? patientSatisfactionAggregation[0].avgRating || 0 : 0;

    // 10. Top Services (consultation type distribution projected as serviceName)
    let topServicesAggregation = await DoctorConsultation.aggregate([
      {
        $match: {
          ...matchQuery,
          appointmentDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$consultationType",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$consultationFee" }
        }
      },
      {
        $project: {
          _id: 0,
          serviceName: {
            $cond: {
              if: { $eq: ["$_id", "video"] },
              then: "Video Consultation",
              else: "Physical Consultation"
            }
          },
          count: 1,
          totalRevenue: 1
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // 11. Recent Appointments
    let recentAppointments = await DoctorConsultation.find({
      ...matchQuery,
      appointmentDate: { $gte: startDate, $lte: endDate }
    })
      .sort({ appointmentDate: -1 })
      .limit(5)
      .select('_id patientName consultationType appointmentDate appointmentTime status createdAt');

    // 12. New Metrics Calculation

    // 12.1 Total Clinic Visits (completed physical consultations)
    const totalClinicVisit = await DoctorConsultation.countDocuments({
      ...matchQuery,
      consultationType: 'physical',
      status: 'completed',
      appointmentDate: { $gte: startDate, $lte: endDate }
    });

    // 12.2 Total Video Call Consultations (completed video consultations)
    const totalVideoCallConsultation = await DoctorConsultation.countDocuments({
      ...matchQuery,
      consultationType: 'video',
      status: 'completed',
      appointmentDate: { $gte: startDate, $lte: endDate }
    });

    // 12.3 Booking Hours (sum of duration of active/completed consultations in hours)
    const activeConsultations = await DoctorConsultation.find({
      ...matchQuery,
      status: { $nin: ['cancelled', 'no-show'] },
      appointmentDate: { $gte: startDate, $lte: endDate }
    }, { duration: 1 });
    const totalMinutes = activeConsultations.reduce((sum, item) => sum + (item.duration || 0), 0);
    const bookingHours = parseFloat((totalMinutes / 60).toFixed(2));

    // 12.4 Total Expenses
    let totalExpenses = 0;
    try {
      const ExpenseModel = (await import('@repo/lib/models/Vendor/Expense.model')).default;
      const expenseMatchQuery = doctorObjectId
        ? { $or: [{ vendorId: doctorId }, { vendorId: doctorObjectId }], status: 'Active', date: { $gte: startDate, $lte: endDate } }
        : { vendorId: doctorId, status: 'Active', date: { $gte: startDate, $lte: endDate } };

      const expenseAggregation = await ExpenseModel.aggregate([
        {
          $match: expenseMatchQuery
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" }
          }
        }
      ]);
      totalExpenses = expenseAggregation.length > 0 ? expenseAggregation[0].totalAmount || 0 : 0;
    } catch (error) {
      console.error("Error calculating doctor expenses:", error);
    }

    // 12.5 Product sales revenue
    let deliveredProductRevenue = 0;
    try {
      const ClientOrder = (await import('@repo/lib/models/user/ClientOrder.model')).default;
      const orderMatchQuery = doctorObjectId
        ? { $or: [{ vendorId: doctorId }, { vendorId: doctorObjectId }], status: 'Delivered', createdAt: { $gte: startDate, $lte: endDate } }
        : { vendorId: doctorId, status: 'Delivered', createdAt: { $gte: startDate, $lte: endDate } };

      const deliveredProductOrdersAggregation = await ClientOrder.aggregate([
        {
          $match: orderMatchQuery
        },
        {
          $unwind: "$items"
        },
        {
          $group: {
            _id: null,
            totalProductRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
          }
        }
      ]);
      deliveredProductRevenue = deliveredProductOrdersAggregation.length > 0 ? deliveredProductOrdersAggregation[0].totalProductRevenue || 0 : 0;
    } catch (error) {
      console.error("Error calculating doctor product revenue:", error);
    }

    // 12.6 Counter Sales revenue
    let totalCounterSale = 0;
    try {
      const BillingModel = (await import('@repo/lib/models/Vendor/Billing.model')).default;
      const billingMatchQuery = doctorObjectId
        ? { $or: [{ vendorId: doctorId }, { vendorId: doctorObjectId }], createdAt: { $gte: startDate, $lte: endDate } }
        : { vendorId: doctorId, createdAt: { $gte: startDate, $lte: endDate } };

      const billingAggregation = await BillingModel.aggregate([
        {
          $match: billingMatchQuery
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$totalAmount" }
          }
        }
      ]);
      totalCounterSale = billingAggregation.length > 0 ? billingAggregation[0].totalAmount || 0 : 0;
    } catch (error) {
      console.error("Error calculating doctor counter sales:", error);
    }

    // 12.7 Total Business (Gross revenue)
    const totalBusiness = totalServiceRevenue + deliveredProductRevenue + totalCounterSale;

    // 12.8 Net Revenue
    const totalRevenue = totalBusiness - totalExpenses;

    const profit = totalRevenue > 0 ? totalRevenue : 0;
    const loss = totalRevenue < 0 ? Math.abs(totalRevenue) : 0;

    // Compile final metrics
    const metrics = {
      totalPatients,
      totalAppointments,
      completedAppointments,
      pendingAppointments,
      cancelledAppointments,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      todayRevenue: parseFloat(todayRevenue.toFixed(2)),
      averageConsultationTime: parseFloat(averageConsultationTime.toFixed(2)),
      patientSatisfaction: parseFloat(patientSatisfaction.toFixed(2)),
      topServices: topServicesAggregation,
      recentAppointments: recentAppointments.map(app => ({
        id: app._id.toString(),
        patient: app.patientName || 'Unknown Patient',
        service: app.consultationType === 'video' ? 'Video Consultation' : 'Physical Consultation',
        date: app.appointmentDate,
        time: app.appointmentTime,
        status: app.status
      })),
      totalClinicVisit,
      totalVideoCallConsultation,
      bookingHours,
      totalExpenses,
      totalBusiness,
      profit: parseFloat(profit.toFixed(2)),
      loss: parseFloat(loss.toFixed(2))
    };

    return NextResponse.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error("Error fetching doctor dashboard metrics:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Wrap the handler with auth middleware
export const GET = authMiddlewareCrm(getDoctorMetricsHandler);