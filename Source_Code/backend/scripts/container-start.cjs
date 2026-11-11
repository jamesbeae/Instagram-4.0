const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, ['node_modules/sequelize-cli/lib/sequelize', 'db:migrate'], { stdio: 'inherit' });
if (result.status !== 0)
    process.exit(result.status || 1);
require('../src/app');
