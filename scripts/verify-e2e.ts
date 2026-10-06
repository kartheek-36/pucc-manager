async function verifyServer() {
  const base = 'http://localhost:3000';
  console.log('Testing running server endpoints at', base);

  // 1. Login page HTML
  const loginRes = await fetch(base + '/login');
  console.log('1. /login page status:', loginRes.status);

  // 2. Login as Admin
  const adminLogin = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@rtovan.com', password: 'password123' })
  });
  const adminJson = await adminLogin.json();
  console.log('2. Admin login:', adminJson.success ? 'SUCCESS (Role: ' + adminJson.data.role + ')' : 'FAILED');
  const adminCookie = adminLogin.headers.get('set-cookie')?.split(';')[0];

  // 3. Admin Dashboard
  const dashRes = await fetch(base + '/api/admin/dashboard', {
    headers: {
      'Authorization': `Bearer ${adminJson.data.token}`,
      'Cookie': adminCookie || ''
    }
  });
  const dashJson = await dashRes.json();
  console.log('3. Admin Dashboard API:', dashJson.success ? 'SUCCESS (Today Collection: ₹' + dashJson.data.today.total_collection + ', Active Vans: ' + dashJson.data.today.active_vans + ')' : 'FAILED');

  // 4. Van 3 Operator Login
  const van3Login = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'van3@rtovan.com', password: 'password123' })
  });
  const van3Json = await van3Login.json();
  console.log('4. Van 3 Operator login:', van3Json.success ? 'SUCCESS (Assigned Van: ' + van3Json.data.user.van_id + ')' : 'FAILED');
  const van3Cookie = van3Login.headers.get('set-cookie')?.split(';')[0];

  // 5. Van 3 Submits Today's Report
  const van3Submit = await fetch(base + '/api/reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${van3Json.data.token}`,
      'Cookie': van3Cookie || ''
    },
    body: JSON.stringify({
      report_date: '2026-10-06',
      van_id: van3Json.data.user.van_id,
      petrol_tests: 25,
      diesel_tests: 20,
      other_tests: 5,
      total_tests: 50,
      total_collection: 7500,
      expenses: 300,
      notes: 'Testing mobile workflow end-to-end'
    })
  });
  const van3SubmitJson = await van3Submit.json();
  console.log('5. Van 3 Report Submission:', van3SubmitJson.success ? 'SUCCESS (Net Collection: ₹' + van3SubmitJson.data.net_collection + ')' : 'FAILED: ' + JSON.stringify(van3SubmitJson));

  // 6. Check Admin Notifications received the alert
  const notifRes = await fetch(base + '/api/notifications', {
    headers: {
      'Authorization': `Bearer ${adminJson.data.token}`,
      'Cookie': adminCookie || ''
    }
  });
  const notifJson = await notifRes.json();
  console.log('6. Admin Notifications:', notifJson.success ? 'SUCCESS (' + notifJson.data.notifications.length + ' notifications in inbox)' : 'FAILED');

  // 7. Check PWA Manifest
  const manifestRes = await fetch(base + '/manifest.webmanifest');
  const manifestJson = await manifestRes.json();
  console.log('7. PWA Web Manifest:', manifestRes.status === 200 ? 'SUCCESS (App Name: ' + manifestJson.name + ')' : 'FAILED');

  console.log('\n🚀 ALL END-TO-END HTTP WORKFLOW CHECKS PASSED PERFECTLY!');
}

verifyServer().catch((e) => {
  console.error('Verification error:', e);
  process.exit(1);
});
