'use client'

import React from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Section = { value: string; label: string; content: React.ReactNode }

export function MemberTabs({ sections }: { sections: Section[] }): React.JSX.Element {
  return (
    <Tabs defaultValue={sections[0]?.value} className="w-full">
      <TabsList className="flex w-full flex-wrap justify-start">
        {sections.map((s) => (
          <TabsTrigger key={s.value} value={s.value}>
            {s.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {sections.map((s) => (
        <TabsContent key={s.value} value={s.value} className="pt-5">
          {s.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
