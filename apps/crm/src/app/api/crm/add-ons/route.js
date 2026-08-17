
import _db from "../../../../../../../packages/lib/src/db.js";
import AddOnModel from '@repo/lib/models/Vendor/AddOn.model';
import { authMiddlewareCrm } from "../../../../middlewareCrm.js";
import mongoose from "mongoose";

await _db();

// GET: List all add-ons for the vendor
export const GET = authMiddlewareCrm(async (req) => {
    const vendorId = req.user.userId.toString();

    const addOns = await AddOnModel.find({ vendor: vendorId }).sort({ createdAt: -1 });

    return Response.json({ addOns });
}, ["vendor", "doctor"]);

// POST: Create a new add-on
export const POST = authMiddlewareCrm(async (req) => {
    const vendorId = req.user.userId.toString();
    const body = await req.json();
    const { name, price, duration, status, services, service } = body;

    // Use services array if provided, otherwise single service
    const servicesToMap = services || (service ? [service] : []);

    if (!name || price === undefined || duration === undefined || servicesToMap.length === 0) {
        return Response.json(
            { message: "Name, price, duration, and at least one service are required" },
            { status: 400 }
        );
    }

    try {
        const addOn = await AddOnModel.create({
            vendor: vendorId,
            services: servicesToMap.map(id => new mongoose.Types.ObjectId(id)),
            name,
            price,
            duration,
            status: status || "active",
        });


        return Response.json({ message: "Add-on created successfully", addOn }, { status: 201 });
    } catch (error) {
        console.error("POST /api/crm/add-ons - Error creating add-on:", error);
        return Response.json({ message: "Failed to create add-on", error: error.message }, { status: 500 });
    }
}, ["vendor", "doctor"]);

// PUT: Update an add-on
export const PUT = authMiddlewareCrm(async (req) => {
    const vendorId = req.user.userId.toString();
    const body = await req.json();
    const { _id, name, price, duration, status, services, service } = body;

    if (!_id) {
        return Response.json({ message: "Add-on ID is required" }, { status: 400 });
    }

    // Use services array if provided, otherwise single service
    const servicesToMap = services || (service ? [service] : undefined);

    try {
        const updateData = {
            name,
            price,
            duration,
            status,
        };

        if (servicesToMap) {
            updateData.services = servicesToMap.map(id => new mongoose.Types.ObjectId(id));
        }

        const addOn = await AddOnModel.findOneAndUpdate(
            { _id, vendor: vendorId },
            { $set: updateData },
            { new: true }
        );

        if (!addOn) {
            return Response.json({ message: "Add-on not found" }, { status: 404 });
        }


        return Response.json({ message: "Add-on updated successfully", addOn });
    } catch (error) {
        console.error("PUT /api/crm/add-ons - Error updating add-on:", error);
        return Response.json({ message: "Failed to update add-on", error: error.message }, { status: 500 });
    }
}, ["vendor", "doctor"]);

// DELETE: Delete an add-on
export const DELETE = authMiddlewareCrm(async (req) => {
    const vendorId = req.user.userId.toString();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
        return Response.json({ message: "Add-on ID is required" }, { status: 400 });
    }

    const addOn = await AddOnModel.findOneAndDelete({ _id: id, vendor: vendorId });

    if (!addOn) {
        return Response.json({ message: "Add-on not found" }, { status: 404 });
    }

    return Response.json({ message: "Add-on deleted successfully" });
}, ["vendor", "doctor"]);
