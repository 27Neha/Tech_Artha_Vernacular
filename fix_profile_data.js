const fs = require('fs');

function fixEditProfile() {
  let content = fs.readFileSync('apps/web/app/dashboard/profile/edit/page.tsx', 'utf8');
  
  if (!content.includes('kycStatus')) {
    content = content.replace('const [loading, setLoading] = useState(true);', 
      'const [loading, setLoading] = useState(true);\n  const [kycStatus, setKycStatus] = useState("Pending");');
  }

  content = content.replace(
    /setName\(data\.profile\?\.fullName \|\| ''\);/,
    "setName(data.profile?.fullName || data.fpInvestorProfile?.name || '');"
  );

  content = content.replace(
    /setAddress\(data\.profile\?\.investorType \|\| ''\);/,
    `setAddress(data.profile?.investorType || '');
          try {
            const kycRes = await fetch(\`\${API_URL}/kyc/status\`, { headers: { 'Authorization': \`Bearer \${token}\` } });
            if (kycRes.ok) {
              const kycData = await kycRes.json();
              setKycStatus(kycData.status || 'Pending');
            }
          } catch(e) {}`
  );

  content = content.replace(
    /<div className="bg-green-50 p-4 rounded-xl border border-green-200 mt-6 flex justify-between items-center">[\s\S]*?<\/div>/,
    `{kycStatus === 'VERIFIED' ? (
        <div className="bg-green-50 p-4 rounded-xl border border-green-200 mt-6 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-green-800">KYC Status</p>
            <p className="text-xs text-green-700">Verified</p>
          </div>
          <span className="text-green-600 font-bold bg-green-100 rounded-full w-6 h-6 flex items-center justify-center">✓</span>
        </div>
      ) : (
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mt-6 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-amber-800">KYC Status</p>
            <p className="text-xs text-amber-700">{kycStatus}</p>
          </div>
          <span className="text-amber-600 font-bold bg-amber-100 rounded-full w-6 h-6 flex items-center justify-center">!</span>
        </div>
      )}`
  );

  fs.writeFileSync('apps/web/app/dashboard/profile/edit/page.tsx', content, 'utf8');
}

function fixProfile() {
  let content = fs.readFileSync('apps/web/app/dashboard/profile/page.tsx', 'utf8');
  
  if (!content.includes('kycStatus')) {
    content = content.replace('const [mobile, setMobile] = useState(\'\');',
      'const [mobile, setMobile] = useState(\'\');\n  const [kycStatus, setKycStatus] = useState("Pending");');
  }

  content = content.replace(
    /setName\(data\.profile\?\.fullName \|\| ''\);/,
    "setName(data.profile?.fullName || data.fpInvestorProfile?.name || 'User');"
  );

  content = content.replace(
    /const pId = data\.fpInvestorProfile\?\.fpProfileId \|\| null;/,
    `const pId = data.fpInvestorProfile?.fpProfileId || null;
            try {
              const kycRes = await fetch(\`\${API_URL}/kyc/status\`, { headers: { 'Authorization': \`Bearer \${token}\` } });
              if (kycRes.ok) {
                const kycData = await kycRes.json();
                setKycStatus(kycData.status || 'Pending');
              }
            } catch(e) {}`
  );

  content = content.replace(
    /<span className="bg-amber-50 border border-amber-100 text-amber-600 text-\[9px\] font-bold px-2 py-0\.5 rounded-md uppercase tracking-wider">KYC Pending<\/span>/,
    `{kycStatus === 'VERIFIED' ? (
            <span className="bg-green-50 border border-green-100 text-green-600 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">KYC Verified</span>
          ) : (
            <span className="bg-amber-50 border border-amber-100 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">KYC {kycStatus}</span>
          )}`
  );

  fs.writeFileSync('apps/web/app/dashboard/profile/page.tsx', content, 'utf8');
}

function fixGlobalHeader() {
  let content = fs.readFileSync('apps/web/app/GlobalHeader.tsx', 'utf8');

  // Add state if needed
  if (!content.includes('const [name, setName] = useState(\'\');')) {
    content = content.replace('const router = useRouter();',
      `const router = useRouter();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [kycStatus, setKycStatus] = useState('Pending');`);
  }

  // Add fetchProfile useEffect
  if (!content.includes('fetchProfile')) {
    content = content.replace('return (',
      `useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
        const res = await fetch(\`\${API_URL}/auth/me\`, { headers: { 'Authorization': \`Bearer \${token}\` } });
        if (res.ok) {
          const data = await res.json();
          setName(data.profile?.fullName || data.fpInvestorProfile?.name || 'User');
          setMobile(data.mobile || '');
        }
        const kycRes = await fetch(\`\${API_URL}/kyc/status\`, { headers: { 'Authorization': \`Bearer \${token}\` } });
        if (kycRes.ok) {
          const kycData = await kycRes.json();
          setKycStatus(kycData.status || 'Pending');
        }
      } catch(e) {}
    };
    fetchProfile();
  }, []);

  return (`);
  }

  // Replace dummy Priya Sharma inside menu dropdown
  content = content.replace(
    /<p className="text-sm font-extrabold text-\[var\(--dark\)\]">.*?<\/p>\s*<p className="text-xs text-gray-500">.*?<\/p>\s*<span className="inline-block mt-1 bg-green-50 text-green-600 text-\[9px\] font-bold px-1\.5 py-0\.5 rounded uppercase tracking-wider border border-green-100">KYC Verified<\/span>/,
    `<p className="text-sm font-extrabold text-[var(--dark)]">{name}</p>
                  <p className="text-xs text-gray-500">{mobile}</p>
                  <span className={\`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border \${kycStatus === 'VERIFIED' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'}\`}>KYC {kycStatus}</span>`
  );

  fs.writeFileSync('apps/web/app/GlobalHeader.tsx', content, 'utf8');
}

fixEditProfile();
fixProfile();
fixGlobalHeader();
