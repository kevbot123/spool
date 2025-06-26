import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to CMS interface on root access
  redirect('/admin')
} 