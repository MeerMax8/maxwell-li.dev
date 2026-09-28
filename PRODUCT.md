# Product
<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
- Internship and co-op recruiters and engineers who open the link from a résumé or LinkedIn and decide in under a minute whether to read further. (Inferred, not confirmed by Maxwell.)
- People Maxwell meets at robotics competitions and at Waterloo, checking what he has built.

## Product Purpose
Maxwell Li's personal portfolio. It shows that he designs, builds and programs real machines end to end, and gets visitors to his project write-ups and his contact details.

## Positioning
Every project on the site is a physical machine he built himself, shown through his own CAD models, photos, flight and match footage, and measured results. Nothing is a mock-up.

## Capabilities and Constraints
- Two routes: `/` (home) and `/projects` (all builds). Projects must stay its own page (Maxwell's call, 2026-09-27).
- Astro 7, static, deployed on Vercel from `main` of github.com/MeerMax8/maxwell-li.dev.
- Zero budget for this redesign: no paid fonts, APIs, or generated imagery.
- Contact routes: email maxwell.yb.li@gmail.com, GitHub MeerMax8, LinkedIn, Discord, Instagram. There is no résumé PDF in the repo (the Resume link on the live site returns 404).

## Brand Commitments
- Name: Maxwell Li. Line: mechatronics engineering, controls and embedded systems.
- His own quote: "What defines me are not my experiences, but rather the person I choose to become after walking through them."
- Things he built into the site himself this week and that stay: the gravity-well grid that bends toward the pointer, and the hobby folder cards that open to a photo.

## Evidence on Hand
- CAD models (GLB): `public/models/quadcopter.glb` (Titan), `ekranoplan.glb` (Phaethon), `overunder.glb`, `highstakes.glb`.
- Photos `public/photos/<project>/`, videos `public/videos/<project>/`, High Stakes logbook PDF, YouTube pit interview (OGq2yLE5gq0) and reveal (51CzfAAcYG0).
- Results stated by Maxwell: Over Under: 9 awards, VEX World Championship Build Award, top 100 of 40,000+ teams, top 5 Canada, two world-first mechanisms. High Stakes: 14 awards, top 250 global. Phaethon: 45 W at 600 g, 63% less power per kilogram than the quadcopter. Titan: 50 cm frame on its 6th iteration, YOLOv8 on a Raspberry Pi 5 over MAVLink.
- Absent: his About Me copy (the draft on the site is a placeholder written from the facts above; he rewrites it), a résumé, testimonials. Never invent any of these.

## Product Principles
- The machines are the design. Real CAD, footage and numbers carry the page; decoration stays secondary.
- Every claim comes from Maxwell's own text.
- A recruiter on a phone gets the whole story as fast as someone on a desktop.
- Keep what Maxwell made himself; restyle it rather than replace it.

## Accessibility & Inclusion
WCAG AA contrast, full keyboard use, 44px touch targets, and a readable static version under reduced motion.
