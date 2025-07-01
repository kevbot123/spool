'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Building2, UserCheck, Crown, Shield, Edit, Eye, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface InvitationData {
  id: string;
  site_id: string;
  role: 'admin' | 'editor' | 'viewer';
  invited_at: string;
  site: {
    name: string;
    domain?: string;
  };
  invited_by_user: {
    email: string;
  };
}

function AcceptInvitePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteId = searchParams.get('id');
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (inviteId) {
      fetchInvitation();
    } else {
      setError('Invalid invitation link');
      setIsLoading(false);
    }
  }, [inviteId]);

  const fetchInvitation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Redirect to sign in with the invite ID
        router.push(`/sign-in?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      const { data: invitation, error } = await supabase
        .from('site_collaborators')
        .select(`
          id,
          site_id,
          role,
          invited_at,
          accepted_at,
          site:sites!inner(name, domain),
          invited_by_user:auth.users!invited_by(email)
        `)
        .eq('id', inviteId)
        .is('accepted_at', null) // Only pending invitations
        .single();

      if (error || !invitation) {
        setError('Invitation not found or already accepted');
        return;
      }

      // Check if the current user is the intended recipient
      // For now, we'll allow any logged-in user to accept (in production, you'd check email match)
      
      setInvitation(invitation as any);
    } catch (error) {
      console.error('Error fetching invitation:', error);
      setError('Failed to load invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitation) return;

    setIsAccepting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/sign-in');
        return;
      }

      // Update the invitation to mark as accepted and set the user_id
      const { error } = await supabase
        .from('site_collaborators')
        .update({
          user_id: user.id,
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (error) {
        throw error;
      }

      toast.success('Invitation accepted! Welcome to the team.');
      
      // Redirect to the admin panel for this site
      router.push('/admin');

    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDeclineInvitation = async () => {
    if (!invitation) return;

    try {
      // Delete the invitation record
      const { error } = await supabase
        .from('site_collaborators')
        .delete()
        .eq('id', invitation.id);

      if (error) {
        throw error;
      }

      toast.success('Invitation declined');
      router.push('/');

    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error('Failed to decline invitation');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'editor':
        return <Edit className="h-4 w-4" />;
      case 'viewer':
        return <Eye className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full access to manage content and collaborators';
      case 'editor':
        return 'Can create and edit content';
      case 'viewer':
        return 'Read-only access to content';
      default:
        return '';
    }
  };

  const getSiteInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading invitation...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => router.push('/')} variant="outline">
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <UserCheck className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">You've been invited!</CardTitle>
          <CardDescription>
            You've been invited to collaborate on a Spool CMS site
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {invitation && (
            <>
              {/* Site Information */}
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                    {getSiteInitials(invitation.site.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{invitation.site.name}</h3>
                  {invitation.site.domain && (
                    <p className="text-sm text-gray-600">
                      {invitation.site.domain.replace(/^https?:\/\//, '')}
                    </p>
                  )}
                </div>
              </div>

              {/* Role Information */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Your role:</span>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {getRoleIcon(invitation.role)}
                    {invitation.role}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {getRoleDescription(invitation.role)}
                </p>
              </div>

              {/* Inviter Information */}
              <div className="text-sm text-gray-600">
                <p>
                  Invited by <strong>{invitation.invited_by_user.email}</strong>
                </p>
                <p>
                  on {new Date(invitation.invited_at).toLocaleDateString()}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleAcceptInvitation}
                  disabled={isAccepting}
                  className="flex-1"
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Accept Invitation
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={handleDeclineInvitation}
                  variant="outline"
                  disabled={isAccepting}
                >
                  Decline
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <AcceptInvitePageInner />
    </Suspense>
  );
} 