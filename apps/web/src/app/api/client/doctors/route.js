import _db from "@repo/lib/db";
import DoctorModel from "@repo/lib/models/Vendor/Docters.model";

await _db();

export const GET = async () => {
  try {
    const doctors = await DoctorModel.find({ status: "Approved" }).select("-password");

    return Response.json(doctors, { status: 200 });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    return Response.json(
      { message: "Error fetching doctors", error: error.message },
      { status: 500 }
    );
  }
};
