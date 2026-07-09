'use client';

import { useEffect, useState } from 'react';
import { User, Edit, Save, X, Phone, Mail, MapPin, Calendar, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useEmployeePortal, EmployeeProfile as ProfileType } from '@/hooks/use-employee-portal';
import { formatDate } from '@/lib/utils';

export function EmployeeProfile() {
  const { profile, isLoading, error, fetchProfile, updateProfile } = useEmployeePortal();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<ProfileType>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      setEditedProfile({
        phone: profile.phone,
        emergencyContact: profile.emergencyContact,
        address: profile.address,
        notificationPreferences: profile.notificationPreferences,
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateProfile(editedProfile);
    if (success) {
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const handleCancel = () => {
    if (profile) {
      setEditedProfile({
        phone: profile.phone,
        emergencyContact: profile.emergencyContact,
        address: profile.address,
        notificationPreferences: profile.notificationPreferences,
      });
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid gap-6">
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-red-600">{error || 'Unable to load profile'}</p>
          <Button variant="outline" onClick={fetchProfile} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600">Manage your personal information and preferences</p>
        </div>
        
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Basic Information (Read-only) */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Your basic employment information (managed by HR)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">First Name</Label>
                  <p className="text-gray-900">{profile.firstName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Last Name</Label>
                  <p className="text-gray-900">{profile.lastName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Employee Number</Label>
                  <p className="text-gray-900">{profile.employeeNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Email</Label>
                  <p className="text-gray-900 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    {profile.email}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Hire Date</Label>
                  <p className="text-gray-900 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(profile.hireDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Department</Label>
                  <p className="text-gray-900">{profile.department || 'Not specified'}</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-700">Job Title</Label>
                  <p className="text-gray-900">{profile.jobTitle || 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information (Editable) */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>
                Update your contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    type="tel"
                    value={editedProfile.phone || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <p className="text-gray-900 flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {profile.phone || 'Not provided'}
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <Label>Address</Label>
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Street Address"
                      value={editedProfile.address?.street || ''}
                      onChange={(e) => setEditedProfile({
                        ...editedProfile,
                        address: { ...editedProfile.address, street: e.target.value } as any
                      })}
                    />
                    <div className="grid md:grid-cols-2 gap-2">
                      <Input
                        placeholder="City"
                        value={editedProfile.address?.city || ''}
                        onChange={(e) => setEditedProfile({
                          ...editedProfile,
                          address: { ...editedProfile.address, city: e.target.value } as any
                        })}
                      />
                      <Input
                        placeholder="State"
                        value={editedProfile.address?.state || ''}
                        onChange={(e) => setEditedProfile({
                          ...editedProfile,
                          address: { ...editedProfile.address, state: e.target.value } as any
                        })}
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      <Input
                        placeholder="ZIP Code"
                        value={editedProfile.address?.zipCode || ''}
                        onChange={(e) => setEditedProfile({
                          ...editedProfile,
                          address: { ...editedProfile.address, zipCode: e.target.value } as any
                        })}
                      />
                      <Input
                        placeholder="Country"
                        value={editedProfile.address?.country || ''}
                        onChange={(e) => setEditedProfile({
                          ...editedProfile,
                          address: { ...editedProfile.address, country: e.target.value } as any
                        })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-900">
                    {profile.address ? (
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                        <div>
                          <p>{profile.address.street}</p>
                          <p>{profile.address.city}, {profile.address.state} {profile.address.zipCode}</p>
                          <p>{profile.address.country}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">No address provided</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>
                Contact information for emergencies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergency-name">Full Name</Label>
                      <Input
                        id="emergency-name"
                        value={editedProfile.emergencyContact?.name || ''}
                        onChange={(e) => setEditedProfile({
                          ...editedProfile,
                          emergencyContact: { ...editedProfile.emergencyContact, name: e.target.value } as any
                        })}
                        placeholder="Emergency contact name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergency-relationship">Relationship</Label>
                      <Input
                        id="emergency-relationship"
                        value={editedProfile.emergencyContact?.relationship || ''}
                        onChange={(e) => setEditedProfile({
                          ...editedProfile,
                          emergencyContact: { ...editedProfile.emergencyContact, relationship: e.target.value } as any
                        })}
                        placeholder="e.g., Spouse, Parent, Sibling"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergency-phone">Phone Number</Label>
                      <Input
                        id="emergency-phone"
                        type="tel"
                        value={editedProfile.emergencyContact?.phone || ''}
                        onChange={(e) => setEditedProfile({
                          ...editedProfile,
                          emergencyContact: { ...editedProfile.emergencyContact, phone: e.target.value } as any
                        })}
                        placeholder="Emergency contact phone"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergency-email">Email (Optional)</Label>
                      <Input
                        id="emergency-email"
                        type="email"
                        value={editedProfile.emergencyContact?.email || ''}
                        onChange={(e) => setEditedProfile({
                          ...editedProfile,
                          emergencyContact: { ...editedProfile.emergencyContact, email: e.target.value } as any
                        })}
                        placeholder="Emergency contact email"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {profile.emergencyContact ? (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Name</Label>
                        <p className="text-gray-900">{profile.emergencyContact.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Relationship</Label>
                        <p className="text-gray-900">{profile.emergencyContact.relationship}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Phone</Label>
                        <p className="text-gray-900">{profile.emergencyContact.phone}</p>
                      </div>
                      {profile.emergencyContact.email && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Email</Label>
                          <p className="text-gray-900">{profile.emergencyContact.email}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">No emergency contact provided</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notification Preferences */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications" className="text-sm font-medium">
                      Email Notifications
                    </Label>
                    <p className="text-xs text-gray-500">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={editedProfile.notificationPreferences?.email ?? true}
                    onCheckedChange={(checked) => setEditedProfile({
                      ...editedProfile,
                      notificationPreferences: { ...editedProfile.notificationPreferences, email: checked } as any
                    })}
                    disabled={!isEditing}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sms-notifications" className="text-sm font-medium">
                      SMS Notifications
                    </Label>
                    <p className="text-xs text-gray-500">
                      Receive notifications via SMS
                    </p>
                  </div>
                  <Switch
                    id="sms-notifications"
                    checked={editedProfile.notificationPreferences?.sms ?? false}
                    onCheckedChange={(checked) => setEditedProfile({
                      ...editedProfile,
                      notificationPreferences: { ...editedProfile.notificationPreferences, sms: checked } as any
                    })}
                    disabled={!isEditing}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push-notifications" className="text-sm font-medium">
                      Push Notifications
                    </Label>
                    <p className="text-xs text-gray-500">
                      Receive push notifications in browser
                    </p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={editedProfile.notificationPreferences?.pushNotifications ?? true}
                    onCheckedChange={(checked) => setEditedProfile({
                      ...editedProfile,
                      notificationPreferences: { ...editedProfile.notificationPreferences, pushNotifications: checked } as any
                    })}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                View My Schedule
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Phone className="h-4 w-4 mr-2" />
                Update Contact Info
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Bell className="h-4 w-4 mr-2" />
                Notification Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}