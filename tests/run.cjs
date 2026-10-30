const {spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..'),server=require('./server.cjs')(root,8765);
server.on('error',e=>{console.error(e);process.exitCode=1;});
server.on('listening',async()=>{try{
 const files=fs.readdirSync(__dirname).filter(file=>file.endsWith('.cjs')&&!['server.cjs','run.cjs','downloads.cjs'].includes(file));
 for(const file of files)await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.join(__dirname,file)],{stdio:'inherit',env:process.env});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(file+' failed ('+code+')')));});
}catch(e){console.error(e);process.exitCode=1;}finally{server.close();}});
