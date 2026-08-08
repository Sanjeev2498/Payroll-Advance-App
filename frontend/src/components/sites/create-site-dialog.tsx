'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { sitesApi } from '@/lib/api/sites'

interface CreateSiteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSiteCreated: () => void
}

export function CreateSiteDialog({ open, onOpenChange, onSiteCreated }: CreateSiteDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States' // Add required country field
    }
  })
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // For demo purposes, we'll use a hardcoded contract ID that matches the existing demo data
      // In a real application, this would come from a contract selection dropdown
      const demoContractId = '550e8400-e29b-41d4-a716-446655440000';
      
      const siteData = {
        contractId: demoContractId,
        name: formData.name,
        address: formData.address,
        accessRequirements: {
          securityClearance: 'Standard',
          requiredCertifications: ['Basic Security Training'],
          accessProcedures: 'Standard access procedures apply'
        },
        safetyProtocols: {
          evacuationProcedures: 'Standard evacuation procedures',
          hazardMitigation: 'Basic safety protocols',
          incidentReporting: 'Report to site manager immediately'
        },
        contactInfo: {
          primaryContact: 'Site Manager',
          primaryPhone: '+91 98765-43210',
          primaryEmail: 'sitemanager@client.com'
        },
        operationalStatus: 'ACTIVE' as const
      }
      
      // Create site via API
      const response = await sitesApi.createSite(siteData)
      console.log('Site created:', response)
      
      toast({
        title: 'Success',
        description: 'Site created successfully'
      })
      
      onSiteCreated()
    } catch (error: any) {
      console.error('Site creation error:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      
      toast({
        title: 'Error',
        description: `Failed to create site: ${error.response?.data?.message || error.message}`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Site</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Site Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter site name"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter site description"
            />
          </div>
          
          <div>
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              value={formData.address.street}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                address: { ...prev.address, street: e.target.value }
              }))}
              placeholder="Enter street address"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.address.city}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, city: e.target.value }
                }))}
                placeholder="City"
                required
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.address.state}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, state: e.target.value }
                }))}
                placeholder="State"
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="zipCode">ZIP Code</Label>
            <Input
              id="zipCode"
              value={formData.address.zipCode}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                address: { ...prev.address, zipCode: e.target.value }
              }))}
              placeholder="ZIP Code"
              required
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Site'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}