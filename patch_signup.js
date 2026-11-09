const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/web/app/signup/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  `const [panVerified, setPanVerified] = useState<'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED'>('PENDING');`,
  `const [panVerified, setPanVerified] = useState<'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'DIGILOCKER_REQUIRED' | 'ESIGN_REQUIRED'>('PENDING');`
);

content = content.replace(
  `if (data.status === 'VERIFIED') { setPanVerified('SUCCESS'); } else { setPanVerified('FAILED'); }`,
  `if (data.status === 'VERIFIED') {
          setPanVerified('SUCCESS');
        } else if (data.status === 'PENDING' && data.fields_needed?.includes('aadhaar')) {
          setPanVerified('DIGILOCKER_REQUIRED');
        } else if (data.status === 'ESIGN_REQUIRED') {
          setPanVerified('ESIGN_REQUIRED');
        } else {
          setPanVerified('FAILED');
        }`
);

const oldButtons = `{panVerified === 'IN_PROGRESS' && <span className="text-gray-500 font-bold text-sm">⏳ Verifying...</span>}
                    {panVerified === 'SUCCESS' && <span className="text-green-500 font-bold">✅ Verified</span>}
                    {panVerified === 'FAILED' && <span className="text-red-500 font-bold">❌ Failed</span>}`;

const newButtons = `{panVerified === 'IN_PROGRESS' && <span className="text-gray-500 font-bold text-sm">⏳ Verifying...</span>}
                    {panVerified === 'SUCCESS' && <span className="text-green-500 font-bold">✅ Verified</span>}
                    {panVerified === 'FAILED' && <span className="text-red-500 font-bold">❌ Failed</span>}
                    {panVerified === 'DIGILOCKER_REQUIRED' && (
                      <button onClick={() => router.push('/kyc/digilocker')} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm">
                        Verify with DigiLocker
                      </button>
                    )}
                    {panVerified === 'ESIGN_REQUIRED' && (
                      <button onClick={() => router.push('/kyc/esign')} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm">
                        Complete E-Sign
                      </button>
                    )}`;

content = content.replace(oldButtons, newButtons);

const oldContinueBtn = `{panVerified === 'SUCCESS' ? 'Complete Onboarding' : 'KYC Pending'}`;
const newContinueBtn = `{panVerified === 'SUCCESS' ? 'Complete Onboarding' : (panVerified === 'DIGILOCKER_REQUIRED' ? 'DigiLocker Required' : (panVerified === 'ESIGN_REQUIRED' ? 'E-Sign Required' : 'KYC Pending'))}`;

content = content.replace(oldContinueBtn, newContinueBtn);

fs.writeFileSync(filePath, content);
console.log("Patched signup page successfully");
