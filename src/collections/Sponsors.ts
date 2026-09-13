import type { CollectionConfig } from 'payload'

import { anyone, isAdminOrEditor } from '../access'

/**
 * Los cinco `value` son el enum nativo de Postgres y **no se tocan**: cambiarlos exigiría un
 * `ALTER TYPE … ADD VALUE`, irreversible en el `down()` de la migración.
 *
 * El club trabaja con tres niveles. Los otros dos siguen existiendo para los patrocinadores que
 * ya los tienen: se pueden seguir guardando y editando, y en la web se pliegan al nivel vigente
 * (ver `displayTier` en src/lib/sponsors.ts). Sólo cambian las etiquetas.
 */
export const SPONSOR_TIERS = [
  { label: 'Principal', value: 'principal' },
  { label: 'Patrocinador', value: 'oro' },
  { label: 'Plata (en desuso)', value: 'plata' },
  { label: 'Bronce (en desuso)', value: 'bronce' },
  { label: 'Colaborador', value: 'colaborador' },
] as const

/** Los tres niveles que el club usa hoy. Los otros dos sólo sobreviven en datos antiguos. */
export const VISIBLE_SPONSOR_TIERS = ['principal', 'oro', 'colaborador'] as const

/** Patrocinadores. Reused across the site via the SponsorsBlock component. */
export const Sponsors: CollectionConfig = {
  slug: 'sponsors',
  labels: { singular: 'Patrocinador', plural: 'Patrocinadores' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'tier', 'order', 'active', 'global', 'clubSponsor', 'mainRaceSponsor'],
    group: 'Club',
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  fields: [
    { name: 'name', type: 'text', label: 'Nombre', required: true },
    { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo' },
    { name: 'url', type: 'text', label: 'Web (URL)' },
    {
      name: 'tier',
      type: 'select',
      label: 'Nivel',
      // Las cinco opciones siguen aquí: Payload valida contra las opciones FILTRADAS, así que
      // recortar este array dejaría a un patrocinador «plata» sin poder guardarse desde el panel.
      options: [...SPONSOR_TIERS],
      defaultValue: 'colaborador',
      required: true,
      // Recorta el DESPLEGABLE del panel a los tres niveles vigentes, más el que ya tenga el
      // documento para que un «plata» heredado siga pudiendo guardarse. No es una validación:
      // ahí `siblingData` son los datos entrantes, así que el valor que se está guardando
      // siempre pasa el filtro. El enum de Postgres sigue teniendo los cinco valores.
      //
      // Devuelve las opciones completas para respetar el tipo declarado (`Option[]`). Las
      // etiquetas no dependen de esto: el panel las formatea desde `options` y sólo usa este
      // resultado como predicado de coincidencia por `value`.
      filterOptions: ({ siblingData }) => {
        const current = (siblingData as { tier?: string } | undefined)?.tier
        return SPONSOR_TIERS.filter(
          (o) =>
            (VISIBLE_SPONSOR_TIERS as readonly string[]).includes(o.value) || o.value === current,
        ).map((o) => ({ ...o }))
      },
      admin: {
        description:
          'Principal: en toda la web. Patrocinador: portada y listado. Colaborador: listado.',
      },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Orden',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Menor = antes, dentro de su nivel.' },
    },
    {
      name: 'active',
      type: 'checkbox',
      label: 'Activo',
      // `DEFAULT true` rellena las filas existentes: ningún patrocinador se apaga al desplegar.
      defaultValue: true,
      admin: { position: 'sidebar', description: 'Desmárcalo para retirarlo sin borrarlo.' },
    },
    {
      type: 'collapsible',
      label: 'Dónde aparece',
      admin: {
        initCollapsed: false,
        description:
          '«En toda la web» ya incluye el resto. Los otros dos añaden sitios concretos. Y además puedes asignar este patrocinador a carreras sueltas desde la ficha del evento.',
      },
      fields: [
        {
          name: 'global',
          type: 'checkbox',
          label: 'En toda la web',
          defaultValue: false,
          admin: {
            description: 'Pie de página, portada, carreras y listado de patrocinadores.',
          },
        },
        {
          name: 'clubSponsor',
          type: 'checkbox',
          label: 'En la portada',
          defaultValue: false,
          admin: { description: 'Bloque «Patrocinadores del club» de la página de inicio.' },
        },
        {
          name: 'mainRaceSponsor',
          type: 'checkbox',
          label: 'En la próxima carrera principal',
          defaultValue: false,
          admin: {
            description:
              'Se muestra automáticamente en la próxima carrera principal activa (ALBATERUN).',
          },
        },
      ],
    },
  ],
}
