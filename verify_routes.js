const fs = require('fs');
const login = fs.readFileSync('apps/web/app/login/page.tsx', 'utf8');
const signup = fs.readFileSync('apps/web/app/signup/page.tsx', 'utf8');

const extractRoutes = (code) => {
    const matches = code.matchAll(/router\.push\(['"]([^'"]+)['"]\)/g);
    return [...matches].map(m => m[1]);
};

console.log('Login routes:', extractRoutes(login));
console.log('Signup routes:', extractRoutes(signup));
