
import _db from "@repo/lib/db";
import DoctorModel from "@repo/lib/models/Vendor/Docters.model";
import { ReferralModel, V2VSettingsModel } from "@repo/lib/models/admin/Reffer.model";
import SubscriptionPlan from "@repo/lib/models/admin/SubscriptionPlan.model";
import { authMiddlewareAdmin } from "../../../../middlewareAdmin.js";
import { NotificationService } from "@repo/lib";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { uploadBase64, deleteFile } from "@repo/lib/utils/upload";

// Utility function to process base64 image and upload it
// Also deletes the old image if a new one is uploaded
const processBase64Image = async (base64String, fileName, oldImageUrl = null) => {
  if (!base64String) return null;

  // Check if it's already a URL (not base64)
  if (base64String.startsWith('http')) {
    return base64String; // Already uploaded, return as is
  }

  // Upload the base64 image and return the URL
  const imageUrl = await uploadBase64(base64String, fileName);

  // If upload was successful and there's an old image, delete the old one
  if (imageUrl && oldImageUrl && oldImageUrl.startsWith('http')) {
    try {
      // Attempt to delete the old file
      // We don't await this as we don't want to fail the whole operation if deletion fails
      deleteFile(oldImageUrl).catch(err => {
        console.warn('Failed to delete old image:', err);
      });
    } catch (err) {
      console.warn('Error deleting old image:', err);
    }
  }

  return imageUrl;
};

// Initialize database connection
const initDb = async () => {
  try {
    await _db();
  } catch (error) {
    console.error("Database connection error:", error);
    throw new Error("Failed to connect to database");
  }
};

