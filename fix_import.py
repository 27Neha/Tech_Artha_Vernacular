import re

filepath = 'apps/web/app/risk/page.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("import { useState } from 'react';", "import { useState, useEffect } from 'react';")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)
