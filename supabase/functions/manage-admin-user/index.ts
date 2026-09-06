import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[manage-admin-user][INIT][MISSING_CONFIG]', 'Missing Supabase Server Config (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)')
      return new Response(
        JSON.stringify({ success: false, code: 'SERVER_CONFIG_MISSING', message: 'إعدادات الخادم غير مكتملة (Missing Supabase Server Config)', error: 'Missing Supabase Server Config' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 1. Verify caller session from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.warn('[manage-admin-user][AUTH][MISSING_HEADER]', 'Missing Authorization Header')
      return new Response(
        JSON.stringify({ success: false, code: 'UNAUTHORIZED', message: 'غير مصرح بالدخول (Missing Authorization Header)', error: 'Missing Authorization Header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      console.warn('[manage-admin-user][AUTH][MISSING_TOKEN]', 'Token is empty')
      return new Response(
        JSON.stringify({ success: false, code: 'UNAUTHORIZED', message: 'رمز الدخول مفقود (Missing Token)', error: 'Missing Token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Initialize Admin Supabase Client (Service Role - Server Side ONLY)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    // Validate the caller's JWT token
    const { data: { user: callerUser }, error: tokenErr } = await supabaseAdmin.auth.getUser(token)
    if (tokenErr || !callerUser) {
      console.warn('[manage-admin-user][AUTH][INVALID_TOKEN]', tokenErr?.message || 'callerUser not found')
      return new Response(
        JSON.stringify({ success: false, code: 'INVALID_TOKEN', message: 'جلسة الدخول غير صالحة أو منتهية، يرجى تسجيل الدخول مجدداً', error: tokenErr?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // 2. Verify caller in admin_users table strictly by auth_user_id
    const { data: callerAdmin, error: callerAdminErr } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', callerUser.id)
      .maybeSingle()

    if (callerAdminErr || !callerAdmin) {
      console.warn('[manage-admin-user][AUTH][CALLER_NOT_ADMIN]', callerAdminErr?.message || 'No admin record found for auth_user_id')
      return new Response(
        JSON.stringify({ success: false, code: 'NOT_ADMIN', message: 'المستخدم غير مسجل كمسؤول إداري موثق في النظام (لم يتم العثور على auth_user_id مطابق)', error: 'Caller admin record not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    if (!callerAdmin.is_active) {
      console.warn('[manage-admin-user][AUTH][CALLER_INACTIVE]', 'Caller admin is deactivated')
      return new Response(
        JSON.stringify({ success: false, code: 'ACCOUNT_DEACTIVATED', message: 'تم تعطيل حسابك الإداري، تواصل مع الإدارة العليا', error: 'Caller admin deactivated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Parse request body
    const body = await req.json().catch(() => ({}))
    const action = body.action || 'create'

    // Diagnostic logging of incoming payload (strictly non-sensitive fields)
    console.log('[manage-admin-user] action:', action)
    console.log('[manage-admin-user] hasEmail:', !!body.email)
    console.log('[manage-admin-user] hasFullName:', !!body.full_name)
    console.log('[manage-admin-user] role:', body.role)
    console.log('[manage-admin-user] hasPassword:', !!body.password)
    console.log('[manage-admin-user] inviteMode:', body.invite_mode)
    console.log('[manage-admin-user] hasPermissions:', !!body.permissions)
    console.log('[manage-admin-user] callerRole:', callerAdmin.role)

    // ==========================================
    // ACTION: CREATE ADMIN USER
    // ==========================================
    if (action === 'create') {
      // Must be Super Admin to create users
      if (callerAdmin.role !== 'super_admin') {
        console.warn('[manage-admin-user][create][FORBIDDEN]', 'Non-super-admin caller attempted to create admin')
        return new Response(
          JSON.stringify({ success: false, code: 'FORBIDDEN', message: 'ليس لديك صلاحية لتنفيذ هذه العملية. تقتصر إضافة المسؤولين على Super Admin فقط.', error: 'Forbidden' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }

      const email = (body.email || '').trim().toLowerCase()
      const fullName = (body.full_name || '').trim()
      let role = body.role || 'Admin'
      const permissions = body.permissions || {}
      const inviteMode = body.invite_mode !== false // Default to invitation flow
      const password = body.password

      if (!email || !email.includes('@')) {
        console.warn('[manage-admin-user][create][INVALID_EMAIL]', 'Email missing or invalid format')
        return new Response(
          JSON.stringify({ success: false, code: 'INVALID_PAYLOAD', message: 'البريد الإلكتروني غير صحيح', error: 'Invalid email' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Security rule: UI cannot create super_admin by default
      if (role === 'super_admin' && !body.allow_super_admin) {
        role = 'Admin'
      }

      // 3. Check if email already exists in admin_users
      const { data: existingAdmin, error: existingAdminErr } = await supabaseAdmin
        .from('admin_users')
        .select('id, email')
        .eq('email', email)
        .maybeSingle()

      if (existingAdminErr) {
        console.warn('[manage-admin-user][create][CHECK_ADMIN_QUERY_WARN]', existingAdminErr.message)
      }

      if (existingAdmin) {
        console.warn('[manage-admin-user][create][EMAIL_EXISTS_ADMIN_USERS]', `Email ${email} already exists in admin_users table (id: ${existingAdmin.id})`)
        return new Response(
          JSON.stringify({ success: false, code: 'EMAIL_EXISTS', message: 'هذا البريد الإلكتروني مسجل بالفعل كمستخدم إداري', error: 'Email already registered in admin_users' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // 4. Check if user already exists in Supabase Auth
      const { data: { users: authUsersList }, error: listUsersErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      if (listUsersErr) {
        console.warn('[manage-admin-user][create][LIST_USERS_WARN]', listUsersErr.message)
      }
      const existingAuthUser = authUsersList?.find(u => u.email?.toLowerCase() === email)

      if (existingAuthUser) {
        console.warn('[manage-admin-user][create][EMAIL_EXISTS_AUTH_USERS]', `Email ${email} already exists in auth.users (auth_id: ${existingAuthUser.id})`)
        return new Response(
          JSON.stringify({ success: false, code: 'AUTH_USER_EXISTS', message: 'هذا البريد الإلكتروني مسجل بالفعل في نظام الحسابات (Auth)', error: 'Email already exists in Supabase Auth' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // 5. Create user in Supabase Auth
      let newAuthUser = null
      let usedTempPassword: string | null = null

      if (!inviteMode && password && password.length >= 6) {
        // Direct creation with temporary password
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName, role }
        })

        if (createErr) {
          console.error('[manage-admin-user][create][AUTH_CREATE_FAILED]', {
            status: (createErr as any).status,
            message: createErr.message
          })
          return new Response(
            JSON.stringify({
              success: false,
              code: (createErr as any).code || 'AUTH_CREATE_FAILED',
              message: 'تعذر إنشاء المستخدم في نظام المصادقة: ' + createErr.message,
              error: createErr.message
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
        newAuthUser = created.user
        usedTempPassword = password
      } else {
        // Invitation Flow (Default & Recommended)
        const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName, role }
        })

        if (inviteErr) {
          console.warn('[manage-admin-user][create][INVITE_FALLBACK]', inviteErr.message)
          // Secure Fallback: Generate secure temporary password
          usedTempPassword = 'Gpp#' + Math.random().toString(36).slice(-8) + '!'
          const { data: createdFallback, error: fallbackErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: usedTempPassword,
            email_confirm: true,
            user_metadata: { full_name: fullName, role }
          })

          if (fallbackErr) {
            console.error('[manage-admin-user][create][AUTH_FALLBACK_FAILED]', {
              status: (fallbackErr as any).status,
              message: fallbackErr.message
            })
            return new Response(
              JSON.stringify({
                success: false,
                code: (fallbackErr as any).code || 'AUTH_CREATE_FAILED',
                message: 'تعذر إنشاء المستخدم في نظام المصادقة: ' + fallbackErr.message,
                error: fallbackErr.message
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
          }
          newAuthUser = createdFallback.user
        } else {
          newAuthUser = invited.user
        }
      }

      // 6. Insert record into admin_users table
      const now = new Date().toISOString()
      const isViewer = role === 'Viewer'

      const newAdminPayload: any = {
        auth_user_id: newAuthUser.id, // Linked to Auth User ID (UUID)
        email,
        full_name: fullName || null,
        role,
        is_active: true,
        can_manage_admins: isViewer ? false : (permissions.can_manage_admins ?? false),
        can_manage_prices: isViewer ? false : (permissions.can_manage_prices ?? false),
        can_view_reports: isViewer ? false : (permissions.can_view_reports ?? true),
        can_import_prices: isViewer ? false : (permissions.can_import_prices ?? false),
        can_manage_news: isViewer ? false : (permissions.can_manage_news ?? false),
        can_manage_analysis: isViewer ? false : (permissions.can_manage_analysis ?? false),
        can_manage_messages: isViewer ? false : (permissions.can_manage_messages ?? false),
        can_view_visits: isViewer ? false : (permissions.can_view_visits ?? false),
        can_manage_settings: isViewer ? false : (permissions.can_manage_settings ?? false),
        created_at: now,
        updated_at: now
      }

      const { data: insertedAdmin, error: insertErr } = await supabaseAdmin
        .from('admin_users')
        .insert([newAdminPayload])
        .select()
        .single()

      if (insertErr) {
        console.error('[manage-admin-user][create][INSERT_ADMIN_USERS_FAILED]', {
          code: insertErr.code,
          message: insertErr.message,
          details: insertErr.details,
          hint: insertErr.hint
        })
        // Clean up Auth user to prevent orphaned Auth account
        if (newAuthUser?.id) {
          await supabaseAdmin.auth.admin.deleteUser(newAuthUser.id).catch(err => console.warn('[manage-admin-user][create][AUTH_CLEANUP_ERR]', err?.message))
        }
        return new Response(
          JSON.stringify({
            success: false,
            code: insertErr.code || 'DB_INSERT_FAILED',
            message: 'تعذر حفظ بيانات المستخدم الإداري في قاعدة البيانات: ' + insertErr.message,
            error: insertErr.message
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      console.log('[manage-admin-user][create][SUCCESS]', `Created admin user: ${email} (id: ${insertedAdmin.id})`)
      return new Response(
        JSON.stringify({
          success: true,
          message: 'تم إضافة المستخدم الإداري بنجاح',
          data: insertedAdmin,
          temp_password: usedTempPassword,
          invited: !usedTempPassword
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ==========================================
    // ACTION: UPDATE ADMIN USER
    // ==========================================
    if (action === 'update') {
      if (callerAdmin.role !== 'super_admin') {
        console.warn('[manage-admin-user][update][FORBIDDEN]', 'Non-super-admin caller attempted to update admin')
        return new Response(
          JSON.stringify({ success: false, code: 'FORBIDDEN', message: 'ليس لديك صلاحية لتنفيذ هذه العملية. تقتصر إدارة المسؤولين على Super Admin فقط.', error: 'Forbidden' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }

      const targetEmail = (body.email || '').trim().toLowerCase()
      const fullName = body.full_name !== undefined ? (body.full_name || '').trim() : undefined
      const newRole = body.role
      const permissions = body.permissions || {}

      if (!targetEmail) {
        console.warn('[manage-admin-user][update][MISSING_EMAIL]', 'Target email is required')
        return new Response(
          JSON.stringify({ success: false, code: 'INVALID_PAYLOAD', message: 'البريد الإلكتروني للمستخدم المستهدف مطلوب', error: 'Target email required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Fetch target user
      const { data: targetAdmin, error: targetErr } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .eq('email', targetEmail)
        .maybeSingle()

      if (targetErr || !targetAdmin) {
        console.warn('[manage-admin-user][update][TARGET_NOT_FOUND]', targetErr?.message || 'Target admin user not found')
        return new Response(
          JSON.stringify({ success: false, code: 'NOT_FOUND', message: 'المستخدم الإداري المستهدف غير موجود', error: 'Target admin not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      // Security: Cannot modify another Super Admin
      if (targetAdmin.role === 'super_admin' && targetAdmin.auth_user_id !== callerAdmin.auth_user_id) {
        console.warn('[manage-admin-user][update][FORBIDDEN_SUPER_ADMIN]', 'Cannot modify another Super Admin')
        return new Response(
          JSON.stringify({ success: false, code: 'FORBIDDEN', message: 'لا يمكن تعديل بيانات Super Admin آخر', error: 'Cannot modify another Super Admin' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }

      const isViewer = (newRole || targetAdmin.role) === 'Viewer'

      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (fullName !== undefined) updateData.full_name = fullName || null
      if (newRole && newRole !== 'super_admin') updateData.role = newRole
      
      // Update permissions
      if (isViewer) {
        updateData.can_manage_admins = false
        updateData.can_manage_prices = false
        updateData.can_import_prices = false
        updateData.can_manage_news = false
        updateData.can_manage_analysis = false
        updateData.can_manage_messages = false
        updateData.can_view_visits = false
        updateData.can_manage_settings = false
      } else if (body.permissions) {
        if (permissions.can_manage_admins !== undefined) updateData.can_manage_admins = permissions.can_manage_admins
        if (permissions.can_manage_prices !== undefined) updateData.can_manage_prices = permissions.can_manage_prices
        if (permissions.can_import_prices !== undefined) updateData.can_import_prices = permissions.can_import_prices
        if (permissions.can_manage_news !== undefined) updateData.can_manage_news = permissions.can_manage_news
        if (permissions.can_manage_analysis !== undefined) updateData.can_manage_analysis = permissions.can_manage_analysis
        if (permissions.can_manage_messages !== undefined) updateData.can_manage_messages = permissions.can_manage_messages
        if (permissions.can_view_visits !== undefined) updateData.can_view_visits = permissions.can_view_visits
        if (permissions.can_manage_settings !== undefined) updateData.can_manage_settings = permissions.can_manage_settings
      }

      const { data: updatedAdmin, error: updateErr } = await supabaseAdmin
        .from('admin_users')
        .update(updateData)
        .eq('email', targetEmail)
        .select()
        .single()

      if (updateErr) {
        console.error('[manage-admin-user][update][DB_UPDATE_FAILED]', {
          code: updateErr.code,
          message: updateErr.message,
          details: updateErr.details
        })
        return new Response(
          JSON.stringify({
            success: false,
            code: updateErr.code || 'DB_UPDATE_FAILED',
            message: 'تعذر تحديث بيانات المستخدم في قاعدة البيانات: ' + updateErr.message,
            error: updateErr.message
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Also update Auth metadata if full_name or role changed
      if (targetAdmin.auth_user_id) {
        await supabaseAdmin.auth.admin.updateUserById(targetAdmin.auth_user_id, {
          user_metadata: {
            full_name: updateData.full_name ?? targetAdmin.full_name,
            role: updateData.role ?? targetAdmin.role
          }
        }).catch(err => console.warn('[manage-admin-user][update][AUTH_SYNC_WARN]', err?.message))
      }

      console.log('[manage-admin-user][update][SUCCESS]', `Updated admin: ${targetEmail}`)
      return new Response(
        JSON.stringify({
          success: true,
          message: 'تم تحديث بيانات وصلاحيات المستخدم بنجاح',
          data: updatedAdmin
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ==========================================
    // ACTION: TOGGLE ACTIVE (ACTIVATE / DEACTIVATE)
    // ==========================================
    if (action === 'toggle_active') {
      if (callerAdmin.role !== 'super_admin') {
        console.warn('[manage-admin-user][toggle_active][FORBIDDEN]', 'Non-super-admin caller attempted to toggle admin status')
        return new Response(
          JSON.stringify({ success: false, code: 'FORBIDDEN', message: 'ليس لديك صلاحية لتنفيذ هذه العملية. تقتصر إدارة التفعيل والتعطيل على Super Admin فقط.', error: 'Forbidden' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }

      const targetEmail = (body.email || '').trim().toLowerCase()
      if (!targetEmail) {
        console.warn('[manage-admin-user][toggle_active][MISSING_EMAIL]', 'Email is required')
        return new Response(
          JSON.stringify({ success: false, code: 'INVALID_PAYLOAD', message: 'البريد الإلكتروني مطلوب', error: 'Email required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      if (targetEmail === callerAdmin.email?.toLowerCase()) {
        console.warn('[manage-admin-user][toggle_active][SELF_DEACTIVATE]', 'Caller attempted to deactivate self')
        return new Response(
          JSON.stringify({ success: false, code: 'SELF_ACTION_FORBIDDEN', message: 'لا يمكنك تعطيل حسابك الخاص', error: 'Cannot deactivate own account' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const { data: targetAdmin, error: fetchTargetErr } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .eq('email', targetEmail)
        .maybeSingle()

      if (fetchTargetErr || !targetAdmin) {
        console.warn('[manage-admin-user][toggle_active][TARGET_NOT_FOUND]', fetchTargetErr?.message || 'Target admin not found')
        return new Response(
          JSON.stringify({ success: false, code: 'NOT_FOUND', message: 'المستخدم الإداري غير موجود', error: 'Target admin not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      if (targetAdmin.auth_user_id === callerAdmin.auth_user_id || targetEmail === callerAdmin.email?.toLowerCase()) {
        console.warn('[manage-admin-user][toggle_active][SELF_DEACTIVATE]', 'Caller attempted to deactivate self by auth_user_id')
        return new Response(
          JSON.stringify({ success: false, code: 'SELF_ACTION_FORBIDDEN', message: 'لا يمكنك تعطيل حسابك الخاص', error: 'Cannot deactivate own account' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      if (targetAdmin.role === 'super_admin') {
        console.warn('[manage-admin-user][toggle_active][SUPER_ADMIN_DEACTIVATE]', 'Attempted to deactivate super_admin')
        return new Response(
          JSON.stringify({ success: false, code: 'SUPER_ADMIN_IMMUTABLE', message: 'لا يمكن تعطيل حساب Super Admin', error: 'Cannot deactivate Super Admin' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const newActiveState = !targetAdmin.is_active

      // 1. Update in database
      const { error: toggleErr } = await supabaseAdmin
        .from('admin_users')
        .update({
          is_active: newActiveState,
          updated_at: new Date().toISOString()
        })
        .eq('email', targetEmail)

      if (toggleErr) {
        console.error('[manage-admin-user][toggle_active][DB_UPDATE_FAILED]', {
          code: toggleErr.code,
          message: toggleErr.message,
          details: toggleErr.details
        })
        return new Response(
          JSON.stringify({
            success: false,
            code: toggleErr.code || 'DB_UPDATE_FAILED',
            message: 'تعذر تعديل حالة المستخدم في قاعدة البيانات: ' + toggleErr.message,
            error: toggleErr.message
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // 2. Also ban or unban in Supabase Auth to prevent new token issuance
      if (targetAdmin.auth_user_id) {
        if (!newActiveState) {
          // Ban for 100 years
          await supabaseAdmin.auth.admin.updateUserById(targetAdmin.auth_user_id, {
            ban_duration: '876600h'
          }).catch(err => console.warn('[manage-admin-user][toggle_active][AUTH_BAN_WARN]', err?.message))
        } else {
          // Remove ban
          await supabaseAdmin.auth.admin.updateUserById(targetAdmin.auth_user_id, {
            ban_duration: 'none'
          }).catch(err => console.warn('[manage-admin-user][toggle_active][AUTH_UNBAN_WARN]', err?.message))
        }
      }

      console.log('[manage-admin-user][toggle_active][SUCCESS]', `Toggled ${targetEmail} active to ${newActiveState}`)
      return new Response(
        JSON.stringify({
          success: true,
          message: newActiveState ? 'تم تفعيل الحساب بنجاح' : 'تم تعطيل الحساب بنجاح',
          is_active: newActiveState
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ==========================================
    // ACTION: DELETE ADMIN USER
    // ==========================================
    if (action === 'delete') {
      if (callerAdmin.role !== 'super_admin') {
        console.warn('[manage-admin-user][delete][FORBIDDEN]', 'Non-super-admin caller attempted to delete admin')
        return new Response(
          JSON.stringify({ success: false, code: 'FORBIDDEN', message: 'ليس لديك صلاحية لتنفيذ هذه العملية. يقتصر الحذف على Super Admin فقط.', error: 'Forbidden' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }

      const targetEmail = (body.email || '').trim().toLowerCase()
      if (!targetEmail) {
        console.warn('[manage-admin-user][delete][MISSING_EMAIL]', 'Email is required')
        return new Response(
          JSON.stringify({ success: false, code: 'INVALID_PAYLOAD', message: 'البريد الإلكتروني مطلوب', error: 'Email required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      if (targetEmail === callerAdmin.email?.toLowerCase()) {
        console.warn('[manage-admin-user][delete][SELF_DELETE]', 'Caller attempted to delete own account')
        return new Response(
          JSON.stringify({ success: false, code: 'SELF_ACTION_FORBIDDEN', message: 'لا يمكنك حذف حسابك الخاص', error: 'Cannot delete own account' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const { data: targetAdmin, error: fetchTargetErr } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .eq('email', targetEmail)
        .maybeSingle()

      if (fetchTargetErr || !targetAdmin) {
        console.warn('[manage-admin-user][delete][TARGET_NOT_FOUND]', fetchTargetErr?.message || 'Target admin not found')
        return new Response(
          JSON.stringify({ success: false, code: 'NOT_FOUND', message: 'المستخدم الإداري غير موجود', error: 'Target admin not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      if (targetAdmin.auth_user_id === callerAdmin.auth_user_id || targetEmail === callerAdmin.email?.toLowerCase()) {
        console.warn('[manage-admin-user][delete][SELF_DELETE]', 'Caller attempted to delete own account by auth_user_id')
        return new Response(
          JSON.stringify({ success: false, code: 'SELF_ACTION_FORBIDDEN', message: 'لا يمكنك حذف حسابك الخاص', error: 'Cannot delete own account' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      if (targetAdmin.role === 'super_admin') {
        // Count super admins
        const { count, error: countErr } = await supabaseAdmin
          .from('admin_users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'super_admin')

        if (countErr) {
          console.warn('[manage-admin-user][delete][COUNT_SUPER_ADMIN_WARN]', countErr.message)
        }

        if (count !== null && count <= 1) {
          console.warn('[manage-admin-user][delete][LAST_SUPER_ADMIN]', 'Attempted to delete the last Super Admin')
          return new Response(
            JSON.stringify({ success: false, code: 'LAST_SUPER_ADMIN', message: 'لا يمكن حذف آخر Super Admin في النظام!', error: 'Cannot delete last Super Admin' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
      }

      // Delete from database
      const { error: deleteDbErr } = await supabaseAdmin
        .from('admin_users')
        .delete()
        .eq('email', targetEmail)

      if (deleteDbErr) {
        console.error('[manage-admin-user][delete][DB_DELETE_FAILED]', {
          code: deleteDbErr.code,
          message: deleteDbErr.message,
          details: deleteDbErr.details
        })
        return new Response(
          JSON.stringify({
            success: false,
            code: deleteDbErr.code || 'DB_DELETE_FAILED',
            message: 'تعذر حذف المستخدم من قاعدة البيانات: ' + deleteDbErr.message,
            error: deleteDbErr.message
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Delete from Auth
      if (targetAdmin.auth_user_id) {
        await supabaseAdmin.auth.admin.deleteUser(targetAdmin.auth_user_id).catch(err => console.warn('[manage-admin-user][delete][AUTH_DELETE_WARN]', err?.message))
      }

      console.log('[manage-admin-user][delete][SUCCESS]', `Deleted admin user: ${targetEmail}`)
      return new Response(
        JSON.stringify({
          success: true,
          message: 'تم حذف المستخدم نهائياً بنجاح'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ==========================================
    // ACTION: RESET PASSWORD / RESEND INVITE
    // ==========================================
    if (action === 'reset_password' || action === 'resend_invite') {
      if (callerAdmin.role !== 'super_admin') {
        console.warn('[manage-admin-user][reset_password][FORBIDDEN]', 'Non-super-admin caller attempted to reset password')
        return new Response(
          JSON.stringify({ success: false, code: 'FORBIDDEN', message: 'ليس لديك صلاحية لتنفيذ هذه العملية.', error: 'Forbidden' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }

      const targetEmail = (body.email || '').trim().toLowerCase()
      if (!targetEmail) {
        console.warn('[manage-admin-user][reset_password][MISSING_EMAIL]', 'Email is required')
        return new Response(
          JSON.stringify({ success: false, code: 'INVALID_PAYLOAD', message: 'البريد الإلكتروني مطلوب', error: 'Email required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const { data: targetAdmin, error: fetchTargetErr } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .eq('email', targetEmail)
        .maybeSingle()

      if (fetchTargetErr || !targetAdmin) {
        console.warn('[manage-admin-user][reset_password][TARGET_NOT_FOUND]', fetchTargetErr?.message || 'Target admin not found')
        return new Response(
          JSON.stringify({ success: false, code: 'NOT_FOUND', message: 'المستخدم الإداري غير موجود', error: 'Target admin not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(targetEmail)
      if (resetErr) {
        console.error('[manage-admin-user][reset_password][AUTH_RESET_FAILED]', {
          status: (resetErr as any).status,
          message: resetErr.message
        })
        return new Response(
          JSON.stringify({
            success: false,
            code: (resetErr as any).code || 'AUTH_RESET_FAILED',
            message: 'تعذر إرسال رابط إعادة التعيين: ' + resetErr.message,
            error: resetErr.message
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      console.log('[manage-admin-user][reset_password][SUCCESS]', `Reset link sent to: ${targetEmail}`)
      return new Response(
        JSON.stringify({
          success: true,
          message: 'تم إرسال رابط تعيين كلمة المرور إلى البريد الإلكتروني بنجاح'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.warn('[manage-admin-user][UNKNOWN_ACTION]', { action })
    return new Response(
      JSON.stringify({ success: false, code: 'UNKNOWN_ACTION', message: 'إجراء غير معروف: ' + action, error: 'Unknown action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (err: any) {
    console.error('[manage-admin-user][FATAL_ERROR]', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack
    })
    return new Response(
      JSON.stringify({
        success: false,
        code: 'SERVER_ERROR',
        message: err.message || 'حدث خطأ غير متوقع في الخادم',
        error: err.message || 'Internal Server Error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
