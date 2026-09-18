const fs = require('fs');
let code = fs.readFileSync('apps/web/app/kyc/page.tsx', 'utf8');

if (!code.includes('useEffect')) {
  code = code.replace("import { useState } from 'react';", "import { useState, useEffect } from 'react';");
}

const useEffectHook = `
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setCheckingStatus(false);
          return;
        }
        const res = await fetch(\`\${API_URL}/api/v1/kyc/status\`, {
          headers: { 'Authorization': \`Bearer \${token}\` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.status) {
            setExistingStatus(data.status);
            if (data.status === 'VERIFIED' || data.status === 'IN_PROGRESS') {
              router.push('/profile-setup');
              return;
            }
          }
        }
      } catch (e) {
        console.error('Failed to check KYC status', e);
      }
      setCheckingStatus(false);
    };
    checkStatus();
  }, [router]);

  if (checkingStatus) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div></div>;
  }
`;

if (!code.includes('setCheckingStatus(true)')) {
  code = code.replace(
    "const [error, setError] = useState('');",
    "const [error, setError] = useState('');\n" + useEffectHook
  );
  fs.writeFileSync('apps/web/app/kyc/page.tsx', code);
  console.log('Updated kyc page with useEffect');
}
