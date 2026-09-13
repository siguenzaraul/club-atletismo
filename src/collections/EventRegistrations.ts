import type { Access, CollectionAfterChangeHook, CollectionConfig } from 'payload'

import { isAdminOrEditor, isAdminOrEditorFieldLevel, adminOrOwn } from '../access'
import {
  getEmailFooter,
  registrationConfirmedEmail,
  sendEmailAfterResponse,
} from '../lib/email'
import { MEMBER_CATEGORIES } from './Members'

// Any authenticated user (staff or member) may register; members get linked automatically.
const canCreate: Access = ({ req: { user } }) => Boolean(user)

/**
 * Correo de confirmación de inscripción.
 *
 * Va en un hook y no en la server action porque las inscripciones se crean desde TRES sitios:
 * `inscribeAction`, `registerAction` (alta con ?evento=) y el panel de administración. El hook
 * es el punto de estrangulamiento único, imposible de olvidar al añadir un cuarto camino.
 */
const sendRegistrationEmail: CollectionAfterChangeHook = async ({ doc, req, operation, context }) => {
  if (operation !== 'create') return
  if (context?.skipRegistrationEmail) return

  const payload = req.payload
  try {
    const memberId = doc.member && typeof doc.member === 'object' ? doc.member.id : doc.member
    const eventId = doc.event && typeof doc.event === 'object' ? doc.event.id : doc.event
    if (!memberId || !eventId) return

    const [member, event, footer] = await Promise.all([
      payload.findByID({ collection: 'members', id: memberId, depth: 0, req, overrideAccess: true }),
      payload.findByID({ collection: 'events', id: eventId, depth: 0, req, overrideAccess: true }),
      // `req` también aquí: este hook corre dentro de la transacción del create.
      getEmailFooter(payload, req),
    ])
    if (!member?.email || !event) return

    const content = registrationConfirmedEmail({
      name: member.name,
      eventTitle: event.title,
      eventDate: event.date,
      eventLocation: event.location,
      eventSlug: event.slug,
      footer,
    })
    await sendEmailAfterResponse(payload, {
      to: member.email,
      replyTo: footer.email ?? undefined,
      ...content,
    })
  } catch (err) {
    // Un fallo aquí nunca puede tumbar la inscripción.
    payload.logger.error({ err }, 'sendRegistrationEmail failed')
  }
}

export const EventRegistrations: CollectionConfig = {
  slug: 'event-registrations',
  labels: { singular: 'Inscripción', plural: 'Inscripciones' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['event', 'member', 'category', 'status'],
    group: 'Club',
  },
  access: {
    create: canCreate,
    read: adminOrOwn('member'),
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  // Prevents duplicate registrations at the DB level (closes the find+create race).
  indexes: [{ fields: ['event', 'member'], unique: true }],
  hooks: {
    beforeChange: [
      ({ req, data, operation }) => {
        // Stamp the logged-in member as the owner on creation.
        if (operation === 'create' && req.user?.collection === 'members') {
          return { ...data, member: req.user.id }
        }
        return data
      },
    ],
    afterChange: [sendRegistrationEmail],
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      label: 'Evento',
      required: true,
    },
    {
      name: 'member',
      type: 'relationship',
      relationTo: 'members',
      label: 'Socio',
    },
    {
      name: 'category',
      type: 'select',
      label: 'Categoría',
      options: [...MEMBER_CATEGORIES],
    },
    {
      name: 'status',
      type: 'select',
      label: 'Estado',
      defaultValue: 'pending',
      access: { update: isAdminOrEditorFieldLevel },
      options: [
        { label: 'Pendiente', value: 'pending' },
        { label: 'Confirmada', value: 'confirmed' },
        { label: 'Cancelada', value: 'cancelled' },
      ],
    },
  ],
}
