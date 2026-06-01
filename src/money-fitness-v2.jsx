import React, { useState, useEffect } from "react";

/*
 * ─────────────────────────────────────────────────────────────
 *  PWA NOTIFICATION INFRASTRUCTURE — READY FOR NEXT STEP
 * ─────────────────────────────────────────────────────────────
 *  All in-app notification logic is fully wired below.
 *  To activate real device push notifications, add these files:
 *
 *  1. /public/sw.js  (Service Worker)
 *     self.addEventListener('push', e => {
 *       const data = e.data.json();
 *       self.registration.showNotification(data.title, {
 *         body: data.body, icon: '/icon-192.png', badge: '/badge.png'
 *       });
 *     });
 *
 *  2. /public/manifest.json
 *     { "name": "MoneyFitness", "short_name": "MF",
 *       "start_url": "/", "display": "standalone",
 *       "background_color": "#0A1A0F", "theme_color": "#1B8C4E",
 *       "icons": [{ "src": "/icon-192.png", "sizes": "192x192" },
 *                 { "src": "/icon-512.png", "sizes": "512x512" }] }
 *
 *  3. Register SW on app load:
 *     if ('serviceWorker' in navigator) {
 *       navigator.serviceWorker.register('/sw.js');
 *     }
 *
 *  4. Request permission + subscribe (call once after login):
 *     async function subscribeToPush(userId) {
 *       const permission = await Notification.requestPermission();
 *       if (permission !== 'granted') return;
 *       const reg = await navigator.serviceWorker.ready;
 *       const sub = await reg.pushManager.subscribe({
 *         userVisibleOnly: true,
 *         applicationServerKey: VAPID_PUBLIC_KEY  // from Supabase
 *       });
 *       // Save sub to Supabase: supabase.from('push_subscriptions').insert({ user_id: userId, subscription: sub })
 *     }
 *
 *  5. Send from Supabase Edge Function using the webpush library:
 *     webpush.sendNotification(subscription, JSON.stringify({ title, body }));
 *
 *  NOTIFICATION TRIGGERS ALREADY WIRED IN THIS FILE:
 *  - Post-activity encouragement (client, on every log)
 *  - Goal milestone at 50%, 75%, 100% (client)
 *  - Streak milestones at 7, 14, 30 days (client)
 *  - Streak risk alert after 6pm if nothing logged (client)
 *  - New message from coach (client)
 *  - Program updated by coach (client)
 *  - Check-in request from coach (client)
 *  - Check-in submitted by client (coach)
 *  - Client activity logged (coach)
 *  - Client inactivity 3+ days (coach)
 *  - New client signup (coach)
 *  - Weekly summary every Monday (coach)
 * ─────────────────────────────────────────────────────────────
 */

/* ── Phosphor SVG Icon Strings ── */
const ICON_RUN      = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 256" fill="currentColor"><path d="M152,88a32,32,0,1,0-32-32A32,32,0,0,0,152,88Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,152,40Zm67.31,100.68c-.61.28-7.49,3.28-19.67,3.28-13.85,0-34.55-3.88-60.69-20a169.31,169.31,0,0,1-15.41,32.34,104.29,104.29,0,0,1,31.31,15.81C173.92,186.65,184,207.35,184,232a8,8,0,0,1-16,0c0-41.7-34.69-56.71-54.14-61.85-.55.7-1.12,1.41-1.69,2.1-19.64,23.8-44.25,36.18-71.63,36.18A92.29,92.29,0,0,1,31.2,208,8,8,0,0,1,32.8,192c25.92,2.58,48.47-7.49,67-30,12.49-15.14,21-33.61,25.25-47C86.13,92.35,61.27,111.63,61,111.84A8,8,0,1,1,51,99.36c1.5-1.2,37.22-29,89.51,6.57,45.47,30.91,71.93,20.31,72.18,20.19a8,8,0,1,1,6.63,14.56Z"/></svg>';
const ICON_WORKOUT  = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 256" fill="currentColor"><path d="M248,120h-8V88a16,16,0,0,0-16-16H208V64a16,16,0,0,0-16-16H168a16,16,0,0,0-16,16v56H104V64A16,16,0,0,0,88,48H64A16,16,0,0,0,48,64v8H32A16,16,0,0,0,16,88v32H8a8,8,0,0,0,0,16h8v32a16,16,0,0,0,16,16H48v8a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V136h48v56a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16v-8h16a16,16,0,0,0,16-16V136h8a8,8,0,0,0,0-16ZM32,168V88H48v80Zm56,24H64V64H88V192Zm104,0H168V64h24V175.82c0,.06,0,.12,0,.18s0,.12,0,.18V192Zm32-24H208V88h16Z"/></svg>';
const ICON_BODY     = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 256" fill="currentColor"><path d="M128,80A32,32,0,1,0,96,48,32,32,0,0,0,128,80Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,128,32Zm96,72a8,8,0,0,1-8,8H136v26.72l51.15,21.93A8,8,0,0,1,192,168v48a8,8,0,0,1-16,0V173.28l-46.45-19.91L53.35,222a8,8,0,1,1-10.7-11.9L120,140.44V112H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,104Z"/></svg>';
const ICON_BIKE     = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 256" fill="currentColor"><path d="M164,80a28,28,0,1,0-28-28A28,28,0,0,0,164,80Zm0-40a12,12,0,1,1-12,12A12,12,0,0,1,164,40Zm36,96a40,40,0,1,0,40,40A40,40,0,0,0,200,136Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,200,200ZM56,136a40,40,0,1,0,40,40A40,40,0,0,0,56,136Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,56,200Zm136-80H152a8,8,0,0,1-5.66-2.34L120,91.31,99.31,112l34.35,34.34A8,8,0,0,1,136,152v48a8,8,0,0,1-16,0V155.31L82.34,117.66a8,8,0,0,1,0-11.32l32-32a8,8,0,0,1,11.32,0L155.31,104H192a8,8,0,0,1,0,16Z"/></svg>';
const ICON_SWIM     = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 256" fill="currentColor"><path d="M176,104a32,32,0,1,0-32-32A32,32,0,0,0,176,104Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,176,56Zm46.16,129.24a8,8,0,0,1-1,11.26c-17.36,14.39-32.86,19.5-47,19.5-18.58,0-34.82-8.82-49.93-17-25.35-13.76-47.24-25.65-79.07.74a8,8,0,1,1-10.22-12.31c40.17-33.29,70.32-16.93,96.93-2.49,25.35,13.77,47.24,25.65,79.07-.74A8,8,0,0,1,222.16,185.24ZM34.89,147.42a8,8,0,1,0,10.22,12.31c31.83-26.38,53.72-14.5,79.07-.74,15.11,8.2,31.35,17,49.93,17,14.14,0,29.64-5.11,47-19.5a8,8,0,1,0-10.22-12.31,75.79,75.79,0,0,1-19.28,12.06l-53.84-53.82A103.34,103.34,0,0,0,64.24,72H40a8,8,0,0,0,0,16H64.24a87.66,87.66,0,0,1,41.88,10.56L76.49,128.17C63.82,129.35,50.07,134.84,34.89,147.42Zm91.57-33.67,46.13,46.12c-14-.43-26.88-7.39-40.77-14.93-10.75-5.84-22.09-12-34.42-15.05l22.26-22.26A87.14,87.14,0,0,1,126.46,113.75Z"/></svg>';
const ICON_FIRE     = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 256" fill="currentColor"><path d="M183.89,153.34a57.6,57.6,0,0,1-46.56,46.55A8.75,8.75,0,0,1,136,200a8,8,0,0,1-1.32-15.89c16.57-2.79,30.63-16.85,33.44-33.45a8,8,0,0,1,15.78,2.68ZM216,144a88,88,0,0,1-176,0c0-27.92,11-56.47,32.66-84.85a8,8,0,0,1,11.93-.89l24.12,23.41,22-60.41a8,8,0,0,1,12.63-3.41C165.21,36,216,84.55,216,144Zm-16,0c0-46.09-35.79-85.92-58.21-106.33L119.52,98.74a8,8,0,0,1-13.09,3L80.06,76.16C64.09,99.21,56,122,56,144a72,72,0,0,0,144,0Z"/></svg>';
const ICON_LIGHTNING= '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 256" fill="currentColor"><path d="M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z"/></svg>';
const ICON_SNEAKER  = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 256" fill="currentColor"><path d="M231.16,166.63l-28.63-14.31A47.74,47.74,0,0,1,176,109.39V80a8,8,0,0,0-8-8,48.05,48.05,0,0,1-48-48,8,8,0,0,0-12.83-6.37L30.13,76l-.2.16a16,16,0,0,0-1.24,23.75L142.4,213.66a8,8,0,0,0,5.66,2.34H224a16,16,0,0,0,16-16V180.94A15.92,15.92,0,0,0,231.16,166.63ZM224,200H151.37L40,88.63l12.87-9.76,38.79,38.79A8,8,0,0,0,103,106.34L65.74,69.11l40-30.31A64.15,64.15,0,0,0,160,87.5v21.89a63.65,63.65,0,0,0,35.38,57.24L224,180.94ZM70.8,184H32a8,8,0,0,1,0-16H70.8a8,8,0,1,1,0,16Zm40,24a8,8,0,0,1-8,8H48a8,8,0,0,1,0-16h54.8A8,8,0,0,1,110.8,208Z"/></svg>';
const ICON_STAR     = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 256" fill="currentColor"><path d="M239.18,97.26A16.38,16.38,0,0,0,224.92,86l-59-4.76L143.14,26.15a16.36,16.36,0,0,0-30.27,0L90.11,81.23,31.08,86a16.46,16.46,0,0,0-9.37,28.86l45,38.83L53,211.75a16.38,16.38,0,0,0,24.5,17.82L128,198.49l50.53,31.08A16.4,16.4,0,0,0,203,211.75l-13.76-58.07,45-38.83A16.43,16.43,0,0,0,239.18,97.26Zm-15.34,5.47-48.7,42a8,8,0,0,0-2.56,7.91l14.88,62.8a.37.37,0,0,1-.17.48c-.18.14-.23.11-.38,0l-54.72-33.65a8,8,0,0,0-8.38,0L69.09,215.94c-.15.09-.19.12-.38,0a.37.37,0,0,1-.17-.48l14.88-62.8a8,8,0,0,0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16A8,8,0,0,0,103,91.86l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153,91.86a8,8,0,0,0,6.75,4.92l63.92,5.16c.15,0,.24,0,.33.29S224,102.63,223.84,102.73Z"/></svg>';
const ICON_MOON     = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 256" fill="currentColor"><path d="M240,96a8,8,0,0,1-8,8H216v16a8,8,0,0,1-16,0V104H184a8,8,0,0,1,0-16h16V72a8,8,0,0,1,16,0V88h16A8,8,0,0,1,240,96ZM144,56h8v8a8,8,0,0,0,16,0V56h8a8,8,0,0,0,0-16h-8V32a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16Zm72.77,97a8,8,0,0,1,1.43,8A96,96,0,1,1,95.07,37.8a8,8,0,0,1,10.6,9.06A88.07,88.07,0,0,0,209.14,150.33,8,8,0,0,1,216.77,153Zm-19.39,14.88c-1.79.09-3.59.14-5.38.14A104.11,104.11,0,0,1,88,64c0-1.79,0-3.59.14-5.38A80,80,0,1,0,197.38,167.86Z"/></svg>';
const ICON_PENCIL   = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 256" fill="currentColor"><path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"/></svg>';
const ICON_CHART    = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 256" fill="currentColor"><path d="M224,200h-8V40a8,8,0,0,0-8-8H152a8,8,0,0,0-8,8V80H96a8,8,0,0,0-8,8v40H48a8,8,0,0,0-8,8v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16ZM160,48h40V200H160ZM104,96h40V200H104ZM56,144H88v56H56Z"/></svg>';


/* ── Design 4: Clean Performance ───────────────────────────────
   Fonts: Plus Jakarta Sans (headings/UI) + Space Grotesk (labels/numbers)
   Load via index.html or a global <style> tag in your entry point.
   In this prototype we inject via a <style> element at runtime.
─────────────────────────────────────────────────────────────── */

// ---
const SVG_ICONS = {
  fire: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 6-6 8-6 14a6 6 0 0 0 12 0c0-6-6-8-6-14z"/></svg>),
  workout: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5a7 7 0 1 0 5 11.95M6.5 6.5 4 4m2.5 2.5 2.5 2.5M17.5 17.5 20 20m-2.5-2.5-2.5-2.5"/><line x1="4" y1="20" x2="6" y2="18"/><line x1="18" y1="6" x2="20" y2="4"/><line x1="8" y1="4" x2="10" y2="6"/><line x1="14" y1="18" x2="16" y2="20"/></svg>),
  run: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13" cy="4" r="2"/><path d="m7 22 3-8-2-2 4-4 2 4 4 2"/><path d="M5 12h4l2-4"/></svg>),
  steps: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5c0 1.1-.35 2.08-.85 3H14c2 0 5 1.5 5 5.5 0 1.5-.5 2.5-1.5 3l-3 1.5"/><path d="m9 16 1.5-1.5M15 20l1.5-1.5"/><path d="M6 20h12"/></svg>),
  people: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
  target: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>),
  sleep: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>),
  chart: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>),
};


const BG       = "#FFFFFF";
const CARD     = "#FFFFFF";
const SURFACE  = "#F0F5F2";
const SURFACE2 = "#E2EFE8";
const BORDER   = "#D0E6D8";
const TEXT     = "#0A1A0F";
const TEXT2    = "#4A6655";
const TEXT3    = "#7AAB8A";
const ORANGE   = "#1B8C4E";
const ORANGE2  = "#2AAD66";
const ORANGE_BG= "#E8F7EF";
const ORANGE_BR= "#A8D9BB";
const GREEN    = "#0D6E38";
const GREEN_BG = "#E0F2E9";
const BLUE     = "#2563B0";
const BLUE_BG  = "#E6EEFA";
const PURPLE   = "#9B6FD4";
const GOLD     = "#E0A020";
const WHITE    = "#FFFFFF";
const GRAY     = "#F0F5F2";
const RED      = "#E05252";
const DKGREEN  = "#0A1A0F";

function stripSetsReps(name) {
  const idx = name.search(/\d+[x]/);
  return idx > 0 ? name.slice(0, idx).trim() : name.trim();
}

const VIDEO_LIBRARY = [
  { id: "bench-press",      name: "Bench Press",       cat: "Chest",     url: "https://www.youtube.com/watch?v=rT7DgCr-3pg", cues: ["Retract shoulder blades","Feet flat on floor","Bar to lower chest"] },
  { id: "squat",            name: "Barbell Squat",     cat: "Legs",      url: "https://www.youtube.com/watch?v=ultWZbUMPL8", cues: ["Chest tall, braced core","Knees track over toes","Drive through heels"] },
  { id: "deadlift",         name: "Deadlift",          cat: "Back",      url: "https://www.youtube.com/watch?v=op9kVnSso6Q", cues: ["Neutral spine","Bar close to shins","Squeeze glutes at top"] },
  { id: "overhead-press",   name: "Overhead Press",    cat: "Shoulders", url: "https://www.youtube.com/watch?v=2yjwXTZQDDI", cues: ["Grip just outside shoulders","Glutes squeezed","Lock out overhead"] },
  { id: "pull-up",          name: "Pull-Up",           cat: "Back",      url: "https://www.youtube.com/watch?v=eGo4IYlbE5g", cues: ["Dead hang start","Engage lats first","Chin over bar"] },
  { id: "incline-db-press", name: "Incline DB Press",  cat: "Chest",     url: "https://www.youtube.com/watch?v=8iPEnn-ltC8", cues: ["30-45 degree incline","Elbows at 45 degrees","Full stretch at bottom"] },
  { id: "barbell-row",      name: "Barbell Row",       cat: "Back",      url: "https://www.youtube.com/watch?v=9efgcAjQe7E", cues: ["Hinge at hips","Pull to lower chest","Squeeze shoulder blades"] },
  { id: "romanian-dl",      name: "Romanian Deadlift", cat: "Legs",      url: "https://www.youtube.com/watch?v=JCXUYuzwNrM", cues: ["Soft knee bend","Push hips back","Feel hamstring stretch"] },
  { id: "lat-pulldown",     name: "Lat Pulldown",      cat: "Back",      url: "https://www.youtube.com/watch?v=CAwf7n6Luuc", cues: ["Lean back slightly","Pull to upper chest","Full stretch at top"] },
  { id: "front-squat",      name: "Front Squat",       cat: "Legs",      url: "https://www.youtube.com/watch?v=m4ytaCJZpl0", cues: ["Elbows high","Upright torso","Deep as mobility allows"] },
  { id: "hip-thrust",       name: "Hip Thrust",        cat: "Legs",      url: "https://www.youtube.com/watch?v=xDmFkJxPzeM", cues: ["Bench at shoulder blade","Drive through heels","Full glute squeeze at top"] },
  { id: "face-pulls",       name: "Face Pulls",        cat: "Shoulders", url: "https://www.youtube.com/watch?v=HSoHeSjFBVY", cues: ["Pull to face height","Elbows high and wide","External rotate at end"] },
  { id: "dips",             name: "Dips",              cat: "Chest",     url: "https://www.youtube.com/watch?v=2z8JmcrW-As", cues: ["Lean forward for chest","Elbows flare slightly","Full depth"] },
  { id: "nordic-curl",      name: "Nordic Curl",       cat: "Legs",      url: "https://www.youtube.com/watch?v=Oc-qj1BTDGU", cues: ["Ankles anchored","Lower as slowly as possible","Use hands to push up"] },
  { id: "hammer-curls",     name: "Hammer Curls",      cat: "Arms",      url: "https://www.youtube.com/watch?v=TwD-YGVP4Bk", cues: ["Neutral grip","Elbows pinned","Controlled lowering"] },
  { id: "walking-lunges",   name: "Walking Lunges",    cat: "Legs",      url: "https://www.youtube.com/watch?v=L8fvypPrzzs", cues: ["Upright torso","Knee does not pass toe","Push through front heel"] },
  { id: "leg-curl",         name: "Leg Curl",          cat: "Legs",      url: "", cues: ["Hips flat on pad","Full range of motion","Squeeze at top"] },
  { id: "leg-press",        name: "Leg Press",         cat: "Legs",      url: "", cues: ["Feet shoulder-width","Do not lock knees out","Full depth"] },
  { id: "calf-raises",      name: "Calf Raises",       cat: "Legs",      url: "", cues: ["Full stretch at bottom","Pause at top","Slow lowering"] },
  { id: "pendlay-row",      name: "Pendlay Row",       cat: "Back",      url: "", cues: ["Bar starts on floor each rep","Horizontal torso","Explosive pull"] },
];

const VIDEO_MAP = {
  "bench press": "bench-press", "incline db press": "incline-db-press", "incline press": "incline-db-press",
  "squat": "squat", "front squat": "front-squat", "hack squat": "squat",
  "deadlift": "deadlift", "romanian dl": "romanian-dl", "stiff-leg dl": "romanian-dl", "rack pulls": "deadlift",
  "overhead press": "overhead-press", "arnold press": "overhead-press", "shoulder press": "overhead-press",
  "pull-ups": "pull-up", "weighted pull-ups": "pull-up", "lat pulldown": "lat-pulldown",
  "barbell row": "barbell-row", "pendlay row": "pendlay-row", "chest-supported row": "barbell-row",
  "face pulls": "face-pulls", "rear delt fly": "face-pulls", "lateral raises": "face-pulls",
  "dips": "dips", "tricep dips": "dips", "hip thrust": "hip-thrust", "nordic curl": "nordic-curl",
  "hammer curls": "hammer-curls", "walking lunges": "walking-lunges",
  "leg curl": "leg-curl", "leg press": "leg-press", "calf raises": "calf-raises",
};

function findVideo(name) {
  const lower = name.toLowerCase();
  const keys = Object.keys(VIDEO_MAP);
  for (let k = 0; k < keys.length; k++) {
    if (lower.indexOf(keys[k]) !== -1) {
      const id = VIDEO_MAP[keys[k]];
      for (let v = 0; v < VIDEO_LIBRARY.length; v++) {
        if (VIDEO_LIBRARY[v].id === id) return VIDEO_LIBRARY[v];
      }
    }
  }
  return null;
}

function getYTId(url) {
  if (!url) return null;
  const parts = url.split(/v=|youtu\.be\/|embed\//);
  if (parts.length < 2) return null;
  return parts[1].slice(0, 11);
}

// Default program template -- coach can edit this and it flows to all clients
const DEFAULT_PROGRAM = [
  { week: 1, days: [
    { day: "Mon", focus: "Push",      exercises: ["Bench Press 4x6","Incline DB Press 3x10","Shoulder Press 3x10","Tricep Dips 3x12"] },
    { day: "Wed", focus: "Pull",      exercises: ["Deadlift 4x5","Barbell Row 3x8","Pull-Ups 3x10","Face Pulls 3x15"] },
    { day: "Fri", focus: "Legs",      exercises: ["Squat 4x6","Romanian DL 3x10","Leg Press 3x12","Calf Raises 4x15"] },
  ]},
  { week: 2, days: [
    { day: "Mon", focus: "Push+",     exercises: ["Bench Press 4x8","Dips 3x12","Lateral Raises 4x15","Tricep Pushdown 3x15"] },
    { day: "Wed", focus: "Pull+",     exercises: ["Rack Pulls 4x5","Chest-Supported Row 3x10","Lat Pulldown 3x12","Hammer Curls 3x12"] },
    { day: "Fri", focus: "Legs+",     exercises: ["Front Squat 4x6","Leg Curl 3x12","Walking Lunges 3x16","Hip Thrust 3x12"] },
  ]},
  { week: 3, days: [
    { day: "Mon", focus: "Peak Push", exercises: ["Bench Press 5x5","Incline Press 4x8","Arnold Press 3x10","Close Grip BP 3x8"] },
    { day: "Wed", focus: "Peak Pull", exercises: ["Deadlift 5x3","Pendlay Row 4x6","Weighted Pull-Ups 3x8","Rear Delt Fly 3x15"] },
    { day: "Fri", focus: "Peak Legs", exercises: ["Squat 5x5","Stiff-Leg DL 3x8","Hack Squat 3x10","Nordic Curl 3x8"] },
  ]},
];

const CLIENTS = [
  {
    id: 1, name: "Marcus Johnson", goal: "Build muscle -- 185lb by Aug",
    type: "Lifting", since: "Jan 2025", streak: 12, avatar: "MJ", color: "#1B8C4E",
    checkIns: [
      { week: "May 5",  mood: 4, energy: 3, notes: "Hit all lifts. Sleep was rough mid-week." },
      { week: "Apr 28", mood: 5, energy: 5, notes: "PR on bench -- 225lbs! Feeling great." },
    ],
    goals: [
      { label: "Bodyweight",  current: 181, target: 185, unit: "lbs", progress: 75, color: ORANGE },
      { label: "Bench Press", current: 225, target: 245, unit: "lbs", progress: 60, color: BLUE },
      { label: "Squat",       current: 285, target: 315, unit: "lbs", progress: 55, color: GREEN },
    ],
    workedOut: [1,2,4,5,8,9,11,12,14,15,16,19,20,22,23],
  },
  {
    id: 2, name: "Sarah Kim", goal: "Run first 5K -- under 30 min",
    type: "Running", since: "Mar 2025", streak: 7, avatar: "SK", color: "#1B8C4E",
    checkIns: [
      { week: "May 5",  mood: 5, energy: 4, notes: "Ran 2.8 miles without stopping. Big milestone!" },
      { week: "Apr 28", mood: 3, energy: 3, notes: "Shin splints acting up. Took 2 rest days." },
    ],
    goals: [
      { label: "5K Distance",    current: 2.8,  target: 3.1,  unit: "mi",     progress: 80, color: GREEN },
      { label: "Pace",           current: 11.2, target: 9.5,  unit: "min/mi", progress: 45, color: ORANGE },
      { label: "Weekly Mileage", current: 9,    target: 15,   unit: "mi",     progress: 60, color: BLUE },
    ],
    workedOut: [1,3,5,7,8,10,12,14,15,17,19,21,22],
  },
];

const COACH_NAME  = "Cameron Money";
const COACH_FIRST = "Cameron";
const COACH_CODE  = "CAMERON2025"; // Clients enter this on signup to link to this coach
const TODAY     = new Date();
const DAYS_IN_MONTH = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0).getDate();
const MONTH_NAME    = TODAY.toLocaleString("default", { month: "long" });
const TODAY_DAY     = TODAY.getDate();

// ---

function Avatar({ initials, size, color }) {
  const sz = size || 40;
  const bg = color || ORANGE;
  return (
    <div style={{ width: sz, height: sz, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: sz * 0.36, color: "#fff", flexShrink: 0, fontFamily: "inherit" }}>
      {initials}
    </div>
  );
}

function Pill({ label, color, bg }) {
  return (
    <span style={{ background: bg || ORANGE_BG, color: color || ORANGE, fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20, display: "inline-block" }}>
      {label}
    </span>
  );
}

function GoalBar({ goal }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{goal.label}</span>
        <span style={{ color: TEXT2, fontSize: 12 }}>{goal.current} <span style={{ color: TEXT3 }}>/ {goal.target} {goal.unit}</span></span>
      </div>
      <div style={{ background: SURFACE2, borderRadius: 99, height: 8, overflow: "hidden" }}>
        <div style={{ width: goal.progress + "%", height: "100%", background: goal.color || ORANGE, borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>

    </div>
  );
}

const ACTIVITY_TYPES = [
  { key: "run",         label: "Run",             icon: ICON_RUN,     color: "#2563B0",  bg: "#E6EEFA" },
  { key: "workout",     label: "Workout",          icon: ICON_WORKOUT, color: "#1B8C4E",  bg: "#E8F7EF" },
  { key: "bike",        label: "Bike",             icon: ICON_BIKE,    color: "#D97706",  bg: "#FEF3C7" },
  { key: "swim",        label: "Swim",             icon: ICON_SWIM,    color: "#0E7490",  bg: "#CFFAFE" },
  { key: "maintenance", label: "Body Care", icon: ICON_BODY,    color: "#9B6FD4",  bg: "#F2EDFC" },
  { key: "other",       label: "Other",            icon: ICON_STAR,    color: "#E0A020",  bg: "#FDF6E3" },
];

const ACTIVITY_COLORS = { run: "#2563B0", workout: "#1B8C4E", bike: "#D97706", swim: "#0E7490", maintenance: "#9B6FD4", other: "#E0A020" };
const ACTIVITY_BGS    = { run: "#E6EEFA", workout: "#E8F7EF", bike: "#FEF3C7", swim: "#CFFAFE", maintenance: "#F2EDFC", other: "#FDF6E3" };

function AddActivityForm({ onAdd, onCancel }) {
  const [type, setType]       = useState("");
  const [notes, setNotes]     = useState("");
  const [miles, setMiles]     = useState("");
  const [steps, setSteps]     = useState("");
  const [paceMin, setPaceMin] = useState("");
  const [paceSec, setPaceSec] = useState("");

  const paceDisplay = paceMin ? paceMin + ":" + (paceSec || "00").padStart(2,"0") + "/mi" : "";

  const placeholders = {
    run:         "e.g. Easy pace, felt strong",
    workout:     "e.g. Push day -- new bench PR!",
    maintenance: "e.g. 30 min yoga, foam rolling",
    other:       "Describe your activity...",
  };

  const inputS = { background: CARD, border: "1.5px solid "+BORDER, borderRadius: 10, padding: "10px 8px", color: TEXT, fontSize: 15, fontWeight: 700, outline: "none", boxSizing: "border-box", width: "100%", textAlign: "center" };

  return (
    <div style={{ background: SURFACE, borderRadius: 14, padding: "14px", marginBottom: 12, border: "1.5px solid "+BORDER }}>
      <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>ACTIVITY TYPE</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 14 }}>
        {ACTIVITY_TYPES.map(function(at) {
          const active = type === at.key;
          return (
            <button key={at.key} onClick={function() { setType(at.key); }} style={{
              padding: "11px 8px", borderRadius: 12,
              border: "2px solid "+(active ? at.color : BORDER),
              background: active ? at.bg : CARD, cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <div style={{ lineHeight: 1, color: at.color, display:"flex", alignItems:"center", justifyContent:"center" }} dangerouslySetInnerHTML={{ __html: at.icon }} />
              <span style={{ color: active ? at.color : TEXT2, fontSize: 12, fontWeight: active ? 700 : 500 }}>{at.label}</span>
            </button>
          );
        })}
      </div>

      {type === "run" && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
            <div>
              <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>DISTANCE</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="number" value={miles} onChange={function(e) { setMiles(e.target.value); }} placeholder="0.0" style={inputS} />
                <span style={{ color: TEXT3, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>mi</span>
              </div>
            </div>
            <div>
              <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>PACE</div>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <input type="number" value={paceMin} onChange={function(e) { setPaceMin(e.target.value); }} placeholder="9" style={Object.assign({}, inputS, { flex: 1 })} />
                <span style={{ color: TEXT3, fontSize: 13, fontWeight: 700 }}>:</span>
                <input type="number" value={paceSec} onChange={function(e) { setPaceSec(e.target.value); }} placeholder="30" style={Object.assign({}, inputS, { flex: 1 })} />
                <span style={{ color: TEXT3, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>/mi</span>
              </div>
            </div>
          </div>
          {paceDisplay && (
            <div style={{ background: ACTIVITY_BGS.run, borderRadius: 8, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13" cy="4" r="2"/><path d="m7 22 3-8-2-2 4-4 2 4 4 2"/><path d="M5 12h4l2-4"/></svg></span></span>
              <span style={{ color: ACTIVITY_COLORS.run, fontSize: 12, fontWeight: 700 }}>{paceDisplay} avg pace</span>
            </div>
          )}
        </div>
      )}

      {(type === "other" || type === "bike") && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>DISTANCE <span style={{ color: TEXT3, fontWeight: 500, fontSize: 10, letterSpacing: 0 }}>(optional)</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="number" value={miles} onChange={function(e) { setMiles(e.target.value); }} placeholder="0.0" style={inputS} />
            <span style={{ color: TEXT3, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>mi</span>
          </div>
        </div>
      )}

      {type === "swim" && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>DISTANCE <span style={{ color: TEXT3, fontWeight: 500, fontSize: 10, letterSpacing: 0 }}>(optional)</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="number" value={miles} onChange={function(e) { setMiles(e.target.value); }} placeholder="0.0" style={inputS} />
                <span style={{ color: TEXT3, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>mi</span>
              </div>
            </div>
            <div>
              <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>YARDS</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="number" value={paceMin} onChange={function(e) { setPaceMin(e.target.value); }} placeholder="1000" style={inputS} />
                <span style={{ color: TEXT3, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>yds</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Steps field -- shown for all activity types */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>STEPS <span style={{ color: TEXT3, fontWeight: 400 }}>(optional)</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="number" value={steps} onChange={function(e) { setSteps(e.target.value); }} placeholder="e.g. 8500" style={{ flex: 1, background: CARD, border: "1.5px solid "+BORDER, borderRadius: 10, padding: "10px 12px", color: TEXT, fontSize: 14, fontWeight: 600, outline: "none", boxSizing: "border-box" }} />
          <span style={{ color: TEXT3, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>steps</span>
        </div>
        {steps && parseInt(steps) > 0 && (
          <div style={{ marginTop: 6, color: TEXT3, fontSize: 11 }}>
            ~{(parseInt(steps) * 0.000473).toFixed(2)} mi walked
          </div>
        )}
      </div>

      <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
        DESCRIPTION <span style={{ color: TEXT3, fontWeight: 400 }}>(optional)</span>
      </div>
      <textarea value={notes} onChange={function(e) { setNotes(e.target.value); }} placeholder={placeholders[type] || "Describe your activity..."}
        style={{ width: "100%", background: CARD, border: "1.5px solid "+BORDER, borderRadius: 10, padding: "10px 12px", color: TEXT, fontSize: 13, lineHeight: 1.5, resize: "none", height: 76, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={function() {
          if (!type) return;
          var paceStr = paceMin ? paceMin + ":" + (paceSec || "00").padStart(2,"0") : "";
          onAdd({ id: Date.now(), type: type, notes: notes, miles: miles || "", pace: paceStr, steps: steps || "" });
          setType(""); setNotes(""); setMiles(""); setSteps(""); setPaceMin(""); setPaceSec("");
        }} style={{ flex: 1, padding: "11px", borderRadius: 11, background: type ? (ACTIVITY_COLORS[type] || ORANGE) : SURFACE2, border: "none", color: type ? "#fff" : TEXT3, fontSize: 13, fontWeight: 700, cursor: type ? "pointer" : "default" }}>
          Add Activity
        </button>
        <button onClick={onCancel} style={{ padding: "11px 16px", borderRadius: 11, background: "none", border: "1.5px solid "+BORDER, color: TEXT2, fontSize: 13, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}


function WorkoutLogModal({ day, activities, accentColor, onSave, onClose, readOnly }) {
  const c = accentColor || ORANGE;
  const monthShort = TODAY.toLocaleString("default", { month: "short" });
  const [list, setList]       = useState(activities ? activities.slice() : []);
  const [adding, setAdding]   = useState(list.length === 0 && !readOnly);

  // Read-only view for coach
  if (readOnly) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(26,23,20,0.55)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 400 }} onClick={onClose}>
        <div style={{ background: CARD, borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 430, paddingBottom: 36, maxHeight: "80vh", overflowY: "auto" }} onClick={function(e) { e.stopPropagation(); }}>
          <div style={{ width: 36, height: 4, background: BORDER, borderRadius: 99, margin: "12px auto 0" }} />
          <div style={{ padding: "16px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ color: TEXT3, fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{monthShort} {day}</div>
              <div style={{ color: TEXT, fontSize: 20, fontWeight: 800 }}>{list.length > 0 ? "Recorded Activity" : "No Activity Logged"}</div>
            </div>
            <button onClick={onClose} style={{ background: SURFACE, border: "none", color: TEXT2, width: 34, height: 34, borderRadius: 99, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          <div style={{ padding: "0 20px 8px" }}>
            {list.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 0", color: TEXT3, fontSize: 13 }}>No activity recorded for this day</div>
            )}
            {list.map(function(a) {
              const at = ACTIVITY_TYPES.find(function(t) { return t.key === a.type; }) || ACTIVITY_TYPES[3];
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: at.bg, borderRadius: 14, padding: "13px 14px", marginBottom: 10, border: "1.5px solid "+at.color+"44" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: at.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }} dangerouslySetInnerHTML={{ __html: at.icon }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: at.color, fontSize: 14, fontWeight: 700 }}>{at.label}</div>
                    {a.notes ? <div style={{ color: TEXT2, fontSize: 12, marginTop: 3, lineHeight: 1.5 }}>{a.notes}</div> : null}
                    <div style={{ display: "flex", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
                      {a.miles ? <span style={{ color: TEXT3, fontSize: 11, background: SURFACE, padding: "2px 7px", borderRadius: 6 }}>{a.miles} mi</span> : null}
                      {a.pace  ? <span style={{ color: TEXT3, fontSize: 11, background: SURFACE, padding: "2px 7px", borderRadius: 6 }}>⏱ {a.pace}/mi</span> : null}
                      {a.steps ? <span style={{ color: TEXT3, fontSize: 11, background: SURFACE, padding: "2px 7px", borderRadius: 6 }}>{parseInt(a.steps).toLocaleString()} steps</span> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function handleAdd(entry) {
    const next = list.concat([entry]);
    setList(next);
    setAdding(false);
  }

  function handleDelete(id) {
    setList(list.filter(function(a) { return a.id !== id; }));
  }

  function handleSave() {
    onSave(day, list);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,23,20,0.55)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 400 }} onClick={onClose}>
      <div style={{ background: CARD, borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 430, paddingBottom: 36, maxHeight: "92vh", overflowY: "auto" }} onClick={function(e) { e.stopPropagation(); }}>
        <div style={{ width: 36, height: 4, background: BORDER, borderRadius: 99, margin: "12px auto 0" }} />
      <div style={{ padding: "16px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: TEXT3, fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{monthShort} {day}</div>
            <div style={{ color: TEXT, fontSize: 20, fontWeight: 800 }}>Log Activity</div>
          </div>
          <button onClick={onClose} style={{ background: SURFACE, border: "none", color: TEXT2, width: 34, height: 34, borderRadius: 99, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
        </div>

        <div style={{ padding: "0 20px" }}>
{list.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
                LOGGED ({list.length})
              </div>
              {list.map(function(a) {
                const at = ACTIVITY_TYPES.find(function(t) { return t.key === a.type; }) || ACTIVITY_TYPES[3];
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: at.bg, borderRadius: 12, padding: "12px 12px", marginBottom: 8, border: "1.5px solid "+at.color+"44" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: at.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }} dangerouslySetInnerHTML={{ __html: at.icon }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: at.color, fontSize: 13, fontWeight: 700 }}>{at.label}</div>
                      {a.notes ? <div style={{ color: TEXT2, fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>{a.notes}</div> : null}
                      <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                        {a.miles ? <span style={{ color: TEXT3, fontSize: 11 }}> {a.miles} mi</span> : null}
                        {a.pace ? <span style={{ color: TEXT3, fontSize: 11 }}>⏱ {a.pace}/mi</span> : null}
                        {a.steps ? <span style={{ color: TEXT3, fontSize: 11 }}> {parseInt(a.steps).toLocaleString()} steps</span> : null}
                      </div>
                    </div>
                    <button onClick={function() { handleDelete(a.id); }} style={{ background: "none", border: "none", color: TEXT3, fontSize: 18, cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0 }}>x</button>
                  </div>
                );
              })}
            </div>
          )}
{adding ? (
            <AddActivityForm onAdd={handleAdd} onCancel={function() { if (list.length > 0) setAdding(false); else onClose(); }} />
          ) : (
            <button onClick={function() { setAdding(true); }} style={{ width: "100%", padding: "12px", borderRadius: 12, background: SURFACE, border: "1.5px dashed "+BORDER, color: TEXT2, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <span style={{ fontSize: 18, color: ORANGE }}>+</span> Add Another Activity
            </button>
          )}
{list.length > 0 && !adding && (
            <button onClick={handleSave} style={{ width: "100%", padding: 15, borderRadius: 14, background: c, border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              Save {list.length > 1 ? list.length+" Activities" : "Activity"}
            </button>
          )}
{list.length > 0 && (
            <button onClick={function() { onSave(day, []); onClose(); }} style={{ width: "100%", marginTop: 8, padding: 11, borderRadius: 12, background: "none", border: "none", color: "#E05252", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Clear all activities for this day
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CalHeatmap({ workedOut, color, isEditable, watchDays, sharedLogs, onLogsChange }) {
  const c = color || ORANGE;

  const [viewYear,  setViewYear]  = useState(TODAY.getFullYear());
  const [viewMonth, setViewMonth] = useState(TODAY.getMonth());

  const isCurrentMonth  = viewYear === TODAY.getFullYear() && viewMonth === TODAY.getMonth();
  const daysInViewMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfView  = new Date(viewYear, viewMonth, 1).getDay();
  const viewMonthName   = new Date(viewYear, viewMonth, 1).toLocaleString("default", { month: "long" });
  const currentKey      = TODAY.getFullYear() + "-" + TODAY.getMonth();
  const monthKey        = viewYear + "-" + viewMonth;

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else { setViewMonth(viewMonth - 1); }
  }
  function nextMonth() {
    if (isCurrentMonth) return;
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else { setViewMonth(viewMonth + 1); }
  }

  const blanks = [];
  for (let b = 0; b < firstDayOfView; b++) blanks.push(b);
  const days = [];
  for (let d = 1; d <= daysInViewMonth; d++) days.push(d);

  // If sharedLogs is provided use it as the single source of truth (activityLogs from MainApp).
  // Only fall back to the legacy workedOut array when no sharedLogs are wired up (e.g. coach view).
  const [localLogs, setLocalLogs] = useState(function() {
    if (sharedLogs) return sharedLogs;
    const init = {};
    (workedOut || []).forEach(function(d) {
      init[d] = [{ id: d, type: "workout", notes: "" }];
    });
    return { [currentKey]: init };
  });

  const [modalDay, setModalDay] = useState(null);

  // Keep localLogs in sync when sharedLogs changes from parent (new imports, manual logs, etc.)
  const [prevSharedLogs, setPrevSharedLogs] = useState(sharedLogs);
  if (sharedLogs && sharedLogs !== prevSharedLogs) {
    setPrevSharedLogs(sharedLogs);
    setLocalLogs(sharedLogs);
  }

  // Derive the logs for the current view month
  const logs = (sharedLogs ? sharedLogs : localLogs)[monthKey] || {};

  function handleDayTap(d) {
    if (d > TODAY.getDate() && isCurrentMonth) return;
    // Coach can view, client can edit
    if (!isEditable && !(logs[d] && logs[d].length > 0)) return;
    setModalDay(d);
  }

  function handleSave(day, list) {
    const base = (sharedLogs ? sharedLogs : localLogs)[monthKey] || {};
    const ml = Object.assign({}, base);
    if (list.length === 0) { delete ml[day]; } else { ml[day] = list; }
    if (onLogsChange) {
      // Controlled mode: let parent own the state
      onLogsChange(monthKey, ml);
    } else {
      // Uncontrolled mode: update local state
      setLocalLogs(function(prev) {
        const next = Object.assign({}, prev);
        next[monthKey] = ml;
        return next;
      });
    }
  }

  function dayColor(d) {
    const acts = logs[d];
    if (!acts || acts.length === 0) return c;
    return ACTIVITY_COLORS[acts[0].type] || c;
  }

  return (
    <div>
      {modalDay && (
        <WorkoutLogModal day={modalDay} activities={logs[modalDay] || []} accentColor={c} onSave={handleSave} onClose={function() { setModalDay(null); }} readOnly={!isEditable} />
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={prevMonth} style={{ width: 34, height: 34, borderRadius: 10, background: SURFACE, border: "1.5px solid "+BORDER, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: TEXT2, fontWeight: 700 }}>
          &lt;
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: TEXT, fontSize: 15, fontWeight: 700 }}>{viewMonthName}</div>
          <div style={{ color: TEXT3, fontSize: 11 }}>{viewYear}</div>
        </div>
        <button onClick={nextMonth} style={{ width: 34, height: 34, borderRadius: 10, background: SURFACE, border: "1.5px solid "+BORDER, cursor: isCurrentMonth ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: TEXT2, fontWeight: 700, opacity: isCurrentMonth ? 0.3 : 1 }}>
          &gt;
        </button>
      </div>

      {!isCurrentMonth && isEditable && (
        <div style={{ background: SURFACE, borderRadius: 10, padding: "7px 12px", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13 }}><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span></span>
          <span style={{ color: TEXT3, fontSize: 11 }}>Viewing past month -- navigate to current month to log</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 6 }}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(function(d, i) {
          return <div key={d} style={{ textAlign: "center", fontSize: 10, color: TEXT3, fontWeight: 600 }}>{d}</div>;
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {blanks.map(function(b) { return <div key={"b"+b} />; })}
        {days.map(function(d) {
          const worked   = !!(logs[d] && logs[d].length > 0);
          const isToday  = isCurrentMonth && d === TODAY.getDate();
          const isFuture = isCurrentMonth && d > TODAY.getDate();
          const dc       = dayColor(d);
          const hasWatch = worked && logs[d].some(function(a) { return a.fromWatch; });
          const tappable = isCurrentMonth && !isFuture && (isEditable || worked);

          return (
            <div key={d} onClick={function() { handleDayTap(d); }}
              style={{ aspectRatio: "1", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: worked || isToday ? 700 : 400, background: worked ? dc : isToday ? SURFACE2 : isFuture ? "transparent" : SURFACE, color: worked ? "#fff" : isToday ? c : isFuture ? "#ddd" : TEXT3, border: isToday && !worked ? "2px solid "+c : "none", cursor: tappable ? "pointer" : "default", position: "relative", transition: "transform 0.1s" }}
              onMouseEnter={function(e) { if (tappable) e.currentTarget.style.transform = "scale(1.15)"; }}
              onMouseLeave={function(e) { e.currentTarget.style.transform = "scale(1)"; }}
            >
              {d}
              {worked && (
                <div style={{ display: "flex", gap: 2, position: "absolute", bottom: 3 }}>
                  {logs[d].slice(0, 3).map(function(a, i) {
                    return <div key={a.id || i} style={{ width: 3, height: 3, borderRadius: 99, background: "rgba(255,255,255,0.75)" }} />;
                  })}
                </div>
              )}
              {hasWatch && (
                <div style={{ position: "absolute", top: 1, right: 1, width: 8, height: 8, borderRadius: 99, background: "#0A1A0F", border: "1px solid rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 5, color: "#fff", lineHeight: 1 }}>w</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        {ACTIVITY_TYPES.map(function(at) {
          const count = Object.values(logs).reduce(function(sum, acts) {
            return sum + acts.filter(function(a) { return a.type === at.key; }).length;
          }, 0);
          if (count === 0) return null;
          return (
            <div key={at.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: at.color }} />
              <span style={{ fontSize: 10, color: TEXT3 }}><span dangerouslySetInnerHTML={{ __html: at.icon }} /> {at.label} ({count})</span>
            </div>
          );
        })}
        {watchDays && Object.keys(watchDays).length > 0 && isCurrentMonth && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 99, background: "#0A1A0F", border: "1px solid #aaa" }} />
            <span style={{ fontSize: 10, color: TEXT3 }}>Apple Watch</span>
          </div>
        )}
      </div>

      {isEditable && isCurrentMonth && (
        <div style={{ marginTop: 10, background: SURFACE, borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14 }}><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11V6a2 2 0 0 1 4 0v5"/><path d="M13 11V8a2 2 0 0 1 4 0v6a6 6 0 0 1-12 0v-3a2 2 0 0 1 4 0v1"/></svg></span></span>
          <span style={{ color: TEXT3, fontSize: 11 }}>Tap any past day to log or edit an activity</span>
        </div>
      )}
    </div>
  );
}


function YouTubeLite({ ytId, title }) {
  const [activated, setActivated] = useState(false);
  var thumb = "https://i.ytimg.com/vi/" + ytId + "/hqdefault.jpg";

  return (
    <div style={{ position: "relative", paddingBottom: "56.25%", background: "#000", cursor: "pointer" }}
      onClick={function() { setActivated(true); }}>
      {!activated ? (
        <div style={{ position: "absolute", inset: 0 }}>
          <img
            src={thumb}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            loading="eager"
          />
          {/* Dark overlay */}
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)" }} />
          {/* Play button */}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 99, background: "rgba(255,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><polygon points="6 4 20 12 6 20 6 4"/></svg>
            </div>
          </div>
          {/* Tap to play label */}
          <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center" }}>
            <span style={{ background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99 }}>Tap to play</span>
          </div>
        </div>
      ) : (
        <iframe
          src={"https://www.youtube.com/embed/" + ytId + "?rel=0&autoplay=1"}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
          allowFullScreen
          allow="autoplay"
          title={title}
        />
      )}
    </div>
  );
}

function VideoModal({ video, exName, onClose }) {
  const ytId = video ? getYTId(video.url) : null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,23,20,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 600, padding: "0" }} onClick={onClose}>
      <div style={{ background: CARD, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 430, maxHeight: "90vh", overflow: "auto", paddingBottom: 32 }} onClick={function(e) { e.stopPropagation(); }}>
        <div style={{ width: 36, height: 4, background: BORDER, borderRadius: 99, margin: "12px auto 16px" }} />
        {ytId ? (
          <YouTubeLite ytId={ytId} title={exName} />
        ) : (
          <div style={{ height: 160, background: SURFACE, margin: "0 16px", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ color: TEXT2, fontSize: 13 }}>No video added yet</div>
            <div style={{ color: TEXT3, fontSize: 11 }}>Add a YouTube link in the Library tab</div>
          </div>
        )}
        <div style={{ padding: "18px 20px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <Pill label={video ? video.cat : "Exercise"} />
              <div style={{ color: TEXT, fontSize: 22, fontWeight: 700, marginTop: 6 }}>{video ? video.name : exName}</div>
            </div>
            <button onClick={onClose} style={{ background: SURFACE, border: "none", color: TEXT2, width: 34, height: 34, borderRadius: 99, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>x</button>
          </div>
          {video && video.cues && (
            <div style={{ background: SURFACE, borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>KEY CUES</div>
              {video.cues.map(function(c, i) {
                return (
                  <div key={"cue-"+i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: 99, background: ORANGE_BG, color: "#1B8C4E", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i+1}</div>
                    <span style={{ color: TEXT, fontSize: 13, lineHeight: 1.4, paddingTop: 2 }}>{c}</span>
                  </div>
                );
              })}
            </div>
          )}
          {video && video.url && (
            <a href={video.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px", background: ORANGE_BG, borderRadius: 12, color: "#1B8C4E", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              Watch on YouTube ->
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function parseExercise(ex) {
  const stripped = ex.replace(/^\[C:[^\]]*\]\s*/, "");
  const match = stripped.match(/^(.+?)\s+(\d+)[xx](\d+)/);
  if (match) return { name: match[1].trim(), sets: match[2], reps: match[3] };
  return { name: stripped.trim(), sets: "", reps: "" };
}

function getCircuitLabel(ex) {
  const m = ex.match(/^\[C:([^\]]*)\]/);
  return m ? (m[1] || "Circuit") : null;
}
function stripCircuit(ex) { return ex.replace(/^\[C:[^\]]*\]\s*/, ""); }
function setCircuitLabel(ex, label) {
  const base = stripCircuit(ex);
  return label ? "[C:" + label + "] " + base : base;
}

function ExerciseRow({ ex, color, isClient, onTapVideo, logKey, savedData, onSave, defaultOpen, weightOnly }) {
  const c = color || ORANGE;
  const parsed  = parseExercise(ex);
  const hasVid  = !!findVideo(parsed.name);
  const [open, setOpen]     = useState(defaultOpen || false);
  const [sets, setSets]     = useState(savedData ? savedData.sets   : parsed.sets);
  const [reps, setReps]     = useState(savedData ? savedData.reps   : parsed.reps);
  const [weight, setWeight] = useState(savedData ? savedData.weight : "");
  const [saved, setSaved]   = useState(false);

  // Display from savedData so switching weeks shows correct persisted values
  const dispSets   = savedData ? savedData.sets   : parsed.sets;
  const dispReps   = savedData ? savedData.reps   : parsed.reps;
  const dispWeight = savedData ? savedData.weight : "";

  function handleSave() {
    onSave(logKey, { sets: sets, reps: reps, weight: weight });
    setSaved(true);
    setOpen(false);
    setTimeout(function() { setSaved(false); }, 2000);
  }

  const inputStyle = {
    width: "100%", background: BG, border: "1.5px solid "+BORDER,
    borderRadius: 10, padding: "9px 10px", color: TEXT,
    fontSize: 14, fontWeight: 600, outline: "none",
    boxSizing: "border-box", textAlign: "center",
  };

  return (
    <div style={{ borderTop: "1px solid "+SURFACE2 }}>
      <div style={{ display: "flex", alignItems: "center", padding: "10px 0", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: 99, background: hasVid ? c : TEXT3, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{parsed.name}</span>
            {saved && <span style={{ background: GREEN_BG, color: "#1B8C4E", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6 }}>SAVED</span>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center" }}>
            {dispSets   && <span style={{ color: TEXT3, fontSize: 11 }}>{dispSets} sets</span>}
            {dispReps   && <span style={{ color: TEXT3, fontSize: 11 }}>x {dispReps} reps</span>}
            {dispWeight && <span style={{ color: c, fontSize: 11, fontWeight: 600 }}>{dispWeight} lbs</span>}
            {weightOnly && isClient && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
                <input
                  type="number"
                  value={weight}
                  onChange={function(e) { setWeight(e.target.value); }}
                  onBlur={function() { if (onSave) onSave(logKey, { sets: sets, reps: reps, weight: weight }); setSaved(!!weight); }}
                  placeholder="lbs"
                  style={{ width: 52, background: SURFACE, border: "1.5px solid "+BORDER, borderRadius: 8, padding: "4px 6px", color: TEXT, fontSize: 12, fontWeight: 700, outline: "none", textAlign: "center" }}
                />
                <span style={{ color: TEXT3, fontSize: 11 }}>lbs</span>
              </div>
            )}
          </div>
        </div>
        {!weightOnly && isClient && (
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {hasVid && (
              <button onClick={function() { onTapVideo(parsed.name); }} style={{ background: ORANGE_BG, border: "none", borderRadius: 8, padding: "4px 8px", display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
                <span style={{ fontSize: 10 }}>{">"}</span>
                <span style={{ color: "#1B8C4E", fontSize: 10, fontWeight: 600 }}>Watch</span>
              </button>
            )}
            <button onClick={function() { setOpen(!open); }} style={{ background: open ? c : SURFACE, border: "1.5px solid "+(open ? c : BORDER), borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: open ? "#fff" : TEXT2, fontSize: 11, fontWeight: 600 }}>
              {open ? "Done" : "Edit"}
            </button>
          </div>
        )}
        {(weightOnly || !isClient) && hasVid && (
          <button onClick={function() { onTapVideo(parsed.name); }} style={{ background: ORANGE_BG, border: "none", borderRadius: 8, padding: "4px 8px", display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
            <span style={{ fontSize: 10 }}>{">"}</span>
            <span style={{ color: "#1B8C4E", fontSize: 10, fontWeight: 600 }}>Watch</span>
          </button>
        )}
      </div>
      {open && isClient && !weightOnly && (
        <div style={{ background: SURFACE, borderRadius: 12, padding: "14px", marginBottom: 10 }}>
          <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>LOG YOUR NUMBERS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <div style={{ color: TEXT3, fontSize: 10, fontWeight: 600, marginBottom: 5, textAlign: "center" }}>SETS</div>
              <input
                type="number" value={sets}
                onChange={function(e) { setSets(e.target.value); }}
                placeholder={parsed.sets || "--"}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ color: TEXT3, fontSize: 10, fontWeight: 600, marginBottom: 5, textAlign: "center" }}>REPS</div>
              <input
                type="number" value={reps}
                onChange={function(e) { setReps(e.target.value); }}
                placeholder={parsed.reps || "--"}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ color: TEXT3, fontSize: 10, fontWeight: 600, marginBottom: 5, textAlign: "center" }}>WEIGHT (lbs)</div>
              <input
                type="number" value={weight}
                onChange={function(e) { setWeight(e.target.value); }}
                placeholder="0"
                style={inputStyle}
              />
            </div>
          </div>
          <button onClick={handleSave} style={{ width: "100%", padding: "11px", borderRadius: 10, background: c, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Save
          </button>
        </div>
      )}
    </div>
  );
}

// -- COACH PROGRAM EDITOR -----------------------------------------
function CoachProgramEditor({ program, onSave, onClose }) {
  // Deep clone program for editing
  const [draft, setDraft] = useState(
    JSON.parse(JSON.stringify(program))
  );
  const [activeWk, setActiveWk] = useState(0);
  const [showPicker, setShowPicker] = useState(null); // "wkIdx-dayIdx"
  const [saved, setSaved] = useState(false);

  function updateFocus(wkIdx, dayIdx, val) {
    setDraft(function(prev) {
      const next = JSON.parse(JSON.stringify(prev));
      next[wkIdx].days[dayIdx].focus = val;
      return next;
    });
  }

  function updateDay(wkIdx, dayIdx, val) {
    setDraft(function(prev) {
      const next = JSON.parse(JSON.stringify(prev));
      next[wkIdx].days[dayIdx].day = val;
      return next;
    });
  }

  function updateExercise(wkIdx, dayIdx, exIdx, val) {
    setDraft(function(prev) {
      const next = JSON.parse(JSON.stringify(prev));
      next[wkIdx].days[dayIdx].exercises[exIdx] = val;
      return next;
    });
  }

  function removeExercise(wkIdx, dayIdx, exIdx) {
    setDraft(function(prev) {
      const next = JSON.parse(JSON.stringify(prev));
      next[wkIdx].days[dayIdx].exercises.splice(exIdx, 1);
      return next;
    });
  }

  function addExercise(wkIdx, dayIdx, name) {
    setDraft(function(prev) {
      const next = JSON.parse(JSON.stringify(prev));
      next[wkIdx].days[dayIdx].exercises.push(name + " 3x10");
      return next;
    });
    setShowPicker(null);
  }

  function addDay(wkIdx) {
    setDraft(function(prev) {
      const next = JSON.parse(JSON.stringify(prev));
      next[wkIdx].days.push({ day: "Day", focus: "New Session", exercises: [] });
      return next;
    });
  }

  function removeDay(wkIdx, dayIdx) {
    setDraft(function(prev) {
      const next = JSON.parse(JSON.stringify(prev));
      next[wkIdx].days.splice(dayIdx, 1);
      return next;
    });
  }

  function handleSave() {
    onSave(draft);
    setSaved(true);
    setTimeout(function() { setSaved(false); onClose(); }, 1200);
  }

  const inputS = { background: SURFACE, border: "1.5px solid "+BORDER, borderRadius: 9, padding: "8px 10px", color: TEXT, fontSize: 12, outline: "none", boxSizing: "border-box" };
  const week = draft[activeWk];

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 400, overflowY: "auto", display: "flex", flexDirection: "column" }}>
      {showPicker && (
        <ExercisePicker
          color={ORANGE}
          favorites={{}}
          onAdd={function(name) {
            const parts = showPicker.split("-");
            addExercise(parseInt(parts[0]), parseInt(parts[1]), name);
          }}
          onClose={function() { setShowPicker(null); }}
        />
      )}
      <div style={{ padding: "16px 18px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid "+BORDER, flexShrink: 0, background: CARD, position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <div style={{ color: TEXT, fontSize: 17, fontWeight: 800 }}>Edit Coach Program</div>
          <div style={{ color: TEXT3, fontSize: 11, marginTop: 2 }}>Changes apply to all clients</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "8px 14px", borderRadius: 10, background: SURFACE, border: "1.5px solid "+BORDER, color: TEXT2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: "8px 16px", borderRadius: 10, background: saved ? GREEN : ORANGE, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {saved ? "Saved!" : "Save All"}
          </button>
        </div>
      </div>

      <div style={{ padding: "18px 16px", flex: 1 }}>
      <div style={{ background: ORANGE_BG, borderRadius: 12, padding: "10px 14px", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span></span>
          <span style={{ color: ORANGE, fontSize: 12, fontWeight: 500 }}>Edits here update the program for ALL {CLIENTS.length} clients instantly</span>
        </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {draft.map(function(w, i) {
            return (
              <button key={"wk-editor-"+i} onClick={function() { setActiveWk(i); }} style={{ flex: 1, padding: "10px 0", borderRadius: 12, background: activeWk === i ? ORANGE : CARD, border: "1.5px solid "+(activeWk === i ? ORANGE : BORDER), color: activeWk === i ? "#fff" : TEXT2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Week {w.week}
              </button>
            );
          })}
        </div>
{week.days.map(function(day, dayIdx) {
          return (
            <div key={dayIdx} style={{ background: CARD, borderRadius: 16, padding: "16px", border: "1.5px solid "+BORDER, marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                <input value={day.day} onChange={function(e) { updateDay(activeWk, dayIdx, e.target.value); }} style={Object.assign({}, inputS, { width: 52, textAlign: "center", fontWeight: 700 })} />
                <input value={(day.focus||"").toUpperCase()} onChange={function(e) { updateFocus(activeWk, dayIdx, e.target.value); }} style={Object.assign({}, inputS, { flex: 1, fontWeight: 700 })} placeholder="Session name..." />
                <button onClick={function() { removeDay(activeWk, dayIdx); }} style={{ background: "none", border: "none", color: "#E05252", fontSize: 18, cursor: "pointer", padding: "4px 6px", flexShrink: 0 }}>x</button>
              </div>
      <div style={{ marginBottom: 10 }}>
                {(function() {
                  // Group exercises by circuit label for visual display
                  var groups = [];
                  day.exercises.forEach(function(ex, exIdx) {
                    var label = getCircuitLabel(ex);
                    if (label && groups.length > 0 && groups[groups.length-1].label === label) {
                      groups[groups.length-1].items.push({ ex, exIdx });
                    } else {
                      groups.push({ label: label, items: [{ ex, exIdx }] });
                    }
                  });
                  return groups.map(function(group, gi) {
                    var isCircuit = !!group.label;
                    var circuitColors = ["#9B6FD4","#1B8C4E","#3B7DD8","#E0A020"];
                    var circuitIdx = groups.slice(0,gi).filter(function(g){return !!g.label;}).length;
                    var cc = circuitColors[circuitIdx % circuitColors.length];
                    return (
                      <div key={gi} style={isCircuit ? { border: "2px solid "+cc, borderRadius: 12, marginBottom: 10, overflow: "hidden" } : {}}>
                        {isCircuit && (
                          <div style={{ background: cc, padding: "5px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>⚡ CIRCUIT</span>
                              <input
                                value={group.label === "Circuit" ? "" : group.label}
                                onChange={function(e) {
                                  var newLabel = e.target.value || "Circuit";
                                  setDraft(function(prev) {
                                    var next = JSON.parse(JSON.stringify(prev));
                                    group.items.forEach(function(item) {
                                      next[activeWk].days[dayIdx].exercises[item.exIdx] = setCircuitLabel(item.ex, newLabel);
                                    });
                                    return next;
                                  });
                                }}
                                placeholder="Circuit name (optional)"
                                style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6, padding: "3px 8px", color: "#fff", fontSize: 11, outline: "none", width: 140 }}
                              />
                            </div>
                            <button onClick={function() {
                              setDraft(function(prev) {
                                var next = JSON.parse(JSON.stringify(prev));
                                group.items.forEach(function(item) {
                                  next[activeWk].days[dayIdx].exercises[item.exIdx] = stripCircuit(item.ex);
                                });
                                return next;
                              });
                            }} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Ungroup</button>
                          </div>
                        )}
                        {group.items.map(function(item, ii) {
                  var ex = item.ex; var exIdx = item.exIdx;
                  var total = day.exercises.length;
                  var parsed = parseExercise(ex);
                  return (
                    <div key={exIdx} style={{ marginBottom: isCircuit && ii < group.items.length-1 ? 0 : 8, background: isCircuit ? cc+"0A" : SURFACE, borderRadius: isCircuit ? 0 : 10, padding: "8px 10px", borderTop: isCircuit && ii > 0 ? "1px dashed "+cc+"44" : "none" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, flexShrink: 0 }}>
                          <button onClick={function() {
                            if (exIdx === 0) return;
                            setDraft(function(prev) {
                              var next = JSON.parse(JSON.stringify(prev));
                              var exs = next[activeWk].days[dayIdx].exercises;
                              var tmp = exs[exIdx]; exs[exIdx] = exs[exIdx-1]; exs[exIdx-1] = tmp;
                              return next;
                            });
                          }} style={{ background: "none", border: "none", cursor: exIdx === 0 ? "default" : "pointer", color: exIdx === 0 ? SURFACE2 : TEXT3, padding: "1px 3px", lineHeight: 1 }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
                          </button>
                          <div style={{ display: "flex", flexDirection: "column", gap: 1.5, padding: "1px 3px" }}>
                            <div style={{ width: 9, height: 1.5, background: TEXT3, borderRadius: 99 }} />
                            <div style={{ width: 9, height: 1.5, background: TEXT3, borderRadius: 99 }} />
                            <div style={{ width: 9, height: 1.5, background: TEXT3, borderRadius: 99 }} />
                          </div>
                          <button onClick={function() {
                            if (exIdx >= total - 1) return;
                            setDraft(function(prev) {
                              var next = JSON.parse(JSON.stringify(prev));
                              var exs = next[activeWk].days[dayIdx].exercises;
                              var tmp = exs[exIdx]; exs[exIdx] = exs[exIdx+1]; exs[exIdx+1] = tmp;
                              return next;
                            });
                          }} style={{ background: "none", border: "none", cursor: exIdx >= total - 1 ? "default" : "pointer", color: exIdx >= total - 1 ? SURFACE2 : TEXT3, padding: "1px 3px", lineHeight: 1 }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                          </button>
                        </div>
                        <input
                          value={parsed.name}
                          onChange={function(e) {
                            var cur = parseExercise(ex);
                            var newEx = e.target.value + (cur.sets ? " " + cur.sets + "x" + cur.reps : "");
                            updateExercise(activeWk, dayIdx, exIdx, newEx);
                          }}
                          style={Object.assign({}, inputS, { flex: 1, fontSize: 12, fontWeight: 600 })}
                          placeholder="Exercise name"
                        />
                        <button
                          onClick={function() {
                            var label = getCircuitLabel(ex);
                            var newLabel = label ? null : "Circuit";
                            // Find neighbours to group with
                            setDraft(function(prev) {
                              var next = JSON.parse(JSON.stringify(prev));
                              var exs = next[activeWk].days[dayIdx].exercises;
                              if (newLabel) {
                                // Group with adjacent circuit items or start new
                                var prevLabel = exIdx > 0 ? getCircuitLabel(exs[exIdx-1]) : null;
                                var nextLabel = exIdx < exs.length-1 ? getCircuitLabel(exs[exIdx+1]) : null;
                                var existingLabels = exs.map(getCircuitLabel).filter(Boolean);
                                var uniqueLabels = existingLabels.filter(function(l,i,a){return a.indexOf(l)===i;});
                                var defaultLabels = ["Circuit A","Circuit B","Circuit C","Circuit D"];
                                var usedDefaults = defaultLabels.filter(function(l){return uniqueLabels.indexOf(l)!==-1;});
                                var nextDefault = defaultLabels.find(function(l){return usedDefaults.indexOf(l)===-1;}) || "Circuit";
                                var useLabel = prevLabel || nextLabel || nextDefault;
                                exs[exIdx] = setCircuitLabel(exs[exIdx], useLabel);
                              } else {
                                exs[exIdx] = stripCircuit(exs[exIdx]);
                              }
                              return next;
                            });
                          }}
                          title={getCircuitLabel(ex) ? "Remove from circuit" : "Add to circuit"}
                          style={{ background: getCircuitLabel(ex) ? "#9B6FD4" : SURFACE, border: "1.5px solid "+(getCircuitLabel(ex) ? "#9B6FD4" : BORDER), color: getCircuitLabel(ex) ? "#fff" : TEXT3, borderRadius: 7, padding: "3px 7px", fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                          ⚡
                        </button>
                        <button onClick={function() { removeExercise(activeWk, dayIdx, exIdx); }} style={{ background: "none", border: "none", color: "#E05252", fontSize: 14, cursor: "pointer", padding: "2px 4px", flexShrink: 0 }}>x</button>
                      </div>
                      <div style={{ display: "flex", gap: 6, paddingLeft: 24 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: TEXT3, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, marginBottom: 3 }}>SETS</div>
                          <input
                            type="number"
                            value={parsed.sets || ""}
                            onChange={function(e) {
                              var cur = parseExercise(ex);
                              updateExercise(activeWk, dayIdx, exIdx, parsed.name + " " + (e.target.value || "3") + "x" + (cur.reps || "10"));
                            }}
                            placeholder="3"
                            style={Object.assign({}, inputS, { textAlign: "center", fontSize: 13, fontWeight: 700, padding: "6px 4px" })}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: TEXT3, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, marginBottom: 3 }}>REPS</div>
                          <input
                            type="number"
                            value={parsed.reps || ""}
                            onChange={function(e) {
                              var cur = parseExercise(ex);
                              updateExercise(activeWk, dayIdx, exIdx, parsed.name + " " + (cur.sets || "3") + "x" + (e.target.value || "10"));
                            }}
                            placeholder="10"
                            style={Object.assign({}, inputS, { textAlign: "center", fontSize: 13, fontWeight: 700, padding: "6px 4px" })}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                      </div>
                    );
                  });
                })()}
              </div>
      <button onClick={function() { setShowPicker(activeWk + "-" + dayIdx); }} style={{ width: "100%", padding: "8px", borderRadius: 10, background: "transparent", border: "1.5px dashed "+BORDER, color: TEXT3, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <span style={{ color: ORANGE, fontSize: 16 }}>+</span> Add Exercise
              </button>
            </div>
          );
        })}
      <button onClick={function() { addDay(activeWk); }} style={{ width: "100%", padding: "12px", borderRadius: 14, background: SURFACE, border: "1.5px dashed "+BORDER, color: TEXT2, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span style={{ color: ORANGE, fontSize: 18 }}>+</span> Add Training Day
        </button>
      </div>
    </div>
  );
}

function ProgramView({ program, color, isClient, initialDayIndex, onDayIndexUsed, onSaveSession, savedIds, weightOnly }) {
  const [wk, setWk]             = useState(0);
  const [modal, setModal]       = useState(null);
  const [exLogs, setExLogs]     = useState({});
  const [clientEdits, setClientEdits] = useState({});
  const [showPicker, setShowPicker]   = useState(null);
  const [favorites, setFavorites]     = useState({});
  const [dayOverrides, setDayOverrides] = useState({});
  const [editingDay, setEditingDay]     = useState(null);
  const [dayDraft, setDayDraft]         = useState("");
  // jumpDay: which day card to highlight/scroll to
  const [jumpDay, setJumpDay]   = useState(initialDayIndex !== null && initialDayIndex !== undefined ? initialDayIndex : null);
  const [dayOrders, setDayOrders] = useState({});
  const [exOrders, setExOrders]   = useState({});
  const [fullscreenDay, setFullscreenDay] = useState(null); // "wkIdx-dayIdx"

  function getDayOrder(wkIdx) {
    return dayOrders[wkIdx] || program[wkIdx].days.map(function(_, i) { return i; });
  }

  function moveDay(wkIdx, fromPos, dir) {
    var toPos = fromPos + dir;
    var order = getDayOrder(wkIdx).slice();
    if (toPos < 0 || toPos >= order.length) return;
    var tmp = order[fromPos]; order[fromPos] = order[toPos]; order[toPos] = tmp;
    setDayOrders(function(prev) { return Object.assign({}, prev, { [wkIdx]: order }); });
  } // { "wk-day": [reordered indices] }
  const c = color || ORANGE;

  function getExerciseOrder(wkIdx, dayIdx) {
    var dk = getDayKey(wkIdx, dayIdx);
    var exs = program[wkIdx].days[dayIdx].exercises;
    return exOrders[dk] || exs.map(function(_, i) { return i; });
  }

  function moveExerciseOrder(wkIdx, dayIdx, fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    var dk = getDayKey(wkIdx, dayIdx);
    var order = getExerciseOrder(wkIdx, dayIdx).slice();
    var item = order.splice(fromIdx, 1)[0];
    order.splice(toIdx, 0, item);
    setExOrders(function(prev) {
      return Object.assign({}, prev, { [dk]: order });
    });
  }

  // Clear jump after render
  if (jumpDay !== null && onDayIndexUsed) {
    setTimeout(function() { setJumpDay(null); onDayIndexUsed(); }, 800);
  }

  function getDayKey(wkIdx, dayIdx) { return wkIdx + "-" + dayIdx; }

  const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function moveExercise(wkIdx, dayIdx, fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    setClientEdits(function(prev) {
      var dk = getDayKey(wkIdx, dayIdx);
      var edits = prev[dk] || { added: [], removed: {} };
      var base = program[wkIdx].days[dayIdx].exercises.filter(function(_, j) { return !edits.removed[j]; });
      var allExs = base.concat(edits.added);
      var moved = allExs.slice();
      var item = moved.splice(fromIdx, 1)[0];
      moved.splice(toIdx, 0, item);
      var newRemoved = {};
      program[wkIdx].days[dayIdx].exercises.forEach(function(_, j) { newRemoved[j] = true; });
      return Object.assign({}, prev, { [dk]: { added: moved, removed: newRemoved } });
    });
  }

  function handleSave(key, data) {
    setExLogs(function(prev) {
      const next = Object.assign({}, prev);
      next[key] = data;
      return next;
    });
  }

  function removeExercise(wkIdx, dayIdx, exIdx) {
    const dk = getDayKey(wkIdx, dayIdx);
    setClientEdits(function(prev) {
      const next = Object.assign({}, prev);
      const day = Object.assign({ added: [], removed: {} }, next[dk]);
      day.removed = Object.assign({}, day.removed);
      day.removed[exIdx] = true;
      next[dk] = day;
      return next;
    });
  }

  function addExercise(wkIdx, dayIdx, exName) {
    const dk = getDayKey(wkIdx, dayIdx);
    setClientEdits(function(prev) {
      const next = Object.assign({}, prev);
      const day = Object.assign({ added: [], removed: {} }, next[dk]);
      day.added = day.added.concat([exName]);
      next[dk] = day;
      return next;
    });
    setShowPicker(null);
  }

  function undoRemove(wkIdx, dayIdx, exIdx) {
    const dk = getDayKey(wkIdx, dayIdx);
    setClientEdits(function(prev) {
      const next = Object.assign({}, prev);
      if (next[dk]) {
        const removed = Object.assign({}, next[dk].removed);
        delete removed[exIdx];
        next[dk] = Object.assign({}, next[dk], { removed: removed });
      }
      return next;
    });
  }

  function removeAdded(wkIdx, dayIdx, addedIdx) {
    const dk = getDayKey(wkIdx, dayIdx);
    setClientEdits(function(prev) {
      const next = Object.assign({}, prev);
      const day = Object.assign({ added: [], removed: {} }, next[dk]);
      day.added = day.added.filter(function(_, i) { return i !== addedIdx; });
      next[dk] = day;
      return next;
    });
  }

  function tapVideo(name) {
    setModal({ video: findVideo(name), name: name });
  }

  const week = program[wk];

  // Build fullscreen overlay content for a given day key
  function renderFullscreenDay() {
    if (!fullscreenDay) return null;
    var parts = fullscreenDay.split("-");
    var fwk = parseInt(parts[0]), fdayIdx = parseInt(parts[1]);
    var fday = program[fwk] && program[fwk].days[fdayIdx];
    if (!fday) return null;
    var focusColors = ["#1B8C4E","#3B7DD8","#1B8C4E"];
    var fc2 = focusColors[fdayIdx % focusColors.length];
    var edits2 = clientEdits[fullscreenDay] || { added: [], removed: {} };
    var order2 = exOrders[fullscreenDay] || fday.exercises.map(function(_,k){return k;});
    var visible2 = order2.filter(function(oi){ return !edits2.removed[oi]; });
    // Group circuits
    var groups2 = [];
    visible2.forEach(function(origIdx) {
      var ex = fday.exercises[origIdx];
      var label = getCircuitLabel(ex);
      if (label && groups2.length > 0 && groups2[groups2.length-1].label === label) {
        groups2[groups2.length-1].items.push(origIdx);
      } else {
        groups2.push({ label: label, items: [origIdx] });
      }
    });
    var circuitColors2 = ["#9B6FD4","#1B8C4E","#3B7DD8","#E0A020"];
    var circuitCount2 = 0;
    return (
      <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 500, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ background: fc2, padding: "14px 18px 12px", display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 10, flexShrink: 0 }}>
          <button onClick={function() { setFullscreenDay(null); }} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>{(fday.focus||"").toUpperCase()}</div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 }}>{visible2.length} exercises</div>
          </div>
          <div style={{ width: 36, flexShrink: 0 }} />
        </div>
        {/* Exercise list */}
        <div style={{ padding: "16px 16px 40px" }}>
          {groups2.map(function(group, gi) {
            var isCircuit = !!group.label;
            var cc2 = isCircuit ? circuitColors2[circuitCount2++ % circuitColors2.length] : null;
            return (
              <div key={gi} style={isCircuit ? { border: "2px solid "+cc2, borderRadius: 14, marginBottom: 14, overflow: "hidden" } : { marginBottom: 0 }}>
                {isCircuit && (
                  <div style={{ background: cc2, padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#fff", fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>⚡ {group.label === "Circuit" ? "CIRCUIT" : group.label.toUpperCase()}</span>
                    <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>— {group.items.length} exercises</span>
                  </div>
                )}
                {group.items.map(function(origIdx, ii) {
                  var ex = fday.exercises[origIdx];
                  var logKey = fwk+"-"+fdayIdx+"-"+origIdx;
                  return (
                    <div key={logKey} style={{ background: isCircuit ? cc2+"0A" : CARD, borderRadius: isCircuit ? 0 : 14, border: isCircuit ? "none" : "1.5px solid "+BORDER, borderTop: isCircuit && ii > 0 ? "1px dashed "+cc2+"55" : isCircuit ? "none" : "1.5px solid "+BORDER, marginBottom: isCircuit ? 0 : 10, padding: "4px 0" }}>
                      <ExerciseRow
                        ex={ex}
                        color={fc2}
                        isClient={isClient}
                        onTapVideo={function(name) { setModal({ video: findVideo(name), name: name }); }}
                        logKey={logKey}
                        savedData={exLogs[logKey] || null}
                        onSave={handleSave}
                        weightOnly={weightOnly}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
          {edits2.added.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: TEXT3, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>ADDED BY YOU</div>
              {edits2.added.map(function(addedEx, ai) {
                var key = fwk+"-"+fdayIdx+"-added-"+ai;
                return (
                  <div key={key} style={{ background: fc2+"0A", border: "1.5px solid "+fc2+"44", borderRadius: 12, marginBottom: 8 }}>
                    <ExerciseRow ex={addedEx} color={fc2} isClient={isClient} onTapVideo={function(name){setModal({video:findVideo(name),name:name});}} logKey={key} savedData={exLogs[key]||null} onSave={handleSave} weightOnly={weightOnly} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {renderFullscreenDay()}
      {modal ? <VideoModal video={modal.video} exName={modal.name} onClose={function() { setModal(null); }} /> : null}
      {showPicker ? (
        <ExercisePicker
          color={c}
          favorites={favorites}
          onAdd={function(name) {
            const parts = showPicker.split("-");
            addExercise(parseInt(parts[0]), parseInt(parts[1]), name);
          }}
          onClose={function() { setShowPicker(null); }}
        />
      ) : null}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {program.map(function(w, i) {
          const active = wk === i;
          return (
            <button key={"wk-client-"+i} onClick={function() { setWk(i); }} style={{ flex: 1, padding: "10px 0", borderRadius: 12, background: active ? c : CARD, border: "1.5px solid "+(active ? c : BORDER), color: active ? "#fff" : TEXT2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Week {w.week}
            </button>
          );
        })}
      </div>
      <div>
      {getDayOrder(wk).map(function(origDayIdx, pos) {
        var day = week.days[origDayIdx];
        var total = getDayOrder(wk).length;
        const focusColors = ["#1B8C4E","#3B7DD8","#1B8C4E"];
        const fc = focusColors[origDayIdx % focusColors.length];
        const dk = getDayKey(wk, origDayIdx);
        const edits = clientEdits[dk] || { added: [], removed: {} };
        const hasEdits = Object.keys(edits.removed).length > 0 || edits.added.length > 0;

        return (
          <div key={origDayIdx} style={{ display: "flex", gap: isClient ? 8 : 0, alignItems: "flex-start", marginBottom: 12 }}>
            {isClient && !weightOnly && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 14, flexShrink: 0 }}>
              <button onClick={function() { moveDay(wk, pos, -1); }} disabled={pos === 0} style={{ background: pos === 0 ? SURFACE : CARD, border: "1.5px solid "+(pos === 0 ? SURFACE2 : BORDER), borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: pos === 0 ? "default" : "pointer" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={pos === 0 ? TEXT3 : TEXT} strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
              </button>
              <button onClick={function() { moveDay(wk, pos, 1); }} disabled={pos >= total - 1} style={{ background: pos >= total - 1 ? SURFACE : CARD, border: "1.5px solid "+(pos >= total - 1 ? SURFACE2 : BORDER), borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: pos >= total - 1 ? "default" : "pointer" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={pos >= total - 1 ? TEXT3 : TEXT} strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            )}
          <div style={{ flex: 1, background: CARD, borderRadius: 16, padding: "16px", border: "1.5px solid "+(jumpDay === origDayIdx ? c : hasEdits ? c+"66" : BORDER), transition: "border-color 0.3s", boxShadow: jumpDay === origDayIdx ? "0 0 0 3px "+c+"33" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: fc+"15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={fc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="6" y1="5" x2="6" y2="19"/><line x1="18" y1="5" x2="18" y2="19"/><line x1="3" y1="8" x2="9" y2="8"/><line x1="15" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="9" y2="16"/><line x1="15" y1="16" x2="21" y2="16"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ color: TEXT, fontSize: 15, fontWeight: 700 }}>{(day.focus||"").toUpperCase()}</div>
                  <button
                    onClick={function() { setFullscreenDay(getDayKey(wk, origDayIdx)); }}
                    title="Expand to full screen"
                    style={{ background: fc+"18", border: "none", borderRadius: 7, padding: "4px 7px", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={fc} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                    <span style={{ color: fc, fontSize: 10, fontWeight: 700 }}>Expand</span>
                  </button>
                </div>
                {isClient && editingDay === getDayKey(wk, origDayIdx) ? (
                  <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                    {DAYS_OF_WEEK.map(function(d) {
                      const isSelected = (dayOverrides[getDayKey(wk, origDayIdx)] || day.day) === d;
                      return (
                        <button key={d} onClick={function() {
                          setDayOverrides(function(prev) {
                            return Object.assign({}, prev, { [getDayKey(wk, origDayIdx)]: d });
                          });
                          setEditingDay(null);
                        }} style={{ padding: "4px 8px", borderRadius: 8, background: isSelected ? c : SURFACE, border: "1.5px solid "+(isSelected ? c : BORDER), color: isSelected ? "#fff" : TEXT2, fontSize: 11, fontWeight: isSelected ? 700 : 500, cursor: "pointer" }}>
                          {d}
                        </button>
                      );
                    })}
                    <button onClick={function() { setEditingDay(null); }} style={{ padding: "4px 8px", borderRadius: 8, background: "none", border: "none", color: TEXT3, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ color: TEXT3, fontSize: 12 }}>{dayOverrides[getDayKey(wk, origDayIdx)] || day.day}</span>
                    {isClient && !weightOnly && (
                      <button onClick={function() { setEditingDay(getDayKey(wk, origDayIdx)); }} style={{ background: c+"18", border: "none", color: c, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6, cursor: "pointer", lineHeight: 1.6 }}>
                        Change day
                      </button>
                    )}
                  </div>
                )}
              </div>
              {onSaveSession && (
                <div style={{ marginLeft: "auto" }}>
                  {(function() {
                    var sid = "coach-" + wk + "-" + day.day + "-" + day.focus;
                    var sid2 = "lib-" + wk + "-" + day.focus + "-" + day.day;
                    var isSaved = savedIds && (savedIds.indexOf(sid) !== -1 || savedIds.indexOf(sid2) !== -1);
                    return (
                      <button onClick={function() { onSaveSession(day, wk); }} style={{ background: isSaved ? c : SURFACE, border: "1.5px solid "+(isSaved ? c : BORDER), borderRadius: 10, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill={isSaved ? "#fff" : "none"} stroke={isSaved ? "#fff" : TEXT2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                        <span style={{ color: isSaved ? "#fff" : TEXT2, fontSize: 11, fontWeight: 600 }}>{isSaved ? "Saved" : "Save"}</span>
                      </button>
                    );
                  })()}
                </div>
              )}
              {isClient && hasEdits && !onSaveSession && (
                <div style={{ marginLeft: "auto" }}>
                  <span style={{ background: c+"18", color: c, fontSize: 10, padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>Customized</span>
                </div>
              )}
            </div>

              {(day.exercises.map(function(ex, j) {
                var logKey = wk + "-" + origDayIdx + "-" + j;
                var order = exOrders[getDayKey(wk,origDayIdx)] || day.exercises.map(function(_,k){return k;});
                return null; // rendered below via ordered list
              }), null)}
              {(function(){
                var order = exOrders[getDayKey(wk,origDayIdx)] || day.exercises.map(function(_,k){return k;});
                var visibleOrder = order.filter(function(oi){ return !edits.removed[oi]; });
                var total = visibleOrder.length;
                // Group into circuits
                var groups = [];
                visibleOrder.forEach(function(origIdx) {
                  var ex = day.exercises[origIdx];
                  var label = getCircuitLabel(ex);
                  if (label && groups.length > 0 && groups[groups.length-1].label === label) {
                    groups[groups.length-1].items.push(origIdx);
                  } else {
                    groups.push({ label: label, items: [origIdx] });
                  }
                });
                var circuitColors = ["#9B6FD4","#1B8C4E","#3B7DD8","#E0A020"];
                var circuitCount = 0;
                return groups.map(function(group, gi) {
                  var isCircuit = !!group.label;
                  var cc = isCircuit ? circuitColors[circuitCount++ % circuitColors.length] : null;
                  var groupPos = visibleOrder.indexOf(group.items[0]);
                  return (
                    <div key={gi} style={isCircuit ? { border: "2px solid "+cc, borderRadius: 14, marginBottom: 10, overflow: "hidden" } : {}}>
                      {isCircuit && (
                        <div style={{ background: cc, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>⚡ {group.label === "Circuit" ? "CIRCUIT" : group.label.toUpperCase()}</span>
                          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>— {group.items.length} exercises, no rest between</span>
                        </div>
                      )}
                      {group.items.map(function(origIdx, ii) {
                  var ex = day.exercises[origIdx];
                  var pos = visibleOrder.indexOf(origIdx);
                  var logKey = wk+"-"+origDayIdx+"-"+origIdx;
                  return (
                    <div key={logKey} style={{ display:"flex", alignItems:"center", gap:6, borderTop: isCircuit ? (ii > 0 ? "1px dashed "+cc+"55" : "none") : (pos>0 ? "1px solid "+SURFACE2 : "none"), background: isCircuit ? cc+"08" : "none" }}>
                      {isClient && !weightOnly && (
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0, padding:"4px 0 4px 6px" }}>
                          <button
                            onClick={function(){
                              if (pos === 0) return;
                              var cur = exOrders[getDayKey(wk,origDayIdx)] || day.exercises.map(function(_,k){return k;});
                              var vis = cur.filter(function(oi){ return !edits.removed[oi]; });
                              var tmp = vis[pos]; vis[pos] = vis[pos-1]; vis[pos-1] = tmp;
                              var removed = cur.filter(function(oi){ return !!edits.removed[oi]; });
                              moveExerciseOrder(wk, origDayIdx, pos, pos-1);
                            }}
                            style={{ background:"none", border:"none", cursor: pos===0?"default":"pointer", color: pos===0?SURFACE2:TEXT3, padding:"2px 4px", lineHeight:1 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
                          </button>
                          <div style={{ display:"flex", flexDirection:"column", gap:2, padding:"2px 4px" }}>
                            <div style={{ width:10, height:1.5, background:TEXT3, borderRadius:99 }}/>
                            <div style={{ width:10, height:1.5, background:TEXT3, borderRadius:99 }}/>
                            <div style={{ width:10, height:1.5, background:TEXT3, borderRadius:99 }}/>
                          </div>
                          <button
                            onClick={function(){
                              if (pos >= total-1) return;
                              var cur = exOrders[getDayKey(wk,origDayIdx)] || day.exercises.map(function(_,k){return k;});
                              var vis = cur.filter(function(oi){ return !edits.removed[oi]; });
                              var tmp = vis[pos]; vis[pos] = vis[pos+1]; vis[pos+1] = tmp;
                              var removed = cur.filter(function(oi){ return !!edits.removed[oi]; });
                              setExOrders(function(p){ return Object.assign({},p,{[getDayKey(wk,origDayIdx)]: vis.concat(removed)}); });
                            }}
                            style={{ background:"none", border:"none", cursor: pos>=total-1?"default":"pointer", color: pos>=total-1?SURFACE2:TEXT3, padding:"2px 4px", lineHeight:1 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                          </button>
                        </div>
                      )}
                      <div style={{ flex:1 }}>
                        <ExerciseRow ex={ex} color={c} isClient={isClient} onTapVideo={tapVideo} logKey={logKey} savedData={exLogs[logKey]||null} onSave={handleSave} weightOnly={weightOnly} />
                      </div>
                      {isClient && !weightOnly && (
                        <button onClick={function(){ removeExercise(wk,origDayIdx,origIdx); }} style={{ background:"none", border:"none", color:"#E05252", fontSize:16, cursor:"pointer", padding:"4px 6px", flexShrink:0, lineHeight:1 }}>x</button>
                      )}
                    </div>
                  );
                })}
                    </div>
                  );
                });
              })()}
{edits.added.map(function(addedEx, ai) {
              const key = wk + "-" + origDayIdx + "-added-" + ai;
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid "+SURFACE2, background: c+"08", borderRadius: 8, marginTop: 4 }}>
                  {isClient && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, flexShrink: 0, padding: "4px 0 4px 6px" }}>
                      <button onClick={function() {
                        if (ai === 0) return;
                        setClientEdits(function(prev) {
                          var dk = getDayKey(wk, origDayIdx);
                          var e2 = Object.assign({added:[], removed:{}}, prev[dk]);
                          var arr = e2.added.slice();
                          var tmp = arr[ai]; arr[ai] = arr[ai-1]; arr[ai-1] = tmp;
                          return Object.assign({}, prev, {[dk]: Object.assign({}, e2, {added: arr})});
                        });
                      }} style={{ background:"none", border:"none", cursor: ai===0?"default":"pointer", color: ai===0?SURFACE2:TEXT3, padding:"2px 3px", lineHeight:1 }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
                      </button>
                      <div style={{ display:"flex", flexDirection:"column", gap:1.5, padding:"2px 3px" }}>
                        <div style={{ width:9, height:1.5, background:TEXT3, borderRadius:99 }}/>
                        <div style={{ width:9, height:1.5, background:TEXT3, borderRadius:99 }}/>
                        <div style={{ width:9, height:1.5, background:TEXT3, borderRadius:99 }}/>
                      </div>
                      <button onClick={function() {
                        if (ai >= edits.added.length - 1) return;
                        setClientEdits(function(prev) {
                          var dk = getDayKey(wk, origDayIdx);
                          var e2 = Object.assign({added:[], removed:{}}, prev[dk]);
                          var arr = e2.added.slice();
                          var tmp = arr[ai]; arr[ai] = arr[ai+1]; arr[ai+1] = tmp;
                          return Object.assign({}, prev, {[dk]: Object.assign({}, e2, {added: arr})});
                        });
                      }} style={{ background:"none", border:"none", cursor: ai>=edits.added.length-1?"default":"pointer", color: ai>=edits.added.length-1?SURFACE2:TEXT3, padding:"2px 3px", lineHeight:1 }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <ExerciseRow
                      ex={addedEx}
                      color={c}
                      isClient={isClient}
                      onTapVideo={tapVideo}
                      logKey={key}
                      savedData={exLogs[key] || null}
                      onSave={handleSave}
                      defaultOpen={isClient && !(exLogs[key])}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, paddingRight: 4 }}>
                    <span style={{ background: c+"20", color: c, fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>New</span>
                    {isClient && (
                      <button onClick={function() { removeAdded(wk, origDayIdx, ai); }} style={{ background: "none", border: "none", color: "#E05252", fontSize: 16, cursor: "pointer", padding: "4px 4px", lineHeight: 1 }}>x</button>
                    )}
                  </div>
                </div>
              );
            })}
          {isClient && !weightOnly ? (
              <button onClick={function() { setShowPicker(getDayKey(wk, origDayIdx)); }} style={{ width: "100%", marginTop: 10, padding: "9px", borderRadius: 10, background: "transparent", border: "1.5px dashed "+BORDER, color: TEXT3, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span style={{ color: c, fontSize: 16 }}>+</span> Add Exercise
              </button>
            ) : null}
          </div>
          </div>
        );
      })}
      </div>

      <div style={{ background: ORANGE_BG, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: c, fontSize: 12, fontWeight: 500 }}>
          {isClient ? "Tap x to remove, + to add exercises to your program" : "Tap any exercise to watch a demo"}
        </span>
      </div>
    </div>
  );
}

// ---
const PICKER_EXERCISES = [
  { name: "Bench Press",       cat: "Chest",     icon: ICON_WORKOUT },
  { name: "Incline DB Press",  cat: "Chest",     icon: ICON_WORKOUT },
  { name: "Dips",              cat: "Chest",     icon: ICON_WORKOUT },
  { name: "Barbell Squat",     cat: "Legs",      icon: ICON_WORKOUT },
  { name: "Front Squat",       cat: "Legs",      icon: ICON_WORKOUT },
  { name: "Romanian Deadlift", cat: "Legs",      icon: ICON_WORKOUT },
  { name: "Leg Press",         cat: "Legs",      icon: ICON_WORKOUT },
  { name: "Leg Curl",          cat: "Legs",      icon: ICON_WORKOUT },
  { name: "Walking Lunges",    cat: "Legs",      icon: ICON_WORKOUT },
  { name: "Hip Thrust",        cat: "Legs",      icon: ICON_WORKOUT },
  { name: "Calf Raises",       cat: "Legs",      icon: ICON_WORKOUT },
  { name: "Deadlift",          cat: "Back",      icon: ICON_WORKOUT },
  { name: "Barbell Row",       cat: "Back",      icon: ICON_WORKOUT },
  { name: "Pull-Ups",          cat: "Back",      icon: ICON_WORKOUT },
  { name: "Lat Pulldown",      cat: "Back",      icon: ICON_WORKOUT },
  { name: "Nordic Curl",       cat: "Back",      icon: ICON_WORKOUT },
  { name: "Overhead Press",    cat: "Shoulders", icon: ICON_WORKOUT },
  { name: "Arnold Press",      cat: "Shoulders", icon: ICON_WORKOUT },
  { name: "Face Pulls",        cat: "Shoulders", icon: ICON_WORKOUT },
  { name: "Hammer Curls",      cat: "Arms",      icon: ICON_WORKOUT },
];
const PICKER_CATS = ["All","Favorites","Chest","Back","Legs","Shoulders","Arms"];

function ExercisePicker({ color, onAdd, onClose, favorites }) {
  const c = color || ORANGE;
  const [search, setSearch] = useState("");
  const [cat, setCat]       = useState("All");
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const filtered = PICKER_EXERCISES.filter(function(e) {
    if (cat === "Favorites") return !!(favorites && favorites[e.name]);
    return (cat === "All" || e.cat === cat) &&
      (search === "" || e.name.toLowerCase().indexOf(search.toLowerCase()) !== -1);
  });
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,23,20,0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 500 }} onClick={onClose}>
      <div style={{ background: BG, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 430, maxHeight: "80vh", display: "flex", flexDirection: "column" }} onClick={function(e) { e.stopPropagation(); }}>
        <div style={{ width: 36, height: 4, background: BORDER, borderRadius: 99, margin: "12px auto 0", flexShrink: 0 }} />
        <div style={{ padding: "14px 18px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ color: TEXT, fontSize: 17, fontWeight: 700 }}>Add Exercise</div>
          <button onClick={onClose} style={{ background: SURFACE, border: "none", color: TEXT2, width: 32, height: 32, borderRadius: 99, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
        </div>
        <div style={{ padding: "0 16px 10px", flexShrink: 0 }}>
          {cat !== "Favorites" && (
            <div style={{ position: "relative" }}>
              <input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="Search exercises..." style={{ width: "100%", background: CARD, border: "1.5px solid "+BORDER, borderRadius: 11, padding: "10px 14px 10px 36px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: TEXT3, fontSize: 14 }}><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span></span>
            </div>
          )}
        </div>
        <div style={{ padding: "0 16px 10px", display: "flex", gap: 6, flexShrink: 0, overflowX: "auto" }}>
          {PICKER_CATS.map(function(ct) {
            const active = cat === ct;
            const isFavTab = ct === "Favorites";
            const favCount = favorites ? Object.values(favorites).filter(Boolean).length : 0;
            return (
              <button key={ct} onClick={function() { setCat(ct); setSearch(""); }} style={{ padding: "5px 13px", borderRadius: 99, background: active ? (isFavTab ? "#F5C518" : c) : SURFACE, border: "none", color: active ? (isFavTab ? "#000" : "#fff") : TEXT2, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
                {isFavTab ? (<svg width="12" height="12" viewBox="0 0 24 24" fill={active ? "#000" : "#F5C518"} stroke={active ? "#000" : "#F5C518"} strokeWidth="1.5" style={{marginRight:3,verticalAlign:"middle"}}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>) : ""}{ct}{isFavTab && favCount > 0 ? " ("+favCount+")" : ""}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
          {cat === "Favorites" && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: TEXT3 }}>
              <div style={{ marginBottom: 10 }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D0D0D0" strokeWidth="1.5"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg></div>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>No favorites yet</div>
              <div style={{ fontSize: 12 }}>Go to the Exercise Library and tap * on exercises to save them here</div>
            </div>
          )}
          {filtered.map(function(ex) {
            const isFav = !!(favorites && favorites[ex.name]);
            return (
              <div key={ex.name} onClick={function() { onAdd(ex.name); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: CARD, border: "1.5px solid "+(isFav ? "#F5C51866" : BORDER), borderRadius: 13, marginBottom: 8, cursor: "pointer" }}
                onMouseEnter={function(e) { e.currentTarget.style.borderColor = c; e.currentTarget.style.background = c+"0d"; }}
                onMouseLeave={function(e) { e.currentTarget.style.borderColor = isFav ? "#F5C51866" : BORDER; e.currentTarget.style.background = CARD; }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>{ex.name}</div>
                  <div style={{ color: TEXT3, fontSize: 11, marginTop: 2 }}>{ex.cat}</div>
                </div>
                <div style={{ width: 28, height: 28, borderRadius: 99, background: c, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#fff", fontSize: 18, lineHeight: 1 }}>+</span>
                </div>
              </div>
            );
          })}
          {!customMode ? (
            <div onClick={function() { setCustomMode(true); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: CARD, border: "1.5px dashed "+BORDER, borderRadius: 13, marginBottom: 16, cursor: "pointer" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: SURFACE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>+</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: TEXT2, fontSize: 14, fontWeight: 600 }}>Custom Exercise</div>
                <div style={{ color: TEXT3, fontSize: 11, marginTop: 2 }}>Add your own</div>
              </div>
            </div>
          ) : (
            <div style={{ background: CARD, border: "1.5px solid "+c, borderRadius: 13, padding: "14px", marginBottom: 16 }}>
              <div style={{ color: TEXT2, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>CUSTOM EXERCISE NAME</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={customName} onChange={function(e) { setCustomName(e.target.value); }} placeholder="e.g. Cable Fly..." style={{ flex: 1, background: SURFACE, border: "1.5px solid "+BORDER, borderRadius: 10, padding: "10px 12px", color: TEXT, fontSize: 13, outline: "none" }} />
                <button onClick={function() { if (customName.trim()) { onAdd(customName.trim()); setCustomMode(false); setCustomName(""); } }} style={{ padding: "10px 16px", borderRadius: 10, background: c, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add</button>
              </div>
              <button onClick={function() { setCustomMode(false); }} style={{ marginTop: 8, background: "none", border: "none", color: TEXT3, fontSize: 12, cursor: "pointer" }}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function WorkoutFullscreenModal({ workout, color, onClose }) {
  var c = color || ORANGE;
  if (!workout) return null;
  var focusColors = { push: "#1B8C4E", pull: "#3B7DD8", leg: "#1B8C4E", upper: "#1B8C4E", lower: "#1B8C4E", full: "#9B6FD4", cardio: "#3B7DD8", core: "#E0A020" };
  var headerColor = Object.keys(focusColors).find(function(k) { return workout.name.toLowerCase().indexOf(k) !== -1; });
  var hc = headerColor ? focusColors[headerColor] : c;
  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 500, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ background: hc, padding: "14px 18px 16px", display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 10, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          {workout.fromLibrary && (
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 2 }}>FROM LIBRARY</div>
          )}
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>{(workout.name||"").toUpperCase()}</div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 1 }}>{workout.exercises.length} exercise{workout.exercises.length !== 1 ? "s" : ""}</div>
        </div>
        <div style={{ width: 36, flexShrink: 0 }} />
      </div>
      {/* Exercise list */}
      <div style={{ padding: "16px 16px 40px" }}>
        {(function() {
          // Build circuit groups
          var CIRCUIT_COLORS = ["#9B6FD4","#1B8C4E","#3B7DD8","#E0A020","#E05252"];
          function cColor(label) {
            var idx = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf((label||"A").toUpperCase());
            return CIRCUIT_COLORS[Math.max(0,idx) % CIRCUIT_COLORS.length];
          }
          var groups = [];
          workout.exercises.forEach(function(ex, i) {
            var exName = typeof ex === "string" ? ex.replace(/^\[C:[^\]]*\]\s*/, "") : ex.name;
            var cl = typeof ex === "string" ? getCircuitLabel(ex) : (ex.circuit || "");
            var sets = typeof ex === "object" ? ex.sets : "";
            var reps = typeof ex === "object" ? ex.reps : "";
            var weight = typeof ex === "object" ? ex.weight : "";
            var item = { exName, cl, sets, reps, weight, i };
            if (cl && groups.length > 0 && groups[groups.length-1].label === cl) {
              groups[groups.length-1].items.push(item);
            } else {
              groups.push({ label: cl, items: [item] });
            }
          });
          return groups.map(function(group, gi) {
            var isCircuit = !!group.label;
            var cc = isCircuit ? cColor(group.label) : null;
            var inner = group.items.map(function(item) {
              var hasVid = !!findVideo(item.exName);
              return (
                <div key={item.exName+"-"+item.i} style={{ background: isCircuit ? cc+"0A" : CARD, borderRadius: isCircuit ? 0 : 14, border: isCircuit ? "none" : "1.5px solid "+BORDER, padding: "14px 16px", marginBottom: isCircuit ? 0 : 10, borderTop: isCircuit && group.items.indexOf(item) > 0 ? "1px dashed "+cc+"44" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 99, background: hasVid ? hc : TEXT3, flexShrink: 0, marginTop: 1 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: TEXT, fontSize: 15, fontWeight: 700 }}>{item.exName}</div>
                      <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                        {item.sets && <span style={{ color: TEXT3, fontSize: 12 }}>{item.sets} sets</span>}
                        {item.reps && <span style={{ color: TEXT3, fontSize: 12 }}>× {item.reps} reps</span>}
                        {item.weight && <span style={{ color: hc, fontSize: 12, fontWeight: 600 }}>{item.weight} lbs</span>}
                      </div>
                    </div>
                    {hasVid && <span style={{ background: hc+"18", color: hc, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>▶ Watch</span>}
                  </div>
                </div>
              );
            });
            if (isCircuit) {
              return (
                <div key={"grp"+gi} style={{ border: "2px solid "+cc, borderRadius: 14, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{ background: cc, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>⚡ CIRCUIT {group.label}</span>
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, marginLeft: "auto" }}>{group.items.length} exercises · no rest</span>
                  </div>
                  {inner}
                </div>
              );
            }
            return <div key={"grp"+gi}>{inner}</div>;
          });
        })()}
      </div>
    </div>
  );
}

function MyWorkouts({ color, favorites, importedWorkouts, customWorkouts, setCustomWorkouts }) {
  const c = color || ORANGE;
  const workouts = customWorkouts || [];
  const [building, setBuilding]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [wkName, setWkName]         = useState("");
  const [exercises, setExercises]   = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [fullscreenWk, setFullscreenWk] = useState(null);
  const [exLogs, setExLogs]         = useState({});
  const [videoModal, setVideoModal] = useState(null);

  var CIRCUIT_COLORS = ["#9B6FD4","#1B8C4E","#3B7DD8","#E0A020","#E05252"];

  function circuitColor(label) {
    var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var idx = letters.indexOf((label || "A").toUpperCase());
    return CIRCUIT_COLORS[Math.max(0, idx) % CIRCUIT_COLORS.length];
  }

  function logWeight(key, val) {
    setExLogs(function(prev) { return Object.assign({}, prev, { [key]: val }); });
  }

  var importedList = (importedWorkouts || []).map(function(iw) {
    var exs = iw.exercises.map(function(ex) {
      if (typeof ex === "string") {
        var cl = getCircuitLabel(ex);
        var p = parseExStr(ex);
        return { name: p.name, sets: p.sets, reps: p.reps, weight: "", circuit: cl || "" };
      }
      return Object.assign({}, ex);
    });
    return { id: iw.id, name: iw.name, exercises: exs, fromLibrary: true };
  });
  var allWorkouts = workouts.concat(importedList.filter(function(i) {
    return !workouts.find(function(w) { return String(w.id) === String(i.id); });
  }));

  function parseExStr(ex) {
    var s = (typeof ex === "string" ? ex : ex.name || "").replace(/^\[C:[^\]]*\]\s*/, "");
    var m = s.match(/^(.+?)\s+(\d+)[xX×](\d+)/);
    return m ? {name:m[1].trim(),sets:m[2],reps:m[3]} : {name:s.trim(),sets:"",reps:""};
  }

  function buildGroups(exs) {
    var groups = [];
    exs.forEach(function(ex, i) {
      var cl = ex.circuit || "";
      if (cl && groups.length > 0 && groups[groups.length-1].label === cl) {
        groups[groups.length-1].items.push({ ex: ex, idx: i });
      } else {
        groups.push({ label: cl, items: [{ ex: ex, idx: i }], color: cl ? circuitColor(cl) : null });
      }
    });
    return groups;
  }

  function startEdit(w) {
    setEditingId(w.id);
    setWkName(w.name);
    setExercises(w.exercises.map(function(e) { return Object.assign({}, e); }));
    setBuilding(true);
  }
  function startNew() {
    setEditingId(null); setWkName(""); setExercises([]); setBuilding(true);
  }
  function addExercise(name) {
    setExercises(function(prev) { return prev.concat([{ name: name, sets: "", reps: "", weight: "", circuit: "" }]); });
    setShowPicker(false);
  }
  function updateEx(idx, field, val) {
    setExercises(function(prev) { return prev.map(function(e, i) { return i === idx ? Object.assign({}, e, { [field]: val }) : e; }); });
  }
  function removeEx(idx) {
    setExercises(function(prev) { return prev.filter(function(_, i) { return i !== idx; }); });
  }
  function moveEx(idx, dir) {
    setExercises(function(prev) {
      var arr = prev.slice();
      var to = idx + dir;
      if (to < 0 || to >= arr.length) return arr;
      var tmp = arr[idx]; arr[idx] = arr[to]; arr[to] = tmp;
      return arr;
    });
  }
  function toggleCircuit(idx) {
    setExercises(function(prev) {
      var exs = prev.slice();
      var ex = exs[idx];
      if (ex.circuit) {
        exs[idx] = Object.assign({}, ex, { circuit: "" });
      } else {
        var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var prevC = idx > 0 ? exs[idx-1].circuit : "";
        var nextC = idx < exs.length-1 ? exs[idx+1].circuit : "";
        var joinLabel = prevC || nextC;
        if (joinLabel) {
          exs[idx] = Object.assign({}, ex, { circuit: joinLabel });
        } else {
          var used = exs.map(function(e){return e.circuit;}).filter(Boolean);
          var label = letters.split("").find(function(l){return used.indexOf(l)===-1;}) || "A";
          exs[idx] = Object.assign({}, ex, { circuit: label });
        }
      }
      return exs;
    });
  }

  function saveWorkout() {
    if (!wkName.trim() || exercises.length === 0) return;
    var saved = exercises.map(function(e) { return Object.assign({}, e); });
    var eid = editingId;
    if (eid !== null && eid !== undefined) {
      setCustomWorkouts(function(prev) {
        var found = prev.some(function(w) { return String(w.id) === String(eid); });
        if (found) {
          return prev.map(function(w) {
            return String(w.id) === String(eid) ? { id: w.id, name: wkName.trim(), exercises: saved } : w;
          });
        } else {
          // Was editing an imported workout — add as new custom
          return prev.concat([{ id: eid, name: wkName.trim(), exercises: saved }]);
        }
      });
    } else {
      setCustomWorkouts(function(prev) { return prev.concat([{ id: Date.now(), name: wkName.trim(), exercises: saved }]); });
    }
    setWkName(""); setExercises([]); setBuilding(false); setEditingId(null);
  }
  function deleteWorkout(id) {
    setCustomWorkouts(function(prev) { return prev.filter(function(w) { return String(w.id) !== String(id); }); });
  }
  function cancelEdit() {
    setBuilding(false); setEditingId(null); setWkName(""); setExercises([]);
  }

  var ACCENT = ["#1B8C4E","#3B7DD8","#9B6FD4","#E0A020","#E05252","#1B8C4E"];
  function ac(i) { return ACCENT[i % ACCENT.length]; }

  const inputS = { background: "#F0F5F2", border: "1.5px solid #E8E4DE", borderRadius: 8, padding: "8px 10px", color: "#0A1A0F", fontSize: 13, outline: "none", boxSizing: "border-box" };

  if (videoModal) {
    return <VideoModal video={videoModal.video} exName={videoModal.name} onClose={function(){setVideoModal(null);}} />;
  }

  if (fullscreenWk) {
    return <WorkoutFullscreenModal workout={fullscreenWk} color={c} onClose={function() { setFullscreenWk(null); }} />;
  }

  if (showPicker) {
    return <ExercisePicker color={c} onAdd={addExercise} onClose={function() { setShowPicker(false); }} favorites={favorites} />;
  }

  return (
    <div style={{ background: "#F0F5F2", margin: "0 -16px", padding: "16px 16px 24px" }}>

      {/* Workout cards */}
      {allWorkouts.map(function(w, wi) {
        var dc = ac(wi);
        var groups = buildGroups(w.exercises);
        var isEditing = editingId === w.id && building;
        return (
          <div key={w.id} style={{ background: "#fff", borderRadius: 20, overflow: "hidden", marginBottom: 12, border: "1.5px solid "+dc+"66", boxShadow: "0 4px 20px "+dc+"22" }}>
            {/* Accent bar */}
            <div style={{ height: 3, background: dc, width: "100%" }} />
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px 10px" }}>
              <div style={{ flex: 1 }}>
                {w.fromLibrary && <div style={{ color: dc, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 3 }}>FROM LIBRARY</div>}
                <div style={{ color: "#0A1A0F", fontSize: 20, fontWeight: 900, lineHeight: 1.1 }}>{w.name.toUpperCase()}</div>
                <div style={{ color: "#7AAB8A", fontSize: 12, marginTop: 3 }}>{w.exercises.length} exercise{w.exercises.length !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {!building && <button onClick={function(e){e.stopPropagation();startEdit(w);}} style={{ background: dc+"15", border: "1.5px solid "+dc+"44", borderRadius: 8, padding: "6px 12px", color: dc, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{ICON_PENCIL ? <span style={{display:"flex",alignItems:"center",gap:4}} dangerouslySetInnerHTML={{__html: ICON_PENCIL+' Edit'}} /> : "Edit"}</button>}
                {!building && <button onClick={function(e){e.stopPropagation();deleteWorkout(w.id);}} style={{ background: "none", border: "none", color: "#E05252", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>}
                {isEditing && <span style={{ background: dc, color: "#fff", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6 }}>Editing</span>}
              </div>
            </div>
            {/* Exercise list */}
            <div style={{ padding: "0 16px 14px" }}>
              {groups.map(function(group, gi) {
                var isCircuit = !!group.label;
                var cc = group.color;
                var inner = group.items.map(function(item) {
                  var ex = item.ex; var idx = item.idx;
                  var vid = findVideo(ex.name);
                  return (
                    <div key={"ex"+idx} style={{ padding: "9px 0", borderBottom: "1px solid #F0EFEC" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: isCircuit ? cc+"18" : "#F0F5F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: isCircuit ? cc : "#7AAB8A", fontFamily: "monospace", flexShrink: 0 }}>{idx+1}</div>
                        <div style={{ color: "#0A1A0F", fontSize: 14, fontWeight: 500, flex: 1 }}>{ex.name}</div>
                        {ex.sets && ex.reps && <div style={{ fontSize: 11, fontWeight: 600, color: "#7AAB8A", background: "#F0F5F2", padding: "4px 8px", borderRadius: 8, fontFamily: "monospace", flexShrink: 0 }}>{ex.sets}×{ex.reps}</div>}
                        <input type="number" placeholder="lbs" value={exLogs[w.id+"-"+idx]||""} onChange={function(e){logWeight(w.id+"-"+idx, e.target.value);}} style={{ width: 52, background: "#F0F5F2", border: "1.5px solid #E8E4DE", borderRadius: 8, padding: "4px 6px", fontSize: 11, fontWeight: 600, color: "#0A1A0F", textAlign: "center", outline: "none", flexShrink: 0 }} />
                        {vid && <button onClick={function(){setVideoModal({video:vid,name:ex.name});}} style={{ background: dc+"18", border: "none", borderRadius: 7, padding: "4px 8px", color: dc, fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>▶</button>}
                      </div>
                    </div>
                  );
                });
                if (isCircuit) {
                  return (
                    <div key={"grp"+gi} style={{ border: "1.5px solid "+cc+"55", borderRadius: 12, marginBottom: 6, overflow: "hidden" }}>
                      <div style={{ background: cc, padding: "5px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>⚡ {group.label.toUpperCase()}</span>
                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, marginLeft: "auto" }}>{group.items.length} exercises</span>
                      </div>
                      <div style={{ padding: "0 12px" }}>{inner}</div>
                    </div>
                  );
                }
                return <div key={"grp"+gi}>{inner}</div>;
              })}
            </div>
            {/* Expand button */}
            <div style={{ padding: "0 16px 14px" }}>
              <button onClick={function(){setFullscreenWk(w);}} style={{ width: "100%", padding: "9px 14px", borderRadius: 10, background: dc, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Expand
              </button>
            </div>
          </div>
        );
      })}

      {/* Builder */}
      {building ? (
        <div style={{ background: "#fff", border: "1.5px solid "+c+"66", borderRadius: 20, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ height: 3, background: c, width: "100%" }} />
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ color: "#0A1A0F", fontSize: 16, fontWeight: 900 }}>{editingId !== null ? "EDIT WORKOUT" : "NEW WORKOUT"}</div>
              {editingId !== null && <span style={{ background: c+"18", color: c, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>Editing</span>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: "#7AAB8A", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>WORKOUT NAME</div>
              <input value={wkName} onChange={function(e) { setWkName(e.target.value); }} placeholder="e.g. My Upper Body Day" style={Object.assign({}, inputS, { width: "100%" })} />
            </div>

            {exercises.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: "#7AAB8A", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 8 }}>
                  EXERCISES ({exercises.length})
                  <span style={{ color: "#7AAB8A", fontWeight: 500, fontSize: 10, letterSpacing: 0, marginLeft: 6 }}>· tap ⚡ to group into a circuit</span>
                </div>
                {buildGroups(exercises).map(function(group, gi) {
                  var isCircuit = !!group.label;
                  var cc = group.color;
                  var inner = group.items.map(function(item) {
                    var ex = item.ex; var idx = item.idx; var total = exercises.length;
                    return (
                      <div key={"builder-ex-"+idx} style={{ background: isCircuit ? cc+"0A" : "#F0F5F2", borderRadius: isCircuit ? 0 : 12, padding: "12px", marginBottom: isCircuit ? 0 : 8, borderTop: isCircuit && group.items.indexOf(item) > 0 ? "1px dashed "+cc+"55" : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              <button onClick={function() { moveEx(idx, -1); }} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx===0?"default":"pointer", color: idx===0?"#ccc":"#7AAB8A", padding: "1px 3px", lineHeight: 1 }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
                              </button>
                              <div style={{ display: "flex", flexDirection: "column", gap: 1.5, padding: "1px 3px" }}>
                                <div style={{ width: 9, height: 1.5, background: "#7AAB8A", borderRadius: 99 }} />
                                <div style={{ width: 9, height: 1.5, background: "#7AAB8A", borderRadius: 99 }} />
                                <div style={{ width: 9, height: 1.5, background: "#7AAB8A", borderRadius: 99 }} />
                              </div>
                              <button onClick={function() { moveEx(idx, 1); }} disabled={idx>=total-1} style={{ background: "none", border: "none", cursor: idx>=total-1?"default":"pointer", color: idx>=total-1?"#ccc":"#7AAB8A", padding: "1px 3px", lineHeight: 1 }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                              </button>
                            </div>
                            <span style={{ color: "#0A1A0F", fontSize: 13, fontWeight: 600 }}>{ex.name}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button onClick={function() { toggleCircuit(idx); }} style={{ background: ex.circuit ? (cc||"#9B6FD4")+"22" : "#F0F5F2", border: "1.5px solid "+(ex.circuit ? (cc||"#9B6FD4") : "#D0E6D8"), color: ex.circuit ? (cc||"#9B6FD4") : "#7AAB8A", borderRadius: 7, padding: "3px 7px", fontSize: 11, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>
                              ⚡{ex.circuit ? " "+ex.circuit : ""}
                            </button>
                            <button onClick={function() { removeEx(idx); }} style={{ background: "none", border: "none", color: "#7AAB8A", fontSize: 18, cursor: "pointer" }}>×</button>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                          {[{ label: "SETS", field: "sets", ph: "4" }, { label: "REPS", field: "reps", ph: "8" }, { label: "WEIGHT", field: "weight", ph: "lbs" }].map(function(f) {
                            return (
                              <div key={f.field}>
                                <div style={{ color: "#7AAB8A", fontSize: 9, fontWeight: 700, marginBottom: 4, textAlign: "center" }}>{f.label}</div>
                                <input type={f.field==="weight"?"text":"number"} value={ex[f.field]||""} onChange={function(e) { updateEx(idx, f.field, e.target.value); }} placeholder={f.ph} style={Object.assign({}, inputS, { width: "100%", textAlign: "center", fontSize: 13, padding: "8px 6px" })} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                  if (isCircuit) {
                    return (
                      <div key={"grp-"+gi} style={{ border: "2px solid "+cc, borderRadius: 12, marginBottom: 8, overflow: "hidden" }}>
                        <div style={{ background: cc, padding: "5px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>⚡ CIRCUIT {group.label}</span>
                          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, marginLeft: "auto" }}>{group.items.length} exercises · no rest between</span>
                        </div>
                        {inner}
                      </div>
                    );
                  }
                  return <div key={"grp-"+gi}>{inner}</div>;
                })}
              </div>
            )}

            <button onClick={function() { setShowPicker(true); }} style={{ width: "100%", padding: "12px", borderRadius: 12, background: "#F0F5F2", border: "1.5px dashed #D0E6D8", color: "#7AAB8A", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <span style={{ color: c, fontSize: 18 }}>+</span> Add Exercise
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveWorkout} style={{ flex: 1, padding: "12px", borderRadius: 12, background: wkName && exercises.length > 0 ? c : "#D0E6D8", border: "none", color: wkName && exercises.length > 0 ? "#fff" : "#7AAB8A", fontSize: 13, fontWeight: 700, cursor: wkName && exercises.length > 0 ? "pointer" : "default" }}>
                {editingId !== null ? "Save Changes" : "Save Workout"}
              </button>
              <button onClick={cancelEdit} style={{ padding: "12px 16px", borderRadius: 12, background: "none", border: "1.5px solid #D0E6D8", color: "#7AAB8A", fontSize: 13, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={startNew} style={{ width: "100%", padding: "13px", borderRadius: 14, background: c, border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>+</span> Build a Custom Workout
        </button>
      )}
    </div>
  );
}
function ProgramWithCustom({ program, color, favorites, initialDayIndex, onDayIndexUsed, myPlans }) {
  const c = color || ORANGE;
  const [activeWk, setActiveWk] = useState(0);
  const [videoModal, setVideoModal] = useState(null);
  const [fullscreenDay, setFullscreenDay] = useState(null);
  const [section, setSection] = useState("coach");
  const [exLogs, setExLogs] = useState({});
  const [savedSessions, setSavedSessions] = useState([]);
  const [customWorkouts, setCustomWorkouts] = useState([]);

  function logWeight(key, weight) {
    setExLogs(function(prev) { return Object.assign({}, prev, { [key]: weight }); });
  }
  function saveSession(wkIdx, dayIdx, day) {
    var id = "saved-"+wkIdx+"-"+dayIdx+"-"+day.focus;
    if (savedSessions.find(function(s){return s.id===id;})) return;
    setSavedSessions(function(prev) {
      return prev.concat([{
        id: id,
        name: day.focus,
        day: day.day,
        exercises: day.exercises.map(function(ex,ei){
          var p = parseEx(ex);
          p.weight = exLogs[wkIdx+"-"+dayIdx+"-"+ei] || "";
          return p;
        }),
        savedAt: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),
      }]);
    });
  }

  var ACCENT = ["#1B8C4E","#3B7DD8","#1B8C4E","#9B6FD4","#E0A020","#E05252","#1B8C4E"];
  function ac(i){ return ACCENT[i % ACCENT.length]; }

  function sessionEmoji(focus) {
    var f = (focus||"").toLowerCase();
    if(f.includes("leg")||f.includes("quad")) return ICON_WORKOUT;
    if(f.includes("pull")||f.includes("back")||f.includes("bicep")) return ICON_WORKOUT;
    if(f.includes("push")||f.includes("chest")||f.includes("tri")) return ICON_WORKOUT;
    if(f.includes("run")||f.includes("cardio")) return ICON_RUN;
    return ICON_WORKOUT;
  }

  function parseEx(ex) {
    var s = ex.replace(/^\[C:[^\]]*\]\s*/, "");
    var m = s.match(/^(.+?)\s+(\d+)[xX×](\d+)/);
    return m ? {name:m[1].trim(),sets:m[2],reps:m[3]} : {name:s.trim(),sets:"",reps:""};
  }

  if (videoModal) {
    return <VideoModal video={videoModal.video} exName={videoModal.name} onClose={function(){setVideoModal(null);}} />;
  }

  if (fullscreenDay !== null) {
    var fp = fullscreenDay.split("-");
    var fw=parseInt(fp[0]), fd=parseInt(fp[1]);
    var fday = program[fw]&&program[fw].days[fd];
    if (fday) {
      var fc = ac(fd);
      var fsaved = savedSessions.some(function(s){return s.id==="saved-"+fw+"-"+fd+"-"+fday.focus;});
      return (
        <div style={{position:"fixed",inset:0,background:"#F0F5F2",zIndex:500,display:"flex",flexDirection:"column",overflowY:"auto"}}>
          {/* Header — white card style */}
          <div style={{background:"#fff",borderBottom:"1px solid #E8E4DE",padding:"14px 16px",display:"flex",alignItems:"center",position:"sticky",top:0,zIndex:10,flexShrink:0}}>
            <button onClick={function(){setFullscreenDay(null);}} style={{background:"#F0F5F2",border:"1.5px solid #E8E4DE",color:"#0A1A0F",borderRadius:10,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A1A0F" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{color:"#0A1A0F",fontSize:20,fontWeight:900}}>{(fday.focus||"").toUpperCase()}</div>
              <div style={{color:"#7AAB8A",fontSize:11,marginTop:1}}>{fday.exercises.length} exercises</div>
            </div>
            <button onClick={function(){fsaved?setSavedSessions(function(p){return p.filter(function(s){return s.id!=="saved-"+fw+"-"+fd+"-"+fday.focus;});}):saveSession(fw,fd,fday);}}
              style={{width:36,height:36,borderRadius:10,background:fsaved?fc+"18":"#F0F5F2",border:"1.5px solid "+(fsaved?fc+"55":"#D0E6D8"),display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill={fsaved?fc:"none"} stroke={fsaved?fc:"#7AAB8A"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
          <div style={{padding:"14px 14px 40px"}}>
            {(function(){
              var FC_COLORS=["#9B6FD4","#1B8C4E","#3B7DD8","#E0A020"];
              var fgroups=[]; var flcm={}; var fci=0;
              fday.exercises.forEach(function(ex,ei){
                var cl=getCircuitLabel(ex); var p=parseEx(ex); p.origIdx=ei; p.circuitLabel=cl;
                if(cl&&fgroups.length>0&&fgroups[fgroups.length-1].circuitLabel===cl){fgroups[fgroups.length-1].items.push(p);}
                else{fgroups.push({circuitLabel:cl,items:[p],circuitColor:null});}
                if(cl&&!flcm[cl]){flcm[cl]=FC_COLORS[fci++%FC_COLORS.length];}
                if(cl){fgroups[fgroups.length-1].circuitColor=flcm[cl];}
              });
              return fgroups.map(function(grp,gi){
                var isC=!!grp.circuitLabel; var cc=grp.circuitColor;
                var items=grp.items.map(function(p){
                  var vid=findVideo(p.name);
                  return (
                    <div key={"fex-"+p.origIdx} style={{background:"#fff",borderRadius:14,border:"1.5px solid #E8E4DE",padding:"12px 14px",marginBottom:isC?0:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:28,height:28,borderRadius:8,background:isC?cc+"18":"#F0F5F2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:isC?cc:"#7AAB8A",fontFamily:"monospace",flexShrink:0}}>{p.origIdx+1}</div>
                        <div style={{color:"#0A1A0F",fontSize:14,fontWeight:500,flex:1}}>{p.name}</div>
                        {p.sets&&p.reps&&<div style={{fontSize:11,fontWeight:600,color:"#7AAB8A",background:"#F0F5F2",padding:"4px 8px",borderRadius:8,fontFamily:"monospace",flexShrink:0}}>{p.sets}×{p.reps}</div>}
                        <input type="number" placeholder="lbs"
                          value={exLogs[fw+"-"+fd+"-"+p.origIdx]||""}
                          onChange={function(e){logWeight(fw+"-"+fd+"-"+p.origIdx,e.target.value);}}
                          style={{width:52,background:"#F0F5F2",border:"1.5px solid #E8E4DE",borderRadius:8,padding:"4px 6px",fontSize:11,fontWeight:600,color:"#0A1A0F",textAlign:"center",outline:"none",flexShrink:0}}
                        />
                        {vid&&<button onClick={function(){setVideoModal({video:vid,name:p.name});}} style={{background:fc+"18",border:"none",borderRadius:7,padding:"4px 8px",color:fc,fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0}}>▶</button>}
                      </div>
                    </div>
                  );
                });
                if(isC){return(
                  <div key={"fgrp"+gi} style={{border:"1.5px solid "+cc+"55",borderRadius:14,marginBottom:8,overflow:"hidden"}}>
                    <div style={{background:cc+"18",borderBottom:"1.5px solid "+cc+"33",padding:"7px 14px",display:"flex",alignItems:"center",gap:6}}>
                      <span style={{color:cc,fontSize:10,fontWeight:800,letterSpacing:1}}>⚡ {grp.circuitLabel.toUpperCase()}</span>
                      <span style={{color:cc+"99",fontSize:10,marginLeft:"auto"}}>{grp.items.length} exercises</span>
                    </div>
                    <div style={{padding:"4px 8px 4px"}}>{items}</div>
                  </div>
                );}
                return <div key={"fgrp"+gi}>{items}</div>;
              });
            })()}
          </div>
        </div>
      );
    }
  }

  var week = program[activeWk];
  if (!week) return null;

  // Always put first scheduled day at top as featured
  var days = week.days.slice();

  return (
    <div style={{background:CARD,margin:"0 -16px",padding:"0 16px 24px"}}>

      {/* Sub-tabs: Coach's Program / My Workouts / Goals */}
      <div style={{display:"flex",background:"#fff",borderBottom:"1px solid #E5E5E5",marginBottom:16,marginLeft:-16,marginRight:-16,paddingLeft:16,paddingRight:16,gap:0}}>
        <button onClick={function(){setSection("coach");}} style={{flex:1,padding:"13px 4px",background:"transparent",border:"none",borderBottom:"3px solid "+(section==="coach"?"#0A1A0F":"transparent"),marginBottom:-1,color:"#0A1A0F",fontSize:12,fontWeight:section==="coach"?800:500,cursor:"pointer",whiteSpace:"nowrap",opacity:section==="coach"?1:0.4}}>
          Coach's Program
        </button>
        <button onClick={function(){setSection("mine");}} style={{flex:1,padding:"13px 4px",background:"transparent",border:"none",borderBottom:"3px solid "+(section==="mine"?"#0A1A0F":"transparent"),marginBottom:-1,color:"#0A1A0F",fontSize:12,fontWeight:section==="mine"?800:500,cursor:"pointer",whiteSpace:"nowrap",opacity:section==="mine"?1:0.4}}>
          My Workouts
        </button>
        <button onClick={function(){setSection("goals");}} style={{flex:1,padding:"13px 4px",background:"transparent",border:"none",borderBottom:"3px solid "+(section==="goals"?"#0A1A0F":"transparent"),marginBottom:-1,color:"#0A1A0F",fontSize:12,fontWeight:section==="goals"?800:500,cursor:"pointer",whiteSpace:"nowrap",opacity:section==="goals"?1:0.4}}>
          Goals
        </button>
      </div>

      {section === "mine" && (
        <MyWorkouts color={c} favorites={favorites} importedWorkouts={savedSessions} customWorkouts={customWorkouts} setCustomWorkouts={setCustomWorkouts} />
      )}

      {section === "goals" && (
        <GoalProgressTab client={CLIENTS[0]} isCoach={false} color={c} onTabChange={function(){}} />
      )}

      {section === "coach" && <div>

      {/* Week selector */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {program.map(function(w,i){
          var on=activeWk===i;
          return (
            <button key={"wk"+i} onClick={function(){setActiveWk(i);}}
              style={{flex:1,padding:"10px 0",borderRadius:12,border:"1.5px solid "+(on?c:BORDER),background:on?c+"15":"transparent",color:on?c:TEXT3,fontSize:12,fontWeight:on?700:500,cursor:"pointer"}}>
              Week {w.week}
            </button>
          );
        })}
      </div>

      {/* Day cards */}
      {days.map(function(day,cardIdx){
        var origIdx = week.days.indexOf(day);
        var dc = ac(origIdx);
        var isFeatured = cardIdx === 0;

        // Look up scheduled date from myPlans
        var scheduledDate = null;
        if (myPlans) {
          Object.keys(myPlans).forEach(function(planKey) {
            if (scheduledDate) return;
            var acts = myPlans[planKey];
            if (acts && acts.some(function(a) {
              return (a.label||"").toLowerCase() === (day.focus||"").toLowerCase() ||
                     (a.label||"").toLowerCase().indexOf((day.focus||"").toLowerCase().split(" ")[0]) !== -1;
            })) {
              // planKey format: "YYYY-M-D-dayIndex" e.g. "2026-4-25-0"
              var parts = planKey.split("-");
              if (parts.length >= 4) {
                var yr = parseInt(parts[0]);
                var mo = parseInt(parts[1]); // 0-based month
                var dy = parseInt(parts[2]);
                var di = parseInt(parts[3]); // day index 0=Mon
                var monday = new Date(yr, mo, dy);
                var d = new Date(monday.getTime() + di * 86400000);
                if (!isNaN(d.getTime())) scheduledDate = d;
              }
            }
          });
        }

        var label = "";

        var exs = day.exercises.map(parseEx);

        // Build circuit groups
        var CIRCUIT_COLORS = ["#9B6FD4","#1B8C4E","#3B7DD8","#E0A020"];
        var groups = [];
        var _labelColorMap = {};
        var _colorIdx = 0;
        day.exercises.forEach(function(ex, ei) {
          var cl = getCircuitLabel(ex);
          var p = parseEx(ex); p.origIdx = ei; p.circuitLabel = cl;
          if (cl && groups.length > 0 && groups[groups.length-1].circuitLabel === cl) {
            groups[groups.length-1].items.push(p);
          } else {
            groups.push({ circuitLabel: cl, items: [p], circuitColor: null });
          }
          if (cl && !_labelColorMap[cl]) { _labelColorMap[cl] = CIRCUIT_COLORS[_colorIdx++ % CIRCUIT_COLORS.length]; }
          if (cl) { groups[groups.length-1].circuitColor = _labelColorMap[cl]; }
        });

        return (
          <div key={"dc"+origIdx} style={{
            background:"#fff",
            borderRadius:20,
            overflow:"hidden",
            marginBottom:12,
            border: isFeatured ? "1.5px solid "+dc+"66" : "1.5px solid #E8E8E4",
            boxShadow: isFeatured ? "0 4px 20px "+dc+"22" : "0 1px 4px rgba(0,0,0,0.05)"
          }}>

            {/* Top accent bar */}
            <div style={{height:3,background:dc,width:"100%"}} />

            {/* Header */}
            <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px 10px"}}>
              <div style={{flex:1}}>
                <div style={{color:isFeatured?dc:"#7AAB8A",fontSize:10,fontWeight:700,letterSpacing:1.5,marginBottom:3}}>{label}</div>
                <div style={{color:"#0A1A0F",fontSize:20,fontWeight:900,lineHeight:1.1}}>{(day.focus||"").toUpperCase()}</div>
                <div style={{color:"#7AAB8A",fontSize:12,marginTop:3}}>{exs.length} exercises</div>
              </div>
              {/* Bookmark button */}
              {(function(){
                var bKey="saved-"+activeWk+"-"+origIdx;
                var isSaved=savedSessions.some(function(s){return s.id===bKey+"-"+day.focus;});
                return (
                  <button onClick={function(e){e.stopPropagation();isSaved?setSavedSessions(function(p){return p.filter(function(s){return s.id!==bKey+"-"+day.focus;});}):saveSession(activeWk,origIdx,day);}}
                    style={{width:36,height:36,borderRadius:10,background:isSaved?dc+"18":"#F0F5F2",border:"1.5px solid "+(isSaved?dc+"44":"#D0E6D8"),display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved?dc:"none"} stroke={isSaved?dc:"#7AAB8A"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                  </button>
                );
              })()}
            </div>

            {/* Exercises — grouped by circuit */}
            <div style={{padding:"0 16px 14px"}}>
              {groups.map(function(group, gi) {
                var isCircuit = !!group.circuitLabel;
                var cc = group.circuitColor || null;
                var inner = group.items.map(function(ex) {
                  var vid = findVideo(ex.name);
                  return (
                    <div key={"ex"+ex.origIdx} style={{padding:"9px 0",borderBottom:"1px solid #F0EFEC"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:28,height:28,borderRadius:8,background:isCircuit?cc+"18":"#F0F5F2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:isCircuit?cc:"#7AAB8A",fontFamily:"monospace",flexShrink:0}}>{ex.origIdx+1}</div>
                        <div style={{color:"#0A1A0F",fontSize:14,fontWeight:500,flex:1}}>{ex.name}</div>
                        {ex.sets&&ex.reps&&<div style={{fontSize:11,fontWeight:600,color:"#7AAB8A",background:"#F0F5F2",padding:"4px 8px",borderRadius:8,fontFamily:"monospace",flexShrink:0}}>{ex.sets}×{ex.reps}</div>}
                        <input
                          type="number"
                          placeholder="lbs"
                          value={exLogs[activeWk+"-"+origIdx+"-"+ex.origIdx]||""}
                          onChange={function(e){logWeight(activeWk+"-"+origIdx+"-"+ex.origIdx, e.target.value);}}
                          style={{width:52,background:"#F0F5F2",border:"1.5px solid #E8E4DE",borderRadius:8,padding:"4px 6px",fontSize:11,fontWeight:600,color:"#0A1A0F",textAlign:"center",outline:"none",flexShrink:0}}
                        />
                        {vid&&<button onClick={function(e){e.stopPropagation();setVideoModal({video:vid,name:ex.name});}} style={{background:dc+"18",border:"none",borderRadius:7,padding:"4px 8px",color:dc,fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0}}>▶</button>}
                      </div>
                    </div>
                  );
                });
                if (isCircuit) {
                  return (
                    <div key={"grp"+gi} style={{border:"1.5px solid "+cc+"55",borderRadius:12,marginBottom:6,overflow:"hidden"}}>
                      <div style={{background:cc,padding:"5px 12px",display:"flex",alignItems:"center",gap:6}}>
                        <span style={{color:"#fff",fontSize:10,fontWeight:800,letterSpacing:1}}>⚡ {group.circuitLabel.toUpperCase()}</span>
                        <span style={{color:"rgba(255,255,255,0.6)",fontSize:10,marginLeft:"auto"}}>{group.items.length} exercises</span>
                      </div>
                      <div style={{padding:"0 12px"}}>{inner}</div>
                    </div>
                  );
                }
                return <div key={"grp"+gi}>{inner}</div>;
              })}
            </div>

            {/* Expand button */}
            <div style={{padding:"0 16px 14px"}}>
              <button onClick={function(){setFullscreenDay(activeWk+"-"+origIdx);}}
                style={{width:"100%",padding:"9px 14px",borderRadius:10,background:dc,border:"none",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:0.2}}>
                Expand
              </button>
            </div>

          </div>
        );
      })}
      </div>}
    </div>
  );
}


// -- MESSAGING SYSTEM ---------------------------------------------
const SEED_MESSAGES = {
  1: [
    { id: 1, from: "coach", text: "Hey Marcus! Great work this week. How are you feeling about the new program?", time: "Mon 9:12 AM", type: "text" },
    { id: 2, from: "client", text: "Feeling really good! Hit a PR on bench -- 225lbs. Sleep has been rough though.", time: "Mon 11:34 AM", type: "text" },
    { id: 3, from: "coach", text: "That PR is huge! Focus on sleep this week -- aim for 7-8 hours. Cut screens an hour before bed.", time: "Mon 12:01 PM", type: "text" },
    { id: 4, from: "client", text: "Will do! Should I be eating more protein on leg days?", time: "Tue 8:45 AM", type: "text" },
    { id: 5, from: "coach", text: "Yes -- aim for 1g per pound of bodyweight on training days. Front-load protein at breakfast and lunch.", time: "Tue 9:02 AM", type: "text" },
    { id: 6, from: "coach", text: "Weekly Check-In Request", time: "Fri 8:00 AM", type: "checkin_request" },
  ],
  2: [
    { id: 1, from: "coach", text: "Sarah! Amazing milestone -- 2.8 miles without stopping is HUGE progress!", time: "Mon 10:00 AM", type: "text" },
    { id: 2, from: "client", text: "Thank you! My shin splints are acting up again though. Should I rest?", time: "Mon 10:30 AM", type: "text" },
    { id: 3, from: "coach", text: "Take 2 full rest days, ice 15 min after any activity, and add calf stretches morning and night.", time: "Mon 10:45 AM", type: "text" },
    { id: 4, from: "coach", text: "Weekly Check-In Request", time: "Fri 8:00 AM", type: "checkin_request" },
  ],
};

function MessagingInbox({ clientId, clientName, clientColor, isCoach, messages, onSend }) {
  const c = clientColor || ORANGE;
  const [text, setText] = useState("");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [motivation, setMotivation] = useState(3);
  const [programEnjoy, setProgramEnjoy] = useState(3);
  const [checkNotes, setCheckNotes] = useState("");
  const [mediaPreview, setMediaPreview] = useState(null); // { dataUrl, mediaType }
  const fileInputRef = { current: null };
  const motivationEmoji = ["😞","😕","😊","😃","🤩"];
  const programEmoji   = ["😴","😐","🙂","💪","🔥"];

  function handleSend() {
    if (!text.trim() && !mediaPreview) return;
    onSend(clientId, { from: isCoach ? "coach" : "client", text: text.trim(), time: "Just now", type: mediaPreview ? "media" : "text", mediaUrl: mediaPreview ? mediaPreview.dataUrl : null, mediaType: mediaPreview ? mediaPreview.mediaType : null });
    setText("");
    setMediaPreview(null);
  }

  function handleFileChange(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var isVideo = file.type.startsWith("video/");
    var reader = new FileReader();
    reader.onload = function(ev) {
      setMediaPreview({ dataUrl: ev.target.result, mediaType: isVideo ? "video" : "image" });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleCheckinSubmit() {
    onSend(clientId, { from: "client", text: "", time: "Just now", type: "checkin_response", mood: motivation, energy: programEnjoy, notes: checkNotes });
    setCheckInOpen(false);
    setCheckNotes(""); setMotivation(3); setProgramEnjoy(3);
  }

  function handleRequestCheckin() {
    onSend(clientId, { from: "coach", text: "Weekly Check-In Request", time: "Just now", type: "checkin_request" });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {isCoach && (
        <button onClick={handleRequestCheckin} style={{ width: "100%", padding: "10px", borderRadius: 11, background: c, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 14 }}>
          + Request Weekly Check-In
        </button>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        {messages.map(function(msg, i) {
          const isMe = isCoach ? msg.from === "coach" : msg.from === "client";

          if (msg.type === "checkin_request") {
            return (
              <div key={"msg-"+i} style={{ alignSelf: "center", width: "100%" }}>
                <div style={{ background: c+"12", border: "1.5px solid "+c+"44", borderRadius: 14, padding: "14px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></svg></span></div>
                  <div style={{ color: TEXT, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Weekly Check-In Request</div>
                  <div style={{ color: TEXT2, fontSize: 12, marginBottom: 12 }}>{COACH_FIRST} wants to know how your week went</div>
                  {!isCoach && (
                    <button onClick={function() { setCheckInOpen(true); }} style={{ background: c, border: "none", color: "#fff", padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      Fill Out Check-In
                    </button>
                  )}
                  {isCoach && <span style={{ color: TEXT3, fontSize: 12 }}>Awaiting response...</span>}
                  <div style={{ color: TEXT3, fontSize: 10, marginTop: 8 }}>{msg.time}</div>
                </div>
              </div>
            );
          }

          if (msg.type === "checkin_response") {
            return (
              <div key={"msg-"+i} style={{ alignSelf: "flex-start", width: "100%" }}>
                <div style={{ background: GREEN_BG, border: "1.5px solid "+GREEN+"44", borderRadius: 14, padding: "14px 16px" }}>
                  <div style={{ color: GREEN, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>CHECK-IN SUBMITTED</div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                    <div style={{ flex: 1, background: CARD, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 18 }}>{motivationEmoji[(msg.mood||3)-1]}</div>
                      <div style={{ color: TEXT3, fontSize: 10, marginTop: 2 }}>Motivation {msg.mood}/5</div>
                    </div>
                    <div style={{ flex: 1, background: CARD, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 18 }}>{programEmoji[(msg.energy||3)-1]}</div>
                      <div style={{ color: TEXT3, fontSize: 10, marginTop: 2 }}>Enjoying Program {msg.energy}/5</div>
                    </div>
                  </div>
                  {msg.notes ? <p style={{ color: TEXT2, fontSize: 13, lineHeight: 1.5, margin: "0 0 6px" }}>{msg.notes}</p> : null}
                  <div style={{ color: TEXT3, fontSize: 10 }}>{msg.time}</div>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id || "msg-"+i} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
              {!isMe && (
                <div style={{ fontSize: 10, color: TEXT3, marginBottom: 3, marginLeft: 4 }}>
                  {msg.from === "coach" ? COACH_FIRST : clientName}
                </div>
              )}
              {msg.type === "media" && msg.mediaUrl ? (
                <div style={{ maxWidth: "78%", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px", overflow: "hidden", border: "2px solid "+(isMe ? c : BORDER) }}>
                  {msg.mediaType === "video"
                    ? <video src={msg.mediaUrl} controls style={{ display: "block", maxWidth: "100%", maxHeight: 280 }} />
                    : <img src={msg.mediaUrl} alt="media" style={{ display: "block", maxWidth: "100%", maxHeight: 280, objectFit: "cover" }} />
                  }
                  {msg.text ? <div style={{ background: isMe ? c : CARD, padding: "8px 12px" }}><p style={{ color: isMe ? "#fff" : TEXT, fontSize: 13, margin: 0 }}>{msg.text}</p></div> : null}
                </div>
              ) : (
                <div style={{ maxWidth: "78%", background: isMe ? c : CARD, border: isMe ? "none" : "1.5px solid "+BORDER, borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px" }}>
                  <p style={{ color: isMe ? "#fff" : TEXT, fontSize: 13, lineHeight: 1.5, margin: 0 }}>{msg.text}</p>
                </div>
              )}
              <div style={{ fontSize: 10, color: TEXT3, marginTop: 3, marginLeft: 4, marginRight: 4 }}>{msg.time}</div>
            </div>
          );
        })}
      </div>

      {checkInOpen && !isCoach && (
        <div style={{ background: CARD, border: "1.5px solid "+c, borderRadius: 16, padding: "16px", marginBottom: 14 }}>
          <div style={{ color: TEXT, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Weekly Check-In</div>
          <div style={{ color: TEXT3, fontSize: 12, marginBottom: 14 }}>Takes 30 seconds — Cameron reviews every one.</div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: TEXT2, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>How motivated are you feeling this week?</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[1,2,3,4,5].map(function(n) {
                return (
                  <button key={n} onClick={function() { setMotivation(n); }} style={{ flex: 1, padding: "8px 0", borderRadius: 10, background: motivation === n ? c+"22" : SURFACE, border: "2px solid "+(motivation === n ? c : "transparent"), cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 18 }}>{motivationEmoji[n-1]}</span>
                    <span style={{ fontSize: 9, color: motivation === n ? c : TEXT3 }}>{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ color: TEXT2, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Are you enjoying this 3 week program?</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[1,2,3,4,5].map(function(n) {
                return (
                  <button key={n} onClick={function() { setProgramEnjoy(n); }} style={{ flex: 1, padding: "8px 0", borderRadius: 10, background: programEnjoy === n ? GREEN_BG : SURFACE, border: "2px solid "+(programEnjoy === n ? GREEN : "transparent"), cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 18 }}>{programEmoji[n-1]}</span>
                    <span style={{ fontSize: 9, color: programEnjoy === n ? GREEN : TEXT3 }}>{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <textarea value={checkNotes} onChange={function(e) { setCheckNotes(e.target.value); }} placeholder="Anything else — wins, soreness, questions for Cameron?" style={{ width: "100%", background: SURFACE, border: "1.5px solid "+BORDER, borderRadius: 10, padding: "10px 12px", color: TEXT, fontSize: 13, lineHeight: 1.5, resize: "none", height: 80, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleCheckinSubmit} style={{ flex: 1, padding: "11px", borderRadius: 10, background: c, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Submit</button>
            <button onClick={function() { setCheckInOpen(false); }} style={{ padding: "11px 16px", borderRadius: 10, background: "none", border: "1.5px solid "+BORDER, color: TEXT2, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ paddingTop: 8, borderTop: "1px solid "+BORDER }}>
        {/* Media preview */}
        {mediaPreview && (
          <div style={{ position: "relative", marginBottom: 8, display: "inline-block" }}>
            {mediaPreview.mediaType === "video"
              ? <video src={mediaPreview.dataUrl} style={{ maxHeight: 140, maxWidth: "100%", borderRadius: 12, display: "block" }} />
              : <img src={mediaPreview.dataUrl} alt="preview" style={{ maxHeight: 140, maxWidth: "100%", borderRadius: 12, display: "block", objectFit: "cover" }} />
            }
            <button onClick={function() { setMediaPreview(null); }} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 99, background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>✕</button>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          {/* Hidden file input */}
          <input
            type="file"
            accept="image/*,video/*"
            style={{ display: "none" }}
            ref={function(el) { fileInputRef.current = el; }}
            onChange={handleFileChange}
          />
          {/* Attachment button */}
          <button
            onClick={function() { if (fileInputRef.current) fileInputRef.current.click(); }}
            style={{ width: 44, height: 44, borderRadius: 12, background: SURFACE, border: "1.5px solid "+BORDER, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TEXT2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <textarea value={text} onChange={function(e) { setText(e.target.value); }} placeholder={isCoach ? "Message "+clientName+"..." : "Message " + COACH_FIRST + "..."}
            style={{ flex: 1, background: SURFACE, border: "1.5px solid "+BORDER, borderRadius: 12, padding: "10px 12px", color: TEXT, fontSize: 13, lineHeight: 1.5, resize: "none", height: 44, outline: "none", boxSizing: "border-box" }} />
          <button onClick={handleSend} style={{ width: 44, height: 44, borderRadius: 12, background: (text.trim() || mediaPreview) ? c : SURFACE2, border: "none", color: (text.trim() || mediaPreview) ? "#fff" : TEXT3, fontSize: 20, cursor: (text.trim() || mediaPreview) ? "pointer" : "default", flexShrink: 0 }}>
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckInForm({ onDone }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span></div>
      <div style={{ color: TEXT, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Use the Messages tab</div>
      <div style={{ color: TEXT2, fontSize: 13 }}>Check-ins are now part of your inbox</div>
      <button onClick={onDone} style={{ marginTop: 20, background: ORANGE, border: "none", color: "#fff", padding: "12px 28px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Go Back</button>
    </div>
  );
}

const GOAL_COLORS = ["#1B8C4E","#3B7DD8","#1B8C4E","#9B6FD4","#E0A020","#E05252","#1B8C4E"];
const GOAL_UNITS  = ["lbs","kg","mi","km","min/mi","steps","reps","days","sessions","ft","in",""];

function GoalEditModal({ goal, onSave, onDelete, onClose, color }) {
  const c = color || ORANGE;
  const isNew = !goal;
  const [label,   setLabel]   = useState(isNew ? "" : goal.label);
  const [current, setCurrent] = useState(isNew ? "" : String(goal.current));
  const [target,  setTarget]  = useState(isNew ? "" : String(goal.target));
  const [unit,    setUnit]    = useState(isNew ? "lbs" : goal.unit);
  const [goalColor, setGoalColor] = useState(isNew ? c : (goal.color || c));

  const progress = target && current ? Math.min(100, Math.round((parseFloat(current) / parseFloat(target)) * 100)) : 0;

  const inputS = { width: "100%", background: SURFACE, border: "1.5px solid "+BORDER, borderRadius: 10, padding: "10px 12px", color: TEXT, fontSize: 14, outline: "none", boxSizing: "border-box" };

  function handleSave() {
    if (!label.trim() || !target) return;
    onSave({
      label: label.trim(),
      current: parseFloat(current) || 0,
      target: parseFloat(target),
      unit: unit,
      progress: progress,
      color: goalColor,
    });
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,23,20,0.55)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 500 }} onClick={onClose}>
      <div style={{ background: BG, borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 430, paddingBottom: 36 }} onClick={function(e) { e.stopPropagation(); }}>
        <div style={{ width: 36, height: 4, background: BORDER, borderRadius: 99, margin: "12px auto 0" }} />
        <div style={{ padding: "16px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ color: TEXT, fontSize: 18, fontWeight: 800 }}>{isNew ? "New Goal" : "Edit Goal"}</div>
          <button onClick={onClose} style={{ background: SURFACE, border: "none", color: TEXT2, width: 32, height: 32, borderRadius: 99, cursor: "pointer", fontSize: 15 }}>x</button>
        </div>

        <div style={{ padding: "0 20px" }}>
      <div style={{ marginBottom: 14 }}>
            <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>GOAL NAME</div>
            <input value={label} onChange={function(e) { setLabel(e.target.value); }} placeholder="e.g. Bench Press, Body Weight, 5K Time..." style={inputS} />
          </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>CURRENT</div>
              <input type="number" value={current} onChange={function(e) { setCurrent(e.target.value); }} placeholder="0" style={inputS} />
            </div>
            <div>
              <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>TARGET</div>
              <input type="number" value={target} onChange={function(e) { setTarget(e.target.value); }} placeholder="100" style={inputS} />
            </div>
          </div>
      <div style={{ marginBottom: 14 }}>
            <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>UNIT</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {GOAL_UNITS.map(function(u) {
                const active = unit === u;
                return (
                  <button key={u} onClick={function() { setUnit(u); }} style={{ padding: "5px 12px", borderRadius: 20, background: active ? goalColor : SURFACE, border: "1.5px solid "+(active ? goalColor : BORDER), color: active ? "#fff" : TEXT2, fontSize: 11, fontWeight: active ? 700 : 400, cursor: "pointer" }}>
                    {u || "none"}
                  </button>
                );
              })}
            </div>
          </div>
      <div style={{ marginBottom: 20 }}>
            <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>COLOR</div>
            <div style={{ display: "flex", gap: 8 }}>
              {GOAL_COLORS.map(function(gc) {
                return (
                  <div key={gc} onClick={function() { setGoalColor(gc); }} style={{ width: 28, height: 28, borderRadius: 99, background: gc, cursor: "pointer", border: "3px solid "+(goalColor === gc ? TEXT : "transparent"), boxSizing: "border-box" }} />
                );
              })}
            </div>
          </div>
{target && current && (
            <div style={{ marginBottom: 20, background: SURFACE, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: TEXT2, fontSize: 12, fontWeight: 600 }}>{label || "Goal"}</span>
                <span style={{ color: goalColor, fontSize: 12, fontWeight: 700 }}>{current} / {target} {unit}</span>
              </div>
              <div style={{ background: SURFACE2, borderRadius: 99, height: 8 }}>
                <div style={{ width: progress+"%", height: "100%", background: goalColor, borderRadius: 99 }} />
              </div>
            </div>
          )}
      <button onClick={handleSave} style={{ width: "100%", padding: 14, borderRadius: 14, background: label.trim() && target ? goalColor : SURFACE2, border: "none", color: label.trim() && target ? "#fff" : TEXT3, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: !isNew ? 10 : 0 }}>
            {isNew ? "Add Goal" : "Save Changes"}
          </button>
{!isNew && (
            <button onClick={function() { onDelete(); onClose(); }} style={{ width: "100%", padding: 12, borderRadius: 14, background: "none", border: "none", color: "#E05252", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Delete this goal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalProgressTab({ client, isCoach, color, onTabChange }) {
  const c = color || ORANGE;
  const [goals, setGoals] = useState(
    client.goals.map(function(g, i) {
      return Object.assign({ id: i, updatedAt: "May 27, 2025" }, g);
    })
  );
  const [editGoal, setEditGoal] = useState(null);
  const [saved, setSaved] = useState(false);

  function handleSave(updatedGoal) {
    var withDate = Object.assign({}, updatedGoal, { updatedAt: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) });
    if (editGoal === -1) {
      setGoals(goals.concat([Object.assign({ id: Date.now() }, withDate)]));
    } else {
      setGoals(goals.map(function(g, i) { return i === editGoal ? Object.assign({}, g, withDate) : g; }));
    }
    setSaved(true);
    setTimeout(function() { setSaved(false); }, 2000);
    setEditGoal(null);
  }

  function handleDelete() {
    setGoals(goals.filter(function(_, i) { return i !== editGoal; }));
    setEditGoal(null);
  }

  // Bar colors per index
  var GOAL_COLORS = ["#1B8C4E","#3B7DD8","#9B6FD4","#1B8C4E","#E0A020"];
  function goalColor(i) { return GOAL_COLORS[i % GOAL_COLORS.length]; }

  function calcPct(g) {
    var cur = parseFloat(g.current); var target = parseFloat(g.target);
    var start = parseFloat(g.start) || 0;
    if (!cur || !target || target === start) return 0;
    return Math.min(100, Math.max(0, Math.round(((cur - start) / (target - start)) * 100)));
  }

  return (
    <div style={{ background: "#F0F5F2", margin: "0 -16px", padding: "16px 16px 24px" }}>

      {editGoal !== null && (
        <GoalEditModal
          goal={editGoal === -1 ? null : goals[editGoal]}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={function() { setEditGoal(null); }}
          color={c}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ color: "#7AAB8A", fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>MY GOALS</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saved && <span style={{ background: "#E8F7EF", color: "#1B8C4E", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>Saved!</span>}
          <button onClick={function() { setEditGoal(-1); }}
            style={{ background: "#E8F7EF", border: "1.5px solid rgba(27,140,78,0.3)", borderRadius: 10, padding: "6px 14px", cursor: "pointer", color: "#1B8C4E", fontSize: 12, fontWeight: 700 }}>
            + Add Goal
          </button>
        </div>
      </div>

      {/* Empty state */}
      {goals.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#7AAB8A" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#7AAB8A", marginBottom: 6 }}>No goals yet</div>
          <div style={{ fontSize: 12 }}>Tap "+ Add Goal" to get started</div>
        </div>
      )}

      {/* Goal cards */}
      {goals.map(function(g, i) {
        var pct = calcPct(g);
        var gc = goalColor(i);
        return (
          <div key={g.id} style={{ background: "#fff", borderRadius: 18, padding: "16px", marginBottom: 12, border: "1.5px solid #E8E4DE", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>

            {/* Goal name row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#0A1A0F", fontSize: 16, fontWeight: 800, marginBottom: 3 }}>{g.label || g.name || "Goal"}</div>
                <div style={{ color: "#7AAB8A", fontSize: 11, fontWeight: 500 }}>
                  {g.type ? g.type.charAt(0).toUpperCase()+g.type.slice(1) : "Progress"}
                  {g.deadline ? " · " + g.deadline : ""}
                </div>
              </div>
              <button onClick={function() { setEditGoal(i); }}
                style={{ background: "#F0F5F2", border: "1.5px solid #E8E4DE", borderRadius: 8, padding: "5px 12px", cursor: "pointer", color: "#7AAB8A", fontSize: 11, fontWeight: 600, flexShrink: 0, marginLeft: 10 }}>
                Edit
              </button>
            </div>

            {/* Progress bar */}
            <div style={{ height: 8, background: "#F0F5F2", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: pct+"%", background: gc, borderRadius: 99, transition: "width 0.5s" }} />
            </div>

            {/* Current / Target */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ color: "#0A1A0F", fontSize: 13, fontWeight: 700 }}>
                {g.current ? g.current + (g.unit ? " "+g.unit : " lbs") : "—"}
              </div>
              <div style={{ color: "#7AAB8A", fontSize: 12 }}>
                Goal: {g.target ? g.target + (g.unit ? " "+g.unit : " lbs") : "—"}
              </div>
            </div>

            {/* Last updated */}
            <div style={{ borderTop: "1px solid #F0EFEC", paddingTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7AAB8A" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span style={{ color: "#7AAB8A", fontSize: 10, fontWeight: 500 }}>Last updated {g.updatedAt || "—"}</span>
            </div>

          </div>
        );
      })}

      {/* Message coach button */}
      {!isCoach && goals.length > 0 && (
        <button onClick={function() { if (onTabChange) onTabChange("Messages"); }}
          style={{ width: "100%", padding: "14px", borderRadius: 14, background: c, border: "none", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", marginTop: 4 }}>
          Message Cameron
        </button>
      )}
    </div>
  );
}


function CoachWorkoutLibrary({ color, library, onRemove, onLoadIntoProgram }) {
  const c = color || ORANGE;
  const [expanded, setExpanded] = useState(null);
  const [addingTo, setAddingTo] = useState(null); // id of session being added to program
  const [fullscreenSession, setFullscreenSession] = useState(null);

  return (
    <div>
      {fullscreenSession && (
        <WorkoutFullscreenModal
          workout={{ name: fullscreenSession.name, exercises: fullscreenSession.exercises, fromLibrary: true }}
          color={c}
          onClose={function() { setFullscreenSession(null); }}
        />
      )}
      <div style={{ color: TEXT2, fontSize: 13, marginBottom: 16 }}>
        {library.length === 0
          ? "Bookmark any session from Current Program to save it here."
          : library.length + " saved session" + (library.length !== 1 ? "s" : "")}
      </div>

      {library.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", background: SURFACE, borderRadius: 16 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={TEXT3} strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 12 }}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          <div style={{ color: TEXT2, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No saved sessions yet</div>
          <div style={{ color: TEXT3, fontSize: 12, lineHeight: 1.5 }}>Go to Current Program and tap the bookmark icon on any session to save it here for future use</div>
        </div>
      )}

      {library.map(function(session) {
        var open = expanded === session.id;
        return (
          <div key={session.id} style={{ background: CARD, border: "1.5px solid "+BORDER, borderRadius: 16, marginBottom: 10, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", cursor: "pointer" }} onClick={function() { setExpanded(open ? null : session.id); }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: c, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>{session.name}</div>
                <div style={{ color: TEXT3, fontSize: 12, marginTop: 2 }}>
                  {session.day} -- {session.exercises.length} exercises
                  {session.savedAt ? " -- Saved " + session.savedAt : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={function(e) { e.stopPropagation(); setFullscreenSession(session); }} style={{ background: SURFACE, border: "1.5px solid "+BORDER, borderRadius: 8, padding: "6px 8px", color: TEXT2, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center" }} title="Expand">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                </button>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT3} strokeWidth="2" strokeLinecap="round"><polyline points={open ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/></svg>
              </div>
            </div>

            {open && (
              <div style={{ borderTop: "1px solid "+SURFACE2, padding: "12px 16px" }}>
                {session.exercises.map(function(ex, j) {
                  return (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: j > 0 ? "1px solid "+SURFACE2 : "none" }}>
                      <div style={{ width: 6, height: 6, borderRadius: 99, background: c, flexShrink: 0 }} />
                      <span style={{ color: TEXT, fontSize: 13, flex: 1 }}>{ex}</span>
                    </div>
                  );
                })}
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button onClick={function() { if (onLoadIntoProgram) onLoadIntoProgram(session); }} style={{ flex: 1, padding: "10px", borderRadius: 10, background: c, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Add to Program
                  </button>
                  <button onClick={function() { onRemove(session.id); }} style={{ padding: "10px 14px", borderRadius: 10, background: "none", border: "1.5px solid "+BORDER, color: "#E05252", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CoachProgramTabView({ program, color, onUpdate }) {
  const [editing, setEditing]         = useState(false);
  const [coachSection, setCoachSection] = useState("program");
  const [coachLibrary, setCoachLibrary] = useState([]);
  const [coachWk, setCoachWk] = useState(0);
  const [fullscreenDay, setFullscreenDay] = useState(null);
  const [savedSessions, setSavedSessions] = useState([]);
  const [exLogs, setExLogs] = useState({});
  const [videoModal, setVideoModal] = useState(null);
  const [loadModal, setLoadModal] = useState(null);
  const c = color || ORANGE;

  var ACCENT = ["#1B8C4E","#3B7DD8","#1B8C4E","#9B6FD4","#E0A020","#E05252","#1B8C4E"];
  function ac(i){ return ACCENT[i % ACCENT.length]; }

  function parseEx(ex) {
    var s = ex.replace(/^\[C:[^\]]*\]\s*/, "");
    var m = s.match(/^(.+?)\s+(\d+)[xX×](\d+)/);
    return m ? {name:m[1].trim(),sets:m[2],reps:m[3]} : {name:s.trim(),sets:"",reps:""};
  }

  function logWeight(key, val) {
    setExLogs(function(prev) { return Object.assign({}, prev, {[key]: val}); });
  }

  function saveSession(wkIdx, dayIdx, day) {
    var bKey = "saved-"+wkIdx+"-"+dayIdx;
    var id = bKey+"-"+day.focus;
    setSavedSessions(function(prev) {
      if (prev.some(function(s){return s.id===id;})) return prev.filter(function(s){return s.id!==id;});
      return prev.concat([{ id: id, name: day.focus, day: day.day, exercises: day.exercises, savedAt: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}) }]);
    });
  }

  if (videoModal) {
    return <VideoModal video={videoModal.video} exName={videoModal.name} onClose={function(){setVideoModal(null);}} />;
  }

  if (fullscreenDay) {
    var fparts = fullscreenDay.split("-");
    var fwk = parseInt(fparts[0]), fdayIdx = parseInt(fparts[1]);
    var fday = program[fwk] && program[fwk].days[fdayIdx];
    if (fday) {
      var fdc = ac(fdayIdx);
      var fexs = fday.exercises.map(parseEx);
      return (
        <div style={{ position:"fixed", inset:0, background:BG, zIndex:500, display:"flex", flexDirection:"column", overflowY:"auto" }}>
          <div style={{ background:fdc, padding:"14px 18px 12px", display:"flex", alignItems:"center", position:"sticky", top:0, zIndex:10, flexShrink:0 }}>
            <button onClick={function(){setFullscreenDay(null);}} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div style={{ flex:1, textAlign:"center" }}>
              <div style={{ color:"#fff", fontSize:20, fontWeight:800 }}>{(fday.focus||"").toUpperCase()}</div>
              <div style={{ color:"rgba(255,255,255,0.65)", fontSize:12, marginTop:2 }}>{fexs.length} exercises</div>
            </div>
            <div style={{ width:36, flexShrink:0 }} />
          </div>
          <div style={{ padding:"16px 16px 40px" }}>
            {fexs.map(function(ex, i) {
              var vid = findVideo(ex.name);
              return (
                <div key={i} style={{ background:CARD, borderRadius:14, border:"1.5px solid "+BORDER, padding:"14px 16px", marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:8, height:8, borderRadius:99, background:vid?fdc:TEXT3, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ color:TEXT, fontSize:15, fontWeight:700 }}>{ex.name}</div>
                      <div style={{ display:"flex", gap:10, marginTop:4, flexWrap:"wrap" }}>
                        {ex.sets && <span style={{ color:TEXT3, fontSize:12 }}>{ex.sets} sets</span>}
                        {ex.reps && <span style={{ color:TEXT3, fontSize:12 }}>× {ex.reps} reps</span>}
                      </div>
                    </div>
                    {vid && <span style={{ background:fdc+"18", color:fdc, fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:6 }}>▶ Watch</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  }

  function saveToCoachLibrary(day, wkIdx) {
    var id = "lib-" + wkIdx + "-" + day.focus + "-" + day.day;
    if (coachLibrary.find(function(s) { return s.id === id; })) return;
    setCoachLibrary(function(prev) {
      return prev.concat([{
        id: id,
        name: day.focus,
        day: day.day,
        exercises: day.exercises,
        savedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }]);
    });
  }

  function removeFromCoachLibrary(id) {
    setCoachLibrary(function(prev) { return prev.filter(function(s) { return s.id !== id; }); });
  }

  function loadLibrarySession(session) {
    setLoadModal(session);
  }

  function confirmLoad(session, wkIdx) {
    var updated = JSON.parse(JSON.stringify(program));
    updated[wkIdx].days.push({
      focus: session.name,
      day: session.day || "Mon",
      exercises: session.exercises,
    });
    onUpdate(updated);
    setLoadModal(null);
    setCoachSection("program");
  }

  return (
    <div>
      {/* Add to program modal */}
      {loadModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: CARD, borderRadius: "20px 20px 0 0", padding: "24px 20px 32px", width: "100%", maxWidth: 430, margin: "0 auto" }}>
            <div style={{ color: TEXT, fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Add "{loadModal.name}"</div>
            <div style={{ color: TEXT2, fontSize: 13, marginBottom: 20 }}>Choose which week to add this session to:</div>
            {program.map(function(wk, wi) {
              return (
                <button key={wi} onClick={function() { confirmLoad(loadModal, wi); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: SURFACE, border: "1.5px solid "+BORDER, borderRadius: 12, padding: "14px 16px", cursor: "pointer", textAlign: "left", marginBottom: 8 }}>
                  <div>
                    <div style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>Week {wi+1}</div>
                    <div style={{ color: TEXT3, fontSize: 12, marginTop: 2 }}>{wk.days.length} sessions currently</div>
                  </div>
                  <div style={{ background: c, borderRadius: 8, padding: "5px 12px", color: "#fff", fontSize: 12, fontWeight: 700 }}>Add here</div>
                </button>
              );
            })}
            <button onClick={function() { setLoadModal(null); }} style={{ width: "100%", padding: "13px", borderRadius: 12, background: SURFACE, border: "1.5px solid "+BORDER, color: TEXT2, fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {editing && (
        <CoachProgramEditor
          program={program}
          onSave={function(updated) { onUpdate(updated); }}
          onClose={function() { setEditing(false); }}
        />
      )}
      <div style={{display:"flex",background:"#F0F5F2",borderRadius:12,padding:3,marginBottom:14,gap:3}}>
        <button onClick={function(){setCoachSection("program");}} style={{flex:1,padding:"9px 4px",borderRadius:9,border:"none",background:coachSection==="program"?"#fff":"transparent",color:coachSection==="program"?"#0A1A0F":"#7AAB8A",fontSize:12,fontWeight:coachSection==="program"?700:500,cursor:"pointer",boxShadow:coachSection==="program"?"0 1px 4px rgba(0,0,0,0.08)":"none"}}>
          Current Program
        </button>
        <button onClick={function(){setCoachSection("library");}} style={{flex:1,padding:"9px 4px",borderRadius:9,border:"none",background:coachSection==="library"?"#fff":"transparent",color:coachSection==="library"?"#0A1A0F":"#7AAB8A",fontSize:12,fontWeight:coachSection==="library"?700:500,cursor:"pointer",boxShadow:coachSection==="library"?"0 1px 4px rgba(0,0,0,0.08)":"none"}}>
          My Library
        </button>
      </div>

      {coachSection === "program" && (
        <div style={{background:"#F0F5F2",margin:"0 -16px",padding:"16px 16px 24px"}}>
          {/* Week selector + Edit button row */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
            <div style={{display:"flex",gap:6,flex:1}}>
              {program.map(function(w,i){
                var on=coachWk===i;
                return (
                  <button key={"cwk"+i} onClick={function(){setCoachWk(i);}}
                    style={{flex:1,padding:"9px 0",borderRadius:12,border:"1.5px solid "+(on?c:BORDER),background:on?c+"15":"transparent",color:on?c:TEXT3,fontSize:12,fontWeight:on?700:500,cursor:"pointer"}}>
                    Week {w.week}
                  </button>
                );
              })}
            </div>
            <button onClick={function(){setEditing(true);}} style={{display:"flex",alignItems:"center",gap:5,background:c+"18",border:"1.5px solid "+c+"44",borderRadius:10,padding:"8px 12px",cursor:"pointer",flexShrink:0}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span style={{color:c,fontSize:12,fontWeight:700}}>Edit</span>
            </button>
          </div>

          {/* Stacked day cards — mirrors client view exactly */}
          {program[coachWk] && program[coachWk].days.map(function(day, dayIdx) {
            var dc = ac(dayIdx);
            var isFeatured = dayIdx === 0;
            var exs = day.exercises.map(parseEx);

            // Build circuit groups
            var CIRCUIT_COLORS = ["#9B6FD4","#1B8C4E","#3B7DD8","#E0A020"];
            var groups = [];
            var _labelColorMap = {};
            var _colorIdx = 0;
            day.exercises.forEach(function(ex, ei) {
              var cl = getCircuitLabel(ex);
              var p = parseEx(ex); p.origIdx = ei; p.circuitLabel = cl;
              if (cl && groups.length > 0 && groups[groups.length-1].circuitLabel === cl) {
                groups[groups.length-1].items.push(p);
              } else {
                groups.push({ circuitLabel: cl, items: [p], circuitColor: null });
              }
              if (cl && !_labelColorMap[cl]) { _labelColorMap[cl] = CIRCUIT_COLORS[_colorIdx++ % CIRCUIT_COLORS.length]; }
              if (cl) { groups[groups.length-1].circuitColor = _labelColorMap[cl]; }
            });

            return (
              <div key={"cdc"+dayIdx} style={{
                background:"#fff", borderRadius:20, overflow:"hidden", marginBottom:12,
                border:"1.5px solid "+dc+"66",
                boxShadow:"0 4px 20px "+dc+"22"
              }}>
                <div style={{height:3,background:dc,width:"100%"}} />

                {/* Header */}
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px 10px"}}>
                  <div style={{flex:1}}>
                    <div style={{color:dc,fontSize:10,fontWeight:700,letterSpacing:1.5,marginBottom:3}}>{(day.day||"").toUpperCase()}</div>
                    <div style={{color:"#0A1A0F",fontSize:20,fontWeight:900,lineHeight:1.1}}>{(day.focus||"").toUpperCase()}</div>
                    <div style={{color:"#7AAB8A",fontSize:12,marginTop:3}}>{exs.length} exercises</div>
                  </div>
                  {/* Bookmark */}
                  {(function(){
                    var bKey = "saved-"+coachWk+"-"+dayIdx;
                    var isSaved = savedSessions.some(function(s){return s.id===bKey+"-"+day.focus;});
                    return (
                      <button onClick={function(e){e.stopPropagation(); saveSession(coachWk, dayIdx, day);}}
                        style={{width:36,height:36,borderRadius:10,background:isSaved?dc+"18":"#F0F5F2",border:"1.5px solid "+(isSaved?dc+"44":"#D0E6D8"),display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved?dc:"none"} stroke={isSaved?dc:"#7AAB8A"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                        </svg>
                      </button>
                    );
                  })()}
                </div>

                {/* Exercises — grouped by circuit */}
                <div style={{padding:"0 16px 14px"}}>
                  {groups.map(function(group, gi) {
                    var isCircuit = !!group.circuitLabel;
                    var cc = group.circuitColor || null;
                    var inner = group.items.map(function(ex) {
                      var vid = findVideo(ex.name);
                      return (
                        <div key={"ex"+ex.origIdx} style={{padding:"9px 0",borderBottom:"1px solid #F0EFEC"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:28,height:28,borderRadius:8,background:isCircuit?cc+"18":"#F0F5F2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:isCircuit?cc:"#7AAB8A",fontFamily:"monospace",flexShrink:0}}>{ex.origIdx+1}</div>
                            <div style={{color:"#0A1A0F",fontSize:14,fontWeight:500,flex:1}}>{ex.name}</div>
                            {ex.sets&&ex.reps&&<div style={{fontSize:11,fontWeight:600,color:"#7AAB8A",background:"#F0F5F2",padding:"4px 8px",borderRadius:8,fontFamily:"monospace",flexShrink:0}}>{ex.sets}×{ex.reps}</div>}
                            <input
                              type="number"
                              placeholder="lbs"
                              value={exLogs[coachWk+"-"+dayIdx+"-"+ex.origIdx]||""}
                              onChange={function(e){logWeight(coachWk+"-"+dayIdx+"-"+ex.origIdx, e.target.value);}}
                              style={{width:52,background:"#F0F5F2",border:"1.5px solid #E8E4DE",borderRadius:8,padding:"4px 6px",fontSize:11,fontWeight:600,color:"#0A1A0F",textAlign:"center",outline:"none",flexShrink:0}}
                            />
                            {vid&&<button onClick={function(e){e.stopPropagation();setVideoModal({video:vid,name:ex.name});}} style={{background:dc+"18",border:"none",borderRadius:7,padding:"4px 8px",color:dc,fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0}}>▶</button>}
                          </div>
                        </div>
                      );
                    });
                    if (isCircuit) {
                      return (
                        <div key={"grp"+gi} style={{border:"1.5px solid "+cc+"55",borderRadius:12,marginBottom:6,overflow:"hidden"}}>
                          <div style={{background:cc,padding:"5px 12px",display:"flex",alignItems:"center",gap:6}}>
                            <span style={{color:"#fff",fontSize:10,fontWeight:800,letterSpacing:1}}>⚡ {group.circuitLabel.toUpperCase()}</span>
                            <span style={{color:"rgba(255,255,255,0.6)",fontSize:10,marginLeft:"auto"}}>{group.items.length} exercises</span>
                          </div>
                          <div style={{padding:"0 12px"}}>{inner}</div>
                        </div>
                      );
                    }
                    return <div key={"grp"+gi}>{inner}</div>;
                  })}
                </div>

                {/* Expand button */}
                <div style={{padding:"0 16px 14px"}}>
                  <button onClick={function(){setFullscreenDay(coachWk+"-"+dayIdx);}}
                    style={{width:"100%",padding:"9px 14px",borderRadius:10,background:dc,border:"none",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:0.2}}>
                    Expand
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {coachSection === "library" && (
        <CoachWorkoutLibrary color={c} library={coachLibrary} onRemove={removeFromCoachLibrary} onLoadIntoProgram={loadLibrarySession} />
      )}
    </div>
  );
}

function ClientDetail({ client, onBack, isCoach, defaultTab, favorites, watchDays, messages, onSend, coachProgram, setCoachProgram, programDayIndex, setProgramDayIndex, myPlans, activityLogs }) {
  const tabs = isCoach ? ["Progress","Program","My Plan","Calendar","Messages"] : [];
  const [tab, setTab] = useState(defaultTab || "Progress");
  const [currentGoal, setCurrentGoal] = useState(client.goal);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(client.goal);
  const c = client.color || ORANGE;

  function saveGoal() {
    if (goalDraft.trim()) setCurrentGoal(goalDraft.trim());
    setEditingGoal(false);
  }

  return (
    <div style={{background:CARD}}>

      {tabs.length > 0 && (
      <div style={{ display: "flex", background: "#F0F5F2", borderRadius: 14, padding: 4, marginBottom: 18, gap: 4 }}>
        {tabs.map(function(t) {
          const active = tab === t;
          return (
            <button key={t} onClick={function() { setTab(t); }} style={{ flex: 1, padding: "10px 4px", borderRadius: 10, border: "none", background: active ? "#0A1A0F" : "transparent", color: active ? "#fff" : "#7AAB8A", fontSize: 13, fontWeight: active ? 700 : 500, cursor: "pointer", boxShadow: active ? "0 2px 6px rgba(0,0,0,0.15)" : "none", transition: "all 0.2s" }}>
              {t}
            </button>
          );
        })}
      </div>
      )}

      {(tab === "Progress" || tab === "Goals") && isCoach && (
        <GoalProgressTab client={client} isCoach={isCoach} color={c} onTabChange={setTab} />
      )}

      {tab === "Program" && (
        <div>
          {!isCoach && (
            <ProgramWithCustom program={coachProgram} color={c} favorites={favorites} initialDayIndex={programDayIndex} onDayIndexUsed={function() { if (setProgramDayIndex) setProgramDayIndex(null); }} myPlans={myPlans} />
          )}
          {isCoach && (
            <CoachProgramTabView program={coachProgram} color={c} onUpdate={setCoachProgram} />
          )}
        </div>
      )}

      {tab === "My Plan" && (
        <RaceScreen activityLogs={activityLogs || {}} raceCollapsed={{}} setRaceCollapsed={function(){}} plans={myPlans || {}} setPlans={function(){}} readOnly={true} />
      )}

      {tab === "Calendar" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ color: TEXT2, fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>{MONTH_NAME.toUpperCase()}</div>
            <Pill label={client.workedOut.length + " workouts"} color={c} bg={c+"18"} />
          </div>
          <div style={{ background: CARD, borderRadius: 16, padding: "16px", border: "1.5px solid "+BORDER }}>
            <CalHeatmap workedOut={client.workedOut} color={c} isEditable={!isCoach} watchDays={!isCoach ? watchDays : null} />
          </div>
        </div>
      )}

      {tab === "Messages" && (
        <div>
          <div style={{ color: TEXT, fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            {isCoach ? client.name : COACH_NAME}
          </div>
          <div style={{ color: TEXT3, fontSize: 12, marginBottom: 16 }}>
            {isCoach ? "Accountability + Performance Coach" : "Your Coach"}
          </div>
          <MessagingInbox
            clientId={client.id}
            clientName={client.name}
            clientColor={c}
            isCoach={isCoach}
            messages={messages || []}
            onSend={onSend}
          />
        </div>
      )}
    </div>
  );
}

// ---

function HomeScreen({ isCoach, goTo, setClient, goToClientTab, messages, monthStats, coachProgram, activityLogs, myPlans, thisWeekPlanned }) {
  const dayHour = TODAY.getHours();
  const greeting = dayHour < 12 ? "Good morning" : dayHour < 17 ? "Good afternoon" : "Good evening";
  const stats = monthStats || { totalWorkouts: 0, totalMiles: "0.0", restDays: 0 };

  // Get week 1 sessions from live program
  var week1 = coachProgram && coachProgram[0] ? coachProgram[0].days : [];
  var sessionCount = week1.length;

  // thisWeekPlanned is pre-computed in MainApp where myPlans state lives (avoids key mismatch)
  var _twp = thisWeekPlanned || [];
  var plannedCount = _twp.filter(function(d) { return d.acts && d.acts.length > 0; }).length;

  // Today's step count from activity logs
  var todayKey = TODAY.getDate();
  var monthKey = TODAY.getFullYear() + "-" + TODAY.getMonth();
  var todayLogs = (activityLogs && activityLogs[monthKey] && activityLogs[monthKey][todayKey]) || [];
  var todaySteps = (monthStats && monthStats.todaySteps) || todayLogs.reduce(function(s, a) { return s + (parseInt(a.steps) || 0); }, 0) || 0;

  // Get latest message per client for coach inbox preview
  const inboxItems = isCoach ? CLIENTS.map(function(c) {
    const thread = messages[c.id] || [];
    const latest = thread[thread.length - 1];
    return { client: c, latest: latest };
  }).filter(function(item) { return !!item.latest; }) : [];

  return (
    <div style={{ paddingBottom: 8, margin: "0 -16px" }}>

      {/* Top greeting bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px 18px" }}>
        <div>
          <div style={{ color: TEXT3, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{greeting.toUpperCase()}</div>
          <div style={{ color: TEXT, fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>
            {isCoach ? COACH_NAME : CLIENTS[0].name}
          </div>
        </div>
        {!isCoach && (
          <div style={{ textAlign: "right" }}>
            <div style={{ color: TEXT, fontSize: 20, fontWeight: 900 }}>12 </div>
            <div style={{ color: TEXT3, fontSize: 10, fontWeight: 600 }}>DAY STREAK</div>
          </div>
        )}
      </div>

      {isCoach ? (
        <div>
          {/* Coach card 1 -- Your Clients */}
          <div style={{ background: "#0A1A0F", position: "relative", overflow: "hidden", marginBottom: 3 }}>
            <div style={{ padding: "32px 20px 28px", position: "relative" }}>
              <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(27,140,78,0.12)" }} />
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>YOUR ROSTER</div>
              <div style={{ display: "flex", marginBottom: 12 }}>
                {CLIENTS.map(function(c, i) {
                  return (
                    <div key={c.id} style={{ width: 52, height: 52, borderRadius: 99, background: c.color, border: "3px solid #0A1A0F", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: i > 0 ? -16 : 0, fontSize: 16, fontWeight: 800, color: "#fff" }}>
                      {c.avatar}
                    </div>
                  );
                })}
              </div>
              <div style={{ color: "#fff", fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: -1, marginBottom: 16, textTransform: "uppercase" }}>
                {CLIENTS.length} CLIENTS<br/>ACTIVE
              </div>
              <button onClick={function() { goTo("clients"); }} style={{ background: "#fff", border: "none", color: "#0A1A0F", padding: "12px 24px", borderRadius: 99, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                View All
              </button>
            </div>
          </div>

          {/* Coach card 2 -- Program */}
          <div style={{ background: "#0D3320", position: "relative", overflow: "hidden", marginBottom: 3 }}>
            <div style={{ padding: "32px 20px 28px", position: "relative" }}>
              <div style={{ position: "absolute", top: -30, right: -30, width: 130, height: 130, borderRadius: "50%", background: "rgba(43,173,102,0.12)" }} />
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>3-WEEK PROGRAM</div>
              <div style={{ color: "#fff", fontSize: 34, fontWeight: 900, lineHeight: 1.05, letterSpacing: -1, marginBottom: 8, textTransform: "uppercase" }}>
                EDIT YOUR<br/>PROGRAM
              </div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: 20 }}>Push, pull, legs -- shared across all clients</div>
              <button onClick={function() { setClient(CLIENTS[0]); goTo("clients"); setClientDefaultTab && setClientDefaultTab("Program"); }} style={{ background: "#1B8C4E", border: "none", color: "#fff", padding: "12px 24px", borderRadius: 99, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                Edit Program
              </button>
            </div>
          </div>

          {/* Coach card 3 -- Inbox */}
          {inboxItems.length > 0 && (
            <div style={{ background: "#111", position: "relative", overflow: "hidden", marginBottom: 3 }}>
              <div style={{ padding: "32px 20px 28px" }}>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>INBOX</div>
                <div style={{ color: "#fff", fontSize: 34, fontWeight: 900, lineHeight: 1.05, letterSpacing: -1, marginBottom: 16, textTransform: "uppercase" }}>
                  {inboxItems.filter(function(i) { return i.latest.from === "client"; }).length} NEW<br/>MESSAGES
                </div>
                {inboxItems.slice(0,2).map(function(item) {
                  const isUnread = item.latest.from === "client";
                  return (
                    <div key={item.client.id} onClick={function() { setClient(item.client); goTo("clients"); }} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 99, background: item.client.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{item.client.avatar}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: isUnread ? "#fff" : "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: isUnread ? 700 : 500 }}>{item.client.name}</div>
                        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                          {item.latest.text || "Check-in update"}
                        </div>
                      </div>
                      {isUnread && <div style={{ width: 8, height: 8, borderRadius: 99, background: item.client.color, flexShrink: 0 }} />}
                    </div>
                  );
                })}
                <button onClick={function() { goTo("directmessage"); }} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "12px 24px", borderRadius: 99, fontSize: 14, fontWeight: 800, cursor: "pointer", marginTop: 8 }}>
                  Open Inbox
                </button>
              </div>
            </div>
          )}

          {/* Coach card 4 -- Library */}
          <div style={{ background: "#0A1A2F", position: "relative", overflow: "hidden" }}>
            <div style={{ padding: "32px 20px 28px", position: "relative" }}>
              <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(37,99,176,0.2)" }} />
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>EXERCISE LIBRARY</div>
              <div style={{ color: "#fff", fontSize: 34, fontWeight: 900, lineHeight: 1.05, letterSpacing: -1, marginBottom: 8, textTransform: "uppercase" }}>
                VIDEO<br/>DEMOS
              </div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: 20 }}>
                {VIDEO_LIBRARY.filter(function(v) { return !!v.url; }).length} of {VIDEO_LIBRARY.length} videos linked
              </div>
              <button onClick={function() { goTo("library"); }} style={{ background: "#2563B0", border: "none", color: "#fff", padding: "12px 24px", borderRadius: 99, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                Manage Library
              </button>
            </div>
          </div>        </div>
      ) : (
        <div>
          {/* Client card 1 -- Program */}
          <div style={{ position: "relative", overflow: "hidden", marginBottom: 3 }}>
            <img src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80" alt="" style={{ width: "100%", height: 340, objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,26,15,0.2) 0%, rgba(10,26,15,0.85) 55%, #0A1A0F 100%)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 20px 28px" }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>THIS WEEK</div>
              <div style={{ color: "#fff", fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: -1, marginBottom: 8, textTransform: "uppercase", WebkitTextStroke: "1.5px #000", paintOrder: "stroke fill" }}>
                YOUR<br/>PROGRAM
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 16 }}>
                {plannedCount > 0 ? plannedCount + " activities planned this week" : sessionCount + " sessions from your coach"}
              </div>

              {/* Show My Plan days if any are planned, otherwise fall back to coach program chips */}
              {plannedCount > 0 ? (
                <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto" }}>
                  {_twp.map(function(d, i) {
                    var hasPlan = d.acts.length > 0;
                    if (!hasPlan) return null;
                    var act = d.acts[0];
                    var actColor = act.color || "#1B8C4E";
                    var isToday = d.isToday;
                    return (
                      <div key={"plan-chip-"+i} onClick={function() { goTo("race"); }} style={{ background: isToday ? actColor : "rgba(255,255,255,0.12)", border: isToday ? "none" : "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "10px 12px", textAlign: "center", cursor: "pointer", flexShrink: 0 }}>
                        <div style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{d.day.toUpperCase()}</div>
                        <div style={{ fontSize: 14, marginTop: 2, color: "#fff", display:"flex", alignItems:"center", justifyContent:"center" }} dangerouslySetInnerHTML={{ __html: act.emoji || ICON_WORKOUT }} />
                        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 9, marginTop: 2, maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.label}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                  {week1.slice(0, 3).map(function(day, i) {
                    var dayAbbr = (day.day || "").substring(0, 3).toUpperCase();
                    return (
                      <div key={"daychip-"+i} onClick={function() { goToClientTab("Program", i); }} style={{ flex: 1, background: i === 0 ? "#1B8C4E" : "rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 6px", textAlign: "center", cursor: "pointer" }}>
                        <div style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{dayAbbr}</div>
                        <div style={{ color: i === 0 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 2 }}>{(day.focus||"").toUpperCase()}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                {plannedCount > 0 && (
                  <button onClick={function() { goTo("race"); }} style={{ background: "#1B8C4E", border: "none", color: "#fff", padding: "12px 24px", borderRadius: 99, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                    View My Plan
                  </button>
                )}
                <button onClick={function() { goToClientTab("Program"); }} style={{ background: plannedCount > 0 ? "rgba(255,255,255,0.15)" : "#1B8C4E", border: plannedCount > 0 ? "1px solid rgba(255,255,255,0.3)" : "none", color: "#fff", padding: "12px 24px", borderRadius: 99, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                  {plannedCount > 0 ? "Coach Program" : "Start Training"}
                </button>
              </div>
            </div>
          </div>

          {/* Client card 2 -- Stats */}
          <div style={{ position: "relative", overflow: "hidden", marginBottom: 3 }}>
            <img src="https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600&q=80" alt="" style={{ width: "100%", height: 300, objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(13,31,58,0.2) 0%, rgba(13,31,58,0.85) 55%, #0D1F3A 100%)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 20px 28px" }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>THIS MONTH</div>
              <div style={{ color: "#fff", fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: -1, marginBottom: 20, textTransform: "uppercase", WebkitTextStroke: "1.5px #000", paintOrder: "stroke fill" }}>
                YOUR<br/>PROGRESS
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                  { val: String(stats.totalWorkouts), label: "Activities" },
                  { val: stats.totalMiles+"mi", label: "Miles" },
                  { val: todaySteps.toLocaleString(), label: "Steps Today" },
                ].map(function(s) {
                  return (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 8px", textAlign: "center", backdropFilter: "blur(4px)" }}>
                      <div style={{ color: "#fff", fontSize: 22, fontWeight: 900 }}>{s.val}</div>
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 3, fontWeight: 600 }}>{s.label.toUpperCase()}</div>
                    </div>
                  );
                })}
              </div>
              <button onClick={function() { goTo("analytics"); }} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "12px 28px", borderRadius: 99, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                View Analytics
              </button>
            </div>
          </div>

          {/* Client card 3 -- Library */}
          <div style={{ position: "relative", overflow: "hidden", marginBottom: 3 }}>
            <img src="https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=600&q=80" alt="" style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(26,13,46,0.2) 0%, rgba(26,13,46,0.85) 55%, #1A0D2E 100%)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 20px 28px" }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>EXERCISE DEMOS</div>
              <div style={{ color: "#fff", fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: -1, marginBottom: 8, textTransform: "uppercase", WebkitTextStroke: "1.5px #000", paintOrder: "stroke fill" }}>
                WATCH<br/>AND LEARN
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 20 }}>Form videos for every exercise in your program</div>
              <button onClick={function() { goTo("library"); }} style={{ background: "#9B6FD4", border: "none", color: "#fff", padding: "12px 28px", borderRadius: 99, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                Open Library
              </button>
            </div>
          </div>

          {/* Client card 4 -- Messages */}
          <div style={{ position: "relative", overflow: "hidden" }}>
            <img src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&q=80" alt="" style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,26,15,0.2) 0%, rgba(10,26,15,0.85) 55%, #0A1A0F 100%)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 20px 28px" }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>YOUR COACH</div>
              <div style={{ color: "#fff", fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: -1, marginBottom: 8, textTransform: "uppercase", WebkitTextStroke: "1.5px #000", paintOrder: "stroke fill" }}>
                CHAT WITH<br/>CAMERON
              </div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 20 }}>Questions, check-ins, feedback -- all in one place</div>
              <button onClick={function() { goToClientTab("Messages"); }} style={{ background: "#fff", border: "none", color: "#0A1A0F", padding: "12px 28px", borderRadius: 99, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                Open Messages
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientsScreen({ isCoach, selected, setSelected, clientDefaultTab, setClientDefaultTab, favorites, watchDays, messages, onSend, coachProgram, setCoachProgram, activityLogs, onLogsChange, programDayIndex, setProgramDayIndex, myPlans }) {
  if (selected) {
    return <ClientDetail client={selected} onBack={function() { setSelected(null); setClientDefaultTab("Progress"); }} isCoach={isCoach} defaultTab={clientDefaultTab} favorites={favorites} watchDays={watchDays} messages={messages[selected.id] || []} onSend={onSend} coachProgram={coachProgram} setCoachProgram={setCoachProgram} programDayIndex={programDayIndex} setProgramDayIndex={setProgramDayIndex} myPlans={myPlans} activityLogs={activityLogs} />;
  }
  if (!isCoach) {
    return <ClientDetail client={CLIENTS[0]} onBack={null} isCoach={false} defaultTab={clientDefaultTab} favorites={favorites} watchDays={watchDays} messages={messages[CLIENTS[0].id] || []} onSend={onSend} coachProgram={coachProgram} setCoachProgram={setCoachProgram} programDayIndex={programDayIndex} setProgramDayIndex={setProgramDayIndex} myPlans={myPlans} activityLogs={activityLogs} />;
  }
  return (
    <div>
      <div style={{ color: TEXT, fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{isCoach ? "My Clients" : "My Profile"}</div>
      <div style={{ color: TEXT2, fontSize: 14, marginBottom: 20 }}>{isCoach ? CLIENTS.length+" active clients" : "Select your profile to continue"}</div>
      {CLIENTS.map(function(c) {
        return (
          <div key={c.id} onClick={function() { setSelected(c); }} style={{ background: CARD, border: "1.5px solid "+BORDER, borderRadius: 18, padding: "16px", marginBottom: 12, cursor: "pointer", overflow: "hidden", position: "relative" }}
            onMouseEnter={function(e) { e.currentTarget.style.borderColor = c.color; }}
            onMouseLeave={function(e) { e.currentTarget.style.borderColor = BORDER; }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: c.color, borderRadius: "4px 0 0 4px" }} />
            <div style={{ paddingLeft: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <Avatar initials={c.avatar} size={48} color={c.color} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: TEXT, fontSize: 17, fontWeight: 700 }}>{c.name}</div>
                  <div style={{ color: TEXT2, fontSize: 12, marginTop: 2 }}>Client since {c.since || "—"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: c.color, fontSize: 22, fontWeight: 800 }}>{c.streak}</div>
                  <div style={{ color: TEXT3, fontSize: 10 }}> streak</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const DEFAULT_LIB_CATS = ["All","Chest","Back","Legs","Shoulders","Arms","Core","Cardio"];

function LibraryScreen({ isCoach, favorites, toggleFavorite }) {
  const [search, setSearch]     = useState("");
  const [cat, setCat]           = useState("All");
  const [modal, setModal]       = useState(null);
  const [editing, setEditing]   = useState(null);
  const [editUrl, setEditUrl]   = useState("");
  const [lib, setLib]           = useState(VIDEO_LIBRARY);
  const [showFavs, setShowFavs] = useState(false);
  const [libCats, setLibCats]   = useState(DEFAULT_LIB_CATS);
  const [showAddEx, setShowAddEx] = useState(false);
  const [showAddTag, setShowAddTag] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [newExCat, setNewExCat]   = useState("Chest");
  const [newExUrl, setNewExUrl]   = useState("");
  const [newTagName, setNewTagName] = useState("");

  function addExercise() {
    if (!newExName.trim()) return;
    var newEx = { id: "custom-" + Date.now(), name: newExName.trim(), cat: newExCat, url: newExUrl.trim() };
    setLib(function(prev) { return prev.concat([newEx]); });
    setNewExName(""); setNewExUrl(""); setShowAddEx(false);
  }
  function addTag() {
    var t = newTagName.trim();
    if (!t || libCats.indexOf(t) !== -1) return;
    setLibCats(function(prev) { return prev.concat([t]); });
    setNewTagName(""); setShowAddTag(false);
  }
  function removeExercise(id) {
    setLib(function(prev) { return prev.filter(function(v) { return v.id !== id; }); });
  }

  const favIds = Object.keys(favorites || {}).filter(function(k) { return favorites[k]; });

  const filtered = lib.filter(function(v) {
    if (showFavs) return !!(favorites && favorites[v.name]);
    return (cat === "All" || v.cat === cat) && (search === "" || v.name.toLowerCase().indexOf(search.toLowerCase()) !== -1);
  });

  const linked = lib.filter(function(v) { return !!v.url; }).length;

  function toggleFav(id, name, e) {
    e.stopPropagation();
    if (toggleFavorite) toggleFavorite(name);
  }

  function saveUrl(id) {
    setLib(lib.map(function(v) { return v.id === id ? Object.assign({}, v, { url: editUrl }) : v; }));
    setEditing(null);
  }

  return (
    <div>
      {modal ? <VideoModal video={modal} exName={modal.name} onClose={function() { setModal(null); }} /> : null}
      {/* Fun header */}
      <div style={{ background: "linear-gradient(135deg, #0A1A0F 0%, #1B8C4E 100%)", borderRadius: 20, padding: "20px 18px", marginBottom: 18, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", bottom: -30, right: 20, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>FORM DEMOS</div>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginBottom: 4 }}>Exercise Library</div>
        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>{isCoach ? "Manage video demos for your clients" : "Watch form demos · nail your technique"}</div>
        {isCoach && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600 }}>Videos linked</span>
              <span style={{ color: "#4DDB8A", fontSize: 11, fontWeight: 700 }}>{linked} of {lib.length}</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 99, height: 5, overflow: "hidden" }}>
              <div style={{ width: (linked/lib.length*100)+"%", height: "100%", background: "#4DDB8A", borderRadius: 99 }} />
            </div>
          </div>
        )}
      </div>
      {isCoach && (
        <div style={{ background: CARD, borderRadius: 14, padding: "12px 16px", marginBottom: 16, border: "1.5px solid "+BORDER }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>Videos linked</span>
            <span style={{ color: "#1B8C4E", fontSize: 13, fontWeight: 700 }}>{linked} of {lib.length}</span>
          </div>
          <div style={{ background: SURFACE2, borderRadius: 99, height: 8, overflow: "hidden" }}>
            <div style={{ width: (linked/lib.length*100)+"%", height: "100%", background: ORANGE, borderRadius: 99 }} />
          </div>
        </div>
      )}
{favIds.length > 0 && (
        <div onClick={function() { setShowFavs(!showFavs); setCat("All"); setSearch(""); }}
          style={{ background: showFavs ? "#FFF8E1" : CARD, border: "1.5px solid "+(showFavs ? "#F5C518" : BORDER), borderRadius: 14, padding: "12px 16px", marginBottom: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#F5C518" stroke="#F5C518" strokeWidth="1.5"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
          <div style={{ flex: 1 }}>
            <div style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>Favorites</div>
            <div style={{ color: TEXT3, fontSize: 12, marginTop: 1 }}>{favIds.length} exercise{favIds.length !== 1 ? "s" : ""} saved</div>
          </div>
          <span style={{ color: showFavs ? "#F5C518" : TEXT3, fontSize: 13, fontWeight: 600 }}>{showFavs ? "Show All" : "View"}</span>
        </div>
      )}
{isCoach && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={function() { setShowAddEx(!showAddEx); setShowAddTag(false); }} style={{ flex: 1, padding: "11px", borderRadius: 12, background: showAddEx ? ORANGE : CARD, border: "1.5px solid "+(showAddEx ? ORANGE : BORDER), color: showAddEx ? "#fff" : TEXT, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Exercise</button>
            <button onClick={function() { setShowAddTag(!showAddTag); setShowAddEx(false); }} style={{ flex: 1, padding: "11px", borderRadius: 12, background: showAddTag ? "#3B7DD8" : CARD, border: "1.5px solid "+(showAddTag ? "#3B7DD8" : BORDER), color: showAddTag ? "#fff" : TEXT, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add Tag</button>
          </div>
          {showAddEx && (
            <div style={{ background: CARD, border: "1.5px solid "+ORANGE, borderRadius: 14, padding: 16, marginBottom: 4 }}>
              <div style={{ color: TEXT, fontSize: 14, fontWeight: 800, marginBottom: 14 }}>New Exercise</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ color: TEXT3, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 5 }}>EXERCISE NAME</div>
                <input value={newExName} onChange={function(e) { setNewExName(e.target.value); }} placeholder="e.g. Romanian Deadlift" style={{ width: "100%", background: SURFACE, border: "1.5px solid "+BORDER, borderRadius: 10, padding: "10px 12px", color: TEXT, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ color: TEXT3, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 5 }}>CATEGORY TAG</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {libCats.filter(function(c) { return c !== "All"; }).map(function(c) {
                    var active = newExCat === c;
                    return <button key={c} onClick={function() { setNewExCat(c); }} style={{ padding: "6px 14px", borderRadius: 99, background: active ? ORANGE : SURFACE, border: "1.5px solid "+(active ? ORANGE : BORDER), color: active ? "#fff" : TEXT2, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{c}</button>;
                  })}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: TEXT3, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 5 }}>YOUTUBE URL <span style={{ fontWeight: 400 }}>(optional)</span></div>
                <input value={newExUrl} onChange={function(e) { setNewExUrl(e.target.value); }} placeholder="https://www.youtube.com/watch?v=..." style={{ width: "100%", background: SURFACE, border: "1.5px solid "+BORDER, borderRadius: 10, padding: "10px 12px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addExercise} style={{ flex: 1, padding: "11px", borderRadius: 10, background: newExName.trim() ? ORANGE : SURFACE2, border: "none", color: newExName.trim() ? "#fff" : TEXT3, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Save Exercise</button>
                <button onClick={function() { setShowAddEx(false); setNewExName(""); setNewExUrl(""); }} style={{ padding: "11px 16px", borderRadius: 10, background: "none", border: "1.5px solid "+BORDER, color: TEXT2, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
          {showAddTag && (
            <div style={{ background: CARD, border: "1.5px solid #3B7DD8", borderRadius: 14, padding: 16, marginBottom: 4 }}>
              <div style={{ color: TEXT, fontSize: 14, fontWeight: 800, marginBottom: 14 }}>New Category Tag</div>
              <div style={{ color: TEXT3, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>TAG NAME</div>
              <input value={newTagName} onChange={function(e) { setNewTagName(e.target.value); }} placeholder="e.g. Mobility, Olympic, Glutes..." style={{ width: "100%", background: SURFACE, border: "1.5px solid "+BORDER, borderRadius: 10, padding: "10px 12px", color: TEXT, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
              <div style={{ color: TEXT3, fontSize: 11, marginBottom: 14 }}>Existing: {libCats.filter(function(c){return c!=="All";}).join(", ")}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addTag} style={{ flex: 1, padding: "11px", borderRadius: 10, background: newTagName.trim() ? "#3B7DD8" : SURFACE2, border: "none", color: newTagName.trim() ? "#fff" : TEXT3, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add Tag</button>
                <button onClick={function() { setShowAddTag(false); setNewTagName(""); }} style={{ padding: "11px 16px", borderRadius: 10, background: "none", border: "1.5px solid "+BORDER, color: TEXT2, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
{!showFavs && (
        <>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <input value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="Search exercises..." style={{ width: "100%", background: CARD, border: "1.5px solid "+BORDER, borderRadius: 12, padding: "11px 14px 11px 38px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: TEXT3, fontSize: 15 }}><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span></span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {libCats.map(function(c) {
              const active = cat === c;
              const cColor = { "All":ORANGE,"Chest":"#1B8C4E","Back":BLUE,"Legs":PURPLE,"Shoulders":"#1B8C4E","Arms":GOLD,"Core":ORANGE,"Cardio":RED }[c] || ORANGE;
              return (
                <button key={c} onClick={function() { setCat(c); }}
                  style={{ padding: "7px 14px", borderRadius: 99, background: active ? cColor : SURFACE, border: "1.5px solid "+(active ? cColor : BORDER), color: active ? "#fff" : TEXT2, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {c}
                </button>
              );
            })}
          </div>
        </>
      )}
{showFavs && (
        <div style={{ color: TEXT2, fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>
          * YOUR FAVORITES ({favIds.length})
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: TEXT3, fontSize: 13 }}>
            {showFavs ? "No favorites yet -- tap * on any exercise to save it" : "No exercises found"}
          </div>
        )}
        {filtered.map(function(v) {
          const isOpen = editing === v.id;
          const isFav  = !!favorites[v.id];
          return (
            <div key={v.id}>
              <div style={{ background: CARD, border: "1.5px solid "+(isOpen ? ORANGE : BORDER), borderRadius: isOpen ? "16px 16px 0 0" : 16, padding: "13px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: isOpen ? "0 4px 14px rgba(27,140,78,0.1)" : "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ flex: 1, cursor: "pointer" }} onClick={function() {
                  if (isCoach) { setEditing(isOpen ? null : v.id); setEditUrl(v.url); }
                  else if (v.url) { setModal(v); }
                }}>
                  <div style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>{v.name}</div>
                  <div style={{ color: TEXT3, fontSize: 11, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ background: SURFACE, borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>{v.cat}</span>
                  </div>
                </div>
                <button onClick={function(e) { toggleFav(v.id, v.name, e); }} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", padding: "4px 6px", lineHeight: 1, flexShrink: 0 }}>
                  {!!(favorites && favorites[v.name]) ? (<svg width="20" height="20" viewBox="0 0 24 24" fill="#F5C518" stroke="#F5C518" strokeWidth="1.5"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>) : (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C0C8C4" strokeWidth="1.5"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>)}
                </button>
                <div onClick={function() {
                  if (isCoach) { setEditing(isOpen ? null : v.id); setEditUrl(v.url); }
                  else if (v.url) { setModal(v); }
                }} style={{ cursor: "pointer" }}>
                  {v.url
                    ? <span style={{ background: ORANGE, color: "#fff", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700 }}>{isCoach ? "Edit" : "▶ Watch"}</span>
                    : <span style={{ background: SURFACE, color: TEXT3, borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 600 }}>{isCoach ? "+ Add" : "No video"}</span>
                  }
                </div>
              </div>
{isCoach && isOpen && (
                <div style={{ background: ORANGE_BG, border: "1.5px solid "+ORANGE, borderTop: "1px solid "+ORANGE_BR, borderRadius: "0 0 14px 14px", padding: "14px 14px 16px" }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: TEXT2, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Exercise Name</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input defaultValue={v.name} id={"name-"+v.id} style={{ flex: 1, background: CARD, border: "1.5px solid "+BORDER, borderRadius: 10, padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none" }} />
                      <button onClick={function() { var el = document.getElementById("name-"+v.id); if (el && el.value.trim()) { setLib(lib.map(function(x) { return x.id === v.id ? Object.assign({}, x, { name: el.value.trim() }) : x; })); } }} style={{ padding: "9px 14px", borderRadius: 10, background: ORANGE, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Save</button>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: TEXT2, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Key Cues</div>
                    {(v.cues || []).map(function(cue, ci) {
                      return (
                        <div key={ci} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                          <div style={{ width: 20, height: 20, borderRadius: 99, background: ORANGE, color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ci+1}</div>
                          <input defaultValue={cue} id={"cue-"+v.id+"-"+ci} style={{ flex: 1, background: CARD, border: "1.5px solid "+BORDER, borderRadius: 8, padding: "7px 10px", color: TEXT, fontSize: 13, outline: "none" }} />
                          <button onClick={function() {
                            setLib(lib.map(function(x) {
                              if (x.id !== v.id) return x;
                              var newCues = (x.cues || []).filter(function(_, i) { return i !== ci; });
                              return Object.assign({}, x, { cues: newCues });
                            }));
                          }} style={{ background: "none", border: "none", color: TEXT3, fontSize: 18, cursor: "pointer", padding: "0 4px" }}>×</button>
                        </div>
                      );
                    })}
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      <button onClick={function() {
                        var newCues = (v.cues || []).slice();
                        newCues.forEach(function(_, ci) {
                          var el = document.getElementById("cue-"+v.id+"-"+ci);
                          if (el) newCues[ci] = el.value;
                        });
                        newCues.push("");
                        setLib(lib.map(function(x) { return x.id === v.id ? Object.assign({}, x, { cues: newCues }) : x; }));
                      }} style={{ flex: 1, padding: "8px", borderRadius: 8, background: CARD, border: "1.5px dashed "+BORDER, color: TEXT2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Add Cue</button>
                      <button onClick={function() {
                        var newCues = (v.cues || []).map(function(_, ci) {
                          var el = document.getElementById("cue-"+v.id+"-"+ci);
                          return el ? el.value.trim() : _;
                        }).filter(Boolean);
                        setLib(lib.map(function(x) { return x.id === v.id ? Object.assign({}, x, { cues: newCues }) : x; }));
                      }} style={{ flex: 1, padding: "8px", borderRadius: 8, background: ORANGE, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save Cues</button>
                    </div>
                  </div>
                  <div style={{ color: TEXT2, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>YouTube URL</div>
                  <input value={editUrl} onChange={function(e) { setEditUrl(e.target.value); }} placeholder="https://www.youtube.com/watch?v=..." style={{ width: "100%", background: CARD, border: "1.5px solid "+BORDER, borderRadius: 10, padding: "10px 12px", color: TEXT, fontSize: 12, outline: "none", boxSizing: "border-box", marginBottom: 10 }} />
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <button onClick={function() { saveUrl(v.id); }} style={{ flex: 1, padding: 11, borderRadius: 10, background: ORANGE, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Save URL</button>
                    <button onClick={function() { saveUrl(v.id); setTimeout(function() { setModal(Object.assign({}, v, { url: editUrl })); }, 100); }} style={{ flex: 1, padding: 11, borderRadius: 10, background: CARD, border: "1.5px solid "+BORDER, color: TEXT2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save + Preview</button>
                  </div>
                  {v.url && <button onClick={function() { setLib(lib.map(function(x) { return x.id === v.id ? Object.assign({}, x, { url: "" }) : x; })); setEditing(null); }} style={{ width: "100%", padding: 8, background: "none", border: "none", color: TEXT3, fontSize: 12, cursor: "pointer" }}>Remove video</button>}
                  <button onClick={function() { removeExercise(v.id); setEditing(null); }} style={{ width: "100%", marginTop: 4, padding: 9, background: "none", border: "1.5px solid #E05252", borderRadius: 10, color: "#E05252", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Delete Exercise</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
{!showFavs && !isCoach && (
        <div style={{ textAlign: "center", color: TEXT3, fontSize: 12, marginTop: 16, paddingBottom: 8 }}>
          Tap * on any exercise to save it to favorites
        </div>
      )}
    </div>
  );
}


function RecentActivityTimeline({ activityLogs }) {
  // Build a flat sorted list from activityLogs (manual + device imports)
  var monthKey = TODAY.getFullYear() + "-" + TODAY.getMonth();
  var logs = activityLogs && activityLogs[monthKey] ? activityLogs[monthKey] : {};
  var dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  var monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Flatten all logged activities with date info
  var items = [];
  Object.keys(logs).forEach(function(dayNum) {
    var d = parseInt(dayNum);
    var date = new Date(TODAY.getFullYear(), TODAY.getMonth(), d);
    var isToday = d === TODAY.getDate();
    var isYesterday = d === TODAY.getDate() - 1;
    var dateLabel = isToday ? "Today" : isYesterday ? "Yesterday" : dayNames[date.getDay()] + ", " + monthNames[date.getMonth()] + " " + d;
    var acts = logs[dayNum] || [];
    acts.forEach(function(a) {
      items.push({ a: a, date: date, dateLabel: dateLabel, dayNum: d });
    });
  });

  // Sort newest first
  items.sort(function(x, y) { return y.dayNum - x.dayNum; });

  if (items.length === 0) {
    return (
      <div style={{ background: CARD, borderRadius: 16, border: "1.5px solid "+BORDER, padding: "28px 20px", textAlign: "center", marginTop: 16 }}>
        <div style={{ fontSize: 32, marginBottom: 8, color: TEXT3, display:"flex", justifyContent:"center" }} dangerouslySetInnerHTML={{__html: ICON_WORKOUT}} />
        <div style={{ color: TEXT2, fontSize: 14, fontWeight: 600 }}>No activities logged yet</div>
        <div style={{ color: TEXT3, fontSize: 12, marginTop: 4 }}>Tap a day on the calendar or sync a device to get started</div>
      </div>
    );
  }

  var PLATFORM_COLORS = { apple: "#3A3A3C", garmin: "#003087", google: "#4285F4", fitbit: "#00B0B9", coros: "#E94560" };

  function iconForType(type, fromWatch, fromDevice, notes) {
    var n = (notes || "").toLowerCase();
    if (fromWatch || fromDevice) {
      if (n.indexOf("outdoor run") !== -1 || n.indexOf("run") !== -1) return { icon: ICON_RUN, color: "#3B7DD8", bg: "#EBF1FB" };
      if (n.indexOf("cycling") !== -1) return { icon: ICON_BIKE, color: "#E0A020", bg: "#FEF9EC" };
      if (n.indexOf("hiit") !== -1 || n.indexOf("circuit") !== -1) return { icon: ICON_LIGHTNING, color: "#1B8C4E", bg: "#E8F7EF" };
      if (n.indexOf("strength") !== -1 || n.indexOf("training") !== -1) return { icon: ICON_WORKOUT, color: "#1B8C4E", bg: "#E8F7EF" };
      if (n.indexOf("yoga") !== -1 || n.indexOf("stretch") !== -1) return { icon: ICON_BODY, color: "#9B6FD4", bg: "#F2EDFC" };
      return { icon: "⌚", color: "#1B8C4E", bg: "#E8F7EF" };
    }
    if (type === "run") return { icon: ICON_RUN, color: "#2563B0", bg: "#E6EEFA" };
    if (type === "workout") return { icon: ICON_WORKOUT, color: "#1B8C4E", bg: "#E8F7EF" };
    if (type === "bike") return { icon: ICON_BIKE, color: "#D97706", bg: "#FEF3C7" };
    if (type === "swim") return { icon: ICON_SWIM, color: "#0E7490", bg: "#CFFAFE" };
    if (type === "maintenance") return { icon: ICON_BODY, color: "#9B6FD4", bg: "#F2EDFC" };
    return { icon: "⭐", color: "#E0A020", bg: "#FEF9EC" };
  }

  function labelForActivity(a) {
    if (a.fromDevice) return a.notes || a.type || "Workout";
    if (a.fromWatch) {
      var n = (a.notes || "");
      var match = n.match(/^(.+?)\s*\(Watch\)/);
      return match ? match[1].trim() : n || "Workout";
    }
    // Manual: use notes as the label, or fall back to friendly type name
    if (a.notes && a.notes.trim()) return a.notes.trim();
    var typeLabels = { run: "Run", workout: "Strength Workout", bike: "Bike Ride", swim: "Swim", maintenance: "Body Care", other: "Activity" };
    return typeLabels[a.type] || "Activity";
  }

  function metaForActivity(a) {
    var parts = [];
    if (a.duration) {
      parts.push("⏱ " + a.duration);
    } else if (a.fromWatch) {
      // Extract duration from notes "Type (Watch) 28:42"
      var dMatch = (a.notes || "").match(/\(Watch\)\s+([\d:]+)/);
      if (dMatch) parts.push("⏱ " + dMatch[1]);
    }
    if (a.miles && parseFloat(a.miles) > 0) parts.push("📍 " + parseFloat(a.miles).toFixed(1) + " mi");
    if (a.pace) parts.push(" " + a.pace + "/mi");
    if (a.steps && parseInt(a.steps) > 0) parts.push(" " + parseInt(a.steps).toLocaleString() + " steps");
    if (a.calories) parts.push(" " + a.calories + " cal");
    return parts;
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, marginBottom: 14 }}>RECENT ACTIVITIES</div>
      <div style={{ position: "relative" }}>
        {/* Vertical timeline line */}
        <div style={{ position: "absolute", left: 19, top: 0, bottom: 0, width: 2, background: SURFACE2, borderRadius: 99 }} />
        {items.map(function(item, idx) {
          var ic = iconForType(item.a.type, item.a.fromWatch, item.a.fromDevice, item.a.notes);
          var isDeviceImport = item.a.fromWatch || item.a.fromDevice;
          var platformId = item.a.platform || (item.a.fromWatch ? "apple" : null);
          var platformColor = platformId ? (PLATFORM_COLORS[platformId] || "#1C1C1E") : null;
          var platformNames = { apple: "Apple Health", garmin: "Garmin", google: "Google Fit", fitbit: "Fitbit", coros: "Coros" };
          var platformName = platformId ? (platformNames[platformId] || item.a.source || "Device") : null;
          var label = labelForActivity(item.a);
          var meta = metaForActivity(item.a);
          var isFirst = idx === 0;
          return (
            <div key={item.a.id || idx} style={{ display: "flex", gap: 14, marginBottom: idx < items.length - 1 ? 16 : 0, position: "relative" }}>
              {/* Timeline dot */}
              <div style={{ width: 40, height: 40, borderRadius: 12, background: isDeviceImport ? (platformColor || "#1C1C1E") : ic.bg, border: "2px solid " + (isDeviceImport ? (platformColor || "#1C1C1E") : ic.color + "44"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, position: "relative", zIndex: 1 }}>
                {platformId === "apple" || item.a.fromWatch ? (
                  <svg width="18" height="18" viewBox="0 0 170 170" fill="#fff">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.197-2.12-9.973-3.17-14.34-3.17-4.58 0-9.492 1.05-14.746 3.17-5.262 2.13-9.501 3.24-12.742 3.35-4.929.21-9.842-1.96-14.746-6.52-3.13-2.73-7.045-7.41-11.735-14.04-5.032-7.08-9.169-15.29-12.41-24.65-3.471-10.11-5.211-19.9-5.211-29.38 0-10.86 2.345-20.21 7.045-28.03 3.688-6.31 8.591-11.3 14.739-14.97 6.148-3.67 12.798-5.54 19.961-5.66 3.922 0 9.069 1.21 15.462 3.59 6.376 2.39 10.465 3.6 12.254 3.6 1.34 0 5.877-1.42 13.57-4.24 7.275-2.61 13.415-3.69 18.445-3.27 13.63 1.1 23.87 6.49 30.68 16.22-12.19 7.39-18.22 17.74-18.1 31.01.11 10.33 3.86 18.93 11.23 25.77 3.34 3.17 7.07 5.62 11.22 7.36-.9 2.61-1.85 5.11-2.86 7.51zM119.11 7.24c0 8.1-2.96 15.67-8.86 22.68-7.12 8.32-15.73 13.13-25.07 12.38-.12-.97-.19-1.99-.19-3.07 0-7.77 3.39-16.09 9.4-22.88 3-3.44 6.82-6.3 11.45-8.6 4.62-2.26 8.99-3.51 13.1-3.73.12 1.06.17 2.12.17 3.22z"/>
                  </svg>
                ) : platformId === "garmin" ? (
                  <span style={{ color: "#fff", fontSize: 9, fontWeight: 900, letterSpacing: -0.5 }}>GARMIN</span>
                ) : platformId === "google" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#fff" d="M12 11h8.533c.044.385.067.78.067 1.184C20.6 17.48 17.138 21 12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9c2.395 0 4.565.94 6.185 2.47L16.01 7.64C14.875 6.585 13.51 6 12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.885 0 5.15-1.755 5.79-4.2H12v-2.8z"/></svg>
                ) : platformId === "fitbit" ? (
                  <span style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}>fitbit</span>
                ) : platformId === "coros" ? (
                  <span style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}>COROS</span>
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: ic.icon }} style={{ display:"flex", alignItems:"center", color:"#fff" }} />
                )}
              </div>
              {/* Content */}
              <div style={{ flex: 1, background: CARD, borderRadius: 14, border: "1.5px solid " + BORDER, padding: "12px 14px", boxShadow: isFirst ? "0 2px 8px rgba(0,0,0,0.06)" : "none" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>{label}</span>
                    {isDeviceImport && (
                      <span style={{ background: platformColor ? platformColor+"22" : "#E8F7EF", color: platformColor || "#1B8C4E", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 6, letterSpacing: 0.5, border: "1px solid "+(platformColor ? platformColor+"44" : "#A8D9BB") }}>
                        {platformName || "IMPORTED"}
                      </span>
                    )}
                    {!isDeviceImport && (
                      <span style={{ background: BLUE_BG, color: BLUE, fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 6, letterSpacing: 0.5 }}>MANUAL</span>
                    )}
                  </div>
                </div>
                <div style={{ color: ic.color, fontSize: 12, fontWeight: 600, marginBottom: meta.length > 0 ? 6 : 0 }}>{item.dateLabel}</div>
                {meta.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                    {meta.map(function(m, mi) {
                      return <span key={mi} style={{ color: TEXT3, fontSize: 12 }}>{m}</span>;
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityScreen({ isCoach, watchDays, activityLogs, onLogsChange }) {
  const myClient = CLIENTS[0];

  if (!isCoach) {
    return (
      <div>
        <div style={{ color: TEXT, fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Calendar</div>
        <div style={{ color: TEXT2, fontSize: 14, marginBottom: 20 }}>{MONTH_NAME} activity</div>
        <div style={{ background: CARD, borderRadius: 18, border: "1.5px solid "+BORDER, padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Avatar initials={myClient.avatar} size={44} color={myClient.color} />
            <div style={{ flex: 1 }}>
              <div style={{ color: TEXT, fontSize: 16, fontWeight: 700 }}>{myClient.name}</div>
              <div style={{ color: TEXT2, fontSize: 12 }}>
                {Object.keys((activityLogs && activityLogs[TODAY.getFullYear()+"-"+TODAY.getMonth()]) || {}).length} workouts this month
              </div>
            </div>
            <Pill label={myClient.streak+" day streak"} color={myClient.color} bg={myClient.color+"18"} />
          </div>
          <CalHeatmap workedOut={myClient.workedOut} color={myClient.color} isEditable={true} watchDays={watchDays} sharedLogs={activityLogs} onLogsChange={onLogsChange} />
        </div>
        <RecentActivityTimeline activityLogs={activityLogs} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ color: TEXT, fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Activity</div>
      <div style={{ color: TEXT2, fontSize: 14, marginBottom: 20 }}>{MONTH_NAME} overview</div>
      {CLIENTS.map(function(client) {
        return (
          <div key={client.id} style={{ background: CARD, borderRadius: 18, border: "1.5px solid "+BORDER, padding: "18px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <Avatar initials={client.avatar} size={44} color={client.color} />
              <div style={{ flex: 1 }}>
                <div style={{ color: TEXT, fontSize: 16, fontWeight: 700 }}>{client.name}</div>
                <div style={{ color: TEXT2, fontSize: 12 }}>{client.workedOut.length} workouts this month</div>
              </div>
              <Pill label={client.streak+" day streak"} color={client.color} bg={client.color+"18"} />
            </div>
            <CalHeatmap workedOut={client.workedOut} color={client.color} isEditable={false} watchDays={null} sharedLogs={null} onLogsChange={null} />
          </div>
        );
      })}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────
// DEVICE INTEGRATION (prototype mock data)
// ─────────────────────────────────────────────────────────────────
// MOCK_WATCH_WORKOUTS simulates workouts returned by a device sync.
// In a real native app, replace this with the appropriate SDK:
//   • Apple Health  → HealthKit HKWorkoutType queries
//   • Garmin        → Garmin Health API (OAuth 2.0)
//   • Google Fit    → Health Connect API (Android)
//   • Fitbit        → Fitbit Web API (OAuth 2.0)
//   • Coros         → Coros Open API
// Each workout entry maps to an activityLogs entry via handleImport().
// ─────────────────────────────────────────────────────────────────
const MOCK_WATCH_WORKOUTS = [
  {
    id: "aw-1",
    date: "Today, 7:14 AM",
    type: "Outdoor Run",
    icon: ICON_RUN,
    duration: "28:42",
    distance: "3.1 mi",
    calories: 312,
    avgHR: 158,
    maxHR: 174,
    steps: 4823,
    source: "Apple Watch",
  },
  {
    id: "aw-2",
    date: "Yesterday, 6:30 PM",
    type: "Strength Training",
    icon: ICON_WORKOUT,
    duration: "52:18",
    distance: null,
    calories: 428,
    avgHR: 142,
    maxHR: 168,
    steps: 1204,
    source: "Apple Watch",
  },
  {
    id: "aw-3",
    date: "Mon, May 19",
    type: "Outdoor Run",
    icon: ICON_RUN,
    duration: "34:05",
    distance: "3.6 mi",
    calories: 374,
    avgHR: 161,
    maxHR: 179,
    source: "Apple Watch",
  },
  {
    id: "aw-4",
    date: "Sun, May 18",
    type: "HIIT",
    icon: ICON_LIGHTNING,
    duration: "22:00",
    distance: null,
    calories: 285,
    avgHR: 171,
    maxHR: 188,
    steps: 987,
    source: "Apple Watch",
  },
  {
    id: "aw-5",
    date: "Sat, May 17",
    type: "Cycling",
    icon: "",
    duration: "1:04:33",
    distance: "14.2 mi",
    calories: 511,
    avgHR: 138,
    maxHR: 162,
    steps: 2341,
    source: "Apple Watch",
  },
];

function AppleWatchScreen({ connected, onConnect, onDisconnect, importedIds, onImport }) {
  // Track which platform is connected
  const [connectedPlatform, setConnectedPlatform] = useState(connected ? "apple" : null);
  const [expandedId, setExpandedId]   = useState(null);
  const [importing, setImporting]     = useState(null);

  const PLATFORM_LOGOS = {
    apple:  '<svg width="22" height="26" viewBox="0 0 256 315" fill="currentColor"><path d="M213.803 167.03c.442 47.58 41.74 63.413 42.197 63.615-.35 1.116-6.599 22.563-21.757 44.716-13.104 19.153-26.705 38.235-48.13 38.63-21.05.388-27.82-12.498-51.888-12.498-24.061 0-31.582 12.105-51.51 12.886-20.723.782-36.577-20.44-49.8-39.526C5.977 247.185-14.816 181.661 11.366 136.51c13.053-22.407 36.395-36.593 61.735-36.98 19.288-.36 37.476 12.981 49.28 12.981 11.804 0 33.948-16.06 57.188-13.7 9.726.4 37.05 3.93 54.595 29.622zm-62.76-96.18c10.95-13.281 18.368-31.79 16.353-50.24-15.826.636-34.996 10.546-46.35 23.827-10.18 11.798-19.09 30.729-16.698 48.783 17.644 1.368 35.658-8.998 46.695-22.37z"/></svg>',
    garmin: '<svg width="20" height="20" viewBox="0 0 100 100" fill="currentColor"><circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" stroke-width="8"/><path d="M72 50H50v15h14c-3 8-11 14-21 14-13 0-23-10-23-23s10-23 23-23c6 0 11 2 15 6l10-10c-6-6-15-10-25-10-21 0-38 17-38 37s17 37 38 37 37-16 37-37v-6z"/></svg>',
    google: '<svg width="28" height="28" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>',
    fitbit: '<svg width="28" height="28" viewBox="0 0 100 100"><circle cx="50" cy="18" r="9" fill="currentColor"/><circle cx="50" cy="50" r="12" fill="currentColor"/><circle cx="50" cy="82" r="9" fill="currentColor"/><circle cx="20" cy="34" r="7" fill="currentColor"/><circle cx="20" cy="66" r="7" fill="currentColor"/><circle cx="80" cy="34" r="7" fill="currentColor"/><circle cx="80" cy="66" r="7" fill="currentColor"/></svg>',
    coros:  '<svg width="28" height="28" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" stroke="currentColor" stroke-width="8" fill="none"/><circle cx="50" cy="50" r="28" stroke="currentColor" stroke-width="5" fill="none"/><circle cx="50" cy="50" r="8" fill="currentColor"/></svg>',
  };

  const PLATFORMS = [
    {
      id: "apple",
      name: "Apple Health",
      subtitle: "Apple Watch + iPhone",
      bg: "#1C1C1E",
      accent: "#30D158",
      note: "Uses HealthKit -- iOS only",
    },
    {
      id: "garmin",
      name: "Garmin Connect",
      subtitle: "All Garmin devices",
      bg: "#003087",
      accent: "#00A3E0",
      note: "Garmin Health API -- OAuth required",
    },
    {
      id: "google",
      name: "Google Fit",
      subtitle: "Android + Wear OS",
      bg: "#4285F4",
      accent: "#ffffff",
      note: "Health Connect API -- Android only",
    },
    {
      id: "fitbit",
      name: "Fitbit",
      subtitle: "All Fitbit devices",
      bg: "#00B0B9",
      accent: "#ffffff",
      note: "Fitbit Web API -- cross-platform",
    },
    {
      id: "coros",
      name: "Coros",
      subtitle: "PACE, APEX, VERTIX",
      bg: "#1A1A2E",
      accent: "#E94560",
      note: "Coros Open API -- cross-platform",
    },
  ];

  const activePlatform = PLATFORMS.find(function(p) { return p.id === connectedPlatform; });

  function handleConnect(platformId) {
    setConnectedPlatform(platformId);
    if (platformId === "apple") onConnect();
  }

  function handleDisconnect() {
    setConnectedPlatform(null);
    onDisconnect();
  }

  const [syncStatus, setSyncStatus] = useState(null); // null | "syncing" | "done"

  function handleSync() {
    setSyncStatus("syncing");
    setTimeout(function() {
      setSyncStatus("done");
      setTimeout(function() { setSyncStatus(null); }, 2500);
    }, 1400);
  }

  function handleImport(workout) {
    setImporting(workout.id);
    setTimeout(function() {
      onImport(workout, connectedPlatform);
      setImporting(null);
    }, 800);
  }

  // Not connected -- show all platform options
  if (!connectedPlatform) {
    return (
      <div>
        <div style={{ color: TEXT, fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Connection</div>
        <div style={{ color: TEXT2, fontSize: 14, marginBottom: 24 }}>Sync workouts from your device</div>

        {PLATFORMS.map(function(p) {
          return (
            <div key={p.id} style={{ background: p.bg, borderRadius: 18, padding: "20px", marginBottom: 14, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span dangerouslySetInnerHTML={{ __html: PLATFORM_LOGOS[p.id] }} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontSize: 17, fontWeight: 800 }}>{p.name}</div>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>{p.subtitle}</div>
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 12px", marginBottom: 14 }}>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>{p.note}</div>
              </div>
              <button onClick={function() { handleConnect(p.id); }} style={{ width: "100%", padding: "12px", borderRadius: 12, background: p.accent, border: "none", color: (p.id === "fitbit") ? "#003087" : "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                Connect {p.name}
              </button>
            </div>
          );
        })}

        <div style={{ background: SURFACE, borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 16 }}><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span></span>
          <span style={{ color: TEXT3, fontSize: 12, lineHeight: 1.4 }}>Your health data is private. Only workout summaries are shared with your coach.</span>
        </div>
      </div>
    );
  }

  // Connected state -- show workouts
  return (
    <div>
      <div style={{ color: TEXT, fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Connection</div>
      <div style={{ color: TEXT2, fontSize: 14, marginBottom: 16 }}>Recent workouts from {activePlatform.name}</div>
      <div style={{ background: "#1C1C1E", borderRadius: 16, padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "#1C1C1E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }}><span dangerouslySetInnerHTML={{ __html: PLATFORM_LOGOS[activePlatform.id] }} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{activePlatform.name} Connected</div>
          <div style={{ color: syncStatus === "done" ? "#7DFF9B" : activePlatform.accent, fontSize: 12, marginTop: 2, transition: "color 0.3s" }}>
            {syncStatus === "syncing" ? "⟳ Syncing..." : syncStatus === "done" ? "✓ Sync complete" : "● Synced just now"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={handleSync} disabled={syncStatus === "syncing"} style={{ background: syncStatus === "syncing" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)", border: "none", color: syncStatus === "syncing" ? "rgba(255,255,255,0.4)" : "#fff", padding: "7px 12px", borderRadius: 8, fontSize: 12, cursor: syncStatus === "syncing" ? "default" : "pointer", fontWeight: 600, transition: "all 0.2s" }}>
            {syncStatus === "syncing" ? "Syncing..." : "Sync"}
          </button>
          <button onClick={handleDisconnect} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer" }}>Disconnect</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
        {PLATFORMS.map(function(p) {
          const isActive = p.id === connectedPlatform;
          return (
            <button key={p.id} onClick={function() { if (!isActive) handleConnect(p.id); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 99, background: isActive ? p.bg : SURFACE, border: "1.5px solid "+(isActive ? p.bg : BORDER), cursor: "pointer", flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: isActive ? "rgba(255,255,255,0.7)" : p.bg, flexShrink: 0 }} />
              <span style={{ color: isActive ? "#fff" : TEXT2, fontSize: 12, fontWeight: isActive ? 700 : 500 }}>{p.name.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>
      <div style={{ color: TEXT2, fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>RECENT WORKOUTS</div>
      {MOCK_WATCH_WORKOUTS.map(function(w) {
        const isImported    = importedIds[w.id];
        const isExpanded    = expandedId === w.id;
        const isImportingThis = importing === w.id;

        return (
          <div key={w.id} style={{ background: CARD, border: "1.5px solid "+(isImported ? GREEN+"66" : BORDER), borderRadius: 16, marginBottom: 10, overflow: "hidden" }}>
            <div onClick={function() { setExpandedId(isExpanded ? null : w.id); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: activePlatform.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }}><span style={{ filter: "brightness(100)" }} dangerouslySetInnerHTML={{ __html: PLATFORM_LOGOS[activePlatform.id] }} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>{w.type}</span>
                  {isImported && <span style={{ background: GREEN_BG, color: GREEN, fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6 }}>IMPORTED</span>}
                </div>
                <div style={{ color: activePlatform.accent, fontSize: 12, marginTop: 2 }}>{w.date}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <span style={{ color: TEXT2, fontSize: 12 }}>{w.duration}</span>
                  {w.distance && <span style={{ color: TEXT2, fontSize: 12 }}> {w.distance}</span>}
                  <span style={{ color: TEXT2, fontSize: 12 }}> {w.calories} cal</span>
                </div>
              </div>
              <span style={{ color: TEXT3, fontSize: 14 }}>{isExpanded ? "^" : "v"}</span>
            </div>

            {isExpanded && (
              <div style={{ borderTop: "1px solid "+SURFACE2, padding: "14px 16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {[
                    { label: "Duration",  val: w.duration,       icon: "⏱" },
                    { label: "Avg HR",    val: w.avgHR+" bpm",   icon: "❤️" },
                    { label: "Max HR",    val: w.maxHR+" bpm",   icon: "" },
                    { label: "Calories",  val: w.calories+" cal",icon: "" },
                    { label: "Steps",     val: w.steps ? w.steps.toLocaleString() : "--", icon: "" },
                    { label: "Distance",  val: w.distance || "--",icon: "" },
                  ].map(function(m, i) {
                    return (
                      <div key={"plat-stat-"+i} style={{ background: SURFACE, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                        <div style={{ marginBottom: 3, display:"flex", justifyContent:"center", color: TEXT3 }} dangerouslySetInnerHTML={{ __html: m.icon }} />
                        <div style={{ color: TEXT, fontSize: 12, fontWeight: 700 }}>{m.val}</div>
                        <div style={{ color: TEXT3, fontSize: 10, marginTop: 1 }}>{m.label}</div>
                      </div>
                    );
                  })}
                </div>
      <div style={{ background: SURFACE, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: TEXT2, fontSize: 11, fontWeight: 600 }}>Heart Rate Range</span>
                    <span style={{ color: TEXT3, fontSize: 11 }}>{w.avgHR}-{w.maxHR} bpm</span>
                  </div>
                  <div style={{ background: SURFACE2, borderRadius: 99, height: 6, overflow: "hidden" }}>
                    <div style={{ marginLeft: ((w.avgHR-80)/(220-80)*100)+"%", width: ((w.maxHR-w.avgHR)/(220-80)*100)+"%", height: "100%", background: "linear-gradient(90deg,#2AAD66,#E05252)", borderRadius: 99 }} />
                  </div>
                </div>

                {!isImported ? (
                  <button onClick={function() { handleImport(w); }} style={{ width: "100%", padding: "12px", borderRadius: 12, background: isImportingThis ? SURFACE : ORANGE, border: "none", color: isImportingThis ? TEXT2 : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    {isImportingThis ? "Importing..." : "Import to Money Fitness"}
                  </button>
                ) : (
                  <div style={{ background: GREEN_BG, borderRadius: 12, padding: "11px", textAlign: "center" }}>
                    <span style={{ color: GREEN, fontSize: 13, fontWeight: 700 }}>Added to your activity log</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ background: SURFACE, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 16 }}><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg></span></span>
        <span style={{ color: TEXT3, fontSize: 12 }}>In the full app, workouts sync automatically after each session.</span>
      </div>
    </div>
  );
}


function WorkoutTrendChart({ workoutType, color, data, unit, livePace }) {
  const [selectedWeek, setSelectedWeek] = useState(data.length - 1); // default = most recent

  const maxVal = Math.max.apply(null, data.concat([0.1]));
  const W = 340;
  const H = 120;
  const padL = 40;
  const padB = 20;
  const padT = 10;
  const padR = 10;
  const chartW = W - padL - padR;
  const chartH = H - padB - padT;
  const n = data.length;

  function xPos(i) { return padL + (i / (n - 1)) * chartW; }
  function yPos(v) { return padT + chartH - (v / maxVal) * chartH; }

  var linePath = "";
  data.forEach(function(v, i) {
    linePath += (i === 0 ? "M" : "L") + xPos(i).toFixed(1) + "," + yPos(v).toFixed(1) + " ";
  });
  var areaPath = linePath + " L" + xPos(n-1).toFixed(1) + "," + (padT+chartH).toFixed(1) + " L" + padL.toFixed(1) + "," + (padT+chartH).toFixed(1) + " Z";

  const yLabels = [0, Math.round(maxVal / 2 * 10) / 10, Math.round(maxVal * 10) / 10];
  const months = ["FEB","MAR","APR","MAY"];

  const weekData    = (WEEK_DETAILS[workoutType] || WEEK_DETAILS.total)[selectedWeek];
  const isLastWeek  = selectedWeek === n - 1;

  return (
    <div style={{ background: CARD, border: "1.5px solid "+BORDER, borderRadius: 16, padding: "16px", marginBottom: 16 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ color: TEXT, fontSize: 16, fontWeight: 800 }}>{weekData.date}</div>
          {isLastWeek && (
            <span style={{ background: color+"20", color: color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>This week</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {weekData.metrics.map(function(m) {
            return (
              <div key={m.label}>
                <div style={{ color: TEXT3, fontSize: 11 }}>{m.label}</div>
                <div style={{ color: TEXT, fontSize: 20, fontWeight: 800 }}>{m.value}</div>
              </div>
            );
          })}
          {livePace && isLastWeek && (
            <div>
              <div style={{ color: TEXT3, fontSize: 11 }}>Your Avg Pace</div>
              <div style={{ color: color, fontSize: 20, fontWeight: 800 }}>{livePace}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ color: TEXT3, fontSize: 11, marginBottom: 6 }}>Past 12 weeks -- tap a dot to see details</div>
      <div style={{ position: "relative" }}>
        <svg width="100%" viewBox={"0 0 "+W+" "+H} style={{ display: "block" }}>
{yLabels.map(function(v, i) {
            const y = yPos(v);
            return (
              <g key={"ylabel-"+v+"-"+i}>
                <line x1={padL} y1={y} x2={W-padR} y2={y} stroke="#E8E8E8" strokeWidth="1" />
                <text x={padL-4} y={y+4} textAnchor="end" fontSize="9" fill={TEXT3}>{v > 0 ? v+unit : "0"}</text>
              </g>
            );
          })}
{months.map(function(m, i) {
            const x = padL + ((i + 1) / (months.length + 1)) * chartW;
            return <text key={m} x={x} y={H-4} textAnchor="middle" fontSize="9" fill={TEXT3}>{m}</text>;
          })}
      <path d={areaPath} fill={color+"22"} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <line
            x1={xPos(selectedWeek)} y1={padT}
            x2={xPos(selectedWeek)} y2={padT + chartH}
            stroke={TEXT} strokeWidth="1" strokeDasharray="3,3" opacity="0.3"
          />
{data.map(function(v, i) {
            const isSelected = i === selectedWeek;
            const isLast     = i === n - 1;
            const cx = xPos(i);
            const cy = yPos(v);
            return (
              <g key={"pt-"+i} onClick={function() { setSelectedWeek(i); }} style={{ cursor: "pointer" }}>
      <circle cx={cx} cy={cy} r={12} fill="transparent" />
      <circle
                  cx={cx} cy={cy}
                  r={isSelected ? 7 : isLast ? 5 : 3.5}
                  fill={isSelected ? color : isLast ? color : CARD}
                  stroke={color}
                  strokeWidth={isSelected ? 0 : 1.8}
                  opacity={isSelected ? 1 : 0.85}
                />
{isSelected && (
                  <circle cx={cx} cy={cy} r={12} fill={color+"22"} />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// Seed trend data per workout type (12 weeks)
const WEEK_DETAILS = {
  total: [
    { date: "Feb 17 - Feb 23", metrics: [{ label: "Activities", value: "5" }, { label: "Calories", value: "1,820" }, { label: "Active Days", value: "5" }] },
    { date: "Feb 24 - Mar 2",  metrics: [{ label: "Activities", value: "5" }, { label: "Calories", value: "1,950" }, { label: "Active Days", value: "5" }] },
    { date: "Mar 3 - Mar 9",   metrics: [{ label: "Activities", value: "4" }, { label: "Calories", value: "1,540" }, { label: "Active Days", value: "4" }] },
    { date: "Mar 10 - Mar 16", metrics: [{ label: "Activities", value: "6" }, { label: "Calories", value: "2,210" }, { label: "Active Days", value: "6" }] },
    { date: "Mar 17 - Mar 23", metrics: [{ label: "Activities", value: "5" }, { label: "Calories", value: "1,870" }, { label: "Active Days", value: "5" }] },
    { date: "Mar 24 - Mar 30", metrics: [{ label: "Activities", value: "7" }, { label: "Calories", value: "2,540" }, { label: "Active Days", value: "6" }] },
    { date: "Mar 31 - Apr 6",  metrics: [{ label: "Activities", value: "6" }, { label: "Calories", value: "2,180" }, { label: "Active Days", value: "6" }] },
    { date: "Apr 7 - Apr 13",  metrics: [{ label: "Activities", value: "7" }, { label: "Calories", value: "2,490" }, { label: "Active Days", value: "6" }] },
    { date: "Apr 14 - Apr 20", metrics: [{ label: "Activities", value: "7" }, { label: "Calories", value: "2,520" }, { label: "Active Days", value: "7" }] },
    { date: "Apr 21 - Apr 27", metrics: [{ label: "Activities", value: "7" }, { label: "Calories", value: "2,610" }, { label: "Active Days", value: "6" }] },
    { date: "Apr 28 - May 4",  metrics: [{ label: "Activities", value: "8" }, { label: "Calories", value: "2,840" }, { label: "Active Days", value: "7" }] },
    { date: "May 5 - May 11",  metrics: [{ label: "Activities", value: "6" }, { label: "Calories", value: "2,190" }, { label: "Active Days", value: "5" }] },
  ],
  run: [
    { date: "Feb 17 - Feb 23", metrics: [{ label: "Distance", value: "12.1 mi" }, { label: "Time", value: "1h 55m" }, { label: "Avg Pace", value: "9:32/mi" }] },
    { date: "Feb 24 - Mar 2",  metrics: [{ label: "Distance", value: "11.8 mi" }, { label: "Time", value: "1h 52m" }, { label: "Avg Pace", value: "9:31/mi" }] },
    { date: "Mar 3 - Mar 9",   metrics: [{ label: "Distance", value: "10.2 mi" }, { label: "Time", value: "1h 42m" }, { label: "Avg Pace", value: "10:00/mi" }] },
    { date: "Mar 10 - Mar 16", metrics: [{ label: "Distance", value: "13.4 mi" }, { label: "Time", value: "2h 06m" }, { label: "Avg Pace", value: "9:25/mi" }] },
    { date: "Mar 17 - Mar 23", metrics: [{ label: "Distance", value: "14.1 mi" }, { label: "Time", value: "2h 11m" }, { label: "Avg Pace", value: "9:18/mi" }] },
    { date: "Mar 24 - Mar 30", metrics: [{ label: "Distance", value: "13.9 mi" }, { label: "Time", value: "2h 09m" }, { label: "Avg Pace", value: "9:18/mi" }] },
    { date: "Mar 31 - Apr 6",  metrics: [{ label: "Distance", value: "15.2 mi" }, { label: "Time", value: "2h 21m" }, { label: "Avg Pace", value: "9:17/mi" }] },
    { date: "Apr 7 - Apr 13",  metrics: [{ label: "Distance", value: "16.1 mi" }, { label: "Time", value: "2h 28m" }, { label: "Avg Pace", value: "9:12/mi" }] },
    { date: "Apr 14 - Apr 20", metrics: [{ label: "Distance", value: "15.8 mi" }, { label: "Time", value: "2h 26m" }, { label: "Avg Pace", value: "9:14/mi" }] },
    { date: "Apr 21 - Apr 27", metrics: [{ label: "Distance", value: "17.3 mi" }, { label: "Time", value: "2h 38m" }, { label: "Avg Pace", value: "9:08/mi" }] },
    { date: "Apr 28 - May 4",  metrics: [{ label: "Distance", value: "18.0 mi" }, { label: "Time", value: "2h 44m" }, { label: "Avg Pace", value: "9:07/mi" }] },
    { date: "May 5 - May 11",  metrics: [{ label: "Distance", value: "15.0 mi" }, { label: "Time", value: "2h 22m" }, { label: "Avg Pace", value: "9:28/mi" }] },
  ],
  workout: [
    { date: "Feb 17 - Feb 23", metrics: [{ label: "Sessions", value: "2" }, { label: "Avg Duration", value: "48 min" }, { label: "Calories", value: "386" }] },
    { date: "Feb 24 - Mar 2",  metrics: [{ label: "Sessions", value: "3" }, { label: "Avg Duration", value: "50 min" }, { label: "Calories", value: "412" }] },
    { date: "Mar 3 - Mar 9",   metrics: [{ label: "Sessions", value: "2" }, { label: "Avg Duration", value: "45 min" }, { label: "Calories", value: "378" }] },
    { date: "Mar 10 - Mar 16", metrics: [{ label: "Sessions", value: "3" }, { label: "Avg Duration", value: "51 min" }, { label: "Calories", value: "408" }] },
    { date: "Mar 17 - Mar 23", metrics: [{ label: "Sessions", value: "3" }, { label: "Avg Duration", value: "52 min" }, { label: "Calories", value: "418" }] },
    { date: "Mar 24 - Mar 30", metrics: [{ label: "Sessions", value: "4" }, { label: "Avg Duration", value: "54 min" }, { label: "Calories", value: "436" }] },
    { date: "Mar 31 - Apr 6",  metrics: [{ label: "Sessions", value: "3" }, { label: "Avg Duration", value: "50 min" }, { label: "Calories", value: "410" }] },
    { date: "Apr 7 - Apr 13",  metrics: [{ label: "Sessions", value: "4" }, { label: "Avg Duration", value: "55 min" }, { label: "Calories", value: "448" }] },
    { date: "Apr 14 - Apr 20", metrics: [{ label: "Sessions", value: "4" }, { label: "Avg Duration", value: "53 min" }, { label: "Calories", value: "432" }] },
    { date: "Apr 21 - Apr 27", metrics: [{ label: "Sessions", value: "3" }, { label: "Avg Duration", value: "51 min" }, { label: "Calories", value: "414" }] },
    { date: "Apr 28 - May 4",  metrics: [{ label: "Sessions", value: "4" }, { label: "Avg Duration", value: "56 min" }, { label: "Calories", value: "452" }] },
    { date: "May 5 - May 11",  metrics: [{ label: "Sessions", value: "3" }, { label: "Avg Duration", value: "52 min" }, { label: "Calories", value: "428" }] },
  ],
  maintenance: [
    { date: "Feb 17 - Feb 23", metrics: [{ label: "Sessions", value: "1" }, { label: "Avg Duration", value: "30 min" }, { label: "Type", value: "Yoga" }] },
    { date: "Feb 24 - Mar 2",  metrics: [{ label: "Sessions", value: "0" }, { label: "Avg Duration", value: "--" }, { label: "Type", value: "--" }] },
    { date: "Mar 3 - Mar 9",   metrics: [{ label: "Sessions", value: "2" }, { label: "Avg Duration", value: "35 min" }, { label: "Type", value: "Stretch" }] },
    { date: "Mar 10 - Mar 16", metrics: [{ label: "Sessions", value: "1" }, { label: "Avg Duration", value: "30 min" }, { label: "Type", value: "Yoga" }] },
    { date: "Mar 17 - Mar 23", metrics: [{ label: "Sessions", value: "1" }, { label: "Avg Duration", value: "40 min" }, { label: "Type", value: "Foam Roll" }] },
    { date: "Mar 24 - Mar 30", metrics: [{ label: "Sessions", value: "2" }, { label: "Avg Duration", value: "35 min" }, { label: "Type", value: "Yoga" }] },
    { date: "Mar 31 - Apr 6",  metrics: [{ label: "Sessions", value: "1" }, { label: "Avg Duration", value: "30 min" }, { label: "Type", value: "Stretch" }] },
    { date: "Apr 7 - Apr 13",  metrics: [{ label: "Sessions", value: "2" }, { label: "Avg Duration", value: "38 min" }, { label: "Type", value: "Yoga" }] },
    { date: "Apr 14 - Apr 20", metrics: [{ label: "Sessions", value: "1" }, { label: "Avg Duration", value: "30 min" }, { label: "Type", value: "Foam Roll" }] },
    { date: "Apr 21 - Apr 27", metrics: [{ label: "Sessions", value: "2" }, { label: "Avg Duration", value: "35 min" }, { label: "Type", value: "Yoga" }] },
    { date: "Apr 28 - May 4",  metrics: [{ label: "Sessions", value: "2" }, { label: "Avg Duration", value: "36 min" }, { label: "Type", value: "Stretch" }] },
    { date: "May 5 - May 11",  metrics: [{ label: "Sessions", value: "1" }, { label: "Avg Duration", value: "35 min" }, { label: "Type", value: "Yoga" }] },
  ],
  other: [
    { date: "Feb 17 - Feb 23", metrics: [{ label: "Activities", value: "0" }, { label: "Calories", value: "--" }, { label: "Duration", value: "--" }] },
    { date: "Feb 24 - Mar 2",  metrics: [{ label: "Activities", value: "1" }, { label: "Calories", value: "180" }, { label: "Duration", value: "25 min" }] },
    { date: "Mar 3 - Mar 9",   metrics: [{ label: "Activities", value: "0" }, { label: "Calories", value: "--" }, { label: "Duration", value: "--" }] },
    { date: "Mar 10 - Mar 16", metrics: [{ label: "Activities", value: "1" }, { label: "Calories", value: "210" }, { label: "Duration", value: "30 min" }] },
    { date: "Mar 17 - Mar 23", metrics: [{ label: "Activities", value: "0" }, { label: "Calories", value: "--" }, { label: "Duration", value: "--" }] },
    { date: "Mar 24 - Mar 30", metrics: [{ label: "Activities", value: "0" }, { label: "Calories", value: "--" }, { label: "Duration", value: "--" }] },
    { date: "Mar 31 - Apr 6",  metrics: [{ label: "Activities", value: "1" }, { label: "Calories", value: "195" }, { label: "Duration", value: "28 min" }] },
    { date: "Apr 7 - Apr 13",  metrics: [{ label: "Activities", value: "0" }, { label: "Calories", value: "--" }, { label: "Duration", value: "--" }] },
    { date: "Apr 14 - Apr 20", metrics: [{ label: "Activities", value: "1" }, { label: "Calories", value: "220" }, { label: "Duration", value: "32 min" }] },
    { date: "Apr 21 - Apr 27", metrics: [{ label: "Activities", value: "1" }, { label: "Calories", value: "205" }, { label: "Duration", value: "29 min" }] },
    { date: "Apr 28 - May 4",  metrics: [{ label: "Activities", value: "0" }, { label: "Calories", value: "--" }, { label: "Duration", value: "--" }] },
    { date: "May 5 - May 11",  metrics: [{ label: "Activities", value: "1" }, { label: "Calories", value: "210" }, { label: "Duration", value: "30 min" }] },
  ],
  bike: [
    { date: "Feb 17 - Feb 23", metrics: [{ label: "Distance", value: "8.2 mi" }, { label: "Avg Ride", value: "58 min" }, { label: "Elevation", value: "280 ft" }] },
    { date: "Feb 24 - Mar 2",  metrics: [{ label: "Distance", value: "10.1 mi" }, { label: "Avg Ride", value: "1h 05m" }, { label: "Elevation", value: "310 ft" }] },
    { date: "Mar 3 - Mar 9",   metrics: [{ label: "Distance", value: "7.5 mi" }, { label: "Avg Ride", value: "52 min" }, { label: "Elevation", value: "240 ft" }] },
    { date: "Mar 10 - Mar 16", metrics: [{ label: "Distance", value: "12.3 mi" }, { label: "Avg Ride", value: "1h 18m" }, { label: "Elevation", value: "380 ft" }] },
    { date: "Mar 17 - Mar 23", metrics: [{ label: "Distance", value: "9.8 mi" }, { label: "Avg Ride", value: "1h 02m" }, { label: "Elevation", value: "295 ft" }] },
    { date: "Mar 24 - Mar 30", metrics: [{ label: "Distance", value: "11.4 mi" }, { label: "Avg Ride", value: "1h 10m" }, { label: "Elevation", value: "340 ft" }] },
    { date: "Mar 31 - Apr 6",  metrics: [{ label: "Distance", value: "13.2 mi" }, { label: "Avg Ride", value: "1h 22m" }, { label: "Elevation", value: "410 ft" }] },
    { date: "Apr 7 - Apr 13",  metrics: [{ label: "Distance", value: "10.8 mi" }, { label: "Avg Ride", value: "1h 08m" }, { label: "Elevation", value: "320 ft" }] },
    { date: "Apr 14 - Apr 20", metrics: [{ label: "Distance", value: "14.1 mi" }, { label: "Avg Ride", value: "1h 28m" }, { label: "Elevation", value: "430 ft" }] },
    { date: "Apr 21 - Apr 27", metrics: [{ label: "Distance", value: "12.6 mi" }, { label: "Avg Ride", value: "1h 15m" }, { label: "Elevation", value: "375 ft" }] },
    { date: "Apr 28 - May 4",  metrics: [{ label: "Distance", value: "15.3 mi" }, { label: "Avg Ride", value: "1h 35m" }, { label: "Elevation", value: "460 ft" }] },
    { date: "May 5 - May 11",  metrics: [{ label: "Distance", value: "11.0 mi" }, { label: "Avg Ride", value: "1h 05m" }, { label: "Elevation", value: "320 ft" }] },
  ],
  swim: [
    { date: "Feb 17 - Feb 23", metrics: [{ label: "Distance", value: "1200 yds" }, { label: "Duration", value: "38 min" }, { label: "Stroke", value: "Freestyle" }] },
    { date: "Feb 24 - Mar 2",  metrics: [{ label: "Distance", value: "1400 yds" }, { label: "Duration", value: "42 min" }, { label: "Stroke", value: "Freestyle" }] },
    { date: "Mar 3 - Mar 9",   metrics: [{ label: "Distance", value: "1000 yds" }, { label: "Duration", value: "32 min" }, { label: "Stroke", value: "Mixed" }] },
    { date: "Mar 10 - Mar 16", metrics: [{ label: "Distance", value: "1600 yds" }, { label: "Duration", value: "48 min" }, { label: "Stroke", value: "Freestyle" }] },
    { date: "Mar 17 - Mar 23", metrics: [{ label: "Distance", value: "1400 yds" }, { label: "Duration", value: "44 min" }, { label: "Stroke", value: "Freestyle" }] },
    { date: "Mar 24 - Mar 30", metrics: [{ label: "Distance", value: "1800 yds" }, { label: "Duration", value: "52 min" }, { label: "Stroke", value: "Freestyle" }] },
    { date: "Mar 31 - Apr 6",  metrics: [{ label: "Distance", value: "1500 yds" }, { label: "Duration", value: "46 min" }, { label: "Stroke", value: "Mixed" }] },
    { date: "Apr 7 - Apr 13",  metrics: [{ label: "Distance", value: "1700 yds" }, { label: "Duration", value: "50 min" }, { label: "Stroke", value: "Freestyle" }] },
    { date: "Apr 14 - Apr 20", metrics: [{ label: "Distance", value: "2000 yds" }, { label: "Duration", value: "58 min" }, { label: "Stroke", value: "Freestyle" }] },
    { date: "Apr 21 - Apr 27", metrics: [{ label: "Distance", value: "1600 yds" }, { label: "Duration", value: "48 min" }, { label: "Stroke", value: "Mixed" }] },
    { date: "Apr 28 - May 4",  metrics: [{ label: "Distance", value: "2200 yds" }, { label: "Duration", value: "62 min" }, { label: "Stroke", value: "Freestyle" }] },
    { date: "May 5 - May 11",  metrics: [{ label: "Distance", value: "1800 yds" }, { label: "Duration", value: "54 min" }, { label: "Stroke", value: "Freestyle" }] },
  ],
};

const TREND_ICONS = {
  total:       ICON_CHART,
  run:         ICON_RUN,
  workout:     ICON_WORKOUT,
  bike:        ICON_BIKE,
  swim:        ICON_SWIM,
  maintenance: ICON_BODY,
  other:       ICON_STAR,
};

const TREND_DATA = {
  total: {
    label: "Total", color: "#1B8C4E",
    data: [5, 5, 4, 6, 5, 7, 6, 7, 7, 7, 8, 6],
    metric: [{ label: "Activities", value: "6" }, { label: "This Month", value: "28" }, { label: "Streak", value: "12d" }],
    unit: "",
  },
  run: {
    label: "Run", color: "#2563B0",
    data: [12.1, 11.8, 10.2, 13.4, 14.1, 13.9, 15.2, 16.1, 15.8, 17.3, 18.0, 15.0],
    metric: [{ label: "Distance", value: "15.0 mi" }, { label: "Time", value: "2h 22m" }, { label: "Avg Pace", value: "9:28/mi" }],
    unit: " mi",
  },
  workout: {
    label: "Workout", color: "#1B8C4E",
    data: [2, 3, 2, 3, 3, 4, 3, 4, 4, 3, 4, 3],
    metric: [{ label: "Sessions", value: "3" }, { label: "Avg Duration", value: "52 min" }, { label: "Calories", value: "428" }],
    unit: "",
  },
  bike: {
    label: "Bike", color: "#D97706",
    data: [8.2, 10.1, 7.5, 12.3, 9.8, 11.4, 13.2, 10.8, 14.1, 12.6, 15.3, 11.0],
    metric: [{ label: "Distance", value: "11.0 mi" }, { label: "Avg Ride", value: "1h 05m" }, { label: "Elevation", value: "320 ft" }],
    unit: " mi",
  },
  swim: {
    label: "Swim", color: "#0E7490",
    data: [1200, 1400, 1000, 1600, 1400, 1800, 1500, 1700, 2000, 1600, 2200, 1800],
    metric: [{ label: "Distance", value: "1800 yds" }, { label: "Avg Session", value: "45 min" }, { label: "Strokes", value: "Freestyle" }],
    unit: " yds",
  },
  maintenance: {
    label: "Body Care", color: "#9B6FD4",
    data: [1, 0, 2, 1, 1, 2, 1, 2, 1, 2, 2, 1],
    metric: [{ label: "Sessions", value: "1" }, { label: "Avg Duration", value: "35 min" }, { label: "Streak", value: "2 wk" }],
    unit: "",
  },
  other: {
    label: "Other", color: "#E0A020",
    data: [0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1],
    metric: [{ label: "Activities", value: "1" }, { label: "This Month", value: "2" }, { label: "Calories", value: "210" }],
    unit: "",
  },
};

function CoachDashboard() {
  var CLIENT_DATA = [
    { id:1, name:"Marcus Johnson", initials:"MJ", color:"#1B8C4E", streak:15, lastActive:"Today",      workouts:12, goal:16, status:"active",   since:"Jan 2025", revenue:120, checkIns:4 },
    { id:2, name:"Sarah Kim",      initials:"SK", color:"#3B7DD8", streak:3,  lastActive:"4 days ago", workouts:7,  goal:16, status:"at-risk",  since:"Mar 2025", revenue:120, checkIns:2 },
    { id:3, name:"Jake Torres",    initials:"JT", color:"#9B6FD4", streak:21, lastActive:"Today",      workouts:15, goal:16, status:"active",   since:"Nov 2024", revenue:150, checkIns:5 },
    { id:4, name:"Priya Nair",     initials:"PN", color:"#D97706", streak:0,  lastActive:"12 days ago",workouts:2,  goal:16, status:"inactive", since:"Feb 2025", revenue:120, checkIns:0 },
  ];
  var REVENUE_DATA = [1800,1800,2040,2040,2280,2400,2400,2520,2520,2640,2640,2760];
  var maxRev = Math.max.apply(null, REVENUE_DATA);
  var active   = CLIENT_DATA.filter(function(c){return c.status==="active";});
  var atRisk   = CLIENT_DATA.filter(function(c){return c.status==="at-risk";});
  var inactive = CLIENT_DATA.filter(function(c){return c.status==="inactive";});
  function sc(s) { return s==="active"?"#1B8C4E":s==="at-risk"?"#D97706":"#E05252"; }
  function sl(s) { return s==="active"?"Active":s==="at-risk"?"At Risk":"Inactive"; }
  return (
    <div>
      <div style={{color:TEXT3,fontSize:11,fontWeight:700,letterSpacing:1.5,marginBottom:12}}>CLIENT STATUS</div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {[{label:"Active",count:active.length,color:"#1B8C4E",bg:"#E8F7EF"},{label:"At Risk",count:atRisk.length,color:"#D97706",bg:"#FEF3C7"},{label:"Inactive",count:inactive.length,color:"#E05252",bg:"#FEE2E2"}].map(function(p){
          return (
            <div key={p.label} style={{flex:1,background:p.bg,border:"1.5px solid "+p.color+"44",borderRadius:12,padding:"10px 12px",textAlign:"center"}}>
              <div style={{color:p.color,fontSize:22,fontWeight:900}}>{p.count}</div>
              <div style={{color:p.color,fontSize:10,fontWeight:700,marginTop:2}}>{p.label.toUpperCase()}</div>
            </div>
          );
        })}
      </div>
      {CLIENT_DATA.map(function(c) {
        var pct = Math.round(c.workouts/c.goal*100);
        var color = sc(c.status);
        return (
          <div key={c.id} style={{background:CARD,border:"1.5px solid "+BORDER,borderRadius:16,padding:"14px 16px",marginBottom:10,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,width:4,bottom:0,background:color,borderRadius:"16px 0 0 16px"}} />
            <div style={{paddingLeft:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:38,height:38,borderRadius:99,background:c.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{color:"#fff",fontSize:12,fontWeight:800}}>{c.initials}</span>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{color:TEXT,fontSize:14,fontWeight:700}}>{c.name}</span>
                    <span style={{background:color+"18",color:color,fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:99}}>{sl(c.status)}</span>
                  </div>
                  <div style={{color:TEXT3,fontSize:11,marginTop:2}}>Last active: {c.lastActive} - {c.streak}d streak</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{color:c.streak>=7?"#1B8C4E":c.streak>=3?"#D97706":"#E05252",fontSize:18,fontWeight:900}}>{c.streak}d</div>
                  <div style={{color:TEXT3,fontSize:9}}>streak</div>
                </div>
              </div>
              <div style={{marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:TEXT3,fontSize:10}}>Monthly workouts</span>
                  <span style={{color:TEXT2,fontSize:10,fontWeight:700}}>{c.workouts}/{c.goal}</span>
                </div>
                <div style={{background:SURFACE2,borderRadius:99,height:5,overflow:"hidden"}}>
                  <div style={{width:pct+"%",height:"100%",background:color,borderRadius:99}} />
                </div>
              </div>
              <div style={{display:"flex",gap:12}}>
                <span style={{color:TEXT3,fontSize:10}}>{c.checkIns} check-ins</span>
                <span style={{color:TEXT3,fontSize:10}}>Since {c.since}</span>
                <span style={{color:"#1B8C4E",fontSize:10,fontWeight:700,marginLeft:"auto"}}>${c.revenue}/mo</span>
              </div>
            </div>
          </div>
        );
      })}
      <div style={{color:TEXT3,fontSize:11,fontWeight:700,letterSpacing:1.5,margin:"20px 0 12px"}}>REVENUE &amp; GROWTH</div>
      <div style={{background:CARD,border:"1.5px solid "+BORDER,borderRadius:16,padding:"16px",marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{color:TEXT3,fontSize:10,fontWeight:700,letterSpacing:1}}>MONTHLY RECURRING</div>
            <div style={{color:TEXT,fontSize:26,fontWeight:900,marginTop:2}}>$2,760 <span style={{color:"#1B8C4E",fontSize:13,fontWeight:700}}>+15%</span></div>
            <div style={{color:TEXT3,fontSize:11,marginTop:2}}>Projected this month</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{color:TEXT3,fontSize:10,fontWeight:700,letterSpacing:1}}>CLIENTS</div>
            <div style={{color:TEXT,fontSize:26,fontWeight:900,marginTop:2}}>{CLIENT_DATA.length} <span style={{color:"#1B8C4E",fontSize:13,fontWeight:700}}>+1</span></div>
            <div style={{color:TEXT3,fontSize:11,marginTop:2}}>vs last month</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"flex-end",gap:4,height:70,marginBottom:6}}>
          {REVENUE_DATA.map(function(v,i){
            var p = (v/maxRev)*100;
            return <div key={i} style={{flex:1,height:p+"%",minHeight:4,background:i===REVENUE_DATA.length-1?"#1B8C4E":"#1B8C4E44",borderRadius:"3px 3px 0 0"}} />;
          })}
        </div>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          {["Jan","Mar","May","Jul","Sep","Nov","Dec"].map(function(m){return <span key={m} style={{color:TEXT3,fontSize:9}}>{m}</span>;})}
        </div>
      </div>
      <div style={{color:TEXT3,fontSize:11,fontWeight:700,letterSpacing:1.5,margin:"20px 0 12px"}}>CLIENT RETENTION</div>
      <div style={{background:CARD,border:"1.5px solid "+BORDER,borderRadius:16,padding:"16px",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:16}}>
          <div style={{position:"relative",width:80,height:80,flexShrink:0}}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke={SURFACE2} strokeWidth="10" />
              <circle cx="40" cy="40" r="32" fill="none" stroke="#1B8C4E" strokeWidth="10"
                strokeDasharray={(2*Math.PI*32*0.94)+" "+(2*Math.PI*32)}
                strokeLinecap="round" transform="rotate(-90 40 40)" />
            </svg>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{color:TEXT,fontSize:16,fontWeight:900}}>94%</span>
            </div>
          </div>
          <div>
            <div style={{color:TEXT,fontSize:16,fontWeight:800,marginBottom:4}}>Strong Retention</div>
            <div style={{color:TEXT2,fontSize:12,lineHeight:1.5}}>94% of clients active after 3 months. Industry avg ~70%.</div>
          </div>
        </div>
        {[{label:"3+ months",pct:94,color:"#1B8C4E"},{label:"6+ months",pct:75,color:"#3B7DD8"},{label:"12+ months",pct:40,color:"#9B6FD4"}].map(function(r){
          return (
            <div key={r.label} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:TEXT2,fontSize:12}}>{r.label}</span>
                <span style={{color:TEXT,fontSize:12,fontWeight:700}}>{r.pct}%</span>
              </div>
              <div style={{background:SURFACE2,borderRadius:99,height:6,overflow:"hidden"}}>
                <div style={{width:r.pct+"%",height:"100%",background:r.color,borderRadius:99}} />
              </div>
            </div>
          );
        })}
        <div style={{background:"#E8F7EF",borderRadius:10,padding:"10px 12px",marginTop:6}}>
          <span style={{color:"#1B8C4E",fontSize:12,fontWeight:600}}>Priya Nair has not logged in 12 days - consider reaching out.</span>
        </div>
      </div>
    </div>
  );
}

function AnalyticsScreen({ isCoach, monthStats, todaySteps, last7Steps }) {
  const stats = monthStats || { totalWorkouts: 15, totalMiles: "18.0", restDays: 5 };
  const totalWorkouts = CLIENTS.reduce(function(s, c) { return s + c.workedOut.length; }, 0);
  const avgStreak = Math.round(CLIENTS.reduce(function(s, c) { return s + c.streak; }, 0) / CLIENTS.length);
  const [stepGoal, setStepGoal] = useState(10000);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("10000");
  const [histPeriod, setHistPeriod] = useState("all");
  const [hoveredBar, setHoveredBar] = useState(null);

  const avgSteps = 0; // avgSteps is computed inline in the chart from last7Steps (passed via monthStats)
  const avgStepsStr = avgSteps >= 1000 ? (Math.floor(avgSteps/100)/10).toFixed(1)+"k" : String(avgSteps);

  // MOCK: Leaderboard data - in production, query aggregated stats per client from the backend
  const LEADERS = [
    { initials: "SK", name: "Sarah Kim",      val: "21d",    color: "#1B8C4E" },
    { initials: "MJ", name: "Marcus Johnson", val: "15",     color: "#1B8C4E" },
    { initials: "SK", name: "Sarah Kim",      val: "11.2k",  color: "#1B8C4E" },
    { initials: "SK", name: "Sarah Kim",      val: "24.5mi", color: "#1B8C4E" },
  ];

  const clientStats = [
    { val: "12d",                       label: "Day Streak",          html: ICON_FIRE },
    { val: String(stats.totalWorkouts), label: "Activities This Month", html: ICON_WORKOUT },
    { val: avgStepsStr,                 label: "Avg Steps/Day",       html: ICON_SNEAKER },
    { val: stats.totalMiles+"mi",       label: "Miles This Week",     html: ICON_RUN },
  ];


  const [activeType, setActiveType] = useState("total");
  const trend = TREND_DATA[activeType];

  return (
    <div>
      {/* Hero banner */}
      <div style={{ background: "linear-gradient(135deg, #0A1A0F 0%, #1B8C4E 100%)", borderRadius: 22, padding: "22px 20px 20px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>ANALYTICS</div>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginBottom: 16 }}>
          {isCoach ? "Coaching Overview" : "Your Performance"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {(isCoach ? [
            { val: CLIENTS.length,           label: "Active Clients",       html: ICON_BODY },
            { val: "$2,400",                  label: "Monthly Revenue",      html: ICON_CHART },
            { val: avgStreak+"d",             label: "Avg Client Streak",    html: ICON_FIRE },
            { val: "94%",                     label: "Retention Rate",       html: ICON_WORKOUT },
          ] : clientStats).map(function(s, si) {
            var leader = !isCoach ? LEADERS[si] : null;
            var isLeader = leader && String(s.val) === String(leader.val);
            return (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 14px", backdropFilter: "blur(4px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <div style={{ fontSize: 14, lineHeight: 1 }} dangerouslySetInnerHTML={{ __html: s.html || "" }} />
                  <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>{s.label.toUpperCase()}</span>
                </div>
                <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, marginBottom: leader ? 8 : 0 }}>{s.val}</div>
                {leader && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 7 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 99, background: leader.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ color: "#fff", fontSize: 8, fontWeight: 800 }}>{leader.initials}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 9, fontWeight: 600, letterSpacing: 0.3 }}>TOP</div>
                      <div style={{ color: isLeader ? "#7DFF9B" : "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 700 }}>{leader.val}</div>
                    </div>
                    {isLeader && (
                      <div style={{ background: "#7DFF9B22", borderRadius: 6, padding: "2px 5px" }}>
                        <span style={{ color: "#7DFF9B", fontSize: 8, fontWeight: 800 }}>YOU</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* COACH-SPECIFIC DASHBOARD */}
      {isCoach && <CoachDashboard />}



      {/* Daily Steps + Activity mini charts */}
      {!isCoach && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ color: TEXT3, fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>DAILY STEPS</div>
            {editingGoal ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="number" value={goalDraft} onChange={function(e) { setGoalDraft(e.target.value); }} style={{ width: 80, background: SURFACE, border: "1.5px solid "+BORDER, borderRadius: 8, padding: "4px 8px", color: TEXT, fontSize: 12, fontWeight: 700, outline: "none", textAlign: "center" }} />
                <button onClick={function() { var g = parseInt(goalDraft); if (g > 0) setStepGoal(g); setEditingGoal(false); }} style={{ background: GREEN, border: "none", borderRadius: 8, padding: "4px 10px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
                <button onClick={function() { setEditingGoal(false); }} style={{ background: SURFACE, border: "none", borderRadius: 8, padding: "4px 8px", color: TEXT3, fontSize: 11, cursor: "pointer" }}>Cancel</button>
              </div>
            ) : (
              <button onClick={function() { setEditingGoal(true); setGoalDraft(String(stepGoal)); }} style={{ background: "none", border: "1.5px solid "+BORDER, borderRadius: 8, padding: "4px 10px", color: TEXT2, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                Goal: {stepGoal.toLocaleString()} edit
              </button>
            )}
          </div>

          <div style={{ background: "linear-gradient(135deg,#0A1A0F,#1B8C4E)", borderRadius: 18, padding: "16px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>TODAY</div>
                <div style={{ color: "#fff", fontSize: 34, fontWeight: 900, lineHeight: 1 }}>{todaySteps > 0 ? todaySteps.toLocaleString() : "--"}</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>steps</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: todaySteps >= stepGoal ? "#7DFF9B" : "#FFB3A7", fontSize: 11 }}>{todaySteps > 0 ? Math.round(todaySteps / stepGoal * 100) + "% of goal" : "No steps logged yet"}</div>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, marginTop: 2 }}>{todaySteps > 0 ? (todaySteps * 0.000473).toFixed(2) + " mi" : ""}</div>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 99, height: 5, overflow: "hidden" }}>
              <div style={{ width: Math.min(100, todaySteps > 0 ? Math.round(todaySteps / stepGoal * 100) : 0)+"%", height: "100%", background: todaySteps >= stepGoal ? "#7DFF9B" : "#FFB3A7", borderRadius: 99, transition: "width 0.4s" }} />
            </div>
          </div>

          <div style={{ background: CARD, border: "1.5px solid "+BORDER, borderRadius: 16, padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ color: TEXT2, fontSize: 11, fontWeight: 600, marginBottom: 12 }}>PAST 7 DAYS</div>
            {(function() {
                var stepsData = (last7Steps && last7Steps.length === 7) ? last7Steps : [{day:"Sun",steps:0,goal:10000},{day:"Mon",steps:0,goal:10000},{day:"Tue",steps:0,goal:10000},{day:"Wed",steps:0,goal:10000},{day:"Thu",steps:0,goal:10000},{day:"Fri",steps:0,goal:10000},{day:"Sat",steps:0,goal:10000}];
                var avgStepsLive = Math.round(stepsData.reduce(function(s,d){return s+d.steps;},0) / stepsData.length);
                return (
                  <>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
                    {stepsData.map(function(d, i) {
                      var pct = Math.min(100, (d.steps / 14000) * 100);
                      var hitGoal = d.steps >= stepGoal;
                      return (
                        <div key={d.day+"-"+i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ color: d.steps === 0 ? TEXT3 : hitGoal ? TEXT2 : "#E05252", fontSize: 9, fontWeight: 600 }}>{d.steps === 0 ? "--" : d.steps >= 1000 ? (d.steps/1000).toFixed(1)+"k" : d.steps}</div>
                          <div style={{ width: "100%", height: 52, display: "flex", alignItems: "flex-end" }}>
                            <div style={{ width: "100%", height: d.steps === 0 ? "2%" : pct+"%", background: d.steps === 0 ? SURFACE2 : hitGoal ? GREEN : "#E05252", borderRadius: "4px 4px 0 0", minHeight: 3 }} />
                          </div>
                          <div style={{ color: TEXT3, fontSize: 9 }}>{d.day}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: GREEN }} />
                      <span style={{ color: TEXT3, fontSize: 10 }}>Goal hit</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: "#E05252" }} />
                      <span style={{ color: TEXT3, fontSize: 10 }}>Below goal</span>
                    </div>
                    <div style={{ color: TEXT3, fontSize: 10, marginLeft: "auto" }}>
                      Avg: {avgStepsLive.toLocaleString()} steps/day
                    </div>
                  </div>
                  </>
                );
              })()}
          </div>
        </div>
      )}


      {/* Activity trends section - client only */}
      {!isCoach && (
        <div>
          <div style={{ color: TEXT3, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, marginBottom: 12 }}>ACTIVITY TRENDS</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
            {Object.keys(TREND_DATA).map(function(key) {
              const t = TREND_DATA[key];
              const active = activeType === key;
              return (
                <button key={key} onClick={function() { setActiveType(key); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 99, background: active ? t.color : CARD, border: "1.5px solid "+(active ? t.color : BORDER), cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }}>
                  <div style={{ fontSize: 14, lineHeight: 1 }} dangerouslySetInnerHTML={{ __html: TREND_ICONS[key] || "" }} />
                  <span style={{ color: active ? "#fff" : TEXT2, fontSize: 12, fontWeight: active ? 700 : 500 }}>{t.label}</span>
                </button>
              );
            })}
          </div>
          <WorkoutTrendChart
            workoutType={activeType}
            color={trend.color}
            data={trend.data}
            unit={trend.unit}
            livePace={activeType === "run" && stats.avgPace ? stats.avgPace : null}
          />
        </div>
      )}

      {/* Run History Chart */}

      {!isCoach && (
        <div style={{ marginBottom: 20 }}>
          {(function() {
            var HISTORY_DATA = {
              all: {
                label: "2020 - 2026",
                miles: 847,
                runs: 554,
                avgPace: "9:14",
                totalTime: "782:39",
                bars: [
                  { year: "2020", miles: 210 },
                  { year: "2021", miles: 285 },
                  { year: "2022", miles: 320 },
                  { year: "2023", miles: 410 },
                  { year: "2024", miles: 780 },
                  { year: "2025", miles: 260 },
                  { year: "2026", miles: 420 },
                ],
              },
              year: {
                label: "This Year",
                miles: 420,
                runs: 87,
                avgPace: "8:52",
                totalTime: "62:14",
                bars: [
                  { year: "Jan", miles: 48 },
                  { year: "Feb", miles: 62 },
                  { year: "Mar", miles: 71 },
                  { year: "Apr", miles: 55 },
                  { year: "May", miles: 84 },
                  { year: "Jun", miles: 0 },
                  { year: "Jul", miles: 0 },
                  { year: "Aug", miles: 0 },
                  { year: "Sep", miles: 0 },
                  { year: "Oct", miles: 0 },
                  { year: "Nov", miles: 0 },
                  { year: "Dec", miles: 0 },
                ],
              },
              month: {
                label: "This Month",
                miles: 84,
                runs: 18,
                avgPace: "8:44",
                totalTime: "12:22",
                bars: [
                  { year: "W1", miles: 18 },
                  { year: "W2", miles: 24 },
                  { year: "W3", miles: 22 },
                  { year: "W4", miles: 20 },
                ],
              },
              week: {
                label: "This Week",
                miles: 22,
                runs: 4,
                avgPace: "8:38",
                totalTime: "3:08",
                bars: [
                  { year: "Mon", miles: 0 },
                  { year: "Tue", miles: 6 },
                  { year: "Wed", miles: 8 },
                  { year: "Thu", miles: 5 },
                  { year: "Fri", miles: 0 },
                  { year: "Sat", miles: 0 },
                  { year: "Sun", miles: 3 },
                ],
              },
            };

            var hd = HISTORY_DATA[histPeriod];
            var maxMiles = Math.max.apply(null, hd.bars.map(function(b) { return b.miles; }));
            var avgMiles = hd.bars.filter(function(b) { return b.miles > 0; }).reduce(function(s,b) { return s+b.miles; }, 0) /
                           Math.max(1, hd.bars.filter(function(b) { return b.miles > 0; }).length);
            var avgPct = maxMiles > 0 ? (avgMiles / maxMiles) * 100 : 0;
            var currentYear = "2026";

            return (
              <div>
                <div style={{ color: TEXT3, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, marginBottom: 12 }}>RUN HISTORY</div>

                {/* Period toggle */}
                <div style={{ display: "flex", background: SURFACE, borderRadius: 12, padding: 3, marginBottom: 16 }}>
                  {[["week","W"],["month","M"],["year","Y"],["all","All"]].map(function(item) {
                    var active = histPeriod === item[0];
                    return (
                      <button key={item[0]} onClick={function() { setHistPeriod(item[0]); }} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, background: active ? TEXT : "none", border: "none", color: active ? "#fff" : TEXT3, fontSize: 13, fontWeight: active ? 700 : 400, cursor: "pointer" }}>
                        {item[1]}
                      </button>
                    );
                  })}
                </div>

                <div style={{ background: CARD, border: "1.5px solid "+BORDER, borderRadius: 18, padding: "20px 16px 16px", marginBottom: 20 }}>
                  {/* Period label */}
                  <div style={{ color: TEXT2, fontSize: 13, marginBottom: 4 }}>{hd.label}</div>

                  {/* Big miles number */}
                  <div style={{ color: TEXT, fontSize: 52, fontWeight: 900, lineHeight: 1, letterSpacing: -2, fontStyle: "italic", marginBottom: 4 }}>{hd.miles.toLocaleString()}</div>
                  <div style={{ color: TEXT3, fontSize: 13, marginBottom: 16 }}>Miles</div>

                  {/* Secondary stats */}
                  <div style={{ display: "flex", gap: 24, marginBottom: 20 }}>
                    <div>
                      <div style={{ color: TEXT, fontSize: 20, fontWeight: 800 }}>{hd.runs}</div>
                      <div style={{ color: TEXT3, fontSize: 12 }}>Runs</div>
                    </div>
                    <div>
                      <div style={{ color: TEXT, fontSize: 20, fontWeight: 800 }}>{hd.avgPace}"</div>
                      <div style={{ color: TEXT3, fontSize: 12 }}>Avg. Pace</div>
                    </div>
                    <div>
                      <div style={{ color: TEXT, fontSize: 20, fontWeight: 800 }}>{hd.totalTime}</div>
                      <div style={{ color: TEXT3, fontSize: 12 }}>Time (hrs)</div>
                    </div>
                  </div>

                  {/* Bar chart */}
                  <div style={{ position: "relative" }}>
                    {/* Y-axis grid lines */}
                    <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 24, pointerEvents: "none" }}>
                      {[0, 0.33, 0.67, 1].map(function(pct) {
                        var val = Math.round(maxMiles * pct);
                        return (
                          <div key={pct} style={{ position: "absolute", bottom: pct * 100 + "%", left: 0, right: 0, display: "flex", alignItems: "center" }}>
                            <div style={{ flex: 1, height: 1, background: pct === 0 ? BORDER : SURFACE2, opacity: 0.6 }} />
                            <div style={{ color: TEXT3, fontSize: 9, paddingLeft: 4, width: 28, textAlign: "right" }}>{val > 0 ? val : "0mi"}</div>
                          </div>
                        );
                      })}
                      {/* Average dashed line */}
                      <div style={{ position: "absolute", bottom: avgPct+"%", left: 0, right: 0, borderTop: "1.5px dashed "+TEXT3, opacity: 0.5 }} />
                    </div>

                    {/* Bars */}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140, paddingBottom: 24, paddingRight: 32, position: "relative", zIndex: 1 }}>
                      {hd.bars.map(function(b, i) {
                        var pct = maxMiles > 0 ? (b.miles / maxMiles) * 100 : 0;
                        var isCurrent = b.year === currentYear || (histPeriod === "year" && b.year === "May") || (histPeriod === "month" && b.year === "W4") || (histPeriod === "week" && b.year === "Wed");
                        var isHovered = hoveredBar === histPeriod + "-" + i;
                        var barKey = histPeriod + "-" + i;
                        return (
                          <div key={"notif-"+i}
                            onTouchStart={function() { setHoveredBar(barKey); }}
                            onTouchEnd={function() { setTimeout(function() { setHoveredBar(null); }, 1200); }}
                            onMouseEnter={function() { setHoveredBar(barKey); }}
                            onMouseLeave={function() { setHoveredBar(null); }}
                            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", position: "relative", cursor: "pointer" }}>
                            {/* Tooltip */}
                            {isHovered && b.miles > 0 && (
                              <div style={{ position: "absolute", bottom: "calc("+Math.max(pct,2)+"% + 6px)", left: "50%", transform: "translateX(-50%)", background: TEXT, color: "#fff", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.2)", pointerEvents: "none" }}>
                                {b.miles} mi
                                {/* Arrow */}
                                <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid "+TEXT }} />
                              </div>
                            )}
                            {b.miles > 0 && (
                              <div style={{ width: "100%", background: isHovered ? GREEN : isCurrent ? GREEN : TEXT, borderRadius: "3px 3px 0 0", height: Math.max(pct, 2)+"%", minHeight: 4, transition: "background 0.15s, height 0.3s ease", opacity: isHovered ? 1 : isCurrent ? 1 : 0.85 }} />
                            )}
                            <div style={{ position: "absolute", bottom: 0, color: isHovered ? GREEN : isCurrent ? GREEN : TEXT3, fontSize: hd.bars.length > 8 ? 8 : 10, fontWeight: isCurrent || isHovered ? 700 : 400, paddingTop: 4, textAlign: "center", width: "100%" }}>{b.year}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
}


function IconHome({ active, color }) {
  const c = active ? color : "#A0A0A0";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H15V16H9V21H4C3.45 21 3 20.55 3 20V10.5Z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={active ? c+"22" : "none"} />
    </svg>
  );
}

function IconProgram({ active, color }) {
  const c = active ? color : "#A0A0A0";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke={c} strokeWidth="1.8" fill={active ? c+"22" : "none"} />
      <line x1="7" y1="8" x2="17" y2="8" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="7" y1="12" x2="17" y2="12" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="7" y1="16" x2="13" y2="16" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconLibrary({ active, color }) {
  const c = active ? color : "#A0A0A0";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="20" height="14" rx="2" stroke={c} strokeWidth="1.8" fill={active ? c+"22" : "none"} />
      <polygon points="10,8.5 10,14.5 16,11.5" fill={c} />
      <line x1="8" y1="21" x2="16" y2="21" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="21" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconConnection({ active, color }) {
  const c = active ? color : "#A0A0A0";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="3.5" stroke={c} strokeWidth="1.8" fill={active ? c+"22" : "none"} />
      <path d="M5 20C5 16.69 8.13 14 12 14C15.87 14 19 16.69 19 20" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="19" cy="8" r="2.5" stroke={c} strokeWidth="1.6" fill="none" />
      <path d="M21.5 15C21.5 13.07 20.43 12 19 12" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconCalendar({ active, color }) {
  const c = active ? color : "#A0A0A0";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke={c} strokeWidth="1.8" fill={active ? c+"22" : "none"} />
      <line x1="3" y1="10" x2="21" y2="10" stroke={c} strokeWidth="1.8" />
      <line x1="8" y1="3" x2="8" y2="7" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="16" y1="3" x2="16" y2="7" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="15" r="1.2" fill={c} />
      <circle cx="12" cy="15" r="1.2" fill={c} />
      <circle cx="16" cy="15" r="1.2" fill={c} />
    </svg>
  );
}

function IconRace({ active, color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/>
      <path d="M12 7v5l3 3"/>
    </svg>
  );
}

function IconAnalytics({ active, color }) {
  const c = active ? color : "#A0A0A0";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="12" width="4" height="9" rx="1" stroke={c} strokeWidth="1.8" fill={active ? c+"22" : "none"} />
      <rect x="10" y="7" width="4" height="14" rx="1" stroke={c} strokeWidth="1.8" fill={active ? c+"44" : "none"} />
      <rect x="17" y="3" width="4" height="18" rx="1" stroke={c} strokeWidth="1.8" fill={active ? c+"66" : "none"} />
    </svg>
  );
}

function IconGear({ size, color }) {
  const s = size || 22;
  const c = color || TEXT2;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.8" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={c} strokeWidth="1.8" />
    </svg>
  );
}

function AuthFlow({ screen, setScreen, onAuth }) {
  const [role, setRole]           = useState(null);
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [coachCode, setCoachCode] = useState("");
  const [errors, setErrors]       = useState({});
  const [showPass, setShowPass]   = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent]   = useState(false);

  const inputS = {
    width: "100%", background: SURFACE, border: "1.5px solid "+BORDER,
    borderRadius: 12, padding: "14px 16px", color: TEXT, fontSize: 15,
    outline: "none", boxSizing: "border-box", marginBottom: 12,
  };
  const errS = { color: "#E05252", fontSize: 12, marginTop: -8, marginBottom: 10 };

  function validate() {
    var e = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.includes("@")) e.email = "Enter a valid email";
    if (password.length < 6) e.password = "Password must be at least 6 characters";
    if (password !== confirm) e.confirm = "Passwords do not match";
    if (role === "client") {
      if (!coachCode.trim()) {
        e.coachCode = "Enter your coach code";
      } else if (coachCode.trim().toUpperCase() !== COACH_CODE) {
        e.coachCode = "Invalid coach code — check with your coach";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSignUp() {
    if (!validate()) return;
    onAuth(role === "coach");
  }

  function handleLogin() {
    var e = {};
    if (!email.includes("@")) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    setErrors(e);
    if (Object.keys(e).length === 0) onAuth(role === "coach", email.split("@")[0]);
  }

  // Welcome screen
  if (screen === "welcome") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0A1A0F", overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px" }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 250, height: 250, borderRadius: "50%", background: "rgba(27,140,78,0.15)" }} />
          <div style={{ position: "absolute", bottom: 80, left: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(27,140,78,0.1)" }} />
          <div style={{ width: 80, height: 80, borderRadius: 20, overflow: "hidden", marginBottom: 24, boxShadow: "0 8px 32px rgba(27,140,78,0.4)" }}>
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAJXUlEQVR42u1bW2hV2Rn+177kaDRGhZqJRg2RaUSjYjXEEbEzTVBBqa2XQmRixXnwIYIKnalgtEbG4MQHoYPaCoK3oOgMGYsNXkPVJyNKIwpB7RgdTSRETUyiOXvvtb8+nLN2zsnZ+9xNOnQtWIRg9lr/+v7vv64lIyKQHEkPRUIgAZQASgAlgHJIACWAEkAJoBwSQAmgBFACKIcEUAIoAZQAyiEBlABKAP8PhpauhRhjcf8tkL57LEVR0r5mIrIz+hnfyimKQrZtD+meuq6TaZrpY6CiKASAZs+eTYcPHybbth1WDKiNiNucdF2nqqoddPXqNVJVlTjnyZuOppFlWfTLjz+mv377LWVnZ5Nt2wlZQnSqBekVZJ1t2zRixAiqrKykpqamMOUhlalpGogIhw4dQjyjsbERRARFUVLes7i4GC9evMBQjaqqKhARVFUNlSd58BhjICJkZ2fj5cuXsCwLhmHANE3XaRgGOLcxb948ELHBgsQHnh4Ab+nSpXjb/RYAYPgNWB57pjrfv38PANj9l91eik+dfesr1gMATNOEbdue0zAMAMCJEyfcNBn3fuXl5TAM031PbkeVIZHp9/sBAAcPHnT2F6RJC4BCG42NjXEByDmHbdvo6+vD1KlTwRiLy5QZG2Dr5s2bAQCcc1iWFT8gCQIrlH3mzBlH2S7gJQ+gGjz4jBkzYZomOOcOQPEItnfv3jBWRQNPgFxdXQ0AsEwL3OIfHLxLly5B13UoiuIFXvIAioN/s+8bxw/FI5xgTXt7O7LHjAFjzFO4UMFFkBLKGgyQaZowDQNGCtM0TPT39wMAmpqaMHr06HisJPngMXLkSLS2tgZYEcucQlhgmgH/tWnTJk8WCqEzMjJw9uxZR0luLBfrpWu0tLQgZ0JOXNlCUom0pmnEOaeVv11J9T/Uk2VxUtX4q0Kbc1JUlR48eEBz584N5IOAI4jIEbPHZNP3339HpWVlZBgG6bo+uCwgbtukaRrdunWLnjx5QqqqJlWVACDGGJmmSTt37nTWiidXTdz/BR36+fP/CDDDMFwZF8FKHm7KALBixYowFoqfEydOxO3btz3dA+fcYd6Rvx9JKa+MZmVxzOQib35+Pt6/ex8WXQdPES3d/k0c/sqVK866ejDHKywsxKOHj7zBsyxHAXv27An5Xk/LTFAZyQWPqh1VngcUrKyvrwcAdxZy24nc8+b9ymF1SUkJ2tvbPZktWA0AlZWVQZnUtDMwbqYm4gNZoO1CmqbRvXv3aPr06cQtTorwfyCyYZOqqtTS0kILFy6k5n83U97kvECNzBSnviQisiyLdF2nU6dOUUVFBS1fvpxOnz5NWVlZZFkWqaoatj/nnDRNI7/fTxUVFXTu3DnSdZ0452TbNk2aNCnlTovP56PW1taE/GhCvo8xhrKysoHIyz3yvJpAnldTU+PJJs45AODVq1fYsWOHY9aWGRnRzWDl0dnZiU8//TWICLquOxZRs7cGfX19ePv2LXp7exOeXV1d4Jxj79dfhyXuaTVhsWhdXZ07KEF/Z/gNFBYWgjGG/Px89Pb2RfeVdjB/sBGSIPMIpfz4nx9RVFQUBE+DrusgInz5py8dV5HMEIq8cOECFEWJlTgnB6ASXDAnJwddXd2DDitYEjjoxYsXHYYQEU6ePOkdrUMiqgNwCKsNvxFMbG8jLy/P8cOCeV9s/MJZ27Isx6/GO4VympubkZWVFTWxTwlAIXBl5WZPMIQJ/mHtWhARfD4fGGMoLi4eKPV4/OWWOFxDQwOysrIcKxCyrFq1yrs6SaAq6ujowLRp08JK1LQDKDTTdKvJtXEg0ornz59j1KhREXXs9evXA98ZZsyDcc4dn3fs2DHHdSiK4oBXWloGv9+feFNhUCpkGAYWL14cIEkS7TVKxPcVFxc7BxysccGW/fv3uybGq1evDgYeM2pxHwAkAN6+ffuCigj4JLFWSUkJenp6wlgU+n3MaQ2Y7vr1f4yrqZEWAA8f/ttA7scHBY9g5TFr1qwwUxDM9fl8ePz4MWzYnowRUR0Atm3bFhb5BZNnzpyJjo4Oj14gTyh47N4daJLqyYMXG8CBrvNYR/DBAAjfd+PGDdcCXGj3q6/+HNN/Gn4/1pWvC2tgishYUFCAZ8+eefYeAaC/vx9db7rQ3d3tOt+8foPenl4cP3Y8WpM0fQCKw2/YsGFAcO5++I0bN7qagwB0Ym4uuru7gz6IR+R4r1+/RmlpacQa4vurV68CAPx+v2uj1u/3Y8GCBZjwiwnIzc3FRzkfIScnJ2Lm5uaGWUeK1Uh8ta9XEBA5VGdnJ8aNG+dZiAs3cPTo0TAWCl/U2tqKOXPmRIAnXMHMYOPWLXkXMjU0NAxHORe761xUVDSQKnhUHkeOHIl6z6GqKogxzJ8/33Hm4s7h7t27mDJliit7xe/7ojRuraAFrFmzBowx6LrusMtrDgmAQvja2tqo5Zht2/jkkwUxL4ocNv/rusPcy5cvY+zYsa7fhjZun7Y+dfW/In366dlPyMzMTLQV9eEADBP+qYfwQc3fuXMnrvJHKGTtmjWB27njx51qxQ14J2H+/SrPwCEsoLa2NtV0JL0Aiui0cuXvPIUXzn/Lli1xXxAREcaNHYetW7dGMNOLsRcu/DNq49Y0TcyYMSPlC/u0AqiqAUHO/3DeVXhhuj09PU5US1T4WBdKRISCggL09/e7NiNE9L927dpwgecOoBBk6pSpePfunavwbvemyXR2Ypn7rl27YuaO68rLh8t83QEUgmzfvj1qZxgAlixZEiizkqsjozLT5/Ph0aNHrj1CbgWCUFtbm9NoGOLg4Q4gC3kJcP/+fUfTobWk8IcPHz5ERkZG2lMDoYxly5aFdVtCp0iBDhw4MJzsiwRQmNZvPvvMs0kp2FddXf1BhBcyiDsVHqXGFcm3mkYLSEjZXn3+zz+vIMMwyDAM0jQt4t1cT08P1dXVBe550/jIUVEU4pzT5MmTadGiRdTX10cAUeizPzt4F3zz5k1qbm4mRWEpvTVM6WWu16VSXl4eaZrmernCGCPDMKitre2DCZaZmUnjx4+PeDQp5FEUhbq6uqi3t5cYY0P2xDduAON9Fz1cgv/PPzJnjMV8Lvuh3ydHPBV2uYYcbgX+rB+Zy/8nIgGUQwIoAZQASgAlgHJIACWAEkAJoBwSQAmgBFACKIcEUAIoAZQAyiEBHJrxXyn4zZMXNAwTAAAAAElFTkSuQmCC" alt="MF" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: "#fff", fontSize: 36, fontWeight: 900, fontStyle: "italic", lineHeight: 1 }}>
              <span style={{ color: "#fff" }}>Money</span><span style={{ color: "#1B8C4E" }}>Fitness</span>
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, marginTop: 10 }}>Consistency + Performance</div>
          </div>
          <button onClick={function() { onAuth(true); }} style={{ width: "100%", padding: "14px 16px", borderRadius: 99, background: "#fff", border: "none", color: "#1A1A1A", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.15)" }} />
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>or</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.15)" }} />
          </div>
          <button onClick={function() { setScreen("role"); }} style={{ width: "100%", padding: "16px", borderRadius: 99, background: "#1B8C4E", border: "none", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", marginBottom: 12 }}>
            Sign Up with Email
          </button>
          <button onClick={function() { setScreen("login"); }} style={{ width: "100%", padding: "16px", borderRadius: 99, background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer", marginBottom: 14 }}>
            Log In
          </button>
          <button onClick={function() { onAuth(true); }} style={{ width: "100%", padding: "12px", borderRadius: 99, background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 13, cursor: "pointer" }}>
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // Role selection
  if (screen === "role") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: BG, padding: "40px 24px" }}>
        <button onClick={function() { setScreen("welcome"); }} style={{ background: "none", border: "none", color: TEXT3, fontSize: 13, cursor: "pointer", textAlign: "left", marginBottom: 32 }}>Back</button>
        <div style={{ color: TEXT, fontSize: 28, fontWeight: 900, marginBottom: 8 }}>I am a...</div>
        <div style={{ color: TEXT2, fontSize: 15, marginBottom: 36 }}>Choose your role to get started</div>

        <div onClick={function() { setRole("coach"); setScreen("signup"); }} style={{ background: "#0A1A0F", borderRadius: 20, padding: "28px 24px", marginBottom: 14, cursor: "pointer", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(27,140,78,0.2)" }} />

          <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Coach</div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 14 }}>Manage clients, build programs, track progress</div>
          <div style={{ marginTop: 16, display: "inline-block", background: "#1B8C4E", borderRadius: 99, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700 }}>Continue as Coach</div>
        </div>

        <div onClick={function() { setRole("client"); setScreen("signup"); }} style={{ background: CARD, border: "1.5px solid "+BORDER, borderRadius: 20, padding: "28px 24px", cursor: "pointer", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: ORANGE_BG }} />

          <div style={{ color: TEXT, fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Client</div>
          <div style={{ color: TEXT2, fontSize: 14 }}>Follow your program, log workouts, hit your goals</div>
          <div style={{ marginTop: 16, display: "inline-block", background: SURFACE2, borderRadius: 99, padding: "8px 20px", color: ORANGE, fontSize: 13, fontWeight: 700 }}>Continue as Client</div>
        </div>
      </div>
    );
  }

  // Sign up
  if (screen === "signup") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: BG, overflowY: "auto" }}>
        <div style={{ padding: "40px 24px 32px" }}>
          <button onClick={function() { setScreen("role"); }} style={{ background: "none", border: "none", color: TEXT3, fontSize: 13, cursor: "pointer", textAlign: "left", marginBottom: 28 }}>Back</button>
          <div style={{ color: TEXT, fontSize: 28, fontWeight: 900, marginBottom: 4 }}>
            {role === "coach" ? "Coach Account" : "Client Account"}
          </div>
          <div style={{ color: TEXT2, fontSize: 14, marginBottom: 28 }}>Create your account to get started</div>

          <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>FULL NAME</div>
          <input value={name} onChange={function(e) { setName(e.target.value); }} placeholder="Cameron Money" style={inputS} />
          {errors.name && <div style={errS}>{errors.name}</div>}

          <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>EMAIL</div>
          <input type="email" value={email} onChange={function(e) { setEmail(e.target.value); }} placeholder="you@example.com" style={inputS} />
          {errors.email && <div style={errS}>{errors.email}</div>}

          <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>PASSWORD</div>
          <input type={showPass ? "text" : "password"} value={password} onChange={function(e) { setPassword(e.target.value); }} placeholder="Min. 6 characters" style={inputS} />
          {errors.password && <div style={errS}>{errors.password}</div>}

          <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>CONFIRM PASSWORD</div>
          <input type={showPass ? "text" : "password"} value={confirm} onChange={function(e) { setConfirm(e.target.value); }} placeholder="Repeat password" style={inputS} />
          {errors.confirm && <div style={errS}>{errors.confirm}</div>}

          <div onClick={function() { setShowPass(!showPass); }} style={{ color: TEXT3, fontSize: 12, cursor: "pointer", marginBottom: 20 }}>
            {showPass ? "Hide password" : "Show password"}
          </div>

          {role === "client" && (
            <div>
              <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>COACH CODE</div>
              <input value={coachCode} onChange={function(e) { setCoachCode(e.target.value); }} placeholder="Enter code from your coach" style={inputS} />
              {errors.coachCode && <div style={errS}>{errors.coachCode}</div>}
              <div style={{ color: TEXT3, fontSize: 12, marginBottom: 20 }}>Ask your coach for their unique code to link your account</div>
            </div>
          )}

          <button onClick={handleSignUp} style={{ width: "100%", padding: "16px", borderRadius: 99, background: ORANGE, border: "none", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", marginBottom: 12 }}>
            Create Account
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ color: TEXT3, fontSize: 12 }}>or sign up with</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>
          <button onClick={function() { onAuth(role === "coach"); }} style={{ width: "100%", padding: "14px 16px", borderRadius: 99, background: "#fff", border: "1.5px solid #E2E8F0", color: "#1A1A1A", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
          <div style={{ textAlign: "center", color: TEXT2, fontSize: 14 }}>
            Already have an account? <span onClick={function() { setScreen("login"); }} style={{ color: ORANGE, fontWeight: 700, cursor: "pointer" }}>Log In</span>
          </div>
        </div>
      </div>
    );
  }

  // Log in
  if (screen === "login") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: BG, overflowY: "auto" }}>
        <div style={{ padding: "40px 24px 32px" }}>
          <button onClick={function() { setScreen("welcome"); }} style={{ background: "none", border: "none", color: TEXT3, fontSize: 13, cursor: "pointer", textAlign: "left", marginBottom: 28 }}>Back</button>
          <div style={{ color: TEXT, fontSize: 28, fontWeight: 900, marginBottom: 4 }}>Welcome back</div>
          <div style={{ color: TEXT2, fontSize: 14, marginBottom: 28 }}>Log in to your account</div>

          <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>EMAIL</div>
          <input type="email" value={email} onChange={function(e) { setEmail(e.target.value); }} placeholder="you@example.com" style={inputS} />
          {errors.email && <div style={errS}>{errors.email}</div>}

          <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>PASSWORD</div>
          <input type={showPass ? "text" : "password"} value={password} onChange={function(e) { setPassword(e.target.value); }} placeholder="Your password" style={Object.assign({}, inputS, { marginBottom: 6 })} />
          {errors.password && <div style={errS}>{errors.password}</div>}

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
            <div onClick={function() { setShowPass(!showPass); }} style={{ color: TEXT3, fontSize: 12, cursor: "pointer" }}>
              {showPass ? "Hide password" : "Show password"}
            </div>
            <div onClick={function() { setForgotEmail(email); setForgotSent(false); setScreen("forgot"); }} style={{ color: "#1B8C4E", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Forgot password?</div>
          </div>

          <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>I AM A</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            {["coach","client"].map(function(r) {
              return (
                <button key={r} onClick={function() { setRole(r); }} style={{ flex: 1, padding: "12px", borderRadius: 12, background: role === r ? ORANGE : SURFACE, border: "1.5px solid "+(role === r ? ORANGE : BORDER), color: role === r ? "#fff" : TEXT2, fontSize: 14, fontWeight: role === r ? 700 : 500, cursor: "pointer", textTransform: "capitalize" }}>
                  {r}
                </button>
              );
            })}
          </div>

          {errors.role && <div style={errS}>{errors.role}</div>}

          <button onClick={handleLogin} style={{ width: "100%", padding: "16px", borderRadius: 99, background: ORANGE, border: "none", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", marginBottom: 12 }}>
            Log In
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ color: TEXT3, fontSize: 12 }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>
          <button onClick={function() { onAuth(role === "coach"); }} style={{ width: "100%", padding: "14px 16px", borderRadius: 99, background: "#fff", border: "1.5px solid #E2E8F0", color: "#1A1A1A", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
          <div style={{ textAlign: "center", color: TEXT2, fontSize: 14 }}>
            New here? <span onClick={function() { setScreen("role"); }} style={{ color: ORANGE, fontWeight: 700, cursor: "pointer" }}>Create account</span>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "forgot") {
    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", background:BG, overflowY:"auto" }}>
        <div style={{ padding:"40px 24px 32px" }}>
          <button onClick={function(){ setForgotSent(false); setScreen("login"); }} style={{ background:"none", border:"none", color:TEXT3, fontSize:13, cursor:"pointer", textAlign:"left", marginBottom:28, display:"flex", alignItems:"center", gap:6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back to login
          </button>

          <div style={{ fontSize:28, marginBottom:8 }}>🔑</div>
          <div style={{ color:TEXT, fontSize:26, fontWeight:900, marginBottom:6 }}>Forgot password?</div>
          <div style={{ color:TEXT2, fontSize:14, marginBottom:28, lineHeight:1.5 }}>
            No worries. Enter your email and we'll send you a reset link.
          </div>

          {forgotSent ? (
            <div style={{ background:"#E8F7EF", border:"1.5px solid #1B8C4E44", borderRadius:16, padding:"20px 20px", textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:10 }}>📬</div>
              <div style={{ color:"#1B8C4E", fontSize:16, fontWeight:800, marginBottom:6 }}>Check your inbox</div>
              <div style={{ color:TEXT2, fontSize:13, lineHeight:1.5 }}>
                We sent a reset link to <strong>{forgotEmail}</strong>. It may take a minute to arrive.
              </div>
              <button onClick={function(){ setForgotSent(false); setScreen("login"); }}
                style={{ marginTop:20, width:"100%", padding:"14px", borderRadius:99, background:"#1B8C4E", border:"none", color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer" }}>
                Back to Login
              </button>
            </div>
          ) : (
            <>
              <div style={{ color:TEXT2, fontSize:11, fontWeight:700, letterSpacing:1, marginBottom:6 }}>EMAIL ADDRESS</div>
              <input
                type="email"
                value={forgotEmail}
                onChange={function(e){ setForgotEmail(e.target.value); }}
                placeholder="you@example.com"
                style={inputS}
              />
              <button
                onClick={function(){
                  if (forgotEmail.includes("@")) setForgotSent(true);
                }}
                style={{ width:"100%", padding:"16px", borderRadius:99, background:"#1B8C4E", border:"none", color:"#fff", fontSize:16, fontWeight:800, cursor:"pointer", marginTop:8 }}>
                Send Reset Link
              </button>
              <div style={{ textAlign:"center", marginTop:16, color:TEXT3, fontSize:13 }}>
                Remember it after all? <span onClick={function(){ setScreen("login"); }} style={{ color:"#1B8C4E", fontWeight:700, cursor:"pointer" }}>Log in</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // fallthrough
  return null;
}

const GLOBAL_STYLES = "* { box-sizing: border-box; margin: 0; padding: 0; }";


function CoachCodeCard() {
  const [code, setCode]           = useState(COACH_CODE);
  const [editing, setEditing]     = useState(false);
  const [draft, setDraft]         = useState(code);
  const [copied, setCopied]       = useState(false);
  const [saved, setSavedCode]     = useState(false);
  const [error, setError]         = useState("");

  function handleSave() {
    var trimmed = draft.trim().toUpperCase().replace(/\s+/g, "");
    if (trimmed.length < 4) { setError("Code must be at least 4 characters"); return; }
    if (trimmed.length > 20) { setError("Code must be 20 characters or less"); return; }
    if (!/^[A-Z0-9]+$/.test(trimmed)) { setError("Only letters and numbers allowed"); return; }
    setCode(trimmed);
    setDraft(trimmed);
    setEditing(false);
    setError("");
    setSavedCode(true);
    setTimeout(function() { setSavedCode(false); }, 2000);
  }

  function handleCopy() {
    if (navigator.clipboard) navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(function() { setCopied(false); }, 2000);
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>YOUR COACH CODE</div>
      <div style={{ background: DKGREEN, borderRadius: 14, padding: "16px 18px" }}>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginBottom: 12, lineHeight: 1.4 }}>
          Share this code with clients so they can link to your account on signup
        </div>

        {!editing ? (
          <>
            {/* Display mode */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
              <div style={{ color: "#fff", fontSize: 26, fontWeight: 900, letterSpacing: 3, fontFamily: "monospace" }}>{code}</div>
              <button onClick={handleCopy} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0, transition: "background 0.2s" }}>
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
            <button onClick={function() { setDraft(code); setEditing(true); setError(""); }} style={{ width: "100%", padding: "9px", borderRadius: 10, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Change Code
            </button>
            {saved && <div style={{ color: "#7DFF9B", fontSize: 12, fontWeight: 600, textAlign: "center", marginTop: 8 }}>✓ Code updated!</div>}
          </>
        ) : (
          <>
            {/* Edit mode */}
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>NEW CODE</div>
            <input
              value={draft}
              onChange={function(e) { setDraft(e.target.value.toUpperCase()); setError(""); }}
              placeholder="e.g. MONEY2026"
              maxLength={20}
              style={{ width: "100%", background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 18, fontWeight: 800, letterSpacing: 2, fontFamily: "monospace", outline: "none", boxSizing: "border-box", marginBottom: error ? 6 : 12 }}
            />
            {error && <div style={{ color: "#FFB3A7", fontSize: 11, marginBottom: 10 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSave} style={{ flex: 1, padding: "10px", borderRadius: 10, background: "#1B8C4E", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Save Code
              </button>
              <button onClick={function() { setEditing(false); setDraft(code); setError(""); }} style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 8 }}>Letters and numbers only, 4–20 characters</div>
          </>
        )}
      </div>
    </div>
  );
}

function SettingsMenu({ isCoach, goTo, tab, onLogout, onReplayTutorial, notifSettings, setNotifSettings }) {
  const [open, setOpen]           = useState(false);
  const [view, setView]           = useState("menu");
  const [name, setName]           = useState(isCoach ? COACH_NAME : CLIENTS[0].name);
  const [birthday, setBirthday]   = useState(isCoach ? "1988-04-14" : "1995-09-22");
  const [email, setEmail]         = useState(isCoach ? "cameron@moneyfitness.com" : "marcus@email.com");
  const [resetSent, setResetSent] = useState(false);
  const [saved, setSaved]         = useState(false);
  // notifSettings + setNotifSettings lifted to MainApp

  function toggleNotif(key) {
    setNotifSettings(function(prev) {
      var next = Object.assign({}, prev);
      if (key === "all") {
        var newVal = !prev.all;
        return { checkin: newVal, message: newVal, program: newVal, streak: newVal, newClient: newVal, weeklySummary: newVal, streakRisk: newVal, activityComplete: newVal, goalMilestone: newVal, coachCheckinAlert: newVal, all: newVal };
      }
      next[key] = !prev[key];
      next.all = next.checkin && next.message && next.program && next.streak && next.newClient && next.weeklySummary && next.streakRisk && next.activityComplete && next.goalMilestone && next.coachCheckinAlert;
      return next;
    });
  }

  function handleSave() {
    setSaved(true);
    setTimeout(function() { setSaved(false); setView("menu"); }, 1200);
  }

  function handleReset() {
    setResetSent(true);
    setTimeout(function() { setResetSent(false); setView("menu"); }, 2000);
  }

  const inputS = { width: "100%", background: SURFACE, border: "1.5px solid "+BORDER, borderRadius: 10, padding: "11px 14px", color: TEXT, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 };

  var menuItems = [
    { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>', label: "My Profile", action: function() { setView("profile"); } },
    { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>', label: "Connections", action: function() { goTo("watch"); setOpen(false); } },
    { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>', label: "Reset Password", action: function() { setView("reset"); } },
    { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>', label: "Notifications", action: function() { setView("notifications"); } },
  ];

  return (
    <div style={{ position: "relative" }}>
      <button onClick={function() { setOpen(!open); setView("menu"); }} style={{ width: 36, height: 36, borderRadius: 10, background: open || tab === "watch" ? ORANGE_BG : SURFACE, border: "1.5px solid "+(open || tab === "watch" ? ORANGE : BORDER), display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
        <IconGear size={18} color={open || tab === "watch" ? ORANGE : TEXT2} />
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999 }} onClick={function() { setOpen(false); setView("menu"); }} />
      )}

      {open && (
        <div style={{ position: "absolute", top: 44, right: 0, width: 280, background: CARD, border: "1.5px solid "+BORDER, borderRadius: 18, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 1000, overflow: "hidden" }}>

          {/* Menu list */}
          {view === "menu" && (
            <div>
              <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid "+SURFACE2 }}>
                <div style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>{isCoach ? COACH_NAME : CLIENTS[0].name}</div>
                <div style={{ color: TEXT3, fontSize: 11, marginTop: 2 }}>{isCoach ? "Coach" : "Client"}</div>
              </div>
              {menuItems.map(function(item) {
                return (
                  <button key={item.label} onClick={item.action} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid "+SURFACE2, textAlign: "left" }}
                    onMouseEnter={function(e) { e.currentTarget.style.background = SURFACE; }}
                    onMouseLeave={function(e) { e.currentTarget.style.background = "none"; }}>
                    <span style={{ display:"flex", alignItems:"center" }} dangerouslySetInnerHTML={{ __html: item.icon }} />
                    <span style={{ color: TEXT, fontSize: 14, fontWeight: 500 }}>{item.label}</span>
                    <svg style={{ marginLeft: "auto" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT3} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                );
              })}
              <button onClick={function() { if (onReplayTutorial) { setOpen(false); onReplayTutorial(); } }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid "+SURFACE2, textAlign: "left" }}
                onMouseEnter={function(e) { e.currentTarget.style.background = SURFACE; }}
                onMouseLeave={function(e) { e.currentTarget.style.background = "none"; }}>
                <span style={{ display:"flex", alignItems:"center" }} dangerouslySetInnerHTML={{ __html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>' }} />
                <span style={{ color: TEXT, fontSize: 14, fontWeight: 500 }}>Replay Tutorial</span>
                <svg style={{ marginLeft: "auto" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT3} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button onClick={function() { setOpen(false); onLogout(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={function(e) { e.currentTarget.style.background = SURFACE; }}
                onMouseLeave={function(e) { e.currentTarget.style.background = "none"; }}>
                <span style={{ display:"flex", alignItems:"center" }} dangerouslySetInnerHTML={{ __html: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' }} />
                <span style={{ color: TEXT, fontSize: 14, fontWeight: 500 }}>Log Out</span>
                <svg style={{ marginLeft: "auto" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT3} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          )}

          {/* Profile view */}
          {view === "profile" && (
            <div style={{ padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <button onClick={function() { setView("menu"); }} style={{ background: SURFACE, border: "none", color: TEXT2, width: 28, height: 28, borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
                  &lt;
                </button>
                <div style={{ color: TEXT, fontSize: 15, fontWeight: 700 }}>My Profile</div>
              </div>
              <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>FULL NAME</div>
              <input value={name} onChange={function(e) { setName(e.target.value); }} style={inputS} />
              <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>EMAIL</div>
              <input value={email} onChange={function(e) { setEmail(e.target.value); }} style={inputS} />
              <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>BIRTHDAY</div>
              <input type="date" value={birthday} onChange={function(e) { setBirthday(e.target.value); }} style={inputS} />
              <button onClick={handleSave} style={{ width: "100%", padding: "12px", borderRadius: 12, background: saved ? GREEN : ORANGE, border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {saved ? "Saved!" : "Save Changes"}
              </button>

              {/* Coach code card — only shown to coaches */}
              {isCoach && (
                <CoachCodeCard />
              )}
            </div>
          )}

          {/* Reset password view */}
          {view === "reset" && (
            <div style={{ padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <button onClick={function() { setView("menu"); }} style={{ background: SURFACE, border: "none", color: TEXT2, width: 28, height: 28, borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
                  &lt;
                </button>
                <div style={{ color: TEXT, fontSize: 15, fontWeight: 700 }}>Reset Password</div>
              </div>
              {!resetSent ? (
                <div>
                  <div style={{ color: TEXT2, fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
                    Enter your email and we will send you a link to reset your password.
                  </div>
                  <input value={email} onChange={function(e) { setEmail(e.target.value); }} placeholder="your@email.com" style={inputS} />
                  <button onClick={handleReset} style={{ width: "100%", padding: "12px", borderRadius: 12, background: ORANGE, border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                    Send Reset Link
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}><span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span></div>
                  <div style={{ color: TEXT, fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Check your email</div>
                  <div style={{ color: TEXT2, fontSize: 12, lineHeight: 1.5 }}>A reset link has been sent to {email}</div>
                </div>
              )}
            </div>
          )}

          {/* Notifications settings view */}
          {view === "notifications" && (
            <div style={{ padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <button onClick={function() { setView("menu"); }} style={{ background: SURFACE, border: "none", color: TEXT2, width: 28, height: 28, borderRadius: 8, cursor: "pointer", fontSize: 14 }}>&lt;</button>
                <div style={{ color: TEXT, fontSize: 15, fontWeight: 700 }}>Notifications</div>
              </div>

              {/* Master toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid "+SURFACE2, marginBottom: 8 }}>
                <div>
                  <div style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>All Notifications</div>
                  <div style={{ color: TEXT3, fontSize: 11, marginTop: 2 }}>Enable or disable all alerts</div>
                </div>
                <div onClick={function() { toggleNotif("all"); }} style={{ width: 44, height: 26, borderRadius: 13, background: notifSettings.all ? ORANGE : SURFACE2, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 3, left: notifSettings.all ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
                </div>
              </div>

              {[
                ...(isCoach ? [
                  { key: "message",          label: "Client Messages",       desc: "When a client sends you a message",            html: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H40A16,16,0,0,0,24,64V224a8,8,0,0,0,13,6.22L72,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48Zm0,144H69.47a8,8,0,0,0-5.19,1.91L40,212.12V64H216Z"/></svg>' },
                  { key: "checkin",          label: "Check-in Responses",    desc: "When a client submits a weekly check-in",       html: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/></svg>' },
                  { key: "coachCheckinAlert",label: "Client Activity Alert", desc: "When a client completes a logged workout",      html: ICON_WORKOUT },
                  { key: "streak",           label: "Inactivity Alerts",     desc: "When a client hasn't logged in 3+ days",        html: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M236.8,188.09,149.35,36.22a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z"/></svg>' },
                  { key: "newClient",        label: "New Client Signup",     desc: "When someone joins with your coach code",       html: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M256,136a8,8,0,0,1-8,8H232v16a8,8,0,0,1-16,0V144H200a8,8,0,0,1,0-16h16V112a8,8,0,0,1,16,0v16h16A8,8,0,0,1,256,136Zm-57.87,58.85a8,8,0,0,1-12.26,10.3C165.78,181.19,147.55,172,128,172s-37.78,9.19-57.87,33.15a8,8,0,0,1-12.26-10.3c14.94-17.78,33-28.47,52.28-33.2a72,72,0,1,1,75.7,0C205.1,166.38,223.19,177.07,238.13,194.85ZM128,164a56,56,0,1,0-56-56A56.06,56.06,0,0,0,128,164Z"/></svg>' },
                  { key: "weeklySummary",    label: "Weekly Summary",        desc: "Monday recap of all client activity",           html: ICON_CHART },
                ] : [
                  { key: "activityComplete", label: "Activity Encouragement", desc: "A motivating message after each logged activity", html: ICON_FIRE },
                  { key: "message",          label: "New Messages",           desc: "When " + COACH_FIRST + " sends you a message",    html: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H40A16,16,0,0,0,24,64V224a8,8,0,0,0,13,6.22L72,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48Zm0,144H69.47a8,8,0,0,0-5.19,1.91L40,212.12V64H216Z"/></svg>' },
                  { key: "program",          label: "Program Updates",        desc: "When your training program is updated",           html: ICON_SNEAKER },
                  { key: "checkin",          label: "Check-in Reminders",     desc: "When your coach requests a weekly check-in",      html: ICON_PENCIL },
                  { key: "goalMilestone",    label: "Goal Milestones",        desc: "When you hit a goal or personal best",            html: ICON_STAR },
                  { key: "streak",           label: "Streak Milestones",      desc: "When you hit a 7, 14 or 30-day streak",           html: ICON_LIGHTNING },
                  { key: "streakRisk",       label: "Streak Risk Alert",      desc: "Reminder if you haven't logged by 6pm",           html: ICON_MOON },
                ]),
              ].map(function(item) {
                var on = notifSettings[item.key];
                return (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid "+SURFACE2 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: SURFACE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: item.html }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: on ? TEXT : TEXT3, fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                      <div style={{ color: TEXT3, fontSize: 11, marginTop: 2 }}>{item.desc}</div>
                    </div>
                    <div onClick={function() { toggleNotif(item.key); }} style={{ width: 44, height: 26, borderRadius: 13, background: on ? ORANGE : SURFACE2, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                      <div style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationBell({ notifications, onOpen, onClear }) {
  const unread = (notifications || []).filter(function(n) { return !n.read; }).length;
  const [open, setOpen] = useState(false);
  const recent = (notifications || []).slice(0, 3);

  const typeColors = { streak: "#1B8C4E", message: "#1B8C4E", program: "#3B7DD8", checkin: "#9B6FD4" };
  const typeIcons  = { streak: ICON_LIGHTNING, message: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H40A16,16,0,0,0,24,64V224a8,8,0,0,0,13,6.22L72,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48Zm0,144H69.47a8,8,0,0,0-5.19,1.91L40,212.12V64H216Z"/></svg>', program: ICON_SNEAKER, checkin: ICON_PENCIL };

  return (
    <div style={{ position: "relative" }}>
      <button onClick={function() { setOpen(!open); }} style={{ width: 36, height: 36, borderRadius: 10, background: unread > 0 ? ORANGE_BG : SURFACE, border: "1.5px solid "+(unread > 0 ? ORANGE : BORDER), display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={unread > 0 ? ORANGE : TEXT2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: 99, background: "#E05252", color: "#fff", fontSize: 9, fontWeight: 800, lineHeight: "16px", textAlign: "center" }}>{unread}</span>
        )}
      </button>

      {open && <div style={{ position: "fixed", inset: 0, zIndex: 998 }} onClick={function() { setOpen(false); }} />}

      {open && (
        <div style={{ position: "absolute", top: 44, right: 0, width: 300, background: CARD, border: "1.5px solid "+BORDER, borderRadius: 18, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 999, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px 10px", borderBottom: "1px solid "+SURFACE2 }}>
            <div style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>Notifications</div>
            {unread > 0 && (
              <button onClick={function() { (notifications || []).forEach(function(n) { if (!n.read) onClear(n.id); }); }} style={{ background: "none", border: "none", color: ORANGE, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Mark all read</button>
            )}
          </div>
          {recent.length === 0 && (
            <div style={{ padding: "20px", textAlign: "center", color: TEXT3, fontSize: 13 }}>No notifications</div>
          )}
          {recent.map(function(n) {
            return (
              <div key={n.id} onClick={function() {
                onClear(n.id);
                setOpen(false);
                if (n.type === "message" || n.type === "checkin") { onOpen("clients", n); }
                else if (n.type === "program") { onOpen("clients", n); }
                else if (n.type === "streak") { onOpen("analytics", n); }
                else { onOpen("notifications", n); }
              }} style={{ display: "flex", gap: 10, padding: "12px 16px", background: n.read ? "none" : ORANGE_BG, borderBottom: "1px solid "+SURFACE2, cursor: "pointer" }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: (typeColors[n.type] || ORANGE)+"18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }} dangerouslySetInnerHTML={{ __html: typeIcons[n.type] || "&#x1F514;" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: TEXT, fontSize: 12, fontWeight: n.read ? 500 : 700, lineHeight: 1.3 }}>{n.title}</div>
                  <div style={{ color: TEXT3, fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</div>
                  <div style={{ color: TEXT3, fontSize: 10, marginTop: 3 }}>{n.time}</div>
                </div>
                {!n.read && <div style={{ width: 7, height: 7, borderRadius: 99, background: ORANGE, flexShrink: 0, marginTop: 4 }} />}
              </div>
            );
          })}
          <button onClick={function() { setOpen(false); onOpen("notifications"); }} style={{ width: "100%", padding: "12px", background: "none", border: "none", color: ORANGE, fontSize: 13, fontWeight: 600, cursor: "pointer", borderTop: "1px solid "+SURFACE2 }}>
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationsScreen({ notifications, onRead, onClearAll, isCoach, goTo, onNavigateToClient }) {
  const typeColors = { streak: "#1B8C4E", message: "#1B8C4E", program: "#3B7DD8", checkin: "#9B6FD4" };
  const typeIcons  = { streak: ICON_LIGHTNING, message: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M216,48H40A16,16,0,0,0,24,64V224a8,8,0,0,0,13,6.22L72,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48Zm0,144H69.47a8,8,0,0,0-5.19,1.91L40,212.12V64H216Z"/></svg>', program: ICON_SNEAKER, checkin: ICON_PENCIL };
  const typeLabels = { streak: "Streak", message: "Message", program: "Program", checkin: "Check-in" };
  const unread = notifications.filter(function(n) { return !n.read; }).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ color: TEXT, fontSize: 22, fontWeight: 800 }}>Notifications</div>
          {unread > 0 && <div style={{ color: TEXT3, fontSize: 13, marginTop: 2 }}>{unread} unread</div>}
        </div>
        {unread > 0 && (
          <button onClick={onClearAll} style={{ background: ORANGE_BG, border: "1.5px solid "+ORANGE+"44", borderRadius: 10, padding: "8px 14px", color: ORANGE, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", background: SURFACE, borderRadius: 20 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={TEXT3} strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 12 }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <div style={{ color: TEXT2, fontSize: 15, fontWeight: 600 }}>All caught up!</div>
          <div style={{ color: TEXT3, fontSize: 13, marginTop: 4 }}>No notifications right now</div>
        </div>
      )}

      {notifications.map(function(n) {
        var tc = typeColors[n.type] || ORANGE;
        return (
          <div key={n.id} onClick={function() {
              onRead(n.id);
              if ((n.type === "message" || n.type === "checkin") && n.clientId && onNavigateToClient) {
                onNavigateToClient(n.clientId, n.type === "checkin" ? "Progress" : "Messages");
              }
            }} style={{ display: "flex", gap: 14, padding: "16px", background: n.read ? CARD : ORANGE_BG, border: "1.5px solid "+(n.read ? BORDER : ORANGE+"44"), borderRadius: 16, marginBottom: 10, cursor: "pointer" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: tc+"18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }} dangerouslySetInnerHTML={{ __html: typeIcons[n.type] || "&#x1F514;" }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                <div style={{ color: TEXT, fontSize: 14, fontWeight: n.read ? 600 : 800, lineHeight: 1.3 }}>{n.title}</div>
                {!n.read && <div style={{ width: 8, height: 8, borderRadius: 99, background: ORANGE, flexShrink: 0, marginTop: 4 }} />}
              </div>
              <div style={{ color: TEXT2, fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>{n.body}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: tc+"15", color: tc, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>{typeLabels[n.type] || "Alert"}</span>
                <span style={{ color: TEXT3, fontSize: 11 }}>{n.time}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ── RACE TAB ──
const ACTIVITY_PRESETS = [
  { label: "Easy Run",         color: BLUE,      emoji: ICON_RUN },
  { label: "Long Run",         color: GREEN,     emoji: ICON_RUN },
  { label: "Tempo Run",        color: ORANGE,    emoji: ICON_LIGHTNING },
  { label: "Strength Training",color: GREEN,     emoji: ICON_WORKOUT },
  { label: "HIIT",             color: ORANGE,    emoji: ICON_LIGHTNING },
  { label: "Bike Ride",        color: "#D97706", emoji: ICON_BIKE },
  { label: "Swim",             color: "#0E7490", emoji: ICON_SWIM },
  { label: "Yoga",             color: PURPLE,    emoji: ICON_BODY },
  { label: "Rest Day",         color: TEXT3,     emoji: ICON_MOON },
  { label: "Custom",           color: TEXT2,     emoji: ICON_PENCIL },
];

function colorForActivity(label) {
  var preset = ACTIVITY_PRESETS.find(function(p) { return p.label.toLowerCase() === (label || "").toLowerCase(); });
  return preset ? preset.color : GREEN;
}

function emojiForActivity(label) {
  var preset = ACTIVITY_PRESETS.find(function(p) { return p.label.toLowerCase() === (label || "").toLowerCase(); });
  return preset ? preset.emoji : "&#x1F3CB;";
}

function useCountdown(targetDate) {
  var [diff, setDiff] = useState({ days: 0, hours: 0, mins: 0 });
  useEffect(function() {
    function update() {
      var d = targetDate - new Date();
      if (d <= 0) { setDiff({ days: 0, hours: 0, mins: 0 }); return; }
      setDiff({ days: Math.floor(d/86400000), hours: Math.floor((d%86400000)/3600000), mins: Math.floor((d%3600000)/60000) });
    }
    update();
    var t = setInterval(update, 60000);
    return function() { clearInterval(t); };
  }, [targetDate]);
  return diff;
}

function getMondayOf(date) {
  var d = new Date(date);
  var day = d.getDay();
  var diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

function addDays(date, n) {
  var d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtShortDate(date) {
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[date.getMonth()] + " " + date.getDate();
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function weekKey(monday) {
  return monday.getFullYear() + "-" + monday.getMonth() + "-" + monday.getDate();
}

var COACH_PROGRAM = [
  { week: 1, days: [
    { focus: "Push",      day: "Mon", exercises: ["Bench Press 4x6","Incline DB Press 3x10","Overhead Press 3x10","Dips 3x12"] },
    { focus: "Pull",      day: "Wed", exercises: ["Deadlift 4x5","Barbell Row 3x8","Pull-Ups 3x10","Face Pulls 3x15"] },
    { focus: "Legs",      day: "Fri", exercises: ["Squat 4x6","Romanian DL 3x10","Leg Press 3x12","Calf Raises 4x15"] },
  ]},
  { week: 2, days: [
    { focus: "Push+",     day: "Mon", exercises: ["Bench Press 4x8","Dips 3x12","Lateral Raises 4x15","Hammer Curls 3x12"] },
    { focus: "Pull+",     day: "Wed", exercises: ["Deadlift 4x5","Barbell Row 3x10","Lat Pulldown 3x12","Face Pulls 3x15"] },
    { focus: "Legs+",     day: "Fri", exercises: ["Front Squat 4x6","Leg Curl 3x12","Walking Lunges 3x16","Hip Thrust 3x12"] },
  ]},
  { week: 3, days: [
    { focus: "Peak Push", day: "Mon", exercises: ["Bench Press 5x5","Incline DB Press 4x8","Overhead Press 3x10","Dips 3x8"] },
    { focus: "Peak Pull", day: "Wed", exercises: ["Deadlift 5x3","Barbell Row 4x6","Pull-Ups 3x8","Face Pulls 3x15"] },
    { focus: "Peak Legs", day: "Fri", exercises: ["Squat 5x5","Romanian DL 3x8","Leg Press 3x10","Nordic Curl 3x8"] },
  ]},
];

var LIBRARY_WORKOUTS = [
  { id: "l1", name: "Full Body Blast",  exercises: ["Squat 3x10","Bench Press 3x10","Barbell Row 3x10","Overhead Press 3x10"] },
  { id: "l2", name: "Core and Cardio",  exercises: ["Plank 3x60s","Mountain Climbers 3x30","Bicycle Crunches 3x20","Jump Rope 5 min"] },
  { id: "l3", name: "Upper Body Pump",  exercises: ["Pull-Ups 4x8","Dips 4x10","Hammer Curls 3x12","Face Pulls 3x15"] },
  { id: "l4", name: "Leg Burner",       exercises: ["Squat 4x8","Romanian DL 3x10","Walking Lunges 3x16","Calf Raises 4x20"] },
  { id: "l5", name: "Active Recovery",  exercises: ["Foam Roll 10 min","Hip Flexor Stretch","Hamstring Stretch","Shoulder Mobility"] },
];

function DayModal({ date, activities, onSave, onClose }) {
  var DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  var dayName = DAY_NAMES[date.getDay()];
  var dateStr = fmtShortDate(date);

  var [list,     setList]     = useState(activities ? activities.slice() : []);
  var [adding,   setAdding]   = useState(!activities || activities.length === 0);
  var [editIdx,  setEditIdx]  = useState(null);
  var [addTab,   setAddTab]   = useState("quick");
  var [coachWk,  setCoachWk]  = useState(0);
  var [label,    setLabel]    = useState("");
  var [notes,    setNotes]    = useState("");
  var [miles,    setMiles]    = useState("");
  var [duration, setDuration] = useState("");
  var [custom,   setCustom]   = useState(false);

  function openAdd() {
    setLabel(""); setNotes(""); setMiles(""); setDuration(""); setCustom(false);
    setEditIdx(null); setAddTab("quick"); setAdding(true);
  }

  function openEdit(idx) {
    var a = list[idx];
    setLabel(a.label || ""); setNotes(a.notes || ""); setMiles(a.miles || ""); setDuration(a.duration || "");
    setCustom(!ACTIVITY_PRESETS.find(function(p) { return p.label === a.label; }));
    setEditIdx(idx); setAddTab("quick"); setAdding(true);
  }

  function saveActivity() {
    if (!label.trim()) return;
    var entry = { id: Date.now(), label: label.trim(), notes: notes.trim(), miles: miles, duration: duration };
    if (editIdx !== null) {
      setList(list.map(function(a, i) { return i === editIdx ? Object.assign({}, a, entry) : a; }));
    } else {
      setList(list.concat([entry]));
    }
    setAdding(false); setEditIdx(null);
  }

  function addWorkoutSession(session) {
    var entry = { id: Date.now(), label: session.focus || session.name, notes: (session.exercises || []).join(", "), miles: "", duration: "" };
    setList(list.concat([entry]));
    setAdding(false);
  }

  function removeActivity(idx) {
    setList(list.filter(function(_, i) { return i !== idx; }));
  }

  function handleSave() { onSave(list); onClose(); }

  var inputS = { width: "100%", background: GRAY, border: "1.5px solid "+BORDER, borderRadius: 10, padding: "11px 14px", color: TEXT, fontSize: 14, fontWeight: 600, outline: "none", boxSizing: "border-box" };
  var ADD_TABS = [{ key: "quick", label: "Quick Add" }, { key: "coach", label: "Coach Plan" }, { key: "library", label: "Library" }];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,26,15,0.45)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300 }} onClick={onClose}>
      <div style={{ background: WHITE, borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 430, maxHeight: "92vh", overflowY: "auto", paddingBottom: 36 }} onClick={function(e) { e.stopPropagation(); }}>
        <div style={{ width: 36, height: 4, background: BORDER, borderRadius: 99, margin: "12px auto 0" }} />
        <div style={{ padding: "16px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: TEXT3, fontSize: 12, fontWeight: 600 }}>{dateStr}</div>
            <div style={{ color: TEXT, fontSize: 22, fontWeight: 900 }}>{dayName}</div>
          </div>
          <button onClick={onClose} style={{ background: GRAY, border: "none", color: TEXT2, width: 34, height: 34, borderRadius: 99, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
        </div>

        <div style={{ padding: "0 20px" }}>
          {list.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {list.map(function(a, i) {
                var color = colorForActivity(a.label);
                var emoji = emojiForActivity(a.label);
                return (
                  <div key={a.id || i} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: color+"10", border: "1.5px solid "+color+"40", borderRadius: 14, padding: "12px 14px", marginBottom: 8 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: emoji }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>{a.label}</div>
                      {(a.miles || a.duration) && <div style={{ color: TEXT2, fontSize: 12, marginTop: 2 }}>{a.miles ? a.miles+" mi" : ""}{a.miles && a.duration ? " · " : ""}{a.duration}</div>}
                      {a.notes && <div style={{ color: TEXT3, fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>{a.notes}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={function() { openEdit(i); }} style={{ background: "rgba(255,255,255,0.7)", border: "1.5px solid "+BORDER, borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: TEXT2, fontSize: 11, fontWeight: 600 }}>Edit</button>
                      <button onClick={function() { removeActivity(i); }} style={{ background: "none", border: "none", color: RED, fontSize: 16, cursor: "pointer", padding: "4px 6px" }}>x</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {adding ? (
            <div style={{ background: GRAY, borderRadius: 16, padding: 16, marginBottom: 14, border: "1.5px solid "+BORDER }}>
              <div style={{ display: "flex", background: WHITE, borderRadius: 10, padding: 3, gap: 3, marginBottom: 16 }}>
                {ADD_TABS.map(function(t) {
                  var active = addTab === t.key;
                  return (
                    <button key={t.key} onClick={function() { setAddTab(t.key); }} style={{ flex: 1, padding: "9px 4px", borderRadius: 8, border: "none", background: active ? GREEN : "transparent", color: active ? WHITE : TEXT3, fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer" }}>
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {addTab === "quick" && (
                <div>
                  {!custom ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                      {ACTIVITY_PRESETS.map(function(p) {
                        var active = label === p.label;
                        return (
                          <button key={p.label} onClick={function() {
                            if (p.label === "Custom") { setCustom(true); setLabel(""); }
                            else setLabel(p.label);
                          }} style={{ padding: "6px 12px", borderRadius: 99, background: active ? p.color : WHITE, border: "1.5px solid "+(active ? p.color : BORDER), color: active ? WHITE : TEXT2, fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                            <span dangerouslySetInnerHTML={{ __html: p.emoji }} />
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ marginBottom: 12 }}>
                      <input value={label} onChange={function(e) { setLabel(e.target.value); }} placeholder="e.g. Morning Swim..." style={inputS} />
                      <button onClick={function() { setCustom(false); setLabel(""); }} style={{ background: "none", border: "none", color: TEXT3, fontSize: 12, cursor: "pointer", marginTop: 4 }}>Back to presets</button>
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div>
                      <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>DISTANCE (opt)</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="number" value={miles} onChange={function(e) { setMiles(e.target.value); }} placeholder="0.0" style={Object.assign({}, inputS, { textAlign: "center" })} />
                        <span style={{ color: TEXT3, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>mi</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>DURATION (opt)</div>
                      <input value={duration} onChange={function(e) { setDuration(e.target.value); }} placeholder="e.g. 45 min" style={inputS} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>NOTES (opt)</div>
                    <textarea value={notes} onChange={function(e) { setNotes(e.target.value); }} placeholder="e.g. Keep it easy, zone 2..." style={{ width: "100%", background: WHITE, border: "1.5px solid "+BORDER, borderRadius: 10, padding: "11px 14px", color: TEXT, fontSize: 13, lineHeight: 1.5, resize: "none", height: 68, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={saveActivity} style={{ flex: 1, padding: 12, borderRadius: 12, background: label.trim() ? GREEN : GRAY, border: "none", color: label.trim() ? WHITE : TEXT3, fontSize: 13, fontWeight: 700, cursor: label.trim() ? "pointer" : "default" }}>
                      {editIdx !== null ? "Save Changes" : "Add to Day"}
                    </button>
                    <button onClick={function() { setAdding(false); setEditIdx(null); }} style={{ padding: "12px 16px", borderRadius: 12, background: "none", border: "1.5px solid "+BORDER, color: TEXT2, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              )}

              {addTab === "coach" && (
                <div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                    {COACH_PROGRAM.map(function(w, i) {
                      return (
                        <button key={"coachwk-"+i} onClick={function() { setCoachWk(i); }} style={{ flex: 1, padding: "8px 0", borderRadius: 10, background: coachWk === i ? GREEN : WHITE, border: "1.5px solid "+(coachWk === i ? GREEN : BORDER), color: coachWk === i ? WHITE : TEXT2, fontSize: 12, fontWeight: coachWk === i ? 700 : 500, cursor: "pointer" }}>Week {w.week}</button>
                      );
                    })}
                  </div>
                  {COACH_PROGRAM[coachWk].days.map(function(day, i) {
                    return (
                      <div key={"plan-sess-"+i} style={{ background: WHITE, borderRadius: 14, padding: "12px 14px", marginBottom: 8, border: "1.5px solid "+BORDER }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <div>
                            <div style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>{(day.focus||"").toUpperCase()}</div>
                            <div style={{ color: TEXT3, fontSize: 11, marginTop: 1 }}>{day.day} &bull; {day.exercises.length} exercises</div>
                          </div>
                          <button onClick={function() { addWorkoutSession(day); }} style={{ background: GREEN, border: "none", borderRadius: 10, padding: "7px 14px", color: WHITE, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Add</button>
                        </div>
                        {day.exercises.slice(0,3).map(function(ex, j) { return <div key={j} style={{ color: TEXT3, fontSize: 11 }}>&bull; {ex}</div>; })}
                        {day.exercises.length > 3 && <div style={{ color: TEXT3, fontSize: 11 }}>+{day.exercises.length - 3} more</div>}
                      </div>
                    );
                  })}
                  <button onClick={function() { setAdding(false); }} style={{ width: "100%", padding: 11, borderRadius: 12, background: "none", border: "1.5px solid "+BORDER, color: TEXT2, fontSize: 13, cursor: "pointer", marginTop: 4 }}>Cancel</button>
                </div>
              )}

              {addTab === "library" && (
                <div>
                  <div style={{ color: TEXT2, fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>WORKOUT LIBRARY</div>
                  {LIBRARY_WORKOUTS.map(function(w) {
                    return (
                      <div key={w.id} style={{ background: WHITE, borderRadius: 14, padding: "12px 14px", marginBottom: 8, border: "1.5px solid "+BORDER }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ color: TEXT, fontSize: 14, fontWeight: 800 }}>{w.name}</div>
                          <button onClick={function() { addWorkoutSession(w); }} style={{ background: GREEN, border: "none", borderRadius: 10, padding: "7px 14px", color: WHITE, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Add</button>
                        </div>
                        {w.exercises.slice(0,3).map(function(ex, j) { return <div key={j} style={{ color: TEXT3, fontSize: 11 }}>&bull; {ex}</div>; })}
                        {w.exercises.length > 3 && <div style={{ color: TEXT3, fontSize: 11 }}>+{w.exercises.length - 3} more</div>}
                      </div>
                    );
                  })}
                  <button onClick={function() { setAdding(false); }} style={{ width: "100%", padding: 11, borderRadius: 12, background: "none", border: "1.5px solid "+BORDER, color: TEXT2, fontSize: 13, cursor: "pointer", marginTop: 4 }}>Cancel</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={openAdd} style={{ width: "100%", padding: 13, borderRadius: 14, background: GRAY, border: "1.5px dashed "+BORDER, color: TEXT2, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ color: GREEN, fontSize: 20 }}>+</span> Add Activity
            </button>
          )}

          {!adding && (
            <button onClick={handleSave} style={{ width: "100%", padding: 15, borderRadius: 14, background: GREEN, border: "none", color: WHITE, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              {list.length === 0 ? "Set as Rest Day" : "Save Day"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DayPickerModal({ workout, weekDates, onPick, onClose }) {
  var DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  var today = new Date();
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,26,15,0.45)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 400 }} onClick={onClose}>
      <div style={{ background: WHITE, borderRadius: "22px 22px 0 0", width: "100%", maxWidth: 430, paddingBottom: 36 }} onClick={function(e) { e.stopPropagation(); }}>
        <div style={{ width: 36, height: 4, background: BORDER, borderRadius: 99, margin: "12px auto 0" }} />
        <div style={{ padding: "16px 20px 8px" }}>
          <div style={{ color: TEXT3, fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Add to plan</div>
          <div style={{ color: TEXT, fontSize: 20, fontWeight: 900, marginBottom: 4 }}>{(workout.name||"").toUpperCase()}</div>
          <div style={{ color: TEXT3, fontSize: 12, marginBottom: 20 }}>Choose which day to add this workout to</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {weekDates.map(function(date, i) {
              var isPast = date < today && !isSameDay(date, today);
              return (
                <button key={"daypick-"+i} onClick={function() { onPick(i); }} disabled={isPast}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 14, background: isPast ? GRAY : WHITE, border: "1.5px solid "+(isSameDay(date, today) ? GREEN : BORDER), cursor: isPast ? "default" : "pointer", opacity: isPast ? 0.4 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: isSameDay(date, today) ? GREEN+"18" : GRAY, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ color: isSameDay(date, today) ? GREEN : TEXT3, fontSize: 10, fontWeight: 700 }}>{DAYS[i]}</div>
                      <div style={{ color: isSameDay(date, today) ? GREEN : TEXT, fontSize: 16, fontWeight: 900, lineHeight: 1 }}>{date.getDate()}</div>
                    </div>
                    <div style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>{fmtShortDate(date)}{isSameDay(date, today) ? " \u2022 Today" : ""}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT3} strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkoutsSection({ weekDates, onAddToDay }) {
  var [workouts] = useState([
    { id: 1, name: "Easy 6 Miler",   type: "Easy",    miles: 6,  pace: "9:30/mi",  done: true,  date: "Mon", notes: "Felt good, stayed in zone 2" },
    { id: 2, name: "Tempo 8 Miles",  type: "Workout", miles: 8,  pace: "8:10/mi",  done: true,  date: "Wed", notes: "4mi warmup, 4mi at tempo" },
    { id: 3, name: "Recovery Run",   type: "Easy",    miles: 5,  pace: "9:45/mi",  done: true,  date: "Thu", notes: "" },
    { id: 4, name: "Long Run 16mi",  type: "Long",    miles: 16, pace: "9:00/mi",  done: false, date: "Sat", notes: "Goal: negative split" },
    { id: 5, name: "Easy Recovery",  type: "Easy",    miles: 5,  pace: "10:00/mi", done: false, date: "Sun", notes: "" },
  ]);
  var [expandedId,  setExpandedId]  = useState(null);
  var [pickWorkout, setPickWorkout] = useState(null);
  var [addedIds,    setAddedIds]    = useState([]);

  var TYPE_COLORS = { Easy: BLUE, Long: GREEN, Workout: ORANGE, Rest: TEXT3 };
  var done      = workouts.filter(function(w) { return w.done; });
  var upcoming  = workouts.filter(function(w) { return !w.done; });
  var totalDone = done.reduce(function(s, w) { return s + w.miles; }, 0);
  var totalPlan = workouts.reduce(function(s, w) { return s + w.miles; }, 0);

  function handlePick(dayIndex) {
    if (!pickWorkout) return;
    onAddToDay(dayIndex, pickWorkout);
    setAddedIds(function(prev) { return prev.concat([pickWorkout.id]); });
    setPickWorkout(null);
  }

  return (
    <div style={{ background: GRAY, minHeight: "100vh" }}>
      <div style={{ padding: "20px 16px" }}>

        <div style={{ background: WHITE, borderRadius: 18, padding: 18, marginBottom: 20, border: "1.5px solid "+BORDER, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ color: TEXT3, fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>THIS WEEK</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
            <div>
              <div style={{ color: TEXT, fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: -1 }}>
                {totalDone}<span style={{ fontSize: 16, color: TEXT3, fontWeight: 500 }}>/{totalPlan} mi</span>
              </div>
              <div style={{ color: TEXT3, fontSize: 12, marginTop: 4 }}>{done.length} of {workouts.length} workouts done</div>
            </div>
            <div style={{ color: GREEN, fontSize: 22, fontWeight: 900 }}>{Math.round(totalDone / totalPlan * 100)}%</div>
          </div>
          <div style={{ background: BORDER, borderRadius: 99, height: 6, overflow: "hidden" }}>
            <div style={{ width: Math.round(totalDone/totalPlan*100)+"%", height: "100%", background: GREEN, borderRadius: 99 }} />
          </div>
        </div>

        {done.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: TEXT3, fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>COMPLETED</div>
            {done.map(function(w) {
              var tc = TYPE_COLORS[w.type] || TEXT3;
              var isOpen = expandedId === w.id;
              var added  = addedIds.indexOf(w.id) !== -1;
              return (
                <div key={w.id} style={{ background: WHITE, border: "1.5px solid "+(isOpen ? tc : BORDER), borderRadius: 16, marginBottom: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }} onClick={function() { setExpandedId(isOpen ? null : w.id); }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: tc+"18", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <div style={{ color: tc, fontSize: 15, fontWeight: 900, lineHeight: 1 }}>{w.miles}</div>
                      <div style={{ color: tc+"90", fontSize: 8, fontWeight: 700, marginTop: 1 }}>MI</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>{w.name}</div>
                        <div style={{ width: 18, height: 18, borderRadius: 99, background: GREEN+"18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      </div>
                      <div style={{ color: TEXT3, fontSize: 12, marginTop: 2 }}>{w.date} &bull; {w.pace}</div>
                    </div>
                    <div style={{ background: tc+"15", borderRadius: 8, padding: "3px 9px", flexShrink: 0 }}>
                      <span style={{ color: tc, fontSize: 11, fontWeight: 700 }}>{w.type}</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: "1px solid "+BORDER, padding: "14px 16px" }}>
                      {w.notes ? <div style={{ color: TEXT2, fontSize: 13, lineHeight: 1.5, marginBottom: 12, background: GRAY, borderRadius: 10, padding: "10px 12px" }}>{w.notes}</div> : null}
                      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                        {[["Miles", String(w.miles), tc], ["Pace", w.pace, TEXT], ["Type", w.type, tc]].map(function(s) {
                          return (
                            <div key={s[0]} style={{ flex: 1, background: GRAY, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                              <div style={{ color: s[2], fontSize: 15, fontWeight: 800 }}>{s[1]}</div>
                              <div style={{ color: TEXT3, fontSize: 10, marginTop: 2 }}>{s[0]}</div>
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={function() { setPickWorkout(w); }} style={{ width: "100%", padding: "12px", borderRadius: 12, background: added ? GREEN+"15" : GREEN, border: added ? "1.5px solid "+GREEN : "none", color: added ? GREEN : WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        {added ? "Added to Plan" : "+ Add to My Plan"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {upcoming.length > 0 && (
          <div>
            <div style={{ color: TEXT3, fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>UPCOMING</div>
            {upcoming.map(function(w) {
              var tc = TYPE_COLORS[w.type] || TEXT3;
              var isOpen = expandedId === w.id;
              var added  = addedIds.indexOf(w.id) !== -1;
              return (
                <div key={w.id} style={{ background: WHITE, border: "1.5px solid "+(isOpen ? tc : BORDER), borderRadius: 16, marginBottom: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }} onClick={function() { setExpandedId(isOpen ? null : w.id); }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: tc+"18", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <div style={{ color: tc, fontSize: 15, fontWeight: 900, lineHeight: 1 }}>{w.miles}</div>
                      <div style={{ color: tc+"90", fontSize: 8, fontWeight: 700, marginTop: 1 }}>MI</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: TEXT, fontSize: 14, fontWeight: 700 }}>{w.name}</div>
                      <div style={{ color: TEXT3, fontSize: 12, marginTop: 2 }}>{w.date} &bull; {w.pace}</div>
                    </div>
                    <div style={{ background: tc+"15", borderRadius: 8, padding: "3px 9px", flexShrink: 0 }}>
                      <span style={{ color: tc, fontSize: 11, fontWeight: 700 }}>{w.type}</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: "1px solid "+BORDER, padding: "14px 16px" }}>
                      {w.notes ? <div style={{ color: TEXT2, fontSize: 13, lineHeight: 1.5, marginBottom: 12, background: GRAY, borderRadius: 10, padding: "10px 12px" }}>{w.notes}</div> : null}
                      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                        {[["Miles", String(w.miles), tc], ["Pace", w.pace, TEXT], ["Type", w.type, tc]].map(function(s) {
                          return (
                            <div key={s[0]} style={{ flex: 1, background: GRAY, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                              <div style={{ color: s[2], fontSize: 15, fontWeight: 800 }}>{s[1]}</div>
                              <div style={{ color: TEXT3, fontSize: 10, marginTop: 2 }}>{s[0]}</div>
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={function() { setPickWorkout(w); }} style={{ width: "100%", padding: "12px", borderRadius: 12, background: added ? GREEN+"15" : GREEN, border: added ? "1.5px solid "+GREEN : "none", color: added ? GREEN : WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        {added ? "Added to Plan" : "+ Add to My Plan"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pickWorkout ? (
        <DayPickerModal workout={pickWorkout} weekDates={weekDates} onPick={handlePick} onClose={function() { setPickWorkout(null); }} />
      ) : null}
    </div>
  );
}

function RaceScreen({ activityLogs, raceCollapsed, setRaceCollapsed, plans, setPlans }) {
  var [activeTab,    setActiveTab]    = useState("plan");
  var [raceDateStr,  setRaceDateStr]  = useState("2026-10-11");
  var [raceName,     setRaceName]     = useState("Chicago Marathon");
  var [goalTime,     setGoalTime]     = useState("3:45:00");  var [raceDistKey,  setRaceDistKey]  = useState("full");
  var [paceInput,    setPaceInput]    = useState("3:45:00");
  var [showSetup,    setShowSetup]    = useState(false);
  var [weekOffset,   setWeekOffset]   = useState(0);
  // plans state is lifted to MainApp so HomeScreen can read it
  var safePlans = plans || {};
  var [modalDay,     setModalDay]     = useState(null);

  var today      = new Date();
  var thisMonday = getMondayOf(today);
  var viewMonday = addDays(thisMonday, weekOffset * 7);
  var DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  var weekDates = DAYS.map(function(_, i) { return addDays(viewMonday, i); });

  function planKey(dayIndex) { return weekKey(viewMonday) + "-" + dayIndex; }
  function activitiesForDay(dayIndex) { return safePlans[planKey(dayIndex)] || []; }

  function saveDayActivities(dayIndex, list) {
    var key = planKey(dayIndex);
    if (setPlans) {
      setPlans(function(prev) {
        var next = Object.assign({}, prev);
        if (list.length === 0) { delete next[key]; } else { next[key] = list; }
        return next;
      });
    }
  }

  function addWorkoutToDay(dayIndex, workout) {
    var key   = planKey(dayIndex);
    var entry = { id: Date.now(), label: workout.type || workout.name, notes: workout.notes || "", miles: String(workout.miles || ""), duration: "" };
    if (setPlans) {
      setPlans(function(prev) {
        var existing = prev[key] || [];
        return Object.assign({}, prev, { [key]: existing.concat([entry]) });
      });
    }
  }

  var raceDate  = new Date(raceDateStr);
  var countdown = useCountdown(raceDate);
  var RACE_MILES = { "5k": 3.1069, "10k": 6.2137, "half": 13.1094, "full": 26.2188, "ultra": 31.0686 };

  function calcSplits(t) {
    var p = t.split(":").map(Number);
    if (p.length < 2 || p.some(isNaN)) return null;
    var s = p.length === 3 ? p[0]*3600+p[1]*60+p[2] : p[0]*60+p[1];
    var miles = RACE_MILES[raceDistKey] || 26.2188;
    var ppm = s / miles;
    var pm = Math.floor(ppm/60); var ps = Math.round(ppm%60);
    function split(d) {
      var ts = ppm*d; var h=Math.floor(ts/3600); var m=Math.floor((ts%3600)/60); var sc=Math.round(ts%60);
      return h>0 ? h+"h "+m+"m" : m+":"+(sc<10?"0":"")+sc;
    }
    return { pace: pm+":"+(ps<10?"0":"")+ps, split10k: split(6.2138), splitHalf: split(13.1094), splitFull: split(26.2188) };
  }

  var splits = calcSplits(paceInput);
  var isCurrentWeek = weekOffset === 0;
  var weekLabel = isCurrentWeek ? "This Week" : weekOffset === 1 ? "Next Week" : weekOffset === -1 ? "Last Week" : fmtShortDate(viewMonday)+" - "+fmtShortDate(addDays(viewMonday,6));
  var RUN_LABELS = ["Easy Run","Long Run","Tempo Run"];
  var WORKOUT_LABELS = ["Push Day","Pull Day","Leg Day","Upper Body","Full Body","Cross Train"];
  function isRun(label) { return RUN_LABELS.indexOf(label) !== -1; }
  function isWorkout(label) { return WORKOUT_LABELS.indexOf(label) !== -1; }

  var weekMiles = weekDates.reduce(function(sum, _, i) { return sum + activitiesForDay(i).reduce(function(s2, a) { return s2 + (parseFloat(a.miles)||0); }, 0); }, 0);
  var activeDays = weekDates.reduce(function(sum, _, i) { return sum + (activitiesForDay(i).length > 0 ? 1 : 0); }, 0);

  // New summary stats
  var milesPlanned = weekDates.reduce(function(sum, _, i) { return sum + activitiesForDay(i).filter(function(a){ return isRun(a.label); }).reduce(function(s2,a){ return s2+(parseFloat(a.miles)||0); },0); }, 0);
  var workoutsPlanned = weekDates.reduce(function(sum, _, i) { return sum + activitiesForDay(i).length; }, 0);
  // Pull miles ran + workouts done from activityLogs (calendar manual + device auto-sync)
  var runsMilesRan = weekDates.reduce(function(sum, date, i) {
    var d = date;
    var isPast = d <= today;
    if (!isPast) return sum;
    var monthKey2 = d.getFullYear() + "-" + d.getMonth();
    var dayKey2 = d.getDate();
    var logged = (activityLogs && activityLogs[monthKey2] && activityLogs[monthKey2][dayKey2]) || [];
    return sum + logged.filter(function(a){ return a.type === "run"; }).reduce(function(s2,a){ return s2+(parseFloat(a.miles)||0); }, 0);
  }, 0);

  var workoutsCompleted = weekDates.reduce(function(sum, date, i) {
    var d = date;
    var isPast = d <= today;
    if (!isPast) return sum;
    var monthKey2 = d.getFullYear() + "-" + d.getMonth();
    var dayKey2 = d.getDate();
    var logged = (activityLogs && activityLogs[monthKey2] && activityLogs[monthKey2][dayKey2]) || [];
    return sum + logged.length;
  }, 0);

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", background: BG, minHeight: "100vh", fontFamily: "system-ui, sans-serif", paddingBottom: 80 }}>

      {activeTab === "plan" && (
        <div>
          <div style={{ background: DKGREEN, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 80% 20%, rgba(27,140,78,0.3) 0%, transparent 60%)" }} />
            <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)" }} />
            <div style={{ position: "relative", padding: raceCollapsed ? "14px 20px" : "24px 20px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: raceCollapsed ? 0 : 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: raceCollapsed ? 2 : 4 }}>RACE DAY</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ color: WHITE, fontSize: raceCollapsed ? 15 : 22, fontWeight: 900, lineHeight: 1.1, letterSpacing: -0.5 }}>{raceName}</div>
                    {raceCollapsed && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>· {countdown.days}d {countdown.hours}h {countdown.mins}m</div>}
                  </div>
                  {!raceCollapsed && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 3 }}>{new Date(raceDateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, marginLeft: 12 }}>
                  {!raceCollapsed && (
                    <button onClick={function() { setShowSetup(!showSetup); }} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "7px 14px", color: WHITE, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {showSetup ? "Done" : "Edit Race"}
                    </button>
                  )}
                  <button onClick={function() { setRaceCollapsed(!raceCollapsed); setShowSetup(false); }} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "7px 10px", color: WHITE, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {raceCollapsed
                        ? <polyline points="6 9 12 15 18 9"/>
                        : <polyline points="18 15 12 9 6 15"/>}
                    </svg>
                  </button>
                </div>
              </div>

              {!raceCollapsed && showSetup && (
                <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 14, padding: 14, marginBottom: 14, border: "1px solid rgba(255,255,255,0.1)" }}>
                  {[
                    { label: "RACE NAME", value: raceName, set: setRaceName, placeholder: "Race name" },
                  ].map(function(f) {
                    return (
                      <div key={f.label} style={{ marginBottom: 10 }}>
                        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>{f.label}</div>
                        <input value={f.value} onChange={function(e) { f.set(e.target.value); }} placeholder={f.placeholder} style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 12px", color: WHITE, fontSize: 14, fontWeight: 600, outline: "none", boxSizing: "border-box" }} />
                      </div>
                    );
                  })}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>GOAL TIME</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {[
                        { label: "HRS", max: 23, val: parseInt(goalTime.split(":")[0]) || 0, set: function(v) { var p = goalTime.split(":"); p[0] = String(v).padStart(2,"0"); var s = p.join(":"); setGoalTime(s); setPaceInput(s); } },
                        { label: "MIN", max: 59, val: parseInt(goalTime.split(":")[1]) || 0, set: function(v) { var p = goalTime.split(":"); p[1] = String(v).padStart(2,"0"); var s = p.join(":"); setGoalTime(s); setPaceInput(s); } },
                        { label: "SEC", max: 59, val: parseInt(goalTime.split(":")[2]) || 0, set: function(v) { var p = goalTime.split(":"); p[2] = String(v).padStart(2,"0"); var s = p.join(":"); setGoalTime(s); setPaceInput(s); } },
                      ].map(function(seg, si) {
                        return (
                          <div key={seg.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>{seg.label}</div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, overflow: "hidden", width: "100%" }}>
                              <button onClick={function() { seg.set(Math.min(seg.max, seg.val + 1)); }} style={{ width: "100%", padding: "6px 0", background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>▲</button>
                              <div style={{ color: WHITE, fontSize: 22, fontWeight: 900, lineHeight: 1, padding: "4px 0", minWidth: 40, textAlign: "center" }}>{String(seg.val).padStart(2,"0")}</div>
                              <button onClick={function() { seg.set(Math.max(0, seg.val - 1)); }} style={{ width: "100%", padding: "6px 0", background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>▼</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 5 }}>RACE DATE</div>
                    <input type="date" value={raceDateStr} onChange={function(e) { setRaceDateStr(e.target.value); }} style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 12px", color: WHITE, fontSize: 14, fontWeight: 600, outline: "none", boxSizing: "border-box", colorScheme: "dark" }} />
                  </div>
                  <div>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>RACE DISTANCE</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[["5k","5K"],["10k","10K"],["half","Half"],["full","Marathon"],["ultra","50K"]].map(function(kv) {
                        var active = raceDistKey === kv[0];
                        return (
                          <button key={kv[0]} onClick={function() { setRaceDistKey(kv[0]); }} style={{ flex: 1, padding: "7px 2px", borderRadius: 8, background: active ? WHITE : "rgba(255,255,255,0.08)", border: "1px solid "+(active ? WHITE : "rgba(255,255,255,0.15)"), color: active ? DKGREEN : WHITE, fontSize: 10, fontWeight: active ? 800 : 500, cursor: "pointer" }}>{kv[1]}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {!raceCollapsed && (<div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: 2, textAlign: "center", marginBottom: 8 }}>RACE DAY COUNTDOWN</div>
                {countdown.days === 0 && countdown.hours === 0 && countdown.mins === 0
                  ? <div style={{ textAlign: "center", padding: "6px 0" }}><div style={{ color: WHITE, fontSize: 16, fontWeight: 900 }}>Race Day!</div></div>
                  : (
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      {[{ val: countdown.days, label: "DAYS" }, { val: countdown.hours, label: "HRS" }, { val: countdown.mins, label: "MIN" }].map(function(item, i) {
                        return (
                          <div key={item.label} style={{ flex: 1, textAlign: "center", position: "relative" }}>
                            {i > 0 && <div style={{ position: "absolute", left: 0, top: "40%", color: "rgba(255,255,255,0.3)", fontSize: 24, fontWeight: 200 }}>:</div>}
                            <div style={{ color: WHITE, fontSize: 38, fontWeight: 900, lineHeight: 1, letterSpacing: -2 }}>{String(item.val).padStart(2,"0")}</div>
                            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, marginTop: 2 }}>{item.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  )
                }
              </div>)}

              {!raceCollapsed && (<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 14px" }}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>GOAL TIME</div>
                  <div style={{ color: WHITE, fontSize: 18, fontWeight: 800, marginTop: 2 }}>{goalTime}</div>
                </div>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 14px" }}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>GOAL PACE</div>
                  <div style={{ color: WHITE, fontSize: 18, fontWeight: 800, marginTop: 2 }}>{splits ? splits.pace : "--"}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>/mi</span></div>
                </div>
              </div>)}
            </div>
          </div>

          <div style={{ background: GRAY, padding: "16px 16px 24px", minHeight: 400 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <button onClick={function() { setWeekOffset(weekOffset-1); }} style={{ width: 34, height: 34, borderRadius: 99, background: WHITE, border: "1.5px solid "+BORDER, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT2} strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div style={{ textAlign: "center" }}>
                <div style={{ color: TEXT, fontSize: 15, fontWeight: 800 }}>{weekLabel}</div>
                <div style={{ color: TEXT3, fontSize: 11, marginTop: 2 }}>{fmtShortDate(viewMonday)} - {fmtShortDate(addDays(viewMonday,6))}{weekMiles > 0 ? " \u2022 "+weekMiles.toFixed(1)+" mi planned" : ""}</div>
              </div>
              <button onClick={function() { setWeekOffset(weekOffset+1); }} style={{ width: 34, height: 34, borderRadius: 99, background: WHITE, border: "1.5px solid "+BORDER, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT2} strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            <div style={{ background: WHITE, borderRadius: 14, padding: "14px 16px", marginBottom: 12, border: "1.5px solid "+BORDER }}>
              <div style={{ color: TEXT3, fontSize: 10, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>WEEK SUMMARY</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { val: milesPlanned > 0 ? milesPlanned.toFixed(1) : "--", label: "Miles Planned", color: BLUE, icon: ICON_SNEAKER },
                  { val: runsMilesRan > 0 ? runsMilesRan.toFixed(1) : "--", label: "Miles Ran", color: GREEN, icon: ICON_RUN },
                  { val: workoutsPlanned, label: "Activities Planned", color: ORANGE, icon: ICON_WORKOUT },
                  { val: workoutsCompleted, label: "Activities Done", color: "#1B8C4E", icon: ICON_CHART },
                ].map(function(s) {
                  return (
                    <div key={s.label} style={{ background: SURFACE, borderRadius: 12, padding: "12px 14px" }}>
                      <div style={{ marginBottom: 4, display:"flex", alignItems:"center", color: s.color }} dangerouslySetInnerHTML={{ __html: s.icon }} />
                      <div style={{ color: s.color, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{s.val}</div>
                      <div style={{ color: TEXT3, fontSize: 11, marginTop: 4, fontWeight: 500 }}>{s.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {weekDates.map(function(date, i) {
                var acts    = activitiesForDay(i);
                var isToday = isSameDay(date, today);
                var isPast  = date < today && !isToday;
                var isEmpty = acts.length === 0;
                return (
                  <div key={"weekday-"+i} onClick={function() { setModalDay(i); }} style={{ background: WHITE, borderRadius: 16, padding: "14px 16px", border: "1.5px solid "+(isToday ? GREEN : BORDER), cursor: "pointer", opacity: isPast ? 0.6 : 1, boxShadow: isToday ? "0 0 0 2px "+GREEN+"33" : "0 1px 3px rgba(0,0,0,0.05)", position: "relative", overflow: "hidden" }}>
                    {isToday && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: GREEN, borderRadius: "16px 16px 0 0" }} />}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ textAlign: "center", width: 44, flexShrink: 0, paddingTop: 2 }}>
                        <div style={{ color: isToday ? GREEN : TEXT3, fontSize: 11, fontWeight: 700 }}>{DAYS[i]}</div>
                        <div style={{ color: isToday ? GREEN : TEXT, fontSize: 20, fontWeight: 900, lineHeight: 1.1 }}>{date.getDate()}</div>
                        {isToday && <div style={{ color: GREEN, fontSize: 9, fontWeight: 700, marginTop: 1 }}>TODAY</div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {isEmpty
                          ? <div style={{ color: TEXT3, fontSize: 13, paddingTop: 4 }}>Tap to plan your day</div>
                          : acts.map(function(a, ai) {
                              var color = colorForActivity(a.label);
                              var emoji = emojiForActivity(a.label);
                              return (
                                <div key={ai} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: ai < acts.length-1 ? 8 : 0 }}>
                                  <div style={{ width: 28, height: 28, borderRadius: 8, background: color+"18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: emoji }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>{a.label}</div>
                                    {(a.miles || a.duration) && <div style={{ color: TEXT3, fontSize: 11, marginTop: 1 }}>{a.miles ? a.miles+" mi" : ""}{a.miles && a.duration ? " \u2022 " : ""}{a.duration}</div>}
                                  </div>
                                </div>
                              );
                            })
                        }
                      </div>
                      <div style={{ display: "flex", alignItems: "center", paddingTop: 4 }}>
                        {!isEmpty && <div style={{ background: GREEN+"18", borderRadius: 6, padding: "2px 8px", marginRight: 6 }}><span style={{ color: GREEN, fontSize: 10, fontWeight: 700 }}>{acts.length} planned</span></div>}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT3} strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>


          </div>

          {modalDay !== null ? (
            <DayModal date={weekDates[modalDay]} activities={activitiesForDay(modalDay)} onSave={function(list) { saveDayActivities(modalDay, list); }} onClose={function() { setModalDay(null); }} />
          ) : null}
        </div>
      )}


    </div>
  );
}
// ── END RACE TAB ──

const NAV = [
  { key: "home",      label: "Home",      Icon: IconHome },
  { key: "clients",   label: "Program",   Icon: IconProgram, clientTab: "Program" },
  { key: "library",   label: "Library",   Icon: IconLibrary },
  { key: "race",      label: "My Plan",   Icon: IconRace },
  { key: "activity",  label: "Calendar",  Icon: IconCalendar },
  { key: "analytics", label: "Analytics", Icon: IconAnalytics },
];


// ─────────────────────────────────────────────────────────────────
// ONBOARDING TUTORIAL — tooltip overlay system
// ─────────────────────────────────────────────────────────────────
const COACH_STEPS = [
  {
    id: "welcome",
    title: "Welcome to Money Fitness! 👋",
    body: "Let's take a quick tour so you can start coaching your clients right away. Tap Next to continue.",
    target: "header",
    position: "bottom",
  },
  {
    id: "clients",
    title: "Your Clients",
    body: "Tap Program to view and manage all your clients. You can track their progress, update their program, and message them here.",
    target: "nav-clients",
    position: "top",
  },
  {
    id: "program",
    title: "Build Programs",
    body: "Inside each client you can build a custom 3-week training program, group exercises into circuits, and expand any session to full screen.",
    target: "nav-clients",
    position: "top",
  },
  {
    id: "library",
    title: "Exercise Library",
    body: "Add YouTube video demos to any exercise in the Library tab. Your clients can watch proper form before every set.",
    target: "nav-library",
    position: "top",
  },
  {
    id: "calendar",
    title: "Activity Calendar",
    body: "See each client's activity heatmap and recent workouts synced from their device or logged manually.",
    target: "nav-activity",
    position: "top",
  },
  {
    id: "analytics",
    title: "Analytics",
    body: "Track streaks, miles, activities and goal progress for all your clients in one place.",
    target: "nav-analytics",
    position: "top",
  },
  {
    id: "notifications",
    title: "Notifications",
    body: "The bell icon alerts you when a client messages you, submits a check-in, or hasn't logged activity in 3 days.",
    target: "bell",
    position: "bottom",
  },
  {
    id: "coach-code",
    title: "Your Coach Code",
    body: "Find your unique coach code in Settings → My Profile. Share it with clients so they can link their account to yours on signup.",
    target: "settings",
    position: "bottom",
  },
  {
    id: "done-coach",
    title: "You're all set! 🎉",
    body: "You can revisit this tutorial anytime from Settings. Now go build something great for your clients!",
    target: "header",
    position: "bottom",
  },
];

const CLIENT_STEPS = [
  {
    id: "welcome-client",
    title: "Welcome to Money Fitness! 💪",
    body: "Your coach has set everything up for you. Let's take a quick tour of your app.",
    target: "header",
    position: "bottom",
  },
  {
    id: "home",
    title: "Home",
    body: "Your home screen shows this week's program, your progress stats, and a quick link to message your coach.",
    target: "nav-home",
    position: "top",
  },
  {
    id: "program-client",
    title: "Your Program",
    body: "The Program tab has your coach's training plan. Log your sets, reps and weight for each exercise, and watch video demos.",
    target: "nav-clients",
    position: "top",
  },
  {
    id: "expand",
    title: "Full Screen Mode",
    body: "Tap the expand icon next to any workout name to open it full screen — easier to read and follow during a session.",
    target: "nav-clients",
    position: "top",
  },
  {
    id: "library-client",
    title: "Exercise Library",
    body: "Browse video demos for every exercise your coach has linked. Watch proper form before every set.",
    target: "nav-library",
    position: "top",
  },
  {
    id: "myplan",
    title: "My Plan",
    body: "Track your race goals, plan your week, and see your miles and workouts at a glance.",
    target: "nav-race",
    position: "top",
  },
  {
    id: "calendar-client",
    title: "Calendar",
    body: "Log activities manually or sync from Apple Health, Garmin, Fitbit and more. Your full activity timeline lives here.",
    target: "nav-activity",
    position: "top",
  },
  {
    id: "checkin",
    title: "Weekly Check-Ins",
    body: "Your coach may send weekly check-in requests via Messages. Rate your mood and energy so they can adjust your program.",
    target: "bell",
    position: "bottom",
  },
  {
    id: "done-client",
    title: "Ready to train! 🚀",
    body: "That's everything. Head to Program to start your first session. You can replay this tour anytime in Settings.",
    target: "nav-home",
    position: "top",
  },
];

// Target element ID map — used to position tooltip arrows
const TARGET_NAV = {
  "nav-home":      0,
  "nav-clients":   1,
  "nav-library":   2,
  "nav-race":      3,
  "nav-activity":  4,
  "nav-analytics": 5,
};

function OnboardingTutorial({ isCoach, onComplete }) {
  var steps = isCoach ? COACH_STEPS : CLIENT_STEPS;
  var [step, setStep] = useState(0);
  var current = steps[step];
  var isLast = step === steps.length - 1;
  var isNavTarget = TARGET_NAV[current.target] !== undefined;
  var navIdx = TARGET_NAV[current.target];

  // Nav tab positions — evenly spaced across bottom bar (6 tabs)
  var tabCount = 6;
  var tabPct = navIdx !== undefined ? (navIdx / (tabCount - 1)) * 100 : 50;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none" }}>
      {/* Dark overlay with cutout effect */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)", pointerEvents: "all" }} onClick={function() { if (!isLast) setStep(step + 1); }} />

      {/* Tooltip card */}
      <div style={{
        position: "absolute",
        left: 16,
        right: 16,
        pointerEvents: "all",
        ...(current.position === "top"
          ? { bottom: 90 }
          : { top: current.target === "bell" || current.target === "settings" ? 80 : 70 }
        ),
      }}>
        {/* Arrow pointing down toward nav */}
        {current.position === "top" && isNavTarget && (
          <div style={{
            position: "absolute",
            bottom: -10,
            left: "calc("+tabPct+"% - 8px)",
            width: 0, height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: "10px solid #fff",
          }} />
        )}
        {/* Arrow pointing up toward header */}
        {current.position === "bottom" && (
          <div style={{
            position: "absolute",
            top: -10,
            left: current.target === "bell" ? "calc(100% - 52px)" : current.target === "settings" ? "calc(100% - 84px)" : "50%",
            transform: current.target === "header" ? "translateX(-50%)" : "none",
            width: 0, height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderBottom: "10px solid #fff",
          }} />
        )}

        <div style={{ background: "#fff", borderRadius: 18, padding: "20px 20px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}>
          {/* Progress dots */}
          <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 14 }}>
            {steps.map(function(_, i) {
              return (
                <div key={"dot-"+i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 99, background: i === step ? ORANGE : SURFACE2, transition: "all 0.2s" }} />
              );
            })}
          </div>

          <div style={{ color: TEXT, fontSize: 17, fontWeight: 800, marginBottom: 8, lineHeight: 1.3 }}>{current.title}</div>
          <div style={{ color: TEXT2, fontSize: 14, lineHeight: 1.55, marginBottom: 18 }}>{current.body}</div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {step > 0 && (
              <button onClick={function() { setStep(step - 1); }} style={{ padding: "10px 16px", borderRadius: 99, background: SURFACE, border: "none", color: TEXT2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Back
              </button>
            )}
            <button onClick={function() { isLast ? onComplete() : setStep(step + 1); }} style={{ flex: 1, padding: "12px", borderRadius: 99, background: isLast ? GREEN : ORANGE, border: "none", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              {isLast ? "Get Started!" : "Next →"}
            </button>
            {!isLast && (
              <button onClick={onComplete} style={{ padding: "10px 14px", borderRadius: 99, background: "none", border: "none", color: TEXT3, fontSize: 12, cursor: "pointer" }}>
                Skip
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step counter */}
      <div style={{ position: "absolute", top: current.position === "bottom" ? 140 : 20, right: 20, background: "rgba(255,255,255,0.15)", borderRadius: 99, padding: "4px 10px", pointerEvents: "none" }}>
        <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>{step + 1} / {steps.length}</span>
      </div>
    </div>
  );
}

function CoachInbox({ messages, handleSendMessage }) {
  var [inboxOpen, setInboxOpen] = useState(null);

  if (inboxOpen !== null) {
    var cl = CLIENTS[inboxOpen];
    return (
      <div>
        <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid "+BORDER, background: CARD }}>
          <button onClick={function(){ setInboxOpen(null); }} style={{ background: SURFACE, border: "none", borderRadius: 99, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={TEXT2} strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ width: 36, height: 36, borderRadius: 99, background: cl.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{cl.avatar}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>{cl.name}</div>
            <div style={{ fontSize: 11, color: TEXT3 }}>Client</div>
          </div>
        </div>
        <MessagingInbox clientId={cl.id} clientName={cl.name} clientColor={cl.color} isCoach={true} messages={messages[cl.id] || []} onSend={function(msg) { handleSendMessage(cl.id, msg); }} />
      </div>
    );
  }

  return (
    <div style={{ padding: "8px 0" }}>
      {CLIENTS.map(function(cl, i) {
        var clMsgs = messages[cl.id] || [];
        var lastMsg = clMsgs[clMsgs.length - 1];
        var unread = clMsgs.filter(function(m) { return !m.fromCoach && !m.read; }).length;
        return (
          <div key={cl.id} onClick={function(){ setInboxOpen(i); }}
            style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 16px", borderBottom: "1px solid "+BORDER, background: CARD, cursor: "pointer" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 48, height: 48, borderRadius: 99, background: cl.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#fff" }}>{cl.avatar}</div>
              {unread > 0 && <div style={{ position: "absolute", top: 0, right: 0, width: 17, height: 17, borderRadius: 99, background: ORANGE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff", border: "2px solid #fff" }}>{unread}</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                <div style={{ fontSize: 14, fontWeight: unread > 0 ? 800 : 600, color: TEXT }}>{cl.name}</div>
                {lastMsg && <div style={{ fontSize: 10, color: TEXT3, flexShrink: 0 }}>{lastMsg.time || ""}</div>}
              </div>
              <div style={{ fontSize: 12, color: TEXT3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: unread > 0 ? 600 : 400 }}>
                {lastMsg ? (lastMsg.fromCoach ? "You: " : cl.name.split(" ")[0]+": ") + lastMsg.text : "No messages yet"}
              </div>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={TEXT3} strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        );
      })}
    </div>
  );
}

function MainApp({ initCoach, onLogout, newClientName }) {
  const [tab, setTab]           = useState("home");
  const [isCoach, setIsCoach]   = useState(initCoach !== undefined ? initCoach : true);
  const [showTutorial, setShowTutorial] = useState(true); // show on first launch
  const [selected, setSelected] = useState(null);
  const [clientDefaultTab, setClientDefaultTab] = useState("Progress");
  const [favorites, setFavorites] = useState({});
  const [notifSettings, setNotifSettings] = useState({
    checkin: true, message: true, program: true, streak: true,
    newClient: true, weeklySummary: true, streakRisk: true,
    activityComplete: true, goalMilestone: true, coachCheckinAlert: true, all: true,
  });
  const [messages, setMessages] = useState(SEED_MESSAGES);

  // Notifications
  const [notifications, setNotifications] = useState([
    { id: 1, type: "streak",     title: "Keep it up!", body: "You're on a 12-day streak. Don't break the chain today!", time: "2h ago",  read: false },
    { id: 2, type: "message",    title: "New message from " + COACH_FIRST, body: "Hey Marcus! Great work this week. How are you feeling about the new program?", time: "3h ago",  read: false },
    { id: 3, type: "program",    title: "Program updated", body: COACH_NAME + " updated your training program. Check out the new Push session.", time: "1d ago",  read: true  },
    { id: 4, type: "checkin",    title: "Time to log!", body: "You haven't logged an activity in 2 days. Stay on track with your goals.", time: "1d ago",  read: true  },
  ]);

  function addNotification(notif) {
    setNotifications(function(prev) { return [notif].concat(prev); });
  }

  // -- SHARED ACTIVITY LOGS -------------------------------------
  // activityLogs: { "YYYY-M": { day: [ {type, notes, miles, ...} ] } }
  // Seeded with the client's existing workedOut days for current month
  const currentMonthKey = TODAY.getFullYear() + "-" + TODAY.getMonth();
  var MANUAL_SEED = [
    { type: "workout", notes: "Push Day",    duration: "48:00", calories: 390, steps: "1820" },
    { type: "run",     notes: "Easy Run",    duration: "32:10", miles: "2.8",  pace: "11:30", steps: "4120", calories: 280 },
    { type: "workout", notes: "Pull Day",    duration: "55:00", calories: 420, steps: "2100" },
    { type: "run",     notes: "Tempo Run",   duration: "26:45", miles: "3.0",  pace: "8:55",  steps: "4500", calories: 310 },
    { type: "workout", notes: "Leg Day",     duration: "60:00", calories: 510, steps: "2300" },
    { type: "maintenance", notes: "Yoga",    duration: "30:00", calories: 120, steps: "400"  },
    { type: "workout", notes: "Upper Body",  duration: "45:00", calories: 360, steps: "1600" },
    { type: "run",     notes: "Long Run",    duration: "52:00", miles: "4.8",  pace: "10:50", steps: "7200", calories: 480 },
    { type: "workout", notes: "Full Body",   duration: "50:00", calories: 400, steps: "1900" },
    { type: "run",     notes: "Easy Run",    duration: "28:00", miles: "2.5",  pace: "11:12", steps: "3700", calories: 245 },
  ];
  const initLogs = {};
  CLIENTS[0].workedOut.forEach(function(d, idx) {
    var seed = MANUAL_SEED[idx % MANUAL_SEED.length];
    initLogs[d] = [Object.assign({ id: d }, seed)];
  });

  // Pre-seed Apple Health imports so the timeline is visible on first load
  var todayDay = TODAY.getDate();
  var appleImports = [
    { day: todayDay,   entry: { id: "device-aw-1", type: "run",     notes: "Outdoor Run",       miles: "3.1", steps: "4823", calories: 312, duration: "28:42", pace: "9:15", fromDevice: true, platform: "apple", source: "Apple Health" }},
    { day: todayDay-1, entry: { id: "device-aw-2", type: "workout", notes: "Strength Training",  miles: "",    steps: "1204", calories: 428, duration: "52:18", fromDevice: true, platform: "apple", source: "Apple Health" }},
    { day: todayDay-2, entry: { id: "device-aw-3", type: "run",     notes: "Outdoor Run",        miles: "3.6", steps: "5231", calories: 374, duration: "34:05", pace: "9:28", fromDevice: true, platform: "apple", source: "Apple Health" }},
    { day: todayDay-3, entry: { id: "device-aw-4", type: "workout", notes: "HIIT",               miles: "",    steps: "987",  calories: 285, duration: "22:00", fromDevice: true, platform: "apple", source: "Apple Health" }},
    { day: todayDay-4, entry: { id: "device-aw-5", type: "run",     notes: "Cycling",            miles: "14.2",steps: "2341", calories: 511, duration: "1:04:33", fromDevice: true, platform: "apple", source: "Apple Health" }},
  ];
  appleImports.forEach(function(imp) {
    if (imp.day > 0) {
      var existing = initLogs[imp.day] || [];
      if (!existing.find(function(e) { return e.id === imp.entry.id; })) {
        initLogs[imp.day] = [imp.entry].concat(existing);
      }
    }
  });

  const [activityLogs, setActivityLogs] = useState({ [currentMonthKey]: initLogs });

  function handleLogsChange(monthKey, newLogs) {
    setActivityLogs(function(prev) {
      return Object.assign({}, prev, { [monthKey]: newLogs });
    });
  }

  // Computed stats from activityLogs for current month
  function getMonthStats() {
    var logs = activityLogs[currentMonthKey] || {};
    var totalWorkouts = 0;
    var totalMiles = 0;
    var paceSeconds = [];
    var days = Object.keys(logs);
    for (var di = 0; di < days.length; di++) {
      var acts = logs[days[di]];
      for (var ai = 0; ai < acts.length; ai++) {
        var a = acts[ai];
        totalWorkouts++;
        if (a.type === "run") {
          var m = parseFloat(a.miles || 0);
          if (!isNaN(m) && m > 0) totalMiles += m;
          // Parse pace string "M:SS"
          if (a.pace) {
            var parts = a.pace.split(":");
            if (parts.length === 2) {
              var secs = parseInt(parts[0]) * 60 + parseInt(parts[1]);
              if (!isNaN(secs) && secs > 0) paceSeconds.push(secs);
            }
          }
        }
      }
    }
    var restDays = Math.max(0, TODAY.getDate() - totalWorkouts);
    var avgPaceStr = "";
    if (paceSeconds.length > 0) {
      var avgSecs = Math.round(paceSeconds.reduce(function(s, v) { return s + v; }, 0) / paceSeconds.length);
      var avgMins = Math.floor(avgSecs / 60);
      var avgRemSecs = avgSecs % 60;
      avgPaceStr = avgMins + ":" + (avgRemSecs < 10 ? "0" : "") + avgRemSecs + "/mi";
    }
    // Compute steps: today + last 7 days from activityLogs
    var todayKey2 = TODAY.getDate();
    var todayStepsCalc = (logs[todayKey2] || []).reduce(function(s, a) { return s + (parseInt(a.steps) || 0); }, 0);

    var last7 = [];
    for (var d7 = 6; d7 >= 0; d7--) {
      var d7date = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - d7);
      var d7key = d7date.getDate();
      var d7monthKey = d7date.getFullYear() + "-" + d7date.getMonth();
      var d7logs = (activityLogs[d7monthKey] && activityLogs[d7monthKey][d7key]) || [];
      var d7steps = d7logs.reduce(function(s, a) { return s + (parseInt(a.steps) || 0); }, 0);
      var dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      last7.push({ day: dayNames[d7date.getDay()], steps: d7steps || 0, goal: 10000 });
    }
    // Fall back today steps to mock if none logged
    // todayStepsCalc stays 0 if nothing logged — no mock fallback

    return { totalWorkouts: totalWorkouts, totalMiles: totalMiles.toFixed(1), restDays: restDays, avgPace: avgPaceStr, runCount: paceSeconds.length, todaySteps: todayStepsCalc, last7Steps: last7 };
  }

  const monthStats = getMonthStats();

  // ── INACTIVITY NOTIFICATIONS ──────────────────────────────────
  // Check once on mount (and whenever activityLogs changes) if any client
  // hasn't logged anything in 3+ days. Fire a single notification per client,
  // deduped so we don't spam the same alert repeatedly.
  const [inactivityFired, setInactivityFired] = useState({});

  useEffect(function() {
    if (!isCoach) return;
    var todayNum = TODAY.getDate();
    var monthKey2 = TODAY.getFullYear() + "-" + TODAY.getMonth();

    CLIENTS.forEach(function(client) {
      // Find the most recent logged day for this client in activityLogs
      // (for the coach view, activityLogs tracks the shared client log)
      var logs = activityLogs[monthKey2] || {};
      var loggedDays = Object.keys(logs).map(Number).filter(function(d) { return d <= todayNum; });

      // Also consider workedOut seed data
      var allDays = loggedDays.concat(client.workedOut.filter(function(d) { return d <= todayNum; }));
      var lastDay = allDays.length > 0 ? Math.max.apply(null, allDays) : 0;
      var daysSince = lastDay > 0 ? todayNum - lastDay : todayNum;

      if (daysSince >= 3) {
        var key = "inactive-" + client.id + "-" + lastDay;
        if (!inactivityFired[key]) {
          setInactivityFired(function(prev) { return Object.assign({}, prev, { [key]: true }); });
          if (!notifSettings.streak) return;
          addNotification({
            id: Date.now() + client.id,
            type: "checkin",
            title: client.name + " hasn’t logged in " + daysSince + " days",
            body: "Last activity was " + (lastDay > 0 ? "day " + lastDay + " of this month" : "not recorded") + ". Consider sending them a check-in.",
            time: "Just now",
            read: false,
            clientId: client.id,
          });
        }
      }
    });
  }, [activityLogs, isCoach]);

  // ── COACH: WEEKLY SUMMARY (fires on Mondays) ──────────────────
  const [weeklySummaryFired, setWeeklySummaryFired] = useState(false);

  useEffect(function() {
    if (!isCoach) return;
    var isMonday = TODAY.getDay() === 1;
    if (!isMonday || weeklySummaryFired) return;

    var monthKey3 = TODAY.getFullYear() + "-" + TODAY.getMonth();
    var logs3 = activityLogs[monthKey3] || {};

    // Count activities logged this past week (last 7 days)
    var activeClients = 0;
    var totalWorkoutsWeek = 0;
    var inactiveNames = [];

    CLIENTS.forEach(function(client) {
      var loggedDays = Object.keys(logs3).map(Number);
      var lastWeekDays = loggedDays.filter(function(d) {
        return d <= TODAY.getDate() && d >= TODAY.getDate() - 7;
      });
      if (lastWeekDays.length > 0) {
        activeClients++;
        totalWorkoutsWeek += lastWeekDays.length;
      } else {
        inactiveNames.push(client.name.split(" ")[0]);
      }
    });

    setWeeklySummaryFired(true);
    if (!notifSettings.weeklySummary) return;
    addNotification({
      id: Date.now() + 999,
      type: "streak",
      title: "Weekly Summary 📊",
      body: activeClients + " of " + CLIENTS.length + " clients active last week · " + totalWorkoutsWeek + " workouts logged" + (inactiveNames.length > 0 ? " · " + inactiveNames.join(", ") + " need check-ins" : " · Great week all round!"),
      time: "Today",
      read: false,
    });
  }, [isCoach]);

  // ── CLIENT: STREAK AT RISK (fires if no activity logged today after 6pm) ──
  const [streakAlertFired, setStreakAlertFired] = useState(false);

  useEffect(function() {
    if (isCoach) return;
    var hourNow = TODAY.getHours();
    if (hourNow < 18 || streakAlertFired) return; // only after 6pm

    var monthKey4 = TODAY.getFullYear() + "-" + TODAY.getMonth();
    var todayLogs4 = (activityLogs[monthKey4] && activityLogs[monthKey4][TODAY.getDate()]) || [];

    if (todayLogs4.length === 0) {
      // Check if they have a streak worth protecting
      var myClient = CLIENTS[0];
      var streak = myClient ? myClient.streak : 0;
      if (streak > 0) {
        setStreakAlertFired(true);
        if (!notifSettings.streakRisk) return;
        addNotification({
          id: Date.now() + 777,
          type: "streak",
          title: "🔥 Don't break your " + streak + "-day streak!",
          body: "You haven't logged anything today yet. A quick workout or walk counts — keep the chain going!",
          time: "Just now",
          read: false,
        });
      }
    }
  }, [activityLogs, isCoach]);

  // ── CLIENT: POST-ACTIVITY ENCOURAGEMENT ──────────────────────
  const [lastActivityCount, setLastActivityCount] = useState(0);

  useEffect(function() {
    if (isCoach) return;
    var monthKey5 = TODAY.getFullYear() + "-" + TODAY.getMonth();
    var logs5 = activityLogs[monthKey5] || {};
    var totalCount = Object.values(logs5).reduce(function(sum, acts) { return sum + acts.length; }, 0);

    if (totalCount > lastActivityCount && lastActivityCount > 0) {
      // Find the most recently added activity
      var latestActs = logs5[TODAY.getDate()] || [];
      var latest = latestActs[0];
      var typeMessages = {
        run:         ["Great run! Every mile counts.", "You crushed that run!", "Nice work out there!"],
        workout:     ["Workout done! One session closer to your goal.", "Strength built today. Great work!", "Crushed it in the gym!"],
        bike:        ["Great ride! Keep the momentum rolling.", "Solid bike session — well done!", "Nice work on the bike!"],
        swim:        ["Great swim! Keep making waves.", "Solid session in the pool!", "Nice work in the water!"],
        maintenance: ["Body care done. Recovery is just as important!", "Smart move taking care of your body.", "Great job investing in recovery!"],
        other:       ["Activity logged! Every effort adds up.", "Great work — keep it going!", "Nice job staying active today!"],
      };
      var type = latest ? latest.type : "other";
      var msgs = typeMessages[type] || typeMessages.other;
      var msg = msgs[Math.floor(Math.random() * msgs.length)];
      if (notifSettings.activityComplete) {
        addNotification({
          id: Date.now() + 555,
          type: "streak",
          title: "Activity logged!",
          body: msg,
          time: "Just now",
          read: false,
        });
      }
    }
    setLastActivityCount(totalCount);
  }, [activityLogs]);

  // ── CLIENT: GOAL MILESTONE ─────────────────────────────────────
  const [firedGoalMilestones, setFiredGoalMilestones] = useState({});

  useEffect(function() {
    if (isCoach) return;
    var myClient = CLIENTS[0];
    if (!myClient || !myClient.goals) return;
    myClient.goals.forEach(function(g) {
      var pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
      var milestones = [50, 75, 100];
      milestones.forEach(function(m) {
        var key = (g.label || g.unit) + "-" + m;
        if (pct >= m && !firedGoalMilestones[key]) {
          setFiredGoalMilestones(function(prev) { return Object.assign({}, prev, { [key]: true }); });
          if (!notifSettings.goalMilestone) return;
          addNotification({
            id: Date.now() + m,
            type: "streak",
            title: m === 100 ? "Goal achieved!" : m + "% of your goal reached!",
            body: m === 100
              ? "You hit your " + (g.label || g.unit) + " goal. Incredible work — time to set the next one!"
              : "You're " + m + "% of the way to your " + (g.label || g.unit) + " goal. Keep pushing!",
            time: "Just now",
            read: false,
          });
        }
      });
    });
  }, [activityLogs]);

  // ── COACH: STREAK MILESTONE ────────────────────────────────────
  const [firedStreakMilestones, setFiredStreakMilestones] = useState({});

  useEffect(function() {
    if (isCoach) return;
    var myClient = CLIENTS[0];
    var streak = myClient ? myClient.streak : 0;
    var milestones = [7, 14, 30];
    milestones.forEach(function(m) {
      if (streak >= m && !firedStreakMilestones[m]) {
        setFiredStreakMilestones(function(prev) { return Object.assign({}, prev, { [m]: true }); });
        if (!notifSettings.streak) return;
        addNotification({
          id: Date.now() + m + 100,
          type: "streak",
          title: m + "-day streak!",
          body: "You've logged activity " + m + " days in a row. That kind of consistency is what gets results!",
          time: "Just now",
          read: false,
        });
      }
    });
  }, [activityLogs]);
  useEffect(function() {
    if (!isCoach || !newClientName) return;
    if (!notifSettings.newClient) return;
    addNotification({
      id: Date.now() + 111,
      type: "message",
      title: "New client joined! 🎉",
      body: newClientName + " just signed up using your coach code and is ready to get started.",
      time: "Just now",
      read: false,
    });
  }, [newClientName]);

  function handleSendMessage(clientId, msg) {
    setMessages(function(prev) {
      const next = Object.assign({}, prev);
      const thread = (next[clientId] || []).slice();
      thread.push(Object.assign({ id: thread.length + 1 }, msg));
      next[clientId] = thread;
      return next;
    });
    // Notify coach when a client sends a message, check-in, or media
    if (msg.from === "client") {
      var client = CLIENTS.find(function(c) { return c.id === clientId; });
      var clientName = client ? client.name : "A client";
      var notifTitle, notifBody;
      if (msg.type === "checkin_response") {
        notifTitle = clientName + " submitted their weekly check-in";
        notifBody = "Motivation: " + msg.mood + "/5 · Program enjoyment: " + msg.energy + "/5" + (msg.notes ? " — " + msg.notes.slice(0, 60) : "");
        if (notifSettings.checkin) {
          addNotification({
            id: Date.now(),
            type: "checkin",
            title: notifTitle,
            body: notifBody,
            time: "Just now",
            read: false,
            clientId: clientId,
          });
        }
      } else if (msg.type === "media") {
        notifTitle = "New message from " + clientName;
        notifBody = msg.mediaType === "video" ? "Sent a video" + (msg.text ? ": " + msg.text : "") : "Sent a photo" + (msg.text ? ": " + msg.text : "");
        if (notifSettings.message) {
          addNotification({ id: Date.now(), type: "message", title: notifTitle, body: notifBody, time: "Just now", read: false, clientId: clientId });
        }
      } else if (msg.type === "activity_logged") {
        if (notifSettings.coachCheckinAlert) {
          addNotification({
            id: Date.now(),
            type: "checkin",
            title: clientName + " logged an activity",
            body: msg.activityType ? msg.activityType + " - " + (msg.notes || "Nice work!") : "Just completed a workout. Great consistency!",
            time: "Just now",
            read: false,
            clientId: clientId,
          });
        }
      } else {
        notifTitle = "New message from " + clientName;
        notifBody = msg.text || "Sent you a message";
        if (notifSettings.message) {
          addNotification({ id: Date.now(), type: "message", title: notifTitle, body: notifBody, time: "Just now", read: false, clientId: clientId });
        }
      }
    }
  }
  const [importedIds, setImportedIds]         = useState({ "aw-1": true, "aw-2": true, "aw-3": true });
  const [coachProgram, setCoachProgram] = useState(DEFAULT_PROGRAM);

  function handleProgramUpdate(newProgram) {
    setCoachProgram(newProgram);
    if (notifSettings.program) {
      addNotification({
        id: Date.now() + 333,
        type: "program",
        title: "Program updated",
        body: COACH_NAME + " updated the training program. Check out the latest changes.",
        time: "Just now",
        read: false,
      });
    }
  }
  const [watchConnected, setWatchConnected]   = useState(true);

  const defaultWatchDays = {};
  const t = TODAY.getDate();
  defaultWatchDays[t] = [{ id: "aw-1", type: "Outdoor Run", icon: ICON_RUN, duration: "28:42", calories: 312, distance: "3.1 mi" }];
  if (t - 1 > 0) defaultWatchDays[t - 1] = [{ id: "aw-2", type: "Strength Training", icon: ICON_WORKOUT, duration: "52:18", calories: 428, distance: null }];
  if (t - 2 > 0) defaultWatchDays[t - 2] = [{ id: "aw-3", type: "Outdoor Run", icon: ICON_RUN, duration: "34:05", calories: 374, distance: "3.6 mi" }];

  const [watchDays, setWatchDays] = useState(defaultWatchDays);
  const [raceCollapsed, setRaceCollapsed] = useState(false);
  const [myPlans, setMyPlans] = useState(function() {
    // Always use fresh Date so key matches current week regardless of when module loaded
    var _now = new Date();
    var _m = getMondayOf(_now);
    var _w = weekKey(_m);
    var _s = {};
    _s[_w+"-0"] = [{id:"seed-0",label:"Push Day", emoji: ICON_WORKOUT,color:"#1B8C4E",miles:"",   notes:"Upper body"}];
    _s[_w+"-1"] = [{id:"seed-1",label:"Easy Run", emoji: ICON_RUN,color:"#3B7DD8",miles:"3.0",notes:"Easy pace"}];
    _s[_w+"-3"] = [{id:"seed-3",label:"Pull Day", emoji: ICON_WORKOUT,color:"#1B8C4E",miles:"",   notes:"Back, biceps"}];
    _s[_w+"-4"] = [{id:"seed-4",label:"Tempo Run",emoji: ICON_RUN,color:"#3B7DD8",miles:"4.0",notes:"Tempo effort"}];
    _s[_w+"-5"] = [{id:"seed-5",label:"Leg Day",  emoji: ICON_WORKOUT,color:"#9B6FD4",miles:"",   notes:"Squat, deadlift"}];
    return _s;
  }); // lifted from RaceScreen so HomeScreen can read it

  // Map mock workout dates to actual day numbers in current month
  const WATCH_DAY_MAP = {
    "aw-1": TODAY.getDate(),           // Today
    "aw-2": TODAY.getDate() - 1,       // Yesterday
    "aw-3": TODAY.getDate(),           // same day (Mon May 19)
    "aw-4": TODAY.getDate() - 1,       // Sun May 18
    "aw-5": TODAY.getDate() - 2,       // Sat May 17
  };

  function handleImport(workout, platform) {
    const id = typeof workout === "string" ? workout : workout.id;
    const platformId = platform || "apple";
    setImportedIds(function(prev) { return Object.assign({}, prev, { [id]: true }); });

    // Find the full workout object
    const wk = MOCK_WATCH_WORKOUTS.find(function(w) { return w.id === id; });
    const day = WATCH_DAY_MAP[id];
    if (wk && day && day > 0) {
      // Push into watchDays for heatmap
      setWatchDays(function(prev) {
        const next = Object.assign({}, prev);
        const existing = next[day] || [];
        // Avoid duplicates
        if (existing.find(function(e) { return e.id === wk.id; })) return next;
        next[day] = existing.concat([{ id: wk.id, type: wk.type, icon: wk.icon, duration: wk.duration, calories: wk.calories, distance: wk.distance || null }]);
        return next;
      });

      // Also push into activityLogs so timeline + stats all read from same source
      const monthKey2 = TODAY.getFullYear() + "-" + TODAY.getMonth();
      const platformLabels = { apple: "Apple Health", garmin: "Garmin Connect", google: "Google Fit", fitbit: "Fitbit", coros: "Coros" };
      const sourceLabel = platformLabels[platformId] || platformId;
      setActivityLogs(function(prev) {
        const next = Object.assign({}, prev);
        const ml = Object.assign({}, next[monthKey2] || {});
        const existing = (ml[day] || []).slice();
        // Avoid duplicates
        if (existing.find(function(e) { return e.id === "device-"+wk.id; })) return prev;
        existing.unshift({
          id: "device-" + wk.id,
          type: wk.type.toLowerCase().indexOf("run") !== -1 ? "run" : "workout",
          notes: wk.type,
          miles: wk.distance ? String(parseFloat(wk.distance) || "") : "",
          steps: String(wk.steps || ""),
          calories: wk.calories,
          duration: wk.duration,
          pace: "",
          fromDevice: true,
          platform: platformId,
          source: sourceLabel,
        });
        ml[day] = existing;
        next[monthKey2] = ml;
        return next;
      });
    }
  }

  function toggleFavorite(name) {
    setFavorites(function(prev) {
      const next = Object.assign({}, prev);
      next[name] = !prev[name];
      return next;
    });
  }

  function goTo(t) {
    setTab(t);
    if (t !== "clients") setSelected(null);
  }

  function goToClientTab(clientTab, dayIdx) {
    setSelected(CLIENTS[0]);
    setClientDefaultTab(clientTab);
    if (dayIdx !== undefined) setProgramDayIndex(dayIdx);
    setTab("clients");
  }

  const [programDayIndex, setProgramDayIndex] = useState(null);

  const appStyle = { width: "100%", maxWidth: 430, margin: "0 auto", height: "100vh", display: "flex", flexDirection: "column", background: BG, overflow: "hidden", fontFamily: "system-ui,sans-serif" };

  return (
    <div style={appStyle}>
      <style>{GLOBAL_STYLES}</style>
      {showTutorial && (
        <OnboardingTutorial
          isCoach={isCoach}
          onComplete={function() { setShowTutorial(false); }}
        />
      )}
      <div style={{ padding: "14px 18px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: CARD, borderBottom: "1px solid "+BORDER, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAYAAAA6RwvCAAADyUlEQVR42u2WMUgjWRjH/2/GGee20tVuD/dU2Hgh5YY0ilhbCFpZCbekCXtdQLSxUBsbGwUrU1pZaDZiIRgRbGwUPc+rlKygRjEERceZee9/RczEaIznsXfscT74mJC8yff7/u//vfcEAOI7GBq+k/EK8grynwGpeZZUK2dVSlWdL4SAEOIvA5AESYhvuY8IIUDyn1EkEAhA1/WCGlJh/4/9J5UrqhUMBgvlVRFGKQXLsnB8fIzT09OCOg9D13UKIRiJROh5HqWUlJ6klJJdXV0UQlDX9bL5AGhZFufn50mSnueRihWH53okyYODAzY3N1MIwYogNTU1BMCZmRmSpOM4dB2XJLm4uFiWvPisr69nOp0mSd7at3Qcp2LYtk2SzGazbGtrIwBqmvYY5I6OdXV1PDs7o1KKruv6yriOy2DwZwKgaZoEwKamJm5vbxcgbm/53Li6umI4HC4r5JFHdF2H53no6elBY2MjXNeFYRgA4H/+/PlXxGIxOI6DUCiEL8kveP/Te7iuC9M0MT09ja+Zr9B0razLSELTNKTTaWxubkLXdUgpS7/fjzuZuLa25q91LpdjPp8veEVK5vN5WpbF8MePPD8/99fd8zwODAyw0nI/lcdfifvtW3R+KBTC1tYWlFIwDAOjo6MwTRODg4Nwbh2YtSYWFhbQ0d6Btw1vAQCXl5fo7+9HKpXCyMgIOjo64HkeNE2DgICighACtm0jGo0im836Kj1SpGjSiYkJf72VUgx8+MCWlpZSB0lJkv7z6OiIkUiEADg8PFzVH59++VTmjXtRMqkA+OaHN8xkMlSq0HsbGxv+5OXlZZKk67i8ubkhSe7s7LC1tZUAGIvFqho2Ho8/BVECKagh2NvbS5K0bwptFo1G/cnd3d0k6UOsrq6yoaGBANjX11eAdAttvr6+zmQyyWQyyaWlJY6NjVWDKIHod+ZJpVK+7BcXF34iTdNoGAb39vZIknNzc377GobB/d/3/fcODw+paYJPbQ1PghQd3NzcQtu2/apmZ2f9Kor+icfjTCQS/veaprGzs7Og4t1mNT4+TgCsra2lrut+PNNJJZMODQ1RKcXr62uSZHt7+yM5i3OLSgBgIpGglJK2bdNxHAYCgYotWjWEEBRC0LIsZjIZ31h7v+35Z04liYtJfnz3zleQJFdWVl4OAbBG0zRIKREMBpHL5XBycgLTNDE1NQUp5aPd7/4OCQAfw2Hs7u7CvrFh1pqYnJx88Z0Edwc1Hx7j/9YdpCLIwz9+SYKH1f8dsG96Q3u9xb+CvIL8L0H+BLTWz3sEoqYaAAAAAElFTkSuQmCC" alt="MF" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
          <div>
            <span style={{ color: TEXT, fontSize: 18, fontWeight: 800, fontStyle: "italic" }}>Money</span><span style={{ color: "#1B8C4E", fontSize: 18, fontWeight: 800, fontStyle: "italic" }}>Fitness</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", background: SURFACE, borderRadius: 10, padding: 3, gap: 2 }}>
            <button onClick={function() { setIsCoach(true); setSelected(null); goTo("home"); }} style={{ padding: "6px 12px", background: isCoach ? CARD : "transparent", borderRadius: 8, border: "none", color: isCoach ? TEXT : TEXT3, fontSize: 12, fontWeight: isCoach ? 700 : 500, cursor: "pointer", boxShadow: isCoach ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>Coach</button>
            <button onClick={function() { setIsCoach(false); setSelected(null); goTo("home"); }} style={{ padding: "6px 12px", background: !isCoach ? CARD : "transparent", borderRadius: 8, border: "none", color: !isCoach ? TEXT : TEXT3, fontSize: 12, fontWeight: !isCoach ? 700 : 500, cursor: "pointer", boxShadow: !isCoach ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>Client</button>
          </div>
          <SettingsMenu isCoach={isCoach} goTo={goTo} tab={tab} onLogout={onLogout} onReplayTutorial={function() { setShowTutorial(true); }} notifSettings={notifSettings} setNotifSettings={setNotifSettings} />
          <button onClick={function() { goTo("directmessage"); }} style={{ width: 36, height: 36, borderRadius: 99, background: tab === "directmessage" ? ORANGE_BG : SURFACE, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={tab === "directmessage" ? ORANGE : TEXT2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
          <NotificationBell notifications={notifications} onOpen={function(dest, notif) {
            if ((dest === "clients" || dest === "message") && notif && notif.clientId) {
              var client = CLIENTS.find(function(c) { return c.id === notif.clientId; });
              if (client) { setSelected(client); setClientDefaultTab(notif.type === "checkin" ? "Progress" : "Messages"); goTo("clients"); return; }
            }
            if (dest === "clients") { goTo("directmessage"); }
            else { goTo(dest || "notifications"); }
          }} onClear={function(id) { setNotifications(function(p) { return p.map(function(n) { return n.id === id ? Object.assign({}, n, { read: true }) : n; }); }); }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: tab === "clients" ? "0 16px 0" : "20px 16px 0" }}>
        {tab === "home" && (function() {
          var _mon = getMondayOf(new Date());
          var _planned = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(function(dn, i) {
            var _d = addDays(_mon, i);
            var _k = weekKey(_mon) + "-" + i;
            return { day: dn, date: _d, acts: myPlans[_k] || [], isToday: _d.toDateString() === TODAY.toDateString() };
          });
          return <HomeScreen isCoach={isCoach} goTo={goTo} setClient={setSelected} goToClientTab={goToClientTab} messages={messages} monthStats={monthStats} coachProgram={coachProgram} activityLogs={activityLogs} myPlans={myPlans} thisWeekPlanned={_planned} />;
        })()}
        {tab === "clients"       && <ClientsScreen isCoach={isCoach} selected={selected} setSelected={setSelected} clientDefaultTab={clientDefaultTab} setClientDefaultTab={setClientDefaultTab} favorites={favorites} watchDays={watchDays} messages={messages} onSend={handleSendMessage} coachProgram={coachProgram} setCoachProgram={handleProgramUpdate} activityLogs={activityLogs} onLogsChange={handleLogsChange} programDayIndex={programDayIndex} setProgramDayIndex={setProgramDayIndex} myPlans={myPlans} />}
        {tab === "directmessage" && (
          <div style={{ padding: "0 0 24px" }}>
            <div style={{ padding: "12px 16px 10px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid "+BORDER, background: CARD }}>
              <button onClick={function(){ goTo("home"); }} style={{ background: SURFACE, border: "none", borderRadius: 99, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT2} strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{isCoach ? "Messages" : COACH_NAME}</div>
                <div style={{ fontSize: 11, color: TEXT3 }}>{isCoach ? "Client conversations" : "Your Coach"}</div>
              </div>
            </div>
            {isCoach ? (
              <CoachInbox messages={messages} handleSendMessage={handleSendMessage} />
            ) : (
              <MessagingInbox clientId={CLIENTS[0].id} clientName={COACH_NAME} clientColor={CLIENTS[0].color} isCoach={false} messages={messages[CLIENTS[0].id] || []} onSend={function(msg) { handleSendMessage(CLIENTS[0].id, msg); }} />
            )}
          </div>
        )}
        {tab === "library"       && <LibraryScreen isCoach={isCoach} favorites={favorites} toggleFavorite={toggleFavorite} />}
        {tab === "watch"         && <AppleWatchScreen connected={watchConnected} onConnect={function() { setWatchConnected(true); }} onDisconnect={function() { setWatchConnected(false); setImportedIds({}); setWatchDays({}); }} importedIds={importedIds} onImport={handleImport} />}
        {tab === "activity"      && <ActivityScreen isCoach={isCoach} watchDays={watchDays} activityLogs={activityLogs} onLogsChange={handleLogsChange} />}
        {tab === "analytics"     && <AnalyticsScreen isCoach={isCoach} monthStats={monthStats} todaySteps={monthStats.todaySteps} last7Steps={monthStats.last7Steps} />}
        {tab === "race"          && <RaceScreen activityLogs={activityLogs} raceCollapsed={raceCollapsed} setRaceCollapsed={setRaceCollapsed} plans={myPlans} setPlans={setMyPlans} />}
        {tab === "notifications" && <NotificationsScreen notifications={notifications} onRead={function(id) { setNotifications(function(p) { return p.map(function(n) { return n.id === id ? Object.assign({}, n, { read: true }) : n; }); }); }} onClearAll={function() { setNotifications(function(p) { return p.map(function(n) { return Object.assign({}, n, { read: true }); }); }); }} isCoach={isCoach} goTo={goTo} onNavigateToClient={function(clientId, defaultTab) {
    var client = CLIENTS.find(function(c) { return c.id === clientId; });
    if (client) { setSelected(client); setClientDefaultTab(defaultTab || "Messages"); goTo("clients"); }
  }} />}
        <div style={{ height: 20 }} />
      </div>
      <div style={{ display: "flex", background: CARD, borderTop: "1px solid "+BORDER, flexShrink: 0 }}>
        {NAV.map(function(item) {
          const active = tab === item.key;
          const IconComp = item.Icon;
          return (
            <button key={item.key} onClick={function() {
                if (item.key === "clients" && !isCoach) {
                  setSelected(CLIENTS[0]);
                  setClientDefaultTab("Program");
                }
                goTo(item.key);
              }} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 0 9px", background: "none", border: "none", cursor: "pointer", gap: 3, borderTop: active ? "2px solid "+ORANGE : "2px solid transparent", marginTop: -1 }}>
              <IconComp active={active} color={ORANGE} />
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: active ? ORANGE : TEXT3, letterSpacing: 0.3 }}>{(item.key === "clients" && isCoach ? "CLIENTS" : item.label).toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed]       = useState(false);
  const [newClientName, setNewClientName] = useState(null);
  const [isCoach, setIsCoach]     = useState(true);
  const [authScreen, setAuthScreen] = useState("welcome");
  const wrapStyle = { width: "100%", maxWidth: 430, margin: "0 auto", height: "100vh", display: "flex", flexDirection: "column", background: BG, overflow: "hidden", fontFamily: "system-ui,sans-serif" };
  if (!authed) {
    return (
      <div style={wrapStyle}>
        <style>{GLOBAL_STYLES}</style>
        <AuthFlow screen={authScreen} setScreen={setAuthScreen} onAuth={function(coach, clientName) { setIsCoach(coach); setAuthed(true); if (!coach && clientName) { setNewClientName(clientName); } }} />
      </div>
    );
  }
  return <MainApp initCoach={isCoach} newClientName={newClientName} onLogout={function() { setAuthed(false); setAuthScreen("welcome"); setNewClientName(null); }} />;
}


