#!/usr/bin/env node
/**
 * Seeds Grace Community demo church with realistic prayer requests,
 * care requests, and announcements for the ICE breaker demo.
 *
 * Usage:
 *   DATABASE_URL=<url> node scripts/seed-demo-data.mjs
 *   Or on server: node scripts/seed-demo-data.mjs (reads from api-server/.env)
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
  throw new Error("DATABASE_URL not found");
}

const DB_URL = loadDatabaseUrl();

// Use pg directly
const { default: pg } = await import("pg");
const { Pool } = pg;
const pool = new Pool({ connectionString: DB_URL });

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

  // Clear existing demo prayer/care data to avoid duplicates
  await q(`DELETE FROM prayer_wall WHERE church_id = $1`, [churchId]);
  await q(`DELETE FROM church_care_requests WHERE church_id = $1`, [churchId]);
  await q(`DELETE FROM church_announcements WHERE church_id = $1`, [churchId]);
  console.log("🗑️   Cleared existing demo content");

  // Prayer requests — mix of urgent, routine, and praise
  await q(`
    INSERT INTO prayer_wall
      (church_id, session_id, display_name, is_anonymous, request, category,
       status, urgency_flagged, urgency_reason, created_at)
    VALUES
      ($1, 'demo-member-002', 'Marcus Chen', false,
       'I lost my job last week and I am struggling to stay hopeful. My family depends on me and I feel completely alone in this. Some days I wonder if things will ever get better. Please pray for strength and provision.',
       'personal', 'active', true,
       'Member expressing hopelessness and isolation during financial crisis',
       NOW() - INTERVAL ''5 days''),

      ($1, 'demo-member-anonymous-1', null, true,
       'Please pray for my marriage. We are going through a very difficult season and I am scared about what comes next.',
       'relationships', 'active', false, null,
       NOW() - INTERVAL ''3 days''),

      ($1, 'demo-member-006', 'Jennifer Lee', false,
       'My mother is having surgery on Thursday at Cedar Sinai. Please keep her in your prayers for a successful procedure and a quick recovery. She is 71 and nervous.',
       'health', 'active', false, null,
       NOW() - INTERVAL ''1 day''),

      ($1, 'demo-member-004', 'David Park', false,
       'Please pray for my son. He has been pulling away from the church and from our family this past year. I do not know how to reach him.',
       'family', 'active', false, null,
       NOW() - INTERVAL ''6 days''),

      ($1, 'demo-member-anonymous-2', null, true,
       'Dealing with a lot of anxiety lately. Some days I can barely get out of bed. I know God is with me but I am struggling to feel it. Asking for prayer.',
       'mental health', 'active', true,
       'Member describing severe anxiety, difficulty functioning, seeking spiritual support',
       NOW() - INTERVAL ''2 days''),

      ($1, 'demo-member-008', 'Carol Davis', false,
       'Praise God — I got the job I have been praying for! Starting next Monday. Thank you all so much for praying with me through this long season of waiting.',
       'praise', 'active', false, null,
       NOW() - INTERVAL ''2 days''),

      ($1, 'demo-member-007', 'James White', false,
       'Please pray for our small group as we start a new series on the Psalms this week. Praying God moves in our hearts.',
       'community', 'active', false, null,
       NOW() - INTERVAL ''12 hours'')
  `, [churchId]);
  console.log("✅  7 prayer requests seeded");

  // Care requests
  await q(`
    INSERT INTO church_care_requests
      (church_id, person_name, request_type, description,
       assigned_to, due_date, status, created_by, created_at)
    VALUES
      ($1, 'Robert Martinez', 'hospital',
       'Admitted to Cedar Sinai on Monday for a heart procedure. Wife is overwhelmed. Needs a pastoral visit and family support this week.',
       'Pastor', (CURRENT_DATE + 1)::date, 'open',
       'demo-pastor-grace-community', NOW() - INTERVAL ''2 days''),

      ($1, 'The Garcia Family', 'meal',
       'New baby born July 1st — their third child. Both parents exhausted. Family could use a meal train for the next week.',
       'Deaconess Team', (CURRENT_DATE + 2)::date, 'in_progress',
       'demo-pastor-grace-community', NOW() - INTERVAL ''1 day''),

      ($1, 'Anonymous Member', 'counseling',
       'Reached out privately asking for a counseling referral. Shared they have been struggling with depression for several months.',
       null, null, 'open',
       'demo-pastor-grace-community', NOW() - INTERVAL ''4 days''),

      ($1, 'Tyler Brooks', 'grief',
       'Lost his father two weeks ago. Has been coming to church alone with his young son. Would benefit from pastoral care and connection with other single dads.',
       null, null, 'open',
       'demo-pastor-grace-community', NOW() - INTERVAL ''3 days'')
  `, [churchId]);
  console.log("✅  4 care requests seeded");

  // Announcements
  await q(`
    INSERT INTO church_announcements
      (church_id, author_session_id, title, body, pinned, published_at, created_at)
    VALUES
      ($1, 'demo-pastor-grace-community',
       'Summer Small Groups — Sign Up Now',
       'We are launching 6 new small groups this summer covering prayer, Bible study, and community service. Sign up at the welcome desk or through the Shepherd''s Path app. Groups begin July 14th.',
       true, NOW() - INTERVAL ''2 days'', NOW() - INTERVAL ''2 days''),

      ($1, 'demo-pastor-grace-community',
       'VBS Registration Open',
       'Vacation Bible School runs July 21-25, ages 4-12. Register your kids and sign up to volunteer through the church office.',
       false, NOW() - INTERVAL ''4 days'', NOW() - INTERVAL ''4 days'')
  `, [churchId]);
  console.log("✅  2 announcements seeded");

  // Update some visitor contact attempts for realism
  await q(`
    UPDATE church_visitors
    SET follow_up_status = 'contacted',
        updated_at = NOW() - INTERVAL '2 days'
    WHERE church_id = $1 AND first_name = 'The' AND last_name = 'Nguyen Family'
  `, [churchId]);

  await q(`
    UPDATE church_visitors
    SET follow_up_status = 'connected',
        updated_at = NOW() - INTERVAL '5 days'
    WHERE church_id = $1 AND first_name = 'Robert'
  `, [churchId]);

  console.log("✅  Visitor statuses updated\n");

  const stats = await q(`
    SELECT
      (SELECT COUNT(*) FROM prayer_wall WHERE church_id = $1 AND status = 'active') as prayers,
      (SELECT COUNT(*) FROM prayer_wall WHERE church_id = $1 AND urgency_flagged = true) as urgent,
      (SELECT COUNT(*) FROM church_visitors WHERE church_id = $1) as visitors,
      (SELECT COUNT(*) FROM church_visitors WHERE church_id = $1 AND follow_up_status = 'pending') as pending_visitors,
      (SELECT COUNT(*) FROM church_care_requests WHERE church_id = $1 AND status != 'completed') as care_requests,
      (SELECT COUNT(*) FROM church_announcements WHERE church_id = $1) as announcements
  `, [churchId]);

  const s = stats[0];
  console.log("╔══════════════════════════════════════╗");
  console.log("║       DEMO DATA SEEDED               ║");
  console.log("╠══════════════════════════════════════╣");
  console.log(`║  Active prayers:    ${String(s.prayers).padEnd(15)}║`);
  console.log(`║  Urgent prayers:    ${String(s.urgent).padEnd(15)}║`);
  console.log(`║  Visitors total:    ${String(s.visitors).padEnd(15)}║`);
  console.log(`║  Pending follow-up: ${String(s.pending_visitors).padEnd(15)}║`);
  console.log(`║  Open care requests:${String(s.care_requests).padEnd(15)}║`);
  console.log(`║  Announcements:     ${String(s.announcements).padEnd(15)}║`);
  console.log("╚══════════════════════════════════════╝");

  await pool.end();
}

main().catch(async (err) => {
  console.error("❌  Failed:", err.message);
  await pool.end();
  process.exit(1);
});
