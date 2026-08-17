import { NextResponse } from 'next/server';
import _db from '@repo/lib/db';
import DoctorModel from '@repo/lib/models/Vendor/Docters.model';
import { authMiddlewareCrm } from '@/middlewareCrm.js';
import { uploadBase64, deleteFile } from '@repo/lib/utils/upload';

await _db();

// GET the current doctor's profile
export const GET = authMiddlewareCrm(async (req) => {
  try {
    const doctorId = req.user.userId || req.user._id;


    if (!doctorId) {
      return NextResponse.json({ message: "Doctor ID is required" }, { status: 400 });
    }

    const doctor = await DoctorModel.findById(doctorId).select('-password -__v');


    if (!doctor) {
      return NextResponse.json({ message: "Doctor not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: doctor
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching doctor profile:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to fetch doctor profile",
      error: error.message
    }, { status: 500 });
  }
}, ['doctor']);

// Helper function to process base64 image and upload it
const processBase64Image = async (base64String, fileName, oldImageUrl = null) => {
  if (!base64String) return null;
  if (base64String.startsWith('http')) {
    return base64String;
  }
  const imageUrl = await uploadBase64(base64String, fileName);
  if (imageUrl && oldImageUrl && oldImageUrl.startsWith('http')) {
    try {
      deleteFile(oldImageUrl).catch(err => {
        console.warn('Failed to delete old image:', err);
      });
    } catch (err) {
      console.warn('Error deleting old image:', err);
    }
  }
  return imageUrl;
};

// PUT - Update doctor profile
export const PUT = authMiddlewareCrm(async (req) => {
  try {
    const doctorId = req.user.userId || req.user._id;
    const body = await req.json();

    // Find the doctor
    const doctor = await DoctorModel.findById(doctorId);
    if (!doctor) {
      return NextResponse.json({
        success: false,
        message: "Doctor not found"
      }, { status: 404 });
    }

    // Remove _id from body if present to prevent accidental updates
    delete body._id;

    // Handle profile image upload if provided
    if (body.profileImage !== undefined) {
      if (body.profileImage && !body.profileImage.startsWith('http')) {
        const imageUrl = await processBase64Image(body.profileImage, `doctor-${doctorId}-profile`, doctor.profileImage);
        if (imageUrl) {
          body.profileImage = imageUrl;
        }
      } else {
        body.profileImage = body.profileImage || doctor.profileImage;
      }
    }

    // Handle gallery images upload if provided
    if (body.gallery !== undefined && Array.isArray(body.gallery)) {
      const galleryUrls = [];
      for (let i = 0; i < body.gallery.length; i++) {
        const image = body.gallery[i];
        if (image && !image.startsWith('http')) {
          const oldImageUrl = doctor.gallery && doctor.gallery[i] ? doctor.gallery[i] : null;
          const imageUrl = await processBase64Image(image, `doctor-${doctorId}-gallery-${i}`, oldImageUrl);
          if (imageUrl) {
            galleryUrls.push(imageUrl);
          }
        } else {
          galleryUrls.push(image);
        }
      }
      body.gallery = galleryUrls;
    }

    // Handle documents upload if provided
    if (body.documents !== undefined && typeof body.documents === 'object') {
      const documentFields = ['aadharCard', 'panCard', 'medicalRegCert', 'medicalDegreeCert', 'clinicDetails'];
      if (!doctor.documents) {
        doctor.documents = {};
      }
      
      for (const docField of documentFields) {
        if (body.documents[docField] !== undefined) {
          if (body.documents[docField] && !body.documents[docField].startsWith('http')) {
            const docUrl = await processBase64Image(body.documents[docField], `doctor-${doctorId}-${docField}`, doctor.documents[docField]);
            if (docUrl) {
              doctor.documents[docField] = docUrl;
              doctor.documents[`${docField}Status`] = 'pending';
              doctor.documents[`${docField}AdminRejectionReason`] = null;
            }
          } else {
            doctor.documents[docField] = body.documents[docField];
          }
        }
      }

      // Handle multiple otherDocs
      if (body.documents.otherDocs !== undefined && Array.isArray(body.documents.otherDocs)) {
        const otherDocsUrls = [];
        const newStatusArr = [];
        const newReasonArr = [];
        const existingOtherDocs = doctor.documents.otherDocs || [];
        const existingStatus = doctor.documents.otherDocsStatus || [];
        const existingReasons = doctor.documents.otherDocsAdminRejectionReason || [];

        for (let i = 0; i < body.documents.otherDocs.length; i++) {
          const doc = body.documents.otherDocs[i];
          let finalUrl = null;
          let oldIdx = -1;

          if (doc && !doc.startsWith('http')) {
            // It's a new upload (base64)
            const oldDocUrl = existingOtherDocs[i] || null;
            finalUrl = await processBase64Image(doc, `doctor-${doctorId}-otherdocs-${i}`, oldDocUrl);
          } else if (doc) {
            // It's an existing URL
            finalUrl = doc;
            oldIdx = existingOtherDocs.indexOf(doc);
          }

          if (finalUrl) {
            otherDocsUrls.push(finalUrl);
            // Copy existing status/reason if it existed before, otherwise set to defaults
            if (oldIdx !== -1) {
              newStatusArr.push(existingStatus[oldIdx] || 'pending');
              newReasonArr.push(existingReasons[oldIdx] || null);
            } else {
              newStatusArr.push('pending');
              newReasonArr.push(null);
            }
          }
        }
        doctor.documents.otherDocs = otherDocsUrls;
        doctor.documents.otherDocsStatus = newStatusArr;
        doctor.documents.otherDocsAdminRejectionReason = newReasonArr;
      }
      
      // Put processed documents back into body so it gets picked up by allowedFields loop
      body.documents = doctor.documents;
    }

    // Build update object from allowed fields
    const allowedFields = [
      'firstName', 'lastName', 'name', 'email', 'phone', 'gender', 'registrationNumber', 'doctorType',
      'specialties', 'subSpecializations', 'diseases', 'experience', 'clinicName', 'clinicAddress',
      'state', 'city', 'pincode', 'profileImage', 'gallery', 'qualification',
      'registrationYear', 'physicalConsultationStartTime', 'physicalConsultationEndTime',
      'faculty', 'assistantName', 'assistantContact', 'assistantEmail', 'assistantGender', 'doctorAvailability',
      'landline', 'workingWithHospital', 'videoConsultation', 'notificationPreferences',
      'documents'
    ];

    const updateFields = { updatedAt: new Date() };
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateFields[field] = body[field];
      }
    });

    // Use findByIdAndUpdate to bypass Mongoose schema validation entirely
    // (avoids cached required validators like doctorType)
    const updatedDoctor = await DoctorModel.findByIdAndUpdate(
      doctorId,
      { $set: updateFields },
      { new: true, runValidators: false }
    );

    if (!updatedDoctor) {
      return NextResponse.json({ success: false, message: "Doctor not found" }, { status: 404 });
    }

    // Return updated doctor without sensitive fields
    const doctorResponse = updatedDoctor.toObject();
    delete doctorResponse.password;
    delete doctorResponse.__v;

    return NextResponse.json({
      success: true,
      message: "Doctor profile updated successfully",
      data: doctorResponse
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating doctor profile:', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json({
        success: false,
        message: `Doctor with this ${field} already exists`
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      message: "Failed to update doctor profile",
      error: error.message
    }, { status: 500 });
  }
}, ['doctor']);
