const fs = require('fs');
const path = require('path');

const sourceDir = path.resolve(__dirname, '../pack/electron');
const targetDir = path.resolve(__dirname, '../dist');

for (const entry of fs.readdirSync(sourceDir)) {
  fs.cpSync(
    path.join(sourceDir, entry),
    path.join(targetDir, entry),
    { recursive: true },
  );
}
