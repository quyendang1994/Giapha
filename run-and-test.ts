import { spawn } from 'child_process';

const server = spawn('npx', ['ts-node', 'simple-mcp-server.ts'], { shell: true });

server.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

server.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Sau 2 giây, đóng server để kết thúc test
setTimeout(() => {
  server.kill();
  console.log('Server test finished');
}, 2000);