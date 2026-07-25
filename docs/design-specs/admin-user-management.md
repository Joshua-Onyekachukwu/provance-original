# User Management — Design & PRD Summary

**Route:** `/app/admin/users`  
**Design Spec:** Delegation session `4b2c523d-6731-4c9e-9ef6-2b06eacd4595`  
**PRD:** Delegation session `7270a175-f69c-4e6d-9b6b-b4ba1a44c590`  
**Build:** 🔨 In progress

## Page Structure

### KPI Stat Cards (5)
Total Users, Active Today, Admins, Members, Team-Enabled — unified StatCard, 5-col grid at xl.

### Filter Toolbar
AdminSearch + role select (Super Admin/Admin/Member) + team filter (All/Enabled/Disabled).

### AdminTable
Columns: Name, Email, Role (colored badge), Team (toggle badge with dot), Last Sign-in, Created — all sortable.

### Detail Drawer (AdminDrawer)
- **Profile:** Avatar (initials fallback), display name, email, member-since
- **Role Changer:** Select dropdown + "Change role" button → ConfirmDialog before submit
- **Team Access Toggle:** Inline switch, optimistic update, no confirmation needed
- **Scan Stats:** Total, Completed, Failed, Suspicious with rates
- **Status History:** 5 most recent events with action badges
- **Account Info:** Last sign-in, created date, user ID

### Role Badges
Super Admin (rose), Admin (amber), Member (sky)

### Team Badges
Enabled (emerald dot), Disabled (stone dot)

## States
Loading: skeleton StatCards + skeleton table rows | Empty: "No user accounts" | Error: AppStatePanel with retry | Drawer loading/error handled separately

## Out of Scope (MVP)
Bulk user actions, user deletion, password reset from admin, organization assignment UI
