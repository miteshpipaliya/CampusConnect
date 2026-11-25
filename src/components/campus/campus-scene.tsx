import Image from 'next/image';
/** Decorative local artwork only; all text, branding and controls are rendered in HTML. */
export function CampusScene({view}:{view:'welcome'|'account'}){return <div className={'cc-campus-scene cc-campus-scene-'+view} aria-hidden="true"><Image src={view==='welcome'?'/campus/welcome-scene.png':'/campus/day.webp'} alt="" fill sizes="100vw" priority quality={85} className="cc-campus-scene-image"/></div>}
