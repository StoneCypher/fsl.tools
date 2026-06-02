
const fs = require('fs');
const cp = require('child_process');

const hash = cp.execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
const pkg  = JSON.parse(fs.readFileSync('package.json'));

fs.writeFileSync('./src/ts/generated_code/version.ts', `
const version    : string = "${pkg.version}",
      build_hash : string = "${hash}",
      build_time : number = ${new Date().getTime()};

export { version, build_time };
`);
