const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/web/app/dashboard/profile/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state variable
content = content.replace(
  `const [expanded, setExpanded] = useState<string | null>(null);`,
  `const [expanded, setExpanded] = useState<string | null>(null);\n  const [riskProfile, setRiskProfile] = useState<string | null>(null);`
);

// 2. Add useEffect loading
content = content.replace(
  `setMobile(localStorage.getItem('mobile') || '+91 98765 43210');`,
  `setMobile(localStorage.getItem('mobile') || '+91 98765 43210');\n    setRiskProfile(localStorage.getItem('investorProfile'));`
);

// 3. Add Risk Profile UI section
const riskProfileSection = `
        {/* RISK PROFILE */}
        <div className={\`bg-white rounded-2xl border \${expanded === 'Risk Profile' ? 'border-[var(--primary)]' : 'border-gray-100'} transition-all shadow-sm overflow-hidden\`}>
          <button onClick={() => toggleExpand('Risk Profile')} className="w-full p-4 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-xl shrink-0">🎯</div>
            <div className="flex-1">
              <p className="font-bold text-[var(--dark)] text-sm">Risk Profile</p>
              <p className="text-gray-400 text-xs mt-0.5">View and manage your risk assessment</p>
            </div>
            <span className={\`text-gray-300 text-xl transition-transform \${expanded === 'Risk Profile' ? 'rotate-90' : ''}\`}>›</span>
          </button>
          {expanded === 'Risk Profile' && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-50">
               <div className="flex flex-col gap-3">
                 <div className="p-4 border border-gray-100 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">Your Investment Profile</p>
                    <p className="text-sm font-bold text-[var(--dark)] uppercase">{riskProfile || 'Not Assessed Yet'}</p>
                 </div>
                 <button onClick={() => router.push('/risk')} className="w-full text-xs font-bold text-[var(--primary)] bg-[var(--primary-light)] py-3 rounded-xl border border-[var(--primary)]/20 hover:bg-[var(--primary)] hover:text-white transition-all">
                    {riskProfile ? 'Retake Risk Assessment' : 'Take Risk Assessment'}
                 </button>
               </div>
            </div>
          )}
        </div>
`;

// Insert it right before the version text footer
content = content.replace(
  `<p className="text-xs text-gray-300 text-center mt-6">TechArtha v1.0.0`,
  riskProfileSection + `\n        <p className="text-xs text-gray-300 text-center mt-6">TechArtha v1.0.0`
);

fs.writeFileSync(filePath, content);
console.log("Patched profile page successfully");
