'use client';

import { useEffect, useState } from 'react';
import { FileText, Download, Eye, Upload, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useEmployeePortal, EmployeeDocument } from '@/hooks/use-employee-portal';
import { formatDate } from '@/lib/utils';

const documentTypes = [
  { value: '', label: 'All Types' },
  { value: 'contract', label: 'Employment Contract' },
  { value: 'certification', label: 'Certifications' },
  { value: 'id_document', label: 'ID Documents' },
  { value: 'training', label: 'Training Records' },
  { value: 'policy', label: 'Company Policies' },
  { value: 'handbook', label: 'Employee Handbook' },
  { value: 'other', label: 'Other' },
];

export function EmployeeDocuments() {
  const { documents, isLoading, error, fetchDocuments } = useEmployeePortal();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState<EmployeeDocument[]>([]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    let filtered = documents;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (selectedType) {
      filtered = filtered.filter(doc => doc.type === selectedType);
    }

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, selectedType]);

  const getFileIcon = (extension: string) => {
    const iconMap = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      xls: '📊',
      xlsx: '📊',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      txt: '📄',
    };
    return iconMap[extension.toLowerCase() as keyof typeof iconMap] || '📄';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentTypeBadge = (type: string) => {
    const typeConfig = {
      contract: { color: 'bg-blue-100 text-blue-800', label: 'Contract' },
      certification: { color: 'bg-green-100 text-green-800', label: 'Certification' },
      id_document: { color: 'bg-purple-100 text-purple-800', label: 'ID Document' },
      training: { color: 'bg-orange-100 text-orange-800', label: 'Training' },
      policy: { color: 'bg-gray-100 text-gray-800', label: 'Policy' },
      handbook: { color: 'bg-yellow-100 text-yellow-800', label: 'Handbook' },
      other: { color: 'bg-gray-100 text-gray-800', label: 'Other' },
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.other;
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const handleDownload = (doc: EmployeeDocument) => {
    window.open(doc.downloadUrl, '_blank');
  };

  const handlePreview = (doc: EmployeeDocument) => {
    // For PDFs and images, we can show a preview
    if (['pdf', 'jpg', 'jpeg', 'png', 'gif'].includes(doc.fileExtension.toLowerCase())) {
      window.open(doc.downloadUrl, '_blank');
    } else {
      // For other file types, trigger download
      handleDownload(doc);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
        <p className="text-gray-600">Access your employment documents, certifications, and company policies</p>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search Documents</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  id="search"
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="type">Document Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={fetchDocuments}
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      <div>
        {error && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
                <Button variant="outline" onClick={fetchDocuments} className="mt-2">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {filteredDocuments.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600">
                Showing {filteredDocuments.length} of {documents.length} documents
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{getFileIcon(doc.fileExtension)}</span>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate" title={doc.name}>
                            {doc.name}
                          </CardTitle>
                        </div>
                      </div>
                      {getDocumentTypeBadge(doc.type)}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {doc.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {doc.description}
                        </p>
                      )}

                      <div className="space-y-1 text-xs text-gray-500">
                        <div className="flex justify-between">
                          <span>Size:</span>
                          <span>{formatFileSize(doc.size)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Uploaded:</span>
                          <span>{formatDate(doc.uploadedAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Format:</span>
                          <span className="uppercase">{doc.fileExtension}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handlePreview(doc)}
                          className="flex-1"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDownload(doc)}
                          className="flex-1"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || selectedType ? 'No documents found' : 'No documents available'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedType 
                    ? 'Try adjusting your search or filter criteria.' 
                    : 'No documents have been uploaded to your account yet.'
                  }
                </p>
                {(searchTerm || selectedType) && (
                  <div className="space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedType('');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Document Categories Summary */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Document Categories</CardTitle>
            <CardDescription>
              Summary of documents by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {documentTypes.slice(1).map(type => {
                const count = documents.filter(doc => doc.type === type.value).length;
                return (
                  <div key={type.value} className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-gray-600">{type.label}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}