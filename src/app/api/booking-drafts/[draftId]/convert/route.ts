import { NextRequest, NextResponse } from 'next/server'
import { connectDb } from '@/lib/db/mongoose'
import BookingDraft from '@/models/BookingDraft'
import { authorize } from '@/lib/auth/rbac'
import { createPendingBooking } from '@/modules/bookings/services/booking.service'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const claims = authorize(req, ["CUSTOMER"])

    await connectDb()

    const { draftId } = await params
    const draft = await BookingDraft.findById(draftId)
    if (!draft) {
      return NextResponse.json(
        { error: 'Draft not found or expired' },
        { status: 404 }
      )
    }

    if (draft.usedAt && draft.bookingId) {
      return NextResponse.json(
        { bookingId: draft.bookingId, alreadyConverted: true, ownerUserId: draft.userId ?? null },
        { status: 409 }
      )
    }

    const booking = await createPendingBooking({
      userId: claims.sub,
      roomId: draft.roomId,
      arrivalDate: new Date(draft.arrivalDate),
      nights: draft.nights,
      pricingPlan: draft.pricingPlan as "BED_ONLY" | "BED_BREAKFAST",
      guests: { adults: draft.adults, children: draft.children },
      guest: {
        fullName: draft.guestInfo.fullName,
        email: draft.guestInfo.email,
        phone: draft.guestInfo.phone,
        identityDocumentUrl: draft.guestInfo.identityDocumentUrl,
        privacyAccepted: true,
      },
      idempotencyKey: crypto.randomUUID(),
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Failed to create booking from draft' },
        { status: 500 }
      )
    }

    draft.usedAt = new Date()
    draft.userId = claims.sub
    draft.bookingId = String(booking._id)
    await draft.save()

    return NextResponse.json(
      { bookingId: String(booking._id) },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Conversion failed'

    if (message.includes('already booked')) {
      const { draftId: id } = await params
      const currentDraft = await BookingDraft.findById(id).lean()
      return NextResponse.json(
        {
          error: message,
          alreadyConverted: true,
          bookingId: currentDraft?.bookingId ?? null,
          ownerUserId: currentDraft?.userId ?? null,
        },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: message }, { status: 400 })
  }
}