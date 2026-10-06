import { prisma } from '../lib/db/prisma';
import {
  getUserByEmail,
  getUserById,
  getVans,
  getVanById,
  updateVan,
  updateUser,
  getReports,
  getDailyReportByVanAndDate,
  createDailyReport,
  getAdminDashboardMetrics,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
} from '../lib/db';
import { canAccessVan, requireAdmin, AuthContext } from '../lib/auth/session';
import { notifyAdminOnReportSubmission } from '../lib/notifications/service';
import { toISTDateString, formatINR } from '../lib/calculations/financial';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function runCrossLoginSyncTests() {
  console.log('\n======================================================');
  console.log('🔄 CROSS-LOGIN SYNCHRONIZATION & RELIABILITY TEST SUITE');
  console.log('======================================================\n');

  const adminUser = await getUserByEmail('admin@rtovan.com');
  const op1 = await getUserByEmail('van1@rtovan.com');
  const op2 = await getUserByEmail('van2@rtovan.com');
  const op3 = await getUserByEmail('van3@rtovan.com');
  const vans = await getVans();
  const van1 = vans.find((v) => v.van_number === 'umamaheswara' || v.id === op1?.van_id)!;
  const van2 = vans.find((v) => v.van_number === 'srisai' || v.id === op2?.van_id)!;
  const van3 = vans.find((v) => v.van_number === 'srivenkateswara' || v.id === op3?.van_id)!;

  assert(adminUser !== null && adminUser.role === 'ADMIN', 'Admin user verified');
  assert(op1 !== null && op1.role === 'VAN_OPERATOR', 'Operator 1 verified');
  assert(van1 !== null, 'Van 1 (umamaheswara) verified');

  // --------------------------------------------------------------------------
  // TEST SCENARIO 1: Van 1 submits report -> Admin Dashboard, Reports, Notifications,
  // Van performance and Van Dashboard all synchronize correctly.
  // --------------------------------------------------------------------------
  console.log('\n▶ SCENARIO 1: Van 1 Submits Report -> Cross-Login Sync');
  {
    const syncTestDate = '2026-10-07'; // Isolated date
    let createdReportId: string | null = null;
    let notifCreated: any = null;

    try {
      // 1. Van 1 Operator submits daily report
      const rep = await createDailyReport({
        report_date: syncTestDate,
        van_id: van1.id,
        operator_id: op1!.id,
        petrol_tests: 12,
        diesel_tests: 8,
        other_tests: 0,
        total_tests: 20,
        total_collection: 3000,
        expenses: 150,
        net_collection: 2850,
        notes: 'Scenario 1 sync test submission',
      });
      createdReportId = rep.id;
      assert(rep.id !== undefined, 'Van 1 report saved to database');

      // 2. Notification trigger
      await notifyAdminOnReportSubmission({
        reportId: rep.id,
        vanId: van1.id,
        vanNumber: van1.van_number,
        operatorName: op1!.name,
        totalCollection: rep.total_collection,
        totalTests: rep.total_tests,
        reportDate: syncTestDate,
      });

      // 3. Verify Admin Dashboard reflects this new report
      const adminMetrics = await getAdminDashboardMetrics(syncTestDate);
      assert(adminMetrics.today.total_collection === 3000, "Admin Dashboard 'today' collection reflects ₹3,000");
      assert(adminMetrics.today.total_tests === 20, "Admin Dashboard 'today' total tests reflects 20");
      assert(adminMetrics.today.submitted_reports === 1, "Admin Dashboard reflects 1 submitted report");

      const van1Perf = adminMetrics.van_performance.find((v) => v.van_id === van1.id);
      assert(van1Perf !== undefined && van1Perf.report_status === 'SUBMITTED', "Van 1 performance status is 'SUBMITTED'");
      assert(van1Perf?.collection === 3000, 'Van 1 collection is ₹3,000');

      // 4. Verify Admin Reports query sees the new report
      const adminReports = await getReports({ startDate: syncTestDate, endDate: syncTestDate });
      assert(adminReports.some((r) => r.id === rep.id), 'Admin Reports list includes newly submitted report');

      // 5. Verify Admin Notifications has newly created alert
      const adminNotifs = await getNotifications(adminUser!.id);
      const matchingNotif = adminNotifs.find((n) => n.metadata?.reportId === rep.id);
      assert(matchingNotif !== undefined, 'Admin received in-app notification for Van 1 report');
      notifCreated = matchingNotif;

      // 6. Verify Van 1 Operator view
      const van1Today = await getDailyReportByVanAndDate(van1.id, syncTestDate);
      assert(van1Today !== null && van1Today.id === rep.id, 'Van 1 operator query sees submitted report');
    } finally {
      // Clean up test data immediately to keep database pristine
      if (createdReportId) {
        await prisma.dailyReport.delete({ where: { id: createdReportId } }).catch(() => {});
      }
      if (notifCreated?.id) {
        await prisma.notification.delete({ where: { id: notifCreated.id } }).catch(() => {});
      }
    }
  }

  // --------------------------------------------------------------------------
  // TEST SCENARIO 2: Admin updates Van registration -> Admin Vans & Van screen sync
  // --------------------------------------------------------------------------
  console.log('\n▶ SCENARIO 2: Admin Updates Van -> Fleet & Van Screen Sync');
  {
    const originalReg = van1.registration_number;
    const tempReg = 'MH-12-PUC-9999';

    try {
      // Admin updates registration number
      const updatedVan = await updateVan(van1.id, { registration_number: tempReg });
      assert(updatedVan?.registration_number === tempReg, 'Van registration updated in database');

      // Admin Vans list reflects change
      const freshVans = await getVans();
      const checkVan1 = freshVans.find((v) => v.id === van1.id);
      assert(checkVan1?.registration_number === tempReg, 'Admin Vans list query returns updated registration');

      // Van operator query reflects change
      const vanFromDb = await getVanById(van1.id);
      assert(vanFromDb?.registration_number === tempReg, 'Van Operator screen query reflects updated registration');
    } finally {
      // Restore original registration
      await updateVan(van1.id, { registration_number: originalReg });
      const restored = await getVanById(van1.id);
      assert(restored?.registration_number === originalReg, 'Van registration successfully restored');
    }
  }

  // --------------------------------------------------------------------------
  // TEST SCENARIO 3: Admin reassigns user van -> Bidirectional consistency
  // --------------------------------------------------------------------------
  console.log('\n▶ SCENARIO 3: Admin Reassigns User Van -> Bidirectional Sync');
  {
    // Create temporary operator
    const testEmail = `sync_user_${Date.now()}@rtovan.com`;
    const tempOp = await prisma.user.create({
      data: {
        firebase_uid: `fb_sync_${Date.now()}`,
        name: 'Temp Sync Operator',
        email: testEmail,
        role: 'VAN_OPERATOR',
        van_id: null,
      },
    });

    try {
      // Assign temp operator to Van 2
      await updateUser(tempOp.id, { van_id: van2.id });
      const checkVan2 = await getVanById(van2.id);
      assert(checkVan2?.operator_id === tempOp.id, 'Van 2 operator_id automatically synced to temp operator');

      const checkUser = await getUserById(tempOp.id);
      assert(checkUser?.van_id === van2.id, 'User van_id synced to Van 2');

      // Reassign to Van 3
      await updateUser(tempOp.id, { van_id: van3.id });
      const checkVan3 = await getVanById(van3.id);
      assert(checkVan3?.operator_id === tempOp.id, 'Van 3 operator_id synced to temp operator');

      const checkVan2After = await getVanById(van2.id);
      assert(checkVan2After?.operator_id !== tempOp.id, 'Van 2 operator_id cleared when operator moved to Van 3');

      // Unassign
      await updateUser(tempOp.id, { van_id: null });
      const checkVan3After = await getVanById(van3.id);
      assert(checkVan3After?.operator_id === null, 'Van 3 operator_id cleared when operator was unassigned');
    } finally {
      // Restore legitimate operators
      if (op2) await updateUser(op2.id, { van_id: van2.id });
      if (op3) await updateUser(op3.id, { van_id: van3.id });
      await prisma.user.delete({ where: { id: tempOp.id } }).catch(() => {});
    }
  }

  // --------------------------------------------------------------------------
  // TEST SCENARIO 4: Admin reads notification -> Badge count & state sync
  // --------------------------------------------------------------------------
  console.log('\n▶ SCENARIO 4: Notification Read / Unread State Synchronization');
  {
    // Create a temporary unread notification
    const testNotif = await createNotification({
      user_id: adminUser!.id,
      title: 'Sync Test Alert',
      message: 'Checking badge and read synchronization',
      type: 'SYSTEM',
    });

    try {
      const initialUnreadCount = await getUnreadNotificationCount(adminUser!.id);
      assert(initialUnreadCount >= 1, 'Unread notification count is at least 1');

      // Mark notification as read
      const markSuccess = await markNotificationRead(testNotif.id, adminUser!.id);
      assert(markSuccess === true, 'markNotificationRead returned true');

      const updatedNotifs = await getNotifications(adminUser!.id, false);
      const readItem = updatedNotifs.find((n) => n.id === testNotif.id);
      assert(readItem !== undefined && readItem.is_read === true, 'Notification in DB is marked is_read: true');

      const updatedUnreadCount = await getUnreadNotificationCount(adminUser!.id);
      assert(updatedUnreadCount === initialUnreadCount - 1, 'Unread badge count decremented accurately');
    } finally {
      await prisma.notification.delete({ where: { id: testNotif.id } }).catch(() => {});
    }
  }

  // --------------------------------------------------------------------------
  // TEST SCENARIO 5: Multiple concurrent submissions -> No lost or duplicate data
  // --------------------------------------------------------------------------
  console.log('\n▶ SCENARIO 5: High Concurrency & Duplicate Rejection Verification');
  {
    const concurrentDate = '2026-10-08';
    let repIdVan1: string | null = null;
    let repIdVan2: string | null = null;

    try {
      // 1. Two different vans submit concurrently (Promise.all)
      const [r1, r2] = await Promise.all([
        createDailyReport({
          report_date: concurrentDate,
          van_id: van1.id,
          operator_id: op1!.id,
          petrol_tests: 10,
          diesel_tests: 10,
          other_tests: 0,
          total_tests: 20,
          total_collection: 2500,
          expenses: 100,
          net_collection: 2400,
        }),
        createDailyReport({
          report_date: concurrentDate,
          van_id: van2.id,
          operator_id: op2!.id,
          petrol_tests: 15,
          diesel_tests: 5,
          other_tests: 0,
          total_tests: 20,
          total_collection: 3500,
          expenses: 200,
          net_collection: 3300,
        }),
      ]);
      repIdVan1 = r1.id;
      repIdVan2 = r2.id;

      assert(r1.id !== undefined && r2.id !== undefined, 'Concurrent submissions from different vans both succeed');

      // 2. Attempt duplicate concurrent submission for Van 1 on same date -> Must fail!
      let duplicateRejected = false;
      try {
        await createDailyReport({
          report_date: concurrentDate,
          van_id: van1.id,
          operator_id: op1!.id,
          petrol_tests: 5,
          diesel_tests: 5,
          other_tests: 0,
          total_tests: 10,
          total_collection: 1500,
          expenses: 50,
          net_collection: 1450,
        });
      } catch (err: any) {
        if (err.message.includes('already been submitted')) {
          duplicateRejected = true;
        }
      }
      assert(duplicateRejected === true, 'Duplicate concurrent submission for same (van, date) is strictly rejected');

      // Check totals aggregation
      const dayReports = await getReports({ startDate: concurrentDate, endDate: concurrentDate });
      const dayTotalCol = dayReports.reduce((sum, r) => sum + r.total_collection, 0);
      assert(dayTotalCol === 6000, 'Combined collection across concurrent vans equals exact sum (₹6,000)');
    } finally {
      if (repIdVan1) await prisma.dailyReport.delete({ where: { id: repIdVan1 } }).catch(() => {});
      if (repIdVan2) await prisma.dailyReport.delete({ where: { id: repIdVan2 } }).catch(() => {});
    }
  }

  // --------------------------------------------------------------------------
  // TEST SCENARIO 6: Role Security Boundary & Unauthorized Access Isolation
  // --------------------------------------------------------------------------
  console.log('\n▶ SCENARIO 6: Multi-Tenant Role Isolation & Security Boundaries');
  {
    const adminCtx: AuthContext = { user: adminUser!, role: 'ADMIN' };
    const op1Ctx: AuthContext = { user: op1!, role: 'VAN_OPERATOR' };
    const op2Ctx: AuthContext = { user: op2!, role: 'VAN_OPERATOR' };

    // Admin privileges
    assert(requireAdmin(adminCtx) === true, 'requireAdmin grants access to Admin');
    assert(requireAdmin(op1Ctx) === false, 'requireAdmin denies access to Van Operator');

    // Van scoping
    assert(canAccessVan(adminCtx, van1.id) === true, 'Admin can access Van 1');
    assert(canAccessVan(adminCtx, van2.id) === true, 'Admin can access Van 2');
    assert(canAccessVan(op1Ctx, van1.id) === true, 'Operator 1 can access assigned Van 1');
    assert(canAccessVan(op1Ctx, van2.id) === false, 'Operator 1 CANNOT access Van 2');
    assert(canAccessVan(op2Ctx, van1.id) === false, 'Operator 2 CANNOT access Van 1');
    assert(canAccessVan(null, van1.id) === false, 'Unauthenticated request denied all vans');
  }

  console.log('\n======================================================');
  console.log(`🎉 ALL ${passedTests} / ${totalTests} SYNCHRONIZATION TESTS PASSED!`);
  console.log('======================================================\n');
}

runCrossLoginSyncTests()
  .catch((e) => {
    console.error('Cross-login sync test failed:', e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
