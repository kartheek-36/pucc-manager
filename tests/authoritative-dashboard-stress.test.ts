import { prisma } from '../lib/db/prisma';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function main() {
  console.log('\n=================================================================');
  console.log('🧪 STEP 13: AUTHORITATIVE DASHBOARD REFRESH & RACE STRESS TEST');
  console.log(`📡 Testing against: ${BASE_URL}`);
  console.log('=================================================================\n');

  // 1. Authenticate Van 1, Van 2, Van 3, and Admin
  console.log('▶ STEP 1: Authenticating Admin and 3 Van Operators');
  const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@rtovan.com', password: '7013669423@p' }),
  });
  const adminJson = await adminRes.json();
  if (!adminJson.success) throw new Error('Admin login failed');
  const adminCookie = adminRes.headers.get('set-cookie')?.split(';')[0] || '';

  const van1Res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'van1@rtovan.com', password: 'password123' }),
  });
  const van1Json = await van1Res.json();
  const van1Cookie = van1Res.headers.get('set-cookie')?.split(';')[0] || '';

  const van2Res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'van2@rtovan.com', password: 'password123' }),
  });
  const van2Json = await van2Res.json();
  const van2Cookie = van2Res.headers.get('set-cookie')?.split(';')[0] || '';

  const van3Res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'van3@rtovan.com', password: 'password123' }),
  });
  const van3Json = await van3Res.json();
  const van3Cookie = van3Res.headers.get('set-cookie')?.split(';')[0] || '';

  const van1 = await prisma.van.findFirst({ where: { van_number: 'umamaheswara' } });
  const van2 = await prisma.van.findFirst({ where: { van_number: 'srisai' } });
  const van3 = await prisma.van.findFirst({ where: { van_number: 'srivenkateswara' } });
  if (!van1 || !van2 || !van3) throw new Error('Vans missing in database');

  const testDate = '2026-10-09'; // Isolated test date
  await prisma.dailyReport.deleteMany({ where: { report_date: new Date(testDate) } });

  // 2. Van 1 Submits Report
  console.log(`\n▶ STEP 2: Van 1 (${van1.van_number}) Submits Report for ${testDate}`);
  const v1Submit = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: van1Cookie },
    body: JSON.stringify({
      report_date: testDate,
      van_id: van1.id,
      petrol_tests: 10,
      diesel_tests: 10,
      other_tests: 0,
      total_tests: 20,
      total_collection: 3000,
      expenses: 100,
      notes: 'Stress Test Van 1',
    }),
  });
  const v1Json = await v1Submit.json();
  if (!v1Json.success) throw new Error('Van 1 submission failed: ' + JSON.stringify(v1Json));
  console.log('  ✓ Van 1 submitted report ID:', v1Json.data.id);

  // 3. Verify PostgreSQL directly
  console.log('\n▶ STEP 3: Directly verifying PostgreSQL record');
  const dbReport1 = await prisma.dailyReport.findFirst({
    where: { van_id: van1.id, report_date: new Date(testDate) },
  });
  if (!dbReport1 || Number(dbReport1.total_collection) !== 3000 || dbReport1.status !== 'SUBMITTED') {
    throw new Error('Database record does not match expected committed data!');
  }
  console.log(`  ✓ PostgreSQL Record Verified: Status=${dbReport1.status}, Collection=₹${dbReport1.total_collection}`);

  // 4. Initial Admin Fetch
  console.log('\n▶ STEP 4: Admin Queries Dashboard');
  const dRes = await fetch(`${BASE_URL}/api/admin/dashboard?date=${testDate}`, {
    headers: { Cookie: adminCookie, 'Cache-Control': 'no-store' },
  });
  const dJson = await dRes.json();
  if (dJson.data.today.total_collection !== 3000) {
    throw new Error(`Expected ₹3,000 but got ₹${dJson.data.today.total_collection}`);
  }
  const v1Status = dJson.data.van_performance.find((v: any) => v.van_id === van1.id)?.report_status;
  if (v1Status !== 'SUBMITTED') {
    throw new Error(`Expected SUBMITTED but got ${v1Status}`);
  }
  console.log(`  ✓ Admin Dashboard initial fetch: Collection=₹${dJson.data.today.total_collection}, Van 1 Status=${v1Status}`);

  // 5. Run 20 Rapid Refreshes (Rapid Polling, Focus, Visibility, Interval Triggers)
  console.log('\n▶ STEP 5: Running 20 Rapid Refreshes Across Concurrency & Simulated Triggers');
  const triggers = ['polling', 'focus', 'visibility', 'sse', 'manual-refresh', 'online'];

  for (let i = 1; i <= 20; i++) {
    const trigger = triggers[i % triggers.length];
    const refreshRes = await fetch(`${BASE_URL}/api/admin/dashboard?date=${testDate}`, {
      headers: {
        Cookie: adminCookie,
        'Cache-Control': 'no-store',
        'X-Request-Id': `stress_${i}_${Date.now()}`,
        'X-Sync-Trigger': trigger,
      },
    });
    const refreshJson = await refreshRes.json();
    const curCollection = refreshJson.data.today.total_collection;
    const curV1 = refreshJson.data.van_performance.find((v: any) => v.van_id === van1.id);

    if (curCollection !== 3000 || curV1?.report_status !== 'SUBMITTED') {
      console.error(`  ❌ FAILED at refresh #${i}: Collection=₹${curCollection}, Status=${curV1?.report_status}`);
      throw new Error(`Dashboard regressed to PENDING/₹0 on refresh #${i}!`);
    }
  }
  console.log('  ✓ 20/20 Refreshes passed: NEVER regressed to PENDING or ₹0!');

  // 6. Van 2 and Van 3 Submit
  console.log('\n▶ STEP 6: Van 2 and Van 3 Submit Their Reports');
  await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: van2Cookie },
    body: JSON.stringify({
      report_date: testDate,
      van_id: van2.id,
      petrol_tests: 10,
      diesel_tests: 10,
      other_tests: 0,
      total_tests: 20,
      total_collection: 2500,
      expenses: 50,
      notes: 'Stress Test Van 2',
    }),
  });

  await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: van3Cookie },
    body: JSON.stringify({
      report_date: testDate,
      van_id: van3.id,
      petrol_tests: 10,
      diesel_tests: 10,
      other_tests: 0,
      total_tests: 20,
      total_collection: 3500,
      expenses: 100,
      notes: 'Stress Test Van 3',
    }),
  });

  // Expected Total: 3000 + 2500 + 3500 = 9000
  console.log('\n▶ STEP 7: Verifying Combined Fleet Totals (3 Vans = ₹9,000, 0 Pending)');
  const combinedRes = await fetch(`${BASE_URL}/api/admin/dashboard?date=${testDate}`, {
    headers: { Cookie: adminCookie, 'Cache-Control': 'no-store' },
  });
  const combinedJson = await combinedRes.json();
  const totalCol = combinedJson.data.today.total_collection;
  const submittedVans = combinedJson.data.today.submitted_reports;
  const pendingVans = combinedJson.data.today.pending_reports;

  console.log(`  ✓ Total Collection: ₹${totalCol} (Expected: ₹9000)`);
  console.log(`  ✓ Submitted Vans: ${submittedVans} (Expected: 3)`);
  console.log(`  ✓ Pending Vans: ${pendingVans} (Expected: 0)`);

  if (totalCol !== 9000 || submittedVans !== 3 || pendingVans !== 0) {
    throw new Error('Combined metrics do not match multi-van submissions!');
  }

  // 8. 20 More Concurrent Refreshes on Multi-Van Fleet
  console.log('\n▶ STEP 8: Running 20 Parallel Concurrent Refreshes on 3-Van Fleet');
  const concurrentPromises = Array.from({ length: 20 }, (_, idx) =>
    fetch(`${BASE_URL}/api/admin/dashboard?date=${testDate}`, {
      headers: {
        Cookie: adminCookie,
        'Cache-Control': 'no-store',
        'X-Request-Id': `concurrent_${idx}`,
      },
    }).then((r) => r.json())
  );

  const results = await Promise.all(concurrentPromises);
  for (let idx = 0; idx < results.length; idx++) {
    const res = results[idx];
    if (res.data.today.total_collection !== 9000 || res.data.today.submitted_reports !== 3) {
      throw new Error(`Concurrent race failure at index #${idx}: ₹${res.data.today.total_collection}`);
    }
  }
  console.log('  ✓ 20/20 Parallel Concurrent Refreshes returned authoritative ₹9,000 state!');

  // Cleanup test data
  await prisma.dailyReport.deleteMany({ where: { report_date: new Date(testDate) } });
  console.log('  ✓ Cleaned up stress test records for', testDate);

  console.log('\n=================================================================');
  console.log('🎉 ALL AUTHORITATIVE STRESS & RACE-CONDITION TESTS PASSED (100%)');
  console.log('=================================================================\n');
}

main().catch((err) => {
  console.error('Stress test failed:', err);
  process.exit(1);
});
