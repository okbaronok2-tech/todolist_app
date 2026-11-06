// scenarios/*.js 앞에 lib.js를 붙여 dist/*.js 로 만든다. 실행: node build.mjs
import fs from 'node:fs';
import path from 'node:path';
const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const lib = fs.readFileSync(path.join(dir, 'lib.js'), 'utf8');
for (const f of fs.readdirSync(path.join(dir, 'scenarios')).filter((f) => f.endsWith('.js'))) {
  const body = fs.readFileSync(path.join(dir, 'scenarios', f), 'utf8');
  fs.writeFileSync(path.join(dir, 'dist', f), `async (page) => {\n${lib}\n${body}\nreturn done();\n}\n`);
}
console.log('built');
