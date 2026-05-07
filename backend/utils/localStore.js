const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const file = path.join(__dirname, '..', 'local-data.json');
const empty = {
  users: [],
  workouts: [],
  nutrition: [],
  bodyStats: [],
  goals: [],
  photos: [],
  steps: []
};

exports.id = () => crypto.randomBytes(12).toString('hex');

exports.read = () => {
  if (!fs.existsSync(file)) return structuredClone(empty);
  try {
    return { ...structuredClone(empty), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch {
    return structuredClone(empty);
  }
};

exports.write = (data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};
