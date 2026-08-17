/**
 * mockData.js — Centralized mock data store for Provance frontend-first MVP.
 *
 * Every dataset here mirrors the shape of the real backend payloads so pages
 * can render full flows with realistic sample data and no API dependency.
 *
 * Timestamps are spread across the last 30 days (relative to 2026-07-24) for
 * realistic recency patterns.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const NOW_TS = new Date('2026-07-24T12:00:00Z').getTime()

function daysAgo(days, hourOffset = 0) {
  const d = new Date(NOW_TS - days * 86400000 + hourOffset * 3600000)
  return d.toISOString()
}

// ---------------------------------------------------------------------------
// Users (12 records)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// User → team assignment (single source of truth for team scoping)
//
// The workspace surfaces (scan ledger, queue, reports) show each scan's
// owning team as a badge and can filter by team. Declared before mockUsers
// so user records can carry team_id at definition time.
// ---------------------------------------------------------------------------

export const mockUserTeamById = {
  usr_001: 'team_legal',
  usr_002: 'team_legal',
  usr_003: 'team_growth',
  usr_004: 'team_growth',
  usr_005: 'team_product',
  usr_006: 'team_product',
  usr_007: 'team_product',
  usr_008: 'team_product',
  usr_009: 'team_growth',
  usr_010: 'team_growth',
  usr_011: 'team_product',
  usr_012: 'team_growth',
}

export const mockUsers = [
  {
    id: 'usr_001',
    email: 'joshua.onyekachukwu@provance.io',
    displayName: 'Joshua Onyekachukwu',
    role: 'super_admin',
    team_enabled: true,
    team_id: mockUserTeamById.usr_001,
    created_at: daysAgo(30, 2),
    last_sign_in: daysAgo(0, -1),
    avatar_url: null,
    org_id: 'org_001',
  },
  {
    id: 'usr_002',
    email: 'amina.sow@provance.io',
    displayName: 'Amina Sow',
    role: 'admin',
    team_enabled: true,
    team_id: mockUserTeamById.usr_002,
    created_at: daysAgo(28, 4),
    last_sign_in: daysAgo(0, -3),
    avatar_url: null,
    org_id: 'org_001',
  },
  {
    id: 'usr_003',
    email: 'david.okafor@trustedmedia.ng',
    displayName: 'David Okafor',
    role: 'admin',
    team_enabled: true,
    team_id: mockUserTeamById.usr_003,
    created_at: daysAgo(25, 6),
    last_sign_in: daysAgo(1, 2),
    avatar_url: null,
    org_id: 'org_002',
  },
  {
    id: 'usr_004',
    email: 'chioma.eze@trustedmedia.ng',
    displayName: 'Chioma Eze',
    role: 'member',
    team_enabled: true,
    team_id: mockUserTeamById.usr_004,
    created_at: daysAgo(24, 1),
    last_sign_in: daysAgo(0, -5),
    avatar_url: null,
    org_id: 'org_002',
  },
  {
    id: 'usr_005',
    email: 'fatima.abubakar@newshub.africa',
    displayName: 'Fatima Abubakar',
    role: 'admin',
    team_enabled: true,
    team_id: mockUserTeamById.usr_005,
    created_at: daysAgo(20, 3),
    last_sign_in: daysAgo(1, 1),
    avatar_url: null,
    org_id: 'org_003',
  },
  {
    id: 'usr_006',
    email: 'emeka.nwosu@newshub.africa',
    displayName: 'Emeka Nwosu',
    role: 'member',
    team_enabled: true,
    team_id: mockUserTeamById.usr_006,
    created_at: daysAgo(18, 2),
    last_sign_in: daysAgo(2, 4),
    avatar_url: null,
    org_id: 'org_003',
  },
  {
    id: 'usr_007',
    email: 'grace.otieno@fpf-africa.org',
    displayName: 'Grace Otieno',
    role: 'admin',
    team_enabled: true,
    team_id: mockUserTeamById.usr_007,
    created_at: daysAgo(15, 5),
    last_sign_in: daysAgo(0, -2),
    avatar_url: null,
    org_id: 'org_004',
  },
  {
    id: 'usr_008',
    email: 'tunde.bakare@fpf-africa.org',
    displayName: 'Tunde Bakare',
    role: 'member',
    team_enabled: false,
    team_id: mockUserTeamById.usr_008,
    created_at: daysAgo(14, 3),
    last_sign_in: daysAgo(3, 1),
    avatar_url: null,
    org_id: 'org_004',
  },
  {
    id: 'usr_009',
    email: 'nadia.kone@mediacheck.ci',
    displayName: 'Nadia Koné',
    role: 'admin',
    team_enabled: true,
    team_id: mockUserTeamById.usr_009,
    created_at: daysAgo(10, 4),
    last_sign_in: daysAgo(0, -6),
    avatar_url: null,
    org_id: 'org_005',
  },
  {
    id: 'usr_010',
    email: 'paul.mensah@mediacheck.ci',
    displayName: 'Paul Mensah',
    role: 'member',
    team_enabled: true,
    team_id: mockUserTeamById.usr_010,
    created_at: daysAgo(9, 2),
    last_sign_in: daysAgo(1, 5),
    avatar_url: null,
    org_id: 'org_005',
  },
  {
    id: 'usr_011',
    email: 'ngozi.ugwu@independent-research.africa',
    displayName: 'Ngozi Ugwu',
    role: 'member',
    team_enabled: false,
    team_id: mockUserTeamById.usr_011,
    created_at: daysAgo(5, 1),
    last_sign_in: daysAgo(4, 2),
    avatar_url: null,
    org_id: 'org_001',
  },
  {
    id: 'usr_012',
    email: 'kwame.boateng@independent-research.africa',
    displayName: 'Kwame Boateng',
    role: 'member',
    team_enabled: false,
    team_id: mockUserTeamById.usr_012,
    created_at: daysAgo(3, 6),
    last_sign_in: daysAgo(2, 3),
    avatar_url: null,
    org_id: 'org_001',
  },
]

// ---------------------------------------------------------------------------
// Organizations (5 records)
// ---------------------------------------------------------------------------

export const mockOrganizations = [
  {
    id: 'org_001',
    name: 'Provance Internal',
    member_count: 4,
    admin_count: 2,
    storage_used_gb: 18.4,
    scan_count: 342,
    created_at: daysAgo(30, 0),
  },
  {
    id: 'org_002',
    name: 'Trusted Media Nigeria',
    member_count: 8,
    admin_count: 2,
    storage_used_gb: 124.7,
    scan_count: 2150,
    created_at: daysAgo(26, 0),
  },
  {
    id: 'org_003',
    name: 'NewsHub Africa',
    member_count: 12,
    admin_count: 3,
    storage_used_gb: 87.3,
    scan_count: 1401,
    created_at: daysAgo(22, 0),
  },
  {
    id: 'org_004',
    name: 'FPF Africa',
    member_count: 6,
    admin_count: 1,
    storage_used_gb: 34.1,
    scan_count: 518,
    created_at: daysAgo(16, 0),
  },
  {
    id: 'org_005',
    name: 'MediaCheck Côte d\'Ivoire',
    member_count: 5,
    admin_count: 1,
    storage_used_gb: 22.6,
    scan_count: 389,
    created_at: daysAgo(10, 0),
  },
]

// ---------------------------------------------------------------------------
// Waitlist (18 records, varied across all 5 statuses)
// ---------------------------------------------------------------------------

export const mockWaitlist = [
  {
    id: 'wl_001',
    full_name: 'Aisha Bello',
    email: 'aisha.bello@dailytrust.ng',
    company: 'Daily Trust',
    role_title: 'Head of Digital Verification',
    use_case: 'Verify user-generated video submissions before publication in breaking-news workflows.',
    status: 'waitlist_submitted',
    notes: 'Referred by Amina Sow. High-priority newsroom.',
    created_at: daysAgo(18, 3),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(18, 3) },
    ],
  },
  {
    id: 'wl_002',
    full_name: 'Kwesi Asare',
    email: 'kwesi.asare@ghananews.org',
    company: 'Ghana News Agency',
    role_title: 'Editor-in-Chief',
    use_case: 'Authenticate official government press releases and footage received via social media channels.',
    status: 'under_review',
    notes: 'Large state-affiliated agency. Needs team onboarding.',
    created_at: daysAgo(15, 6),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(15, 6) },
      { status: 'under_review', changed_by: 'Amina Sow', changed_at: daysAgo(14, 3) },
    ],
  },
  {
    id: 'wl_003',
    full_name: 'Marie Koffi',
    email: 'marie.koffi@rti.ci',
    company: 'RTI',
    role_title: 'Journalist / Fact-Checker',
    use_case: 'Verify political rally footage and social media clips during election season.',
    status: 'approved',
    notes: 'Approved for individual plan. Sent invite 2026-07-22.',
    created_at: daysAgo(12, 1),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(12, 1) },
      { status: 'under_review', changed_by: 'James Adedapo', changed_at: daysAgo(10, 4) },
      { status: 'approved', changed_by: 'James Adedapo', changed_at: daysAgo(8, 2) },
    ],
  },
  {
    id: 'wl_004',
    full_name: 'Olumide Adeyemi',
    email: 'olumide.adeyemi@channelstv.com',
    company: 'Channels Television',
    role_title: 'Senior Producer',
    use_case: 'Pre-broadcast verification of citizen journalism clips submitted to the news desk.',
    status: 'approved',
    notes: 'Approved with team plan. Invite sent, awaiting acceptance.',
    created_at: daysAgo(10, 4),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(10, 4) },
      { status: 'under_review', changed_by: 'Amina Sow', changed_at: daysAgo(8, 1) },
      { status: 'approved', changed_by: 'Amina Sow', changed_at: daysAgo(6, 3) },
    ],
  },
  {
    id: 'wl_005',
    full_name: 'Zainab Ibrahim',
    email: 'zainab.ibrahim@humangle.ng',
    company: 'HumAngle',
    role_title: 'Investigative Reporter',
    use_case: 'Verify conflict-zone footage authenticity before publishing investigative reports.',
    status: 'deferred',
    notes: 'Defer until security review complete. Follow up in 30 days.',
    created_at: daysAgo(8, 2),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(8, 2) },
      { status: 'under_review', changed_by: 'James Adedapo', changed_at: daysAgo(6, 5) },
      { status: 'deferred', changed_by: 'James Adedapo', changed_at: daysAgo(4, 1) },
    ],
  },
  {
    id: 'wl_006',
    full_name: 'Peter Kamau',
    email: 'peter.kamau@standardmedia.co.ke',
    company: 'Standard Media Group',
    role_title: 'Digital Editor',
    use_case: 'Large-scale verification of political rally footage across 47 counties.',
    status: 'rejected',
    notes: 'Rejected — use case not aligned with current product scope.',
    created_at: daysAgo(7, 5),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(7, 5) },
      { status: 'under_review', changed_by: 'Amina Sow', changed_at: daysAgo(5, 2) },
      { status: 'rejected', changed_by: 'Amina Sow', changed_at: daysAgo(3, 6) },
    ],
  },
  {
    id: 'wl_007',
    full_name: 'Linda Moyo',
    email: 'linda.moyo@zimeye.co.zw',
    company: 'ZimEye',
    role_title: 'Managing Editor',
    use_case: 'Citizen media verification and source authentication for diaspora reporting.',
    status: 'waitlist_submitted',
    notes: '',
    created_at: daysAgo(6, 1),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(6, 1) },
    ],
  },
  {
    id: 'wl_008',
    full_name: 'Samuel Tesfaye',
    email: 'samuel.tesfaye@addisstandard.com',
    company: 'Addis Standard',
    role_title: 'Digital Content Manager',
    use_case: 'Verify official government audio clips and video statements circulating on Telegram.',
    status: 'under_review',
    notes: 'High-priority. Sensitive political content. Fast-track review.',
    created_at: daysAgo(5, 3),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(5, 3) },
      { status: 'under_review', changed_by: 'James Adedapo', changed_at: daysAgo(4, 7) },
    ],
  },
  {
    id: 'wl_009',
    full_name: 'Deborah Akinyemi',
    email: 'deborah.akinyemi@techcabal.com',
    company: 'TechCabal',
    role_title: 'Senior Reporter',
    use_case: 'Verify AI-generated images being shared as real news in Nigerian tech ecosystem.',
    status: 'approved',
    notes: 'Individual plan approved. Invite sent 2026-07-20.',
    created_at: daysAgo(5, 7),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(5, 7) },
      { status: 'under_review', changed_by: 'Amina Sow', changed_at: daysAgo(4, 2) },
      { status: 'approved', changed_by: 'Amina Sow', changed_at: daysAgo(3, 4) },
    ],
  },
  {
    id: 'wl_010',
    full_name: 'Musa Jalloh',
    email: 'musa.jalloh@awokonewspaper.sl',
    company: 'Awoko Newspaper',
    role_title: 'Online Editor',
    use_case: 'Verification of social media content before republication on digital platforms.',
    status: 'waitlist_submitted',
    notes: '',
    created_at: daysAgo(4, 2),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(4, 2) },
    ],
  },
  {
    id: 'wl_011',
    full_name: 'Helen Mugo',
    email: 'helen.mugo@nairobinews.co.ke',
    company: 'Nairobi News',
    role_title: 'Fact-Check Lead',
    use_case: 'Establish a dedicated verification desk for election-period content.',
    status: 'under_review',
    notes: 'Election preparedness — potential for team plan upsell.',
    created_at: daysAgo(3, 5),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(3, 5) },
      { status: 'under_review', changed_by: 'James Adedapo', changed_at: daysAgo(2, 2) },
    ],
  },
  {
    id: 'wl_012',
    full_name: 'Ibrahim Diallo',
    email: 'ibrahim.diallo@ortm.ml',
    company: 'ORTM',
    role_title: 'Broadcast Engineer',
    use_case: 'Verify government broadcast feeds for tampering and synthetic injection.',
    status: 'deferred',
    notes: 'Requires custom integration. Defer until API v2.',
    created_at: daysAgo(3, 1),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(3, 1) },
      { status: 'under_review', changed_by: 'Amina Sow', changed_at: daysAgo(2, 5) },
      { status: 'deferred', changed_by: 'Amina Sow', changed_at: daysAgo(1, 8) },
    ],
  },
  {
    id: 'wl_013',
    full_name: 'Folake Ogunleye',
    email: 'folake.ogunleye@punchng.com',
    company: 'The Punch',
    role_title: 'Head of Digital',
    use_case: 'Bulk verification of daily user submissions across multiple verticals.',
    status: 'approved',
    notes: 'Team plan. Onboarding scheduled for next week.',
    created_at: daysAgo(2, 4),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(2, 4) },
      { status: 'under_review', changed_by: 'James Adedapo', changed_at: daysAgo(1, 6) },
      { status: 'approved', changed_by: 'James Adedapo', changed_at: daysAgo(0, 10) },
    ],
  },
  {
    id: 'wl_014',
    full_name: 'Thabo Mokoena',
    email: 'thabo.mokoena@sabc.co.za',
    company: 'SABC',
    role_title: 'Acting News Director',
    use_case: 'Verification pipeline integration for national broadcaster editorial workflows.',
    status: 'waitlist_submitted',
    notes: 'Significant volume anticipated. Needs enterprise assessment.',
    created_at: daysAgo(2, 1),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(2, 1) },
    ],
  },
  {
    id: 'wl_015',
    full_name: 'Yvonne Nkosi',
    email: 'yvonne.nkosi@africacheck.org',
    company: 'Africa Check',
    role_title: 'Deputy Editor',
    use_case: 'Fact-checking toolkit integration — verify viral claims and doctored media.',
    status: 'under_review',
    notes: 'Non-profit partnership potential. Flag for BD team.',
    created_at: daysAgo(1, 6),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(1, 6) },
      { status: 'under_review', changed_by: 'Amina Sow', changed_at: daysAgo(0, 4) },
    ],
  },
  {
    id: 'wl_016',
    full_name: 'Rashid Mwangi',
    email: 'rashid.mwangi@citizentv.co.ke',
    company: 'Citizen TV',
    role_title: 'Investigative Producer',
    use_case: 'Deepfake detection in political interviews and campaign advertisements.',
    status: 'rejected',
    notes: 'Rejected — duplicate application from same organization.',
    created_at: daysAgo(1, 3),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(1, 3) },
      { status: 'under_review', changed_by: 'James Adedapo', changed_at: daysAgo(0, 6) },
      { status: 'rejected', changed_by: 'James Adedapo', changed_at: daysAgo(0, 2) },
    ],
  },
  {
    id: 'wl_017',
    full_name: 'Aminata Touré',
    email: 'aminata.toure@afriradio.sn',
    company: 'AfriRadio Senegal',
    role_title: 'Programme Director',
    use_case: 'Audio deepfake detection for radio broadcast verification.',
    status: 'waitlist_submitted',
    notes: '',
    created_at: daysAgo(0, 8),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(0, 8) },
    ],
  },
  {
    id: 'wl_018',
    full_name: 'Chinedu Okonkwo',
    email: 'chinedu.okonkwo@premiumtimesng.com',
    company: 'Premium Times',
    role_title: 'Senior Investigative Reporter',
    use_case: 'Verify leaked document scans and government memo images for authenticity.',
    status: 'under_review',
    notes: 'Investigative journalism use case. High trust requirements.',
    created_at: daysAgo(0, 2),
    status_history: [
      { status: 'waitlist_submitted', changed_by: 'system', changed_at: daysAgo(0, 2) },
      { status: 'under_review', changed_by: 'Amina Sow', changed_at: daysAgo(0, 1) },
    ],
  },
]

// ---------------------------------------------------------------------------
// Scans / Jobs (25 records, varied statuses + verdicts)
// ---------------------------------------------------------------------------

export const mockScans = Array.from({ length: 25 }, (_, i) => {
  const statuses = ['queued', 'processing', 'completed', 'failed', 'completed', 'completed', 'completed', 'processing', 'queued', 'completed']
  const verdicts = ['authentic', 'suspicious', 'inconclusive', null, 'authentic', 'suspicious', 'authentic', null, null, 'inconclusive']
  const filenames = [
    'IMG_20260715_143022.jpg',
    'cctv_footage_warehouse.mp4',
    'press_briefing_july14.mp4',
    'governor_statement_clip.mp4',
    'social_media_screenshot_001.png',
    'election_rally_crowd_shot.jpg',
    'audio_interview_minister.wav',
    'telegram_forward_video.mp4',
    'whatsapp_voice_note_001.ogg',
    'document_scan_policy_memo.pdf',
    'campaign_ad_final.mp4',
    'witness_testimony_recording.mp3',
    'IMG_20260719_083015.jpg',
    'protest_footage_drone.mp4',
    'official_communique_page1.png',
    'newscast_clip_2200.mp4',
    'security_camera_footage.mp4',
    'blog_post_screenshot.png',
    'parliament_session_audio.wav',
    'tiktok_viral_clip.mp4',
    'leaked_memo_scan.pdf',
    'press_conference_raw.mp4',
    'facebook_live_capture.mp4',
    'satellite_image_region.jpg',
    'youtube_debate_excerpt.mp4',
  ]
  const mimeTypes = [
    'image/jpeg', 'video/mp4', 'video/mp4', 'video/mp4', 'image/png',
    'image/jpeg', 'audio/wav', 'video/mp4', 'audio/ogg', 'application/pdf',
    'video/mp4', 'audio/mpeg', 'image/jpeg', 'video/mp4', 'image/png',
    'video/mp4', 'video/mp4', 'image/png', 'audio/wav', 'video/mp4',
    'application/pdf', 'video/mp4', 'video/mp4', 'image/jpeg', 'video/mp4',
  ]
  const userIds = mockUsers.map((u) => u.id)
  const status = statuses[i % statuses.length]
  const verdict = status === 'completed' ? verdicts[i % verdicts.length] : null

  const resultPayload =
    status === 'completed'
      ? {
          payload_version: '1.0.0',
          signals: [
            {
              model: 'generative-fingerprint-v2',
              confidence: Math.round(40 + Math.random() * 50),
              label: 'Generative fingerprint analysis',
              verdict: Math.random() > 0.5 ? 'synthetic_indicators' : 'natural_origin',
            },
            {
              model: 'frequency-domain-v1',
              confidence: Math.round(30 + Math.random() * 55),
              label: 'Frequency-domain analysis',
              verdict: Math.random() > 0.5 ? 'anomaly_detected' : 'no_anomaly',
            },
            {
              model: 'metadata-integrity-v3',
              confidence: Math.round(50 + Math.random() * 45),
              label: 'Metadata integrity check',
              verdict: Math.random() > 0.5 ? 'incomplete_metadata' : 'verified_metadata',
            },
            {
              model: 'continuity-v2',
              confidence: Math.round(20 + Math.random() * 60),
              label: 'Frame continuity analysis',
              verdict: Math.random() > 0.5 ? 'continuity_break' : 'consistent',
            },
          ],
          report_id: `PRV-202607${String(15 + Math.floor(i / 2)).padStart(2, '0')}-${String(30 + i).padStart(3, '0')}`,
        }
      : null

  return {
    id: `scan_${String(i + 1).padStart(3, '0')}`,
    user_id: userIds[i % userIds.length],
    team_id: mockUserTeamById[userIds[i % userIds.length]],
    original_filename: filenames[i % filenames.length],
    file_size_bytes: Math.round(512 * 1024 + Math.random() * 50 * 1024 * 1024),
    mime_type: mimeTypes[i % mimeTypes.length],
    status,
    verdict,
    result_payload: resultPayload,
    processing_mode: i % 3 === 0 ? 'deep' : i % 3 === 1 ? 'quick' : 'standard',
    created_at: daysAgo(Math.floor(i / 2), i % 24),
    completed_at: status === 'completed' ? daysAgo(Math.floor(i / 2), (i % 24) + 2) : null,
  }
})

// ---------------------------------------------------------------------------
// Reports (15 records)
// ---------------------------------------------------------------------------

export const mockReports = Array.from({ length: 15 }, (_, i) => {
  const verdicts = ['authentic', 'suspicious', 'inconclusive']
  const verdict = verdicts[i % 3]
  const signals = [
    {
      model: 'generative-fingerprint-v2',
      confidence: Math.round(60 + Math.random() * 35),
      label: 'Generative fingerprint analysis',
      finding: Math.random() > 0.4 ? 'Model signature detected' : 'No known model match',
    },
    {
      model: 'frequency-domain-v1',
      confidence: Math.round(40 + Math.random() * 50),
      label: 'Frequency-domain analysis',
      finding: Math.random() > 0.5 ? 'Anomalous spectral energy' : 'Normal frequency distribution',
    },
    {
      model: 'metadata-integrity-v3',
      confidence: Math.round(50 + Math.random() * 45),
      label: 'Metadata integrity',
      finding: Math.random() > 0.5 ? 'Metadata chain incomplete' : 'Metadata verified',
    },
    {
      model: 'watermark-provenance-v1',
      confidence: Math.round(20 + Math.random() * 65),
      label: 'Watermark & provenance',
      finding: Math.random() > 0.6 ? 'No trusted credential located' : 'C2PA manifest present',
    },
    {
      model: 'temporal-continuity-v2',
      confidence: Math.round(30 + Math.random() * 55),
      label: 'Temporal continuity',
      finding: Math.random() > 0.4 ? 'Continuity break detected' : 'Continuous motion flow',
    },
  ]
  const selectedSignals = signals.slice(0, 3 + Math.floor(Math.random() * 3))
  // Attribution: the report mirrors scan_00{i+1}, so the owning user/team/org
  // reuse the same rotation as mockScans — the admin Reports page can badge
  // and filter by team and resolve the org, matching the workspace ledger.
  const ownerUser = mockUsers[i % mockUsers.length]

  return {
    id: `rpt_${String(i + 1).padStart(3, '0')}`,
    scan_id: `scan_${String(i + 1).padStart(3, '0')}`,
    status: 'completed',
    user_id: ownerUser.id,
    team_id: mockUserTeamById[ownerUser.id],
    org_id: ownerUser.org_id,
    report_id: `PRV-202607${String(15 + Math.floor(i / 2)).padStart(2, '0')}-${String(30 + i).padStart(3, '0')}`,
    verdict,
    confidence_score: Math.round(60 + Math.random() * 35),
    signals: selectedSignals,
    created_at: daysAgo(Math.floor(i / 2), i % 24),
  }
})

// ---------------------------------------------------------------------------
// Audit Events (30 records)
// ---------------------------------------------------------------------------

// Deterministic action → severity mapping for the audit trail (the admin
// Audit Logs page filters and badges on it). Destructive/security actions
// are high; reads and routine updates are low.
export const AUDIT_SEVERITY_BY_ACTION = {
  'scan.failed': 'high',
  'waitlist.rejected': 'high',
  'team.member_removed': 'high',
  'api_key.revoked': 'high',
  'role.changed': 'high',
  'feature_flag.toggled': 'high',
  'new_device_signin': 'high',
  'refresh_token_rejected': 'high',
  'refresh_lockout': 'high',
  'signin_lockout': 'high',
  'member_session_revoked': 'high',
  'member_sessions_revoked': 'high',
  'session.revoked': 'high',
  'user.invited': 'medium',
  'session_revoked': 'medium',
  // Password change (SecurityService.changePassword → auth_audit_events feed;
  // the admin trail gets per-session session.revoked rows from the same call).
  'password_changed': 'low',
  'waitlist.approved': 'medium',
  'waitlist.deferred': 'medium',
  'team.member_added': 'medium',
  'api_key.created': 'medium',
  'org.created': 'medium',
  'invite.accepted': 'medium',
  'scan.submitted': 'medium',
  'scan.retried': 'medium',
  'user.activated': 'low',
  'scan.completed': 'low',
  'report.exported': 'low',
  'report.viewed': 'low',
  'settings.updated': 'low',
  'waitlist.reviewed': 'low',
}

export const mockAuditEvents = Array.from({ length: 30 }, (_, i) => {
  const actions = [
    'user.invited', 'user.activated', 'scan.submitted', 'scan.completed',
    'waitlist.reviewed', 'waitlist.approved', 'waitlist.rejected', 'waitlist.deferred',
    'report.exported', 'report.viewed', 'settings.updated', 'team.member_added',
    'team.member_removed', 'api_key.created', 'api_key.revoked', 'feature_flag.toggled',
    'role.changed', 'org.created', 'invite.accepted', 'scan.failed',
  ]
  const resourceTypes = [
    'user', 'scan', 'waitlist_application', 'report', 'settings',
    'team', 'api_key', 'feature_flag', 'role', 'organization', 'invite',
  ]
  const actorEmails = mockUsers.map((u) => u.email)
  const action = actions[i % actions.length]

  return {
    id: `audit_${String(i + 1).padStart(4, '0')}`,
    actor_email: actorEmails[i % actorEmails.length],
    action,
    severity: AUDIT_SEVERITY_BY_ACTION[action] || 'low',
    resource_type: resourceTypes[i % resourceTypes.length],
    resource_id: `${resourceTypes[i % resourceTypes.length]}_${String(i + 1).padStart(4, '0')}`,
    created_at: daysAgo(Math.floor(i / 2), i % 24),
  }
})

// ---------------------------------------------------------------------------
// Feature Flags (10 records)
// ---------------------------------------------------------------------------

export const mockFeatureFlags = [
  {
    key: 'deep_scan_mode',
    label: 'Deep Scan Mode',
    description: 'Enable full forensic analysis pipeline for uploads.',
    enabled: true,
    exposure: 'all_users',
    owner: 'James Adedapo',
  },
  {
    key: 'team_workspaces',
    label: 'Team Workspaces',
    description: 'Multi-user organization workspaces with shared scans and reports.',
    enabled: true,
    exposure: 'org_admins',
    owner: 'Amina Sow',
  },
  {
    key: 'api_access_v1',
    label: 'API Access v1',
    description: 'REST API for programmatic scan submission and report retrieval.',
    enabled: false,
    exposure: 'org_admins',
    owner: 'James Adedapo',
  },
  {
    key: 'report_export_pdf',
    label: 'PDF Report Export',
    description: 'Download verification reports as print-ready PDF documents.',
    enabled: true,
    exposure: 'all_users',
    owner: 'Amina Sow',
  },
  {
    key: 'watermark_detection',
    label: 'Watermark Detection',
    description: 'C2PA and embedded credential scanning pipeline.',
    enabled: true,
    exposure: 'all_users',
    owner: 'James Adedapo',
  },
  {
    key: 'email_notifications',
    label: 'Email Notifications',
    description: 'Transactional emails for scan completion, invites, and alerts.',
    enabled: true,
    exposure: 'all_users',
    owner: 'Amina Sow',
  },
  {
    key: 'bulk_upload',
    label: 'Bulk Upload',
    description: 'Upload and verify multiple media files in a single batch.',
    enabled: false,
    exposure: 'team_admins',
    owner: 'James Adedapo',
  },
  {
    key: 'ai_provider_fallback',
    label: 'AI Provider Fallback',
    description: 'Automatic failover to secondary AI provider when primary is degraded.',
    enabled: true,
    exposure: 'internal',
    owner: 'James Adedapo',
  },
  {
    key: 'usage_analytics',
    label: 'Usage Analytics Dashboard',
    description: 'Per-organization usage stats and scan volume reporting.',
    enabled: false,
    exposure: 'org_admins',
    owner: 'Amina Sow',
  },
  {
    key: 'sso_integration',
    label: 'SSO Integration (SAML/OIDC)',
    description: 'Enterprise single sign-on for organization members.',
    enabled: false,
    exposure: 'super_admin',
    owner: 'James Adedapo',
  },
]

// ---------------------------------------------------------------------------
// Notifications (20 records)
// ---------------------------------------------------------------------------

export const mockNotifications = Array.from({ length: 20 }, (_, i) => {
  const categories = ['scan', 'system', 'team', 'billing', 'security']
  // Deep links land on /app/reports/:scanId, which resolves against the scan
  // store — so links must use scan ids, and only scans with a result payload
  // (status 'completed') render a full report. Map linked notifications onto
  // the completed scans (7, 10, 13, 16, 19 are all 'completed' in mockScans).
  const reportLinkScans = [7, 10, 13, 16, 19]
  const titles = [
    'Scan completed successfully',
    'Verification report ready',
    'New team member joined',
    'Scan processing failed',
    'Suspicious media detected',
    'Invoice available for July 2026',
    'API key was rotated',
    'Feature flag updated',
    'Waitlist application approved',
    'Storage quota at 80%',
    'New admin added to workspace',
    'Report export completed',
    'System maintenance scheduled',
    'Password changed successfully',
    'Invite accepted by team member',
    'Bulk scan batch complete',
    'AI provider status updated',
    'Security alert: unusual activity',
    'Monthly usage summary ready',
    'Deep scan mode enabled',
  ]

  return {
    id: `notif_${String(i + 1).padStart(3, '0')}`,
    category: categories[i % categories.length],
    title: titles[i % titles.length],
    description: titles[i % titles.length] + ' — tap to view details.',
    read: i > 12,
    link:
      i % 3 === 0
        ? `/app/reports/scan_${String(
            reportLinkScans[Math.floor(i / 3) % reportLinkScans.length],
          ).padStart(3, '0')}`
        : null,
    created_at: daysAgo(Math.floor(i / 3), i % 24),
  }
})

// ---------------------------------------------------------------------------
// System Health
// ---------------------------------------------------------------------------

export const mockSystemHealth = {
  api: true,
  database: true,
  storage: true,
  queue: true,
  worker: false,
  email: true,
}

// ---------------------------------------------------------------------------
// Queue Snapshot
// ---------------------------------------------------------------------------

export const mockQueueSnapshot = {
  queued: 8,
  processing: 3,
  failed: 2,
  avg_processing_time_ms: 1240,
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

// Deterministic 14-day volume trend so the analytics chart is stable across
// reloads and screenshots (no module-load randomness).
const VOLUME_TREND_SCANS = [26, 31, 29, 38, 44, 41, 52, 58, 54, 63, 71, 68, 79, 84]

export const mockAnalytics = {
  scans_today: 47,
  scans_7d: 312,
  completion_rate: 0.94,
  failure_rate: 0.03,
  suspicious_rate: 0.22,
  media_type_distribution: {
    'video/mp4': 142,
    'image/jpeg': 84,
    'image/png': 41,
    'audio/wav': 19,
    'audio/mpeg': 14,
    'application/pdf': 12,
  },
  // Daily volume for the last 14 days (index 0 = oldest).
  volume_trend: VOLUME_TREND_SCANS.map((scans, i) => {
    const completed = Math.round(scans * (0.9 + (i % 3) * 0.02))
    return {
      date: daysAgo(13 - i, 8 + (i % 10)),
      scans,
      completed: Math.min(completed, scans),
      failed: Math.round(scans * 0.03) + (i % 4 === 0 ? 1 : 0),
      suspicious: Math.round(scans * (0.18 + (i % 5) * 0.02)),
    }
  }),
  // Daily verdict mix for the same 14-day window — authentic/suspicious/
  // inconclusive splits that always sum to the day's scan total.
  verdict_trend: VOLUME_TREND_SCANS.map((scans, i) => {
    const authentic = Math.round(scans * (0.54 + (i % 3) * 0.02))
    const suspicious = Math.round(scans * (0.2 + (i % 4) * 0.015))
    return {
      date: daysAgo(13 - i, 8 + (i % 10)),
      authentic,
      suspicious,
      inconclusive: Math.max(0, scans - authentic - suspicious),
    }
  }),
  // Queue throughput — headline stats mirroring mockQueueSnapshot plus a
  // deterministic 12-hour series of scans processed per hour.
  queue_throughput: {
    processed_last_hour: 31,
    processed_24h: 442,
    avg_processing_time_ms: mockQueueSnapshot.avg_processing_time_ms,
    queue_depth: mockQueueSnapshot.queued,
    in_flight: mockQueueSnapshot.processing,
    failure_rate: 0.03,
    hourly_series: [14, 18, 16, 22, 27, 24, 19, 21, 26, 31, 28, 31].map(
      (processed, i) => ({ hour: daysAgo(0, -(11 - i)), processed }),
    ),
  },
  // Top organizations by scan volume, derived from the org registry.
  top_organizations: mockOrganizations
    .slice()
    .sort((a, b) => b.scan_count - a.scan_count)
    .slice(0, 6)
    .map((org, i) => ({
      id: org.id,
      name: org.name,
      member_count: org.member_count,
      scan_count: org.scan_count,
      storage_used_gb: org.storage_used_gb,
      completion_rate: 0.9 + (i % 4) * 0.015,
    })),
}

// ---------------------------------------------------------------------------
// Support Tickets (8 records)
// ---------------------------------------------------------------------------

export const mockSupportTickets = [
  {
    id: 'ticket_001',
    subject: 'Unable to upload MP4 files larger than 500MB',
    status: 'open',
    priority: 'high',
    created_by: 'David Okafor',
    created_at: daysAgo(2, 3),
  },
  {
    id: 'ticket_002',
    subject: 'Report PDF export missing signals section',
    status: 'in_progress',
    priority: 'medium',
    created_by: 'Fatima Abubakar',
    created_at: daysAgo(4, 1),
  },
  {
    id: 'ticket_003',
    subject: 'Request: bulk invite for 20 team members',
    status: 'open',
    priority: 'low',
    created_by: 'Grace Otieno',
    created_at: daysAgo(5, 6),
  },
  {
    id: 'ticket_004',
    subject: 'False positive — authentic video flagged as suspicious',
    status: 'resolved',
    priority: 'high',
    created_by: 'Chioma Eze',
    created_at: daysAgo(7, 2),
  },
  {
    id: 'ticket_005',
    subject: 'API rate limiting too aggressive for batch scans',
    status: 'in_progress',
    priority: 'medium',
    created_by: 'Nadia Koné',
    created_at: daysAgo(8, 4),
  },
  {
    id: 'ticket_006',
    subject: 'Account locked after multiple failed login attempts',
    status: 'resolved',
    priority: 'urgent',
    created_by: 'Emeka Nwosu',
    created_at: daysAgo(10, 1),
  },
  {
    id: 'ticket_007',
    subject: 'Feature request: WhatsApp share integration',
    status: 'open',
    priority: 'low',
    created_by: 'Paul Mensah',
    created_at: daysAgo(12, 5),
  },
  {
    id: 'ticket_008',
    subject: 'Clarification on AI model version used for scans',
    status: 'closed',
    priority: 'low',
    created_by: 'Tunde Bakare',
    created_at: daysAgo(14, 3),
  },
]

// ---------------------------------------------------------------------------
// Monitoring (system health, service status, incident history)
// ---------------------------------------------------------------------------

// Status vocabulary matches HealthCheckRow: operational | unreachable |
// degraded | not_configured. Worker is intentionally degraded so the overall
// status reads honestly (mirrors mockSystemHealth.worker = false).
export const mockMonitoring = {
  overall: {
    status: 'degraded',
    uptime_30d: 0.99982,
    avg_response_ms: 214,
    open_incidents: 1,
    checks_24h: 2880,
  },
  services: [
    {
      id: 'api',
      name: 'API Gateway',
      status: 'operational',
      latency_ms: 142,
      region: 'fly-iad',
      uptime_30d: 0.9999,
      last_checked_at: daysAgo(0, -1),
    },
    {
      id: 'database',
      name: 'Postgres (Neon)',
      status: 'operational',
      latency_ms: 86,
      region: 'us-east-1',
      uptime_30d: 0.99998,
      last_checked_at: daysAgo(0, -1),
    },
    {
      id: 'storage',
      name: 'Object Storage (R2)',
      status: 'operational',
      latency_ms: 118,
      region: 'us-east-1',
      uptime_30d: 0.9997,
      last_checked_at: daysAgo(0, -1),
    },
    {
      id: 'queue',
      name: 'Job Queue (Redis)',
      status: 'operational',
      latency_ms: 24,
      region: 'us-east-1',
      uptime_30d: 0.9999,
      last_checked_at: daysAgo(0, -1),
    },
    {
      id: 'worker',
      name: 'Scan Worker',
      status: 'degraded',
      latency_ms: 460,
      region: 'fly-iad',
      uptime_30d: 0.9951,
      last_checked_at: daysAgo(0, -2),
    },
    {
      id: 'email',
      name: 'Email Service',
      status: 'not_configured',
      latency_ms: null,
      region: '—',
      uptime_30d: null,
      last_checked_at: daysAgo(2, 4),
    },
  ],
  // ── Queue health ─────────────────────────────────────────────────────────
  // Backlog, throughput, and worker cadence. Values are consistent with
  // mockQueueSnapshot + mockAnalytics.queue_throughput so the admin monitoring
  // and analytics surfaces never contradict each other. hourly_series is the
  // 12h intraday cadence; daily_series is the 14-day trend (processed /
  // completed / failed per day) that the queue-health TrendChart renders.
  queue_health: {
    queued: mockQueueSnapshot.queued,
    in_flight: mockQueueSnapshot.processing,
    failed_24h: 14,
    throughput_per_hour: 31,
    avg_processing_time_ms: mockQueueSnapshot.avg_processing_time_ms,
    failure_rate: 0.03,
    hourly_series: [14, 18, 16, 22, 27, 24, 19, 21, 26, 31, 28, 31].map(
      (processed, i) => ({ hour: daysAgo(0, -(11 - i)), processed }),
    ),
    // 14-day daily throughput — deterministic, mirrors the hourly cadence at
    // daily scale with a ~3% failure drift.
    daily_series: [312, 336, 298, 354, 381, 366, 342, 389, 402, 378, 415, 431, 406, 442].map(
      (processed, i) => ({
        date: daysAgo(13 - i, 9),
        processed,
        completed: Math.round(processed * 0.97) - (i % 3 === 0 ? 1 : 0),
        failed: Math.round(processed * 0.03) + (i % 3 === 0 ? 1 : 0),
      }),
    ),
  },

  // ── Storage utilization ───────────────────────────────────────────────────
  // Bucket-level usage vs capacity. Bucket totals add up to total_used_gb.
  storage_utilization: {
    total_used_gb: 287.1,
    total_capacity_gb: 500,
    buckets: [
      {
        id: 'media',
        label: 'Media uploads',
        used_gb: 214.3,
        capacity_gb: 320,
        growth_30d: 0.18,
      },
      {
        id: 'reports',
        label: 'Report payloads',
        used_gb: 38.6,
        capacity_gb: 80,
        growth_30d: 0.07,
      },
      {
        id: 'evidence',
        label: 'Evidence payloads',
        used_gb: 26.9,
        capacity_gb: 60,
        growth_30d: 0.04,
      },
      {
        id: 'backups',
        label: 'Backups',
        used_gb: 7.3,
        capacity_gb: 40,
        growth_30d: 0.02,
      },
    ],
  },

  // ── Database performance ──────────────────────────────────────────────────
  db_performance: {
    avg_query_ms: 86,
    p95_query_ms: 142,
    connections: { active: 42, max: 100 },
    cache_hit_rate: 0.982,
    slow_queries_24h: 3,
    tables: [
      { name: 'scans', rows: 12480, size_mb: 512, dead_tuples_pct: 0.018 },
      { name: 'reports', rows: 8902, size_mb: 386, dead_tuples_pct: 0.012 },
      { name: 'audit_events', rows: 34210, size_mb: 148, dead_tuples_pct: 0.024 },
      { name: 'profiles', rows: 142, size_mb: 3, dead_tuples_pct: 0.004 },
    ],
  },

  incidents: [
    {
      id: 'inc_001',
      title: 'Scan worker partial outage',
      severity: 'major',
      status: 'resolved',
      started_at: daysAgo(6, 2),
      resolved_at: daysAgo(5, 9),
      duration_hours: 7,
      services: ['Scan Worker'],
      summary:
        'A memory leak in the fingerprint model worker stalled processing for roughly a third of the queue. A rollback to the previous model release restored throughput.',
    },
    {
      id: 'inc_002',
      title: 'Elevated API latency',
      severity: 'minor',
      status: 'resolved',
      started_at: daysAgo(12, 4),
      resolved_at: daysAgo(12, 11),
      duration_hours: 7,
      services: ['API Gateway'],
      summary:
        'Autoscaling lag under a waitlist invite burst pushed p95 latency above target for seven hours. Autoscaling thresholds were retuned.',
    },
    {
      id: 'inc_003',
      title: 'Storage upload errors',
      severity: 'major',
      status: 'resolved',
      started_at: daysAgo(19, 6),
      resolved_at: daysAgo(19, 9),
      duration_hours: 3,
      services: ['Object Storage (R2)'],
      summary:
        'Signed upload URLs expired early under load, rejecting a subset of media uploads. The signing window was extended and the worker retries added.',
    },
    {
      id: 'inc_004',
      title: 'Scan worker memory pressure',
      severity: 'major',
      status: 'investigating',
      started_at: daysAgo(0, -4),
      resolved_at: null,
      duration_hours: null,
      services: ['Scan Worker'],
      summary:
        'Resident memory on the worker pool is trending upward since the model update. Monitoring is active while a candidate fix is validated.',
    },
    {
      id: 'inc_005',
      title: 'Database connection pool exhaustion',
      severity: 'critical',
      status: 'resolved',
      started_at: daysAgo(25, 3),
      resolved_at: daysAgo(25, 5),
      duration_hours: 2,
      services: ['Postgres (Neon)'],
      summary:
        'A runaway query pattern exhausted the connection pool, causing intermittent timeouts. The query was optimized and pool limits raised.',
    },
  ],
}

// ---------------------------------------------------------------------------
// Incident-derived activity events
//
// Resolved incidents from mockMonitoring.incidents surface in the Activity
// Log as system events, carrying the same post-mortem summary text the
// Monitoring page's incident accordion shows, plus the severity that drives
// the same tone dots. Open incidents are intentionally excluded — they stay
// visible only on the Monitoring page until resolved.
// ---------------------------------------------------------------------------

export function buildIncidentActivityEvents(incidents = mockMonitoring.incidents) {
  return incidents
    .filter((incident) => incident.status === 'resolved')
    .map((incident) => ({
      id: `incident_${incident.id}`,
      action: 'incident.resolved',
      actor_email: 'system',
      resource_type: 'incident',
      resource_id: incident.id,
      created_at: incident.resolved_at || incident.started_at,
      severity: incident.severity,
      summary: incident.summary,
    }))
}

// ---------------------------------------------------------------------------
// Admin dashboard overview (aggregates the above)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Billing (profile, usage, invoices, payment methods)
// ---------------------------------------------------------------------------

export const mockBillingProfile = {
  plan: {
    id: 'pro_monthly',
    name: 'Pro',
    billingCycle: 'monthly',
    priceUsd: 49,
    status: 'active',
    seats: 1,
    startedAt: daysAgo(42, 4),
    renewsAt: daysAgo(-6, 12),
    canChangePlan: true,
  },
  usage: {
    period: 'current-month',
    periodStart: daysAgo(11, 0),
    periodEnd: daysAgo(-20, 0),
    scansUsed: 312,
    scansLimit: 500,
    storageUsedGb: 18.4,
    storageLimitGb: 50,
    apiCallsUsed: 4120,
    apiCallsLimit: 10000,
    // End-of-cycle projection at the current pace (312 over 11 days ≈ 28.4/day
    // → ~880 by day 31, ~380 over the 500 limit). Mirrors the real
    // projectScanUsage shape the backend computes.
    projection: {
      daysElapsed: 11,
      daysInCycle: 31,
      pacePerDay: 28.36,
      projectedScans: 880,
      overageScans: 380,
      overageCostUsd: 19,
    },
  },
  paymentMethods: [
    {
      id: 'pm_001',
      brand: 'visa',
      last4: '4242',
      expMonth: 8,
      expYear: 2028,
      isDefault: true,
    },
    {
      id: 'pm_002',
      brand: 'mastercard',
      last4: '1881',
      expMonth: 2,
      expYear: 2027,
      isDefault: false,
    },
  ],
}

export const mockInvoices = Array.from({ length: 8 }, (_, i) => {
  const ageDays = i * 30
  const amount = 49
  return {
    id: `inv_${String(1000 + i)}`,
    number: `PV-${String(2026).slice(-2)}-${String(1000 + i)}`,
    periodStart: daysAgo(ageDays + 30, 6),
    periodEnd: daysAgo(ageDays, 6),
    issuedAt: daysAgo(ageDays, 6),
    paidAt: i < 6 ? daysAgo(ageDays, 2) : null,
    amountUsd: amount,
    status: i < 6 ? 'paid' : 'open',
    lineItems: [
      { label: 'Pro plan (monthly)', quantity: 1, amountUsd: 49 },
      { label: 'Overage scans', quantity: 0, amountUsd: 0 },
    ],
  }
})

// ---------------------------------------------------------------------------
// Security settings (password, sessions, sign-in controls)
// ---------------------------------------------------------------------------

export const mockSecuritySettings = {
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireNumber: true,
    requireSymbol: true,
  },
  activeSessions: [
    {
      id: 'sess_001',
      device: 'Chrome on Windows',
      location: 'Lagos, NG',
      ipAddress: '105.112.28.41',
      lastActiveAt: daysAgo(0, -1),
      isCurrent: true,
      teamId: mockUserTeamById.usr_001,
    },
    {
      id: 'sess_002',
      device: 'Safari on iPhone',
      location: 'Lagos, NG',
      ipAddress: '105.112.30.12',
      lastActiveAt: daysAgo(2, 9),
      isCurrent: false,
      teamId: mockUserTeamById.usr_001,
    },
    {
      id: 'sess_003',
      device: 'Firefox on macOS',
      location: 'Abuja, NG',
      ipAddress: '102.89.44.7',
      lastActiveAt: daysAgo(5, 14),
      isCurrent: false,
      teamId: mockUserTeamById.usr_001,
    },
    {
      id: 'sess_004',
      device: 'Edge on Windows',
      location: 'Berlin, DE',
      ipAddress: '88.130.94.2',
      lastActiveAt: daysAgo(9, 3),
      isCurrent: false,
      teamId: mockUserTeamById.usr_001,
    },
  ],
  signInControls: {
    twoFactorAuth: { enabled: false, method: null, updatedAt: null },
    emailVerification: { verified: true, verifiedAt: daysAgo(30, 5) },
    sessionTimeoutMinutes: 60,
    notifyOnNewDevice: true,
    notifyOnPasswordChange: true,
  },
}

// ---------------------------------------------------------------------------
// Per-member session ledger (Organization page admin revocation)
//
// Each org-roster member gets tracked sessions; every row carries the
// member's team (teamId) so the drawer badges the ledger. usr_001 (the owner /
// dev admin account) reuses the Security page's rows so both surfaces always
// agree. isCurrent is recomputed by the mock API from the signed-in actor
// (mockGetMemberSessions), so the values here are just defaults.
// ---------------------------------------------------------------------------

export const mockMemberSessionsByUserId = {
  usr_001: mockSecuritySettings.activeSessions,
  usr_002: [
    {
      id: 'sess_101',
      device: 'Chrome on Windows',
      location: 'Lagos, NG',
      ipAddress: '105.112.30.44',
      lastActiveAt: daysAgo(0, -4),
      isCurrent: false,
      teamId: mockUserTeamById.usr_002,
    },
    {
      id: 'sess_102',
      device: 'Safari on iPhone',
      location: 'Abuja, NG',
      ipAddress: '102.89.44.9',
      lastActiveAt: daysAgo(1, 8),
      isCurrent: false,
      teamId: mockUserTeamById.usr_002,
    },
  ],
  usr_011: [
    {
      id: 'sess_201',
      device: 'Firefox on macOS',
      location: 'Enugu, NG',
      ipAddress: '197.210.53.4',
      lastActiveAt: daysAgo(4, 6),
      isCurrent: false,
      teamId: mockUserTeamById.usr_011,
    },
  ],
  usr_012: [
    {
      id: 'sess_301',
      device: 'Edge on Windows',
      location: 'Kano, NG',
      ipAddress: '105.112.82.17',
      lastActiveAt: daysAgo(2, 9),
      isCurrent: false,
      teamId: mockUserTeamById.usr_012,
    },
    {
      id: 'sess_302',
      device: 'Chrome on Android',
      location: 'Kano, NG',
      ipAddress: '105.112.82.19',
      lastActiveAt: daysAgo(0, -7),
      isCurrent: false,
      teamId: mockUserTeamById.usr_012,
    },
    {
      id: 'sess_303',
      device: 'Safari on iPad',
      location: 'Lagos, NG',
      ipAddress: '105.112.28.90',
      lastActiveAt: daysAgo(6, 2),
      isCurrent: false,
      teamId: mockUserTeamById.usr_012,
    },
  ],
}

// ---------------------------------------------------------------------------
// API keys
// ---------------------------------------------------------------------------

export const mockApiKeys = [
  {
    id: 'key_001',
    name: 'Production scanner',
    prefix: 'pv_live_9f2K',
    createdAt: daysAgo(21, 3),
    lastUsedAt: daysAgo(0, -2),
    status: 'active',
    scopes: ['scan:create', 'report:read'],
    requestsLast30d: 18420,
    rateLimitRpm: 120,
    expiresAt: daysAgo(-150, 0),
  },
  {
    id: 'key_002',
    name: 'Staging integration',
    prefix: 'pv_test_4bXm',
    createdAt: daysAgo(14, 6),
    lastUsedAt: daysAgo(1, 5),
    status: 'active',
    scopes: ['scan:create'],
    requestsLast30d: 312,
    rateLimitRpm: 30,
    expiresAt: null,
  },
  {
    id: 'key_003',
    name: 'Analytics export',
    prefix: 'pv_live_7sQw',
    createdAt: daysAgo(60, 2),
    lastUsedAt: daysAgo(9, 4),
    status: 'expired',
    scopes: ['report:read'],
    requestsLast30d: 0,
    rateLimitRpm: 60,
    expiresAt: daysAgo(3, 0),
  },
  {
    id: 'key_004',
    name: 'Legacy batch client',
    prefix: 'pv_test_2kLp',
    createdAt: daysAgo(90, 8),
    lastUsedAt: daysAgo(30, 1),
    status: 'revoked',
    scopes: ['scan:create', 'report:read'],
    requestsLast30d: 0,
    rateLimitRpm: 120,
    expiresAt: null,
  },
]

export const API_KEY_SCOPES = [
  { value: 'scan:create', label: 'Create scans', description: 'Submit media for verification.' },
  { value: 'report:read', label: 'Read reports', description: 'Fetch verdicts and report payloads.' },
  { value: 'admin:usage', label: 'Read usage', description: 'Access usage and billing metadata.' },
]

export const mockApiKeyLimits = {
  keysPerWorkspace: 10,
  defaultRateLimitRpm: 60,
  maxRateLimitRpm: 600,
  tokenLifetimeDays: 180,
}

// ---------------------------------------------------------------------------
// Webhooks (4 endpoints) — approved feature (2026-08-04)
// ---------------------------------------------------------------------------

export const WEBHOOK_EVENTS = [
  {
    value: 'scan.completed',
    label: 'Scan completed',
    description: 'A verification finished with a verdict payload.',
  },
  {
    value: 'scan.failed',
    label: 'Scan failed',
    description: 'A verification could not be completed.',
  },
  {
    value: 'report.ready',
    label: 'Report ready',
    description: 'The report payload is available to fetch.',
  },
  {
    value: 'report.exported',
    label: 'Report exported',
    description: 'A report PDF was exported from the workspace.',
  },
]

export const mockWebhookLimits = {
  endpointsPerWorkspace: 10,
  maxEventsPerEndpoint: WEBHOOK_EVENTS.length,
  deliveryRetentionDays: 14,
  signingAlgo: 'HMAC-SHA256',
}

export const mockWebhooks = [
  {
    id: 'whk_001',
    name: 'Verification completion notifier',
    url: 'https://hooks.acme-internal.com/provance/completed',
    events: ['scan.completed', 'scan.failed'],
    status: 'active',
    createdAt: daysAgo(28, 4),
    lastDeliveryAt: daysAgo(0, -1),
    deliveryCount: 482,
    failureCount: 7,
    secretPrefix: 'whsec_live_9f2K',
  },
  {
    id: 'whk_002',
    name: 'Legal evidence pipeline',
    url: 'https://evidence.legal-trust.example.com/hooks/provance',
    events: ['report.ready'],
    status: 'active',
    createdAt: daysAgo(19, 9),
    lastDeliveryAt: daysAgo(0, -4),
    deliveryCount: 96,
    failureCount: 1,
    secretPrefix: 'whsec_live_4bXm',
  },
  {
    id: 'whk_003',
    name: 'Analytics warehouse sync',
    url: 'https://data.acme-internal.com/ingest/provance',
    events: ['scan.completed', 'scan.failed', 'report.ready'],
    status: 'paused',
    createdAt: daysAgo(11, 2),
    lastDeliveryAt: daysAgo(4, 6),
    deliveryCount: 231,
    failureCount: 12,
    secretPrefix: 'whsec_test_7sQw',
  },
  {
    id: 'whk_004',
    name: 'Slack-style alert channel',
    url: 'https://alerts.internal.example.com/webhook/provance',
    events: ['scan.failed'],
    status: 'active',
    createdAt: daysAgo(5, 1),
    lastDeliveryAt: daysAgo(1, 3),
    deliveryCount: 18,
    failureCount: 3,
    secretPrefix: 'whsec_test_2kLp',
  },
]

// Delivery log per endpoint (mockWebhookDeliveries[id] = deliveries).
// Timestamps are hours ago so the relative labels read naturally.
function hoursAgo(hours) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString()
}

export const mockWebhookDeliveries = {
  whk_001: [
    {
      id: 'dlv_001',
      event: 'scan.completed',
      status: 200,
      attemptedAt: hoursAgo(0.5),
      latencyMs: 214,
      response: '{"ok":true,"accepted":true}',
    },
    {
      id: 'dlv_002',
      event: 'scan.failed',
      status: 200,
      attemptedAt: hoursAgo(2),
      latencyMs: 187,
      response: '{"ok":true,"accepted":true}',
    },
    {
      id: 'dlv_003',
      event: 'scan.completed',
      status: 429,
      attemptedAt: hoursAgo(7),
      latencyMs: 312,
      response: '{"error":"rate_limited"}',
    },
    {
      id: 'dlv_004',
      event: 'scan.completed',
      status: 200,
      attemptedAt: hoursAgo(26),
      latencyMs: 201,
      response: '{"ok":true,"accepted":true}',
    },
    {
      id: 'dlv_005',
      event: 'scan.failed',
      status: 500,
      attemptedAt: hoursAgo(31),
      latencyMs: 1804,
      response: '{"error":"internal"}',
    },
    {
      id: 'dlv_006',
      event: 'scan.completed',
      status: 200,
      attemptedAt: hoursAgo(49),
      latencyMs: 228,
      response: '{"ok":true,"accepted":true}',
    },
  ],
  whk_002: [
    {
      id: 'dlv_007',
      event: 'report.ready',
      status: 200,
      attemptedAt: hoursAgo(1),
      latencyMs: 164,
      response: '{"ok":true,"accepted":true}',
    },
    {
      id: 'dlv_008',
      event: 'report.ready',
      status: 200,
      attemptedAt: hoursAgo(20),
      latencyMs: 172,
      response: '{"ok":true,"accepted":true}',
    },
  ],
  whk_003: [
    {
      id: 'dlv_009',
      event: 'scan.completed',
      status: 200,
      attemptedAt: hoursAgo(6),
      latencyMs: 246,
      response: '{"ok":true,"accepted":true}',
    },
    {
      id: 'dlv_010',
      event: 'report.ready',
      status: 404,
      attemptedAt: hoursAgo(50),
      latencyMs: 90,
      response: '{"error":"not_found"}',
    },
  ],
  whk_004: [
    {
      id: 'dlv_011',
      event: 'scan.failed',
      status: 200,
      attemptedAt: hoursAgo(9),
      latencyMs: 193,
      response: '{"ok":true,"accepted":true}',
    },
    {
      id: 'dlv_012',
      event: 'scan.failed',
      status: 500,
      attemptedAt: hoursAgo(40),
      latencyMs: 2210,
      response: '{"error":"internal"}',
    },
  ],
}

// ---------------------------------------------------------------------------
// Help & documentation content
// ---------------------------------------------------------------------------

export const mockDocsContent = {
  categories: [
    { value: 'getting-started', label: 'Getting started' },
    { value: 'api', label: 'API reference' },
    { value: 'integration', label: 'Integration' },
    { value: 'verification', label: 'Verification' },
  ],
  guides: [
    {
      id: 'guide_001',
      category: 'getting-started',
      title: 'Create your first scan',
      summary: 'Upload media and receive an evidence-backed verdict in under two minutes.',
      readMinutes: 3,
      sections: [
        'Open the Media Upload page and choose a file.',
        'Pick a processing mode: Quick, Standard, or Deep.',
        'Watch the scan move through the queue until the report is ready.',
      ],
    },
    {
      id: 'guide_002',
      category: 'getting-started',
      title: 'Understanding verdicts and confidence',
      summary: 'How to read Authentic, Suspicious, and Inconclusive results alongside confidence scores.',
      readMinutes: 5,
      sections: [
        'Verdicts describe the balance of evidence across all signals.',
        'Confidence reflects how strongly the signal set supports the verdict.',
        'Treat low-confidence Suspicious results as escalation triggers, not proof.',
      ],
    },
    {
      id: 'guide_003',
      category: 'api',
      title: 'Authentication and API keys',
      summary: 'Create scoped keys and authenticate requests with a bearer token.',
      readMinutes: 4,
      sections: [
        'Create a key under API Keys with the scopes you need.',
        'Send the token as a bearer header on every request.',
        'Keys are shown once at creation, so store them in a secrets manager.',
      ],
    },
    {
      id: 'guide_004',
      category: 'api',
      title: 'REST endpoints overview',
      summary: 'The core surfaces: submit scans, list scans, and fetch report payloads.',
      readMinutes: 6,
      sections: [
        'POST /scans initiates a verification with an upload reference.',
        'GET /scans lists workspace scans with status and verdict summaries.',
        'GET /scans/:id returns the full report payload including signals.',
      ],
    },
    {
      id: 'guide_005',
      category: 'integration',
      title: 'Webhooks for scan completion',
      summary: 'Get notified the moment a verification finishes without polling.',
      readMinutes: 5,
      sections: [
        'Register a webhook URL to receive scan.completed events.',
        'Payloads include the scan id, verdict, and confidence.',
        'Retry with exponential backoff on 5xx responses.',
      ],
    },
    {
      id: 'guide_006',
      category: 'verification',
      title: 'Choosing a processing mode',
      summary: 'Quick, Standard, and Deep trade speed against depth of analysis.',
      readMinutes: 4,
      sections: [
        'Quick returns a triage verdict in seconds for high-volume review.',
        'Standard runs the full signal suite for most workflows.',
        'Deep adds extended forensics for high-stakes media.',
      ],
    },      { id: 'guide_007',
      category: 'verification',
      title: 'Exporting and sharing reports',
      summary: 'Produce printable PDF reports and share them with stakeholders.',
      readMinutes: 3,
      sections: [
        'Open the report and choose the printable view.',
        'Reports carry the verdict, confidence, and signal evidence.',
        'Share the print view with reviewers or export for records.',
      ],
    },
  ],
  channels: [
    {
      id: 'channel_email',
      label: 'Email support',
      description: 'For detailed questions and account issues.',
      value: 'support@provance.app',
      href: 'mailto:support@provance.app',
    },
    {
      id: 'channel_community',
      label: 'Community',
      description: 'Discuss workflows and share best practices.',
      value: 'Join the community',
      href: '/resources',
    },
    {
      id: 'channel_reference',
      label: 'API reference',
      description: 'The full endpoint and schema reference.',
      value: 'Browse the reference',
      href: '/app/docs',
    },
  ],
}

export const mockHelpContent = {
  categories: [
    { value: 'billing', label: 'Billing' },
    { value: 'workspace', label: 'Workspace' },
    { value: 'security', label: 'Security' },
    { value: 'api', label: 'API & integrations' },
  ],
  faqs: [
    {
      id: 'faq_001',
      category: 'billing',
      question: 'How does billing work?',
      answer:
        'Plans are billed monthly per workspace. Usage is metered against your plan limits, and overage applies only beyond the included allowance. Billing is currently a UI preview, so no charges are processed yet.',
    },
    {
      id: 'faq_002',
      category: 'billing',
      question: 'Can I change plans later?',
      answer:
        'Yes. Plan changes apply at the next billing cycle. Upgrading raises your limits immediately; downgrading takes effect at renewal.',
    },
    {
      id: 'faq_003',
      category: 'workspace',
      question: 'How do I invite teammates?',
      answer:
        'Organization owners can invite members from the Organization page. Invites carry a role, and members appear in the roster once they accept.',
    },
    {
      id: 'faq_004',
      category: 'workspace',
      question: 'Where do my scan results live?',
      answer:
        'Every verification appears in Scan History and the Verification Reports list. Completed scans expose a full report with verdict, confidence, and per-signal evidence.',
    },
    {
      id: 'faq_005',
      category: 'security',
      question: 'How are my files handled?',
      answer:
        'Uploaded media is processed for verification and stored for the duration of your workspace retention policy. Access is scoped to your organization and audited.',
    },
    {
      id: 'faq_006',
      category: 'security',
      question: 'What is two-factor authentication?',
      answer:
        'Two-factor authentication adds a verification code at sign-in. It is exposed here as a preview control and will be wired to a real provider before launch.',
    },
    {
      id: 'faq_007',
      category: 'api',
      question: 'How do I get an API key?',
      answer:
        'Create one under API Keys. Choose the scopes you need, and store the token securely, since it is only shown once at creation.',
    },
    {
      id: 'faq_008',
      category: 'api',
      question: 'What are the rate limits?',
      answer:
        'Keys default to 60 requests per minute and can be raised up to 600 on request. Rate limits apply per key, not per workspace.',
    },
  ],
  channels: [
    {
      id: 'channel_email',
      label: 'Email support',
      description: 'For detailed questions and account issues.',
      value: 'support@provance.app',
      href: 'mailto:support@provance.app',
    },
    {
      id: 'channel_docs',
      label: 'Documentation',
      description: 'API reference and integration guides.',
      value: 'Read the docs',
      href: '/app/docs',
    },
    {
      id: 'channel_community',
      label: 'Community',
      description: 'Discuss workflows and share best practices.',
      value: 'Join the community',
      href: '/resources',
    },
  ],
}

// ---------------------------------------------------------------------------
// Organization workspace (roster, invites, profile)
// ---------------------------------------------------------------------------

export const mockOrgWorkspace = {
  profile: {
    id: 'org_001',
    name: 'Provance Internal',
    plan: 'Pro',
    seats: 4,
    seatsUsed: 4,
    storageUsedGb: 18.4,
    storageLimitGb: 50,
    scanCount: 342,
    created_at: daysAgo(30, 0),
  },
  members: [
    {
      id: 'usr_001',
      displayName: 'Joshua Onyekachukwu',
      email: 'joshua.onyekachukwu@provance.io',
      role: 'owner',
      team: 'team_legal',
      status: 'active',
      last_active_at: daysAgo(0, -1),
    },
    {
      id: 'usr_002',
      displayName: 'Amina Sow',
      email: 'amina.sow@provance.io',
      role: 'admin',
      team: 'team_legal',
      status: 'active',
      last_active_at: daysAgo(0, -3),
    },
    {
      id: 'usr_011',
      displayName: 'Ngozi Ugwu',
      email: 'ngozi.ugwu@provance.io',
      role: 'member',
      team: 'team_product',
      status: 'active',
      last_active_at: daysAgo(4, 2),
    },
    {
      id: 'usr_012',
      displayName: 'Kwame Boateng',
      email: 'kwame.boateng@provance.io',
      role: 'member',
      team: 'team_growth',
      status: 'active',
      last_active_at: daysAgo(2, 3),
    },
  ],
  pendingInvites: [
    {
      id: 'inv_001',
      email: 'tunde.balogun@provance.io',
      role: 'member',
      team: 'team_legal',
      invitedAt: daysAgo(2, 5),
      expiresAt: daysAgo(-5, 0),
    },
    {
      id: 'inv_002',
      email: 'sarah.kim@provance.io',
      role: 'admin',
      team: 'team_product',
      invitedAt: daysAgo(1, 8),
      expiresAt: daysAgo(-6, 0),
    },
  ],
}

// Workspace teams — members are assigned to exactly one team; the roster is the
// source of truth for counts (kept in sync with removals), so memberIds here
// are only a starting point.
// ---------------------------------------------------------------------------
// Admin verification jobs (derived from the scan store, job-view flavored)
// ---------------------------------------------------------------------------

const JOB_WORKERS = ['worker-eu-01', 'worker-eu-02', 'worker-us-01', 'worker-ap-01']
const JOB_PRIORITIES = ['high', 'medium', 'low']

export const mockAdminJobs = mockScans.map((scan, i) => {
  const failed = scan.status === 'failed'
  const processing = scan.status === 'processing'
  const completed = scan.status === 'completed'
  return {
    id: `job_${String(i + 1).padStart(3, '0')}`,
    scan_id: scan.id,
    original_filename: scan.original_filename,
    mime_type: scan.mime_type,
    status: scan.status,
    priority: JOB_PRIORITIES[i % JOB_PRIORITIES.length],
    attempts: failed ? 2 + (i % 2) : processing ? 1 : 1,
    progress: completed ? 100 : processing ? 40 + (i % 5) * 12 : failed ? 62 : 0,
    worker: JOB_WORKERS[i % JOB_WORKERS.length],
    processing_mode: scan.processing_mode,
    created_at: scan.created_at,
    started_at: scan.status === 'queued' ? null : daysAgo(Math.floor(i / 2), (i % 24) + 1),
    completed_at: scan.completed_at,
    error:
      failed && i % 3 === 0
        ? 'Worker exceeded memory limit while decoding video frames (EXIF + frame sampling).'
        : failed && i % 3 === 1
          ? 'Model signature endpoint returned 502 after 3 retries.'
          : failed
            ? 'Input file failed MIME validation: declared type did not match container.'
            : null,
    // Completed jobs carry the evidence payload for per-job inspection
    // (signals + report id) — mirrors scan.result_payload.
    result_payload: completed ? scan.result_payload || null : null,
  }
})

export const mockJobStatusCounts = mockAdminJobs.reduce(
  (acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1
    return acc
  },
  { queued: 0, processing: 0, completed: 0, failed: 0 },
)

// ---------------------------------------------------------------------------
// Admin RBAC roles + permission matrix
// ---------------------------------------------------------------------------

export const mockAdminRoles = [
  {
    id: 'role_owner',
    name: 'Owner',
    description: 'Full control — billing, membership, security, and all platform configuration.',
    member_count: 1,
    scope_summary: 'Everything',
    scopes: {
      'scans.read': true,
      'scans.create': true,
      'scans.revoke': true,
      'reports.read': true,
      'reports.export': true,
      'members.manage': true,
      'roles.manage': true,
      'billing.manage': true,
      'flags.manage': true,
      'audit.read': true,
    },
    editable: false,
  },
  {
    id: 'role_admin',
    name: 'Admin',
    description: 'Operational control — members, feature flags, and verification oversight.',
    member_count: 3,
    scope_summary: 'Ops + members',
    scopes: {
      'scans.read': true,
      'scans.create': true,
      'scans.revoke': true,
      'reports.read': true,
      'reports.export': true,
      'members.manage': true,
      'roles.manage': false,
      'billing.manage': false,
      'flags.manage': true,
      'audit.read': true,
    },
    editable: true,
  },
  {
    id: 'role_analyst',
    name: 'Analyst',
    description: 'Submit and review verifications — read and export reports, no admin controls.',
    member_count: 6,
    scope_summary: 'Verify + export',
    scopes: {
      'scans.read': true,
      'scans.create': true,
      'scans.revoke': false,
      'reports.read': true,
      'reports.export': true,
      'members.manage': false,
      'roles.manage': false,
      'billing.manage': false,
      'flags.manage': false,
      'audit.read': false,
    },
    editable: true,
  },
  {
    id: 'role_viewer',
    name: 'Viewer',
    description: 'Read-only access to scans and reports for compliance and oversight.',
    member_count: 2,
    scope_summary: 'Read-only',
    scopes: {
      'scans.read': true,
      'scans.create': false,
      'scans.revoke': false,
      'reports.read': true,
      'reports.export': false,
      'members.manage': false,
      'roles.manage': false,
      'billing.manage': false,
      'flags.manage': false,
      'audit.read': true,
    },
    editable: true,
  },
]

export const mockRoleScopeMeta = [
  { key: 'scans.read', label: 'Read scans', group: 'Verification' },
  { key: 'scans.create', label: 'Submit verifications', group: 'Verification' },
  { key: 'scans.revoke', label: 'Revoke scans', group: 'Verification' },
  { key: 'reports.read', label: 'Read reports', group: 'Reports' },
  { key: 'reports.export', label: 'Export reports', group: 'Reports' },
  { key: 'members.manage', label: 'Manage members', group: 'Organization' },
  { key: 'roles.manage', label: 'Manage roles', group: 'Organization' },
  { key: 'billing.manage', label: 'Manage billing', group: 'Organization' },
  { key: 'flags.manage', label: 'Manage feature flags', group: 'Platform' },
  { key: 'audit.read', label: 'Read audit logs', group: 'Platform' },
]

// ---------------------------------------------------------------------------
// Role → member roster (single source of truth for the Roles page's member
// assignment surface). Counts reconcile with mockAdminRoles[].member_count.
// Derived deterministically from mockUsers so names/emails never drift from
// the user directory.
// ---------------------------------------------------------------------------

const ROLE_MEMBER_ASSIGNMENT = [
  ['usr_001', 'role_owner'],
  ['usr_002', 'role_admin'],
  ['usr_003', 'role_admin'],
  ['usr_005', 'role_admin'],
  ['usr_004', 'role_analyst'],
  ['usr_006', 'role_analyst'],
  ['usr_007', 'role_analyst'],
  ['usr_008', 'role_analyst'],
  ['usr_009', 'role_analyst'],
  ['usr_010', 'role_analyst'],
  ['usr_011', 'role_viewer'],
  ['usr_012', 'role_viewer'],
]

const mockUserById = Object.fromEntries(mockUsers.map((u) => [u.id, u]))

export const mockRoleMembers = ROLE_MEMBER_ASSIGNMENT.map(([userId, roleId]) => {
  const user = mockUserById[userId]
  return {
    id: user.id,
    name: user.displayName,
    email: user.email,
    role_id: roleId,
    avatar: user.displayName
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase(),
  }
})

// ---------------------------------------------------------------------------
// Role change audit trail — the Roles page's audit panel. Kept alongside the
// role roster so permission and membership edits share one event stream with
// the role.changed severity contract (high).
// ---------------------------------------------------------------------------

export const mockRoleAuditEvents = [
  {
    id: 'role_audit_001',
    action: 'role.scope_updated',
    actor_email: 'amina.sow@provance.io',
    description: 'Admin role — enabled reports.export for the whole role.',
    created_at: daysAgo(2, 6),
  },
  {
    id: 'role_audit_002',
    action: 'role.member_assigned',
    actor_email: 'joshua.onyekachukwu@provance.io',
    description: 'Chioma Eze moved from Viewer to Analyst.',
    created_at: daysAgo(4, 3),
  },
  {
    id: 'role_audit_003',
    action: 'role.member_removed',
    actor_email: 'amina.sow@provance.io',
    description: 'Tunde Bakare removed from the Admin role.',
    created_at: daysAgo(6, 9),
  },
  {
    id: 'role_audit_004',
    action: 'role.scope_updated',
    actor_email: 'joshua.onyekachukwu@provance.io',
    description: 'Analyst role — disabled scans.revoke (least-privilege pass).',
    created_at: daysAgo(9, 4),
  },
  {
    id: 'role_audit_005',
    action: 'role.created',
    actor_email: 'amina.sow@provance.io',
    description: 'Created the Viewer role for compliance reviewers.',
    created_at: daysAgo(14, 2),
  },
  {
    id: 'role_audit_006',
    action: 'role.member_assigned',
    actor_email: 'joshua.onyekachukwu@provance.io',
    description: 'Kwame Boateng assigned the Viewer role.',
    created_at: daysAgo(16, 7),
  },
]

// ---------------------------------------------------------------------------
// Admin settings (environment + operational toggles)
// ---------------------------------------------------------------------------

export const mockAdminSettings = {
  environment: {
    name: 'Production',
    region: 'eu-west-1',
    api_version: 'v1.4.2',
    worker_version: 'v1.3.8',
    app_commit: 'a1b2c3d',
    deployed_at: daysAgo(2, 4),
  },
  operational: [
    {
      key: 'maintenance_mode',
      label: 'Maintenance mode',
      description: 'Blocks new uploads and shows a maintenance banner across the workspace.',
      enabled: false,
      kind: 'toggle',
    },
    {
      key: 'open_signups',
      label: 'Open sign-ups',
      description: 'Allow waitlist applications and new account creation without an invite.',
      enabled: false,
      kind: 'toggle',
    },
    {
      key: 'deep_processing',
      label: 'Deep processing mode',
      description: 'Enables the full signal ensemble (fingerprint, frequency, metadata, continuity).',
      enabled: true,
      kind: 'toggle',
    },
    {
      key: 'max_upload_mb',
      label: 'Max upload size',
      description: 'Largest accepted media file size in megabytes.',
      value: '250',
      kind: 'input',
    },
    {
      key: 'report_retention_days',
      label: 'Report retention',
      description: 'How long completed reports are retained before archival.',
      value: '365',
      kind: 'input',
    },
  ],
  security: {
    session_timeout_minutes: 120,
    mfa_enforced: false,
    audit_retention_days: 730,
    allowlist_only_signins: true,
  },
}

export const mockOrgTeams = [
  {
    id: 'team_legal',
    name: 'Legal & Compliance',
    description: 'Evidence review and chain-of-custody workflows.',
    memberIds: ['usr_001', 'usr_002'],
  },
  {
    id: 'team_product',
    name: 'Product & Engineering',
    description: 'Build, QA, and release verification.',
    memberIds: ['usr_011'],
  },
  {
    id: 'team_growth',
    name: 'Growth & Marketing',
    description: 'Campaign integrity and content verification.',
    memberIds: ['usr_012'],
  },
]

// ---------------------------------------------------------------------------
// Admin dashboard builder
// ---------------------------------------------------------------------------

export function buildAdminDashboard() {
  const waitlistStatusCounts = mockWaitlist.reduce(
    (acc, w) => {
      acc[w.status] = (acc[w.status] || 0) + 1
      return acc
    },
    { waitlist_submitted: 0, under_review: 0, approved: 0, deferred: 0, rejected: 0 },
  )

  return {
    summary: {
      totalRegistrations: mockWaitlist.length,
      pendingReview: (waitlistStatusCounts.waitlist_submitted || 0) + (waitlistStatusCounts.under_review || 0),
      approved: waitlistStatusCounts.approved || 0,
      rejected: waitlistStatusCounts.rejected || 0,
      invitesPending: 3,
      invitesAccepted: 7,
    },
    waitlist: mockWaitlist,
    recentAuditEvents: mockAuditEvents.slice(0, 10),
    kpis: {
      totalUsers: mockUsers.length,
      activeUsers7d: mockUsers.filter((u) => new Date(u.last_sign_in) > new Date(NOW_TS - 7 * 86400000)).length,
      scansToday: mockAnalytics.scans_today,
      completionRate: mockAnalytics.completion_rate,
    },
    queueSnapshot: mockQueueSnapshot,
    systemHealth: mockSystemHealth,
  }
}
