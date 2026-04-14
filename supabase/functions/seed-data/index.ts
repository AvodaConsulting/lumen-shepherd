const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Create super admin
    const { data: superAdmin } = await supabaseAdmin.auth.admin.createUser({
      email: 'superadmin@sundayschool.hk',
      password: 'admin123456',
      email_confirm: true,
      user_metadata: { english_name: 'System Administrator' }
    })

    // Create 2 churches
    const { data: church1 } = await supabaseAdmin.from('churches').insert({
      english_name: 'Grace Community Church',
      chinese_name_traditional: '恩典社區教會',
      contact_person: 'Pastor Chan Wing Kei',
      contact_email: 'admin@gracechurch.hk',
      contact_phone: '+852 2345 6789',
      district_or_address: 'Sha Tin, New Territories',
      status: 'active',
      theme_color: '#3b82f6',
    }).select().single()

    const { data: church2 } = await supabaseAdmin.from('churches').insert({
      english_name: 'Faith Baptist Church',
      chinese_name_traditional: '信心浸信會',
      contact_person: 'Rev. Wong Mei Ling',
      contact_email: 'office@faithbaptist.hk',
      contact_phone: '+852 2876 5432',
      district_or_address: 'Tsuen Wan, New Territories',
      status: 'active',
      theme_color: '#10b981',
    }).select().single()

    // Assign super admin role
    if (superAdmin?.user) {
      await supabaseAdmin.from('user_roles').insert({ user_id: superAdmin.user.id, role: 'super_admin' })
      await supabaseAdmin.from('profiles').update({
        english_name: 'System Administrator',
        chinese_name_traditional: '系統管理員',
      }).eq('user_id', superAdmin.user.id)
    }

    // Create church admins
    const { data: admin1 } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@gracechurch.hk',
      password: 'church123456',
      email_confirm: true,
      user_metadata: { english_name: 'Pastor Chan Wing Kei' }
    })
    if (admin1?.user && church1) {
      await supabaseAdmin.from('user_roles').insert({ user_id: admin1.user.id, role: 'church_admin' })
      await supabaseAdmin.from('profiles').update({
        english_name: 'Pastor Chan Wing Kei',
        chinese_name_traditional: '陳永基牧師',
        church_id: church1.id,
        gender: 'male',
      }).eq('user_id', admin1.user.id)
    }

    const { data: admin2 } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@faithbaptist.hk',
      password: 'church123456',
      email_confirm: true,
      user_metadata: { english_name: 'Rev. Wong Mei Ling' }
    })
    if (admin2?.user && church2) {
      await supabaseAdmin.from('user_roles').insert({ user_id: admin2.user.id, role: 'church_admin' })
      await supabaseAdmin.from('profiles').update({
        english_name: 'Rev. Wong Mei Ling',
        chinese_name_traditional: '黃美玲牧師',
        church_id: church2.id,
        gender: 'female',
      }).eq('user_id', admin2.user.id)
    }

    // Create members
    const members = [
      { email: 'member1@grace.hk', name: 'David Lee', nameCn: '李大衛', gender: 'male', churchId: church1?.id },
      { email: 'member2@grace.hk', name: 'Sarah Lam', nameCn: '林莎拉', gender: 'female', churchId: church1?.id },
      { email: 'member3@faith.hk', name: 'John Cheung', nameCn: '張約翰', gender: 'male', churchId: church2?.id },
      { email: 'member4@faith.hk', name: 'Mary Ho', nameCn: '何瑪利', gender: 'female', churchId: church2?.id },
    ]

    for (const m of members) {
      const { data: mUser } = await supabaseAdmin.auth.admin.createUser({
        email: m.email,
        password: 'member123456',
        email_confirm: true,
        user_metadata: { english_name: m.name }
      })
      if (mUser?.user) {
        await supabaseAdmin.from('user_roles').insert({ user_id: mUser.user.id, role: 'member' })
        await supabaseAdmin.from('profiles').update({
          english_name: m.name,
          chinese_name_traditional: m.nameCn,
          church_id: m.churchId,
          gender: m.gender,
          date_of_birth: '1990-01-15',
        }).eq('user_id', mUser.user.id)
      }
    }

    // Create classes
    const { data: class1 } = await supabaseAdmin.from('classes').insert({
      english_title: 'Introduction to the Bible',
      chinese_title_traditional: '聖經導論',
      english_description: 'A foundational course covering the Old and New Testaments for new believers.',
      chinese_description_traditional: '為初信者設計的基礎課程，涵蓋舊約和新約。',
      owner_type: 'platform',
      status: 'published',
      enrollment_start: '2026-04-01',
      enrollment_end: '2026-05-31',
      access_start: '2026-06-01',
      access_end: '2026-08-31',
      approval_mode: 'manual',
      min_age: 12,
    }).select().single()

    const { data: class2 } = await supabaseAdmin.from('classes').insert({
      english_title: 'Christian Ethics in Modern Society',
      chinese_title_traditional: '現代社會中的基督教倫理',
      english_description: 'Explore how Christian values apply to contemporary ethical dilemmas.',
      chinese_description_traditional: '探討基督教價值觀如何應用於當代倫理困境。',
      owner_type: 'platform',
      status: 'published',
      enrollment_start: '2026-04-15',
      enrollment_end: '2026-06-15',
      approval_mode: 'auto',
    }).select().single()

    const { data: class3 } = await supabaseAdmin.from('classes').insert({
      english_title: 'Children\'s Bible Stories',
      chinese_title_traditional: '兒童聖經故事',
      english_description: 'Age-appropriate Bible stories for children aged 6-12.',
      chinese_description_traditional: '適合6-12歲兒童的聖經故事課程。',
      owner_type: 'church',
      owner_church_id: church1?.id,
      status: 'published',
      min_age: 6,
      max_age: 12,
      approval_mode: 'auto',
    }).select().single()

    // Assign classes to churches
    if (class1 && church1) await supabaseAdmin.from('class_church_assignments').insert({ class_id: class1.id, church_id: church1.id })
    if (class1 && church2) await supabaseAdmin.from('class_church_assignments').insert({ class_id: class1.id, church_id: church2.id })
    if (class2 && church1) await supabaseAdmin.from('class_church_assignments').insert({ class_id: class2.id, church_id: church1.id })
    if (class2 && church2) await supabaseAdmin.from('class_church_assignments').insert({ class_id: class2.id, church_id: church2.id })
    if (class3 && church1) await supabaseAdmin.from('class_church_assignments').insert({ class_id: class3.id, church_id: church1.id })

    // Create announcements
    await supabaseAdmin.from('announcements').insert([
      {
        english_title: 'Welcome to the Sunday School Platform',
        chinese_title_traditional: '歡迎使用主日學平台',
        english_content: 'We are excited to launch our new digital Sunday School platform for Hong Kong churches.',
        chinese_content_traditional: '我們很高興推出專為香港教會設計的全新數碼主日學平台。',
        is_published: true,
        published_at: new Date().toISOString(),
        author_id: superAdmin?.user?.id,
      },
      {
        church_id: church1?.id,
        english_title: 'Summer Bible Study Program 2026',
        chinese_title_traditional: '2026年暑期聖經研習計劃',
        english_content: 'Registration for our summer Bible study classes is now open. Please check the Classes section for details.',
        chinese_content_traditional: '暑期聖經研習班現已接受報名，請查看課程部分了解詳情。',
        is_published: true,
        published_at: new Date().toISOString(),
        author_id: admin1?.user?.id,
      },
    ])

    return new Response(JSON.stringify({
      success: true,
      message: 'Seed data created successfully',
      accounts: [
        { role: 'Super Admin', email: 'superadmin@sundayschool.hk', password: 'admin123456' },
        { role: 'Church Admin (Grace)', email: 'admin@gracechurch.hk', password: 'church123456' },
        { role: 'Church Admin (Faith)', email: 'admin@faithbaptist.hk', password: 'church123456' },
        { role: 'Member', email: 'member1@grace.hk', password: 'member123456' },
      ]
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