// Function to generate a unique referral code for a doctor
const generateDoctorReferralCode = async (name) => {
  let referralCode;
  let isUnique = false;
  const namePrefix = name.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 3);

  while (!isUnique) {
    const randomNumbers = Math.floor(100 + Math.random() * 900); // Generates 3-digit number
    referralCode = `DR${namePrefix}${randomNumbers}`;

    const existingDoctor = await DoctorModel.findOne({ referralCode });
    if (!existingDoctor) {
      isUnique = true;
    }
  }
  return referralCode;
};
export const POST = authMiddlewareAdmin(
  async (req) => {
    try {
      await initDb();
      const body = await req.json();

      // Validate required fields
      const requiredFields = [
        "name", "email", "phone", "gender", "password",
        "registrationNumber", "doctorType", "specialties",
        "experience", "clinicName", "clinicAddress",
        "state", "city", "pincode", "location",
        "physicalConsultationStartTime", "physicalConsultationEndTime",
        "assistantName", "assistantContact", "doctorAvailability"
      ];

      for (const field of requiredFields) {
        if (!body[field]) {
          return NextResponse.json({ message: `Missing required field: ${field}` }, { status: 400 });
        }
      }

      // Check existence
      const existing = await DoctorModel.findOne({ $or: [{ email: body.email }, { phone: body.phone }, { registrationNumber: body.registrationNumber }] });
      if (existing) {
        return NextResponse.json({ message: "Doctor with this email, phone, or reg number already exists" }, { status: 409 });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(body.password, 10);

      // Generate referral code
      const referralCode = await generateDoctorReferralCode(body.name);

      // Assign region
      const { assignRegion } = await import("@repo/lib/utils/assignRegion.js");
      const regionId = await assignRegion(body.city, body.state, body.location);

      // Create doctor
      const newDoctor = await DoctorModel.create({
        ...body,
        password: hashedPassword,
        referralCode,
        regionId
      });

      // Handle referral if provided
      if (body.referredByCode) {
        try {
          const referringDoctor = await DoctorModel.findOne({ referralCode: body.referredByCode.trim().toUpperCase() });
          if (referringDoctor) {
            const settings = await V2VSettingsModel.findOne({
              $or: [
                { regionId: newDoctor.regionId },
                { regionId: null }
              ]
            }).sort({ regionId: -1 });

            const bonusValue = settings?.referrerBonus?.bonusValue || 0;
            const referralId = `REF_D_${Date.now()}`;

            const referral = await ReferralModel.create({
              referralId,
              referralType: 'D2D',
              referrer: referringDoctor._id.toString(),
              referrerType: 'Doctor',
              referee: newDoctor._id.toString(),
              refereeType: 'Doctor',
              regionId: newDoctor.regionId,
              date: new Date(),
              status: 'Pending',
              bonus: `₹${bonusValue}`,
            });

          }
        } catch (err) {
          console.error("D2D Referral error:", err);
        }
      }

      // Trigger Registration Notification
      (async () => {
        try {
          await NotificationService.sendRegistrationAlert(newDoctor._id.toString(), 'doctor', {
            name: newDoctor.name,
            role: 'Doctor'
          });
          // Notify Admin
          await NotificationService.sendAdminAlert('Doctor Registration', `New doctor registered: ${newDoctor.name} (${newDoctor.email})`);
        } catch (err) {
          console.error('Registration Notification Error:', err);
        }
      })();

      return NextResponse.json({ message: "Doctor created successfully", doctor: newDoctor }, { status: 201 });

    } catch (error) {
      console.error("Error creating doctor:", error);
      return NextResponse.json(
        { message: "Error creating doctor", error: error.message },
        { status: 500 }
      );
    }
  },
  ["SUPER_ADMIN", "REGIONAL_ADMIN", "STAFF"],
  "doctors:edit"
);

// GET - List doctors with regional scoping
export const GET = authMiddlewareAdmin(async (req) => {
  const { buildRegionQueryFromRequest } = await import("@repo/lib");
  const query = buildRegionQueryFromRequest(req);
  const doctors = await DoctorModel.find(query).populate("subscription.plan", "name").select("-password"); // Hide password
  return Response.json(doctors);
}, ["SUPER_ADMIN", "REGIONAL_ADMIN", "STAFF"], "doctors:view");

// PUT - Update doctor details
export const PUT = authMiddlewareAdmin(async (req) => {
  try {
    await initDb();
    const { id, profileImage, password, ...updateData } = await req.json();

    if (!id) {
      return NextResponse.json({ message: "ID is required to update a doctor" }, { status: 400 });
    }

    const existingDoctor = await DoctorModel.findById(id);
    if (!existingDoctor) {
      return NextResponse.json({ message: "Doctor not found" }, { status: 404 });
    }

    // Process profile image if provided
    let finalProfileImage = existingDoctor.profileImage;
    if (profileImage !== undefined) {
      if (profileImage && !profileImage.startsWith('http')) {
        const imageUrl = await processBase64Image(profileImage, `doctor-${id}-profile`, existingDoctor.profileImage);
        if (imageUrl) {
          finalProfileImage = imageUrl;
        }
      } else {
        finalProfileImage = profileImage;
      }
    }

    // If password is provided, hash it
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedDoctor = await DoctorModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate("subscription.plan", "name").select("-password");

    if (!updatedDoctor) {
      return Response.json({ message: "Doctor not found" }, { status: 404 });
    }

    // Trigger Notification for Approval if status changed
    if (updateData.status) {
      (async () => {
        try {
          await NotificationService.sendApprovalAlert(id, 'doctor', updateData.status);
        } catch (err) {
          console.error('Doctor Approval Notification Error:', err);
        }
      })();
    }

    return NextResponse.json(updatedDoctor);
  } catch (error) {
    console.error("Error updating doctor:", error);
    return NextResponse.json({ message: "Error updating doctor", error: error.message }, { status: 500 });
  }
}, ["SUPER_ADMIN", "REGIONAL_ADMIN"]);

// DELETE - Remove a doctor
export const DELETE = authMiddlewareAdmin(
  async (req) => {
    const { id } = await req.json();
    const deleted = await DoctorModel.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ message: "Doctor not found" }, { status: 404 });
    }

    return Response.json({ message: "Doctor deleted successfully" });
  },
  ["SUPER_ADMIN", "REGIONAL_ADMIN"],
  "doctors:delete"
);

