import type {Page} from '@playwright/test';
import {newIntroProof,finishIntroProof,INTRO_COOKIE} from '../src/lib/core/introduction-proof';
// Only for isolated browser tests that exercise screens after the real introduction.
export async function completedIntroduction(page:Page){
 const key='local-playwright-intro-fixture-not-production',now=Date.now();
 const token=finishIntroProof(newIntroProof(key,now-35000),key,now);
 if(!token)throw Error('Could not create test introduction proof');
 await page.context().addCookies([{name:INTRO_COOKIE,value:token,url:'http://localhost:3000',httpOnly:true,sameSite:'Lax'}]);
}
