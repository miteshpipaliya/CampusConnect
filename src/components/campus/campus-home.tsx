'use client';

import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronDown,
  Compass,
  GraduationCap,
  House,
  LifeBuoy,
  MessageCircle,
  Plus,
  Settings,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';
import { Avatar } from '../avatar';

type Props = {
  handle: string;
  avatarMediaId: string | null;
  counts: { unread: number; unreadMessages: number };
};

export function CampusHome({ handle, avatarMediaId, counts }: Props) {
  const unreadNotifications = counts.unread > 99 ? '99+' : counts.unread;
  const unreadMessages = counts.unreadMessages > 99 ? '99+' : counts.unreadMessages;

  return (
    <section className="cc-campus-home" aria-labelledby="cc-campus-home-title">
      <div className="cc-campus-home-art" aria-hidden="true" />

      <header className="cc-campus-home-nav">
        <Link className="cc-campus-home-brand" href="/home" aria-label="CampusConnect home">
          <span className="cc-campus-brand-mark" aria-hidden="true">C</span>
          <strong>CampusConnect</strong>
        </Link>

        <nav aria-label="Campus navigation">
          <Link href="/home" aria-current="page">
            <House size={16} aria-hidden="true" /> Home
          </Link>
          <Link href="/explore">
            <Compass size={16} aria-hidden="true" /> Explore
          </Link>
          <Link href="/home?section=community">
            <Users size={16} aria-hidden="true" /> Community
          </Link>
          <Link href="/messages" aria-label={counts.unreadMessages > 0 ? `Messages, ${counts.unreadMessages} unread` : 'Messages'}>
            <MessageCircle size={16} aria-hidden="true" /> Messages
            {counts.unreadMessages > 0 && <span aria-label={`${unreadMessages} unread`}>{unreadMessages}</span>}
          </Link>
          <Link href="/events">
            <CalendarDays size={16} aria-hidden="true" /> Events
          </Link>
        </nav>

        <div className="cc-campus-home-account">
          <Link
            className="cc-campus-notification"
            href="/notifications"
            aria-label={counts.unread > 0 ? `Campus notifications, ${counts.unread} unread` : 'Campus notifications'}
          >
            <Bell size={20} aria-hidden="true" />
            {counts.unread > 0 && <b aria-hidden="true">{unreadNotifications}</b>}
          </Link>

          <details className="cc-campus-profile-menu">
            <summary aria-label="Campus profile menu">
              <Avatar user={{ handle, avatarMediaId }} size={32} />
              <ChevronDown size={14} aria-hidden="true" />
            </summary>
            <div>
              <Link href="/profile/me"><UserRound size={16} aria-hidden="true" /> Your profile</Link>
              <Link href="/settings"><Settings size={16} aria-hidden="true" /> Settings</Link>
              <Link href="/leaderboard"><Trophy size={16} aria-hidden="true" /> Referral leaderboard</Link>
            </div>
          </details>
        </div>
      </header>

      <div className="cc-campus-home-content">
        <div className="cc-campus-home-welcome">
          <p className="cc-campus-eyebrow">
            <GraduationCap size={17} aria-hidden="true" /> BVM STUDENT COMMUNITY
          </p>
          <h1 id="cc-campus-home-title">
            Welcome back,
            <br />
            <span>@{handle}!</span>
          </h1>
          <p>Your campus. Your people. Your community.</p>

          <div className="cc-campus-home-actions">
            <Link className="cc-campus-primary" href="/explore">
              <Compass size={19} aria-hidden="true" /> Explore Campus <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link className="cc-campus-secondary" href="/connections?tab=suggestions">
              <Users size={19} aria-hidden="true" /> Discover Students
            </Link>
            <Link className="cc-campus-secondary" href="/home?section=community">
              <MessageCircle size={19} aria-hidden="true" /> Visit Community
            </Link>
            <Link className="cc-campus-secondary" href="/home?compose=1">
              <Plus size={19} aria-hidden="true" /> Share a Post
            </Link>
          </div>
        </div>
      </div>

      <footer className="cc-campus-home-footer">
        <span><span className="cc-campus-status-dot" aria-hidden="true" /> You are inside CampusConnect</span>
        <a href="#cc-campus-feed"><ArrowDown size={18} aria-hidden="true" /> Campus activity</a>
        <details className="cc-campus-guide">
          <summary><LifeBuoy size={17} aria-hidden="true" /> Campus guide</summary>
          <div>
            <strong>Find your way around</strong>
            <Link href="/explore">Discover campus posts</Link>
            <Link href="/connections?tab=suggestions">Meet other students</Link>
            <Link href="/leaderboard?tab=rewards">Explore referral rewards</Link>
            <Link href="/settings">Account and privacy settings</Link>
          </div>
        </details>
      </footer>
    </section>
  );
}
