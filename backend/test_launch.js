const FormData = require('form-data');
const fs = require('fs');
const http = require('http');

const csvContent = "phoneNumber,name\n+916366178778,User Test\n";
const csvPath = require('path').join(__dirname, 'test_contacts.csv');
fs.writeFileSync(csvPath, csvContent, 'utf8');

const form = new FormData();
form.append('name', 'Test Campaign Built');
form.append('agentId', 'test-agent-id');
form.append('organizationId', 'org_default');
form.append('createdById', 'user_default');
form.append('contacts', fs.createReadStream(csvPath), {
  filename: 'test_contacts.csv',
  contentType: 'text/csv'
});

const req = http.request({
  hostname: 'localhost',
  port: 4000,
  path: '/api/campaigns/launch',
  method: 'POST',
  headers: form.getHeaders()
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${body}`);
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

form.pipe(req);
