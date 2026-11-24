const fs = require('fs');
let code = fs.readFileSync('services/api/src/modules/auth/auth.controller.ts', 'utf8');

code = code.replace(
  /@UseGuards\(AccessTokenGuard\)\s*@Put\('profile'\)\s*@Put\('password'\)\s*@UseGuards\(AccessTokenGuard\)/g,
  "@Put('password')\n  @UseGuards(AccessTokenGuard)"
);

code = code.replace(
  /async updateProfile\(/,
  "@Put('profile')\n  @UseGuards(AccessTokenGuard)\n  async updateProfile("
);

fs.writeFileSync('services/api/src/modules/auth/auth.controller.ts', code);
console.log('Fixed decorators in auth.controller.ts!');
