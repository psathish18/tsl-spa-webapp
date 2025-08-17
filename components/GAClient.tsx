"use client"

import React from 'react'
import { GoogleAnalytics } from '@next/third-parties/google'

type Props = {
  gaId?: string | null
}

export default function GAClient({ gaId }: Props) {
  if (!gaId) return null
  return <GoogleAnalytics gaId={gaId} />
}
