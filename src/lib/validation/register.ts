/**
 * Validación del alta de socio, compartida por el formulario (cliente) y la server action.
 *
 * Módulo **puro**, sin `'use server'`, precisamente para que ambos lados importen la MISMA
 * función: el mensaje que ve el usuario al escribir es literalmente el que devuelve el
 * servidor, y no pueden divergir. El servidor sigue siendo la autoridad: relee la configuración
 * del formulario del CMS y valida contra ella, en vez de fiarse de qué campos trajo el POST.
 */

export const PASSWORD_MIN = 8

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type RegisterField =
  | 'name'
  | 'email'
  | 'phone'
  | 'password'
  | 'passwordConfirm'
  | 'imageRightsAccepted'
  | 'membershipType'
  // Uniones de literales con plantilla: una prenda y una talla por cada tipo configurado.
  | `garment:${string}`
  | `size:${string}`

export type RegisterFieldErrors = Partial<Record<RegisterField, string>>

export type RegisterFieldConfig = { enabled: boolean; required: boolean }

export type RegisterGarmentConfig = {
  /** Slug del tipo de prenda; da nombre a los campos del formulario. */
  key: string
  label: string
  required: boolean
  askSize: boolean
}

export type RegisterFormConfig = {
  phone: RegisterFieldConfig
  membershipType: RegisterFieldConfig
  garments: RegisterGarmentConfig[]
}

/**
 * Reproduce exactamente el comportamiento anterior a que el formulario fuese configurable.
 *
 * Importa que sea así: mientras el club no toque el global, un despliegue no cambia ni un
 * mensaje del alta. `tests/unit/validation/register.spec.ts` lo comprueba sin saber siquiera
 * que existe la configuración.
 */
export const DEFAULT_REGISTER_CONFIG: RegisterFormConfig = {
  phone: { enabled: true, required: true },
  membershipType: { enabled: true, required: false },
  garments: [],
}

export type RegisterInput = {
  name: string
  email: string
  phone: string
  password: string
  passwordConfirm: string
  imageRightsAccepted: boolean
  membershipType?: string
  /** Clave del tipo de prenda → lo que eligió el socio, tal cual viene del formulario. */
  garments?: Record<string, { itemId?: string; sizeId?: string }>
}

const digits = (value: string): number => value.replace(/\D/g, '').length

export const validateRegister = (
  input: RegisterInput,
  config: RegisterFormConfig = DEFAULT_REGISTER_CONFIG,
): RegisterFieldErrors => {
  const errors: RegisterFieldErrors = {}

  if (!input.name.trim()) {
    errors.name = 'Escribe tu nombre y apellidos.'
  }

  if (!EMAIL_RE.test(input.email.trim())) {
    errors.email = 'El email no parece válido.'
  }

  if (config.phone.enabled) {
    if (config.phone.required) {
      if (digits(input.phone) < 9) {
        errors.phone = 'Introduce un teléfono móvil válido para el grupo de WhatsApp.'
      }
    } else if (input.phone.trim() && digits(input.phone) < 9) {
      // Opcional, pero si lo escribe que valga: un teléfono a medias es peor que ninguno.
      errors.phone = 'Ese teléfono no parece válido.'
    }
  }

  if (input.password.length < PASSWORD_MIN) {
    errors.password = `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`
  }

  if (!input.passwordConfirm) {
    errors.passwordConfirm = 'Repite la contraseña.'
  } else if (input.password !== input.passwordConfirm) {
    errors.passwordConfirm = 'Las contraseñas no coinciden.'
  }

  if (!input.imageRightsAccepted) {
    errors.imageRightsAccepted = 'Debes aceptar los derechos de imagen para completar el alta.'
  }

  if (config.membershipType.enabled && config.membershipType.required) {
    if (!input.membershipType?.trim()) errors.membershipType = 'Elige un tipo de cuota.'
  }

  for (const garment of config.garments) {
    const selection = input.garments?.[garment.key]
    if (garment.required && !selection?.itemId) {
      errors[`garment:${garment.key}`] = `Elige tu ${garment.label.toLowerCase()}.`
    } else if (selection?.itemId && garment.askSize && !selection.sizeId) {
      errors[`size:${garment.key}`] = 'Elige la talla.'
    }
  }

  return errors
}

export const hasErrors = (errors: RegisterFieldErrors): boolean => Object.keys(errors).length > 0
