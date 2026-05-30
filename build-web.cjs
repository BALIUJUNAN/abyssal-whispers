const fs = require('fs');
const path = require('path');

// 清理旧构建
if (fs.existsSync('dist')) fs.rmSync('dist', { recursive: true });
fs.mkdirSync('dist');

// 只复制最终产物和资源
fs.copyFileSync('index.html', 'dist/index.html');

// 复制运行时需要的静态资源（图片和音频）
if (fs.existsSync('assets')) {
  fs.cpSync('assets', 'dist/assets', { recursive: true });
}
if (fs.existsSync('audio')) {
  fs.cpSync('audio', 'dist/audio', { recursive: true });
}
if (fs.existsSync('assets/webp_ending')) {
  // 确保 ending 图片也被复制
  const endingSrc = path.join('assets', 'webp_ending');
  if (fs.existsSync(endingSrc)) {
    fs.mkdirSync(path.join('dist', 'assets', 'webp_ending'), { recursive: true });
    fs.cpSync(endingSrc, path.join('dist', 'assets', 'webp_ending'), { recursive: true });
  }
}

console.log('Build complete. Output: dist/');
console.log('- index.html (single-file app)');
console.log('- assets/ (images)');
console.log('- audio/ (sounds)');
