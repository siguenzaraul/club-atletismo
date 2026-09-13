import { describe, expect, it } from 'vitest'

import {
  DEFAULT_REGISTER_CONFIG,
  hasErrors,
  validateRegister,
  type RegisterFormConfig,
} from '@/lib/validation/register'

const valid = {
  name: 'Ana Pérez',
  email: 'ana@ejemplo.com',
  phone: '600000000',
  password: 'unaclavelarga',
  passwordConfirm: 'unaclavelarga',
  imageRightsAccepted: true,
}

const config = (overrides: Partial<RegisterFormConfig> = {}): RegisterFormConfig => ({
  ...DEFAULT_REGISTER_CONFIG,
  ...overrides,
})

describe('validateRegister con configuración', () => {
  it('el default reproduce el comportamiento de siempre', () => {
    // Si este test hay que cambiarlo, es que el default ha dejado de ser retrocompatible.
    expect(validateRegister({ ...valid, phone: '' }).phone).toBeDefined()
    expect(hasErrors(validateRegister(valid))).toBe(false)
  })

  describe('teléfono', () => {
    it('deshabilitado: no se valida aunque venga vacío', () => {
      const errors = validateRegister(
        { ...valid, phone: '' },
        config({ phone: { enabled: false, required: false } }),
      )
      expect(errors.phone).toBeUndefined()
    })

    it('opcional y vacío: sin error', () => {
      const errors = validateRegister(
        { ...valid, phone: '' },
        config({ phone: { enabled: true, required: false } }),
      )
      expect(errors.phone).toBeUndefined()
    })

    it('opcional pero escrito a medias: sí avisa', () => {
      const errors = validateRegister(
        { ...valid, phone: '600' },
        config({ phone: { enabled: true, required: false } }),
      )
      expect(errors.phone).toBeDefined()
    })
  })

  describe('tipo de cuota', () => {
    it('obligatorio y sin elegir: error', () => {
      const errors = validateRegister(
        valid,
        config({ membershipType: { enabled: true, required: true } }),
      )
      expect(errors.membershipType).toBe('Elige un tipo de cuota.')
    })

    it('obligatorio y elegido: sin error', () => {
      const errors = validateRegister(
        { ...valid, membershipType: '3' },
        config({ membershipType: { enabled: true, required: true } }),
      )
      expect(errors.membershipType).toBeUndefined()
    })

    it('opcional: nunca da error', () => {
      expect(validateRegister(valid, config()).membershipType).toBeUndefined()
    })
  })

  describe('equipación', () => {
    const arriba = { key: 'arriba', label: 'Parte de arriba', required: true, askSize: true }

    it('prenda obligatoria sin elegir', () => {
      const errors = validateRegister(valid, config({ garments: [arriba] }))
      expect(errors['garment:arriba']).toBe('Elige tu parte de arriba.')
    })

    it('prenda elegida sin talla', () => {
      const errors = validateRegister(
        { ...valid, garments: { arriba: { itemId: '5' } } },
        config({ garments: [arriba] }),
      )
      expect(errors['size:arriba']).toBe('Elige la talla.')
      expect(errors['garment:arriba']).toBeUndefined()
    })

    it('prenda y talla elegidas: sin errores', () => {
      const errors = validateRegister(
        { ...valid, garments: { arriba: { itemId: '5', sizeId: '2' } } },
        config({ garments: [arriba] }),
      )
      expect(hasErrors(errors)).toBe(false)
    })

    it('si no se pide talla, no se exige', () => {
      const errors = validateRegister(
        { ...valid, garments: { arriba: { itemId: '5' } } },
        config({ garments: [{ ...arriba, askSize: false }] }),
      )
      expect(hasErrors(errors)).toBe(false)
    })

    it('prenda opcional sin elegir: sin error', () => {
      const errors = validateRegister(valid, config({ garments: [{ ...arriba, required: false }] }))
      expect(hasErrors(errors)).toBe(false)
    })

    it('prenda opcional pero elegida sí exige talla', () => {
      const errors = validateRegister(
        { ...valid, garments: { arriba: { itemId: '5' } } },
        config({ garments: [{ ...arriba, required: false }] }),
      )
      expect(errors['size:arriba']).toBeDefined()
    })

    it('acumula errores de varios tipos de prenda', () => {
      const errors = validateRegister(
        valid,
        config({
          garments: [arriba, { key: 'abajo', label: 'Parte de abajo', required: true, askSize: true }],
        }),
      )
      expect(Object.keys(errors).sort()).toEqual(['garment:abajo', 'garment:arriba'])
    })
  })
})
