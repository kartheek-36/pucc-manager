import { PrismaClient, Role, VanStatus, ReportStatus } from '@prisma/client';
import { calculateNetCollection, calculateTotalTests } from '../lib/calculations/financial';

const prisma = new PrismaClient();

export async function main() {
  console.log('🌱 Starting database seed for RTO Pollution Van Manager...');

  // Clean existing records if any
  try {
    await prisma.auditLog.deleteMany({});
    await prisma.deviceToken.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.dailyReport.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.van.deleteMany({});
  } catch (e) {
    console.log('Initial cleanup skipped or tables not yet populated.');
  }

  // 1. Create Admin User
  const adminUser = await prisma.user.create({
    data: {
      id: 'a0000000-0000-0000-0000-000000000001',
      firebase_uid: 'firebase_admin_uid_01',
      name: 'Venkateswara Rao (Admin)',
      email: 'admin@rtovan.com',
      phone: '7013669423',
      role: Role.ADMIN,
      is_active: true,
    },
  });
  console.log(`✓ Created Admin: ${adminUser.email}`);

  // 2. Create Vans & Van Operators
  const vanConfigs = [
    {
      vanId: 'b0000000-0000-0000-0000-000000000001',
      vanNumber: 'Van 01',
      regNumber: 'MH-12-PUC-1001',
      operatorId: 'c0000000-0000-0000-0000-000000000001',
      operatorEmail: 'van1@rtovan.com',
      operatorName: 'umamaheswarapucc',
      operatorPhone: '9951537362',
      firebaseUid: 'firebase_van1_uid',
    },
    {
      vanId: 'b0000000-0000-0000-0000-000000000002',
      vanNumber: 'Van 02',
      regNumber: 'MH-12-PUC-1002',
      operatorId: 'c0000000-0000-0000-0000-000000000002',
      operatorEmail: 'van2@rtovan.com',
      operatorName: 'srisaipucc',
      operatorPhone: '9951536848',
      firebaseUid: 'firebase_van2_uid',
    },
    {
      vanId: 'b0000000-0000-0000-0000-000000000003',
      vanNumber: 'Van 03',
      regNumber: 'MH-12-PUC-1003',
      operatorId: 'c0000000-0000-0000-0000-000000000003',
      operatorEmail: 'van3@rtovan.com',
      operatorName: 'srivenkateswarapucc',
      operatorPhone: '9951537681',
      firebaseUid: 'firebase_van3_uid',
    },
  ];

  const createdVans = [];
  const createdOperators = [];

  for (const vc of vanConfigs) {
    // Create Van first
    const van = await prisma.van.create({
      data: {
        id: vc.vanId,
        van_number: vc.vanNumber,
        registration_number: vc.regNumber,
        status: VanStatus.ACTIVE,
      },
    });

    // Create Operator with van_id
    const operator = await prisma.user.create({
      data: {
        id: vc.operatorId,
        firebase_uid: vc.firebaseUid,
        name: vc.operatorName,
        email: vc.operatorEmail,
        phone: vc.operatorPhone,
        role: Role.VAN_OPERATOR,
        van_id: van.id,
        is_active: true,
      },
    });

    // Link van operator_id back
    await prisma.van.update({
      where: { id: van.id },
      data: { operator_id: operator.id },
    });

    createdVans.push(van);
    createdOperators.push(operator);
    console.log(`✓ Created ${van.van_number} (${van.registration_number}) assigned to ${operator.email}`);
  }

  // 3. Clean slate for production deployment: 0 dummy reports, 0 dummy notifications
  console.log('✓ Clean slate: 0 dummy reports, 0 dummy notifications.');

  // 4. Initial audit log
  await prisma.auditLog.create({
    data: {
      user_id: adminUser.id,
      action: 'SYSTEM_INITIALIZED',
      entity_type: 'System',
      metadata: { initializedVans: 3, environment: 'production-ready' },
      ip_address: '127.0.0.1',
    },
  });

  console.log('✅ Clean production database initialization finished successfully.');
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('Seed error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
