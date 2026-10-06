import {
  getAdminDeviceTokens,
  getActiveAdminUsers,
  createNotificationsBatch,
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

  // 1. Fetch active admins and device tokens in PARALLEL
  const [admins, adminTokens] = await Promise.all([
    getActiveAdminUsers(),
    getAdminDeviceTokens(),
  ]);

  // 2. Batch create in-app notifications in PostgreSQL for each admin
  if (admins.length > 0) {
    await createNotificationsBatch(
      admins.map((admin) => ({
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
      }))
    );
  }
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
  const [vans, todayReports, admins, adminTokens] = await Promise.all([
    getVans(),
    getReports({ startDate: targetDate, endDate: targetDate }),
    getActiveAdminUsers(),
    getAdminDeviceTokens(),
  ]);

  const activeVans = vans.filter((v) => v.status === 'ACTIVE');
  const pendingVans: string[] = [];
  const notificationsToCreate: Array<{
    user_id: string;
    title: string;
    message: string;
    type: string;
    metadata: any;
  }> = [];

  for (const van of activeVans) {
    const hasSubmitted = todayReports.some((r) => r.van_id === van.id);
    if (!hasSubmitted) {
      pendingVans.push(van.van_number);

      // Queue in-app notifications for admins
      for (const admin of admins) {
        notificationsToCreate.push({
          user_id: admin.id,
          title: '⚠ Daily Report Pending',
          message: `${van.van_number} (${van.registration_number}) has not submitted today's report.`,
          type: 'DAILY_REPORT_PENDING',
          metadata: {
            vanId: van.id,
            vanNumber: van.van_number,
            date: targetDate,
          },
        });
      }

      // Also dispatch push notification
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

  let notificationsCreated = 0;
  if (notificationsToCreate.length > 0) {
    notificationsCreated = await createNotificationsBatch(notificationsToCreate);
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
