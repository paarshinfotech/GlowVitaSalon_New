import { NextResponse } from 'next/server';
import SuperDataModel from '@repo/lib/models/admin/SuperData.model';
import _db from '@repo/lib/db';

await _db();

/**
 * Public endpoint — no auth required.
 * Returns specialization, subSpecialization and disease items.
 */
export async function GET() {
  try {
    const data = await SuperDataModel.find({
      type: { $in: ['specialization', 'subSpecialization', 'disease'] },
    }).sort({ orderIndex: 1, name: 1 }).lean();

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching doctor superdata:', error);
    return NextResponse.json(
      { message: 'Error fetching data', error: error.message },
      { status: 500 }
    );
  }
}
