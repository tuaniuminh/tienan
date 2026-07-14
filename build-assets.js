const fs = require('fs');
const path = require('path');

const wwwDir = path.join(__dirname, 'www');

// Create www folder if not exists
if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir);
  console.log('Created www/ directory');
}

// Files/folders to copy
const filesToCopy = [
  'index.html',
  'manifest.json',
  'sw.js',
  'icon-192.png',
  'icon-512.png',
  'PROJECT_SUMMARY.md'
];

filesToCopy.forEach(file => {
  const src = path.join(__dirname, file);
  const dest = path.join(wwwDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} to www/`);
  } else {
    console.warn(`Warning: File ${file} does not exist!`);
  }
});

console.log('Build completed! All assets copied to www/');
