// Every project fact here is Maxwell's own wording from the original site.
// Media paths point at the web copies in public/media (made by the lab's make-media.py);
// the full-size originals stay in public/photos and public/videos.

export type ModelConfig = {
  url: string;
  rotation: [number, number, number]; // degrees, applied before centring
  exposure: number;
};

export type Project = {
  slug: string;
  short: string;
  name: string;
  codename?: string;
  dates: string;
  role: string;
  solo?: boolean;
  summary: { label: string; text: string }[];
  stack: string[];
  model: ModelConfig;
  youtube?: { id: string; label: string };
  logbook?: string;
  feature?: { video: string; poster: string; label: string };
  strip: string[];
  archive: { photos: string[]; videos: { src: string; poster: string }[] };
  still: string;
};

const m = (p: string, n: string | number) => `/media/${p}/${n}`;

export const projects: Project[] = [
  {
    slug: "quadcopter",
    short: "Titan",
    name: "Titan: autonomous quadcopter",
    dates: "Aug 2026 to present",
    role: "Personal project",
    solo: true,
    summary: [
      { label: "Mechanical", text: "Designed and 3D printed a custom 50 cm frame in Fusion 360, now on its 6th iteration." },
      { label: "Electrical", text: "Hand-soldered and wired all electronics (ESCs, UBECs, receiver, GPS, compass, power supply, flight controller peripherals) and tuned GPS/compass-based PID loiter through ArduPilot for stable positioning." },
      { label: "Software", text: "Wrote a Python pipeline running on a Raspberry Pi 5 combining YOLOv8 object detection with a custom PID control loop for autonomous object-following, communicating with the flight controller over MAVLink." },
    ],
    stack: ["Fusion 360", "PID", "Python", "YOLOv8", "ArduPilot", "MAVLink"],
    model: { url: "/models/quadcopter.glb", rotation: [-90, 0, 0], exposure: 1.0 },
    feature: { video: "/videos/quadcopter/3.mp4", poster: m("quadcopter", "v3.jpg"), label: "Flight test" },
    strip: [m("quadcopter", "1"), m("quadcopter", "4"), m("quadcopter", "6"), m("quadcopter", "7"), m("quadcopter", "3")],
    archive: {
      photos: [m("quadcopter", "2"), m("quadcopter", "5"), m("quadcopter", "8"), m("quadcopter", "9")],
      videos: [
        { src: "/videos/quadcopter/1.mp4", poster: m("quadcopter", "v1.jpg") },
        { src: "/videos/quadcopter/2.mp4", poster: m("quadcopter", "v2.jpg") },
      ],
    },
    still: "/media/models/quadcopter.webp",
  },
  {
    slug: "ekranoplan",
    short: "Phaethon",
    name: "Phaethon: ground-effect vehicle (ekranoplan)",
    dates: "Aug 2026 to present",
    role: "Personal project",
    solo: true,
    summary: [
      { label: "Concept", text: "Researched cost-effective cargo transport by exploring ground/ram effect." },
      { label: "Build", text: "An 80 cm foam airframe with two brushless motors and 5\" propellers, hand-soldered ESCs, flight controller, GPS, motors/servos. Pitch, elevator, and thrust control, tested across 3S/2S LiPo to probe limits of efficient flight." },
      { label: "Results", text: "Glided on water; measurable ground effect while tethered; draws 45 W at 600 g: 63% less power per kilogram than the quadcopter; weak control authority at low speed. Full-scale ekranoplans see 10 to 20x gains at cruise speed with optimal WIG geometry, suggesting this small low-speed prototype captured only part of the achievable effect." },
    ],
    stack: ["Aerodynamics", "Fusion 360", "Simulation", "ArduPilot"],
    model: { url: "/models/ekranoplan.glb", rotation: [0, 0, 0], exposure: 0.8 },
    feature: { video: "/videos/ekranoplan/1.mp4", poster: m("ekranoplan", "v1.jpg"), label: "On the water" },
    strip: [m("ekranoplan", "1"), m("ekranoplan", "3"), m("ekranoplan", "5"), m("ekranoplan", "9"), m("ekranoplan", "4")],
    archive: {
      photos: [m("ekranoplan", "2"), m("ekranoplan", "6"), m("ekranoplan", "7"), m("ekranoplan", "8")],
      videos: [
        { src: "/videos/ekranoplan/2.mp4", poster: m("ekranoplan", "v2.jpg") },
        { src: "/videos/ekranoplan/3.mp4", poster: m("ekranoplan", "v3.jpg") },
      ],
    },
    still: "/media/models/ekranoplan.webp",
  },
  {
    slug: "overunder",
    short: "Over Under",
    name: "VEX V5: Over Under season",
    dates: "2023 to 2024",
    role: "Team 210T: lead builder, designer, coder, driver (2-person team)",
    summary: [
      { label: "Design & Build", text: "Large focus on innovative design, including two original mechanisms recognized as world firsts: ball-bearing-fitted omni-wheels for higher load capacity/lower rolling friction, and self-locking, detachable large components using linear slides." },
      { label: "Programming & Controls", text: "Implemented PID-based speed control, odometry, and pure pursuit path tracking, plus a boomerang controller for autonomous positioning in PROS, with experimental Monte Carlo localization for robot pose estimation." },
      { label: "Results", text: "9 awards, VEX World Championship Build Award, top-100 global/40,000+ teams, top-5 Canada, top 0.5% worldwide, international recognition." },
    ],
    stack: ["Inventor Pro", "C++", "PROS", "PID", "Odometry"],
    model: { url: "/models/overunder.glb", rotation: [0, 0, 0], exposure: 0.55 },
    youtube: { id: "OGq2yLE5gq0", label: "Pit interview" },
    strip: [m("overunder", "1"), m("overunder", "4"), m("overunder", "6"), m("overunder", "7"), m("overunder", "2")],
    archive: {
      photos: [m("overunder", "3"), m("overunder", "5"), m("overunder", "8"), m("overunder", "9")],
      videos: [
        { src: "/videos/overunder/1.mp4", poster: m("overunder", "v1.jpg") },
        { src: "/videos/overunder/2.mp4", poster: m("overunder", "v2.jpg") },
        { src: "/videos/overunder/3.mp4", poster: m("overunder", "v3.jpg") },
        { src: "/videos/overunder/4.mp4", poster: m("overunder", "v4.jpg") },
      ],
    },
    still: "/media/models/overunder.webp",
  },
  {
    slug: "vex-highstakes",
    short: "High Stakes",
    name: "VEX V5: High Stakes season",
    dates: "2024 to 2025",
    role: "Team 210Z: lead builder, designer, coder, robot driver",
    summary: [
      { label: "Design & Build", text: "Designed and machined competition robot subsystems using CAD (Inventor Professional 2025), iterating drivetrain and manipulator mechanisms across a 10-month build season." },
      { label: "Software", text: "Rewrote the entire codebase from the ground up as a fully custom software stack, using outside libraries only for non-core support like GIF display and LED configuration. Added color-based object tracking with the VEX Vision Sensor to detect and react to game elements in real time." },
      { label: "Results", text: "14 competition awards, top-250 global ranking." },
    ],
    stack: ["Inventor Pro", "C++", "PROS", "CNC", "Git"],
    model: { url: "/models/highstakes.glb", rotation: [90, 0, 0], exposure: 0.55 },
    youtube: { id: "51CzfAAcYG0", label: "Reveal video" },
    logbook: "/highstakes logbook.pdf",
    strip: [m("highstakes", "1"), m("highstakes", "3"), m("highstakes", "5"), m("highstakes", "2"), m("highstakes", "6")],
    archive: {
      photos: [m("highstakes", "4")],
      videos: [1, 2, 3, 4, 5, 6].map((n) => ({ src: `/videos/highstakes/${n}.mp4`, poster: m("highstakes", `v${n}.jpg`) })),
    },
    still: "/media/models/highstakes.webp",
  },
];

