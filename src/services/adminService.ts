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

  // Log diagnostic warning
  console.warn('[AdminService Diagnostic]:', { message: msg, code: err?.code, status: err?.status });

  // If already in Arabic and clean, preserve it directly
  if (/[\u0600-\u06FF]/.test(msg) && !msg.includes('PostgREST') && !msg.includes('SQL')) {
    return msg;
  }

  if (
    full.includes('failed to send a request') ||
    full.includes('functionsfetcherror') ||
    full.includes('not_found') ||
    full.includes('not found') ||
    full.includes('404')
  ) {
    return 'دالة السحابة (manage-admin-user) لم يتم نشرها على Supabase بعد أو تعذر الاتصال بها.';
  }

  if (full.includes('23505') || full.includes('duplicate key') || full.includes('already registered') || full.includes('already exists') || full.includes('email_exists')) {
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

  return msg || 'تعذر تنفيذ العملية الإدارية، يرجى المحاولة مرة أخرى';
}

/**
 * Invokes the manage-admin-user Edge Function and parses error response bodies
 */
async function invokeEdgeFunction<T = any>(bodyPayload: any): Promise<AdminServiceResult<T>> {
  const { data, error } = await supabase.functions.invoke('manage-admin-user', {
    body: bodyPayload
  });

  if (error) {
    let detailedMessage = error.message;
    let errorCode = 'EDGE_FUNCTION_ERROR';
    const statusCode = (error as any).status;

    // Check if error has response context from Edge Function (FunctionsHttpError)
    if ((error as any).context && typeof (error as any).context.json === 'function') {
      try {
        const errPayload = await (error as any).context.json();
        console.warn('[AdminService] Edge Function Error Body:', errPayload);
        if (errPayload) {
          if (errPayload.message) detailedMessage = errPayload.message;
          else if (errPayload.error) detailedMessage = errPayload.error;
          if (errPayload.code) errorCode = errPayload.code;
        }
      } catch (_) {
        // Response context stream may not be JSON
      }
    }

    const customErr: any = new Error(detailedMessage);
    customErr.code = errorCode;
    customErr.status = statusCode;
    customErr.originalError = error;
    throw customErr;
  }

  if (data && (data.error || data.success === false)) {
    const customErr: any = new Error(data.message || data.error || 'فشلت العملية الإدارية');
    if (data.code) customErr.code = data.code;
    throw customErr;
  }

  return data as AdminServiceResult<T>;
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
      return await invokeEdgeFunction<AdminUser>({
        action: 'create',
        ...params
      });
    } catch (err: any) {
      throw new Error(translateAdminError(err));
    }
  },

  /**
   * Update admin user details and permissions via Edge Function
   */
  async updateAdmin(params: UpdateAdminParams): Promise<AdminServiceResult<AdminUser>> {
    try {
      return await invokeEdgeFunction<AdminUser>({
        action: 'update',
        ...params
      });
    } catch (err: any) {
      throw new Error(translateAdminError(err));
    }
  },

  /**
   * Activate or Deactivate an Admin User
   */
  async toggleActive(email: string): Promise<AdminServiceResult<{ is_active: boolean }>> {
    try {
      return await invokeEdgeFunction<{ is_active: boolean }>({
        action: 'toggle_active',
        email
      });
    } catch (err: any) {
      throw new Error(translateAdminError(err));
    }
  },

  /**
   * Delete an Admin User (Super Admin only)
   */
  async deleteAdmin(email: string): Promise<AdminServiceResult> {
    try {
      return await invokeEdgeFunction({
        action: 'delete',
        email
      });
    } catch (err: any) {
      throw new Error(translateAdminError(err));
    }
  },

  /**
   * Re-send password reset or invitation link
   */
  async resetPassword(email: string): Promise<AdminServiceResult> {
    try {
      return await invokeEdgeFunction({
        action: 'reset_password',
        email
      });
    } catch (err: any) {
      throw new Error(translateAdminError(err));
    }
  }
};
