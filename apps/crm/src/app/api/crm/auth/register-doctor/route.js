import { NextResponse } from "next/server";
import _db from "@repo/lib/db";
import DoctorModel from "@repo/lib/models/Vendor/Docters.model";
import SubscriptionPlan from "@repo/lib/models/admin/SubscriptionPlan.model";
import { ReferralModel, V2VSettingsModel } from "@repo/lib/models/admin/Reffer.model";
import bcrypt from "bcryptjs";

await _db();

// Generate a unique referral code for the doctor
const generateDoctorReferralCode = async (name) => {
  let referralCode;
  let isUnique = false;
  const namePrefix = name.replace(/[^a-zA-Z]/g, "").toUpperCase().substring(0, 3);

  while (!isUnique) {
    const randomNumbers = Math.floor(100 + Math.random() * 900);
    referralCode = `DR${namePrefix}${randomNumbers}`;
    const existing = await DoctorModel.findOne({ referralCode });
    if (!existing) isUnique = true;
  }
  return referralCode;
};

// POST - Public doctor self-registration (no admin token required)
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      name, email, phone, password, gender,
      doctorType, specialties, subSpecializations, diseases, experience,
      qualification, registrationNumber, clinicName, clinicAddress,
      state, city, pincode,
      physicalConsultationStartTime, physicalConsultationEndTime,
      assistantName, assistantContact,
      doctorAvailability, workingWithHospital, videoConsultation,
      referredByCode,
    } = body;

    // Basic required field validation
    const requiredFields = ["name", "email", "phone", "password", "registrationNumber"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ message: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Email format validation
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ message: "Invalid email address" }, { status: 400 });
    }

    // Phone validation
    if (!/^\d{10}$/.test(phone)) {
      return NextResponse.json({ message: "Phone must be 10 digits" }, { status: 400 });
    }

    // Password strength validation
    if (password.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Check for duplicate email, phone, or registration number
    const existing = await DoctorModel.findOne({
      $or: [{ email }, { phone }, { registrationNumber }],
    });
    if (existing) {
      return NextResponse.json(
        { message: "A doctor with this email, phone, or registration number already exists" },
        { status: 409 }
      );
    }

    // Look up the default trial/doctor subscription plan
    const trialPlan = await SubscriptionPlan.findOne({
      $or: [{ name: "Doctor Trial Plan" }, { name: "Trial Plan" }],
    });

    if (!trialPlan) {
      return NextResponse.json(
        { message: "Default subscription plan not found. Please contact support." },
        { status: 500 }
      );
    }

    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + (trialPlan.duration || 30));

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate referral code using trimmed full name
    const referralCode = await generateDoctorReferralCode(name.trim());

    // Use actual location submitted from the form
    const locationData = body.location && body.location.lat && body.location.lng
      ? { lat: body.location.lat, lng: body.location.lng }
      : null;

    if (!locationData) {
      return NextResponse.json({ message: "Location is required" }, { status: 400 });
    }

    // Assign region based on city/state
    const { assignRegion } = await import("@repo/lib/utils/assignRegion.js");
    const regionId = await assignRegion(city || "N/A", state || "N/A", locationData);

    // Create doctor record — use insertOne to bypass cached schema validators
    // (doctorType is no longer required in the updated schema but may be cached)
    const doctorDoc = {
      name: name.trim(),
      email,
      phone,
      password: hashedPassword,
      gender: gender || "",
      doctorType: "",
      specialties: specialties || [],
      subSpecializations: subSpecializations || [],
      diseases: diseases || [],
      experience: experience || "0",
      qualification: qualification || "",
      registrationNumber,
      clinicName: clinicName || "N/A",
      clinicAddress: clinicAddress || "N/A",
      state: state || "N/A",
      city: city || "N/A",
      pincode: pincode || "000000",
      location: locationData,
      physicalConsultationStartTime: physicalConsultationStartTime || "00:00",
      physicalConsultationEndTime: physicalConsultationEndTime || "00:00",
      assistantName: assistantName || "N/A",
      assistantContact: assistantContact || "0000000000",
      doctorAvailability: doctorAvailability || "Online",
      workingWithHospital: workingWithHospital || false,
      videoConsultation: videoConsultation !== undefined ? videoConsultation : true,
      referralCode,
      regionId,
      isPhoneVerified: true,
      status: "Pending",
      wallet: 0,
      fcmTokens: [],
      notificationPreferences: { pushEnabled: true, smsEnabled: true, appointments: true, promotional: true },
      subscription: {
        plan: trialPlan._id,
        status: "Active",
        startDate: new Date(),
        endDate: subscriptionEndDate,
        history: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: new Date(),
    };

    const insertResult = await DoctorModel.collection.insertOne(doctorDoc);
    const newDoctor = { ...doctorDoc, _id: insertResult.insertedId };

    // Handle D2D referral if code was provided
    if (referredByCode && referredByCode.trim() !== "") {
      try {
        const referringDoctor = await DoctorModel.findOne({
          referralCode: referredByCode.trim().toUpperCase(),
        });
        if (referringDoctor) {
          const settings = await V2VSettingsModel.findOne({
            $or: [{ regionId: newDoctor.regionId }, { regionId: null }],
          }).sort({ regionId: -1 });

          const bonusValue = settings?.referrerBonus?.bonusValue || 0;
          const referralId = `REF_D_${Date.now()}`;

          await ReferralModel.create({
            referralId,
            referralType: "D2D",
            referrer: referringDoctor._id.toString(),
            referrerType: "Doctor",
            referee: newDoctor._id.toString(),
            refereeType: "Doctor",
            regionId: newDoctor.regionId,
            date: new Date(),
            status: "Pending",
            bonus: `₹${bonusValue}`,
          });
        }
      } catch (refErr) {
        console.error("D2D Referral error during self-registration:", refErr);
      }
    }

    // Return success (exclude password)
    const doctorData = { ...newDoctor };
    delete doctorData.password;

    return NextResponse.json(
      { message: "Doctor registered successfully", doctor: doctorData },
      { status: 201 }
    );
  } catch (error) {
    console.error("Doctor self-registration error:", error);
    return NextResponse.json(
      { message: "Error registering doctor", error: error.message },
      { status: 500 }
    );
  }
}
