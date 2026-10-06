import { randomUUID } from 'crypto';
import { prisma } from './prisma';
import {
  User,
  Van,
  DailyReport,
  NotificationItem,
  DeviceToken,
  AuditLogItem,
  Role,
  VanStatus,
  ReportStatus,
  AdminDashboardData,
} from '../../types';
import {
  formatINR,
  roundTo2Decimals,
  calculateNetCollection,
  calculateTotalTests,
  getTodayISTDateString,
  toISTDateString,
  getLast7DaysIST,
  getCurrentMonthISTRange,
  getYesterdayISTDateString,
  calculatePercentageChange,
} from '../calculations/financial';

// Seed data initial state for fallback / standalone execution
const INITIAL_ADMIN: User = {
  id: 'a0000000-0000-0000-0000-000000000001',
  firebase_uid: 'firebase_admin_uid_01',
  name: 'Venkateswara Rao (Admin)',
  email: 'admin@rtovan.com',
  phone: '7013669423',
  role: 'ADMIN',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const INITIAL_VANS: Van[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    van_number: 'umamaheswara',
    registration_number: 'MH-12-PUC-1001',
    operator_id: 'c0000000-0000-0000-0000-000000000001',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    van_number: 'srisai',
    registration_number: 'MH-12-PUC-1002',
    operator_id: 'c0000000-0000-0000-0000-000000000002',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    van_number: 'srivenkateswara',
    registration_number: 'MH-12-PUC-1003',
    operator_id: 'c0000000-0000-0000-0000-000000000003',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_OPERATORS: User[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    firebase_uid: 'firebase_van1_uid',
    name: 'umamaheswara',
    email: 'van1@rtovan.com',
    phone: '9951537362',
    role: 'VAN_OPERATOR',
    van_id: 'b0000000-0000-0000-0000-000000000001',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    firebase_uid: 'firebase_van2_uid',
    name: 'srisai',
    email: 'van2@rtovan.com',
    phone: '9951536848',
    role: 'VAN_OPERATOR',
    van_id: 'b0000000-0000-0000-0000-000000000002',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    firebase_uid: 'firebase_van3_uid',
    name: 'srivenkateswara',
    email: 'van3@rtovan.com',
    phone: '9951537681',
    role: 'VAN_OPERATOR',
    van_id: 'b0000000-0000-0000-0000-000000000003',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Clean slate for production deployment: 0 initial reports
function generateInitialReports(): DailyReport[] {
  return [];
}

// In-memory fallback state holder
class MemoryStore {
  users: Map<string, User> = new Map();
  vans: Map<string, Van> = new Map();
  reports: Map<string, DailyReport> = new Map();
  notifications: Map<string, NotificationItem> = new Map();
  deviceTokens: Map<string, DeviceToken> = new Map();
  auditLogs: AuditLogItem[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.users.clear();
    this.vans.clear();
    this.reports.clear();
    this.notifications.clear();
    this.deviceTokens.clear();
    this.auditLogs = [];

    // Seed Admin
    this.users.set(INITIAL_ADMIN.id, { ...INITIAL_ADMIN });

    // Seed Operators
    for (const op of INITIAL_OPERATORS) {
      this.users.set(op.id, { ...op });
    }

    // Seed Vans
    for (const v of INITIAL_VANS) {
      this.vans.set(v.id, { ...v });
    }

    // 0 dummy reports, 0 dummy notifications for production

    // Seed Initial Audit Log
    this.auditLogs.push({
      id: 'audit-0',
      user_id: INITIAL_ADMIN.id,
      action: 'SYSTEM_INITIALIZED',
      entity_type: 'System',
      metadata: { note: 'Seed store ready' },
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString(),
    });
  }
}

// Global store to persist across Next.js dev reloads
const globalStore: MemoryStore = (globalThis as any).__rto_van_store ?? new MemoryStore();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__rto_van_store = globalStore;
}

let isDatabaseConnected: boolean | null = null;
let lastDbError: string | null = null;

export async function checkPrismaConnection(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    lastDbError = 'DATABASE_URL_ENV_VAR_NOT_FOUND';
    return false;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDatabaseConnected = true;
    lastDbError = null;
    return true;
  } catch (err: any) {
    isDatabaseConnected = false;
    lastDbError = err?.message || String(err);
    console.error('[DB_CONNECTION_FAILURE]', lastDbError);
    return false;
  }
}

export function getLastDbError(): string | null {
  return lastDbError;
}

// ======================== REPOSITORY METHODS ========================

export async function getUserById(id: string): Promise<User | null> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { van: true },
    });
    if (!user) return null;
    return {
      ...user,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
      van: user.van
        ? {
            ...user.van,
            created_at: user.van.created_at.toISOString(),
            updated_at: user.van.updated_at.toISOString(),
          }
        : null,
    };
  }

  const user = globalStore.users.get(id);
  if (!user) return null;
  const van = user.van_id ? globalStore.vans.get(user.van_id) : null;
  return { ...user, van };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { van: true },
    });
    if (!user) return null;
    return {
      ...user,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
      van: user.van
        ? {
            ...user.van,
            created_at: user.van.created_at.toISOString(),
            updated_at: user.van.updated_at.toISOString(),
          }
        : null,
    };
  }

  for (const user of globalStore.users.values()) {
    if (user.email.toLowerCase() === normalizedEmail) {
      const van = user.van_id ? globalStore.vans.get(user.van_id) : null;
      return { ...user, van };
    }
  }
  return null;
}

