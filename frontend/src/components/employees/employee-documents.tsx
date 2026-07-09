'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  Plus, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  X
} from 'lucide-react'
import { employeesApi, DocumentResponseDto, DocumentUploadDto, EmployeeResponseDto } from '@/lib/api/employees'

interface EmployeeDocumentsProps {
  employee: EmployeeResponseDto
  onClose?: () => void
}

const DOCUMENT_TYPES = [
  { value: 'ID_COPY', label: 'ID Copy' },
  { value: 'LICENSE', label: 'License' },
  { value: 'CERTIFICATION', label: 'Certification' },
  { value: 'BACKGROUND_CHECK', label: 'Background Check' },
  { value: 'DRUG_TEST', label: 'Drug Test' },
  { value: 'TRAINING_CERTIFICATE', label: 'Training Certificate' },
  { value: 'REFERENCE_LETTER', label: 'Reference Letter' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'OTHER', label: 'Other' }
]

export function EmployeeDocuments({ employee, onClose }: EmployeeDocumentsProps) {
  const [documents, setDocuments] = useState<DocumentResponseDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadData, setUploadData] = useState({
    type: '',
    name: '',
    expiryDate: '',
    notes: ''
  })
  const [uploading, setUploading] = useState(false)

  // Load documents
  const loadDocuments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const docs = await employeesApi.getEmployeeDocuments(employee.id)
      setDocuments(docs)
    } catch (err) {
      setError('Failed to load employee documents')
      console.error('Document loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [employee.id])

  // Handle document upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!uploadData.type || !uploadData.name) {
      return
    }

    try {
      setUploading(true)
      
      const documentData: DocumentUploadDto = {
        type: uploadData.type,
        name: uploadData.name,
        expiryDate: uploadData.expiryDate || undefined,
        metadata: {
          notes: uploadData.notes || undefined
        }
      }

      const newDocument = await employeesApi.uploadEmployeeDocument(employee.id, documentData)
      setDocuments([...documents, newDocument])
      
      // Reset form
      setUploadData({
        type: '',
        name: '',
        expiryDate: '',
        notes: ''
      })
      setShowUploadForm(false)
    } catch (error) {
      console.error('Failed to upload document:', error)
      // TODO: Show error notification
    } finally {
      setUploading(false)
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Get status badge
  const getStatusBadge = (status: string, expiryDate?: string) => {
    if (expiryDate && new Date(expiryDate) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>
    }
    
    switch (status?.toUpperCase()) {
      case 'UPLOADED':
        return <Badge variant="default">Uploaded</Badge>
      case 'VERIFIED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Verified</Badge>
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  // Get document icon
  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'ID_COPY':
      case 'LICENSE':
        return <FileText className="w-5 h-5 text-blue-500" />
      case 'CERTIFICATION':
      case 'TRAINING_CERTIFICATE':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'BACKGROUND_CHECK':
      case 'DRUG_TEST':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      default:
        return <FileText className="w-5 h-5 text-gray-500" />
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl max-h-[90vh]">
          <CardContent className="p-8">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-sm text-gray-600">Loading documents...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents - {employee.firstName} {employee.lastName}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUploadForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
              {onClose && (
                <Button variant="outline" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden">
          {error ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">{error}</p>
              <Button onClick={loadDocuments} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-full">
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No documents uploaded yet</p>
                  <Button onClick={() => setShowUploadForm(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload First Document
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {getDocumentIcon(doc.type)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-gray-900">
                                {doc.name}
                              </h3>
                              <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                                <span>
                                  {DOCUMENT_TYPES.find(t => t.value === doc.type)?.label || doc.type}
                                </span>
                                <span>{formatFileSize(doc.fileSize)}</span>
                                <span className="flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {formatDate(doc.uploadedAt)}
                                </span>
                                {doc.expiryDate && (
                                  <span className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Expires: {formatDate(doc.expiryDate)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            {getStatusBadge(doc.status, doc.expiryDate)}
                            <div className="flex items-center space-x-1">
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </CardContent>

        {/* Upload Document Modal */}
        {showUploadForm && (
          <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload Document
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUploadForm(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <form onSubmit={handleUpload}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentType">Document Type *</Label>
                    <Select
                      value={uploadData.type}
                      onValueChange={(value) => setUploadData(prev => ({ ...prev, type: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="documentName">Document Name *</Label>
                    <Input
                      id="documentName"
                      value={uploadData.name}
                      onChange={(e) => setUploadData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter document name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={uploadData.expiryDate}
                      onChange={(e) => setUploadData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      value={uploadData.notes}
                      onChange={(e) => setUploadData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes"
                    />
                  </div>

                  <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      File upload functionality will be implemented with actual file handling
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      For now, this creates a document record without the actual file
                    </p>
                  </div>
                </CardContent>

                <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowUploadForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading || !uploadData.type || !uploadData.name}>
                    {uploading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </Card>
    </div>
  )
}