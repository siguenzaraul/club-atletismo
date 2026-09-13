'use client'

import React, { useMemo, useState } from 'react'

import { sizesForItem } from '@/lib/registration-form'
import type { GarmentOption } from '@/lib/registration-form'
import type { RegisterFieldErrors } from '@/lib/validation/register'
import { PublicSelect } from './PublicField'

/**
 * Un tipo de prenda del alta: el socio elige UNA prenda (tirantes **o** manga corta) y su talla.
 *
 * Un solo `<select>` para la prenda es lo que hace la elección excluyente por construcción.
 *
 * El desplegable de tallas **no se deshabilita** mientras no haya prenda elegida: sin
 * JavaScript el componente no se vuelve a renderizar nunca, así que un `disabled` inicial
 * dejaría el alta bloqueada para siempre. En su lugar se ofrecen todas las tallas del tipo y,
 * en cuanto hay prenda, la lista se reduce a las de su escala. El servidor revalida que la
 * talla pertenezca a la escala del artículo, así que no puede colarse una combinación inválida.
 */
export function GarmentPicker({
  garment,
  errors,
}: {
  garment: GarmentOption
  errors?: RegisterFieldErrors
}) {
  const [itemId, setItemId] = useState('')
  const [sizeId, setSizeId] = useState('')

  const selectedItem = useMemo(
    () => garment.items.find((i) => String(i.id) === itemId) ?? null,
    [garment.items, itemId],
  )
  const availableSizes = useMemo(
    () => (selectedItem ? sizesForItem(garment.sizes, selectedItem) : garment.sizes),
    [garment.sizes, selectedItem],
  )

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
      <PublicSelect
        name={`garment:${garment.key}`}
        label={garment.label}
        value={itemId}
        onChange={(e) => {
          setItemId(e.target.value)
          // La talla elegida puede no existir en la escala de la prenda nueva.
          setSizeId('')
        }}
        hint={garment.help ?? undefined}
        error={errors?.[`garment:${garment.key}`]}
        required={garment.required}
      >
        <option value="">{garment.required ? 'Elige una opción' : 'No, gracias'}</option>
        {garment.items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </PublicSelect>

      {garment.askSize && (
        <PublicSelect
          name={`size:${garment.key}`}
          label="Talla"
          value={sizeId}
          onChange={(e) => setSizeId(e.target.value)}
          error={errors?.[`size:${garment.key}`]}
          required={garment.required}
        >
          <option value="">Elige tu talla</option>
          {availableSizes.map((size) => (
            <option key={size.id} value={size.id}>
              {size.label}
            </option>
          ))}
        </PublicSelect>
      )}
    </div>
  )
}
