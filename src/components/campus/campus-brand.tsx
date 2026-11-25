import {SafeImg} from '../safe-img';
/** Reuse the exact public logo used by CampusConnect, without altering its geometry. */
export function CampusBrand(){return <span className="cc-campus-official-brand"><SafeImg src="/cc-mark.svg" width={44} height={44} alt="" loading="eager"/><span>CampusConnect</span></span>}