export async function getUserByFirebaseUid(uid: string): Promise<User | null> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const user = await prisma.user.findUnique({
      where: { firebase_uid: uid },
      include: { van: true },
    });
    if (!user) return null;
    return {
      ...user,
      created_at: user.created_at.toISOString(),
      updated_at: user.updated_at.toISOString(),
      van: user.van
        ? {
            ...user.van,
            created_at: user.van.created_at.toISOString(),
            updated_at: user.van.updated_at.toISOString(),
          }
        : null,
    };
  }

  for (const user of globalStore.users.values()) {
    if (user.firebase_uid === uid) {
      const van = user.van_id ? globalStore.vans.get(user.van_id) : null;
      return { ...user, van };
    }
  }
  return null;
}

export async function getAllUsers(): Promise<User[]> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const users = await prisma.user.findMany({
      include: { van: true },
      orderBy: { created_at: 'asc' },
    });
    return users.map((u: any) => ({
      ...u,
      created_at: u.created_at.toISOString(),
      updated_at: u.updated_at.toISOString(),
      van: u.van
        ? {
            ...u.van,
            created_at: u.van.created_at.toISOString(),
            updated_at: u.van.updated_at.toISOString(),
          }
        : null,
    }));
  }

  return Array.from(globalStore.users.values()).map((u: User) => {
    const van = u.van_id ? globalStore.vans.get(u.van_id) : null;
    return { ...u, van };
  });
}

export async function createUser(data: {
  name: string;
  email: string;
  phone?: string | null;
  role?: Role;
  van_id?: string | null;
  is_active?: boolean;
}): Promise<User> {
  const normalizedEmail = data.email.trim().toLowerCase();
  const id = randomUUID();
  const firebaseUid = `firebase_${id}`;
  const role: Role = data.role || 'VAN_OPERATOR';
  const isActive = data.is_active ?? true;

  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    if (data.van_id) {
      // Clear this van from any other user
      await prisma.user.updateMany({
        where: { van_id: data.van_id },
        data: { van_id: null },
      });
    }

    const created = await prisma.user.create({
      data: {
        id,
        firebase_uid: firebaseUid,
        name: data.name,
        email: normalizedEmail,
        phone: data.phone ?? null,
        role,
        van_id: data.van_id ?? null,
        is_active: isActive,
      },
      include: { van: true },
    });

    if (data.van_id) {
      // Clear any other van that might have this operator
      await prisma.van.updateMany({
        where: { operator_id: created.id, NOT: { id: data.van_id } },
        data: { operator_id: null },
      });
      // Assign operator to this van
      await prisma.van.update({
        where: { id: data.van_id },
        data: { operator_id: created.id },
      });
    }


    return {
      ...created,
      created_at: created.created_at.toISOString(),
      updated_at: created.updated_at.toISOString(),
      van: created.van
        ? {
            ...created.van,
            created_at: created.van.created_at.toISOString(),
            updated_at: created.van.updated_at.toISOString(),
          }
        : null,
    };
  }

  // GlobalStore creation
  const now = new Date().toISOString();
  if (data.van_id) {
    // Clear other users on this van
    for (const [uId, u] of globalStore.users.entries()) {
      if (u.van_id === data.van_id) {
        globalStore.users.set(uId, { ...u, van_id: null, updated_at: now });
      }
    }
    // Set operator on van
    const v = globalStore.vans.get(data.van_id);
    if (v) {
      globalStore.vans.set(data.van_id, { ...v, operator_id: id, updated_at: now });
    }
  }

  const newUser: User = {
    id,
    firebase_uid: firebaseUid,
    name: data.name,
    email: normalizedEmail,
    phone: data.phone ?? null,
    role,
    van_id: data.van_id ?? null,
    is_active: isActive,
    created_at: now,
    updated_at: now,
  };
  globalStore.users.set(id, newUser);
  const van = newUser.van_id ? globalStore.vans.get(newUser.van_id) : null;
  return { ...newUser, van };
}

export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    // Bidirectional sync with Van table
    if (data.van_id !== undefined) {
      if (data.van_id) {
        // Clear this van from other users
        await prisma.user.updateMany({
          where: { van_id: data.van_id, NOT: { id } },
          data: { van_id: null },
        });
        // Clear any old van where this user was operator
        await prisma.van.updateMany({
          where: { operator_id: id, NOT: { id: data.van_id } },
          data: { operator_id: null },
        });
        // Set new van operator
        await prisma.van.update({
          where: { id: data.van_id },
          data: { operator_id: id },
        });
      } else {
        // van_id is null: clear operator from any van
        await prisma.van.updateMany({
          where: { operator_id: id },
          data: { operator_id: null },
        });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
        ...(data.van_id !== undefined ? { van_id: data.van_id } : {}),
        ...(data.role !== undefined ? { role: data.role } : {}),
      },
      include: { van: true },
    });
    return {
      ...updated,
      created_at: updated.created_at.toISOString(),
      updated_at: updated.updated_at.toISOString(),
      van: updated.van
        ? {
            ...updated.van,
            created_at: updated.van.created_at.toISOString(),
            updated_at: updated.van.updated_at.toISOString(),
          }
        : null,
    };
  }

  const user = globalStore.users.get(id);
  if (!user) return null;
  const now = new Date().toISOString();

  // Bidirectional sync with globalStore.vans
  if (data.van_id !== undefined) {
    const oldVanId = user.van_id;
    const newVanId = data.van_id;

    // Remove operator from old van if changed
    if (oldVanId && oldVanId !== newVanId) {
      const oldVan = globalStore.vans.get(oldVanId);
      if (oldVan && oldVan.operator_id === id) {
        globalStore.vans.set(oldVanId, { ...oldVan, operator_id: null, updated_at: now });
      }
    }

    if (newVanId) {
      // Clear newVan from any other user
      for (const [otherId, otherUser] of globalStore.users.entries()) {
        if (otherId !== id && otherUser.van_id === newVanId) {
          globalStore.users.set(otherId, { ...otherUser, van_id: null, updated_at: now });
        }
      }
      // Set operator on new van
      const newVan = globalStore.vans.get(newVanId);
      if (newVan) {
        globalStore.vans.set(newVanId, { ...newVan, operator_id: id, updated_at: now });
      }
    } else {
      // Unassigned
      for (const [vanId, v] of globalStore.vans.entries()) {
        if (v.operator_id === id) {
          globalStore.vans.set(vanId, { ...v, operator_id: null, updated_at: now });
        }
      }
    }
  }

  const updated: User = {
    ...user,
    ...data,
    updated_at: now,
  };
  globalStore.users.set(id, updated);
  const van = updated.van_id ? globalStore.vans.get(updated.van_id) : null;
  return { ...updated, van };
}

