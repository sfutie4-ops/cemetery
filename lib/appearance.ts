export const colorThemes = [
  {id:'formal',label:'Formal',color:'#1d2940',detail:'#c5a86b'},
  {id:'blue',label:'Blue',color:'#2463b3',detail:'#c8ddf5'},
  {id:'teal',label:'Teal',color:'#087e76',detail:'#bfebe1'},
  {id:'violet',label:'Violet',color:'#7034a9',detail:'#e2cff4'},
  {id:'rose',label:'Rose',color:'#a84768',detail:'#f3d2df'},
  {id:'amber',label:'Sand',color:'#a5661d',detail:'#f4dfbc'},
  {id:'slate',label:'Slate',color:'#56647a',detail:'#d5deeb'},
  {id:'halloween',label:'Halloween',color:'#b45b12',detail:'#684080'},
  {id:'christmas',label:'Christmas',color:'#b93544',detail:'#267953'},
] as const;

export type Appearance = {
  mode:'light'|'dark'|'system';
  accent:typeof colorThemes[number]['id'];
  motion:boolean;
  motionLevel:'calm'|'balanced'|'lively';
  particles:boolean;
  designVersion:string;
};

export const designVersion='formal-v1';
export const defaultAppearance:Appearance={mode:'light',accent:'formal',motion:true,motionLevel:'balanced',particles:false,designVersion};

// Keep existing choices when adding new appearance controls; tolerate damaged storage.
export function readAppearance(value:unknown):Appearance{
  const saved=value&&typeof value==='object'?value as Record<string,unknown>:{};
  // Saved choices from before the Formal design switch to it once; later picks in Settings are kept.
  const current=saved.designVersion===designVersion;
  return {
    ...defaultAppearance,
    mode:saved.mode==='dark'||saved.mode==='system'?saved.mode:'light',
    accent:current&&colorThemes.some(theme=>theme.id===saved.accent)?saved.accent as Appearance['accent']:defaultAppearance.accent,
    motion:saved.motion!==false,
    motionLevel:saved.motionLevel==='calm'||saved.motionLevel==='lively'?saved.motionLevel:'balanced',
    particles:current?saved.particles===true:defaultAppearance.particles,
  };
}
