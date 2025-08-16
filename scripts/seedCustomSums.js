// Dev-only helper to seed example custom sums
// Writes to src-tauri/resources/custom_sums.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sums = [
  {
    id: Date.now(),
    name: 'Profit',
    note: '',
    position: 0,
    items: [
      { slot_index: 0, tag: 'Sales', op: 1 },
      { slot_index: 1, tag: 'Refunds', op: -1 }
    ]
  },
  {
    id: Date.now() + 1,
    name: 'Ops',
    note: '',
    position: 1,
    items: [
      { slot_index: 0, tag: 'Work', op: 1 },
      { slot_index: 1, tag: 'Support', op: 1 }
    ]
  }
];

const file = path.join(__dirname, '..', 'src-tauri', 'resources', 'custom_sums.json');
fs.writeFileSync(file, JSON.stringify(sums, null, 2));
console.log('Seeded custom sums to', file);
