'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  MapPin,
  Shield,
  Zap,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Lightbulb
} from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { assignmentsApi, ConflictDetectionRequest, ConflictDetectionResult } from '@/lib/api/assignments'
import { toast } from 'sonner'

interface ConflictDetectionProps {
  employeeId?: string
  siteId?: string
  onConflictsDetected?: (result: ConflictDetectionResult) => void
}

export default function ConflictDetection({
  employeeId = '',
  siteId = '',
  onConflictsDetected
}: ConflictDetectionProps) {
  const [request, setRequest] = useState<ConflictDetectionRequest>({
    employeeId,
    siteId,
    startDate: new Date().toISOString().split('T')[0]
  })
  const [result, setResult] = useState<ConflictDetectionResult | null>(null)

  const conflictMutation = useMutation({
    mutationFn: (data: ConflictDetectionRequest) => 
      assignmentsApi.detectConflicts(data),
    onSuccess: (data) => {
      setResult(data)
      onConflictsDetected?.(data)
      
      if (data.hasConflicts) {
        toast.warning(`Found ${data.conflictCount} conflicts`)
      } else {
        toast.success('No conflicts detected')
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to detect conflicts')
    }
  })

  const handleDetectConflicts = () => {
    conflictMutation.mutate(request)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'LOW': return <CheckCircle className="w-4 h-4" />
      case 'MEDIUM': return <Clock className="w-4 h-4" />
      case 'HIGH': return <AlertTriangle className="w-4 h-4" />
      case 'CRITICAL': return <Shield className="w-4 h-4" />
      default: return <AlertTriangle className="w-4 h-4" />
    }
  }

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600'
    if (score >= 60) return 'text-orange-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="space-y-6">
      {/* Detection Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Conflict Detection
          </CardTitle>
          <CardDescription>
            Analyze assignments for scheduling conflicts, skill mismatches, and validation issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID (Optional)</Label>
              <Input
                id="employeeId"
                placeholder="Employee UUID"
                value={request.employeeId || ''}
                onChange={(e) => setRequest(prev => ({ ...prev, employeeId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteId">Site ID (Optional)</Label>
              <Input
                id="siteId"
                placeholder="Site UUID"
                value={request.siteId || ''}
                onChange={(e) => setRequest(prev => ({ ...prev, siteId: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={request.startDate || ''}
                onChange={(e) => setRequest(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={request.endDate || ''}
                onChange={(e) => setRequest(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          <Button 
            onClick={handleDetectConflicts}
            disabled={conflictMutation.isPending}
            className="w-full"
          >
            {conflictMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Run Conflict Detection
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      {/* Detection Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.hasConflicts ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Conflicts Detected
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    No Conflicts Found
                  </>
                )}
              </CardTitle>
              <CardDescription>
                Analysis completed at {new Date(result.analyzedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{result.conflictCount}</p>
                  <p className="text-sm text-muted-foreground">Total Conflicts</p>
                </div>
                <div className="text-center">
                  <Badge className={getSeverityColor(result.highestSeverity)}>
                    {result.highestSeverity}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">Highest Severity</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${getRiskScoreColor(result.riskScore)}`}>
                    {result.riskScore}%
                  </p>
                  <p className="text-sm text-muted-foreground">Risk Score</p>
                </div>
                <div className="text-center">
                  {result.canProceed ? (
                    <>
                      <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                      <p className="text-sm text-green-600 font-medium">Can Proceed</p>
                    </>
                  ) : (
                    <>
                      <Shield className="w-8 h-8 text-red-500 mx-auto" />
                      <p className="text-sm text-red-600 font-medium">Blocked</p>
                    </>
                  )}
                </div>
              </div>
              
              {result.riskScore > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Risk Assessment</span>
                    <span className={`text-sm font-bold ${getRiskScoreColor(result.riskScore)}`}>
                      {result.riskScore}%
                    </span>
                  </div>
                  <Progress 
                    value={result.riskScore} 
                    className="h-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conflicts List */}
          {result.conflicts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detected Conflicts</CardTitle>
                <CardDescription>
                  {result.conflicts.length} issue(s) found that require attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.conflicts.map((conflict, index) => (
                    <Alert key={index} className={getSeverityColor(conflict.severity)}>
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(conflict.severity)}
                        <div className="flex-1">
                          <AlertTitle className="flex items-center gap-2 mb-2">
                            {conflict.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            <Badge variant="outline" className="ml-auto">
                              {conflict.severity}
                            </Badge>
                          </AlertTitle>
                          <AlertDescription className="mb-3">
                            {conflict.description}
                          </AlertDescription>
                          
                          {conflict.suggestions.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Suggested Actions:</p>
                              <ul className="text-sm space-y-1">
                                {conflict.suggestions.map((suggestion, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <Lightbulb className="w-3 h-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                                    {suggestion}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resolutions */}
          {result.resolutions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommended Resolutions</CardTitle>
                <CardDescription>
                  Automated solutions to resolve detected conflicts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {result.resolutions.map((resolution, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{resolution.strategy}</h4>
                            <p className="text-sm text-muted-foreground">{resolution.description}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="mb-1">
                              {resolution.successProbability}% success
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {resolution.implementationTime}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          <p className="text-sm font-medium">Implementation Steps:</p>
                          <ol className="text-sm space-y-1">
                            {resolution.steps.map((step, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Estimated Cost: </span>
                            <span className="font-medium">${resolution.estimatedCost}</span>
                          </div>
                          <Button size="sm">
                            Apply Resolution
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          {result.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Analysis Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.insights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-blue-50">
                      <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{insight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Proceed Warnings */}
          {result.canProceed && result.proceedWarnings.length > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Proceed with Caution</AlertTitle>
              <AlertDescription className="text-yellow-700">
                <div className="space-y-1 mt-2">
                  {result.proceedWarnings.map((warning, index) => (
                    <p key={index} className="text-sm">• {warning}</p>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}