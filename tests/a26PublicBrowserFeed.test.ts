import {describe,it,expect} from 'vitest';
import {getPublicA26ReviewFeed,validatePublicFeed} from '../src/core/intelligence/a26PublicResearchFallback';

const SHA='c'.repeat(40),RUN='43667959316';
const source={sha:SHA,branch:'automation/a26-fleet-discovery-'+RUN};
const fleet={schemaVersion:1,agentId:'INTEL-USV-26',classification:'PUBLIC_SOURCE_SAFE_ONLY',
 records:[{id:'lead1',title:'Triton reported in public article',status:'DISCOVERED_UNVERIFIED',
 evidence:[{publicArticleUrl:'https://example.org/triton'}]}]};
const docs={schemaVersion:1,agentId:'INTEL-USV-26',classification:'PUBLIC_SOURCE_SAFE_ONLY',
 reviewStatus:'UNVERIFIED_PUBLIC_DOCUMENTS',
 records:[{id:'paper1',title:'Survey paper',reviewStatus:'REVIEW_REQUIRED',
 doi:'https://doi.org/10.1234/abc',fullTextPdfLink:'http://bad.example/insecure.pdf'}]};
const sources={schemaVersion:1,report:{engineeringReleaseApproved:false},
 records:[{key:'ocean-aero:triton',model:'Triton',manufacturer:'Ocean Aero',country:'United States',
 sources:[{url:'https://example.org/triton',sha256:'sha256:'+'a'.repeat(64),identityConfirmed:true}],
 fields:{length:[{field:'length',value:'4 m',quotation:'Test quoted claim',sourceUrl:'https://example.org/triton'}]}}]};
const manifest={schemaVersion:1,agentId:'INTEL-USV-26',classification:'PUBLIC_SOURCE_SAFE_ONLY',
 reviewStatus:'UNVERIFIED_REVIEW_REQUIRED',engineeringReleaseApproved:false,runId:RUN,headSha:'a'.repeat(40)};
const encoded=(obj:any)=>btoa(Array.from(new TextEncoder().encode(JSON.stringify(obj)),
  n=>String.fromCharCode(n)).join(''));
const json=(data:any)=>new Response(JSON.stringify(data),{status:200,
 headers:{'content-type':'application/json'}});
describe('A26 browser read-only feed for standalone Vite Lab',()=>{
 it('shows all three research categories without backend or engineering approval',()=>{
   const value=validatePublicFeed(fleet,docs,sources,manifest,source);
   expect(value.leads).toHaveLength(1);
   expect(value.publications).toHaveLength(1);
   expect(value.vessels).toHaveLength(1);
   expect(value.vessels[0].sources[0].identityCorroborated).toBe(true);
   expect(value.publications[0].pdfUrl).toBeNull();
   expect(value.engineeringReleaseApproved).toBe(false);
   expect(value.sourceMode).toBe('PUBLIC_GITHUB_READ_ONLY');
 });
 it('denies forged approval or mismatched source run',()=>{
   expect(()=>validatePublicFeed(fleet,docs,sources,{...manifest,engineeringReleaseApproved:true},source))
     .toThrow('A26_PUBLIC_MANIFEST_INVALID');
   expect(()=>validatePublicFeed(fleet,docs,sources,{...manifest,runId:'12345678'},source))
     .toThrow('A26_PUBLIC_MANIFEST_INVALID');
   expect(()=>validatePublicFeed(fleet,{...docs,classification:'RESTRICTED'},sources,manifest,source))
     .toThrow('A26_PUBLIC_DOCUMENTS_INVALID');
 });
 it('prefers the stable live research branch without falling back to numbered refs',async()=>{
   const files:any={
     'references/fleet-intelligence/discovery-register.json':fleet,
     'references/fleet-intelligence/document-register.json':docs,
     'references/a26-public-review/source-index.json':sources,
     'references/a26-public-review/manifest.json':manifest
   };
   const seen:string[]=[];
   const fake=(async(url:RequestInfo|URL)=>{
     const value=String(url);seen.push(value);
     if(value.includes('/git/ref/heads/research/live-a26'))return json({
       ref:'refs/heads/research/live-a26',object:{sha:SHA}
     });
     if(value.includes('matching-refs'))throw Error('Legacy refs must not be queried');
     const file=Object.keys(files).find(path=>value.includes('/contents/'+path));
     if(!file)return new Response('Not found',{status:404});
     return json({type:'file',encoding:'base64',content:encoded(files[file]),
       size:JSON.stringify(files[file]).length});
   }) as typeof fetch;
   const result=await getPublicA26ReviewFeed({fetcher:fake,force:true});
   expect(result.sourceUrl).toContain('/tree/research/live-a26');
   expect(result.vessels).toHaveLength(1);
   expect(seen).toHaveLength(5);
 });
 it('fetches the newest public review branch and four SHA-pinned GitHub records',async()=>{
   const files:any={
     'references/fleet-intelligence/discovery-register.json':fleet,
     'references/fleet-intelligence/document-register.json':docs,
     'references/a26-public-review/source-index.json':sources,
     'references/a26-public-review/manifest.json':manifest
   };
   const seen:string[]=[];
   const fake=(async(url:RequestInfo|URL)=>{
     const value=String(url);seen.push(value);
     if(value.includes('matching-refs'))return json([
       {ref:'refs/heads/automation/a26-fleet-discovery-11111111111',object:{sha:'b'.repeat(40)}},
       {ref:'refs/heads/'+source.branch,object:{sha:SHA}}
     ]);
     const file=Object.keys(files).find(path=>value.includes('/contents/'+path));
     if(!file)return new Response('Not found',{status:404});
     expect(value).toContain('ref='+SHA);
     return json({type:'file',encoding:'base64',content:encoded(files[file]),
       size:JSON.stringify(files[file]).length});
   }) as typeof fetch;
   const result=await getPublicA26ReviewFeed({fetcher:fake,force:true});
   expect(result.runId).toBe(RUN);
   expect(result.vessels).toHaveLength(1);
   expect(seen).toHaveLength(6);
   expect(seen.every(url=>url.startsWith('https://api.github.com/repos/ravisinghrathode/usv-01-digital-lab/'))).toBe(true);
 });
});
