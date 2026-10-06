const BASE_URL = 'http://localhost:3000';


let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runE2ETests() {
  console.log('\n======================================================');
  console.log('🚀 LIVE HTTP API & END-TO-END FLOW VERIFICATION');
  console.log('======================================================\n');

  // STEP 1: Login as Van 01 Operator
  console.log('▶ 1. Van 01 Operator Login & Session');
  let operatorCookie = '';
  let operatorUser: any = null;
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'van1@rtovan.com',
        password: 'password123',
      }),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      operatorCookie = setCookie.split(';')[0];
    }
    const json: any = await res.json();
    assert(json.success === true, 'Operator login returned success: true');
    assert(json.data.user.role === 'VAN_OPERATOR', 'Logged in user has VAN_OPERATOR role');
    assert(json.data.user.van_id !== null, 'Operator has an assigned van_id');
    operatorUser = json.data.user;
  }

  // STEP 2: Van Operator accesses /api/reports/today
  console.log('\n▶ 2. Van Operator opens Submit Daily Report Option');
  let todayReport: any = null;
  {
    const res = await fetch(`${BASE_URL}/api/reports/today?van_id=${operatorUser.van_id}`, {
      headers: { Cookie: operatorCookie },
    });
    const json: any = await res.json();
    assert(json.success === true, 'Fetched today\'s report status successfully');
    assert(json.data.van !== null, 'Van object returned with registration details');
    todayReport = json.data.report;
  }

  // STEP 3: Van Operator submits / updates Daily Report with new options
  console.log('\n▶ 3. Van Operator submits or updates Daily Report');
  {
    const updatedPetrol = 25;
    const updatedDiesel = 15;
    const updatedOther = 3;
    const newTotalCollection = 8500;
    const newExpenses = 250;

    const endpoint = todayReport ? `${BASE_URL}/api/reports/${todayReport.id}` : `${BASE_URL}/api/reports`;
    const method = todayReport ? 'PATCH' : 'POST';
    const payload: any = {
      petrol_tests: updatedPetrol,
      diesel_tests: updatedDiesel,
      other_tests: updatedOther,
      total_tests: updatedPetrol + updatedDiesel + updatedOther,
      total_collection: newTotalCollection,
      expenses: newExpenses,
      notes: 'Submitted via options stepper',
    };

    if (!todayReport) {
      payload.van_id = operatorUser.van_id;
      payload.report_date = new Date().toISOString().split('T')[0];
    }

    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Cookie: operatorCookie,
      },
      body: JSON.stringify(payload),
    });
    const json: any = await res.json();
    assert(json.success === true, `Report saved successfully via ${method}`);

    assert(json.data.petrol_tests === updatedPetrol, 'Updated petrol tests count saved');
    assert(json.data.total_collection === newTotalCollection, 'Updated collection saved');
    assert(json.data.expenses === newExpenses, 'Updated expenses saved');
    assert(json.data.net_collection === newTotalCollection - newExpenses, 'Net collection calculated correctly (8250)');
  }


  // STEP 4: Login as Head Admin
  console.log('\n▶ 4. Head Admin Login');
  let adminCookie = '';
  {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@rtovan.com',
        password: '7013669423@p',
      }),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      adminCookie = setCookie.split(';')[0];
    }
    const json: any = await res.json();
    assert(json.success === true, 'Admin login returned success: true');
    assert(json.data.user.role === 'ADMIN', 'Logged in user has ADMIN role');
  }

  // STEP 5: Admin checks Users and Fleet sync
  console.log('\n▶ 5. Admin queries Users & Fleet');
  let allUsers: any[] = [];
  let allVans: any[] = [];
  {
    const [uRes, vRes] = await Promise.all([
      fetch(`${BASE_URL}/api/admin/users`, { headers: { Cookie: adminCookie } }),
      fetch(`${BASE_URL}/api/admin/vans`, { headers: { Cookie: adminCookie } }),
    ]);
    const uJson: any = await uRes.json();
    const vJson: any = await vRes.json();
    assert(uJson.success === true, 'Admin fetched all users');
    assert(vJson.success === true, 'Admin fetched all vans');
    allUsers = uJson.data;
    allVans = vJson.data;
    assert(allUsers.length >= 4, 'At least 4 users (1 Admin + 3 Operators)');
    assert(allVans.length === 3, 'Fleet consists of 3 vans');
  }

  // STEP 6: Admin creates a new operator and assigns Van 03
  console.log('\n▶ 6. Admin creates new operator with assigned van');
  let createdOperatorId = '';
  {
    const van3 = allVans.find((v) => v.van_number === 'Van 03');
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        name: 'Kiran More (Operator)',
        email: `kiran_${Date.now()}@rtovan.com`,
        phone: '+91 98220 55555',
        role: 'VAN_OPERATOR',
        van_id: van3.id,
      }),
    });
    const json: any = await res.json();
    assert(json.success === true, 'New operator created via POST /api/admin/users');
    assert(json.data.van_id === van3.id, 'New operator van_id is synced to Van 03');
    createdOperatorId = json.data.id;

    // Verify van 03 now reflects this operator in fleet list
    const vCheckRes = await fetch(`${BASE_URL}/api/admin/vans`, { headers: { Cookie: adminCookie } });
    const vCheckJson: any = await vCheckRes.json();
    const checkVan3 = vCheckJson.data.find((v: any) => v.id === van3.id);
    assert(checkVan3.operator !== null && checkVan3.operator.id === createdOperatorId, 'Van 03 operator is bidirectionally synced in fleet query');
  }

  // STEP 7: Admin reassigns operator to Van 02
  console.log('\n▶ 7. Admin updates operator van assignment via PUT');
  {
    const van2 = allVans.find((v) => v.van_number === 'Van 02');
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        id: createdOperatorId,
        name: 'Kiran More (Senior Operator)',
        phone: '+91 98220 66666',
        is_active: true,
        van_id: van2.id,
      }),
    });
    const json: any = await res.json();
    assert(json.success === true, 'Operator updated via PUT /api/admin/users');
    assert(json.data.van_id === van2.id, 'Operator reassigned to Van 02');

    // Verify Van 02 in fleet now has this operator
    const vCheckRes = await fetch(`${BASE_URL}/api/admin/vans`, { headers: { Cookie: adminCookie } });
    const vCheckJson: any = await vCheckRes.json();
    const checkVan2 = vCheckJson.data.find((v: any) => v.id === van2.id);
    assert(checkVan2.operator !== null && checkVan2.operator.id === createdOperatorId, 'Van 02 operator bidirectionally synced to reassigned operator');
  }

  // STEP 8: Admin checks Dashboard for live updated submission data
  console.log('\n▶ 8. Admin Dashboard reflects live operator submission');
  {
    const res = await fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: { Cookie: adminCookie },
    });
    const json: any = await res.json();
    assert(json.success === true, 'Admin dashboard query succeeded');
    assert(typeof json.data.today.total_collection === 'number', 'Dashboard total collection is live and valid');
    assert(json.data.today.total_collection >= 8500, 'Dashboard total collection includes updated operator report (>= 8500)');
  }

  console.log('\n======================================================');
  console.log(`🎉 ALL ${passedTests} / ${totalTests} END-TO-END TESTS PASSED!`);
  console.log('======================================================\n');
}

runE2ETests().catch((e) => {
  console.error('E2E test failed:', e);
  process.exit(1);
});
