#!/usr/bin/env node
/**
 * Generate bcryptjs-compatible password hash
 * Usage: node generate_bcryptjs_hash.js <password>
 */

const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node generate_bcryptjs_hash.js <password>');
  process.exit(1);
}

// Generate hash with 10 rounds (same as Better Auth default)
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