// PATCH - Update doctor status or document status
export const PATCH = authMiddlewareAdmin(
  async (req) => {
    try {
      await initDb();
      const body = await req.json();
      const { id, status, doctorId, documentType, rejectionReason } = body;

      // Check if this is a doctor status update
      if (id && status && !documentType) {
        if (!id || !status) {
          return NextResponse.json(
            { message: "Doctor ID and status are required" },
            { status: 400 }
          );
        }

        const updateDataForStatus = { status };

        if (status === "Rejected") {
          if (!rejectionReason || rejectionReason.trim() === "") {
            return NextResponse.json(
              { message: "Rejection reason is required when rejecting a doctor" },
              { status: 400 }
            );
          }
          updateDataForStatus.rejectionReason = rejectionReason.trim();
        } else if (status === "Approved") {
          updateDataForStatus.rejectionReason = null;
        }

        // If status is "Approved", check mandatory documents
        if (status === "Approved") {
          const doctor = await DoctorModel.findById(id);
          if (!doctor) {
            return NextResponse.json({ message: "Doctor not found" }, { status: 404 });
          }

          const documents = doctor.documents || {};
          const mandatoryDocs = [
            { key: "aadharCard", label: "Aadhar Card" },
            { key: "panCard", label: "PAN Card" },
          ];

          const pendingOrRejectedDocs = mandatoryDocs.filter((doc) => {
            const isUploaded = documents[doc.key] && documents[doc.key] !== "";
            const docStatus = documents[`${doc.key}Status`];
            return !isUploaded || docStatus !== "approved";
          });

          if (pendingOrRejectedDocs.length > 0) {
            const docLabels = pendingOrRejectedDocs.map((doc) => doc.label).join(", ");
            return NextResponse.json(
              {
                message: `Cannot approve doctor. The following mandatory documents are missing or not approved: ${docLabels}`,
              },
              { status: 400 }
            );
          }
        }

        const updatedDoctor = await DoctorModel.findByIdAndUpdate(
          id,
          { $set: updateDataForStatus },
          { new: true }
        ).populate("subscription.plan", "name").select("-password");

        if (!updatedDoctor) {
          return NextResponse.json({ message: "Doctor not found" }, { status: 404 });
        }

        (async () => {
          try {
            const message = status === "Rejected" && rejectionReason
              ? `Your account has been rejected. Reason: ${rejectionReason.trim()}`
              : '';
            await NotificationService.sendApprovalAlert(id, 'doctor', status, message);
          } catch (err) {
            console.error('Doctor Approval Notification Error:', err);
          }
        })();

        return NextResponse.json({
          message: `Doctor ${status} successfully`,
          doctor: updatedDoctor,
        });
      }

      // Check if this is a document status update
      else if (doctorId && documentType && status) {
        const validDocumentTypes = [
          'aadharCard', 'panCard', 'medicalRegCert', 'medicalDegreeCert', 'clinicDetails'
        ];

        // Check if it's an otherDoc index-based key (e.g. otherDoc_0, otherDoc_1)
        const otherDocMatch = documentType.match(/^otherDoc_(\d+)$/);

        if (!validDocumentTypes.includes(documentType) && !otherDocMatch) {
          return NextResponse.json({ message: "Invalid document type" }, { status: 400 });
        }

        if (!['pending', 'approved', 'rejected'].includes(status)) {
          return NextResponse.json({ message: "Invalid status" }, { status: 400 });
        }

        if (status === 'rejected' && (!rejectionReason || rejectionReason.trim() === '')) {
          return NextResponse.json({ message: "Rejection reason is required" }, { status: 400 });
        }

        const doctor = await DoctorModel.findById(doctorId);
        if (!doctor) {
          return NextResponse.json({ message: "Doctor not found" }, { status: 404 });
        }

        if (!doctor.documents) {
          doctor.documents = {};
        }

        if (otherDocMatch) {
          const idx = parseInt(otherDocMatch[1], 10);
          const otherDocsCount = doctor.documents.otherDocs?.length || 0;

          // Ensure status and reason arrays are initialized
          if (!doctor.documents.otherDocsStatus) {
            doctor.documents.otherDocsStatus = [];
          }
          if (!doctor.documents.otherDocsAdminRejectionReason) {
            doctor.documents.otherDocsAdminRejectionReason = [];
          }

          // Pad arrays to match otherDocsCount
          while (doctor.documents.otherDocsStatus.length < otherDocsCount) {
            doctor.documents.otherDocsStatus.push('pending');
          }
          while (doctor.documents.otherDocsAdminRejectionReason.length < otherDocsCount) {
            doctor.documents.otherDocsAdminRejectionReason.push(null);
          }

          if (idx < otherDocsCount) {
            doctor.documents.otherDocsStatus[idx] = status;
            doctor.documents.otherDocsAdminRejectionReason[idx] = status === 'rejected' ? rejectionReason : null;
          }
        } else {
          doctor.documents[`${documentType}Status`] = status;
          if (status === 'rejected') {
            doctor.documents[`${documentType}AdminRejectionReason`] = rejectionReason;
          } else {
            doctor.documents[`${documentType}AdminRejectionReason`] = null;
          }
        }

        doctor.markModified('documents');
        const updatedDoctor = await doctor.save({ validateModifiedOnly: true });

        const doctorResponse = updatedDoctor.toObject();
        delete doctorResponse.password;
        delete doctorResponse.__v;

        return NextResponse.json({
          message: `Document ${status} successfully`,
          doctor: doctorResponse,
        });
      }

      return NextResponse.json({ message: "Invalid request parameters" }, { status: 400 });
    } catch (error) {
      console.error("Error in doctor PATCH:", error);
      return NextResponse.json({ message: "Error updating doctor", error: error.message }, { status: 500 });
    }
  },
  ["SUPER_ADMIN", "REGIONAL_ADMIN"],
  "doctors:edit"
);
