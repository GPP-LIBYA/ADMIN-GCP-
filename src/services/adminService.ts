import { supabase } from '../lib/supabase';
import type { AdminUser, AdminRole } from '../types';

export interface CreateAdminParams {
  email: string;
  full_name?: string;
  role: 'Admin' | 'Viewer';
  permissions?: Partial<Record<string, boolean>>;
  invite_mode?: boolean;
  password?: string;
}

export interface UpdateAdminParams {
  email: string;
  full_name?: string;
  role?: AdminRole;
  permissions?: Partial<Record<string, boolean>>;
}

export interface AdminServiceResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  temp_password?: string | null;
  invited?: boolean;
}

/**
 * Helper to translate technical errors into friendly Arabic messages
 */
export function translateAdminError(err: any): string {
  if (!err) return 'حدث خطأ غير معروف';
  
  const msg = typeof err === 'string' ? err : err.message || '';
  const details = typeof err === 'object' && err.details ? String(err.details) : '';
  const full = `${msg} ${details}`.toLowerCase();

  // Log technical detail to console only for development
  console.error('[AdminService Technical Error]:', err);

  if (full.includes('23505') || full.includes('duplicate key') || full.includes('already registered') || full.includes('مسجل بالفعل')) {
    return 'هذا البريد الإلكتروني مسجل بالفعل كمستخدم إداري';
  }
  if (full.includes('403') || full.includes('forbidden') || full.includes('unauthorized') || full.includes('صلاحية')) {
    return 'ليس لديك صلاحية لتنفيذ هذه العملية';
  }
  if (full.includes('rls') || full.includes('policy')) {
    return 'ليس لديك صلاحية الوصول أو التعديل';
  }
  if (full.includes('invalid email') || full.includes('البريد')) {
    return 'صيغة البريد الإلكتروني غير صحيحة';
  }
  if (full.includes('timeout') || full.includes('abort')) {
    return 'انتهت مهلة الاتصال بالخادم، يرجى المحاولة لاحقاً';
  }

  // If already in Arabic and clean, keep it
  if (/[\u0600-\u06FF]/.test(msg) && !msg.includes('PostgREST') && !msg.includes('SQL')) {
    return msg;
  }

  return 'تعذر تنفيذ العملية الإدارية، يرجى المحاولة مرة أخرى';
}

/**
 * Centralized service for Admin User operations via Supabase Edge Function
 */
export const adminService = {
  /**
   * Create a new Admin user via Edge Function
   */
  async createAdmin(params: CreateAdminParams): Promise<AdminServiceResult<AdminUser>> {
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin-user', {
        body: {
          action: 'create',
          ...params
        }
      });

      if (error) {
        // Try fallback to create-admin-user function
        const fallback = await supabase.functions.invoke('create-admin-user', {
          body: params
        });

        if (fallback.error) {
          throw new Error(fallback.error.message || error.message);
        }

        return fallback.data as AdminServiceResult<AdminUser>;
      }

      if (data && data.error) {
        throw new Error(data.error);
      }

      return data as AdminServiceResult<AdminUser>;
    } catch (err: any) {
      throw new Error(translateAdminError(err));
    }
  },

  /**
   * Update admin user details and permissions via Edge Function
   */
  async updateAdmin(params: UpdateAdminParams): Promise<AdminServiceResult<AdminUser>> {
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin-user', {
        body: {
          action: 'update',
          ...params
        }
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      return data as AdminServiceResult<AdminUser>;
    } catch (err: any) {
      throw new Error(translateAdminError(err));
    }
  },

  /**
   * Activate or Deactivate an Admin User
   */
  async toggleActive(email: string): Promise<AdminServiceResult<{ is_active: boolean }>> {
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin-user', {
        body: {
          action: 'toggle_active',
          email
        }
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      return data as AdminServiceResult<{ is_active: boolean }>;
    } catch (err: any) {
      throw new Error(translateAdminError(err));
    }
  },

  /**
   * Delete an Admin User (Super Admin only)
   */
  async deleteAdmin(email: string): Promise<AdminServiceResult> {
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin-user', {
        body: {
          action: 'delete',
          email
        }
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      return data as AdminServiceResult;
    } catch (err: any) {
      throw new Error(translateAdminError(err));
    }
  },

  /**
   * Re-send password reset or invitation link
   */
  async resetPassword(email: string): Promise<AdminServiceResult> {
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin-user', {
        body: {
          action: 'reset_password',
          email
        }
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      return data as AdminServiceResult;
    } catch (err: any) {
      throw new Error(translateAdminError(err));
    }
  }
};
