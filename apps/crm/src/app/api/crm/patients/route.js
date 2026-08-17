import { NextResponse } from 'next/server';
import _db from '@repo/lib/db';
import PatientModel from '../../../../../../../packages/lib/src/models/Vendor/Patient.model.js';
import DoctorConsultation from '../../../../../../../packages/lib/src/models/Vendor/DoctorConsultation.model.js';
import { authMiddlewareCrm } from '@/middlewareCrm.js';
import { uploadBase64, deleteFile } from '@repo/lib/utils/upload';

await _db();

// GET: Fetch all patients for the doctor
export const GET = authMiddlewareCrm(async (req) => {
  try {
    // Use userId instead of _id since that's how it's stored in the JWT token
    const doctorId = req.user.userId;
    
    const patients = await PatientModel.find({ doctorId }).sort({ createdAt: -1 });
    
    // Fetch all active/completed consultations for the doctor to calculate visits
    const consultations = await DoctorConsultation.find({
      doctorId,
      status: { $ne: 'cancelled' }
    }).sort({ appointmentDate: 1 });

    const patientsWithVisits = patients.map(p => {
      const pObj = p.toObject();
      const patientConsults = consultations.filter(c => 
        (c.patientId && c.patientId.toString() === p._id.toString()) || 
        (c.phoneNumber && c.phoneNumber === p.phone) ||
        (c.email && c.email.toLowerCase() === p.email.toLowerCase())
      );
      
      const now = new Date();
      const pastConsults = patientConsults.filter(c => new Date(c.appointmentDate) < now || c.status === 'completed');
      const futureConsults = patientConsults.filter(c => new Date(c.appointmentDate) >= now && ['scheduled', 'confirmed', 'rescheduled', 'in-progress'].includes(c.status));
      
      const lastVisit = pastConsults.length > 0 ? pastConsults[pastConsults.length - 1].appointmentDate : p.lastConsultation || null;
      const nextVisit = futureConsults.length > 0 ? futureConsults[0].appointmentDate : null;
      const totalVisits = pastConsults.length > 0 ? pastConsults.length : p.totalConsultations || 0;

      // Derive visitType from the patient's most recent consultation
      const lastConsultObj = pastConsults.length > 0 ? pastConsults[pastConsults.length - 1] : null;
      const hasClinic = patientConsults.some(c => c.consultationType === 'physical');
      const hasVideo = patientConsults.some(c => c.consultationType === 'video');
      let visitType = 'appointment'; // default
      if (hasClinic && hasVideo) visitType = 'appointment';
      else if (hasClinic) visitType = 'physical';
      else if (hasVideo) visitType = 'video';
      else if (futureConsults.length > 0) visitType = 'appointment';

      return {
        ...pObj,
        lastVisit,
        nextVisit,
        totalVisits,
        visitType
      };
    });
    
    return NextResponse.json(patientsWithVisits);
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch patients', error: error.message }, { status: 500 });
  }
}, ['doctor']);

// POST: Create a new patient
export const POST = authMiddlewareCrm(async (req) => {
  try {
    // Use userId instead of _id since that's how it's stored in the JWT token
    const doctorId = req.user.userId;
    const patientData = await req.json();

    // Validate required fields
    if (!patientData.name || !patientData.email || !patientData.phone || 
        !patientData.gender || !patientData.birthdayDate || !patientData.country) {
      return NextResponse.json({ success: false, message: 'Required fields missing' }, { status: 400 });
    }

    // Check if patient with same email or phone already exists
    const existingPatient = await PatientModel.findOne({
      $or: [
        { email: patientData.email },
        { phone: patientData.phone }
      ],
      doctorId
    });

    if (existingPatient) {
      return NextResponse.json({ success: false, message: 'Patient with this email or phone already exists' }, { status: 400 });
    }

    // Handle profile image upload if provided
    let profileImageUrl = patientData.profileImage || '';
    if (patientData.profileImage) {
      const fileName = `patient-${doctorId}-${Date.now()}`;
      const imageUrl = await uploadBase64(patientData.profileImage, fileName);
      
      if (!imageUrl) {
        return NextResponse.json(
          { success: false, message: "Failed to upload profile image" },
          { status: 500 }
        );
      }
      
      profileImageUrl = imageUrl;
    }

    // Create new patient
    const newPatient = new PatientModel({
      ...patientData,
      profileImage: profileImageUrl,
      doctorId,
      lastConsultation: new Date(),
    });

    const savedPatient = await newPatient.save();
    
    return NextResponse.json({ success: true, data: savedPatient }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to create patient', error: error.message }, { status: 500 });
  }
}, ['doctor']);

// PUT: Update a patient
export const PUT = authMiddlewareCrm(async (req) => {
  try {
    // Use userId instead of _id since that's how it's stored in the JWT token
    const doctorId = req.user.userId;
    const { id, ...updateData } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, message: 'Patient ID is required' }, { status: 400 });
    }

    // Validate required fields
    if (!updateData.name || !updateData.email || !updateData.phone || 
        !updateData.gender || !updateData.birthdayDate || !updateData.country) {
      return NextResponse.json({ success: false, message: 'Required fields missing' }, { status: 400 });
    }

    // Check if another patient with same email or phone already exists
    const existingPatient = await PatientModel.findOne({
      $or: [
        { email: updateData.email },
        { phone: updateData.phone }
      ],
      doctorId,
      _id: { $ne: id }
    });

    if (existingPatient) {
      return NextResponse.json({ success: false, message: 'Patient with this email or phone already exists' }, { status: 400 });
    }

    // Handle profile image upload if provided
    if (updateData.profileImage !== undefined) {
      if (updateData.profileImage) {
        // Upload new image to VPS
        const fileName = `patient-${doctorId}-${Date.now()}`;
        const imageUrl = await uploadBase64(updateData.profileImage, fileName);
        
        if (!imageUrl) {
          return NextResponse.json(
            { success: false, message: "Failed to upload profile image" },
            { status: 500 }
          );
        }
        
        // Delete old image from VPS if it exists
        const oldPatient = await PatientModel.findById(id);
        if (oldPatient && oldPatient.profileImage) {
          await deleteFile(oldPatient.profileImage);
        }
        
        updateData.profileImage = imageUrl;
      } else {
        // If image is null/empty, remove it
        updateData.profileImage = '';
        
        // Delete old image from VPS if it exists
        const oldPatient = await PatientModel.findById(id);
        if (oldPatient && oldPatient.profileImage) {
          await deleteFile(oldPatient.profileImage);
        }
      }
    }

    const updatedPatient = await PatientModel.findOneAndUpdate(
      { _id: id, doctorId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedPatient) {
      return NextResponse.json({ success: false, message: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedPatient });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to update patient', error: error.message }, { status: 500 });
  }
}, ['doctor']);

// DELETE: Remove a patient
export const DELETE = authMiddlewareCrm(async (req) => {
  try {
    // Use userId instead of _id since that's how it's stored in the JWT token
    const doctorId = req.user.userId;
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, message: 'Patient ID is required' }, { status: 400 });
    }

    const deletedPatient = await PatientModel.findOneAndDelete({ _id: id, doctorId });

    if (!deletedPatient) {
      return NextResponse.json({ success: false, message: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Patient deleted successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to delete patient', error: error.message }, { status: 500 });
  }
}, ['doctor']);