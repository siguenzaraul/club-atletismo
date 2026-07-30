import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'

export const CONTACT_SUBJECTS = [
  { label: 'Consulta general', value: 'general' },
  { label: 'Inscripciones', value: 'inscripciones' },
  { label: 'Patrocinio', value: 'patrocinio' },
  { label: 'Socios', value: 'socios' },
] as const

/** Mensajes del formulario de contacto público. Bandeja en el admin. */
export const ContactMessages: CollectionConfig = {
  slug: 'contact-messages',
  labels: { singular: 'Mensaje', plural: 'Mensajes de contacto' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'subject', 'handled', 'createdAt'],
    group: 'Administración',
  },
  access: {
    create: anyone,
    read: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text', label: 'Nombre', required: true },
    { name: 'email', type: 'email', label: 'Email', required: true },
    { name: 'subject', type: 'select', label: 'Asunto', defaultValue: 'general', options: [...CONTACT_SUBJECTS] },
    { name: 'message', type: 'textarea', label: 'Mensaje', required: true },
    { name: 'handled', type: 'checkbox', label: 'Atendido', defaultValue: false, admin: { position: 'sidebar' } },
  ],
}
