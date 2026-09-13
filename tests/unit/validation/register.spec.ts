import { describe, expect, it } from 'vitest'

import { PASSWORD_MIN, hasErrors, validateRegister } from '@/lib/validation/register'

const valid = {
  name: 'Ana Pérez',
  email: 'ana@ejemplo.com',
  phone: '600000000',
  password: 'unaclavelarga',
  passwordConfirm: 'unaclavelarga',
  imageRightsAccepted: true,
}

describe('validateRegister', () => {
  it('no devuelve errores con datos correctos', () => {
    expect(hasErrors(validateRegister(valid))).toBe(false)
  })

  it('exige que las contraseñas coincidan', () => {
    const errors = validateRegister({ ...valid, passwordConfirm: 'otracosa' })
    expect(errors.passwordConfirm).toBe('Las contraseñas no coinciden.')
    expect(errors.password).toBeUndefined()
  })

  it('exige repetir la contraseña', () => {
    expect(validateRegister({ ...valid, passwordConfirm: '' }).passwordConfirm).toBe(
      'Repite la contraseña.',
    )
  })

  it(`exige un mínimo de ${PASSWORD_MIN} caracteres`, () => {
    const short = 'a'.repeat(PASSWORD_MIN - 1)
    const errors = validateRegister({ ...valid, password: short, passwordConfirm: short })
    expect(errors.password).toContain(String(PASSWORD_MIN))
  })

  it('acepta justo el mínimo', () => {
    const exact = 'a'.repeat(PASSWORD_MIN)
    expect(validateRegister({ ...valid, password: exact, passwordConfirm: exact }).password).toBeUndefined()
  })

  it('valida el nombre', () => {
    expect(validateRegister({ ...valid, name: '   ' }).name).toBeDefined()
  })

  it('valida el email', () => {
    expect(validateRegister({ ...valid, email: 'no-es-un-email' }).email).toBeDefined()
  })

  it('exige al menos 9 dígitos de teléfono, ignorando el formato', () => {
    expect(validateRegister({ ...valid, phone: '600 00' }).phone).toBeDefined()
    expect(validateRegister({ ...valid, phone: '+34 600 00 00 00' }).phone).toBeUndefined()
  })

  it('exige aceptar los derechos de imagen', () => {
    expect(validateRegister({ ...valid, imageRightsAccepted: false }).imageRightsAccepted).toBeDefined()
  })

  it('acumula todos los errores de una vez', () => {
    const errors = validateRegister({
      name: '',
      email: 'x',
      phone: '1',
      password: 'a',
      passwordConfirm: 'b',
      imageRightsAccepted: false,
    })
    expect(Object.keys(errors).sort()).toEqual([
      'email',
      'imageRightsAccepted',
      'name',
      'password',
      'passwordConfirm',
      'phone',
    ])
  })
})
