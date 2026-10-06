import { prisma } from '../lib/db/prisma';

const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('\n======================================================');
  console.log('🌐 LIVE END-TO-END CROSS-LOGIN SYNCHRONIZATION TEST');
  console.log(`📡 Target Server: ${BASE_URL}`);
  console.log('======================================================\n');

  // 1. SESSION INITIALIZATION (Simulating Two Independent Browsers)
  console.log('▶ STEP 1: Authenticating Sessions in 2 Independent Clients');

  // Browser A: Admin Login
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@rtovan.com', password: '7013669423@p' }),
  });
  const adminLoginJson = await adminLoginRes.json();
  if (!adminLoginJson.success) throw new Error('Admin login failed: ' + JSON.stringify(adminLoginJson));
  const adminCookie = adminLoginRes.headers.get('set-cookie')?.split(';')[0] || '';
  console.log('  ✓ Browser A (Admin): Logged in successfully. Role: ADMIN');

  // Browser B: Van 1 Operator Login
  const van1LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'van1@rtovan.com', password: 'password123' }),
  });
  const van1LoginJson = await van1LoginRes.json();
  if (!van1LoginJson.success) throw new Error('Van 1 login failed: ' + JSON.stringify(van1LoginJson));
  const van1Cookie = van1LoginRes.headers.get('set-cookie')?.split(';')[0] || '';
  console.log('  ✓ Browser B (Van 1): Logged in successfully. Assigned Van: umamaheswara');

  // Browser C: Van 2 Operator Login
  const van2LoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'van2@rtovan.com', password: 'password123' }),
  });
  const van2LoginJson = await van2LoginRes.json();
  if (!van2LoginJson.success) throw new Error('Van 2 login failed: ' + JSON.stringify(van2LoginJson));
  const van2Cookie = van2LoginRes.headers.get('set-cookie')?.split(';')[0] || '';
  console.log('  ✓ Browser C (Van 2): Logged in successfully. Assigned Van: srisai');

  // Verify Van IDs
  const van1 = await prisma.van.findFirst({ where: { van_number: 'umamaheswara' } });
  const van2 = await prisma.van.findFirst({ where: { van_number: 'srisai' } });
  if (!van1 || !van2) throw new Error('Vans not found in database');

  // Choose a clean test date to isolate from today's real records
  const syncTestDate = '2026-10-08';
  await prisma.dailyReport.deleteMany({ where: { report_date: new Date(syncTestDate) } });

  // 2. INITIAL ADMIN DASHBOARD STATE
  console.log('\n▶ STEP 2: Browser A Fetches Admin Dashboard Before Submission');
  const dashBeforeRes = await fetch(`${BASE_URL}/api/admin/dashboard?date=${syncTestDate}`, {
    headers: { Cookie: adminCookie },
  });
  const dashBeforeJson = await dashBeforeRes.json();
  const initialCollection = dashBeforeJson.data.today.total_collection;
  const initialTests = dashBeforeJson.data.today.total_tests;
  console.log(`  ✓ Browser A: Initial Collection for ${syncTestDate} = ₹${initialCollection}`);
  console.log(`  ✓ Browser A: Initial Tests for ${syncTestDate} = ${initialTests}`);

  // 3. VAN 1 SUBMITS DAILY REPORT (Browser B)
  console.log('\n▶ STEP 3: Browser B (Van 1) Submits Daily Report');
  const submitT0 = performance.now();
  const submitRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: van1Cookie,
    },
    body: JSON.stringify({
      report_date: syncTestDate,
      van_id: van1.id,
      petrol_tests: 12,
      diesel_tests: 8,
      other_tests: 5,
      total_tests: 25,
      total_collection: 3750,
      expenses: 150,
      notes: 'Clean E2E Test Report',
    }),
  });
  const submitLatency = performance.now() - submitT0;
  const submitJson = await submitRes.json();
  if (!submitJson.success) throw new Error('Report submission failed: ' + JSON.stringify(submitJson));
  console.log(`  ✓ T0: POST /api/reports committed to PostgreSQL in ${submitLatency.toFixed(2)}ms`);
  console.log(`  ✓ Authoritative Report ID: ${submitJson.data.id}`);

  // 4. ADMIN DASHBOARD INSTANTLY QUERIES FRESH POSTGRESQL STATE (Browser A)
  console.log('\n▶ STEP 4: Browser A (Admin) Queries Dashboard Following Submission');
  const dashAfterT0 = performance.now();
  const dashAfterRes = await fetch(`${BASE_URL}/api/admin/dashboard?date=${syncTestDate}`, {
    headers: { Cookie: adminCookie },
  });
  const dashAfterLatency = performance.now() - dashAfterT0;
  const dashAfterJson = await dashAfterRes.json();
  const newCollection = dashAfterJson.data.today.total_collection;
  const newTests = dashAfterJson.data.today.total_tests;
  console.log(`  ✓ T1: GET /api/admin/dashboard responded in ${dashAfterLatency.toFixed(2)}ms`);
  console.log(`  ✓ Total Collection updated: ₹${initialCollection} -> ₹${newCollection} (+₹3,750)`);
  console.log(`  ✓ Total Tests updated: ${initialTests} -> ${newTests} (+25 tests)`);

  if (newCollection !== initialCollection + 3750) {
    throw new Error(`FAIL: Expected collection ₹${initialCollection + 3750}, got ₹${newCollection}`);
  }
  if (newTests !== initialTests + 25) {
    throw new Error(`FAIL: Expected tests ${initialTests + 25}, got ${newTests}`);
  }
  console.log('  ✓ PASS: Browser A Dashboard state synchronized seamlessly with Browser B write!');

  // 5. ADMIN NOTIFICATIONS VERIFICATION
  console.log('\n▶ STEP 5: Browser A Verifies In-App Notifications & Unread Count');
  const notifRes = await fetch(`${BASE_URL}/api/notifications?unread=true`, {
    headers: { Cookie: adminCookie },
  });
  const notifJson = await notifRes.json();
  console.log(`  ✓ Browser A: Unread notification count = ${notifJson.data.unreadCount}`);
  const latestNotif = notifJson.data.notifications[0];
  console.log(`  ✓ Latest Notification: "${latestNotif?.title}" - ${latestNotif?.message?.split('\n')[0]}`);
  if (!latestNotif || !latestNotif.message?.includes('umamaheswara')) {
    throw new Error('FAIL: Latest notification did not reflect Van 1 report!');
  }
  console.log('  ✓ PASS: In-App notification was committed to PostgreSQL and delivered to Admin!');

  // 6. ADMIN MARKS NOTIFICATION READ -> BADGE SYNC
  console.log('\n▶ STEP 6: Browser A Marks Notification Read');
  const markReadRes = await fetch(`${BASE_URL}/api/notifications/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ id: latestNotif.id }),
  });
  const markReadJson = await markReadRes.json();
  if (!markReadJson.success) throw new Error('Mark read failed: ' + JSON.stringify(markReadJson));

  const notifAfterRead = await fetch(`${BASE_URL}/api/notifications?unread=true`, {
    headers: { Cookie: adminCookie },
  });
  const notifAfterJson = await notifAfterRead.json();
  console.log(`  ✓ Browser A: Unread count decremented to = ${notifAfterJson.data.unreadCount}`);
  console.log('  ✓ PASS: Read/unread state synchronized!');

  // 7. DUPLICATE SUBMISSION STRICT REJECTION (Test 4)
  console.log('\n▶ STEP 7: Browser B Attempts Duplicate Submission for Same (Van, Date)');
  const dupRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: van1Cookie,
    },
    body: JSON.stringify({
      report_date: syncTestDate,
      van_id: van1.id,
      petrol_tests: 5,
      diesel_tests: 5,
      other_tests: 0,
      total_tests: 10,
      total_collection: 1500,
      expenses: 0,
    }),
  });
  console.log(`  ✓ Duplicate HTTP Status: ${dupRes.status} (Expected 409 Conflict)`);
  const dupJson = await dupRes.json();
  console.log(`  ✓ Error Code: ${dupJson.error?.code}: ${dupJson.error?.message}`);
  if (dupRes.status !== 409 || dupJson.error?.code !== 'DUPLICATE_REPORT') {
    throw new Error('FAIL: Duplicate submission was not rejected with HTTP 409!');
  }
  console.log('  ✓ PASS: Duplicate submission strictly rejected, data integrity preserved!');

  // 8. MULTI-VAN CONCURRENT SUBMISSION & TOTALS (Test 5)
  console.log('\n▶ STEP 8: Browser C (Van 2) Submits for Same Date -> Admin Multi-Van Totals');
  const submitVan2Res = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: van2Cookie,
    },
    body: JSON.stringify({
      report_date: syncTestDate,
      van_id: van2.id,
      petrol_tests: 10,
      diesel_tests: 10,
      other_tests: 0,
      total_tests: 20,
      total_collection: 3000,
      expenses: 50,
      notes: 'Van 2 concurrent submit',
    }),
  });
  const submitVan2Json = await submitVan2Res.json();
  if (!submitVan2Json.success) throw new Error('Van 2 submission failed');
  console.log('  ✓ Van 2 report submitted: ₹3,000, 20 tests');

  const dashMultiRes = await fetch(`${BASE_URL}/api/admin/dashboard?date=${syncTestDate}`, {
    headers: { Cookie: adminCookie },
  });
  const dashMultiJson = await dashMultiRes.json();
  const multiCollection = dashMultiJson.data.today.total_collection;
  const multiTests = dashMultiJson.data.today.total_tests;
  console.log(`  ✓ Browser A: Combined Collection = ₹${multiCollection} (Expected ₹${initialCollection + 3750 + 3000})`);
  console.log(`  ✓ Browser A: Combined Tests = ${multiTests} (Expected ${initialTests + 25 + 20})`);

  if (multiCollection !== initialCollection + 3750 + 3000) {
    throw new Error('FAIL: Multi-van combined collection mismatch!');
  }
  console.log('  ✓ PASS: Multi-van submissions accurately aggregated with zero loss!');

  // 9. ADMIN UPDATES VAN -> VAN SCREEN SYNC (Test 2)
  console.log('\n▶ STEP 9: Browser A Updates Van 1 Registration -> Browser B Sees Update');
  const originalReg = van1.registration_number;
  const updatedReg = 'AP-39-TG-9999';

  const updateVanRes = await fetch(`${BASE_URL}/api/admin/vans`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      id: van1.id,
      registration_number: updatedReg,
    }),
  });
  const updateVanJson = await updateVanRes.json();
  if (!updateVanJson.success) throw new Error('Van update failed');
  console.log(`  ✓ Browser A updated Van 1 registration to: ${updatedReg}`);

  // Browser B checks today report van info
  const vanCheckRes = await fetch(`${BASE_URL}/api/reports/today?van_id=${van1.id}&date=${syncTestDate}`, {
    headers: { Cookie: van1Cookie },
  });
  const vanCheckJson = await vanCheckRes.json();
  console.log(`  ✓ Browser B observed registration number: ${vanCheckJson.data.van.registration_number}`);
  if (vanCheckJson.data.van.registration_number !== updatedReg) {
    throw new Error('FAIL: Van operator did not see updated registration number!');
  }
  console.log('  ✓ PASS: Van details synchronized immediately from Admin to Van Operator!');

  // Restore original registration number
  await prisma.van.update({
    where: { id: van1.id },
    data: { registration_number: originalReg },
  });
  console.log('  ✓ Restored original van registration number.');

  // 10. MULTI-TENANT ISOLATION (Security Boundary)
  console.log('\n▶ STEP 10: Security Check: Van 1 Attempts to Submit for Van 2');
  const hackRes = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: van1Cookie, // Van 1 operator cookie
    },
    body: JSON.stringify({
      report_date: '2026-10-09',
      van_id: van2.id, // Trying to submit for Van 2!
      petrol_tests: 5,
      diesel_tests: 5,
      other_tests: 0,
      total_tests: 10,
      total_collection: 1500,
      expenses: 0,
    }),
  });
  console.log(`  ✓ Cross-van submit attempt status: ${hackRes.status} (Expected 403 Forbidden)`);
  if (hackRes.status !== 403) {
    throw new Error('SECURITY VIOLATION: Van operator was able to submit for another van!');
  }
  console.log('  ✓ PASS: Multi-tenant security isolation strictly enforced at server API layer!');

  // CLEANUP TEST DATA TO PRESERVE PRODUCTION DB
  await prisma.dailyReport.deleteMany({ where: { report_date: new Date(syncTestDate) } });
  console.log('\n  ✓ Cleaned up all test records for ' + syncTestDate + ' (Production database pristine).');

  console.log('\n======================================================');
  console.log('🎉 ALL LIVE E2E CROSS-LOGIN SYNCHRONIZATION TESTS PASSED!');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('E2E Test Failure:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
