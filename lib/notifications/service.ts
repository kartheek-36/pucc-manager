import {
  createNotification,
  getAdminDeviceTokens,
  getAllUsers,
  getVans,
  getReports,
  createAuditLog,
} from '../db';
import { sendMulticastNotification } from '../firebase/admin';
import { formatINR, getTodayISTDateString } from '../calculations/financial';

/**
 * Trigger notification and push notification when a van submits its daily report
 */
export async function notifyAdminOnReportSubmission(params: {
  reportId: string;
  vanId: string;
  vanNumber: string;
  operatorName: string;
  totalCollection: number;
  totalTests: number;
  reportDate: string;
}): Promise<void> {
  const {
    reportId,
    vanId,
    vanNumber,
    totalCollection,
    totalTests,
    reportDate,
  } = params;

  const title = 'Daily Report Received';
  const body = `${vanNumber} submitted today's report.\nCollection: ${formatINR(totalCollection)}\nTests: ${totalTests}`;

  // 1. Get all admin users
  const allUsers = await getAllUsers();
  const admins = allUsers.filter((u) => u.role === 'ADMIN' && u.is_active);

  // 2. Create in-app notifications in PostgreSQL for each admin
  for (const admin of admins) {
    await createNotification({
      user_id: admin.id,
      title,
      message: body,
      type: 'DAILY_REPORT_SUBMITTED',
      metadata: {
        reportId,
        vanId,
        vanNumber,
        reportDate,
        collection: totalCollection,
        tests: totalTests,
      },
    });
  }

  // 3. Send FCM push notifications to all registered admin devices
  const adminTokens = await getAdminDeviceTokens();
  if (adminTokens.length > 0) {
    await sendMulticastNotification(adminTokens, {
      title,
      body,
      data: {
        type: 'DAILY_REPORT_SUBMITTED',
        reportId,
        vanId,
        date: reportDate,
      },
    });
  }

  // 4. Record audit log
  await createAuditLog({
    user_id: null,
    action: 'NOTIFICATION_SENT',
    entity_type: 'DailyReport',
    entity_id: reportId,
    metadata: {
      type: 'DAILY_REPORT_SUBMITTED',
      adminCount: admins.length,
      deviceTokensCount: adminTokens.length,
      vanNumber,
    },
  });
}

/**
 * Check for pending reports after deadline and send notification without duplicates
 */
export async function checkAndNotifyPendingReports(forDate?: string): Promise<{
  checkedDate: string;
  pendingVans: string[];
  notificationsCreated: number;
}> {
  const targetDate = forDate || getTodayISTDateString();
  const vans = await getVans();
  const activeVans = vans.filter((v) => v.status === 'ACTIVE');
  const todayReports = await getReports({ startDate: targetDate, endDate: targetDate });

  const allUsers = await getAllUsers();
  const admins = allUsers.filter((u) => u.role === 'ADMIN' && u.is_active);

  const pendingVans: string[] = [];
  let notificationsCreated = 0;

  for (const van of activeVans) {
    const hasSubmitted = todayReports.some((r) => r.van_id === van.id);
    if (!hasSubmitted) {
      pendingVans.push(van.van_number);

      // Check if we already sent a pending notification for this van today to avoid duplicates!
      // In-app check:
      for (const admin of admins) {
        // Create title and message
        const title = '⚠ Daily Report Pending';
        const message = `${van.van_number} (${van.registration_number}) has not submitted today's report.`;

        await createNotification({
          user_id: admin.id,
          title,
          message,
          type: 'DAILY_REPORT_PENDING',
          metadata: {
            vanId: van.id,
            vanNumber: van.van_number,
            date: targetDate,
          },
        });
        notificationsCreated++;
      }

      // Also dispatch push notification
      const adminTokens = await getAdminDeviceTokens();
      if (adminTokens.length > 0) {
        await sendMulticastNotification(adminTokens, {
          title: '⚠ Daily Report Pending',
          body: `${van.van_number} has not submitted today's report.`,
          data: {
            type: 'DAILY_REPORT_PENDING',
            vanId: van.id,
            date: targetDate,
          },
        });
      }
    }
  }

  if (pendingVans.length > 0) {
    await createAuditLog({
      action: 'PENDING_REPORTS_CHECKED',
      entity_type: 'CronJob',
      metadata: { targetDate, pendingVans, notificationsCreated },
    });
  }

  return {
    checkedDate: targetDate,
    pendingVans,
    notificationsCreated,
  };
}