export async function getVans(): Promise<Van[]> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const vans = await prisma.van.findMany({
      include: { operator: true },
      orderBy: { van_number: 'asc' },
    });
    return vans.map((v: any) => ({
      ...v,
      created_at: v.created_at.toISOString(),
      updated_at: v.updated_at.toISOString(),
      operator: v.operator
        ? {
            ...v.operator,
            created_at: v.operator.created_at.toISOString(),
            updated_at: v.operator.updated_at.toISOString(),
          }
        : null,
    }));
  }

  return Array.from(globalStore.vans.values())
    .map((v: Van) => {
      const operator = v.operator_id ? globalStore.users.get(v.operator_id) : null;
      return { ...v, operator };
    })
    .sort((a, b) => a.van_number.localeCompare(b.van_number));
}

export async function getVanById(id: string): Promise<Van | null> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const van = await prisma.van.findUnique({
      where: { id },
      include: { operator: true },
    });
    if (!van) return null;
    return {
      ...van,
      created_at: van.created_at.toISOString(),
      updated_at: van.updated_at.toISOString(),
      operator: van.operator
        ? {
            ...van.operator,
            created_at: van.operator.created_at.toISOString(),
            updated_at: van.operator.updated_at.toISOString(),
          }
        : null,
    };
  }

  const van = globalStore.vans.get(id);
  if (!van) return null;
  const operator = van.operator_id ? globalStore.users.get(van.operator_id) : null;
  return { ...van, operator };
}

export async function updateVan(
  id: string,
  data: { registration_number?: string; status?: VanStatus; operator_id?: string | null }
): Promise<Van | null> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    if (data.operator_id !== undefined) {
      if (data.operator_id) {
        // Clear other van for this operator
        await prisma.van.updateMany({
          where: { operator_id: data.operator_id, NOT: { id } },
          data: { operator_id: null },
        });
        // Clear previous operator's van_id
        await prisma.user.updateMany({
          where: { van_id: id, NOT: { id: data.operator_id } },
          data: { van_id: null },
        });
        // Set van_id on new operator
        await prisma.user.update({
          where: { id: data.operator_id },
          data: { van_id: id },
        });
      } else {
        // Clear operator
        await prisma.user.updateMany({
          where: { van_id: id },
          data: { van_id: null },
        });
      }
    }

    const updated = await prisma.van.update({
      where: { id },
      data: {
        registration_number: data.registration_number,
        status: data.status,
        operator_id: data.operator_id,
      },
      include: { operator: true },
    });
    return {
      ...updated,
      created_at: updated.created_at.toISOString(),
      updated_at: updated.updated_at.toISOString(),
      operator: updated.operator
        ? {
            ...updated.operator,
            created_at: updated.operator.created_at.toISOString(),
            updated_at: updated.operator.updated_at.toISOString(),
          }
        : null,
    };
  }

  const van = globalStore.vans.get(id);
  if (!van) return null;
  const now = new Date().toISOString();

  if (data.operator_id !== undefined) {
    const oldOpId = van.operator_id;
    const newOpId = data.operator_id;

    if (oldOpId && oldOpId !== newOpId) {
      const oldOp = globalStore.users.get(oldOpId);
      if (oldOp && oldOp.van_id === id) {
        globalStore.users.set(oldOpId, { ...oldOp, van_id: null, updated_at: now });
      }
    }

    if (newOpId) {
      // Clear other van for this new operator
      for (const [vId, v] of globalStore.vans.entries()) {
        if (vId !== id && v.operator_id === newOpId) {
          globalStore.vans.set(vId, { ...v, operator_id: null, updated_at: now });
        }
      }
      // Set van_id on this operator
      const newOp = globalStore.users.get(newOpId);
      if (newOp) {
        globalStore.users.set(newOpId, { ...newOp, van_id: id, updated_at: now });
      }
    } else {
      // Unassigned
      for (const [uId, u] of globalStore.users.entries()) {
        if (u.van_id === id) {
          globalStore.users.set(uId, { ...u, van_id: null, updated_at: now });
        }
      }
    }
  }

  const updated: Van = {
    ...van,
    ...(data.registration_number ? { registration_number: data.registration_number } : {}),
    ...(data.status ? { status: data.status } : {}),
    ...(data.operator_id !== undefined ? { operator_id: data.operator_id } : {}),
    updated_at: now,
  };
  globalStore.vans.set(id, updated);
  const operator = updated.operator_id ? globalStore.users.get(updated.operator_id) : null;
  return { ...updated, operator };
}

