import {ImageResponse} from 'next/og';
export const runtime='nodejs';
const sizes:Record<string,number>={'32':32,'96':96,'192':192,'512':512,'maskable-192':192,'maskable-512':512,'apple-180':180};
export async function GET(_request:Request,{params}:{params:Promise<{name:string}>}){
 const {name}=await params;
 if(!Object.hasOwn(sizes,name))return Response.json({error:'Icon not found'},{status:404});
 const size=sizes[name]!;
 const mask=name.startsWith('maskable-'),apple=name==='apple-180',opaque=mask||apple;
 const inner=opaque?Math.round(size*(mask ? 0.62 : 0.70)):size;
 return new ImageResponse(<div style={{display:'flex',width:'100%',height:'100%',alignItems:'center',justifyContent:'center',background:opaque?'#0c1014':'transparent'}}><svg width={inner} height={inner} viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect width="24" height="24" rx="5" fill="#0c1014"/><rect x="2" y="2" width="20" height="20" rx="6" stroke="#f5f5f5" strokeWidth="1.7"/><path d="M12 8.1a4.5 4.5 0 1 0 0 7.8M17.7 8.1a4.5 4.5 0 1 0 0 7.8" stroke="#f5f5f5" strokeWidth="1.7"/></svg></div>,{width:size,height:size,headers:{'Cache-Control':'public, max-age=31536000, immutable','Content-Type':'image/png'}});
}
