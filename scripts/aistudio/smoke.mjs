/**
 * End-to-end startup check for the default full-stack npm run dev contract.
 * This is the development server an imported Node/Vite app can launch; the
 * Vite-only production preview is intentionally tested separately.
 *
 * No API keys, agent execution, engineering writes or credentials required.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {setTimeout as pause} from 'node:timers/promises';

async function reserveFreePort() {
  const socket=createServer();
  return new Promise((resolve,reject)=>{
    socket.once('error',reject);
    socket.listen(0,'127.0.0.1',()=>{
      const address=socket.address();
      socket.close(error=>error?reject(error):resolve(address.port));
    });
  });
}

const port=await reserveFreePort();
const base='http://127.0.0.1:'+port;
const npm=process.platform==='win32'?'npm.cmd':'npm';
const child=spawn(npm,['run','dev'],{
  env:{
    ...process.env,
    PORT:String(port),
    NODE_ENV:'development',
    USV_ALLOW_PAID_AI_API:'false',
    USV_SUBSCRIPTION_PILOT:'disabled',
    AI_REVIEW_PROVIDER:'deterministic'
  },
  stdio:['ignore','pipe','pipe'],
  detached:process.platform!=='win32'
});
let output='',stopped=false;
for(const stream of [child.stdout,child.stderr]){
  stream?.on('data',bytes=>{output=(output+bytes.toString()).slice(-30000);});
}
child.on('exit',()=>{stopped=true;});
child.on('error',error=>{stopped=true;output+='\n'+error;});

function stopServer(){
  if(!child.pid)return;
  try {
    if(process.platform==='win32')child.kill('SIGTERM');
    else process.kill(-child.pid,'SIGTERM');
  }catch {/* The process may have exited already. */}
}
process.on('SIGINT',stopServer);
process.on('SIGTERM',stopServer);

try{
  let ready=false;
  for(let attempt=0;attempt<90;attempt++){
    if(stopped)throw Error('Full-stack server exited during startup.\n'+output);
    try{
      const response=await fetch(base+'/',{signal:AbortSignal.timeout(1500)});
      const html=await response.text();
      if(response.ok&&html.includes('Naval AI Lab | Engineering Sessions')&&html.includes('/src/sessions/main.tsx')){
        ready=true;break;
      }
    }catch{/* Poll until the server is listening. */}
    await pause(400);
  }
  assert(ready,'npm run dev never served the canonical Engineering Sessions entry.\n'+output);
  for(const [route,expected] of [
    ['/sessions.html','/src/sessions/main.tsx'],
    ['/legacy.html','/src/main.tsx']
  ]){
    const response=await fetch(base+route,{signal:AbortSignal.timeout(5000)});
    assert(response.ok,route+' returned HTTP '+response.status);
    assert((await response.text()).includes(expected),route+' serves an unexpected frontend');
  }
  const moduleResponse=await fetch(base+'/src/sessions/main.tsx',{signal:AbortSignal.timeout(10000)});
  assert(moduleResponse.ok,'Session bootstrap module did not compile: HTTP '+moduleResponse.status);
  const unauthorized=await fetch(base+'/api/data/snapshot',{signal:AbortSignal.timeout(5000)});
  assert.equal(unauthorized.status,401,'Protected engineering API was exposed without authorization');
  console.log('PASS — npm run dev serves Engineering Sessions, preserved governed lab, compiled client and protected API.');
}catch(error){
  console.error(error);
  console.error('Last server output:\n'+output);
  process.exitCode=1;
}finally{
  stopServer();
}
