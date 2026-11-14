'use client';
import {useEffect,useRef} from 'react';
import {mountTombIdle} from '../lib/tomb-idle';
export default function TombIdle(){
 const layer=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!layer.current)return;return mountTombIdle(layer.current)},[]);
 return <div ref={layer} className="tomb-idle screen" aria-hidden="true"/>;
}
