import type { BasePayload } from 'payload'

/** The season flagged as current, or null if none is set. */
export const getCurrentSeason = async (payload: BasePayload) => {
  const res = await payload.find({
    collection: 'seasons',
    where: { isCurrent: { equals: true } },
    limit: 1,
    overrideAccess: true,
  })
  return res.docs[0] ?? null
}

/** Map a membership payment status to the mirrored member.membershipStatus. */
export const paymentToMemberStatus = (
  paymentStatus: string | null | undefined,
): 'pending' | 'active' | 'inactive' => {
  if (paymentStatus === 'paid' || paymentStatus === 'exempt') return 'active'
  if (paymentStatus === 'cancelled') return 'inactive'
  return 'pending'
}