export async function getDailyReport(id: string): Promise<DailyReport | null> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const report = await prisma.dailyReport.findUnique({
      where: { id },
      include: { van: true, operator: true },
    });
    if (!report) return null;
    return {
      ...report,
      report_date: toISTDateString(report.report_date),
      total_collection: Number(report.total_collection),
      expenses: Number(report.expenses),
      net_collection: Number(report.net_collection),
      submitted_at: report.submitted_at.toISOString(),
      updated_at: report.updated_at.toISOString(),
      van: {
        ...report.van,
        created_at: report.van.created_at.toISOString(),
        updated_at: report.van.updated_at.toISOString(),
      },
      operator: {
        ...report.operator,
        created_at: report.operator.created_at.toISOString(),
        updated_at: report.operator.updated_at.toISOString(),
      },
    };
  }

  const report = globalStore.reports.get(id);
  if (!report) return null;
  const van = globalStore.vans.get(report.van_id);
  const operator = globalStore.users.get(report.operator_id);
  return { ...report, van, operator };
}

export async function getDailyReportByVanAndDate(
  vanId: string,
  dateStr: string
): Promise<DailyReport | null> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const dateObj = new Date(dateStr);
    const report = await prisma.dailyReport.findFirst({
      where: {
        van_id: vanId,
        report_date: dateObj,
      },
      include: { van: true, operator: true },
    });
    if (!report) return null;
    return {
      ...report,
      report_date: toISTDateString(report.report_date),
      total_collection: Number(report.total_collection),
      expenses: Number(report.expenses),
      net_collection: Number(report.net_collection),
      submitted_at: report.submitted_at.toISOString(),
      updated_at: report.updated_at.toISOString(),
      van: {
        ...report.van,
        created_at: report.van.created_at.toISOString(),
        updated_at: report.van.updated_at.toISOString(),
      },
      operator: {
        ...report.operator,
        created_at: report.operator.created_at.toISOString(),
        updated_at: report.operator.updated_at.toISOString(),
      },
    };
  }

  for (const report of globalStore.reports.values()) {
    if (report.van_id === vanId && report.report_date === dateStr) {
      const van = globalStore.vans.get(report.van_id);
      const operator = globalStore.users.get(report.operator_id);
      return { ...report, van, operator };
    }
  }
  return null;
}

