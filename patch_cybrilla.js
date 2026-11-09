const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'services/api/src/modules/cybrilla/cybrilla.service.ts');
let content = fs.readFileSync(filePath, 'utf8');

const newMethods = `
  async getKycRequest(id: string) {
    await this.ensureAuthenticated();
    const tenantId = process.env.CYBRILLA_TENANT_ID;
    try {
      const response = await axios.get(\`\${this.baseUrl}/v2/kyc_requests/\${id}\`, {
        headers: {
          Authorization: \`Bearer \${this.accessToken}\`,
          'x-tenant-id': tenantId,
        },
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(\`Failed to fetch KYC request \${id}\`);
      throw error;
    }
  }

  async generateDigilockerUrl(id: string, redirectUrl: string) {
    await this.ensureAuthenticated();
    const tenantId = process.env.CYBRILLA_TENANT_ID;
    try {
      const response = await axios.post(
        \`\${this.baseUrl}/v2/kyc_requests/\${id}/digilocker\`,
        { redirect_url: redirectUrl },
        {
          headers: {
            Authorization: \`Bearer \${this.accessToken}\`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(\`Failed to generate Digilocker URL for \${id}\`);
      throw error;
    }
  }

  async generateEsignUrl(id: string, redirectUrl: string) {
    await this.ensureAuthenticated();
    const tenantId = process.env.CYBRILLA_TENANT_ID;
    try {
      const response = await axios.post(
        \`\${this.baseUrl}/v2/kyc_requests/\${id}/esign\`,
        { redirect_url: redirectUrl },
        {
          headers: {
            Authorization: \`Bearer \${this.accessToken}\`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(\`Failed to generate E-Sign URL for \${id}\`);
      throw error;
    }
  }
`;

// Insert before the last closing brace of the class
const insertionPoint = content.lastIndexOf('}');
if (insertionPoint > -1) {
  content = content.slice(0, insertionPoint) + newMethods + content.slice(insertionPoint);
  fs.writeFileSync(filePath, content);
  console.log('cybrilla.service.ts patched successfully.');
} else {
  console.log('Could not find the end of the class.');
}
