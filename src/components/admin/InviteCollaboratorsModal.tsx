'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X, Mail, UserPlus, Users, Crown, Shield, Edit, Eye } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';

interface Collaborator {
  id: string;
  user_id: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  accepted_at: string | null;
  invited_at: string;
  invited_by_email?: string;
}

interface InviteCollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
  siteName: string;
}

export function InviteCollaboratorsModal({
  isOpen,
  onClose,
  siteId,
  siteName
}: InviteCollaboratorsModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Load collaborators when modal opens
  React.useEffect(() => {
    if (isOpen) {
      fetchCollaborators();
    }
  }, [isOpen, siteId]);

  const fetchCollaborators = async () => {
    setIsLoadingCollaborators(true);
    try {
      const response = await fetch(`/api/admin/sites/collaborators?siteId=${siteId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch collaborators');
      }

      const allCollaborators = await response.json();
      setCollaborators(allCollaborators);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    } finally {
      setIsLoadingCollaborators(false);
    }
  };

  const handleInvite = async () => {
    if (!email || !role) return;

    setIsInviting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if user already exists as collaborator
      const existingCollaborator = collaborators.find(c => c.email === email);
      if (existingCollaborator) {
        toast.error('This user is already a collaborator on this site');
        return;
      }

      const response = await fetch('/api/admin/sites/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId,
          email,
          role,
          siteName
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Invitation sent successfully!');
      setEmail('');
      setRole('editor');
      fetchCollaborators(); // Refresh the list
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    try {
      const response = await fetch(`/api/admin/sites/collaborators/${collaboratorId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove collaborator');
      }

      toast.success('Collaborator removed successfully');
      fetchCollaborators(); // Refresh the list
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast.error('Failed to remove collaborator');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3" />;
      case 'admin':
        return <Shield className="h-3 w-3" />;
      case 'editor':
        return <Edit className="h-3 w-3" />;
      case 'viewer':
        return <Eye className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'editor':
        return 'outline';
      case 'viewer':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Collaborators
          </DialogTitle>
          <DialogDescription>
            Invite people to collaborate on <strong>{siteName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInvite();
                  }
                }}
              />
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      <span>Admin</span>
                      <span className="text-xs text-gray-500">Full access</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Edit className="h-3 w-3" />
                      <span>Editor</span>
                      <span className="text-xs text-gray-500">Can edit content</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="h-3 w-3" />
                      <span>Viewer</span>
                      <span className="text-xs text-gray-500">Read-only access</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleInvite}
              disabled={!email || isInviting}
              className="w-full"
            >
              {isInviting ? (
                'Sending invitation...'
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>

          {/* Current Collaborators */}
          <div>
            <h3 className="text-sm font-medium mb-3">Current Collaborators</h3>
            
            {isLoadingCollaborators ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 rounded animate-pulse mb-1" />
                      <div className="h-2 bg-gray-200 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {collaborators.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                          {getInitials(collaborator.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{collaborator.email}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRoleBadgeVariant(collaborator.role)} className="text-xs">
                            <div className="flex items-center gap-1">
                              {getRoleIcon(collaborator.role)}
                              {collaborator.role}
                            </div>
                          </Badge>
                          {!collaborator.accepted_at && collaborator.accepted_at !== 'owner' && (
                            <Badge variant="outline" className="text-xs">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {collaborator.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCollaborator(collaborator.id)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                {collaborators.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No collaborators yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 