export async function createDailyReport(data: {
  report_date: string;
  van_id: string;
  operator_id: string;
  petrol_tests: number;
  diesel_tests: number;
  other_tests: number;
  total_tests: number;
  total_collection: number;
  expenses: number;
  net_collection: number;
  notes?: string | null;
  status?: ReportStatus;
}): Promise<DailyReport> {
  // Validate duplicate prevention rule
  const existing = await getDailyReportByVanAndDate(data.van_id, data.report_date);
  if (existing) {
    throw new Error(`A report for this van has already been submitted for ${data.report_date}`);
  }

  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const dateObj = new Date(data.report_date);
    const created = await prisma.dailyReport.create({
      data: {
        report_date: dateObj,
        van_id: data.van_id,
        operator_id: data.operator_id,
        petrol_tests: data.petrol_tests,
        diesel_tests: data.diesel_tests,
        other_tests: data.other_tests,
        total_tests: data.total_tests,
        total_collection: data.total_collection,
        expenses: data.expenses,
        net_collection: data.net_collection,
        notes: data.notes ?? null,
        status: data.status ?? 'SUBMITTED',
      },
      include: { van: true, operator: true },
    });
    return {
      ...created,
      report_date: toISTDateString(created.report_date),
      total_collection: Number(created.total_collection),
      expenses: Number(created.expenses),
      net_collection: Number(created.net_collection),
      submitted_at: created.submitted_at.toISOString(),
      updated_at: created.updated_at.toISOString(),
      van: {
        ...created.van,
        created_at: created.van.created_at.toISOString(),
        updated_at: created.van.updated_at.toISOString(),
      },
      operator: {
        ...created.operator,
        created_at: created.operator.created_at.toISOString(),
        updated_at: created.operator.updated_at.toISOString(),
      },
    };
  }

  const newId = `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const report: DailyReport = {
    id: newId,
    report_date: data.report_date,
    van_id: data.van_id,
    operator_id: data.operator_id,
    petrol_tests: data.petrol_tests,
    diesel_tests: data.diesel_tests,
    other_tests: data.other_tests,
    total_tests: data.total_tests,
    total_collection: data.total_collection,
    expenses: data.expenses,
    net_collection: data.net_collection,
    notes: data.notes ?? null,
    submitted_at: now,
    updated_at: now,
    status: data.status ?? 'SUBMITTED',
  };

  globalStore.reports.set(newId, report);
  const van = globalStore.vans.get(report.van_id);
  const operator = globalStore.users.get(report.operator_id);
  return { ...report, van, operator };
}

export async function updateDailyReport(
  id: string,
  data: Partial<DailyReport>
): Promise<DailyReport | null> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const updateData: any = {};
    if (data.petrol_tests !== undefined) updateData.petrol_tests = data.petrol_tests;
    if (data.diesel_tests !== undefined) updateData.diesel_tests = data.diesel_tests;
    if (data.other_tests !== undefined) updateData.other_tests = data.other_tests;
    if (data.total_tests !== undefined) updateData.total_tests = data.total_tests;
    if (data.total_collection !== undefined) updateData.total_collection = data.total_collection;
    if (data.expenses !== undefined) updateData.expenses = data.expenses;
    if (data.net_collection !== undefined) updateData.net_collection = data.net_collection;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await prisma.dailyReport.update({
      where: { id },
      data: updateData,
      include: { van: true, operator: true },
    });
    return {
      ...updated,
      report_date: toISTDateString(updated.report_date),
      total_collection: Number(updated.total_collection),
      expenses: Number(updated.expenses),
      net_collection: Number(updated.net_collection),
      submitted_at: updated.submitted_at.toISOString(),
      updated_at: updated.updated_at.toISOString(),
      van: {
        ...updated.van,
        created_at: updated.van.created_at.toISOString(),
        updated_at: updated.van.updated_at.toISOString(),
      },
      operator: {
        ...updated.operator,
        created_at: updated.operator.created_at.toISOString(),
        updated_at: updated.operator.updated_at.toISOString(),
      },
    };
  }

  const existing = globalStore.reports.get(id);
  if (!existing) return null;
  const updated: DailyReport = {
    ...existing,
    ...data,
    updated_at: new Date().toISOString(),
  };
  globalStore.reports.set(id, updated);
  const van = globalStore.vans.get(updated.van_id);
  const operator = globalStore.users.get(updated.operator_id);
  return { ...updated, van, operator };
}

export async function getReports(filters?: {
  van_id?: string;
  operator_id?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  limit?: number;
}): Promise<DailyReport[]> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const where: any = {};
    if (filters?.van_id) where.van_id = filters.van_id;
    if (filters?.operator_id) where.operator_id = filters.operator_id;
    if (filters?.status) where.status = filters.status;
    if (filters?.startDate || filters?.endDate) {
      where.report_date = {};
      if (filters.startDate) where.report_date.gte = new Date(filters.startDate);
      if (filters.endDate) where.report_date.lte = new Date(filters.endDate);
    }

    const reports = await prisma.dailyReport.findMany({
      where,
      include: { van: true, operator: true },
      orderBy: { report_date: 'desc' },
      take: filters?.limit ?? 500,
    });

    return reports.map((r: any) => ({
      ...r,
      report_date: toISTDateString(r.report_date),
      total_collection: Number(r.total_collection),
      expenses: Number(r.expenses),
      net_collection: Number(r.net_collection),
      submitted_at: r.submitted_at.toISOString(),
      updated_at: r.updated_at.toISOString(),
      van: {
        ...r.van,
        created_at: r.van.created_at.toISOString(),
        updated_at: r.van.updated_at.toISOString(),
      },
      operator: {
        ...r.operator,
        created_at: r.operator.created_at.toISOString(),
        updated_at: r.operator.updated_at.toISOString(),
      },
    }));
  }

  let list: DailyReport[] = Array.from(globalStore.reports.values());

  if (filters?.van_id) {
    list = list.filter((r: DailyReport) => r.van_id === filters.van_id);
  }
  if (filters?.operator_id) {
    list = list.filter((r: DailyReport) => r.operator_id === filters.operator_id);
  }
  if (filters?.status) {
    list = list.filter((r: DailyReport) => r.status === filters.status);
  }
  if (filters?.startDate) {
    list = list.filter((r: DailyReport) => r.report_date >= filters.startDate!);
  }
  if (filters?.endDate) {
    list = list.filter((r: DailyReport) => r.report_date <= filters.endDate!);
  }

  list.sort((a: DailyReport, b: DailyReport) => b.report_date.localeCompare(a.report_date));
  if (filters?.limit) {
    list = list.slice(0, filters.limit);
  }

  return list.map((r: DailyReport) => {
    const van = globalStore.vans.get(r.van_id);
    const operator = globalStore.users.get(r.operator_id);
    return { ...r, van, operator };
  });
}

export async function getAdminDashboardMetrics(forDateStr?: string): Promise<AdminDashboardData> {
  const targetDate = forDateStr || getTodayISTDateString();
  const yesterdayDate = getYesterdayISTDateString(targetDate);
  const last7Days = getLast7DaysIST();
  const monthRange = getCurrentMonthISTRange();

  // Previous 7 days (7 to 13 days prior to targetDate)
  const prev7Days: string[] = [];
  const [ty, tm, td] = targetDate.split('-').map(Number);
  for (let i = 13; i >= 7; i--) {
    const cur = new Date(Date.UTC(ty, tm - 1, td));
    cur.setUTCDate(cur.getUTCDate() - i);
    prev7Days.push(cur.toISOString().split('T')[0]);
  }

  // Earliest date required across today, yesterday, last 7 days, previous 7 days, and current month
  const earliestRequiredDay = prev7Days[0] || last7Days[0] || targetDate;
  const minRequiredDateStr = monthRange.start < earliestRequiredDay
    ? monthRange.start
    : earliestRequiredDay;

  const usePrisma = await checkPrismaConnection();

  // Run Vans and Scoped Reports in PARALLEL with minimal field projection
  const [vans, allReports] = await Promise.all([
    getVans(),
    usePrisma
      ? prisma.dailyReport
          .findMany({
            where: {
              report_date: {
                gte: new Date(minRequiredDateStr),
              },
            },
            select: {
              id: true,
              report_date: true,
              van_id: true,
              operator_id: true,
              petrol_tests: true,
              diesel_tests: true,
              other_tests: true,
              total_tests: true,
              total_collection: true,
              expenses: true,
              net_collection: true,
              status: true,
              submitted_at: true,
            },
            orderBy: { report_date: 'desc' },
          })
          .then((rows) =>
            rows.map((r: any) => ({
              id: r.id,
              report_date: toISTDateString(r.report_date),
              van_id: r.van_id,
              operator_id: r.operator_id,
              petrol_tests: r.petrol_tests,
              diesel_tests: r.diesel_tests,
              other_tests: r.other_tests,
              total_tests: r.total_tests,
              total_collection: Number(r.total_collection),
              expenses: Number(r.expenses),
              net_collection: Number(r.net_collection),
              status: r.status,
              submitted_at: r.submitted_at.toISOString(),
            }))
          )
      : Array.from(globalStore.reports.values())
          .filter((r) => r.report_date >= minRequiredDateStr)
          .map((r) => ({
            id: r.id,
            report_date: r.report_date,
            van_id: r.van_id,
            operator_id: r.operator_id,
            petrol_tests: r.petrol_tests,
            diesel_tests: r.diesel_tests,
            other_tests: r.other_tests,
            total_tests: r.total_tests,
            total_collection: r.total_collection,
            expenses: r.expenses,
            net_collection: r.net_collection,
            status: r.status,
            submitted_at: r.submitted_at,
          })),
  ]);

  // 1. TODAY'S METRICS
  const todayReports = allReports.filter((r) => r.report_date === targetDate);

  let todayTotalCollection = 0;
  let todayTotalExpenses = 0;
  let todayTotalTests = 0;
  let todayPetrol = 0;
  let todayDiesel = 0;
  let todayOther = 0;

  for (const r of todayReports) {
    todayTotalCollection += r.total_collection;
    todayTotalExpenses += r.expenses;
    todayTotalTests += r.total_tests;
    todayPetrol += r.petrol_tests;
    todayDiesel += r.diesel_tests;
    todayOther += r.other_tests;
  }

  // Yesterday comparison
  const yesterdayReports = allReports.filter((r) => r.report_date === yesterdayDate);
  const yesterdayTotalCollection = yesterdayReports.reduce((acc, r) => acc + r.total_collection, 0);
  const vsYesterday = calculatePercentageChange(todayTotalCollection, yesterdayTotalCollection);

  const activeVansCount = vans.filter((v) => v.status === 'ACTIVE').length;
  const submittedCount = todayReports.length;
  const pendingCount = Math.max(0, activeVansCount - submittedCount);

  // 2. VAN PERFORMANCE FOR TODAY
  const vanPerformance = vans.map((van) => {
    const report = todayReports.find((r) => r.van_id === van.id);
    return {
      van_id: van.id,
      van_number: van.van_number,
      registration_number: van.registration_number,
      operator_name: van.operator?.name || 'Unassigned',
      status: van.status,
      report_status: (report ? report.status : 'PENDING') as any,
      collection: report ? report.total_collection : 0,
      tests: report ? report.total_tests : 0,
      expenses: report ? report.expenses : 0,
      net: report ? report.net_collection : 0,
      submitted_at: report ? report.submitted_at : null,
      report_id: report ? report.id : null,
    };
  });

  // 3. WEEKLY OVERVIEW (Last 7 Days)
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const weeklyDays = last7Days.map((dateStr) => {
    const dayReports = allReports.filter((r) => r.report_date === dateStr);
    const dayDate = new Date(`${dateStr}T12:00:00Z`);
    const dayName = daysOfWeek[dayDate.getUTCDay()];

    let collection = 0;
    let expenses = 0;
    let tests = 0;
    let van1Col = 0;
    let van2Col = 0;
    let van3Col = 0;

    for (const r of dayReports) {
      collection += r.total_collection;
      expenses += r.expenses;
      tests += r.total_tests;
      const van = vans.find((v) => v.id === r.van_id);
      if (van?.van_number === 'umamaheswara' || van?.van_number === 'Van 01' || van?.id === 'b0000000-0000-0000-0000-000000000001') van1Col += r.total_collection;
      if (van?.van_number === 'srisai' || van?.van_number === 'Van 02' || van?.id === 'b0000000-0000-0000-0000-000000000002') van2Col += r.total_collection;
      if (van?.van_number === 'srivenkateswara' || van?.van_number === 'sri venkateswara' || van?.van_number === 'Van 03' || van?.id === 'b0000000-0000-0000-0000-000000000003') van3Col += r.total_collection;
    }

    return {
      date: dateStr,
      day_name: dayName,
      total_tests: tests,
      total_collection: roundTo2Decimals(collection),
      expenses: roundTo2Decimals(expenses),
      net_collection: roundTo2Decimals(collection - expenses),
      van_01_collection: roundTo2Decimals(van1Col),
      van_02_collection: roundTo2Decimals(van2Col),
      van_03_collection: roundTo2Decimals(van3Col),
    };
  });

  const weeklyTotalCollection = weeklyDays.reduce((acc, d) => acc + d.total_collection, 0);
  const weeklyTotalTests = weeklyDays.reduce((acc, d) => acc + d.total_tests, 0);
  const weeklyDailyAverage = roundTo2Decimals(weeklyTotalCollection / (weeklyDays.length || 1));

  // Find best day
  let bestDay = weeklyDays[0];
  for (const d of weeklyDays) {
    if (d.total_collection > (bestDay?.total_collection || 0)) {
      bestDay = d;
    }
  }

  // Find best van in the week
  const van1 = vans.find((v) => v.id === 'b0000000-0000-0000-0000-000000000001') || vans[0];
  const van2 = vans.find((v) => v.id === 'b0000000-0000-0000-0000-000000000002') || vans[1];
  const van3 = vans.find((v) => v.id === 'b0000000-0000-0000-0000-000000000003') || vans[2];

  const vanWeeklyTotals: Record<string, number> = {};
  for (const day of weeklyDays) {
    if (van1) vanWeeklyTotals[van1.van_number] = (vanWeeklyTotals[van1.van_number] || 0) + (day.van_01_collection || 0);
    if (van2) vanWeeklyTotals[van2.van_number] = (vanWeeklyTotals[van2.van_number] || 0) + (day.van_02_collection || 0);
    if (van3) vanWeeklyTotals[van3.van_number] = (vanWeeklyTotals[van3.van_number] || 0) + (day.van_03_collection || 0);
  }
  let bestVanName = van1?.van_number || 'umamaheswara';
  let bestVanAmount = 0;
  for (const [vanNum, col] of Object.entries(vanWeeklyTotals)) {
    if (col > bestVanAmount) {
      bestVanAmount = col;
      bestVanName = vanNum;
    }
  }

  // Week ranking
  const vanRanking = vans.map((van) => {
    const col = vanWeeklyTotals[van.van_number] || 0;
    const testsCount = allReports
      .filter((r) => r.van_id === van.id && last7Days.includes(r.report_date))
      .reduce((acc, r) => acc + r.total_tests, 0);
    return {
      van_number: van.van_number,
      collection: roundTo2Decimals(col),
      tests: testsCount,
    };
  })
  .sort((a, b) => b.collection - a.collection)
  .map((item, idx) => ({
    rank: idx + 1,
    ...item,
  }));

  // Week vs previous week comparison (uses pre-calculated prev7Days)
  const prevWeekCollection = allReports
    .filter((r) => prev7Days.includes(r.report_date))
    .reduce((acc, r) => acc + r.total_collection, 0);
  const vsPrevWeek = calculatePercentageChange(weeklyTotalCollection, prevWeekCollection);

  // 4. MONTHLY OVERVIEW (uses pre-calculated monthRange)
  const monthReports = allReports.filter(
    (r) => r.report_date >= monthRange.start && r.report_date <= monthRange.end
  );

  let monthlyCollection = 0;
  let monthlyExpenses = 0;
  let monthlyTests = 0;
  const daysMap = new Map<string, { collection: number; tests: number }>();

  for (const r of monthReports) {
    monthlyCollection += r.total_collection;
    monthlyExpenses += r.expenses;
    monthlyTests += r.total_tests;

    const existing = daysMap.get(r.report_date) || { collection: 0, tests: 0 };
    daysMap.set(r.report_date, {
      collection: existing.collection + r.total_collection,
      tests: existing.tests + r.total_tests,
    });
  }

  const workingDays = daysMap.size || 1;
  const monthlyDailyAverage = roundTo2Decimals(monthlyCollection / workingDays);

  // Month best van
  const monthVanTotals: Record<string, number> = {};
  for (const r of monthReports) {
    const v = vans.find((x) => x.id === r.van_id);
    if (v) {
      monthVanTotals[v.van_number] = (monthVanTotals[v.van_number] || 0) + r.total_collection;
    }
  }
  let monthBestVan = vans[1]?.van_number || 'srisai';
  let monthBestVanCol = 0;
  for (const [vName, col] of Object.entries(monthVanTotals)) {
    if (col > monthBestVanCol) {
      monthBestVanCol = col;
      monthBestVan = vName;
    }
  }

  // Monthly chart data (all days of month up to today)
  const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(
    new Date()
  );
  const monthlyChartData = Array.from(daysMap.entries())
    .map(([date, val]) => ({
      date,
      day: parseInt(date.split('-')[2], 10),
      collection: roundTo2Decimals(val.collection),
      tests: val.tests,
    }))
    .sort((a, b) => a.day - b.day);

  return {
    today: {
      date: targetDate,
      total_collection: roundTo2Decimals(todayTotalCollection),
      total_expenses: roundTo2Decimals(todayTotalExpenses),
      net_collection: roundTo2Decimals(todayTotalCollection - todayTotalExpenses),
      total_tests: todayTotalTests,
      petrol_tests: todayPetrol,
      diesel_tests: todayDiesel,
      other_tests: todayOther,
      active_vans: activeVansCount,
      total_vans: vans.length,
      submitted_reports: submittedCount,
      pending_reports: pendingCount,
      yesterday_collection: roundTo2Decimals(yesterdayTotalCollection),
      vs_yesterday_formatted: vsYesterday.formatted,
      vs_yesterday_is_positive: vsYesterday.isPositive,
    },
    van_performance: vanPerformance,
    weekly: {
      total_collection: roundTo2Decimals(weeklyTotalCollection),
      total_tests: weeklyTotalTests,
      daily_average: weeklyDailyAverage,
      best_day: bestDay
        ? { date: bestDay.date, collection: bestDay.total_collection }
        : undefined,
      best_van: { van_number: bestVanName, collection: roundTo2Decimals(bestVanAmount) },
      vs_previous_week_formatted: vsPrevWeek.formatted,
      vs_previous_week_is_positive: vsPrevWeek.isPositive,
      van_ranking: vanRanking,
      days: weeklyDays,
    },
    monthly: {
      month_name: monthName,
      total_collection: roundTo2Decimals(monthlyCollection),
      total_expenses: roundTo2Decimals(monthlyExpenses),
      net_collection: roundTo2Decimals(monthlyCollection - monthlyExpenses),
      total_tests: monthlyTests,
      working_days: workingDays,
      daily_average: monthlyDailyAverage,
      best_van: { van_number: monthBestVan, collection: roundTo2Decimals(monthBestVanCol) },
      chart_data: monthlyChartData,
    },
  };
}

// ======================== NOTIFICATIONS ========================

export async function createNotification(data: {
  user_id: string;
  title: string;
  message: string;
  type: string;
  metadata?: any;
}): Promise<NotificationItem> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const created = await prisma.notification.create({
      data: {
        user_id: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type,
        metadata: data.metadata ?? {},
      },
    });
    return {
      ...created,
      metadata: created.metadata as any,
      created_at: created.created_at.toISOString(),
      updated_at: created.updated_at.toISOString(),
    };
  }

  const newId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const notif: NotificationItem = {
    id: newId,
    user_id: data.user_id,
    title: data.title,
    message: data.message,
    type: data.type,
    metadata: data.metadata ?? null,
    is_read: false,
    created_at: now,
    updated_at: now,
  };
  globalStore.notifications.set(newId, notif);
  return notif;
}

export async function getNotifications(
  userId: string,
  unreadOnly = false
): Promise<NotificationItem[]> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const where: any = { user_id: userId };
    if (unreadOnly) where.is_read = false;

    const list = await prisma.notification.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: unreadOnly ? 20 : 50,
      select: {
        id: true,
        user_id: true,
        title: true,
        message: true,
        type: true,
        metadata: true,
        is_read: true,
        created_at: true,
        updated_at: true,
      },
    });
    return list.map((n: any) => ({
      ...n,
      metadata: n.metadata as any,
      created_at: n.created_at.toISOString(),
      updated_at: n.updated_at.toISOString(),
    }));
  }

  const list: NotificationItem[] = Array.from(globalStore.notifications.values())
    .filter((n: NotificationItem) => n.user_id === userId && (!unreadOnly || !n.is_read))
    .sort((a: NotificationItem, b: NotificationItem) => b.created_at.localeCompare(a.created_at));
  return list;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    return prisma.notification.count({
      where: { user_id: userId, is_read: false },
    });
  }

  let count = 0;
  for (const notif of globalStore.notifications.values()) {
    if (notif.user_id === userId && !notif.is_read) {
      count++;
    }
  }
  return count;
}

export async function getActiveAdminUsers(): Promise<{ id: string; name: string; email: string }[]> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    return prisma.user.findMany({
      where: { role: 'ADMIN', is_active: true },
      select: { id: true, name: true, email: true },
    });
  }

  return Array.from(globalStore.users.values())
    .filter((u) => u.role === 'ADMIN' && u.is_active)
    .map((u) => ({ id: u.id, name: u.name, email: u.email }));
}

export async function createNotificationsBatch(
  items: Array<{
    user_id: string;
    title: string;
    message: string;
    type: string;
    metadata?: any;
  }>
): Promise<number> {
  if (items.length === 0) return 0;
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const result = await prisma.notification.createMany({
      data: items.map((item) => ({
        user_id: item.user_id,
        title: item.title,
        message: item.message,
        type: item.type,
        metadata: item.metadata ?? {},
      })),
    });
    return result.count;
  }

  for (const item of items) {
    await createNotification(item);
  }
  return items.length;
}

export async function markNotificationRead(id: string, userId: string): Promise<boolean> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    await prisma.notification.updateMany({
      where: { id, user_id: userId },
      data: { is_read: true },
    });
    return true;
  }

  const notif = globalStore.notifications.get(id);
  if (notif && notif.user_id === userId) {
    notif.is_read = true;
    notif.updated_at = new Date().toISOString();
    return true;
  }
  return false;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const result = await prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });
    return result.count;
  }

  let count = 0;
  for (const notif of globalStore.notifications.values()) {
    if (notif.user_id === userId && !notif.is_read) {
      notif.is_read = true;
      notif.updated_at = new Date().toISOString();
      count++;
    }
  }
  return count;
}

// ======================== DEVICE TOKENS ========================

export async function upsertDeviceToken(data: {
  user_id: string;
  token: string;
  platform?: string;
}): Promise<DeviceToken> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const upserted = await prisma.deviceToken.upsert({
      where: { token: data.token },
      update: {
        user_id: data.user_id,
        platform: data.platform || 'web',
      },
      create: {
        user_id: data.user_id,
        token: data.token,
        platform: data.platform || 'web',
      },
    });
    return {
      ...upserted,
      created_at: upserted.created_at.toISOString(),
      updated_at: upserted.updated_at.toISOString(),
    };
  }

  const existing = globalStore.deviceTokens.get(data.token);
  const now = new Date().toISOString();
  if (existing) {
    existing.user_id = data.user_id;
    existing.platform = data.platform || 'web';
    existing.updated_at = now;
    return existing;
  }
  const newToken: DeviceToken = {
    id: `tok-${Date.now()}`,
    user_id: data.user_id,
    token: data.token,
    platform: data.platform || 'web',
    created_at: now,
    updated_at: now,
  };
  globalStore.deviceTokens.set(data.token, newToken);
  return newToken;
}

export async function getAdminDeviceTokens(): Promise<string[]> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const tokens = await prisma.deviceToken.findMany({
      where: {
        user: { role: 'ADMIN', is_active: true },
      },
      select: { token: true },
    });
    return tokens.map((t: any) => t.token);
  }

  const tokens: string[] = [];
  for (const tok of globalStore.deviceTokens.values()) {
    const user = globalStore.users.get(tok.user_id);
    if (user?.role === 'ADMIN' && user.is_active) {
      tokens.push(tok.token);
    }
  }
  return tokens;
}

// ======================== AUDIT LOGS ========================

export async function createAuditLog(data: {
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: any;
  ip_address?: string | null;
}): Promise<AuditLogItem> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const log = await prisma.auditLog.create({
      data: {
        user_id: data.user_id ?? null,
        action: data.action,
        entity_type: data.entity_type,
        entity_id: data.entity_id ?? null,
        metadata: data.metadata ?? {},
        ip_address: data.ip_address ?? null,
      },
    });
    return {
      ...log,
      metadata: log.metadata as any,
      created_at: log.created_at.toISOString(),
    };
  }

  const item: AuditLogItem = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    user_id: data.user_id ?? null,
    action: data.action,
    entity_type: data.entity_type,
    entity_id: data.entity_id ?? null,
    metadata: data.metadata ?? null,
    ip_address: data.ip_address ?? null,
    created_at: new Date().toISOString(),
  };
  globalStore.auditLogs.unshift(item);
  return item;
}

export async function getAuditLogs(limit = 100): Promise<AuditLogItem[]> {
  const usePrisma = await checkPrismaConnection();
  if (usePrisma) {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
    return logs.map((l: any) => ({
      ...l,
      metadata: l.metadata as any,
      created_at: l.created_at.toISOString(),
    }));
  }

  return globalStore.auditLogs.slice(0, limit).map((log: AuditLogItem) => {
    const user = log.user_id ? globalStore.users.get(log.user_id) : null;
    return {
      ...log,
      user: user ? { name: user.name, email: user.email, role: user.role } : null,
    };
  });
}
