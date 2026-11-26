# Desktop UI upgrade progress

Base: mobileui (1647d36). Production unchanged.

Implemented: desktop-only CSS at >=1024px, mobile boundary <=1023px, existing functional navigation and notification drawer, Post/Story/Reel Create dropdown wired to existing composer, desktop feed/reels/profile/discovery/chat styles, floating messages link, shared backend and media lifecycle preserved.

Pending acceptance: full visual comparison and baseline captures; all device sizes including physical tablets; state preservation and hydration tests; keyboard/menu and dialog regression tests; complete backend action regression; media lifecycle device checks; CI/build verification. No ads, fake live streaming or calling controls added. Existing mobile branch itself is incomplete. No production release authorized.
