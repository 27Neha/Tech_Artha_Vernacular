const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'services/api/src/integrations/interakt/interakt.service.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "this.logger.error(`Failed to send Interakt WhatsApp message. Status: ${status}`);",
  "this.logger.error(`Failed to send Interakt WhatsApp message. Status: ${status}. Data: ${JSON.stringify(error?.response?.data || error.message)}`);"
);

fs.writeFileSync(filePath, content);
console.log('interakt.service.ts patched successfully.');
