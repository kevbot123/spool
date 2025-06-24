import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to admin on root access
  redirect('/admin')
} 