const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const command = new ListObjectsV2Command({
  Bucket: 'acglogs',
  Prefix: 'listings/',
  MaxKeys: 200,
});

s3.send(command).then(data => {
  const files = data.Contents || [];
  console.log('=== S3 FILE ANALYSIS ===\n');
  console.log('Total files:', files.length);
  console.log();

  // Check versioning pattern
  const versionPattern = /_(\d{4}-\d{2}-\d{2})\.json$/;

  const versioned = [];
  const nonVersioned = [];

  files.forEach(f => {
    const filename = f.Key.split('/').pop();
    if (versionPattern.test(filename)) {
      versioned.push(f);
    } else if (filename.endsWith('.json')) {
      nonVersioned.push(f);
    }
  });

  console.log('Versioned files (ASIN_YYYY-MM-DD.json):', versioned.length);
  console.log('Non-versioned files (ASIN.json):', nonVersioned.length);
  console.log();

  // Group by ASIN
  const byAsin = new Map();

  files.forEach(f => {
    const filename = f.Key.split('/').pop();
    if (!filename.endsWith('.json')) return;

    // Extract ASIN
    const asinMatch = filename.match(/\b(B[A-Z0-9]{9})\b/i);
    if (!asinMatch) return;

    const asin = asinMatch[1].toUpperCase();

    // Extract date if present
    const dateMatch = filename.match(/_(\d{4}-\d{2}-\d{2})\.json$/);
    const date = dateMatch ? dateMatch[1] : null;

    if (!byAsin.has(asin)) {
      byAsin.set(asin, []);
    }

    byAsin.get(asin).push({
      filename,
      key: f.Key,
      date,
      lastModified: f.LastModified
    });
  });

  console.log('Unique ASINs:', byAsin.size);
  console.log();

  // Find ASINs with multiple versions
  const multiVersion = Array.from(byAsin.entries())
    .filter(([asin, versions]) => versions.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  console.log('ASINs with multiple versions:', multiVersion.length);
  console.log();

  if (multiVersion.length > 0) {
    console.log('Top 10 ASINs by version count:\n');
    multiVersion.slice(0, 10).forEach(([asin, versions]) => {
      console.log('  ' + asin + ': ' + versions.length + ' versions');
      versions.forEach(v => {
        console.log('    - ' + v.filename);
      });
      console.log();
    });
  }

  console.log('PROBLEM DIAGNOSED:');
  console.log('='.repeat(60));
  console.log('Dashboard is processing ALL ' + files.length + ' files');
  console.log('But there are only ' + byAsin.size + ' unique ASINs');
  console.log();
  console.log('SOLUTION: Implement version detection');
  console.log('- Group files by ASIN');
  console.log('- For each ASIN, use only the LATEST version');
  console.log('- Expected ASIN count: ' + byAsin.size);

}).catch(err => console.error('Error:', err.message));
