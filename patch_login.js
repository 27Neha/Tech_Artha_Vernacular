const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/web/app/login/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix handleLogin
const oldHandleLogin = `const handleLogin = async () => {
    setError('');
    if (loginMethod === 'password') {
      if (!password) { setError('Enter password.'); return; }
      setLoading(true);
      try {
        const res = await fetch(\`\${API_URL}/auth/login-password\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: phone, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Invalid credentials');
        localStorage.setItem('access_token', data.accessToken || data.access_token);
        localStorage.setItem('user_id', data.user?.id ?? '');
        router.push('/dashboard');
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    } else {
      setOtpSent(true);
    }
  };`;

const newHandleLogin = `const handleLogin = async () => {
    setError('');
    if (!/^\\d{10}$/.test(phone)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (loginMethod === 'password') {
      if (!password) { setError('Enter password.'); return; }
      setLoading(true);
      try {
        const res = await fetch(\`\${API_URL}/auth/login-password\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: phone, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Invalid credentials');
        localStorage.setItem('access_token', data.accessToken || data.access_token);
        localStorage.setItem('user_id', data.user?.id ?? '');
        router.push('/dashboard');
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    } else {
      // It's the OTP flow, actually call the API instead of just skipping
      await handleSendOtp('WHATSAPP');
    }
  };`;

content = content.replace(oldHandleLogin, newHandleLogin);

// 2. Fix the disabled property on the button
const oldButton = `<button
              onClick={handleLogin}
              disabled={loading}
              className="btn-primary mt-6"
            >`;
const newButton = `<button
              onClick={handleLogin}
              disabled={loading || phone.length !== 10}
              className="btn-primary mt-6"
            >`;

content = content.replace(oldButton, newButton);

fs.writeFileSync(filePath, content);
console.log('Login page patched successfully.');
