import { describe, expect, it } from 'vitest'

import { DEFAULT_CLUB_IBAN, formatIban, paymentConcept } from '@/lib/payments'

describe('formatIban', () => {
  it('agrupa de cuatro en cuatro', () => {
    expect(formatIban(DEFAULT_CLUB_IBAN)).toBe('ES49 3005 0050 0530 3295 0226')
  })

  it('normaliza lo que teclee el club: espacios sueltos y minúsculas', () => {
    expect(formatIban(' es49 30050050053032950226 ')).toBe('ES49 3005 0050 0530 3295 0226')
  })

  it('no deja espacio final cuando la longitud no es múltiplo de cuatro', () => {
    expect(formatIban('ES4930050')).toBe('ES49 3005 0')
  })
})

describe('paymentConcept', () => {
  it('lleva temporada y nombre: el club identifica el ingreso por aquí', () => {
    expect(paymentConcept('Ana Pérez', '2025/26')).toBe('Cuota 2025/26 Ana Pérez')
  })

  it('aguanta sin temporada y sin nombre', () => {
    expect(paymentConcept('Ana Pérez')).toBe('Cuota Ana Pérez')
    expect(paymentConcept('  ', null)).toBe('Cuota')
  })
})
