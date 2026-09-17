import type {
  CheckboxFieldValidation,
  CollectionBeforeChangeHook,
  CollectionConfig,
  TextFieldValidation,
} from 'payload'

import { anyone, isAdmin, isAdminOrEditorFieldLevel, adminOrOwn } from '../access'
import { MEMBER_TOKEN_EXPIRATION } from '../lib/auth-config'
import { cascadeDelete, detachRefs } from '../lib/cascade'
import { parseMarkToSeconds } from '../lib/marks'
import { slugify } from '../lib/slugify'

export const MEMBER_CATEGORIES = [
  { label: 'Sub-18', value: 'sub18' },
  { label: 'Senior', value: 'senior' },
  { label: 'Máster', value: 'master' },
  { label: 'Popular', value: 'popular' },
] as const

const validateNewMemberPhone: TextFieldValidation = (value, { operation, previousValue }) => {
  const valid = typeof value === 'string' && value.replace(/\D/g, '').length >= 9
  if (operation === 'create' && !valid) return 'El teléfono móvil es obligatorio.'
  if (operation === 'update' && previousValue && !valid) {
    return 'El teléfono móvil no se puede dejar vacío.'
  }
  return true
}

const validateImageRights: CheckboxFieldValidation = (value, { operation, previousValue }) => {
  if (operation === 'create' && value !== true) {
    return 'Es obligatorio aceptar los derechos de imagen.'
  }
  if (operation === 'update' && previousValue === true && value !== true) {
    return 'La aceptación no se puede desmarcar desde la ficha.'
  }
  return true
}

/** Sella la fecha la primera vez que se aceptan los derechos de imagen. */
const sealImageRightsAcceptedAt: CollectionBeforeChangeHook = ({ data }) => {
  if (data.imageRightsAccepted === true && !data.imageRightsAcceptedAt) {
    return { ...data, imageRightsAcceptedAt: new Date().toISOString() }
  }
  return data
}

/** Normaliza a segundos las marcas introducidas a mano, para poder compararlas. */
const computePersonalBestSeconds: CollectionBeforeChangeHook = ({ data }) => {
  if (!Array.isArray(data.personalBests)) return data
  return {
    ...data,
    personalBests: data.personalBests.map((row: { mark?: string | null }) => ({
      ...row,
      markSeconds: parseMarkToSeconds(row?.mark),
    })),
  }
}

/**
 * Asigna el slug público sólo al publicar la ficha, nunca de forma masiva.
 *
 * Deliberadamente NO se usa `slugField('name')`: su `beforeValidate` generaría slug para todos
 * los socios en su siguiente guardado y dos homónimos reventarían el índice único con un 500
 * en /socios/perfil. El índice único queda sólo como red de seguridad ante una carrera.
 */
const assignPublicSlug: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const publish = data.publicProfile ?? originalDoc?.publicProfile
  if (publish !== true) return data
  if (data.slug || originalDoc?.slug) return data

  const base = slugify(String(data.name ?? originalDoc?.name ?? '')) || 'atleta'
  let candidate = base

  for (let i = 2; i <= 50; i++) {
    const clash = await req.payload
      .find({
        collection: 'members',
        where: { slug: { equals: candidate } },
        limit: 1,
        depth: 0,
        req,
        overrideAccess: true,
      })
      .catch(() => null)
    if (!clash || clash.totalDocs === 0) break
    candidate = `${base}-${i}`
  }

  return { ...data, slug: candidate }
}