export const alts: Record<string, string> = {
  "/media/quadcopter/1": "Titan on the grass beside a store-bought DJI drone",
  "/media/quadcopter/3": "The bare 3D-printed frame before wiring",
  "/media/quadcopter/4": "Titan's flight controller, GPS module and hand-soldered wiring up close",
  "/media/quadcopter/6": "Electrical schematic of the autonomous vision drone",
  "/media/quadcopter/7": "CFD simulation of airflow over the quadcopter",
  "/media/ekranoplan/1": "Hand-drawn wiring diagram: ESCs, power distribution board, flight controller",
  "/media/ekranoplan/3": "Bench test on a scale with the motors and battery connected",
  "/media/ekranoplan/4": "The foam airframe during the build",
  "/media/ekranoplan/5": "CFD simulation of air flowing under the wing in ground effect",
  "/media/ekranoplan/9": "Fusion 360 render of the ekranoplan",
  "/media/overunder/1": "Robot 210T on a table at a competition",
  "/media/overunder/2": "CAD render of the Over Under robot",
  "/media/overunder/4": "Team 210T with the award at the VEX World Championship",
  "/media/overunder/6": "The robot holding a green triball",
  "/media/overunder/7": "The robot on the competition field",
  "/media/highstakes/1": "Canadian teams on stage at the 2025 VEX World Championship",
  "/media/highstakes/2": "The High Stakes robot scoring rings on a stake",
  "/media/highstakes/3": "The robot in the workshop mid-build",
  "/media/highstakes/5": "The robot with a stack of red rings",
  "/media/highstakes/6": "The robot on the field next to a yellow stake",
};

export const bySlug = Object.fromEntries(projects.map((p) => [p.slug, p]));

export const contact = {
  email: "maxwell.yb.li@gmail.com",
  links: [
    { label: "GitHub", url: "https://github.com/MeerMax8" },
    { label: "LinkedIn", url: "https://linkedin.com/in/maxwell-li-35497132b/" },
    { label: "Discord", url: "https://discord.com/users/meermax8" },
    { label: "Instagram", url: "https://instagram.com/maxwell.li.8" },
  ],
};
