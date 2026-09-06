// Alias to manage-admin-user with default action: 'create'
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data: { user: callerUser }, error: tokenErr } = await supabaseAdmin.auth.getUser(token)
    if (tokenErr || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'جلسة الدخول غير صالحة أو منتهية، يرجى إعادة تسجيل الدخول' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

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
        JSON.stringify({ error: 'تم تعطيل حسابك الإداري' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    if (callerAdmin.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'ليس لديك صلاحية لتنفيذ هذه العملية. تقتصر إضافة المسؤولين على Super Admin فقط.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const body = await req.json()
    const email = (body.email || '').trim().toLowerCase()
    const fullName = (body.full_name || '').trim()
    let role = body.role || 'Admin'
    const permissions = body.permissions || {}
    const inviteMode = body.invite_mode !== false
    const password = body.password

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'البريد الإلكتروني غير صحيح' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (role === 'super_admin' && !body.allow_super_admin) {
      role = 'Admin'
    }

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

    const { data: { users: authUsersList } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    const existingAuthUser = authUsersList?.find(u => u.email?.toLowerCase() === email)

    if (existingAuthUser) {
      return new Response(
        JSON.stringify({ error: 'هذا البريد الإلكتروني مسجل بالفعل كمستخدم إداري' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    let newAuthUser = null
    let usedTempPassword: string | null = null

    if (!inviteMode && password && password.length >= 6) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role }
      })

      if (createErr) {
        return new Response(
          JSON.stringify({ error: 'تعذر إنشاء المستخدم في نظام المصادقة: ' + createErr.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      newAuthUser = created.user
      usedTempPassword = password
    } else {
      const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName, role }
      })

      if (inviteErr) {
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

    const now = new Date().toISOString()
    const isViewer = role === 'Viewer'

    const newAdminPayload: any = {
      id: newAuthUser.id,
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

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'حدث خطأ غير متوقع في الخادم' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