/** Socios. A separate auth collection so members can log into the public members area. */
export const Members: CollectionConfig = {
  slug: 'members',
  labels: { singular: 'Socio', plural: 'Socios' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'category', 'currentMembershipType', 'membershipStatus'],
    listSearchableFields: ['name', 'email', 'federationNumber'],
    group: 'Club',
  },
  // `tokenExpiration` explícito: el default de Payload son 2 h y la cookie de sesión dura 7
  // días. Cuando divergían, el socio volvía con cookie válida y token caducado y acababa en
  // /login sin motivo aparente. Ver src/lib/auth-config.ts.
  auth: { tokenExpiration: MEMBER_TOKEN_EXPIRATION },
  access: {
    // Public self-registration; reads/updates limited to staff or the member themselves.
    create: anyone,
    read: adminOrOwn('id'),
    update: adminOrOwn('id'),
    delete: isAdmin,
    admin: () => false, // members never access the admin panel
  },
  fields: [
    { name: 'name', type: 'text', label: 'Nombre completo', required: true },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Datos',
          fields: [
            {
              name: 'category',
              type: 'select',
              label: 'Categoría deportiva',
              options: [...MEMBER_CATEGORIES],
              defaultValue: 'popular',
            },
            { name: 'federationNumber', type: 'text', label: 'Nº de federación' },
            {
              name: 'phone',
              type: 'text',
              label: 'Teléfono móvil',
              admin: { description: 'Obligatorio para las nuevas altas y el grupo de WhatsApp.' },
              validate: validateNewMemberPhone,
            },
            {
              name: 'imageRightsAccepted',
              type: 'checkbox',
              label: 'Derechos de imagen aceptados',
              defaultValue: false,
              admin: {
                description:
                  'Condición obligatoria para las nuevas altas. Se registra automáticamente la fecha de aceptación.',
              },
              validate: validateImageRights,
            },
            {
              name: 'imageRightsAcceptedAt',
              type: 'date',
              label: 'Fecha de aceptación de derechos de imagen',
              admin: { readOnly: true },
            },
            { name: 'photo', type: 'upload', relationTo: 'media', label: 'Foto' },
          ],
        },
        {
          label: 'Cuotas',
          fields: [
            {
              name: 'currentMembershipType',
              type: 'relationship',
              relationTo: 'membership-types',
              label: 'Tipo de socio (temporada actual)',
              admin: {
                readOnly: true,
                description: 'Se rellena solo desde la cuota de la temporada actual.',
              },
              access: { update: isAdminOrEditorFieldLevel },
            },
            {
              name: 'membershipStatus',
              type: 'select',
              label: 'Estado de la cuota',
              defaultValue: 'pending',
              access: { update: isAdminOrEditorFieldLevel },
              options: [
                { label: 'Pendiente', value: 'pending' },
                { label: 'Al corriente', value: 'active' },
                { label: 'Baja', value: 'inactive' },
              ],
            },
            {
              name: 'memberships',
              type: 'join',
              collection: 'memberships',
              on: 'member',
              label: 'Histórico de cuotas',
            },
          ],
        },
        {
          label: 'Equipación',
          fields: [
            {
              name: 'deliveries',
              type: 'join',
              collection: 'equipment-deliveries',
              on: 'member',
              label: 'Equipación entregada',
            },
          ],
        },
        {
          label: 'Participación',
          fields: [
            {
              name: 'registrations',
              type: 'join',
              collection: 'event-registrations',
              on: 'member',
              label: 'Inscripciones',
            },
            {
              name: 'raceResults',
              type: 'join',
              collection: 'results',
              on: 'member',
              label: 'Resultados y marcas',
            },
          ],
        },
        {
          label: 'Perfil público',
          description:
            'Desactivado por defecto. Sólo se publica lo que aparece en esta pestaña: el email, el teléfono y el nº de federación no se publican nunca.',
          fields: [
            {
              name: 'publicProfile',
              type: 'checkbox',
              label: 'Publicar mi ficha de atleta',
              defaultValue: false,
              admin: {
                description:
                  'Si lo activas, tu nombre, foto, categoría y marcas serán visibles en /atletas.',
              },
            },
            {
              name: 'slug',
              type: 'text',
              label: 'URL pública',
              unique: true,
              index: true,
              admin: {
                readOnly: true,
                description: 'Se genera al publicar la ficha por primera vez y ya no cambia.',
              },
            },
            {
              name: 'publicBio',
              type: 'textarea',
              label: 'Sobre mí',
              maxLength: 500,
              admin: { description: 'Máximo 500 caracteres. Se muestra en tu ficha pública.' },
            },
            {
              name: 'personalBests',
              type: 'array',
              label: 'Marcas personales',
              labels: { singular: 'Marca', plural: 'Marcas' },
              admin: {
                description:
                  'Para carreras ajenas al club. Las de nuestras pruebas se calculan solas a partir de los resultados.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'distanceMeters',
                      type: 'number',
                      label: 'Distancia (m)',
                      required: true,
                      min: 1,
                      admin: { width: '40%', description: '5000, 10000, 21097, 42195…' },
                    },
                    {
                      name: 'mark',
                      type: 'text',
                      label: 'Marca',
                      required: true,
                      admin: { width: '30%', placeholder: '00:42:15' },
                    },
                    {
                      name: 'date',
                      type: 'date',
                      label: 'Fecha',
                      admin: { width: '30%' },
                    },
                  ],
                },
                { name: 'eventName', type: 'text', label: 'Carrera' },
                {
                  name: 'markSeconds',
                  type: 'number',
                  admin: { hidden: true, readOnly: true },
                },
              ],
            },
          ],
        },
        {
          label: 'Personalizados',
          description: 'Campos a medida definidos por el club en Configuración → Campos del socio.',
          fields: [
            {
              name: 'attributes',
              type: 'join',
              collection: 'member-attributes',
              on: 'member',
              label: 'Datos a medida',
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [sealImageRightsAcceptedAt, computePersonalBestSeconds, assignPublicSlug],
    beforeDelete: [
      async ({ id, req }) => {
        // Lo personal se va con el socio: su cuota, sus campos a medida, su equipación y sus
        // inscripciones no significan nada sin él (y borrarlas es lo correcto si alguien pide
        // que se le borre del club).
        await cascadeDelete(req, id, [
          { collection: 'memberships', field: 'member' },
          { collection: 'member-attributes', field: 'member' },
          { collection: 'equipment-deliveries', field: 'member' },
          { collection: 'event-registrations', field: 'member' },
        ])
        // Los resultados NO: son la historia pública de una carrera y `athleteName` es
        // obligatorio, así que la clasificación sigue completa sin el enlace al socio.
        await detachRefs(req, id, [
          { collection: 'results', field: 'member' },
          { collection: 'team', field: 'member' },
        ])
      },
    ],
  },
}
