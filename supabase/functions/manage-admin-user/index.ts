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
      return new Response(
        JSON.stringify({ error: 'إعدادات الخادم غير مكتملة (Missing Supabase Server Config)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 1. Verify caller session from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'غير مصرح بالدخول (Missing Authorization Header)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'رمز الدخول مفقود (Missing Token)' }),
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
      return new Response(
        JSON.stringify({ error: 'جلسة الدخول غير صالحة أو منتهية، يرجى تسجيل الدخول مجدداً' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // 2. Verify caller in admin_users table
    const { data: callerAdmin, error: callerAdminErr } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .or(`id.eq.${callerUser.id},email.eq.${callerUser.email}`)
      .maybeSingle()

    if (callerAdminErr || !callerAdmin) {
      return new Response(
        JSON.stringify({ error: 'المستخدم غير مسجل كمسؤول إداري في النظام' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    if (!callerAdmin.is_active) {
      return new Response(
        JSON.stringify({ error: 'تم تعطيل حسابك الإداري، تواصل مع الإدارة العليا' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Parse request body
    const body = await req.json()
    const action = body.action || 'create'

    // ==========================================
    // ACTION: CREATE ADMIN USER
    // ==========================================
    if (action === 'create') {
      // Must be Super Admin to create users
      if (callerAdmin.role !== 'super_admin') {
        return new Response(
          JSON.stringify({ error: 'ليس لديك صلاحية لتنفيذ هذه العملية. تقتصر إضافة المسؤولين على Super Admin فقط.' }),
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
        return new Response(
          JSON.stringify({ error: 'البريد الإلكتروني غير صحيح' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Security rule: UI cannot create super_admin by default
      if (role === 'super_admin' && !body.allow_super_admin) {
        role = 'Admin'
      }

      // 3. Check if email already exists in admin_users
      const { data: existingAdmin } = await supabaseAdmin
        .from('admin_users')
        .select('id, email')
        .eq('email', email)
        .maybeSingle()

      if (existingAdmin) {
        return new Response(
          JSON.stringify({ error: 'هذا البريد الإلكتروني مسجل بالفعل كمستخدم إداري' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // 4. Check if user already exists in Supabase Auth
      const { data: { users: authUsersList } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      const existingAuthUser = authUsersList?.find(u => u.email?.toLowerCase() === email)

      if (existingAuthUser) {
        return new Response(
          JSON.stringify({ error: 'هذا البريد الإلكتروني مسجل بالفعل كمستخدم إداري' }),
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
          console.error("Create Auth User Error:", createErr)
          return new Response(
            JSON.stringify({ error: 'تعذر إنشاء المستخدم في نظام المصادقة: ' + createErr.message }),
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
          console.warn("Invite failed (possibly no SMTP configured), falling back to createUser with random password:", inviteErr.message)
          // Secure Fallback: Generate secure temporary password
          usedTempPassword = 'Gpp#' + Math.random().toString(36).slice(-8) + '!'
          const { data: createdFallback, error: fallbackErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: usedTempPassword,
            email_confirm: true,
            user_metadata: { full_name: fullName, role }
          })

          if (fallbackErr) {
            return new Response(
              JSON.stringify({ error: 'تعذر إنشاء المستخدم في نظام المصادقة: ' + fallbackErr.message }),
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
        id: newAuthUser.id, // Linked to Auth User ID
        email,
        full_name: fullName || null,
        role,
        is_active: true,
        can_manage_admins: isViewer ? false : (permissions.can_manage_admins ?? false),
        can_manage_prices: isViewer ? false : (permissions.can_manage_prices ?? false),
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
        console.error("Insert admin_users Error:", insertErr)
        // Clean up Auth user to prevent orphaned Auth account
        await supabaseAdmin.auth.admin.deleteUser(newAuthUser.id)
        return new Response(
          JSON.stringify({ error: 'تعذر حفظ بيانات المستخدم الإداري في قاعدة البيانات' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

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
        return new Response(
          JSON.stringify({ error: 'ليس لديك صلاحية لتنفيذ هذه العملية. تقتصر إدارة المسؤولين على Super Admin فقط.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }

      const targetEmail = (body.email || '').trim().toLowerCase()
      const fullName = body.full_name !== undefined ? (body.full_name || '').trim() : undefined
      const newRole = body.role
      const permissions = body.permissions || {}

      if (!targetEmail) {
        return new Response(
          JSON.stringify({ error: 'البريد الإلكتروني للمستخدم المستهدف مطلوب' }),
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
        return new Response(
          JSON.stringify({ error: 'المستخدم الإداري المستهدف غير موجود' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      // Security: Cannot modify another Super Admin
      if (targetAdmin.role === 'super_admin' && targetAdmin.id !== callerAdmin.id) {
        return new Response(
          JSON.stringify({ error: 'لا يمكن تعديل بيانات Super Admin آخر' }),
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
        return new Response(
          JSON.stringify({ error: 'تعذر تحديث بيانات المستخدم في قاعدة البيانات' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Also update Auth metadata if full_name or role changed
      if (targetAdmin.id) {
        await supabaseAdmin.auth.admin.updateUserById(targetAdmin.id, {
          user_metadata: {
            full_name: updateData.full_name ?? targetAdmin.full_name,
            role: updateData.role ?? targetAdmin.role
          }
        }).catch(err => console.warn("Failed to sync Auth user metadata:", err))
      }

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
        return new Response(
          JSON.stringify({ error: 'ليس لديك صلاحية لتنفيذ هذه العملية. تقتصر إدارة التفعيل والتعطيل على Super Admin فقط.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }

      const targetEmail = (body.email || '').trim().toLowerCase()
      if (!targetEmail) {
        return new Response(
          JSON.stringify({ error: 'البريد الإلكتروني مطلوب' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      if (targetEmail === callerAdmin.email?.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: 'لا يمكنك تعطيل حسابك الخاص' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const { data: targetAdmin } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .eq('email', targetEmail)
        .maybeSingle()

      if (!targetAdmin) {
        return new Response(
          JSON.stringify({ error: 'المستخدم الإداري غير موجود' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      if (targetAdmin.role === 'super_admin') {
        return new Response(
          JSON.stringify({ error: 'لا يمكن تعطيل حساب Super Admin' }),
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
        return new Response(
          JSON.stringify({ error: 'تعذر تعديل حالة المستخدم في قاعدة البيانات' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // 2. Also ban or unban in Supabase Auth to prevent new token issuance
      if (targetAdmin.id) {
        if (!newActiveState) {
          // Ban for 100 years
          await supabaseAdmin.auth.admin.updateUserById(targetAdmin.id, {
            ban_duration: '876600h'
          }).catch(err => console.warn("Ban in Auth failed:", err))
        } else {
          // Remove ban
          await supabaseAdmin.auth.admin.updateUserById(targetAdmin.id, {
            ban_duration: 'none'
          }).catch(err => console.warn("Unban in Auth failed:", err))
        }
      }

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
        return new Response(
          JSON.stringify({ error: 'ليس لديك صلاحية لتنفيذ هذه العملية. يقتصر الحذف على Super Admin فقط.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }

      const targetEmail = (body.email || '').trim().toLowerCase()
      if (!targetEmail) {
        return new Response(
          JSON.stringify({ error: 'البريد الإلكتروني مطلوب' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      if (targetEmail === callerAdmin.email?.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: 'لا يمكنك حذف حسابك الخاص' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const { data: targetAdmin } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .eq('email', targetEmail)
        .maybeSingle()

      if (!targetAdmin) {
        return new Response(
          JSON.stringify({ error: 'المستخدم الإداري غير موجود' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      if (targetAdmin.role === 'super_admin') {
        // Count super admins
        const { count } = await supabaseAdmin
          .from('admin_users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'super_admin')

        if (count !== null && count <= 1) {
          return new Response(
            JSON.stringify({ error: 'لا يمكن حذف آخر Super Admin في النظام!' }),
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
        return new Response(
          JSON.stringify({ error: 'تعذر حذف المستخدم من قاعدة البيانات' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Delete from Auth
      if (targetAdmin.id) {
        await supabaseAdmin.auth.admin.deleteUser(targetAdmin.id).catch(err => console.warn("Delete in Auth failed:", err))
      }

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
        return new Response(
          JSON.stringify({ error: 'ليس لديك صلاحية لتنفيذ هذه العملية.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }

      const targetEmail = (body.email || '').trim().toLowerCase()
      if (!targetEmail) {
        return new Response(
          JSON.stringify({ error: 'البريد الإلكتروني مطلوب' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const { data: targetAdmin } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .eq('email', targetEmail)
        .maybeSingle()

      if (!targetAdmin) {
        return new Response(
          JSON.stringify({ error: 'المستخدم الإداري غير موجود' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(targetEmail)
      if (resetErr) {
        return new Response(
          JSON.stringify({ error: 'تعذر إرسال رابط إعادة التعيين: ' + resetErr.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'تم إرسال رابط تعيين كلمة المرور إلى البريد الإلكتروني بنجاح'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    return new Response(
      JSON.stringify({ error: 'إجراء غير معروف (Unknown action)' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (err: any) {
    console.error("Manage Admin User Edge Function Error:", err)
    return new Response(
      JSON.stringify({ error: err.message || 'حدث خطأ غير متوقع في الخادم' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
