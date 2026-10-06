import {
  calculateTotalTests,
  calculateNetCollection,
  formatINR,
  getTodayISTDateString,
  toISTDateString,
  isPastISTDeadline,
  roundTo2Decimals,
  getYesterdayISTDateString,
  calculatePercentageChange,
} from '../lib/calculations/financial';
import {
  getUserByEmail,
  getUserById,
  getVans,
  getVanById,
  createUser,
  updateUser,
  updateVan,
  getDailyReportByVanAndDate,
  createDailyReport,
  getAdminDashboardMetrics,
  createNotification,
  getNotifications,
  upsertDeviceToken,
  getAdminDeviceTokens,
  createAuditLog,
  getAuditLogs,
} from '../lib/db';

import { canAccessVan, requireAdmin, AuthContext } from '../lib/auth/session';
import { checkAndNotifyPendingReports } from '../lib/notifications/service';
import { prisma } from '../lib/db/prisma';

let totalTestsRun = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string) {
  totalTestsRun++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING AUTOMATED ACCEPTANCE & BUSINESS LOGIC TESTS');
  console.log('======================================================\n');

  // TEST SUITE 1: Financial Calculations & Rounding
  console.log('▶ Test Suite 1: Financial & Test Calculations');
  {
    const total = calculateTotalTests(20, 15, 5);
    assert(total === 40, 'calculateTotalTests(20, 15, 5) equals 40');

    const net = calculateNetCollection(7150.0, 200.5);
    assert(net === 6949.5, 'calculateNetCollection(7150, 200.50) equals 6949.50');

    const inr = formatINR(18450);
    assert(inr.includes('18,450'), 'formatINR(18450) outputs ₹18,450');

    const rounded = roundTo2Decimals(123.4567);
    assert(rounded === 123.46, 'roundTo2Decimals(123.4567) rounds to 123.46');

    const pctChange = calculatePercentageChange(18450, 16400);
    assert(pctChange.isPositive === true, 'calculatePercentageChange marks increase as positive');
    assert(pctChange.formatted.startsWith('+'), 'calculatePercentageChange formats positive prefix');
  }

  // TEST SUITE 2: Timezone & IST Date Formatting
  console.log('\n▶ Test Suite 2: IST (Asia/Kolkata) Timezone Handling');
  {
    const todayIST = getTodayISTDateString();
    assert(/^\d{4}-\d{2}-\d{2}$/.test(todayIST), `getTodayISTDateString() format is valid YYYY-MM-DD (${todayIST})`);

    const yesterdayIST = getYesterdayISTDateString();
    assert(/^\d{4}-\d{2}-\d{2}$/.test(yesterdayIST), `getYesterdayISTDateString() returns valid date (${yesterdayIST})`);

    const parsedIST = toISTDateString(new Date('2026-10-06T18:30:00Z'));
    assert(parsedIST === '2026-10-07', 'Converts UTC evening to next day IST morning correctly');
  }

  // TEST SUITE 3: User Retrieval & RBAC
  console.log('\n▶ Test Suite 3: User Role Authorization & Van Permissions');
  {
    const adminUser = await getUserByEmail('admin@rtovan.com');
    assert(adminUser !== null && adminUser.role === 'ADMIN', 'Admin user exists with ADMIN role');

    const van1Operator = await getUserByEmail('van1@rtovan.com');
    assert(van1Operator !== null && van1Operator.role === 'VAN_OPERATOR', 'Van 1 operator exists with VAN_OPERATOR role');

    const adminAuth: AuthContext = { user: adminUser!, role: 'ADMIN' };
    const operatorAuth: AuthContext = { user: van1Operator!, role: 'VAN_OPERATOR' };

    assert(requireAdmin(adminAuth) === true, 'requireAdmin returns true for Admin');
    assert(requireAdmin(operatorAuth) === false, 'requireAdmin returns false for Van Operator');

    const van1Id = van1Operator!.van_id!;
    const van2Id = 'b0000000-0000-0000-0000-000000000002';

    assert(canAccessVan(adminAuth, van2Id) === true, 'Admin can access any van (Van 2)');
    assert(canAccessVan(operatorAuth, van1Id) === true, 'Van 1 Operator can access Van 1');
    assert(canAccessVan(operatorAuth, van2Id) === false, 'Van 1 Operator CANNOT access Van 2');
  }

  // TEST SUITE 4: Vans Seed Verification
  console.log('\n▶ Test Suite 4: Seeded Vans Fleet Verification');
  {
    const vans = await getVans();
    assert(vans.length === 3, 'Exactly 3 vans exist in database');
    assert(vans.some((v) => v.van_number === 'umamaheswara' || v.van_number === 'Van 01'), 'Van 1 is present');
    assert(vans.some((v) => v.van_number === 'srisai' || v.van_number === 'Van 02'), 'Van 2 is present');
    assert(vans.some((v) => v.van_number === 'srivenkateswara' || v.van_number === 'Van 03'), 'Van 3 is present');
  }

  // TEST SUITE 5: Duplicate Daily Report Prevention
  console.log('\n▶ Test Suite 5: Duplicate Report Prevention Constraint');
  {
    const testDate = `20${Math.floor(Math.random() * 50 + 45)}-01-01`;
    const van1 = (await getVans()).find((v) => v.van_number === 'umamaheswara' || v.van_number === 'Van 01')!;
    const op1 = (await getUserByEmail('van1@rtovan.com'))!;

    // 1st submission succeeds
    const rep1 = await createDailyReport({
      report_date: testDate,
      van_id: van1.id,
      operator_id: op1.id,

      petrol_tests: 10,
      diesel_tests: 10,
      other_tests: 0,
      total_tests: 20,
      total_collection: 3000,
      expenses: 100,
      net_collection: 2900,
      notes: 'Initial test submission',
    });
    assert(rep1.id !== undefined, 'First report creation for date succeeds');

    // 2nd submission for the same date must throw duplicate error!
    let duplicateCaught = false;
    try {
      await createDailyReport({
        report_date: testDate,
        van_id: van1.id,
        operator_id: op1.id,

        petrol_tests: 15,
        diesel_tests: 5,
        other_tests: 0,
        total_tests: 20,
        total_collection: 3200,
        expenses: 100,
        net_collection: 3100,
      });
    } catch (err: any) {
      if (err.message.includes('already been submitted')) {
        duplicateCaught = true;
      }
    }
    assert(duplicateCaught === true, 'Duplicate report for (van_id, report_date) was rejected');

    // Clean up test report to keep DB pristine
    if (rep1 && rep1.id && process.env.DATABASE_URL) {
      await prisma.dailyReport.delete({ where: { id: rep1.id } }).catch(() => {});
    }
  }

  // TEST SUITE 6: Dashboard Metrics Aggregation
  console.log('\n▶ Test Suite 6: Dashboard Metrics Aggregation');
  {
    const metrics = await getAdminDashboardMetrics();
    assert(metrics.today !== undefined, "Today's metrics generated");
    assert(typeof metrics.today.total_collection === 'number', "Today's collection is a valid number");
    assert(metrics.today.total_vans === 3, 'Total vans count is 3');
    assert(metrics.today.vs_yesterday_formatted !== undefined, 'Yesterday comparison is formatted');
    assert(metrics.van_performance.length === 3, 'All 3 vans present in performance breakdown');
    assert(metrics.weekly.days.length === 7, 'Weekly breakdown contains exactly 7 days');
    assert(Array.isArray(metrics.weekly.van_ranking), 'Weekly van ranking array is provided');
    assert(metrics.monthly.total_collection >= 0, 'Monthly collection is calculated');
  }

  // TEST SUITE 7: Device Tokens & Notifications
  console.log('\n▶ Test Suite 7: Device Tokens & FCM Registration');
  {
    const admin = await getUserByEmail('admin@rtovan.com');
    const token = await upsertDeviceToken({
      user_id: admin!.id,
      token: 'fcm_test_token_admin_device_01',
      platform: 'web',
    });
    assert(token.token === 'fcm_test_token_admin_device_01', 'FCM device token registered in PostgreSQL/DB');

    const adminTokens = await getAdminDeviceTokens();
    assert(adminTokens.includes('fcm_test_token_admin_device_01'), 'Admin device token retrievable for multicast push');

    const notif = await createNotification({
      user_id: admin!.id,
      title: 'Test Notification',
      message: 'Testing in-app notification',
      type: 'SYSTEM',
    });
    assert(notif.id !== undefined, 'Notification created successfully in DB');

    const allNotifs = await getNotifications(admin!.id);
    assert(allNotifs.some((n) => n.id === notif.id), 'Notification retrieved from list');
  }

  // TEST SUITE 8: Audit Logging
  console.log('\n▶ Test Suite 8: Audit Logging System');
  {
    const admin = await getUserByEmail('admin@rtovan.com');
    const log = await createAuditLog({
      user_id: admin!.id,
      action: 'TEST_AUDIT_ACTION',
      entity_type: 'TestEntity',
      metadata: { testKey: 'testVal' },
      ip_address: '127.0.0.1',
    });
    assert(log.id !== undefined, 'Audit log recorded');

    const logs = await getAuditLogs(10);
    assert(logs.some((l) => l.action === 'TEST_AUDIT_ACTION'), 'Audit log retrievable by admin');
  }

  // TEST SUITE 9: Bidirectional User <-> Van Synchronization
  console.log('\n▶ Test Suite 9: Bidirectional User <-> Van Sync');
  {
    // 1. Create a new operator assigned to Van 03
    const van3 = (await getVans()).find((v) => v.van_number === 'srivenkateswara' || v.van_number === 'Van 03')!;
    const testEmail = `sync_test_${Date.now()}@rtovan.com`;
    const newOp = await createUser({
      name: 'Sync Test Operator',
      email: testEmail,
      phone: '+91 99999 88888',
      role: 'VAN_OPERATOR',
      van_id: van3.id,
    });
    assert(newOp.van_id === van3.id, 'New operator created with van_id set');

    // Check that Van 03 operator_id was automatically synchronized to newOp.id
    const updatedVan3 = await getVanById(van3.id);
    assert(updatedVan3 !== null && updatedVan3.operator_id === newOp.id, 'Van 03 operator_id was bidirectionally synced to new operator');

    // 2. Reassign this operator to Van 01 using updateUser
    const van1 = (await getVans()).find((v) => v.van_number === 'umamaheswara' || v.van_number === 'Van 01')!;
    const updatedOp = await updateUser(newOp.id, { van_id: van1.id });
    assert(updatedOp !== null && updatedOp.van_id === van1.id, 'Operator van_id updated to Van 01');

    // Check that Van 01 now has this operator
    const updatedVan1 = await getVanById(van1.id);
    assert(updatedVan1 !== null && updatedVan1.operator_id === newOp.id, 'Van 01 operator_id was bidirectionally updated to new operator');

    // Check that Van 03 is now freed from this operator
    const van3After = await getVanById(van3.id);
    assert(van3After !== null && van3After.operator_id !== newOp.id, 'Van 03 was cleared when operator moved to Van 01');

    // 3. Clear assignment using updateUser(van_id: null)
    const unassignedOp = await updateUser(newOp.id, { van_id: null });
    assert(unassignedOp !== null && unassignedOp.van_id === null, 'Operator unassigned from all vans');
    const van1After = await getVanById(van1.id);
    assert(van1After !== null && van1After.operator_id === null, 'Van 01 operator_id cleared when operator was unassigned');

    // Restore original operator assignments
    const origOp1 = (await getUserByEmail('van1@rtovan.com'))!;
    await updateUser(origOp1.id, { van_id: van1.id });
    const origOp3 = (await getUserByEmail('van3@rtovan.com'))!;
    await updateUser(origOp3.id, { van_id: van3.id });

    // Clean up test operator to keep DB pristine
    if (newOp && newOp.id && process.env.DATABASE_URL) {
      await prisma.user.delete({ where: { id: newOp.id } }).catch(() => {});
    }
  }


  console.log('\n======================================================');
  console.log(`🎉 ALL ${passedTests} / ${totalTestsRun} TESTS PASSED SUCCESSFULLY!`);
  console.log('======================================================\n');
}


runAllTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
