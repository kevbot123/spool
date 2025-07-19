'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, UserPlus, Crown, Shield, Edit, Eye, X, Mail, Users, Trash2 } from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { useAdminHeader } from '@/context/AdminHeaderContext';

interface Collaborator {
  id: string;
  user_id: string | null;
  site_id: string | null;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  invited_at: string;
  accepted_at: string | null;
  invited_by?: string | null;
  invited_by_email?: string;
  site?: {
    id: string;
    name: string;
  } | null;
}

export default function TeamPage() {
  const { currentSite } = useSite();
  const { setHeaderContent, setBreadcrumbs } = useAdminHeader();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<any>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Invite form state
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getUser();
  }, [supabase]);

  // Set up header content
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Team', href: '/admin/team' }
    ]);

    setHeaderContent(
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Button 
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2"
            disabled={!currentSite}
          >
            <UserPlus className="h-4 w-4" />
            Send invite
          </Button>
        </div>
      </div>
    );

    return () => {
      setHeaderContent(null);
      setBreadcrumbs([]);
    };
  }, [currentSite, searchQuery, setHeaderContent, setBreadcrumbs]);

  // Fetch collaborators for the current site and all sites owned by user
  useEffect(() => {
    if (user) {
      fetchCollaborators();
    }
  }, [user, currentSite]);

  const fetchCollaborators = async () => {
    if (!user || !currentSite) return;

    try {
      setIsLoading(true);

      // Get collaborators for the current site only
      const response = await fetch(`/api/admin/sites/collaborators?siteId=${currentSite.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch collaborators');
      }

      const allCollaborators = await response.json();
      
      // Add site information to collaborators
      const collaboratorsWithSites = allCollaborators.map((collab: any) => ({
        ...collab,
        site: { id: currentSite.id, name: currentSite.name }
      }));

      setCollaborators(collaboratorsWithSites);

    } catch (error) {
      console.error('Error fetching collaborators:', error);
      toast.error('Failed to load collaborators');
    } finally {
      setIsLoading(false);
    }
  };

  const addEmail = () => {
    if (!currentEmail || !currentEmail.includes('@')) return;
    
    const emailToAdd = currentEmail.trim().toLowerCase();
    
    // Check if email already exists in the list
    if (emails.includes(emailToAdd)) {
      toast.error('Email already added to the list');
      return;
    }
    
    // Check if user already exists as collaborator
    const existingCollaborator = collaborators.find(c => 
      c.email.toLowerCase() === emailToAdd
    );
    if (existingCollaborator) {
      toast.error('This user is already a collaborator on this site');
      return;
    }
    
    setEmails([...emails, emailToAdd]);
    setCurrentEmail('');
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(email => email !== emailToRemove));
  };

  const handleInvite = async () => {
    if (emails.length === 0 || !role || !currentSite) return;

    setIsInviting(true);
    try {
      let successCount = 0;
      let failCount = 0;

      // Send invitations for all emails
      for (const email of emails) {
        try {
          const response = await fetch('/api/admin/sites/invite', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              siteId: currentSite.id,
              email,
              role,
              siteName: currentSite.name
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
          console.error(`Error inviting ${email}:`, error);
        }
      }

      // Show appropriate success/error messages
      if (successCount > 0 && failCount === 0) {
        toast.success(`${successCount} invitation${successCount > 1 ? 's' : ''} sent successfully!`);
      } else if (successCount > 0 && failCount > 0) {
        toast.success(`${successCount} invitation${successCount > 1 ? 's' : ''} sent, ${failCount} failed`);
      } else {
        toast.error('Failed to send invitations');
      }

      // Reset form and close modal
      setEmails([]);
      setCurrentEmail('');
      setRole('editor');
      setShowInviteModal(false);
      fetchCollaborators(); // Refresh the list
    } catch (error) {
      console.error('Error sending invitations:', error);
      toast.error('Failed to send invitations');
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

  // Filter collaborators based on search
  const filteredCollaborators = collaborators.filter(collaborator =>
    collaborator.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collaborator.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const getStatusBadge = (collaborator: Collaborator) => {
    if (collaborator.accepted_at) {
      return <Badge variant="default">Active</Badge>;
    } else {
      return <Badge variant="outline">Pending</Badge>;
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

  if (isLoading) {
    return (
      <div className="p-6 bg-white min-h-full">
        <div className="space-y-4 max-w-7xl mx-auto">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="h-32 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-2 bg-white min-h-full">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Collaborators List */}
        <div>
          <div className="mb-4">
            {/* <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Site Collaborators
            </h2>
            <p className="text-sm text-muted-foreground">
              People who have access to your content management sites
            </p> */}
          </div>
          
          {filteredCollaborators.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No team members yet</h3>
              <p className="text-muted-foreground mb-4">
                Start collaborating by inviting team members to this site
              </p>
              <Button 
                onClick={() => setShowInviteModal(true)}
                disabled={!currentSite}
              >
                <Plus className="h-4 w-4 mr-2" />
                Invite Your First Team Member
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCollaborators.map((collaborator) => (
                <Card key={collaborator.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                          {getInitials(collaborator.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">{collaborator.email}</p>
                          <Badge variant={getRoleBadgeVariant(collaborator.role)} className="text-xs">
                            <div className="flex items-center gap-1">
                              {getRoleIcon(collaborator.role)}
                              <span className="capitalize">{collaborator.role}</span>
                            </div>
                          </Badge>
                          {getStatusBadge(collaborator)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {collaborator.accepted_at && collaborator.accepted_at !== 'owner' ? (
                            <>Joined {new Date(collaborator.accepted_at).toLocaleDateString()}</>
                          ) : collaborator.role === 'owner' ? (
                            <>Site Owner</>
                          ) : (
                            <>Invited {new Date(collaborator.invited_at).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {collaborator.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCollaborator(collaborator.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

      {/* Invite Collaborator Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Collaborator
            </DialogTitle>
            <DialogDescription>
              Invite someone to collaborate on <strong>{currentSite?.name || 'your site'}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-3">
            <div>
              <Label htmlFor="invite-email" className="pb-2">Add email addresses</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addEmail();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addEmail}
                  disabled={!currentEmail || !currentEmail.includes('@')}
                >
                  Add
                </Button>
              </div>
              
              {/* Email list */}
              {emails.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {emails.length} email{emails.length > 1 ? 's' : ''} to invite:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {emails.map((email) => (
                      <Badge
                        key={email}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        <span>{email}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => removeEmail(email)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="invite-role" className="pb-2">Role</Label>
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
              disabled={emails.length === 0 || isInviting || !currentSite}
              className="w-full"
            >
              {isInviting ? (
                'Sending invitations...'
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send {emails.length} Invitation{emails.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}