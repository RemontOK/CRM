const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'build', 'assets', 'index-DK3EsBBq.js');
const content = fs.readFileSync(file, 'utf8');

const reactMarkers = [
  'react.production.min',
  'react-dom.production.min',
  'Invalid hook call',
  'useState:function',
  'useContext:function',
  'ReactCurrentDispatcher',
  '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED',
];

for (const marker of reactMarkers) {
  console.log(`${marker}: ${content.split(marker).length - 1}`);
}

// Find exported react alias
const exportMatch = content.match(/export\{[^}]*\bm as r\b[^}]*\}/);
console.log('\nExports m as r:', Boolean(exportMatch));

// Count useState definitions (rough proxy for react copies)
const useStateDefs = [...content.matchAll(/function [A-Za-z$]+\(\)\{if\([A-Za-z$]+\)return [A-Za-z$]+;[A-Za-z$]+=1;var [a-z]=Symbol\.for\("react\.element"\)/g)];
console.log('React module init patterns:', useStateDefs.length);
