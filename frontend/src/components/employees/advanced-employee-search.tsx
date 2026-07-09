'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Search, 
  MapPin, 
  Calendar, 
  Star, 
  Filter,
  X,
  Plus,
  Users,
  Clock,
  Award,
  Target,
  Save,
  Trash2,
  RefreshCw,
  Settings,
  Download,
  Eye,
  Edit
} from 'lucide-react'
import { employeesApi, EmployeeSearchDto, SkillMatchDto, EmployeeResponseDto } from '@/lib/api/employees'

interface SearchPreset {
  id: string
  name: string
  criteria: EmployeeSearchDto
  createdAt: string
}

export function AdvancedEmployeeSearch() {
  // Search criteria state
  const [searchCriteria, setSearchCriteria] = useState<EmployeeSearchDto>({
    requiredSkills: [],
    location: '',
    maxDistance: 25,
    availableFrom: '',
    availableUntil: '',
    minPerformanceRating: 3.0
  })

  // Results state
  const [searchResults, setSearchResults] = useState<SkillMatchDto[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('skills')
  const [showPresets, setShowPresets] = useState(false)
  
  // Skills management
  const [availableSkills, setAvailableSkills] = useState<string[]>([
    'Security Guard', 'Armed Security', 'Surveillance', 'Access Control',
    'Emergency Response', 'First Aid', 'CPR Certified', 'Fire Safety',
    'Customer Service', 'Report Writing', 'Radio Communication', 'Patrol',
    'CCTV Operation', 'Metal Detector', 'X-Ray Operation', 'Crowd Control',
    'VIP Protection', 'Event Security', 'Retail Security', 'Industrial Security'
  ])
  const [newSkill, setNewSkill] = useState('')
  
  // Presets management
  const [presets, setPresets] = useState<SearchPreset[]>([
    {
      id: '1',
      name: 'Armed Security Guards',
      criteria: {
        requiredSkills: ['Armed Security', 'Security Guard'],
        minPerformanceRating: 4.0
      },
      createdAt: new Date().toISOString()
    },
    {
      id: '2', 
      name: 'Emergency Response Team',
      criteria: {
        requiredSkills: ['Emergency Response', 'First Aid', 'CPR Certified'],
        minPerformanceRating: 4.5
      },
      createdAt: new Date().toISOString()
    }
  ])
  const [presetName, setPresetName] = useState('')

  // Perform advanced search
  const performSearch = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const results = await employeesApi.searchEmployees(searchCriteria)
      setSearchResults(results)
    } catch (err) {
      setError('Failed to perform search')
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Update search criteria
  const updateCriteria = (updates: Partial<EmployeeSearchDto>) => {
    setSearchCriteria(prev => ({ ...prev, ...updates }))
  }

  // Skills management
  const addSkill = (skill: string) => {
    if (skill && !searchCriteria.requiredSkills?.includes(skill)) {
      updateCriteria({
        requiredSkills: [...(searchCriteria.requiredSkills || []), skill]
      })
    }
  }

  const removeSkill = (skill: string) => {
    updateCriteria({
      requiredSkills: searchCriteria.requiredSkills?.filter(s => s !== skill) || []
    })
  }

  const addCustomSkill = () => {
    if (newSkill.trim() && !availableSkills.includes(newSkill.trim())) {
      setAvailableSkills([...availableSkills, newSkill.trim()])
      addSkill(newSkill.trim())
      setNewSkill('')
    }
  }

  // Presets management
  const saveAsPreset = () => {
    if (presetName.trim()) {
      const newPreset: SearchPreset = {
        id: Date.now().toString(),
        name: presetName.trim(),
        criteria: { ...searchCriteria },
        createdAt: new Date().toISOString()
      }
      setPresets([...presets, newPreset])
      setPresetName('')
    }
  }

  const loadPreset = (preset: SearchPreset) => {
    setSearchCriteria({ ...preset.criteria })
  }

  const deletePreset = (presetId: string) => {
    setPresets(presets.filter(p => p.id !== presetId))
  }

  // Clear all criteria
  const clearCriteria = () => {
    setSearchCriteria({
      requiredSkills: [],
      location: '',
      maxDistance: 25,
      availableFrom: '',
      availableUntil: '',
      minPerformanceRating: 3.0
    })
    setSearchResults([])
    setSelectedEmployees(new Set())
  }

  // Result selection
  const toggleEmployeeSelection = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees)
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId)
    } else {
      newSelected.add(employeeId)
    }
    setSelectedEmployees(newSelected)
  }

  const selectAllResults = () => {
    if (selectedEmployees.size === searchResults.length) {
      setSelectedEmployees(new Set())
    } else {
      setSelectedEmployees(new Set(searchResults.map(r => r.employee.id)))
    }
  }

  // Format helpers
  const formatEmployeeName = (employee: EmployeeResponseDto) => {
    return `${employee.firstName} ${employee.lastName}`
  }

  const getMatchPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100'
    if (percentage >= 70) return 'text-blue-600 bg-blue-100'
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Advanced Employee Search</h2>
          <p className="text-sm text-gray-600 mt-1">
            Find the perfect employees using skills matching, availability, and location criteria
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowPresets(!showPresets)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Presets
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearCriteria}
          >
            <X className="w-4 h-4 mr-2" />
            Clear All
          </Button>
          <Button 
            onClick={performSearch}
            disabled={loading || (!searchCriteria.requiredSkills?.length && !searchCriteria.location)}
          >
            {loading && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Criteria Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Criteria</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="skills">Skills</TabsTrigger>
                  <TabsTrigger value="location">Location</TabsTrigger>
                  <TabsTrigger value="availability">Availability</TabsTrigger>
                </TabsList>

                {/* Skills Tab */}
                <TabsContent value="skills" className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Required Skills</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {searchCriteria.requiredSkills?.map((skill) => (
                        <Badge key={skill} variant="default" className="flex items-center gap-1">
                          {skill}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 w-4 h-4 hover:bg-transparent"
                            onClick={() => removeSkill(skill)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Available Skills</Label>
                    <ScrollArea className="h-32 mt-2 border rounded-md p-2">
                      <div className="space-y-1">
                        {availableSkills
                          .filter(skill => !searchCriteria.requiredSkills?.includes(skill))
                          .map((skill) => (
                          <Button
                            key={skill}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-left"
                            onClick={() => addSkill(skill)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            {skill}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add custom skill..."
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addCustomSkill()
                        }
                      }}
                    />
                    <Button size="sm" onClick={addCustomSkill}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Minimum Performance Rating</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        step="0.1"
                        value={searchCriteria.minPerformanceRating || 3.0}
                        onChange={(e) => updateCriteria({ minPerformanceRating: parseFloat(e.target.value) })}
                        className="w-20"
                      />
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <Star 
                            key={rating}
                            className={`w-4 h-4 ${
                              rating <= (searchCriteria.minPerformanceRating || 3) 
                                ? 'text-yellow-400 fill-current' 
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Location Tab */}
                <TabsContent value="location" className="space-y-4">
                  <div>
                    <Label htmlFor="location">Search Location</Label>
                    <Input
                      id="location"
                      placeholder="Enter city, state, or ZIP code"
                      value={searchCriteria.location || ''}
                      onChange={(e) => updateCriteria({ location: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxDistance">Maximum Distance (miles)</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <Input
                        id="maxDistance"
                        type="number"
                        min="1"
                        max="500"
                        value={searchCriteria.maxDistance || 25}
                        onChange={(e) => updateCriteria({ maxDistance: parseInt(e.target.value) })}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-600">
                        {searchCriteria.maxDistance || 25} miles radius
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-md">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Location Search</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      Find employees within a specific radius of a location. Useful for site-specific assignments.
                    </p>
                  </div>
                </TabsContent>

                {/* Availability Tab */}
                <TabsContent value="availability" className="space-y-4">
                  <div>
                    <Label htmlFor="availableFrom">Available From</Label>
                    <Input
                      id="availableFrom"
                      type="date"
                      value={searchCriteria.availableFrom || ''}
                      onChange={(e) => updateCriteria({ availableFrom: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="availableUntil">Available Until</Label>
                    <Input
                      id="availableUntil"
                      type="date"
                      value={searchCriteria.availableUntil || ''}
                      onChange={(e) => updateCriteria({ availableUntil: e.target.value })}
                    />
                  </div>

                  <div className="p-3 bg-green-50 rounded-md">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Date Range Search</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Find employees who are available during specific date ranges for assignments.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Save Preset */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Save as preset..."
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                  />
                  <Button 
                    size="sm" 
                    onClick={saveAsPreset}
                    disabled={!presetName.trim()}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Presets Panel */}
          {showPresets && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Search Presets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {presets.map((preset) => (
                    <div key={preset.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{preset.name}</p>
                        <p className="text-xs text-gray-500">
                          {preset.criteria.requiredSkills?.length || 0} skills, 
                          Rating: {preset.criteria.minPerformanceRating}+
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadPreset(preset)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePreset(preset.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {presets.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No saved presets
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Search Results Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Search Results</CardTitle>
                {searchResults.length > 0 && (
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllResults}
                    >
                      {selectedEmployees.size === searchResults.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <span className="text-sm text-gray-600">
                      {searchResults.length} employees found
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {searchResults.length === 0 && !loading && !error && (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No search performed yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Configure your search criteria and click Search to find employees
                  </p>
                </div>
              )}

              {loading && (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-500">Searching employees...</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  {searchResults.map((result) => (
                    <Card key={result.employee.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Checkbox
                              checked={selectedEmployees.has(result.employee.id)}
                              onCheckedChange={() => toggleEmployeeSelection(result.employee.id)}
                            />
                            
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-medium text-sm">
                                  {result.employee.firstName[0]}{result.employee.lastName[0]}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <h3 className="text-base font-medium text-gray-900">
                                  {formatEmployeeName(result.employee)}
                                </h3>
                                <Badge className={`${getMatchPercentageColor(result.matchPercentage)}`}>
                                  {Math.round(result.matchPercentage)}% match
                                </Badge>
                              </div>
                              
                              <div className="mt-1 text-sm text-gray-600">
                                <div className="flex items-center gap-4">
                                  <span>{result.employee.jobTitle || 'Employee'}</span>
                                  <span>{result.employee.department}</span>
                                  <span className="flex items-center">
                                    <Star className="w-4 h-4 mr-1 text-yellow-400" />
                                    {result.employee.performanceMetrics?.overallRating || 'N/A'}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-1">
                                {result.matchedSkills.map((skill) => (
                                  <Badge key={skill} variant="default" className="text-xs">
                                    ✓ {skill}
                                  </Badge>
                                ))}
                                {result.missingSkills.slice(0, 2).map((skill) => (
                                  <Badge key={skill} variant="outline" className="text-xs">
                                    - {skill}
                                  </Badge>
                                ))}
                                {result.missingSkills.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{result.missingSkills.length - 2} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Bulk Actions */}
              {selectedEmployees.size > 0 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700">
                      {selectedEmployees.size} employee(s) selected
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export Selected
                      </Button>
                      <Button size="sm">
                        <Target className="w-4 h-4 mr-2" />
                        Create Assignment
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}