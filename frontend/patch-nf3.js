import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'node_modules', 'nf3', 'dist', '_chunks', 'trace.mjs');

try {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file contains the problematic named import
    const target = 'import { nodeFileTrace } from "@vercel/nft";';
    const replacement = 'import pkgVercelNft from "@vercel/nft"; const { nodeFileTrace } = pkgVercelNft;';
    
    if (content.includes(target)) {
      content = content.replace(target, replacement);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Successfully patched nf3/dist/_chunks/trace.mjs for ESM Named Export compatibility!');
    } else {
      console.log('nf3 is already patched or does not contain the target named import.');
    }
  } else {
    console.warn(`nf3 trace file not found at: ${filePath}. Skipping patch.`);
  }
} catch (error) {
  console.error('Failed to patch nf3 package:', error);
}
