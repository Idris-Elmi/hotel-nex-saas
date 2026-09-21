import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db/mongoose'
import BookingDraft from '@/models/BookingDraft'

export async function POST(req: NextRequest) {
  await connectDb()
  const body = await req.json()

  const { roomId, arrivalDate, nights, pricingPlan, guestInfo } = body
  if (!roomId || !arrivalDate || !nights || !pricingPlan || !guestInfo?.email) {
    return NextResponse.json(
      { error: 'Missing required booking fields' },
      { status: 400 }
    )
  }

  const draft = await BookingDraft.create(body)
  return NextResponse.json({ draftId: draft._id.toString() }, { status: 201 })
}