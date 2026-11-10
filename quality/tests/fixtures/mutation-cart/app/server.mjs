import http from 'node:http';
import {readFile} from 'node:fs/promises';
const port=Number(process.env.APP_PORT);
http.createServer(async(req,res)=>{
 const asset=req.url==='/app.js'?'app.js':'index.html';
 res.setHeader('content-type',asset.endsWith('.js')?'text/javascript':'text/html');
 res.end(await readFile(new URL(asset,import.meta.url)));
}).listen(port,'127.0.0.1');
