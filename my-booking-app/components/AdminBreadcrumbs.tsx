'use client'

import { Breadcrumbs, Link as MUILink, Typography } from '@mui/material'
import Link from 'next/link'

type Crumb = { label: string; href?: string }

export default function AdminBreadcrumbs({ items }: { items: Crumb[] }) {
  const last = items[items.length - 1]
  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      {items.slice(0, -1).map((c) =>
        c.href ? (
          <MUILink key={c.label} component={Link} href={c.href} underline="hover" color="inherit">
            {c.label}
          </MUILink>
        ) : (
          <Typography key={c.label} color="text.secondary">{c.label}</Typography>
        )
      )}
      <Typography color="text.primary" fontWeight={600}>{last.label}</Typography>
    </Breadcrumbs>
  )
}
