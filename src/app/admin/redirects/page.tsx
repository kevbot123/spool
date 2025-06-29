'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, Check, X, Edit2, TestTube } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSite } from '@/context/SiteContext';
import { toast } from 'sonner';
import { useAdminHeader } from '@/context/AdminHeaderContext';

type Redirect = {
  id: string;
  source: string;
  destination: string;
};

type EditingRedirect = {
  id?: string;
  source: string;
  destination: string;
  isNew?: boolean;
};

export default function RedirectsPage() {
  const { currentSite } = useSite();
  const { setHeaderContent, setBreadcrumbs } = useAdminHeader();
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRedirect, setEditingRedirect] = useState<EditingRedirect | null>(null);
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (currentSite) {
      fetchRedirects();
    }
  }, [currentSite]);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Redirects', href: '/admin/redirects' }
    ]);

    // Ensure no extra header content for this page
    setHeaderContent(null);

    return () => {
      setHeaderContent(null);
      setBreadcrumbs([]);
    };
  }, [setHeaderContent, setBreadcrumbs]);

  const fetchRedirects = async () => {
    if (!currentSite) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/sites/${currentSite.id}/redirects`);
      if (response.ok) {
        const data = await response.json();
        setRedirects(data);
      } else {
        toast.error('Failed to fetch redirects.');
      }
    } catch (error) {
      toast.error('An error occurred while fetching redirects.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingRedirect({ 
      source: '', 
      destination: '', 
      isNew: true 
    });
  };

  const handleEdit = (redirect: Redirect) => {
    setEditingRedirect({
      id: redirect.id,
      source: redirect.source,
      destination: redirect.destination,
      isNew: false
    });
  };

  const handleSave = async () => {
    if (!currentSite || !editingRedirect) return;

    if (!editingRedirect.source.trim() || !editingRedirect.destination.trim()) {
      toast.error('Both source and destination paths are required.');
      return;
    }

    // Validate that wildcard counts match
    const sourceWildcards = (editingRedirect.source.match(/\*/g) || []).length;
    const destWildcards = (editingRedirect.destination.match(/\*/g) || []).length;
    
    if (sourceWildcards > 0 && destWildcards > 0 && sourceWildcards !== destWildcards) {
      toast.error('Number of wildcards (*) in source and destination must match.');
      return;
    }

    try {
      const isNew = editingRedirect.isNew;
      const url = isNew 
        ? `/api/admin/sites/${currentSite.id}/redirects`
        : `/api/admin/sites/${currentSite.id}/redirects/${editingRedirect.id}`;
      
      const method = isNew ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: editingRedirect.source,
          destination: editingRedirect.destination
        }),
      });

      if (response.ok) {
        toast.success(`Redirect ${isNew ? 'added' : 'updated'} successfully.`);
        setEditingRedirect(null);
        fetchRedirects();
      } else {
        const errorData = await response.json();
        toast.error(`Failed to ${isNew ? 'add' : 'update'} redirect: ${errorData.error}`);
      }
    } catch (error) {
      toast.error(`An error occurred while ${editingRedirect.isNew ? 'adding' : 'updating'} the redirect.`);
    }
  };

  const handleCancel = () => {
    setEditingRedirect(null);
  };

  const handleDeleteRedirect = async (redirectId: string) => {
    if (!currentSite) return;

    try {
      const response = await fetch(`/api/admin/sites/${currentSite.id}/redirects/${redirectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Redirect deleted successfully.');
        fetchRedirects();
      } else {
        toast.error('Failed to delete redirect.');
      }
    } catch (error) {
      toast.error('An error occurred while deleting the redirect.');
    }
  };

  const matchesPattern = (pattern: string, url: string): boolean => {
    // Normalize paths - remove leading slashes for consistent matching
    const cleanPattern = pattern.startsWith('/') ? pattern.slice(1) : pattern;
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    
    // Convert wildcard pattern to regex
    const regexPattern = cleanPattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
      .replace(/\\\*/g, '.*'); // Convert * to .*
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(cleanUrl);
  };

  const findRedirectForUrl = (url: string): string | null => {
    // Normalize the input URL
    const normalizedUrl = url.startsWith('/') ? url : '/' + url;
    
    for (const redirect of redirects) {
      const normalizedSource = redirect.source.startsWith('/') ? redirect.source : '/' + redirect.source;
      const normalizedDestination = redirect.destination.startsWith('/') ? redirect.destination : '/' + redirect.destination;
      
      if (matchesPattern(normalizedSource, normalizedUrl)) {
        // Handle wildcard replacement
        if (redirect.source.includes('*')) {
          const sourceRegex = new RegExp(
            '^' + normalizedSource.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '(.*)') + '$'
          );
          const match = normalizedUrl.match(sourceRegex);
          if (match && redirect.destination.includes('*')) {
            let result = normalizedDestination;
            // Replace wildcards in destination with captured groups
            for (let i = 1; i < match.length; i++) {
              result = result.replace('*', match[i]);
            }
            return result;
          }
        }
        return normalizedDestination;
      }
    }
    return null;
  };

  const handleTestRedirect = () => {
    if (!testUrl) {
      setTestResult(null);
      return;
    }

    const result = findRedirectForUrl(testUrl);
    setTestResult(result);
  };

  const isEditing = (redirect: Redirect) => {
    return editingRedirect?.id === redirect.id && !editingRedirect.isNew;
  };

  const allRedirects = editingRedirect?.isNew 
    ? [...redirects, editingRedirect as Redirect]
    : redirects;

  return (
    <div className="p-8 space-y-6 w-full max-w-3xl mx-auto">
      <Card className="py-6">
        <CardHeader>
          <CardTitle>301 Redirects</CardTitle>
          <CardDescription>
            Configure URL redirects for your site. Use <code className="px-1 py-0.5 bg-muted rounded text-sm">*</code> as a wildcard to match any characters. 
            For example: <code className="px-1 py-0.5 bg-muted rounded text-sm">/blog/*</code> → <code className="px-1 py-0.5 bg-muted rounded text-sm">/articles/*</code> 
            will redirect <code className="px-1 py-0.5 bg-muted rounded text-sm">/blog/my-post</code> to <code className="px-1 py-0.5 bg-muted rounded text-sm">/articles/my-post</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-2/5">Source Path</TableHead>
                <TableHead className="w-2/5">Destination</TableHead>
                <TableHead className="text-right w-1/5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : allRedirects.length > 0 ? (
                allRedirects.map((redirect, index) => {
                  const isCurrentlyEditing = isEditing(redirect) || (editingRedirect?.isNew && index === allRedirects.length - 1);
                  
                  return (
                    <TableRow key={redirect.id || 'new'} className="hover:bg-transparent">
                      <TableCell>
                        {isCurrentlyEditing ? (
                          <Input
                            value={editingRedirect?.source || ''}
                            onChange={(e) => setEditingRedirect(prev => prev ? {...prev, source: e.target.value} : null)}
                            placeholder="/old-path or /blog/*"
                            className="w-full"
                            autoFocus={editingRedirect?.isNew}
                          />
                        ) : (
                          <code className="px-2 py-1 bg-muted rounded text-sm">{redirect.source}</code>
                        )}
                      </TableCell>
                      <TableCell>
                        {isCurrentlyEditing ? (
                          <Input
                            value={editingRedirect?.destination || ''}
                            onChange={(e) => setEditingRedirect(prev => prev ? {...prev, destination: e.target.value} : null)}
                            placeholder="/new-path or /articles/*"
                            className="w-full"
                          />
                        ) : (
                          <code className="px-2 py-1 bg-muted rounded text-sm">{redirect.destination}</code>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          {isCurrentlyEditing ? (
                            <>
                              <Button variant="ghost" size="icon" onClick={handleSave}>
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={handleCancel}>
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(redirect)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteRedirect(redirect.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    None yet. Click "Add Redirect" to create your first rule.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Add Redirect button – bottom-right */}
          <div className="flex justify-end mt-4">
            <Button onClick={handleAddNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Redirect
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="py-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Test Redirects
          </CardTitle>
          <CardDescription>
            Enter a URL path to see where it would resolve based on your configured rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                value={testUrl}
                onChange={(e) => {
                  setTestUrl(e.target.value);
                  if (!e.target.value) setTestResult(null);
                }}
                placeholder="/test-path"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTestRedirect();
                  }
                }}
              />
            </div>
            <Button onClick={handleTestRedirect} disabled={!testUrl}>
              Test Redirect
            </Button>
          </div>
          
          {testResult !== null && (
            <div className="p-4 bg-muted rounded-lg">
              {testResult ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Redirect result:</p>
                  <p className="font-mono text-sm">
                    <span className="text-muted-foreground">{testUrl}</span>
                    <span className="mx-2">→</span>
                    <span className="font-medium">{testResult}</span>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No redirect rule matches this URL path.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 