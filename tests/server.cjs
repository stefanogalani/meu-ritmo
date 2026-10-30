const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
function serve(root,port){return http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 if(file===root||fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 const types={'.html':'text/html','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
 fs.readFile(file,(err,body)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'text/plain','Cache-Control':'no-store'});res.end(body);});
 }).listen(port,'127.0.0.1');}
module.exports=serve;
if(require.main===module)serve(path.resolve(process.argv[2]||path.join(__dirname,'..')),Number(process.argv[3]||8765));
