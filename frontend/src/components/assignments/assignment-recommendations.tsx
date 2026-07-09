'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Users,
  Star,
  MapPin,
  Clock,
  DollarSign,
  Award,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Filter,
  Search,
  Zap
} from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { assignmentsApi, AssignmentRecommendationRequest, AssignmentRecommendation } from '@/lib/api/assignments'
import { toast } from 'sonner'

interface AssignmentRecommendationsProps {
  isOpen: boolean
  onClose: () => void
  siteId?: string
  role?: string
}

export default function AssignmentRecommendations({
  isOpen,
  onClose,
  siteId = '',
  role = ''
}: AssignmentRecommendationsProps) {
  const [request, setRequest] = useState<AssignmentRecommendationRequest>({
    siteId,
    role,
    startDate: new Date().toISOString().split('T')[0],
    limit: 10,
    criteria: ['SKILL_MATCH', 'AVAILABILITY', 'PERFORMANCE']
  })
  const [recommendations, setRecommendations] = useState<AssignmentRecommendation[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<AssignmentRecommendation | null>(null)

  const recommendationMutation = useMutation({
    mutationFn: (data: AssignmentRecommendationRequest) => 
      assignmentsApi.getAssignmentRecommendations(data),
    onSuccess: (data) => {
      setRecommendations(data.recommendations)
      toast.success(`Found ${data.recommendations.length} recommendations`)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to get recommendations')
    }
  })

  const handleGenerateRecommendations = () => {
    if (!request.siteId || !request.role) {
      toast.error('Please select a site and role')
      return
    }
    recommendationMutation.mutate(request)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'text-green-600 bg-green-100'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100'
      case 'HIGH': return 'text-orange-600 bg-orange-100'
      case 'CRITICAL': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assignment Recommendations</DialogTitle>
          <DialogDescription>
            Find the best employees for your assignment using AI-powered matching
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Search Criteria */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Criteria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteId">Site</Label>
                  <Input
                    id="siteId"
                    placeholder="Site ID"
                    value={request.siteId}
                    onChange={(e) => setRequest(prev => ({ ...prev, siteId: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    placeholder="Security Guard"
                    value={request.role}
                    onChange={(e) => setRequest(prev => ({ ...prev, role: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={request.startDate}
                    onChange={(e) => setRequest(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={request.endDate || ''}
                    onChange={(e) => setRequest(prev => ({ ...prev, endDate: e.target.value || undefined }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxRate">Max Hourly Rate</Label>
                  <Input
                    id="maxRate"
                    type="number"
                    placeholder="50"
                    value={request.maxHourlyRate || ''}
                    onChange={(e) => setRequest(prev => ({ 
                      ...prev, 
                      maxHourlyRate: e.target.value ? Number(e.target.value) : undefined 
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minRating">Min Performance Rating</Label>
                  <Select
                    value={request.minPerformanceRating?.toString() || ''}
                    onValueChange={(value) => setRequest(prev => ({ 
                      ...prev, 
                      minPerformanceRating: value ? Number(value) : undefined 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any</SelectItem>
                      <SelectItem value="3">3+ Stars</SelectItem>
                      <SelectItem value="4">4+ Stars</SelectItem>
                      <SelectItem value="5">5 Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minExperience">Min Experience (Years)</Label>
                  <Input
                    id="minExperience"
                    type="number"
                    placeholder="2"
                    value={request.minExperienceYears || ''}
                    onChange={(e) => setRequest(prev => ({ 
                      ...prev, 
                      minExperienceYears: e.target.value ? Number(e.target.value) : undefined 
                    }))}
                  />
                </div>
              </div>

              <Button 
                onClick={handleGenerateRecommendations}
                disabled={recommendationMutation.isPending}
                className="w-full"
              >
                {recommendationMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Generating Recommendations...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Generate Recommendations
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          {/* Recommendations Results */}
          {recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recommended Employees</CardTitle>
                <CardDescription>
                  Top {recommendations.length} candidates ranked by compatibility
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recommendations.map((recommendation) => (
                    <Card 
                      key={recommendation.employee.id} 
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => setSelectedEmployee(recommendation)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">
                                  {recommendation.employee.firstName} {recommendation.employee.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Employee #{recommendation.employee.employeeNumber}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Overall Score</p>
                                <div className="flex items-center gap-2">
                                  <Progress value={recommendation.overallScore} className="flex-1 h-2" />
                                  <span className={`text-sm font-bold ${getScoreColor(recommendation.overallScore)}`}>
                                    {recommendation.overallScore}%
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Skills Match</p>
                                <div className="flex items-center gap-2">
                                  <Progress value={recommendation.skillMatching.skillScore} className="flex-1 h-2" />
                                  <span className="text-sm font-bold">
                                    {recommendation.skillMatching.skillScore}%
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Performance</p>
                                <div className="flex items-center gap-2">
                                  <Star className="w-3 h-3 text-yellow-500" />
                                  <span className="text-sm font-bold">
                                    {recommendation.performance.overallRating}/5
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Hourly Rate</p>
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-3 h-3 text-green-500" />
                                  <span className="text-sm font-bold">
                                    ${recommendation.costEffectiveness.hourlyRate}/hr
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                Rank #{recommendation.rank}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {recommendation.experience.totalYears.toFixed(1)} years exp
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {recommendation.skillMatching.matchedSkills.length} skills matched
                              </Badge>
                            </div>

                            {recommendation.risks.length > 0 && (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-amber-500" />
                                <span className="text-xs text-muted-foreground">
                                  {recommendation.risks.length} risk(s) identified
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="text-right space-y-2">
                            <Badge 
                              className={`${getScoreColor(recommendation.confidenceLevel)} bg-transparent border`}
                            >
                              {recommendation.confidenceLevel}% confidence
                            </Badge>
                            <div className="space-y-1">
                              <Button size="sm" className="w-full">
                                Assign
                              </Button>
                              <Button variant="outline" size="sm" className="w-full">
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {/* Detailed Employee View */}
          {selectedEmployee && (
            <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedEmployee.employee.firstName} {selectedEmployee.employee.lastName} - Detailed Analysis
                  </DialogTitle>
                  <DialogDescription>
                    Comprehensive employee evaluation and recommendation details
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Score Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Score Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">Overall Score</span>
                              <span className="font-bold">{selectedEmployee.overallScore}%</span>
                            </div>
                            <Progress value={selectedEmployee.overallScore} />
                          </div>
                          
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">Skills Match</span>
                              <span className="font-bold">{selectedEmployee.skillMatching.skillScore}%</span>
                            </div>
                            <Progress value={selectedEmployee.skillMatching.skillScore} />
                          </div>

                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">Availability</span>
                              <span className="font-bold">{selectedEmployee.availability.availabilityScore}%</span>
                            </div>
                            <Progress value={selectedEmployee.availability.availabilityScore} />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">Performance</span>
                              <span className="font-bold">{selectedEmployee.performance.performanceScore}%</span>
                            </div>
                            <Progress value={selectedEmployee.performance.performanceScore} />
                          </div>

                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">Experience</span>
                              <span className="font-bold">{selectedEmployee.experience.experienceScore}%</span>
                            </div>
                            <Progress value={selectedEmployee.experience.experienceScore} />
                          </div>

                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">Cost Effectiveness</span>
                              <span className="font-bold">{selectedEmployee.costEffectiveness.costScore}%</span>
                            </div>
                            <Progress value={selectedEmployee.costEffectiveness.costScore} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Skills and Certifications */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Skills Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-green-600 mb-1">Matched Skills</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedEmployee.skillMatching.matchedSkills.map((skill) => (
                                <Badge key={skill} variant="secondary" className="text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {selectedEmployee.skillMatching.missingSkills.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-red-600 mb-1">Missing Skills</p>
                              <div className="flex flex-wrap gap-1">
                                {selectedEmployee.skillMatching.missingSkills.map((skill) => (
                                  <Badge key={skill} variant="destructive" className="text-xs">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Risks & Warnings</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {selectedEmployee.risks.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No risks identified</p>
                          ) : (
                            selectedEmployee.risks.map((risk, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 text-amber-500" />
                                <div>
                                  <p className={`text-xs font-medium ${getRiskColor(risk.severity)}`}>
                                    {risk.severity} - {risk.type}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{risk.description}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1">
                      <Users className="w-4 h-4 mr-2" />
                      Assign to Role
                    </Button>
                    <Button variant="outline">
                      Contact Employee
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedEmployee(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}