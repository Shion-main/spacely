import { createServiceClient } from '@/lib/supabase/server'

export type AuditAction = 
  | 'login'
  | 'logout' 
  | 'approve_post'
  | 'reject_post'
  | 'archive_post'
  | 'delete_post'
  | 'restore_post'
  | 'update_post_status'
  | 'ban_user'
  | 'unban_user'
  | 'view_sensitive_data'
  | 'flag_post'
  | 'unflag_post'
  | 'access_reports'
  | 'update_report_status'

export interface AuditLogData {
  adminId: string
  action: AuditAction
  tableName?: string
  recordId?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export class AuditLogger {
  private static supabase = createServiceClient()

  /**
   * Log an admin action to the audit_logs table
   */
  static async log(data: AuditLogData): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('audit_logs')
        .insert({
          admin_id: data.adminId,
          action_type: data.action,
          table_name: data.tableName || null,
          record_id: data.recordId || null,
          old_values: data.oldValues || null,
          new_values: data.newValues || null,
          metadata: {
            ip_address: data.ipAddress,
            user_agent: data.userAgent,
            timestamp: new Date().toISOString(),
            ...data.metadata
          },
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to log audit entry:', error)
      } else {
        console.log(`✅ Audit logged: ${data.action} by admin ${data.adminId}`)
      }
    } catch (error) {
      console.error('Error logging audit entry:', error)
    }
  }

  /**
   * Log admin login
   */
  static async logLogin(adminId: string, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      adminId,
      action: 'login',
      metadata: {
        login_time: new Date().toISOString(),
        ...metadata
      }
    })
  }

  /**
   * Log admin logout
   */
  static async logLogout(adminId: string, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      adminId,
      action: 'logout',
      metadata: {
        logout_time: new Date().toISOString(),
        ...metadata
      }
    })
  }

  /**
   * Log post approval/rejection/archival
   */
  static async logPostAction(
    adminId: string, 
    action: 'approve_post' | 'reject_post' | 'archive_post' | 'delete_post' | 'restore_post' | 'update_post_status',
    postId: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      adminId,
      action,
      tableName: 'posts',
      recordId: postId,
      oldValues,
      newValues,
      metadata
    })
  }

  /**
   * Log user management actions
   */
  static async logUserAction(
    adminId: string,
    action: 'ban_user' | 'unban_user',
    userId: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      adminId,
      action,
      tableName: 'users',
      recordId: userId,
      oldValues,
      newValues,
      metadata
    })
  }

  /**
   * Log flagging actions
   */
  static async logFlagAction(
    adminId: string,
    action: 'flag_post' | 'unflag_post',
    postId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      adminId,
      action,
      tableName: 'posts',
      recordId: postId,
      metadata
    })
  }

  /**
   * Log report status changes
   */
  static async logReportAction(
    adminId: string,
    action: 'update_report_status',
    reportId: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      adminId,
      action: 'update_report_status',
      tableName: 'reports',
      recordId: reportId,
      oldValues,
      newValues,
      metadata
    })
  }

  /**
   * Log sensitive data access
   */
  static async logDataAccess(
    adminId: string,
    resource: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      adminId,
      action: 'view_sensitive_data',
      metadata: {
        resource,
        access_time: new Date().toISOString(),
        ...metadata
      }
    })
  }

  /**
   * Extract IP address and user agent from request
   */
  static extractRequestMetadata(request: Request): { ipAddress?: string; userAgent?: string } {
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    return { ipAddress, userAgent }
  }
} 