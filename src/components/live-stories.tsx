'use client';
import {useState} from 'react';import {StoryTray} from './story-tray';import {CreateComposer} from './create-composer';
export function LiveStories(){const [open,setOpen]=useState(false),[epoch,setEpoch]=useState(0);return <><StoryTray key={epoch} onAdd={()=>setOpen(true)}/>{open&&<CreateComposer initialKind="story" onClose={()=>setOpen(false)} onPublished={()=>setEpoch(x=>x+1)}/>}</>}
