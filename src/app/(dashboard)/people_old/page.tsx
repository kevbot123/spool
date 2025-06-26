"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Search, UserPlus } from 'lucide-react'

interface Collaborator {
  id: string
  user_id: string | null
  site_id: string | null
  role: string | null
  invited_at: string | null
  accepted_at?: string | null
  invited_by?: string | null
  site?: {
    name: string
  } | null
}

export default function PeoplePage() {
  const supabase = createClient()
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useState<any>(null)

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    getUser()
  }, [supabase])

  // Fetch collaborators
  useEffect(() => {
    const fetchCollaborators = async () => {
      if (!user) return

      try {
        setIsLoading(true)

        // Get collaborators for sites owned by the current user
        const { data: sites, error: sitesError } = await supabase
          .from('sites')
          .select('id')
          .eq('user_id', user.id)

        if (sitesError) {
          throw new Error('Failed to fetch sites')
        }

        if (!sites || sites.length === 0) {
          setCollaborators([])
          return
        }

        const siteIds = sites.map(site => site.id)

        // Get all collaborators for these sites
        const { data: collaboratorsData, error: collabError } = await supabase
          .from('site_collaborators')
          .select(`
            *,
            site:sites(name)
          `)
          .in('site_id', siteIds)
          .order('invited_at', { ascending: false })

        if (collabError) {
          throw new Error('Failed to fetch collaborators')
        }

        setCollaborators(collaboratorsData || [])

      } catch (error) {
        console.error('Error fetching collaborators:', error)
        toast.error('Failed to load collaborators')
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchCollaborators()
    }
  }, [user, supabase])

  // Filter collaborators based on search
  const filteredCollaborators = collaborators.filter(collaborator =>
    collaborator.site?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collaborator.role?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRoleBadgeVariant = (role: string | null) => {
    if (role === 'admin') {
      return 'destructive'
    } else if (role === 'editor') {
      return 'default'
    } else if (role === 'viewer') {
      return 'secondary'
    } else {
      return 'outline'
    }
  }

  const getStatusBadge = (collaborator: Collaborator) => {
    if (collaborator.accepted_at) {
      return <Badge variant="default">Active</Badge>
    } else {
      return <Badge variant="outline">Pending</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="h-32 bg-muted animate-pulse rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Collaborators</h1>
          <p className="text-muted-foreground">
            Manage who has access to your content and sites
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Collaborator
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center space-x-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by site or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Collaborators list */}
      <Card>
        <CardHeader>
          <CardTitle>Site Collaborators</CardTitle>
          <CardDescription>
            People who have access to your content management sites
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCollaborators.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No collaborators yet</h3>
              <p className="text-muted-foreground mb-4">
                Start collaborating by inviting team members to your content sites
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Invite Your First Collaborator
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCollaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">
                        {collaborator.site?.name || 'Unknown Site'}
                      </h4>
                      <Badge variant={getRoleBadgeVariant(collaborator.role)}>
                        {collaborator.role || 'Unknown Role'}
                      </Badge>
                      {getStatusBadge(collaborator)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Invited {new Date(collaborator.invited_at || '').toLocaleDateString()}
                      {collaborator.accepted_at && (
                        <span className="ml-2">
                          • Joined {new Date(collaborator.accepted_at).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 