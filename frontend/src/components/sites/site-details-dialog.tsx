'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Site } from '@/types'

interface SiteDetailsDialogProps {
  site: Site | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSiteUpdated: () => void
}

export function SiteDetailsDialog({ site, open, onOpenChange, onSiteUpdated }: SiteDetailsDialogProps) {
  if (!site) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{site.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Client</h3>
            <p className="text-muted-foreground">{site.client?.name || 'No client assigned'}</p>
          </div>
          <div>
            <h3 className="font-semibold">Status</h3>
            <p className="text-muted-foreground">{site.operationalStatus}</p>
          </div>
          <div>
            <h3 className="font-semibold">Address</h3>
            <p className="text-muted-foreground">
              {typeof site.address === 'object' && site.address ? 
                `${(site.address as any).street || ''}, ${(site.address as any).city || ''}, ${(site.address as any).state || ''} ${(site.address as any).zipCode || ''}` :
                'Address not available'
              }
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}