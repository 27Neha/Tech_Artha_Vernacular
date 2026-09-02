const fs = require('fs');
const signupPath = 'apps/web/app/signup/page.tsx';
let content = fs.readFileSync(signupPath, 'utf8');

// Remove the SMS/WhatsApp toggle buttons
const channelButtonsRegex = /<div className="flex gap-4 mt-6">[\s\S]*?<\/button>\s*<\/div>/g;
content = content.replace(channelButtonsRegex, '');

// Change the Continue button text to explicitly mention WhatsApp OTP
const continueButtonRegex = /<button onClick=\{handleSendSignupOtp\} disabled=\{loading\} className="btn-primary mt-6">[\s\S]*?<span>\{loading \? 'Sending\.\.\.' : 'Continue'\}<\/span>[\s\S]*?<\/button>/g;
content = content.replace(continueButtonRegex, 
  `<button onClick={handleSendSignupOtp} disabled={loading} className="btn-primary mt-6 bg-[#25D366] hover:bg-[#128C7E] border-none shadow-lg shadow-[#25d366]/30">
              <span>{loading ? 'Sending OTP...' : 'Verify via WhatsApp'}</span><span>📱</span>
            </button>`);

// Hardcode the channel sent to backend to 'WHATSAPP'
const fetchBodyRegex = /body: JSON\.stringify\(\{ mobile, channel: otpChannel \}\)/g;
content = content.replace(fetchBodyRegex, "body: JSON.stringify({ mobile, channel: 'WHATSAPP' })");

fs.writeFileSync(signupPath, content);
console.log('Removed channel toggles and updated button to WhatsApp.');
