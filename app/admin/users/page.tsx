import { AdminUsersClient } from '@/components/admin/users/users-client'

export const metadata = {
  title: 'User Management - SPACELY',
  description: 'Manage registered users and their account status.',
}

export default function AdminUsersPage() {
  return <AdminUsersClient />
} 