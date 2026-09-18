const fs = require('fs');
let code = fs.readFileSync('services/api/src/modules/cybrilla/cybrilla.controller.ts', 'utf8');
code = code.replace(/<<<<<<< HEAD([\s\S]*?)=======([\s\S]*?)>>>>>>> [^\n]+\n/g, () => {
  return "import { Controller, Post, Get, Body, Param, BadRequestException, UseGuards } from '@nestjs/common';\nimport { AccessTokenGuard } from '../../common/auth';\n";
});
fs.writeFileSync('services/api/src/modules/cybrilla/cybrilla.controller.ts', code, 'utf8');
