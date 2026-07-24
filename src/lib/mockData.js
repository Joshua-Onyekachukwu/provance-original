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

const NOW_TS = new Date('2026-07-24T12:00:00Z').getTime()

function daysAgo(days, hourOffset = 0) {
  const d = new Date(NOW_TS - days * 86400000 + hourOffset * 3600000)
  return d.toISOString()
}

// ---------------------------------------------------------------------------
// Users (12 records)
// ---------------------------------------------------------------------------

export const mockUsers = [
  {
    id: 'usr_001',
    email: 'james.adedapo@provance.io',
    displayName: 'James Adedapo',
    role: 'super_admin',
    team_enabled: true,
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

  return {
    id: `rpt_${String(i + 1).padStart(3, '0')}`,
    scan_id: `scan_${String(i + 1).padStart(3, '0')}`,
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

  return {
    id: `audit_${String(i + 1).padStart(4, '0')}`,
    actor_email: actorEmails[i % actorEmails.length],
    action: actions[i % actions.length],
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
    link: i % 3 === 0 ? `/app/reports/rpt_${String(i + 1).padStart(3, '0')}` : null,
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
// Admin dashboard overview (aggregates the above)
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
