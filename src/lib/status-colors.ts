export type ContentStatus = 'draft' | 'published'

export function getStatusColor(status: ContentStatus, pending = false): string {
  switch (status) {
    case 'published':
      return pending ? 'bg-blue-600' : 'bg-green-500'
    case 'draft':
    default:
      return 'bg-gray-200'
  }
} 