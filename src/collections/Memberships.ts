import type { CollectionConfig } from 'payload'

import { adminOrOwn, isAdmin, isAdminOrEditor } from '../access'
import { paymentToMemberStatus } from '../lib/membership'

export const PAYMENT_STATUSES = [
  { label: 'Pendiente', value: 'pending' },
  { label: 'Pagada', value: 'paid' },
  { label: 'Exenta (socio de no pago)', value: 'exempt' },
  { label: 'Anulada', value: 'cancelled' },
] as const

/** Alta de un socio en una temporada, con su tipo y estado de cuota. Histórico por temporada. */
export const Memberships: CollectionConfig = {
  slug: 'memberships',
  labels: { singular: 'Cuota', plural: 'Cuotas' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['member', 'season', 'type', 'paymentStatus', 'paymentReportedAt', 'paidAt'],
    group: 'Club',
  },
  access: {
    read: adminOrOwn('member'),
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  indexes: [{ fields: ['member', 'season'], unique: true }],
  fields: [
    { name: 'member', type: 'relationship', relationTo: 'members', label: 'Socio', required: true },
    { name: 'season', type: 'relationship', relationTo: 'seasons', label: 'Temporada', required: true },
    { name: 'type', type: 'relationship', relationTo: 'membership-types', label: 'Tipo de socio' },
    {
      name: 'paymentStatus',
      type: 'select',
      label: 'Estado de la cuota',
      defaultValue: 'pending',
      options: [...PAYMENT_STATUSES],
    },
    {
      name: 'paidAt',
      type: 'date',
      label: 'Pagada el',
      admin: { condition: (data) => data?.paymentStatus === 'paid' },
    },
    {
      name: 'paymentReportedAt',
      type: 'date',
      label: 'El socio avisó del ingreso el',
      admin: {
        readOnly: true,
        description:
          'Lo marca el propio socio desde su zona («Ya he hecho el ingreso»). Sigue pendiente hasta que el club lo confirme aquí.',
      },
    },
    { name: 'amount', type: 'number', label: 'Importe cobrado (€)', min: 0 },
    { name: 'notes', type: 'textarea', label: 'Notas' },
  ],
  hooks: {
    // Mirror the current-season membership onto the member for fast columns/filters.
    afterChange: [
      async ({ doc, req }) => {
        const memberId = typeof doc.member === 'object' ? doc.member?.id : doc.member
        const seasonId = typeof doc.season === 'object' ? doc.season?.id : doc.season
        if (!memberId || !seasonId) return
        // `req` es obligatorio en ambas: en Postgres este hook corre DENTRO de la transacción
        // del create, que ya mantiene un bloqueo sobre la fila del socio por la clave ajena.
        // Sin `req`, el update pide otra conexión, espera ese bloqueo y la transacción espera
        // al update: deadlock. Colgaba el alta entera hasta el timeout de la función.
        const season = await req.payload.findByID({
          collection: 'seasons',
          id: seasonId,
          overrideAccess: true,
          depth: 0,
          req,
        })
        if (!season?.isCurrent) return
        const typeId = typeof doc.type === 'object' ? doc.type?.id : doc.type
        await req.payload.update({
          collection: 'members',
          id: memberId,
          data: {
            currentMembershipType: typeId ?? null,
            membershipStatus: paymentToMemberStatus(doc.paymentStatus),
          },
          overrideAccess: true,
          req,
        })
      },
    ],
  },
}
