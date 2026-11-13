/**
 * Fetch only enumerated official public engineering references, hash actual
 * received PDF bytes and retain a local provenance index. Not an engineering
 * endorsement or proof the content applies to a proposed USV concept.
 */
import { createHash } from 'node:crypto';

const MAX_BYTES = 8 * 1024 * 1024;
export const CURATED_NAVAL_PUBLICATIONS = [
  {reference:'ITTC-2024-HS-RESISTANCE',uri:'https://www.ittc.info/media/11846/75-02-05-01.pdf',title:'ITTC 7.5-02-05-01 High Speed Marine Vehicles Resistance Test (2024)'},
  {reference:'ITTC-2024-CFD-PRACTICE',uri:'https://www.ittc.info/media/11958/75-03-02-03.pdf',title:'ITTC 7.5-03-02-03 Practical Guidelines for Ship CFD Applications (2024)'},
  {reference:'ITTC-2024-CFD-BENCHMARK-DB',uri:'https://www.ittc.info/media/11956/75-03-02-02.pdf',title:'ITTC 7.5-03-02-02 Benchmark Database for CFD Validation for Resistance and Propulsion (2024)'}
] as const;
export type CuratedPublication = typeof CURATED_NAVAL_PUBLICATIONS[number];
export type RawSourceGetter = (uri:string)=>Promise<{status:number;contentType:string;bytes:Uint8Array}>;
export interface CollectedPublicReference {
  reference:string;
  uri:string;
  title:string;
  sha256:string;
  bytes:number;
  actualFetchVerified:boolean;
  applicabilityIndependentlyReviewed:false;
  engineeringReleaseAuthorized:false;
}
export const defaultSourceGetter:RawSourceGetter = async url=>{
  const res=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000)});
  const bytes=new Uint8Array(await res.arrayBuffer());
  return {status:res.status,contentType:res.headers.get('content-type')||'',bytes};
};
/** Verify the bytes returned by a real HTTPS response, never synthetic claims. */
export async function collectPublicReferences(
 getter:RawSourceGetter=defaultSourceGetter
):Promise<{results:CollectedPublicReference[];blobs:Uint8Array[]}>{
  const results:CollectedPublicReference[]=[];
  const blobs:Uint8Array[]=[];
  for(const item of CURATED_NAVAL_PUBLICATIONS){
    const url=new URL(item.uri);
    if(url.protocol!=='https:'||url.hostname!=='www.ittc.info'||
      url.port||url.username||url.password||url.hash)throw Error('Unexpected publication host');
    const response=await getter(item.uri);
    if(response.status!==200||!response.contentType.toLowerCase().includes('pdf')||
      response.bytes.byteLength<100||response.bytes.byteLength>MAX_BYTES||
      new TextDecoder().decode(response.bytes.slice(0,5))!=='%PDF-'){
      throw Error('Official publication retrieval invalid: '+item.reference);
    }
    const digest='sha256:'+createHash('sha256').update(response.bytes).digest('hex');
    results.push({reference:item.reference,uri:item.uri,title:item.title,sha256:digest,
      bytes:response.bytes.byteLength,actualFetchVerified:true,
      applicabilityIndependentlyReviewed:false,engineeringReleaseAuthorized:false});
    blobs.push(response.bytes);
  }
  return {results,blobs};
}
