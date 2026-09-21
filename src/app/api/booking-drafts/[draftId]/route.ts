import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db/mongoose'
import BookingDraft from '@/models/BookingDraft'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  await connectDb()
  const { draftId } = await params
  const draft = await BookingDraft.findById(draftId).lean()

  if (!draft) {
    return NextResponse.json(
      { error: 'Draft not found or expired' },
      { status: 404 }
    )
  }

  if (draft.usedAt) {
    return NextResponse.json(
      { error: 'Draft already used', bookingId: draft.bookingId },
      { status: 409 }
    )
  }

  return NextResponse.json(draft)
}