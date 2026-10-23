import fs from "fs";
import path from "path";

interface AvatarDef {
  file: string;
  name: string;
  bgGradStart: string;
  bgGradEnd: string;
  skinTone: string;
  skinShadow: string;
  hairColor: string;
  clothingColor: string;
  collarColor: string;
  gender: "male" | "female";
  style: "glasses" | "headset" | "tie" | "longhair" | "bob" | "short" | "ponytail";
}

const AVATARS: AvatarDef[] = [
  {
    file: "acm-001.svg",
    name: "Juan Carlo Mendoza (VP)",
    bgGradStart: "#1e3a8a",
    bgGradEnd: "#3b82f6",
    skinTone: "#f5d0b5",
    skinShadow: "#e2b899",
    hairColor: "#1e293b",
    clothingColor: "#0f172a",
    collarColor: "#ffffff",
    gender: "male",
    style: "glasses",
  },
  {
    file: "acm-002.svg",
    name: "Maria Cristina Reyes (Lead Solutions Architect)",
    bgGradStart: "#065f46",
    bgGradEnd: "#10b981",
    skinTone: "#fcdbc4",
    skinShadow: "#e8c2a9",
    hairColor: "#292524",
    clothingColor: "#064e3b",
    collarColor: "#a7f3d0",
    gender: "female",
    style: "longhair",
  },
  {
    file: "acm-003.svg",
    name: "Angelo Gabriel Santos (Full Stack Engineer)",
    bgGradStart: "#3730a3",
    bgGradEnd: "#6366f1",
    skinTone: "#f3cbb1",
    skinShadow: "#deb396",
    hairColor: "#18181b",
    clothingColor: "#312e81",
    collarColor: "#e0e7ff",
    gender: "male",
    style: "short",
  },
  {
    file: "acm-004.svg",
    name: "Patricia Marie Bautista (HR Specialist)",
    bgGradStart: "#831843",
    bgGradEnd: "#ec4899",
    skinTone: "#fae2d0",
    skinShadow: "#e5c5b0",
    hairColor: "#451a03",
    clothingColor: "#701a75",
    collarColor: "#fce7f3",
    gender: "female",
    style: "bob",
  },
  {
    file: "acm-005.svg",
    name: "Mark Anthony Dela Cruz (Support)",
    bgGradStart: "#155e75",
    bgGradEnd: "#06b6d4",
    skinTone: "#eec4a8",
    skinShadow: "#d6a98b",
    hairColor: "#27272a",
    clothingColor: "#164e63",
    collarColor: "#cffafe",
    gender: "male",
    style: "headset",
  },
  {
    file: "acm-006.svg",
    name: "Rommel Joshua Tan (Logistics)",
    bgGradStart: "#9a3412",
    bgGradEnd: "#f97316",
    skinTone: "#e5b796",
    skinShadow: "#cb9977",
    hairColor: "#1c1917",
    clothingColor: "#7c2d12",
    collarColor: "#ffedd5",
    gender: "male",
    style: "short",
  },
  {
    file: "acm-007.svg",
    name: "Mary Grace Villanueva (Finance Clerk)",
    bgGradStart: "#115e59",
    bgGradEnd: "#14b8a6",
    skinTone: "#f7d7c0",
    skinShadow: "#dfbca2",
    hairColor: "#262626",
    clothingColor: "#134e4a",
    collarColor: "#ccfbf1",
    gender: "female",
    style: "ponytail",
  },
  {
    file: "acm-008.svg",
    name: "Atty. Fernando Miguel De Castro (Legal)",
    bgGradStart: "#334155",
    bgGradEnd: "#64748b",
    skinTone: "#edd0be",
    skinShadow: "#d5b4a0",
    hairColor: "#475569",
    clothingColor: "#0f172a",
    collarColor: "#ffffff",
    gender: "male",
    style: "tie",
  },
  {
    file: "acm-009.svg",
    name: "Karen Joy Soriano (UI/UX)",
    bgGradStart: "#701a75",
    bgGradEnd: "#d946ef",
    skinTone: "#fce1d2",
    skinShadow: "#e6c3af",
    hairColor: "#3b0764",
    clothingColor: "#581c87",
    collarColor: "#fae8ff",
    gender: "female",
    style: "bob",
  },
  {
    file: "acm-010.svg",
    name: "Leandro Rafael Ramos (IT Support)",
    bgGradStart: "#1e40af",
    bgGradEnd: "#38bdf8",
    skinTone: "#e9c1a5",
    skinShadow: "#d1a586",
    hairColor: "#171717",
    clothingColor: "#1e3a8a",
    collarColor: "#bae6fd",
    gender: "male",
    style: "short",
  },
];

