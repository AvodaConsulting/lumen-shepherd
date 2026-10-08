# FaithConnect Foundation

Build the next stage of this product as a genuinely functional, database-backed web application foundation intended for iterative testing, review, revision, and eventual deployment to paying subscribers. This is no longer a prototype-only request. The output should target a real SaaS application baseline with working authentication, real persistence, real CRUD, and a professional UI/UX suitable for further refinement.

Product:
A multi-tenant Sunday School and Christian education platform for churches, primarily targeting Hong Kong users. Churches subscribe to the platform and operate as tenant accounts. Each church has church admins and members. Members belong to exactly one church. Super Admin manages the platform globally. Church Admin manages only its own church scope. Members can browse classes, enroll, and access approved materials.

Critical objective:
Do not generate a mock-up or a mostly static demo. Generate a real implementation-oriented web app with real backend foundations, real data persistence, and working entity operations for meaningful testing.

Technical direction:
- Prefer a modern full-stack web app architecture.
- Prefer Supabase with PostgreSQL for database, authentication, storage, and row-level security if supported.
- Use a relational data model suitable for multi-tenant permission-sensitive workflows.
- Build with implementation-ready structure and real CRUD behavior.
- Professional, deployable SaaS quality is the target direction.

Core functional requirements for this stage:

1. Real authentication and authorization
- working login/logout
- role-based routing and protected pages
- roles: super_admin, church_admin, member
- users linked to church where applicable
- inactive/disabled users blocked from protected areas
- password reset placeholder if supported natively

2. Real multi-tenant data model with persisted entities
Implement real database-backed entities with working CRUD:
- Church
- UserProfile / MemberProfile
- ChurchAdminAssignment or equivalent role model
- Class
- ClassAssignmentToChurch
- Enrollment
- Material
- Announcement
- Notification
- AuditLog
- FavoriteBookmark

3. Church entity must work properly
This is the first entity the user wants to test carefully.
Required Church behavior:
- Add Church button must work
- Create Church form must submit and persist a real record
- Existing church records must open into a detail page
- Existing church records must be editable
- Changes must save successfully
- Church status must be updateable
- Church logo upload field must exist and be usable if storage is supported
- Denomination field should be removed
- Contact person and contact details are required

Recommended Church fields:
- id
- english_name
- chinese_name_traditional
- contact_person
- contact_email
- contact_phone
- district_or_address
- logo_url
- status (pending, active, inactive, disabled, archived)
- theme_color optional
- created_at
- updated_at

4. Member entity foundation must also work
- add member button works
- member registration under an existing church works
- existing members open to detail view
- existing members can be edited
- member status can be changed
- member belongs to exactly one church
- fields include English name, Traditional Chinese name, gender, date of birth, email, church, status

5. Class foundation must work
- create class button works
- create/edit/detail/list flows work
- support platform-owned and church-owned classes
- bilingual title and description
- enrollment period and access period
- status fields
- assigned churches
- approval mode
- retake policy
- eligibility placeholders: age, gender, prerequisites

6. Enrollment foundation must work
- member can browse classes assigned to their church
- member can submit enrollment request
- admin can approve/reject
- enrollment status is persisted
- advisory result can be shown and stored

7. Audit log foundation must work
Persist logs for:
- login
- church create/edit/status change
- member create/edit/status change
- class create/edit
- enrollment request
- enrollment approval/rejection
Provide admin-facing log views.

8. Bilingual and Hong Kong-oriented product behavior
- Traditional Chinese and English visible in key screens
- church supports English and Traditional Chinese names
- use Hong Kong-friendly examples and wording
- professional trustworthy interface, not generic low-quality admin UI

9. Church branding support
- church logo
- church English and Traditional Chinese name
- theme color optional
- branding visible in church admin and member-facing areas where practical

10. UI/UX quality bar
This must look like a serious SaaS product, not an amateur mockup.
- polished dashboards
- working tables and forms
- proper detail pages
- professional spacing and hierarchy
- clear empty states and action flows
- role-distinct experiences for super admin, church admin, member

11. Seed/demo data
Provide meaningful seeded data for testing, ideally with:
- super admin account
- at least 2 churches
- at least 1 church admin per church
- at least a few members
- a few classes, enrollments, announcements, and logs
Use Hong Kong-oriented names/examples where possible.

12. Scope control
Do not build yet:
- payment gateway
- certificates
- quizzes/exams
- WhatsApp integration
- attendance QR scanning
- advanced AI chatbot
These may remain future-ready placeholders only.

Important delivery instruction:
This stage should be a real application foundation suitable for hands-on testing and iterative improvement. Prioritize functional correctness of core entities and workflows over broad but fake surface area. However, do not degrade the UI into a bare scaffold; keep the interface professional and credible.

Highest priority acceptance criteria:
- Church CRUD actually works
- Member CRUD actually works
- Existing records open and edit correctly
- Role-based access works
- Persisted data survives reload
- The result feels like the beginning of a deployable subscriber-facing product, not another static prototype.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://lumen-shepherd.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/370f1b20-82de-4391-b2e6-06b8df82a235).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
