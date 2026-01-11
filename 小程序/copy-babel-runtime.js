const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'node_modules', '@babel', 'runtime');
const targetDir = path.join(__dirname, 'miniprogram_npm', '@babel', 'runtime');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);
  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(sourceDir)) {
  console.log('正在复制 @babel/runtime 到 miniprogram_npm...');
  copyDir(sourceDir, targetDir);
  console.log('复制完成！');
} else {
  console.error('错误：找不到 node_modules/@babel/runtime 目录');
  process.exit(1);
}








































