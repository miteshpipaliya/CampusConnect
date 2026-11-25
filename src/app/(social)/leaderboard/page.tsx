import {ReferralLeaderboard} from '@/components/referrals/leaderboard';
export default async function LeaderboardPage({searchParams}:{searchParams:Promise<{tab?:string|string[]}>}){const {tab}=await searchParams;return <ReferralLeaderboard referralOpen={tab==='referral'}/>}
