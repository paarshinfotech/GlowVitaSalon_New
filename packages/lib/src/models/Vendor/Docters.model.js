import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  gender: {
    type: String,
    required: false,
    trim: true,
    default: '',
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  doctorType: {
    type: String,
    trim: true,
    default: '',
  },
  specialties: [{
    type: String,
    required: true,
    trim: true,
  }],
  subSpecializations: [{
    type: String,
    trim: true,
  }],
  diseases: [{
    type: String,
    trim: true,
  }],
  experience: {
    type: String,
    required: true,
    trim: true,
  },
  clinicName: {
    type: String,
    required: true,
    trim: true,
  },
  clinicAddress: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  pincode: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
  },
  status: {
    type: String,
    enum: ["Approved", "Pending", "Rejected"],
    default: "Pending",
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: null,
  },
  regionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Region",
    required: true,
    index: true,
  },
  subscription: {
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true
    },
    status: {
      type: String,
      enum: ["Active", "Expired", "Pending", "Scheduled"],
      default: "Active",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true
    },
    purchaseDate: {
      type: Date,
      default: Date.now
    },
    history: {
      type: [{
        plan: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SubscriptionPlan",
          required: true
        },
        startDate: {
          type: Date,
          required: true
        },
        endDate: {
          type: Date,
          required: true
        },
        purchaseDate: {
          type: Date,
          default: Date.now
        },
        status: {
          type: String,
          enum: ["Active", "Expired", "Scheduled"],
          required: true
        }
      }],
      default: [],
    }
  },
  profileImage: {
    type: String, // URL to the uploaded image
    trim: true,
  },
  gallery: [
    {
      type: String, // URLs to the uploaded images
      default: null,
    },
  ],
  qualification: {
    type: String,
    trim: true,
  },
  registrationYear: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  physicalConsultationStartTime: {
    type: String,
    required: true,
    trim: true,
  },
  physicalConsultationEndTime: {
    type: String,
    required: true,
    trim: true,
  },
  faculty: {
    type: String,
    trim: true,
  },
  assistantName: {
    type: String,
    required: true,
    trim: true,
  },
  assistantContact: {
    type: String,
    required: true,
    trim: true,
  },
  assistantEmail: {
    type: String,
    trim: true,
  },
  assistantGender: {
    type: String,
    trim: true,
  },
  doctorAvailability: {
    type: String,
    required: true,
    enum: ["Online", "Offline"],
    trim: true,
  },
  landline: {
    type: String,
    trim: true,
  },
  workingWithHospital: {
    type: Boolean,
    default: false,
  },
  videoConsultation: {
    type: Boolean,
    default: false,
  },
  referralCode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  },
  documents: {
    aadharCard: {
      type: String, // URL to the uploaded document
      default: null,
    },
    panCard: {
      type: String,
      default: null,
    },
    medicalRegCert: {
      type: String,
      default: null,
    },
    medicalDegreeCert: {
      type: String,
      default: null,
    },
    clinicDetails: {
      type: String,
      default: null,
    },
    otherDocs: [
      {
        type: String,
        default: null,
      },
    ],
    otherDocsStatus: [
      {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
    ],
    otherDocsAdminRejectionReason: [
      {
        type: String,
        default: null,
      },
    ],
    // Add document status fields
    aadharCardStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    panCardStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    medicalRegCertStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    medicalDegreeCertStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    clinicDetailsStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    // Add admin rejection reason fields
    aadharCardAdminRejectionReason: {
      type: String,
      default: null,
    },
    panCardAdminRejectionReason: {
      type: String,
      default: null,
    },
    medicalRegCertAdminRejectionReason: {
      type: String,
      default: null,
    },
    medicalDegreeCertAdminRejectionReason: {
      type: String,
      default: null,
    },
    clinicDetailsAdminRejectionReason: {
      type: String,
      default: null,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  fcmTokens: {
    type: [String],
    default: [],
    index: true,
  },
  notificationPreferences: {
    pushEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: true },
    appointments: { type: Boolean, default: true },
    promotional: { type: Boolean, default: true },
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  inactivityReminderSent: {
    type: Boolean,
    default: false,
  },
  wallet: {
    type: Number,
    default: 0,
  },
  razorpayContactId: {
    type: String,
    default: null,
  },
  isPhoneVerified: {
    type: Boolean,
    default: false,
  },
});

// Pre-save middleware to auto-update subscription status based on endDate
doctorSchema.pre('validate', async function (next) {
  if (this.subscription && this.subscription.endDate) {
    const now = new Date();
    const endDate = new Date(this.subscription.endDate);

    // Auto-expire current plan and promote the next scheduled plan when available.
    if (endDate <= now) {
      const { reconcileSubscriptionSchedule } = await import("../../utils/subscriptionSchedule.js");
      reconcileSubscriptionSchedule(this, now);
    }
  }

  // Auto-assign regionId based on location if missing or location changed
  if (!this.regionId || this.isModified("location")) {
    try {
      const { assignRegion } = await import("../../utils/assignRegion.js");
      const assignedRegionId = await assignRegion(this.city, this.state, this.location);
      if (assignedRegionId) {
        this.regionId = assignedRegionId;
      }
    } catch (error) {
      console.error("[DoctorModel] Error auto-assigning region:", error);
    }
  }

  this.updatedAt = new Date();
  next();
});

// Instance method to get normalized subscription data
doctorSchema.methods.getSubscriptionData = function () {
  if (!this.subscription) {
    return {
      status: 'Expired',
      isExpired: true,
      endDate: null,
      plan: null
    };
  }

  const now = new Date();
  const endDate = this.subscription.endDate ? new Date(this.subscription.endDate) : null;
  const isExpired = !endDate || endDate <= now || this.subscription.status?.toLowerCase() === 'expired';

  return {
    status: isExpired ? 'Expired' : this.subscription.status,
    isExpired,
    endDate: this.subscription.endDate,
    startDate: this.subscription.startDate,
    plan: this.subscription.plan
  };
};

// Static method for optimized subscription queries
doctorSchema.statics.findByIdWithSubscription = function (id) {
  return this.findById(id)
    .select('subscription status email name')
    .populate('subscription.plan', 'name duration price')
    .lean();
};

doctorSchema.virtual('specialization').get(function () {
  return this.specialties?.[0] || '';
});

// Indexes for performance
doctorSchema.index({ 'subscription.status': 1, 'subscription.endDate': 1 });
// Email index removed as it is already defined in the schema with unique: true
doctorSchema.index({ status: 1 });

const DoctorModel = mongoose.models.Doctor || mongoose.model("Doctor", doctorSchema);

export default DoctorModel;
