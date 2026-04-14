import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function createUser(admin: any, email: string, password: string, englishName: string) {
  const { data } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { english_name: englishName },
  })
  return data?.user
}

async function assignRole(admin: any, userId: string, role: string) {
  await admin.from('user_roles').insert({ user_id: userId, role })
}

async function updateProfile(admin: any, userId: string, fields: Record<string, any>) {
  await admin.from('profiles').update(fields).eq('user_id', userId)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const pw = 'Test1234!'

    // 1. Super Admin
    const superAdmin = await createUser(supabaseAdmin, 'superadmin@faithconnect.test', pw, 'Platform Admin')
    if (superAdmin) {
      await assignRole(supabaseAdmin, superAdmin.id, 'super_admin')
      await updateProfile(supabaseAdmin, superAdmin.id, {
        english_name: 'Platform Admin',
        chinese_name_traditional: '平台管理員',
      })
    }

    // 2. Churches
    const { data: church1 } = await supabaseAdmin.from('churches').insert({
      english_name: 'Grace Community Church',
      chinese_name_traditional: '恩典社區教會',
      contact_person: 'Pastor Chan Wing Kei',
      contact_email: 'admin.grace@faithconnect.test',
      contact_phone: '+852 2345 6789',
      district_or_address: 'Kowloon',
      status: 'active',
      theme_color: '#3b82f6',
    }).select().single()

    const { data: church2 } = await supabaseAdmin.from('churches').insert({
      english_name: 'Hope Fellowship',
      chinese_name_traditional: '希望團契',
      contact_person: 'Rev. Wong Mei Ling',
      contact_email: 'admin.hope@faithconnect.test',
      contact_phone: '+852 2876 5432',
      district_or_address: 'Hong Kong Island',
      status: 'active',
      theme_color: '#10b981',
    }).select().single()

    // 3. Church Admins
    const admin1 = await createUser(supabaseAdmin, 'admin.grace@faithconnect.test', pw, 'Pastor Chan Wing Kei')
    if (admin1 && church1) {
      await assignRole(supabaseAdmin, admin1.id, 'church_admin')
      await updateProfile(supabaseAdmin, admin1.id, {
        english_name: 'Pastor Chan Wing Kei',
        chinese_name_traditional: '陳永基牧師',
        church_id: church1.id,
        gender: 'male',
      })
    }

    const admin2 = await createUser(supabaseAdmin, 'admin.hope@faithconnect.test', pw, 'Rev. Wong Mei Ling')
    if (admin2 && church2) {
      await assignRole(supabaseAdmin, admin2.id, 'church_admin')
      await updateProfile(supabaseAdmin, admin2.id, {
        english_name: 'Rev. Wong Mei Ling',
        chinese_name_traditional: '黃美玲牧師',
        church_id: church2.id,
        gender: 'female',
      })
    }

    // 4. Members (2 per church)
    const memberData = [
      { email: 'member1.grace@faithconnect.test', name: 'David Lee', nameCn: '李大衛', gender: 'male', churchId: church1?.id, dob: '1992-03-15' },
      { email: 'member2.grace@faithconnect.test', name: 'Sarah Lam', nameCn: '林莎拉', gender: 'female', churchId: church1?.id, dob: '1995-07-22' },
      { email: 'member1.hope@faithconnect.test', name: 'John Cheung', nameCn: '張約翰', gender: 'male', churchId: church2?.id, dob: '1988-11-05' },
      { email: 'member2.hope@faithconnect.test', name: 'Mary Ho', nameCn: '何瑪利', gender: 'female', churchId: church2?.id, dob: '2000-01-30' },
    ]

    const memberUsers: Record<string, string> = {}
    for (const m of memberData) {
      const u = await createUser(supabaseAdmin, m.email, pw, m.name)
      if (u) {
        memberUsers[m.email] = u.id
        await assignRole(supabaseAdmin, u.id, 'member')
        await updateProfile(supabaseAdmin, u.id, {
          english_name: m.name,
          chinese_name_traditional: m.nameCn,
          church_id: m.churchId,
          gender: m.gender,
          date_of_birth: m.dob,
        })
      }
    }

    // 5. Classes (6 across lifecycle states)
    const { data: cls1 } = await supabaseAdmin.from('classes').insert({
      english_title: 'Bible Basics 101',
      chinese_title_traditional: '聖經基礎101',
      english_description: 'A foundational course covering the Old and New Testaments for all believers.',
      chinese_description_traditional: '為所有信徒設計的基礎課程，涵蓋舊約和新約。',
      owner_type: 'platform',
      status: 'open',
      enrollment_start: '2026-03-01',
      enrollment_end: '2026-06-30',
      access_start: '2026-04-01',
      access_end: '2026-09-30',
      approval_mode: 'auto',
      min_age: 12,
    }).select().single()

    const { data: cls2 } = await supabaseAdmin.from('classes').insert({
      english_title: 'Advanced Theology',
      chinese_title_traditional: '進階神學',
      english_description: 'Deep dive into systematic theology for mature believers.',
      chinese_description_traditional: '為成熟信徒設計的系統神學深入課程。',
      owner_type: 'platform',
      status: 'published',
      enrollment_start: '2026-07-01',
      enrollment_end: '2026-08-31',
      approval_mode: 'manual',
    }).select().single()

    const { data: cls3 } = await supabaseAdmin.from('classes').insert({
      english_title: 'Youth Ministry Training',
      chinese_title_traditional: '青年事工培訓',
      english_description: 'Training program for youth ministry leaders and volunteers.',
      chinese_description_traditional: '為青年事工領袖和義工設計的培訓課程。',
      owner_type: 'platform',
      status: 'draft',
      approval_mode: 'manual',
    }).select().single()

    const { data: cls4 } = await supabaseAdmin.from('classes').insert({
      english_title: 'Grace Prayer Workshop',
      chinese_title_traditional: '恩典禱告工作坊',
      english_description: 'Interactive prayer workshop hosted by Grace Community Church.',
      chinese_description_traditional: '由恩典社區教會主辦的互動禱告工作坊。',
      owner_type: 'church',
      owner_church_id: church1?.id,
      status: 'open',
      enrollment_start: '2026-03-15',
      enrollment_end: '2026-05-31',
      approval_mode: 'auto',
    }).select().single()

    const { data: cls5 } = await supabaseAdmin.from('classes').insert({
      english_title: 'Hope Worship Course',
      chinese_title_traditional: '希望敬拜課程',
      english_description: 'Learn worship leading and music ministry at Hope Fellowship.',
      chinese_description_traditional: '在希望團契學習敬拜帶領及音樂事工。',
      owner_type: 'church',
      owner_church_id: church2?.id,
      status: 'published',
      approval_mode: 'manual',
    }).select().single()

    const { data: cls6 } = await supabaseAdmin.from('classes').insert({
      english_title: 'Old Testament Survey',
      chinese_title_traditional: '舊約概論',
      english_description: 'Archived: Comprehensive survey of the Old Testament books.',
      chinese_description_traditional: '已歸檔：舊約書卷的全面概覽。',
      owner_type: 'platform',
      status: 'archived',
      approval_mode: 'auto',
    }).select().single()

    // 6. Class-Church Assignments
    if (cls1 && church1) await supabaseAdmin.from('class_church_assignments').insert({ class_id: cls1.id, church_id: church1.id })
    if (cls1 && church2) await supabaseAdmin.from('class_church_assignments').insert({ class_id: cls1.id, church_id: church2.id })
    if (cls2 && church1) await supabaseAdmin.from('class_church_assignments').insert({ class_id: cls2.id, church_id: church1.id })
    if (cls6 && church1) await supabaseAdmin.from('class_church_assignments').insert({ class_id: cls6.id, church_id: church1.id })

    // 7. Enrollments
    const m1Grace = memberUsers['member1.grace@faithconnect.test']
    const m2Grace = memberUsers['member2.grace@faithconnect.test']
    const m1Hope = memberUsers['member1.hope@faithconnect.test']

    if (cls1 && m1Grace && church1) {
      await supabaseAdmin.from('enrollments').insert({ member_id: m1Grace, class_id: cls1.id, church_id: church1.id, status: 'approved' })
    }
    if (cls1 && m2Grace && church1) {
      await supabaseAdmin.from('enrollments').insert({ member_id: m2Grace, class_id: cls1.id, church_id: church1.id, status: 'pending' })
    }
    if (cls1 && m1Hope && church2) {
      await supabaseAdmin.from('enrollments').insert({ member_id: m1Hope, class_id: cls1.id, church_id: church2.id, status: 'approved' })
    }

    // 8. Materials for Bible Basics 101
    if (cls1) {
      await supabaseAdmin.from('materials').insert([
        { class_id: cls1.id, english_title: 'Course Introduction Slides', chinese_title_traditional: '課程介紹投影片', type: 'document', sort_order: 1, is_published: true },
        { class_id: cls1.id, english_title: 'Week 1 Reading Notes', chinese_title_traditional: '第一週閱讀筆記', type: 'document', sort_order: 2, is_published: false },
      ])
    }

    // 9. Announcements
    await supabaseAdmin.from('announcements').insert([
      {
        english_title: 'Welcome to the FaithConnect Platform',
        chinese_title_traditional: '歡迎使用FaithConnect平台',
        english_content: 'We are excited to launch our digital Sunday School platform for Hong Kong churches. Browse classes and enroll today!',
        chinese_content_traditional: '我們很高興推出專為香港教會設計的數碼主日學平台。立即瀏覽課程並報名！',
        is_published: true,
        published_at: new Date().toISOString(),
        author_id: superAdmin?.id,
      },
      {
        church_id: church1?.id,
        english_title: 'Grace Church Summer Programme 2026',
        chinese_title_traditional: '恩典堂2026年暑期計劃',
        english_content: 'Registration for our summer Bible study and prayer workshop classes is now open.',
        chinese_content_traditional: '暑期聖經研習及禱告工作坊現已接受報名。',
        is_published: true,
        published_at: new Date().toISOString(),
        author_id: admin1?.id,
      },
    ])

    return new Response(JSON.stringify({
      success: true,
      message: 'Seed data created successfully',
      accounts: [
        { role: 'Super Admin', email: 'superadmin@faithconnect.test', password: pw },
        { role: 'Church Admin (Grace)', email: 'admin.grace@faithconnect.test', password: pw },
        { role: 'Church Admin (Hope)', email: 'admin.hope@faithconnect.test', password: pw },
        { role: 'Member (Grace)', email: 'member1.grace@faithconnect.test', password: pw },
        { role: 'Member (Hope)', email: 'member1.hope@faithconnect.test', password: pw },
      ]
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
