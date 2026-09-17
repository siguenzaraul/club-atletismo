import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { ensureStandardSizes } from '../lib/equipment'

/**
 * Seeds a fresh database with an admin user, demo content and a sample member.
 * Idempotent: if an admin user already exists it bails out without touching data.
 * Run with: pnpm seed
 */
const seed = async (): Promise<void> => {
  const payload = await getPayload({ config: await config })

  const existing = await payload.count({ collection: 'users' })
  if (existing.totalDocs > 0) {
    payload.logger.info('La base de datos ya tiene usuarios — seed omitido.')
    process.exit(0)
  }

  payload.logger.info('Sembrando datos de ejemplo…')

  await payload.create({
    collection: 'users',
    data: {
      name: 'Administrador ABTR',
      email: 'admin@abtr.run',
      password: 'changeme123',
      roles: ['admin'],
    },
  })

  await payload.updateGlobal({
    slug: 'home-page',
    data: {
      heroEyebrow: 'Albatera · Alicante',
      heroTitle: 'Club de Running Albatera',
      heroSubtitle: 'Un objetivo, un municipio, un deporte.',
      heroShowBrandPattern: true,
      heroTheme: 'dark',
      heroOverlay: 'medium',
      heroAlign: 'left',
      heroHeight: 'medium',
      heroPrimaryLabel: 'Hazte socio',
      heroPrimaryHref: '/hazte-socio',
      heroSecondaryLabel: 'Próximos eventos',
      heroSecondaryHref: '/eventos',
      aboutTitle: 'Sobre el club',
      aboutBody: {
        root: {
          type: 'root',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          children: [
            {
              type: 'paragraph',
              format: '',
              indent: 0,
              version: 1,
              direction: 'ltr',
              children: [
                {
                  type: 'text',
                  text: 'El Club de Running Albatera (ABTR) nació para llevar el atletismo popular a cada rincón del municipio. Organizamos la ALBATERUN, Social Runs y entrenamientos de club abiertos a todos los niveles.',
                  format: 0,
                  style: '',
                  mode: 'normal',
                  detail: 0,
                  version: 1,
                },
              ],
            },
          ],
        },
      },
    },
  })

  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      email: 'hola@abtr.run',
      phone: '+34 600 000 000',
      address: 'Albatera, Alicante',
      instagram: 'https://instagram.com/abtr',
    },
  })

  // Temporada actual
  const season = await payload.create({
    collection: 'seasons',
    data: {
      name: '2025/2026',
      slug: '2025-2026',
      isCurrent: true,
      startDate: new Date('2025-09-01').toISOString(),
      endDate: new Date('2026-08-31').toISOString(),
    },
  })

  // Tipos de socio (de pago y de no pago)
  const tipoAdulto = await payload.create({
    collection: 'membership-types',
    data: {
      name: 'Adulto',
      slug: 'adulto',
      requiresPayment: true,
      amount: 30,
      period: 'temporada',
      includes: 'Equipación oficial\nDescuento en la ALBATERUN\nSocial Runs gratis',
      showOnWebsite: true,
      order: 0,
    },
  })
  await payload.create({
    collection: 'membership-types',
    data: {
      name: 'Infantil',
      slug: 'infantil',
      requiresPayment: true,
      amount: 15,
      period: 'temporada',
      includes: 'Camiseta del club\nEntrenamientos de la escuela',
      showOnWebsite: true,
      order: 1,
    },
  })
  await payload.create({
    collection: 'membership-types',
    data: {
      name: 'Honorífico',
      slug: 'honorifico',
      requiresPayment: false,
      includes: 'Socio de honor, sin cuota.',
      showOnWebsite: false,
      order: 2,
    },
  })

  // Equipación: escala de tallas + tallas. `ensureStandardSizes` siembra XS→4XL y es
  // idempotente, así que reconoce lo que ya hubiera en vez de duplicarlo.
  const { scaleId: escalaRopaId } = await ensureStandardSizes(payload)
  const tallasRes = await payload.find({
    collection: 'sizes',
    where: { scale: { equals: escalaRopaId } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  const tallas: Record<string, number> = Object.fromEntries(
    tallasRes.docs.map((t) => [t.label, t.id]),
  )

  // Tipos de prenda: dentro de cada uno, el socio elige UNA prenda.
  const parteArriba = await payload.create({
    collection: 'equipment-categories',
    data: { name: 'Parte de arriba', publicLabel: '¿Qué camiseta quieres?', order: 0 },
  })
  const parteAbajo = await payload.create({
    collection: 'equipment-categories',
    data: { name: 'Parte de abajo', publicLabel: '¿Qué prenda de abajo quieres?', order: 1 },
  })

  // Catálogo de equipación: los subtipos SON artículos, agrupados por tipo de prenda.
  const camiseta = await payload.create({
    collection: 'equipment-items',
    data: {
      name: 'Camiseta oficial',
      slug: 'camiseta-oficial',
      sizeScale: escalaRopaId,
      category: parteArriba.id,
      order: 0,
    },
  })
  await payload.create({
    collection: 'equipment-items',
    data: {
      name: 'Camiseta de tirantes',
      slug: 'camiseta-tirantes',
      sizeScale: escalaRopaId,
      category: parteArriba.id,
      order: 1,
    },
  })
  await payload.create({
    collection: 'equipment-items',
    data: {
      name: 'Pantalón corto',
      slug: 'pantalon-corto',
      sizeScale: escalaRopaId,
      category: parteAbajo.id,
      order: 0,
    },
  })
  await payload.create({
    collection: 'equipment-items',
    data: {
      name: 'Malla larga',
      slug: 'malla-larga',
      sizeScale: escalaRopaId,
      category: parteAbajo.id,
      order: 1,
    },
  })

  // El alta pregunta por la equipación. En producción esto nace vacío a propósito: el
  // formulario no cambia hasta que el club lo configura.
  await payload.updateGlobal({
    slug: 'registration-form',
    data: {
      garments: [
        { category: parteArriba.id, enabled: true, required: true, askSize: true },
        { category: parteAbajo.id, enabled: true, required: false, askSize: true },
      ],
    },
  })

  // Stock inicial de camisetas talla M
  await payload.create({
    collection: 'equipment-stock',
    data: { item: camiseta.id, size: tallas['M'], season: season.id, quantityTotal: 20 },
  })

  // Campos a medida de ejemplo (el club puede crear los que quiera)
  const defZapatilla = await payload.create({
    collection: 'attribute-definitions',
    data: { label: 'Talla de zapatilla', slug: 'talla-zapatilla', type: 'text', group: 'Equipación', visibleToMember: true, editableByMember: true, order: 0 },
  })
  await payload.create({
    collection: 'attribute-definitions',
    data: { label: 'Alergias', slug: 'alergias', type: 'longtext', group: 'Salud', visibleToMember: true, editableByMember: true, order: 1 },
  })
  await payload.create({
    collection: 'attribute-definitions',
    data: { label: 'Contacto de emergencia', slug: 'contacto-emergencia', type: 'text', group: 'Salud', visibleToMember: true, editableByMember: true, order: 2 },
  })
  await payload.create({
    collection: 'attribute-definitions',
    data: { label: 'Consentimiento de imagen', slug: 'consentimiento-imagen', type: 'boolean', group: 'Administrativo', visibleToMember: true, editableByMember: false, order: 3 },
  })

  // Sponsors
  const sponsorPrincipal = await payload.create({
    collection: 'sponsors',
    data: { name: 'Ayuntamiento de Albatera', tier: 'principal', global: true },
  })
  const sponsorOro = await payload.create({
    collection: 'sponsors',
    data: { name: 'VegaFruit', tier: 'oro', mainRaceSponsor: true },
  })
  const sponsorPlata = await payload.create({
    collection: 'sponsors',
    data: { name: 'Clínica Albatera', tier: 'plata', clubSponsor: true },
  })
  const sponsorBronce = await payload.create({
    collection: 'sponsors',
    data: { name: 'Talleres Vega Baja', tier: 'bronce', mainRaceSponsor: true },
  })
  const sponsorColab = await payload.create({
    collection: 'sponsors',
    data: { name: 'Deportes Bigastro', tier: 'colaborador', clubSponsor: true },
  })

  // Events
  const albaterun = await payload.create({
    collection: 'events',
    data: {
      title: 'ALBATERUN 2026',
      slug: 'albaterun-2026',
      series: 'carrera-principal',
      date: new Date('2026-10-04T09:00:00').toISOString(),
      location: 'Albatera, Alicante',
      registrationOpen: true,
      categories: ['senior', 'master', 'popular'],
      sponsors: [sponsorPrincipal.id, sponsorOro.id, sponsorBronce.id],
    },
  })
  await payload.create({
    collection: 'events',
    data: {
      title: 'Social Run de primavera',
      slug: 'social-run-primavera',
      series: 'social-run',
      date: new Date('2026-04-12T18:30:00').toISOString(),
      location: 'Paseo de la huerta',
      registrationOpen: true,
      sponsors: [sponsorPlata.id, sponsorColab.id],
    },
  })
  await payload.create({
    collection: 'events',
    data: {
      title: 'Entrenamiento de club — series',
      slug: 'entreno-series',
      series: 'club',
      date: new Date('2026-03-03T19:00:00').toISOString(),
      location: 'Pista municipal',
      registrationOpen: false,
    },
  })

  // Team
  for (const [i, t] of [
    { name: 'María López', role: 'Entrenadora' },
    { name: 'Juan Martínez', role: 'Presidente' },
    { name: 'Sara Gómez', role: 'Atleta destacada' },
  ].entries()) {
    await payload.create({ collection: 'team', data: { ...t, order: i } })
  }

  // Posts
  await payload.create({
    collection: 'posts',
    data: {
      title: 'Abrimos inscripciones de la ALBATERUN 2026',
      slug: 'inscripciones-albaterun-2026',
      excerpt: 'Ya puedes inscribirte en la carrera principal del club.',
      status: 'published',
      publishedAt: new Date('2026-06-01').toISOString(),
    },
  })

  // Member (socio)
  const member = await payload.create({
    collection: 'members',
    data: {
      name: 'Socio de prueba',
      email: 'socio@abtr.run',
      phone: '+34 600 000 001',
      password: 'changeme123',
      category: 'senior',
      membershipStatus: 'active',
      imageRightsAccepted: true,
    },
  })

  // Cuota de la temporada actual (pagada) — el hook actualiza el estado del socio
  await payload.create({
    collection: 'memberships',
    data: {
      member: member.id,
      season: season.id,
      type: tipoAdulto.id,
      paymentStatus: 'paid',
      paidAt: new Date('2025-09-10').toISOString(),
      amount: 30,
    },
  })

  // Un valor de ejemplo para un campo a medida
  await payload.create({
    collection: 'member-attributes',
    data: { member: member.id, definition: defZapatilla.id, valueText: '42' },
  })

  // Entrega de una camiseta talla M al socio (el hook descuenta stock: quedan 19)
  await payload.create({
    collection: 'equipment-deliveries',
    data: {
      member: member.id,
      season: season.id,
      item: camiseta.id,
      size: tallas['M'],
      quantity: 1,
      status: 'delivered',
      payment: 'included',
    },
  })

  // Result linked to that member
  await payload.create({
    collection: 'results',
    data: {
      event: albaterun.id,
      member: member.id,
      athleteName: 'Socio de prueba',
      position: 12,
      mark: '00:42:15',
      category: 'senior',
    },
  })

  payload.logger.info('Seed completado. Admin: admin@abtr.run / changeme123 — Socio: socio@abtr.run / changeme123')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
