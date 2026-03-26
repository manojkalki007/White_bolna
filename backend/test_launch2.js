const csvContent = "phoneNumber,name\n+916366178778,Test User 2\n";

async function test() {
  const form = new FormData();
  form.append('name', 'Test Campaign Built');
  form.append('agentId', 'test-agent-id');
  form.append('organizationId', 'org_default');
  form.append('createdById', 'user_default');
  form.append('contacts', new Blob([csvContent], { type: 'text/csv' }), 'test_contacts.csv');

  try {
    const res = await fetch('http://localhost:4000/api/campaigns/launch', {
      method: 'POST',
      body: form
    });
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${await res.text()}`);
  } catch (err) {
    console.error(err);
  }
}
test();
