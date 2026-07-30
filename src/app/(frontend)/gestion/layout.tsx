import React from 'react'
import { StaffNav } from '@/components/gestion/StaffNav'

export default function GestionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StaffNav />
      {children}
    </>
  )
}
