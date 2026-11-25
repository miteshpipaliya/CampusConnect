export function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone)}
export function isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
export async function clearPwaDevice(){try{navigator.serviceWorker?.controller?.postMessage({type:'CLEAR_CACHES'});if('caches'in window)for(const name of await caches.keys())if(name.startsWith('cc-'))await caches.delete(name)}catch{}try{await navigator.clearAppBadge?.()}catch{}}
export function updateThemeColor(theme:'light'|'dark'){document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='light'?'#ffffff':'#080a0e')}
