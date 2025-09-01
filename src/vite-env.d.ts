import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';


export default defineConfig({
server: {
https: {
key: fs.readFileSync(path.resolve(__dirname, 'localhost-key.pem')),
cert: fs.readFileSync(path.resolve(__dirname, 'localhost.pem')),
},
host: true
}
});