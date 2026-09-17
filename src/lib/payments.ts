import type { BasePayload, PayloadRequest } from 'payload'

/**
 * Datos de pago de la cuota: cuenta del club y concepto de la transferencia.
 *
 * El IBAN vive en Ajustes del sitio para que el club pueda cambiarlo sin un deploy, pero con
 * estos valores de respaldo: la fila del global en producción no trae el campo hasta que alguien
 * lo rellena, y ni el correo de bienvenida ni la zona de socio pueden quedarse sin cuenta.
 */
export const DEFAULT_CLUB_IBAN = 'ES4930050050053032950226'
export const DEFAULT_CLUB_ACCOUNT_HOLDER = 'Club de Running Albatera'

export type ClubPaymentInfo = {
  /** IBAN sin espacios, tal y como se guarda. */
  iban: string
  /** El mismo IBAN en grupos de cuatro, para leerlo y teclearlo. */
  formattedIban: string
  holder: string
  /** Instrucciones extra que escriba el club (plazos, pago en mano…). */
  notes: string | null
}

/** Grupos de cuatro, como lo imprime cualquier banco. No valida el IBAN. */
export const formatIban = (iban: string): string =>
  iban
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/(.{4})/g, '$1 ')
    .trim()

/**
 * Concepto de la transferencia. El club identifica el ingreso por aquí y no por el ordenante:
 * muchos socios pagan desde la cuenta de un familiar.
 */
export const paymentConcept = (memberName: string, seasonName?: string | null): string =>
  ['Cuota', seasonName?.trim() || null, memberName.trim() || null].filter(Boolean).join(' ')

/**
 * Cuenta del club desde Ajustes del sitio, con respaldo en las constantes. Nunca lanza.
 *
 * `overrideAccess: true` es necesario: los campos bancarios tienen lectura restringida a staff
 * para no servirlos en `/api/globals/site-settings` al anónimo.
 *
 * Pasa `req` si llamas desde un hook, por lo mismo que `getEmailFooter`: en Postgres el hook
 * corre dentro de la transacción y sin `req` esta consulta toma otra conexión del pool.
 */
export const getClubPaymentInfo = async (
  payload: BasePayload,
  req?: PayloadRequest,
): Promise<ClubPaymentInfo> => {
  let iban = DEFAULT_CLUB_IBAN
  let holder = DEFAULT_CLUB_ACCOUNT_HOLDER
  let notes: string | null = null

  try {
    const settings = (await payload.findGlobal({
      slug: 'site-settings',
      depth: 0,
      overrideAccess: true,
      req,
    })) as { bankIban?: string | null; bankHolder?: string | null; paymentNotes?: string | null }
    iban = settings?.bankIban?.replace(/\s+/g, '').toUpperCase() || iban
    holder = settings?.bankHolder?.trim() || holder
    notes = settings?.paymentNotes?.trim() || null
  } catch {
    // Respaldo: mejor la cuenta de siempre que un correo de bienvenida sin cuenta.
  }

  return { iban, formattedIban: formatIban(iban), holder, notes }
}
