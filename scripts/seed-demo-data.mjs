#!/usr/bin/env node
/**
 * Seeds Grace Community demo church with realistic pastoral care data.
 * Shows the full visitor follow-up pipeline so pastors can see the story:
 *   New visitor → Overdue alert → Pastor reaches out → No response → Connected
 *
 * Usage (on server):
 *   node scripts/seed-demo-data.mjs
 * Or with explicit DB URL:
 *   DATABASE_URL=postgresql://... node scripts/seed-demo-data.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = fs.readFileSync(path.join(__dirname, "../artifacts/api-server/.env"), "utf8");
    const match = env.match(/^DATABASE_URL=(.+)$/m);
    if (match) return match[1].trim();
  } catch {}
  throw new Error("DATABASE_URL not found. Set DATABASE_URL or ensure artifacts/api-server/.env exists.");
}

const DB_URL = loadDatabaseUrl();

// pg lives in api-server/node_modules — resolve it by path since ESM
// resolves imports relative to the script file, not CWD
import { createRequire } from "module";
const require = createRequire(
  new URL("../artifacts/api-server/package.json", import.meta.url)
);
const { Pool } = require("pg");
const pool = new Pool({ connectionString: DB_URL });

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function q(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

async function main() {
  console.log("🌱  Seeding demo data for Grace Community Church...\n");

  const [church] = await q(`SELECT id FROM churches WHERE slug = 'grace-community-demo'`);
  if (!church) {
    console.error("❌  Grace Community not found. Run seed-demo-church.mjs first.");
    process.exit(1);
  }
  const churchId = church.id;
  console.log(`✅  Found church: ${churchId}`);

  // Clear existing demo data to allow clean re-runs
  // prayer_wall uses session_id targeting in case church_id column isn't migrated yet
  await q(`DELETE FROM prayer_wall WHERE session_id LIKE 'demo-member-%'`);
  try { await q(`DELETE FROM prayer_wall WHERE church_id = $1`, [churchId]); } catch {}
  await q(`DELETE FROM church_care_requests WHERE church_id = $1`, [churchId]);
  await q(`DELETE FROM church_announcements WHERE church_id = $1`, [churchId]);
  await q(`DELETE FROM church_visitors WHERE church_id = $1`, [churchId]);
  console.log("🗑️   Cleared existing demo content\n");

  // ── Visitors — the full follow-up pipeline ──────────────────────────────────
  //
  // A pastor seeing this list should immediately understand the entire workflow:
  //   PENDING (new, in queue) → PENDING OVERDUE (flagged) → CONTACTED →
  //   NO RESPONSE → CONNECTED
  //
  // assigned_to: who is following up — demonstrates team delegation
  // next_followup_date: when to reach out — demonstrates the reminder system

  await q(`
    INSERT INTO church_visitors
      (church_id, first_name, last_name, email, phone,
       visit_date, source, notes,
       follow_up_status, assigned_to, next_followup_date)
    VALUES
      -- 1. Brand new — logged Sunday, not yet assigned
      ($1, 'Amara', 'Osei',
       'amara.o@example.com', '(555) 014-7799',
       $2, 'Walk-in',
       'College student, far from home. Sat alone — greeter connected with her after service. Seemed open.',
       'pending', NULL, $3),

      -- 2. OVERDUE — 6 days ago, still pending, follow-up due yesterday → dashboard flags this
      ($1, 'Tyler', 'Brooks',
       NULL, '(555) 014-2233',
       $4, 'Online search',
       'Single dad, son is 8. Looking for community. Said he''d come back next Sunday.',
       'pending', 'Pastor James', $5),

      -- 3. Contacted — reached out, waiting to hear back
      ($1, 'The', 'Nguyen Family',
       'nguyen.family@example.com', NULL,
       $6, 'Facebook ad',
       'Couple + 2 young kids. New to the area, asked about small groups and kids programs.',
       'contacted', 'Deacon Rosa', $7),

      -- 4. No response — tried twice, door is still open
      ($1, 'Sarah', 'Johnson',
       'sarah.j@example.com', '(555) 010-1234',
       $8, 'Friend invited',
       'Came with the Martinez family. First time at any church in years. Called twice — left a voicemail.',
       'no-response', 'Pastor James', NULL),

      -- 5. Connected — the full arc, joined small group
      ($1, 'Robert', 'Kane',
       'rkane@example.com', '(555) 018-8991',
       $9, 'Friend invited',
       'Second visit in two weeks. Coming back after years away. Connected with men''s group leader — now attending Thursday night group.',
       'connected', NULL, NULL)
  `, [
    churchId,
    daysAgo(2),         // Amara — just visited
    daysFromNow(2),     // Amara — follow up in 2 days
    daysAgo(6),         // Tyler — overdue (>5 days, still pending)
    daysAgo(1),         // Tyler — follow-up date was yesterday → overdue
    daysAgo(10),        // Nguyen Family — contacted
    daysFromNow(3),     // Nguyen Family — Deacon Rosa following up Thursday
    daysAgo(14),        // Sarah — no response
    daysAgo(28),        // Robert — connected, full arc
  ]);
  console.log("✅  5 visitors seeded (full pipeline story)");

  // ── Prayer requests — mix of urgent, pastoral, and praise ─────────────────

  await q(`
    INSERT INTO prayer_wall
      (church_id, session_id, display_name, is_anonymous, request, category,
       status, urgency_flagged, urgency_reason, created_at)
    VALUES
      -- URGENT: financial crisis + hopelessness
      ($1, 'demo-member-002', 'Marcus Chen', false,
       'I lost my job last week and I am struggling to stay hopeful. My family depends on me and I feel completely alone in this. Some days I wonder if things will ever get better. Please pray for strength and provision.',
       'personal', 'active', true,
       'Member expressing hopelessness and isolation — may need direct pastoral outreach',
       NOW() - INTERVAL '5 days'),

      -- URGENT: anxiety affecting daily functioning
      ($1, 'demo-member-anonymous-1', null, true,
       'Dealing with a lot of anxiety lately. Some days I can barely get out of bed. I know God is with me but I am struggling to feel it right now.',
       'mental health', 'active', true,
       'Member describing severe anxiety and difficulty functioning',
       NOW() - INTERVAL '2 days'),

      -- Pastoral: marriage difficulty
      ($1, 'demo-member-anonymous-2', null, true,
       'Please pray for my marriage. We are going through a very difficult season and I am scared about what comes next.',
       'relationships', 'active', false, null,
       NOW() - INTERVAL '3 days'),

      -- Pastoral: prodigal child
      ($1, 'demo-member-004', 'David Park', false,
       'Please pray for my son. He has been pulling away from the church and from our family this past year. I do not know how to reach him.',
       'family', 'active', false, null,
       NOW() - INTERVAL '6 days'),

      -- Medical: upcoming surgery
      ($1, 'demo-member-006', 'Jennifer Lee', false,
       'My mother is having surgery Thursday at Cedars. She is 71 and nervous. Please pray for a successful procedure and quick recovery.',
       'health', 'active', false, null,
       NOW() - INTERVAL '1 day'),

      -- Praise: answered prayer
      ($1, 'demo-member-008', 'Carol Davis', false,
       'Praise God — I got the job I have been praying for! Starting next Monday. Thank you all so much for praying with me through this long season of waiting.',
       'praise', 'active', false, null,
       NOW() - INTERVAL '2 days'),

      -- Community: small group
      ($1, 'demo-member-007', 'James White', false,
       'Please pray for our small group as we start a new series on the Psalms this week. Praying God moves in all of our hearts.',
       'community', 'active', false, null,
       NOW() - INTERVAL '12 hours')
  `, [churchId]);
  console.log("✅  7 prayer requests seeded (2 urgent)");

  // ── Care requests ──────────────────────────────────────────────────────────

  await q(`
    INSERT INTO church_care_requests
      (church_id, person_name, request_type, description,
       assigned_to, due_date, status, created_by, created_at)
    VALUES
      ($1, 'Robert Martinez', 'hospital',
       'Admitted to Cedars Monday for a heart procedure. Wife is overwhelmed — their kids are 6 and 9. Needs a pastoral visit and family support this week.',
       'Pastor James', $2, 'open',
       'demo-pastor-grace-community', NOW() - INTERVAL '2 days'),

      ($1, 'The Garcia Family', 'meal',
       'New baby born July 1st — their third child. Both parents exhausted. Coordinate a meal train for this week.',
       'Deaconess Team', $3, 'in_progress',
       'demo-pastor-grace-community', NOW() - INTERVAL '1 day'),

      ($1, 'Anonymous Member', 'counseling',
       'Reached out privately asking for a referral to a Christian counselor. Shared they''ve been struggling with depression for several months.',
       NULL, NULL, 'open',
       'demo-pastor-grace-community', NOW() - INTERVAL '4 days'),

      ($1, 'Tyler Brooks', 'grief',
       'Lost his father two weeks ago. Attending church alone with his young son. Would benefit from pastoral care and connection with other single dads in the church.',
       NULL, NULL, 'open',
       'demo-pastor-grace-community', NOW() - INTERVAL '3 days')
  `, [churchId, daysFromNow(1), daysFromNow(2)]);
  console.log("✅  4 care requests seeded");

  // ── Announcements ──────────────────────────────────────────────────────────

  await q(`
    INSERT INTO church_announcements
      (church_id, author_session_id, title, body, pinned, published_at, created_at)
    VALUES
      ($1, 'demo-pastor-grace-community',
       'Summer Small Groups — Sign Up Now',
       'We are launching 6 new small groups this summer: prayer, Scripture study, parenting, men''s discipleship, women''s fellowship, and community service. Sign up at the welcome desk or in the Shepherd''s Path app. Groups begin July 14th.',
       true, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

      ($1, 'demo-pastor-grace-community',
       'VBS Registration Open',
       'Vacation Bible School runs July 21–25 for ages 4–12. Register your kids and sign up to volunteer through the church office or app.',
       false, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days')
  `, [churchId]);
  console.log("✅  2 announcements seeded");

  // ── Summary ───────────────────────────────────────────────────────────────

  const [stats] = await q(`
    SELECT
      (SELECT COUNT(*) FROM church_visitors WHERE church_id = $1) as visitors,
      (SELECT COUNT(*) FROM church_visitors WHERE church_id = $1 AND follow_up_status = 'pending') as pending,
      (SELECT COUNT(*) FROM church_visitors
       WHERE church_id = $1 AND follow_up_status = 'pending'
         AND visit_date < CURRENT_DATE - INTERVAL '5 days') as overdue,
      (SELECT COUNT(*) FROM prayer_wall WHERE church_id = $1 AND status = 'active') as prayers,
      (SELECT COUNT(*) FROM prayer_wall WHERE church_id = $1 AND urgency_flagged = true) as urgent_prayers,
      (SELECT COUNT(*) FROM church_care_requests WHERE church_id = $1 AND status != 'completed') as care_requests,
      (SELECT COUNT(*) FROM church_announcements WHERE church_id = $1) as announcements
  `, [churchId]);

  console.log(`
╔════════════════════════════════════════════╗
║         DEMO DATA SEEDED                   ║
╠════════════════════════════════════════════╣
║  Visitors (pipeline):                      ║
║    Total:          ${String(stats.visitors).padEnd(22)}║
║    Pending:        ${String(stats.pending).padEnd(22)}║
║    Overdue (⚠️):   ${String(stats.overdue).padEnd(22)}║
║  Prayers:          ${String(stats.prayers).padEnd(22)}║
║    Urgent (🔴):    ${String(stats.urgent_prayers).padEnd(22)}║
║  Care requests:    ${String(stats.care_requests).padEnd(22)}║
║  Announcements:    ${String(stats.announcements).padEnd(22)}║
╠════════════════════════════════════════════╣
║  Pipeline story a pastor will see:         ║
║  Amara  → PENDING  (new, 2 days ago)       ║
║  Tyler  → OVERDUE  (6 days, flagged ⚠️)    ║
║  Nguyens→ CONTACTED (Deacon Rosa on it)    ║
║  Sarah  → NO RESPONSE (tried twice)        ║
║  Robert → CONNECTED (joined small group)   ║
╚════════════════════════════════════════════╝
`);

  await pool.end();
}

main().catch(async (err) => {
  console.error("❌  Failed:", err.message);
  await pool.end();
  process.exit(1);
});
