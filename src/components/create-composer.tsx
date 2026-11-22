'use client';
import {useEffect,useRef,useState} from 'react';
import {uploadFile} from '@/lib/upload';
type Kind='post'|'story'|'reel';
type Item={file:File;id?:string;progress:number;error?:string;alt:string;url:string};
export function CreateComposer({onClose,onPublished}:{onClose:()=>void;onPublished:()=>void}){
 const [kind,setKind]=useState<Kind|null>(null),[items,setItems]=useState<Item[]>([]),[caption,setCaption]=useState(''),[audience,setAudience]=useState<'all'|'close'>('all'),[ratio,setRatio]=useState('1 / 1'),[filter,setFilter]=useState('none'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const abort=useRef<AbortController|null>(null);
 useEffect(()=>()=>{abort.current?.abort()},[]);
 function close(){if(busy)return;if((items.length||caption.trim())&&!window.confirm('Discard your unsaved creation?'))return;items.forEach(i=>URL.revokeObjectURL(i.url));onClose()}
 function addFiles(files:FileList|null){if(!files||!kind)return;const incoming=Array.from(files);if(items.length+incoming.length>(kind==='post'?10:1)){setError(kind==='post'?'Maximum 10 files':'Select one file');return}
  const allowed=incoming.filter(f=>kind==='reel'?f.type.startsWith('video/'):f.type.startsWith('image/')||f.type.startsWith('video/'));
  if(allowed.length!==incoming.length){setError('Unsupported file type');return}
  setItems(old=>[...old,...allowed.map(file=>({file,progress:0,alt:'',url:URL.createObjectURL(file)}))]);setError('');
 }
 async function publish(){if(!kind||!items.length||items.some(i=>i.error)||busy)return;setBusy(true);setError('');const controller=new AbortController();abort.current=controller;
  try{
   const uploaded:Item[]=[];
   for(const item of items){let id=item.id;
    if(!id){id=await uploadFile({file:item.file,purpose:kind,onProgress:p=>setItems(old=>old.map(i=>i===item?{...i,progress:p}:i)),signal:controller.signal});}
    uploaded.push({...item,id,progress:1});setItems(old=>old.map(i=>i.url===item.url?{...i,id,progress:1}:i));
   }
   const endpoint=kind==='story'?'/api/stories':'/api/posts';
   const payload=kind==='story'?{mediaId:uploaded[0]!.id,caption:caption.slice(0,250),audience}:{type:kind,caption,mediaId:uploaded[0]!.id,media:uploaded.map(i=>({mediaId:i.id,alt:i.alt})),cropRatio:ratio,filter};
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await response.json();
   if(!response.ok)throw Error(data.error||'Publish failed');items.forEach(i=>URL.revokeObjectURL(i.url));onPublished();onClose();
  }catch(e){setError(e instanceof Error?e.message:'Publish failed')}finally{setBusy(false);abort.current=null}
 }
 function move(index:number,delta:number){setItems(old=>{const next=[...old],target=index+delta;if(target<0||target>=next.length)return old;[next[index],next[target]]=[next[target]!,next[index]!];return next})}
 return <div className="cc-modal-backdrop" role="presentation"><section className="cc-dialog" role="dialog" aria-modal="true" aria-label="Create content" style={{maxWidth:680,maxHeight:'90vh',overflow:'auto'}}>
 <header><h2>{kind?'Create '+kind:'Create'}</h2><button onClick={close} disabled={busy} aria-label="Close composer">✕</button></header>
 {!kind?<div style={{display:'flex',gap:16,justifyContent:'center',padding:32}}>{(['post','story','reel'] as const).map(k=><button key={k} onClick={()=>setKind(k)}>{k==='post'?'Post':k==='story'?'Story':'Reel'}</button>)}</div>:<>
 <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addFiles(e.dataTransfer.files)}} style={{padding:16,border:'1px dashed #777',borderRadius:12}}>
  <label>Drag files here or choose files<input type="file" multiple={kind==='post'} accept={kind==='reel'?'video/mp4,video/webm':'image/jpeg,image/png,image/webp,video/mp4,video/webm'} onChange={e=>{addFiles(e.target.files);e.target.value=''}}/></label>
  <small>{kind==='post'?'Up to 10 photos/videos':kind==='story'?'One photo or video, maximum 60 seconds':'One vertical video, maximum 90 seconds'}</small>
 </div>
 {kind==='post'&&<div style={{display:'flex',gap:12}}><label>Crop ratio <select value={ratio} onChange={e=>setRatio(e.target.value)}><option value="1 / 1">Square 1:1</option><option value="4 / 5">Portrait 4:5</option><option value="16 / 9">Landscape 16:9</option></select></label><label>Filter <select value={filter} onChange={e=>setFilter(e.target.value)}>{['none','grayscale','sepia','contrast','saturate','brightness'].map(x=><option key={x}>{x}</option>)}</select></label></div>}
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:12}}>
 {items.map((item,index)=><div key={item.url}><div style={{aspectRatio:kind==='post'?ratio:'9 / 16',overflow:'hidden'}}>{item.file.type.startsWith('video/')?<video src={item.url} controls style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<img src={item.url} alt="Selected preview" style={{width:'100%',height:'100%',objectFit:'cover',filter:filter==='none'?'none':filter==='grayscale'?'grayscale(1)':filter==='sepia'?'sepia(1)':filter==='contrast'?'contrast(1.5)':filter==='saturate'?'saturate(1.8)':'brightness(1.3)'}}/>}</div>
  {kind==='post'&&<><input aria-label="Alt text" placeholder="Alt text" value={item.alt} maxLength={250} onChange={e=>setItems(old=>old.map((v,i)=>i===index?{...v,alt:e.target.value}:v))}/><button onClick={()=>move(index,-1)} disabled={index===0||busy}>←</button><button onClick={()=>move(index,1)} disabled={index===items.length-1||busy}>→</button></>}
  <button disabled={busy} onClick={()=>{URL.revokeObjectURL(item.url);setItems(old=>old.filter((_,i)=>i!==index))}}>Remove</button><progress value={item.progress} max={1}/></div>)}
 </div>
 <label>Caption<textarea value={caption} maxLength={kind==='story'?250:2200} onChange={e=>setCaption(e.target.value)} placeholder="Write a caption with #hashtags and @mentions"/></label>
 {kind==='story'&&<label>Audience <select value={audience} onChange={e=>setAudience(e.target.value as 'all'|'close')}><option value="all">Everyone</option><option value="close">Close friends</option></select></label>}
 {error&&<p role="alert">{error}</p>}
 <div style={{display:'flex',gap:12}}><button onClick={()=>{if(!busy){setKind(null);setItems([])}}}>Back</button><button className="cc-primary" disabled={busy||!items.length} onClick={()=>void publish()}>{busy?'Uploading and publishing…':'Share '+kind}</button>{busy&&<button onClick={()=>abort.current?.abort()}>Cancel upload</button>}</div>
 </>}
 </section></div>
}
