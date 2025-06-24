"use client"

import { useState, useEffect, useMemo } from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUp, ArrowDown, ChevronDown, Download, MoreHorizontal, Search, Users, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { getCountryForIP, getCountryFlag } from "@/lib/ip-location"
import { UserAvatar } from "@/components/ui/user-avatar"

interface PersonData {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  firstActivity: Date;
  lastActivity: Date;
  totalChats: number;
  ipAddress?: string;
  location?: string;
}

interface ChatUserIdentification {
  id: string;
  session_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at: string;
}

interface ChatLog {
  id: string;
  created_at: string;
  session_id: string;
  ip_address: string | null;
  ipAddress?: string;
}

export default function PeoplePage() {
  const [people, setPeople] = useState<PersonData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessingLocation, setIsProcessingLocation] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [personToDelete, setPersonToDelete] = useState<PersonData | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Function to clear user identification from localStorage for the current user's chatbots
  const clearUserIdentificationFromLocalStorage = (chatbotIds: string[]) => {
    if (typeof window === 'undefined') return
    
    try {
      chatbotIds.forEach(chatbotId => {
        const userIdKey = `chatbot_user_identification_${chatbotId}`
        localStorage.removeItem(userIdKey)
        console.log(`Cleared localStorage for chatbot: ${chatbotId}`)
      })
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  }

  const confirmDeletePerson = (person: PersonData) => {
    setPersonToDelete(person)
    setDeleteDialogOpen(true)
  }

  const handleDeletePerson = async () => {
    if (!personToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch('/api/chat-user-identifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personId: personToDelete.id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete person')
      }

      const result = await response.json()
      console.log('Delete result:', result)

      // Clear localStorage for the affected chatbots
      if (result.chatbotIds && result.chatbotIds.length > 0) {
        clearUserIdentificationFromLocalStorage(result.chatbotIds)
      }

      // Remove from local state after successful deletion
      setPeople(prev => prev.filter(person => person.id !== personToDelete.id))
      toast.success(`${personToDelete.email || personToDelete.firstName || 'Person'} deleted successfully`)
      
      // Close dialog and reset state
      setDeleteDialogOpen(false)
      setPersonToDelete(null)
    } catch (error) {
      console.error('Error deleting person:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete person')
    } finally {
      setIsDeleting(false)
    }
  }

  const confirmBulkDelete = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    if (selectedRows.length === 0) {
      toast.error('No people selected')
      return
    }
    setBulkDeleteDialogOpen(true)
  }

  const handleBulkDelete = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const selectedIds = selectedRows.map(row => row.original.id)
    
    if (selectedIds.length === 0) {
      setBulkDeleteDialogOpen(false)
      return
    }

    setIsDeleting(true)
    try {
      // Delete each person individually
      const deletePromises = selectedIds.map(personId => 
        fetch('/api/chat-user-identifications', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ personId }),
        })
      )

      const responses = await Promise.allSettled(deletePromises)
      
      // Collect all chatbot IDs for localStorage clearing
      const allChatbotIds = new Set<string>()
      
      // Check for any failures and collect chatbot IDs
      const failures = responses.filter(response => {
        if (response.status === 'fulfilled' && response.value.ok) {
          // Parse the response to get chatbot IDs
          response.value.json().then(result => {
            if (result.chatbotIds) {
              result.chatbotIds.forEach((id: string) => allChatbotIds.add(id))
            }
          }).catch(() => {})
          return false
        }
        return true
      })

      // Clear localStorage for all affected chatbots
      if (allChatbotIds.size > 0) {
        clearUserIdentificationFromLocalStorage(Array.from(allChatbotIds))
      }

      if (failures.length > 0) {
        console.error('Some deletions failed:', failures)
        toast.error(`Failed to delete ${failures.length} of ${selectedIds.length} people`)
      } else {
        toast.success(`${selectedIds.length} people deleted successfully`)
      }

      // Remove successfully deleted people from local state
      // For simplicity, we'll remove all selected people and let the user refresh if some failed
      setPeople(prev => prev.filter(person => !selectedIds.includes(person.id)))
      
      // Clear selection
      table.resetRowSelection()
      
      // Close dialog
      setBulkDeleteDialogOpen(false)
      
    } catch (error) {
      console.error('Error deleting people:', error)
      toast.error('Failed to delete selected people')
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: ColumnDef<PersonData>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <div className="pl-3">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="pl-3">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Email Address
            {column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        )
      },
      cell: ({ row }) => {
        const person = row.original;
        return (
          <div className="flex items-center space-x-3">
            <UserAvatar 
              userIdentification={{
                firstName: person.firstName || undefined,
                lastName: person.lastName || undefined,
                email: person.email || undefined
              }}
              size="sm"
              className="flex-shrink-0"
            />
            <div className="font-medium">{person.email || "-"}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "firstName",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            First Name
            {column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        )
      },
      cell: ({ row }) => <div>{row.getValue("firstName") || "-"}</div>,
    },
    {
      accessorKey: "lastName",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Last Name
            {column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        )
      },
      cell: ({ row }) => <div>{row.getValue("lastName") || "-"}</div>,
    },
    {
      accessorKey: "location",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Location
            {column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        )
      },
      cell: ({ row }) => <div>{row.getValue("location") || "-"}</div>,
    },
    {
      accessorKey: "firstActivity",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            First Activity
            {column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue("firstActivity") as Date
        return <div className="text-sm">{date.toLocaleDateString()}</div>
      },
    },
    {
      accessorKey: "lastActivity",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Last Activity
            {column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue("lastActivity") as Date
        return <div className="text-sm">{date.toLocaleDateString()}</div>
      },
    },
    {
      accessorKey: "totalChats",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Total Chats
              {column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : null}
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        return <div className="text-center font-medium">{row.getValue("totalChats")}</div>
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const person = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => confirmDeletePerson(row.original)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete person
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: people,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const processIpLocations = async (peopleArray: PersonData[]) => {
    setIsProcessingLocation(true)
    const updates: Partial<PersonData>[] = []
    
    for (const person of peopleArray) {
      if (person.ipAddress && !person.location) {
        try {
          const ipLocation = await getCountryForIP(person.ipAddress)
          if (ipLocation && ipLocation.country) {
            const flag = getCountryFlag(ipLocation.countryCode || ipLocation.country)
            const location = ipLocation.city && ipLocation.country 
              ? `${flag} ${ipLocation.city}, ${ipLocation.country}`
              : `${flag} ${ipLocation.country}`
            updates.push({
              id: person.id,
              location
            })
          }
        } catch (error) {
          console.error(`Error getting location for ${person.ipAddress}:`, error)
        }
      }
    }
    
    if (updates.length > 0) {
      setPeople(prev => prev.map(person => {
        const update = updates.find(u => u.id === person.id)
        return update ? { ...person, ...update } : person
      }))
    }
    
    setIsProcessingLocation(false)
  }

  const fetchPeopleData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch user identifications
      const identificationsResponse = await fetch('/api/chat-user-identifications')
      if (!identificationsResponse.ok) {
        throw new Error(`Failed to fetch identifications: ${identificationsResponse.status}`)
      }
      const identifications: ChatUserIdentification[] = await identificationsResponse.json()

      // Fetch chat logs for activity and IP data
      const logsResponse = await fetch('/api/chat-logs')
      if (!logsResponse.ok) {
        throw new Error(`Failed to fetch chat logs: ${logsResponse.status}`)
      }
      const logsData = await logsResponse.json()
      const logs: ChatLog[] = logsData.data || []

      // Process data to create people records
      const peopleMap = new Map<string, PersonData>()
      const sessionToPerson = new Map<string, string>() // Track which sessions belong to which person
      
      // Process identifications first
      identifications.forEach(identification => {
        // Create a unique key for each person (use email as primary identifier, fallback to session if no email)
        const personKey = identification.email 
          ? identification.email.toLowerCase()
          : `session_${identification.session_id}`
        
        const createdAt = new Date(identification.created_at)
        
        // Track session to person mapping
        sessionToPerson.set(identification.session_id, personKey)
        
        if (!peopleMap.has(personKey)) {
          peopleMap.set(personKey, {
            id: identification.id,
            email: identification.email,
            firstName: identification.first_name,
            lastName: identification.last_name,
            firstActivity: createdAt,
            lastActivity: createdAt,
            totalChats: 0,
            ipAddress: undefined
          })
        } else {
          // Update existing person record with any new information
          const person = peopleMap.get(personKey)!
          
          // Update names if they weren't set before but are available now
          if (!person.firstName && identification.first_name) {
            person.firstName = identification.first_name
          }
          if (!person.lastName && identification.last_name) {
            person.lastName = identification.last_name
          }
          
          // Update activity dates
          if (createdAt < person.firstActivity) {
            person.firstActivity = createdAt
          }
          if (createdAt > person.lastActivity) {
            person.lastActivity = createdAt
          }
        }
      })

      // Enhance with chat log data
      logs.forEach(log => {
        const personKey = sessionToPerson.get(log.session_id)
        if (personKey && peopleMap.has(personKey)) {
          const person = peopleMap.get(personKey)!
          const logDate = new Date(log.created_at)
          
          person.totalChats++
          if (logDate < person.firstActivity) {
            person.firstActivity = logDate
          }
          if (logDate > person.lastActivity) {
            person.lastActivity = logDate
          }
          
          // Store IP address for location lookup
          const ipAddress = log.ipAddress || log.ip_address
          if (ipAddress && !person.ipAddress) {
            person.ipAddress = ipAddress
          }
        }
      })

      const peopleArray = Array.from(peopleMap.values())
      setPeople(peopleArray)

      // Process IP locations in batches
      processIpLocations(peopleArray)
      
    } catch (error) {
      console.error('Error fetching people data:', error)
      toast.error('Failed to load people data')
    } finally {
      setIsLoading(false)
    }
  }

  const exportToCsv = () => {
    const headers = ['Email Address', 'First Name', 'Last Name', 'Location', 'First Activity', 'Last Activity', 'Total Chats']
    const csvData = [
      headers.join(','),
      ...people.map(person => [
        person.email || '',
        person.firstName || '',
        person.lastName || '',
        person.location || '',
        person.firstActivity.toLocaleDateString(),
        person.lastActivity.toLocaleDateString(),
        person.totalChats.toString()
      ].map(field => `"${field.replace(/"/g, '""')}"`).join(','))
    ]
    
    const csvContent = csvData.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `people-data-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    
    toast.success('People data exported successfully!')
  }

  useEffect(() => {
    fetchPeopleData()
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rootcard">
              <CardContent className="pt-3">
                <div className="text-center space-y-2">
                  <Skeleton className="h-8 w-16 mx-auto" />
                  <Skeleton className="h-4 w-20 mx-auto" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Table Container Skeleton */}
        <div className="w-full">
          <div className="rounded-xl border bg-white rootcard shadow-xs">
            {/* Table Header Controls Skeleton */}
            <div className="flex items-center justify-between mb-2 p-4">
              <div className="flex items-center justify-between space-x-3 w-full">
                <div className="relative w-86">
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-20" />
                </div>
              </div>
            </div>
            
            {/* Table Skeleton */}
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Table header skeletons - matching column count */}
                  <TableHead><Skeleton className="h-4 w-4" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-28" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-28" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-4" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Table row skeletons */}
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Skeleton */}
          <div className="flex items-center justify-end space-x-2 py-4">
            <Skeleton className="h-4 w-32" />
            <div className="space-x-2 flex">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-16" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">


      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="rootcard">
          <CardContent className="pt-3">
            <div className="text-center">
              <div className="text-2xl font-bold">{people.length}</div>
              <div className="text-sm text-gray-600">Total People</div>
            </div>
          </CardContent>
        </Card>
        <Card className="rootcard">
          <CardContent className="pt-3">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {people.filter(p => p.email).length}
              </div>
              <div className="text-sm text-gray-600">With Email</div>
            </div>
          </CardContent>
        </Card>
        <Card className="rootcard">
          <CardContent className="pt-3">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {people.reduce((sum, p) => sum + p.totalChats, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Chats</div>
            </div>
          </CardContent>
        </Card>
      </div>


      <div className="w-full">
        <div className="rounded-xl border bg-white rootcard shadow-xs">
          <div className="flex items-center justify-between mb-2 p-4">
            <div className="flex items-center justify-between space-x-3 w-full">
              <div className="relative w-86">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Filter emails..."
                  value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
                  onChange={(event) =>
                    table.getColumn("email")?.setFilterValue(event.target.value)
                  }
                  className="pl-10 w-full"
                />
              </div>
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Columns <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {table
                      .getAllColumns()
                      .filter((column) => column.getCanHide())
                      .map((column) => {
                        return (
                          <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) =>
                              column.toggleVisibility(!!value)
                            }
                          >
                            {column.id}
                          </DropdownMenuCheckboxItem>
                        )
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Actions
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {table.getFilteredSelectedRowModel().rows.length > 0 && (
                      <>
                        <DropdownMenuItem onClick={confirmBulkDelete} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete {table.getFilteredSelectedRowModel().rows.length} selected
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={exportToCsv}>
                      <Download className="h-4 w-4 mr-2" />
                      Export as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-100 text-center"
                  >
                    <div className="flex flex-col items-center justify-center py-8">
                      <Users className="h-8 w-8 text-neutral-400 mb-4" />
                      <p className="font-semibold text-gray-700">No people data found</p>
                      <p className="text-sm text-gray-500 mt-1">
                        People data will appear here when users identify themselves in your chatbots
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Person Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Person</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {personToDelete?.email || personToDelete?.firstName || 'this person'}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <p className="text-sm text-foreground mb-2">
              <strong>This action cannot be undone and will permanently delete:</strong>
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>All chat history with this person</li>
              <li>Any message revisions for their conversations</li>
              <li>Their identification information</li>
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePerson}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Person'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {table.getFilteredSelectedRowModel().rows.length} People</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {table.getFilteredSelectedRowModel().rows.length} selected people?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <p className="text-sm text-foreground mb-2">
              <strong>This action cannot be undone and will permanently delete:</strong>
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>All chat history with these people</li>
              <li>Any message revisions for their conversations</li>
              <li>Their identification information</li>
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : `Delete ${table.getFilteredSelectedRowModel().rows.length} People`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 