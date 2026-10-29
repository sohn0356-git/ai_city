import {readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import assert from 'node:assert/strict';
function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
for(const [file,width,height] of [['ai-city-v1.png',256,256],['work-v2.png',64,64],['furniture-v3.png',64,64],['records-v4.png',64,64],['handoff-v5.png',64,64],['construction-v6.png',64,64],['inspection-v7.png',64,64],['resident-v8.png',64,64],['reading-v9.png',64,64],['musician-v10.png',64,64],['monsters-v11.png',64,64],['residents-v12.png',160,160],['cave-v13.png',64,64],['expedition-v14.png',64,64],['dungeon-v15.png',128,64],['monster-directions-v16.png',224,64],['maintenance-v17.png',64,64],['wayfinding-v18.png',64,64]]){
 const b=await readFile(`public/tiles/${file}`);assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`${file}: signature`);
 let at=8,end=false,parts=[];
 while(at<b.length){assert(at+12<=b.length,`${file}: truncated chunk`);const n=b.readUInt32BE(at);assert(at+12+n<=b.length,`${file}: truncated data`);const type=b.toString('ascii',at+4,at+8),data=b.subarray(at+8,at+8+n);assert.equal(crc32(b.subarray(at+4,at+8+n)),b.readUInt32BE(at+8+n),`${file}: CRC ${type}`);if(type==='IHDR'){assert.equal(data.readUInt32BE(0),width);assert.equal(data.readUInt32BE(4),height);}if(type==='IDAT')parts.push(data);at+=12+n;if(type==='IEND'){end=true;break;}}
 assert(end&&at===b.length,`${file}: missing end or trailing data`);assert(inflateSync(Buffer.concat(parts)).length>0,`${file}: invalid pixels`);console.log(`PNG verified: ${file}, ${b.length} bytes`);
}