function generateSvg(a: AvatarDef): string {
  const gradId = `bg_${a.file.replace(".", "_")}`;

  let hairElement = "";
  if (a.gender === "male") {
    if (a.style === "glasses") {
      hairElement = `
        <!-- Male side-part hair -->
        <path d="M42 46 C42 26, 86 26, 86 46 C86 36, 78 30, 64 30 C50 30, 42 36, 42 46 Z" fill="${a.hairColor}" />
        <path d="M40 44 C38 52, 38 60, 42 63 C42 54, 44 48, 48 44 Z" fill="${a.hairColor}" />
        <path d="M86 44 C88 52, 88 60, 84 63 C84 54, 82 48, 78 44 Z" fill="${a.hairColor}" />
        <path d="M42 38 C54 32, 74 34, 85 43 C72 38, 52 38, 42 44 Z" fill="${a.hairColor}" />
      `;
    } else {
      hairElement = `
        <!-- Modern crew cut -->
        <path d="M40 48 C39 28, 89 28, 88 48 C86 35, 78 32, 64 32 C50 32, 42 35, 40 48 Z" fill="${a.hairColor}" />
        <path d="M40 46 C38 52, 38 58, 41 60 C42 52, 43 47, 46 45 Z" fill="${a.hairColor}" />
        <path d="M88 46 C90 52, 90 58, 87 60 C86 52, 85 47, 82 45 Z" fill="${a.hairColor}" />
      `;
    }
  } else {
    // female hair
    if (a.style === "longhair") {
      hairElement = `
        <!-- Long wavy hair background -->
        <path d="M35 52 C32 75, 34 98, 44 110 C40 92, 38 72, 40 54 Z" fill="${a.hairColor}" />
        <path d="M93 52 C96 75, 94 98, 84 110 C88 92, 90 72, 88 54 Z" fill="${a.hairColor}" />
        <!-- Top volume -->
        <path d="M36 48 C36 24, 92 24, 92 48 C92 34, 82 28, 64 28 C46 28, 36 34, 36 48 Z" fill="${a.hairColor}" />
        <path d="M36 46 C48 38, 70 38, 92 46 C78 42, 50 42, 36 46 Z" fill="${a.hairColor}" />
      `;
    } else if (a.style === "bob") {
      hairElement = `
        <!-- Sleek Bob cut -->
        <path d="M36 50 C34 68, 38 82, 44 86 C40 76, 38 64, 40 52 Z" fill="${a.hairColor}" />
        <path d="M92 50 C94 68, 90 82, 84 86 C88 76, 90 64, 88 52 Z" fill="${a.hairColor}" />
        <path d="M37 46 C37 25, 91 25, 91 46 C91 32, 80 29, 64 29 C48 29, 37 32, 37 46 Z" fill="${a.hairColor}" />
        <path d="M37 46 C48 42, 60 42, 68 45 C60 43, 46 43, 37 46 Z" fill="${a.hairColor}" />
      `;
    } else {
      hairElement = `
        <!-- High ponytail -->
        <path d="M76 28 C86 18, 96 22, 94 36 C92 44, 86 46, 80 40 Z" fill="${a.hairColor}" />
        <path d="M38 48 C38 27, 90 27, 90 48 C90 35, 78 30, 64 30 C50 30, 38 35, 38 48 Z" fill="${a.hairColor}" />
      `;
    }
  }

  // Accessories
  let accessoryElement = "";
  if (a.style === "glasses") {
    accessoryElement = `
      <!-- Glasses -->
      <rect x="47" y="52" width="14" height="10" rx="3" fill="none" stroke="#0f172a" stroke-width="1.8" />
      <rect x="67" y="52" width="14" height="10" rx="3" fill="none" stroke="#0f172a" stroke-width="1.8" />
      <line x1="61" y1="56" x2="67" y2="56" stroke="#0f172a" stroke-width="1.8" />
      <line x1="43" y1="55" x2="47" y2="55" stroke="#0f172a" stroke-width="1.5" />
      <line x1="81" y1="55" x2="85" y2="55" stroke="#0f172a" stroke-width="1.5" />
    `;
  } else if (a.style === "headset") {
    accessoryElement = `
      <!-- Headset -->
      <path d="M36 56 C36 38, 92 38, 92 56" fill="none" stroke="#334155" stroke-width="2.5" />
      <rect x="34" y="54" width="4" height="12" rx="2" fill="#0f172a" />
      <rect x="90" y="54" width="4" height="12" rx="2" fill="#0f172a" />
      <path d="M92 64 C92 74, 84 76, 74 76" fill="none" stroke="#334155" stroke-width="1.5" />
      <circle cx="72" cy="76" r="2.5" fill="#0f172a" />
    `;
  } else if (a.style === "tie") {
    accessoryElement = `
      <!-- Red/Navy Corporate Tie -->
      <polygon points="62,88 66,88 68,118 64,122 60,118" fill="#991b1b" />
      <polygon points="61,85 67,85 65,89 63,89" fill="#7f1d1d" />
    `;
  }

  return `<svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${a.bgGradStart}" />
      <stop offset="100%" stop-color="${a.bgGradEnd}" />
    </linearGradient>
    <clipPath id="circleClip">
      <circle cx="64" cy="64" r="64" />
    </clipPath>
  </defs>

  <g clip-path="url(#circleClip)">
    <!-- Vibrant Background -->
    <rect width="128" height="128" fill="url(#${gradId})" />

    <!-- Torso / Shoulders -->
    <path d="M22 128 C22 96, 42 90, 64 90 C86 90, 106 96, 106 128 Z" fill="${a.clothingColor}" />

    <!-- Shirt / Collar -->
    <polygon points="56,88 64,102 72,88" fill="${a.collarColor}" />
    <path d="M52 86 L64 100 L56 94 Z" fill="#e2e8f0" />
    <path d="M76 86 L64 100 L72 94 Z" fill="#cbd5e1" />

    <!-- Neck & Shadow -->
    <rect x="56" y="70" width="16" height="20" rx="3" fill="${a.skinShadow}" />
    <rect x="57" y="72" width="14" height="18" rx="2" fill="${a.skinTone}" />

    <!-- Head / Face -->
    <ellipse cx="64" cy="58" rx="22" ry="24" fill="${a.skinTone}" />

    <!-- Ears -->
    <ellipse cx="41" cy="59" rx="3.5" ry="6" fill="${a.skinTone}" />
    <ellipse cx="87" cy="59" rx="3.5" ry="6" fill="${a.skinTone}" />
    <ellipse cx="41" cy="59" rx="1.5" ry="3" fill="${a.skinShadow}" />
    <ellipse cx="87" cy="59" rx="1.5" ry="3" fill="${a.skinShadow}" />

    <!-- Eyebrows -->
    <path d="M49 48 Q54 46, 59 48" stroke="${a.hairColor}" stroke-width="1.8" stroke-linecap="round" fill="none" />
    <path d="M69 48 Q74 46, 79 48" stroke="${a.hairColor}" stroke-width="1.8" stroke-linecap="round" fill="none" />

    <!-- Eyes -->
    <circle cx="54" cy="55" r="2.8" fill="#0f172a" />
    <circle cx="74" cy="55" r="2.8" fill="#0f172a" />
    <circle cx="53" cy="54" r="0.8" fill="#ffffff" />
    <circle cx="73" cy="54" r="0.8" fill="#ffffff" />

    <!-- Nose -->
    <path d="M63 56 Q64 63, 62 64 L66 64" stroke="${a.skinShadow}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />

    <!-- Smile / Lips -->
    <path d="M57 69 Q64 74, 71 69" stroke="#b91c1c" stroke-width="1.8" stroke-linecap="round" fill="none" />

    <!-- Cheeks blush -->
    <circle cx="48" cy="62" r="3" fill="#f43f5e" opacity="0.25" />
    <circle cx="80" cy="62" r="3" fill="#f43f5e" opacity="0.25" />

    <!-- Hair Overlay -->
    ${hairElement}

    <!-- Accessories (glasses, headset, tie) -->
    ${accessoryElement}
  </g>
</svg>`;
}

export function generateAllDemoAvatars() {
  const targetDir = path.join(process.cwd(), "public", "demo-avatars");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const a of AVATARS) {
    const svgContent = generateSvg(a);
    const dest = path.join(targetDir, a.file);
    fs.writeFileSync(dest, svgContent, "utf8");
  }

  console.log(`✅ Generated ${AVATARS.length} unique vector avatars in public/demo-avatars/`);
}

if (require.main === module) {
  generateAllDemoAvatars();
}
