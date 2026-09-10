import React from 'react'
import { useAuth } from '@/context/AuthContext'

interface PermissionGuardProps {
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  fallback?: React.ReactNode
  children: React.ReactNode
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  children
}) => {
  const { hasPermission, user } = useAuth()

  if (user?.type === 'SUPER_ADMIN') {
    return <>{children}</>
  }

  const checkPerms = permission ? [permission, ...permissions] : permissions

  if (checkPerms.length === 0) {
    return <>{children}</>
  }

  const isAllowed = requireAll
    ? checkPerms.every(p => hasPermission(p))
    : checkPerms.some(p => hasPermission(p))

  if (!isAllowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
