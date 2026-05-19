const PERSONA_SVGS = {
  default: `<svg width="80" height="96" viewBox="0 0 44 52" style="image-rendering:pixelated">
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#1F2937" stroke="#9CA3AF" stroke-width="1.5"/>
    <rect x="12" y="10" width="6" height="6" fill="#D1D5DB"/>
    <rect x="26" y="10" width="6" height="6" fill="#D1D5DB"/>
    <rect class="pupil-l" x="14" y="12" width="3" height="3" fill="#0F172A"/>
    <rect class="pupil-r" x="28" y="12" width="3" height="3" fill="#0F172A"/>
    <rect x="14" y="22" width="4" height="3" fill="#D1D5DB"/>
    <rect x="18" y="25" width="8" height="3" fill="#D1D5DB"/>
    <rect x="26" y="22" width="4" height="3" fill="#D1D5DB"/>
    <rect x="10" y="32" width="24" height="16" rx="2" fill="#1F2937" stroke="#6B7280" stroke-width="1"/>
    <rect x="13" y="49" width="6" height="8" rx="1" fill="#1F2937" stroke="#6B7280" stroke-width="1"/>
    <rect x="25" y="49" width="6" height="8" rx="1" fill="#1F2937" stroke="#6B7280" stroke-width="1"/>
  </svg>`,

  senior: `<svg width="80" height="96" viewBox="0 0 44 52" style="image-rendering:pixelated">
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#1F2937" stroke="#9CA3AF" stroke-width="1.5"/>
    <rect x="8" y="2" width="28" height="4" fill="#E5E7EB"/>
    <rect x="6" y="4" width="4" height="4" fill="#E5E7EB"/>
    <rect x="34" y="4" width="4" height="4" fill="#E5E7EB"/>
    <rect x="12" y="11" width="6" height="5" fill="#D1D5DB"/>
    <rect x="26" y="11" width="6" height="5" fill="#D1D5DB"/>
    <rect class="pupil-l" x="14" y="12" width="3" height="3" fill="#0F172A"/>
    <rect class="pupil-r" x="28" y="12" width="3" height="3" fill="#0F172A"/>
    <rect x="10" y="9" width="4" height="1" fill="#9CA3AF" opacity="0.5"/>
    <rect x="30" y="9" width="4" height="1" fill="#9CA3AF" opacity="0.5"/>
    <rect x="14" y="22" width="4" height="3" fill="#D1D5DB"/>
    <rect x="18" y="25" width="8" height="3" fill="#D1D5DB"/>
    <rect x="26" y="22" width="4" height="3" fill="#D1D5DB"/>
    <rect x="10" y="32" width="24" height="16" rx="2" fill="#1F2937" stroke="#6B7280" stroke-width="1"/>
    <rect x="13" y="49" width="6" height="8" rx="1" fill="#1F2937" stroke="#6B7280" stroke-width="1"/>
    <rect x="25" y="49" width="6" height="8" rx="1" fill="#1F2937" stroke="#6B7280" stroke-width="1"/>
  </svg>`,

  busy: `<svg width="80" height="96" viewBox="0 0 44 52" style="image-rendering:pixelated">
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#1F2937" stroke="#9CA3AF" stroke-width="1.5"/>
    <rect x="12" y="10" width="6" height="6" fill="#D1D5DB"/>
    <rect x="26" y="10" width="6" height="6" fill="#D1D5DB"/>
    <rect class="pupil-l" x="14" y="12" width="3" height="3" fill="#0F172A"/>
    <rect class="pupil-r" x="28" y="12" width="3" height="3" fill="#0F172A"/>
    <rect x="14" y="22" width="4" height="3" fill="#D1D5DB"/>
    <rect x="18" y="25" width="8" height="3" fill="#D1D5DB"/>
    <rect x="26" y="22" width="4" height="3" fill="#D1D5DB"/>
    <rect x="34" y="8" width="4" height="6" rx="2" fill="#9CA3AF" opacity="0.7"/>
    <rect x="10" y="32" width="24" height="16" rx="2" fill="#1F2937" stroke="#6B7280" stroke-width="1"/>
    <rect x="13" y="49" width="6" height="8" rx="1" fill="#1F2937" stroke="#6B7280" stroke-width="1"/>
    <rect x="25" y="49" width="6" height="8" rx="1" fill="#1F2937" stroke="#6B7280" stroke-width="1"/>
  </svg>`,

  thinking: `<svg width="80" height="96" viewBox="0 0 62 52" style="image-rendering:pixelated">
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#1F2937" stroke="#9CA3AF" stroke-width="1.5"/>
    <rect x="12" y="12" width="6" height="6" fill="#D1D5DB"/>
    <rect x="26" y="12" width="6" height="6" fill="#D1D5DB"/>
    <rect x="12" y="14" width="3" height="3" fill="#0F172A"/>
    <rect x="26" y="14" width="3" height="3" fill="#0F172A"/>
    <rect x="14" y="22" width="4" height="3" fill="#6B7280"/>
    <rect x="18" y="24" width="4" height="3" fill="#6B7280"/>
    <rect x="22" y="22" width="4" height="3" fill="#6B7280"/>
    <rect x="10" y="32" width="24" height="16" rx="2" fill="#1F2937" stroke="#6B7280" stroke-width="1"/>
    <rect x="36" y="28" width="14" height="18" rx="1" fill="#111827" stroke="#4B5563" stroke-width="1"/>
    <rect x="38" y="31" width="10" height="2" fill="#6B7280" opacity="0.6"/>
    <rect x="38" y="35" width="8" height="2" fill="#6B7280" opacity="0.4"/>
    <rect x="38" y="39" width="9" height="2" fill="#6B7280" opacity="0.4"/>
    <rect x="13" y="49" width="6" height="8" rx="1" fill="#1F2937" stroke="#6B7280" stroke-width="1"/>
    <rect x="25" y="49" width="6" height="8" rx="1" fill="#1F2937" stroke="#6B7280" stroke-width="1"/>
    <circle cx="47" cy="11" r="4" fill="#111827" stroke="#9CA3AF" stroke-width="1"/>
    <text x="45" y="14" font-size="5" fill="#9CA3AF" font-family="monospace">?</text>
    <circle cx="43" cy="20" r="2" fill="#9CA3AF" opacity="0.4"/>
    <circle cx="45" cy="16" r="1.5" fill="#9CA3AF" opacity="0.25"/>
  </svg>`,

  scanning: `<svg width="80" height="96" viewBox="0 0 44 52" style="image-rendering:pixelated">
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#1F2937" stroke="#9CA3AF" stroke-width="1.5"/>
    <rect x="12" y="10" width="6" height="6" fill="#D1D5DB"/>
    <rect x="26" y="13" width="6" height="3" fill="#D1D5DB"/>
    <rect x="14" y="12" width="3" height="3" fill="#0F172A"/>
    <rect x="14" y="22" width="4" height="3" fill="#6B7280"/>
    <rect x="18" y="24" width="4" height="3" fill="#6B7280"/>
    <rect x="22" y="22" width="4" height="3" fill="#6B7280"/>
    <rect class="scan-line" x="6" y="2" width="32" height="2" fill="#9CA3AF" opacity="0.35"/>
    <rect x="10" y="32" width="24" height="16" rx="2" fill="#1F2937" stroke="#6B7280" stroke-width="1"/>
    <rect x="13" y="49" width="6" height="8" rx="1" fill="#1F2937" stroke="#6B7280" stroke-width="1"/>
    <rect x="25" y="49" width="6" height="8" rx="1" fill="#1F2937" stroke="#6B7280" stroke-width="1"/>
  </svg>`,

  ok: `<svg width="80" height="96" viewBox="0 0 44 52" style="image-rendering:pixelated">
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#1F2937" stroke="#10B981" stroke-width="1.5"/>
    <rect x="12" y="12" width="6" height="3" fill="#D1D5DB"/>
    <rect x="12" y="10" width="6" height="2" fill="#1F2937"/>
    <rect x="26" y="12" width="6" height="3" fill="#D1D5DB"/>
    <rect x="26" y="10" width="6" height="2" fill="#1F2937"/>
    <rect x="14" y="21" width="4" height="3" fill="#D1D5DB"/>
    <rect x="18" y="23" width="8" height="3" fill="#D1D5DB"/>
    <rect x="26" y="21" width="4" height="3" fill="#D1D5DB"/>
    <rect x="10" y="18" width="4" height="2" fill="#9CA3AF" opacity="0.3"/>
    <rect x="30" y="18" width="4" height="2" fill="#9CA3AF" opacity="0.3"/>
    <rect x="10" y="32" width="24" height="16" rx="2" fill="#1F2937" stroke="#10B981" stroke-width="1"/>
    <rect x="34" y="30" width="6" height="10" rx="1" fill="#1F2937" stroke="#10B981" stroke-width="1"/>
    <rect x="34" y="26" width="6" height="6" rx="1" fill="#1F2937" stroke="#10B981" stroke-width="1"/>
    <rect x="13" y="49" width="6" height="8" rx="1" fill="#1F2937" stroke="#10B981" stroke-width="1"/>
    <rect x="25" y="49" width="6" height="8" rx="1" fill="#1F2937" stroke="#10B981" stroke-width="1"/>
  </svg>`,

  warning: `<svg width="80" height="96" viewBox="0 0 44 52" style="image-rendering:pixelated">
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#1F2937" stroke="#F59E0B" stroke-width="1.5"/>
    <rect x="12" y="10" width="6" height="6" fill="#D1D5DB"/>
    <rect x="26" y="10" width="6" height="6" fill="#D1D5DB"/>
    <rect x="14" y="12" width="3" height="3" fill="#0F172A"/>
    <rect x="28" y="12" width="3" height="3" fill="#0F172A"/>
    <rect x="12" y="7" width="6" height="2" fill="#9CA3AF"/>
    <rect x="26" y="7" width="6" height="2" fill="#9CA3AF"/>
    <rect x="16" y="23" width="12" height="3" fill="#D1D5DB"/>
    <rect x="14" y="22" width="4" height="2" fill="#D1D5DB"/>
    <rect x="26" y="22" width="4" height="2" fill="#D1D5DB"/>
    <rect x="34" y="8" width="4" height="6" rx="2" fill="#9CA3AF" opacity="0.7"/>
    <rect x="10" y="32" width="24" height="16" rx="2" fill="#1F2937" stroke="#F59E0B" stroke-width="1"/>
    <rect x="13" y="49" width="6" height="8" rx="1" fill="#1F2937" stroke="#F59E0B" stroke-width="1"/>
    <rect x="25" y="49" width="6" height="8" rx="1" fill="#1F2937" stroke="#F59E0B" stroke-width="1"/>
  </svg>`,

  critical: `<svg width="80" height="96" viewBox="0 0 44 52" style="image-rendering:pixelated">
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#1F2937" stroke="#EF4444" stroke-width="1.5"/>
    <rect x="12" y="12" width="6" height="6" fill="#D1D5DB"/>
    <rect x="26" y="12" width="6" height="6" fill="#D1D5DB"/>
    <rect x="14" y="12" width="3" height="3" fill="#0F172A"/>
    <rect x="28" y="12" width="3" height="3" fill="#0F172A"/>
    <rect x="12" y="8" width="3" height="2" fill="#9CA3AF"/>
    <rect x="15" y="7" width="3" height="2" fill="#9CA3AF"/>
    <rect x="29" y="7" width="3" height="2" fill="#9CA3AF"/>
    <rect x="32" y="8" width="3" height="2" fill="#9CA3AF"/>
    <rect x="16" y="24" width="4" height="2" fill="#D1D5DB"/>
    <rect x="20" y="23" width="4" height="2" fill="#D1D5DB"/>
    <rect x="24" y="24" width="4" height="2" fill="#D1D5DB"/>
    <rect x="12" y="18" width="2" height="6" rx="1" fill="#9CA3AF" opacity="0.8"/>
    <rect x="30" y="18" width="2" height="6" rx="1" fill="#9CA3AF" opacity="0.8"/>
    <rect x="10" y="32" width="24" height="16" rx="2" fill="#1F2937" stroke="#EF4444" stroke-width="1"/>
    <rect x="34" y="26" width="6" height="14" rx="1" fill="#1F2937" stroke="#EF4444" stroke-width="1"/>
    <rect x="34" y="24" width="8" height="6" rx="2" fill="#1F2937" stroke="#EF4444" stroke-width="1"/>
    <rect x="13" y="49" width="6" height="8" rx="1" fill="#1F2937" stroke="#EF4444" stroke-width="1"/>
    <rect x="25" y="49" width="6" height="8" rx="1" fill="#1F2937" stroke="#EF4444" stroke-width="1"/>
  </svg>`,
};

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

function extractFeatures(desc) {
  const d = (desc || '').toLowerCase();

  let gender = 'neutral';
  if (/여자|여성|여대생|girl|female/.test(d)) gender = 'female';
  else if (/남자|남성|남대생|boy|male/.test(d)) gender = 'male';

  let hair = 'default';
  if (/장발|긴\s?머리|long.?hair/.test(d)) hair = 'long';
  else if (/단발|짧은\s?머리|숏컷|short.?hair/.test(d)) hair = 'short';
  else if (/대머리|bald/.test(d)) hair = 'bald';

  let age = 'young';
  if (/10대|십대/.test(d)) age = 'teen';
  else if (/20대|이십대/.test(d)) age = 'young';
  else if (/30대|40대|삼십|사십/.test(d)) age = 'adult';
  else if (/50대|60대|오십|육십|중년|장년|노인|어르신/.test(d)) age = 'senior';

  let build = 'default';
  if (/키\s?크|tall|장신/.test(d)) build = 'tall';
  else if (/키\s?작|단신/.test(d)) build = 'short_build';
  else if (/뚱뚱|비만|heavy|chubby/.test(d)) build = 'heavy';

  let style = 'default';
  if (/학생|대학생|고등학생/.test(d)) style = 'student';
  else if (/직장인|회사원|사무직/.test(d)) style = 'worker';
  else if (/바쁜|프리랜서|busy/.test(d)) style = 'busy';
  else if (/디지털.{0,4}낮|낮.{0,4}디지털|리터러시.{0,4}낮/.test(d)) style = 'lowliteracy';

  return { gender, hair, age, build, style };
}

function buildPersonaSvg(features, strokeColor, animOpts) {
  const { gender, hair, age, build, style } = Object.assign(
    { gender: 'neutral', hair: 'default', age: 'young', build: 'default', style: 'default' },
    features
  );
  const stroke = strokeColor || '#9CA3AF';
  const { state = 'idle', facingLeft = false, eyeOX = 1, eyeOY = 0, blinkScale = 1 } = animOpts || {};

  // Eye offset: absolute coords, no CSS transform (fixes scaleX(-1) bug)
  const ex = facingLeft ? -eyeOX : eyeOX;
  const ey = eyeOY;
  const bs = blinkScale;

  // Per-state leg poses
  const LEGS = {
    walk:   (s) => `<rect x="13" y="46" width="6" height="8" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1"/>
                    <rect x="25" y="46" width="6" height="8" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1"/>`,
    idle:   (s) => `<rect x="13" y="46" width="6" height="8" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1"/>
                    <rect x="25" y="46" width="6" height="8" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1"/>`,
    jump:   (s) => `<rect x="11" y="44" width="6" height="8" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1" transform="rotate(-20 14 48)"/>
                    <rect x="27" y="44" width="6" height="8" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1" transform="rotate(20 30 48)"/>`,
    sit:    (s) => `<rect x="10" y="48" width="10" height="5" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1"/>
                    <rect x="24" y="48" width="10" height="5" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1"/>`,
    run:    (s) => `<rect x="11" y="44" width="6" height="9" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1" transform="rotate(-30 14 46)"/>
                    <rect x="27" y="44" width="6" height="9" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1" transform="rotate(15 30 46)"/>`,
    thrown: (s) => `<rect x="11" y="44" width="6" height="8" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1" transform="rotate(-25 14 48)"/>
                    <rect x="27" y="44" width="6" height="8" rx="1" fill="#1F2937" stroke="${s}" stroke-width="1" transform="rotate(25 30 48)"/>`,
  };

  // Per-state arm poses
  const ARMS = {
    walk:   (s) => `<rect x="4"  y="34" width="6" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8"/>
                    <rect x="34" y="34" width="6" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8"/>`,
    idle:   (s) => `<rect x="5"  y="36" width="5" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8"/>
                    <rect x="34" y="36" width="5" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8"/>`,
    jump:   (s) => `<rect x="2"  y="28" width="6" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8" transform="rotate(-40 5 30)"/>
                    <rect x="36" y="28" width="6" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8" transform="rotate(40 39 30)"/>`,
    sit:    (s) => `<rect x="5"  y="38" width="5" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8"/>
                    <rect x="34" y="38" width="5" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8"/>`,
    run:    (s) => `<rect x="2"  y="30" width="6" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8" transform="rotate(-20 5 32)"/>
                    <rect x="36" y="30" width="6" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8" transform="rotate(20 39 32)"/>`,
    thrown: (s) => `<rect x="2"  y="26" width="6" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8" transform="rotate(-50 5 28)"/>
                    <rect x="36" y="26" width="6" height="3" rx="1" fill="#1F2937" stroke="${s}" stroke-width="0.8" transform="rotate(50 39 28)"/>`,
  };

  // Per-state mouth
  const MOUTHS = {
    walk:   `<rect x="14" y="22" width="4" height="3" fill="#D1D5DB"/><rect x="18" y="25" width="8" height="3" fill="#D1D5DB"/><rect x="26" y="22" width="4" height="3" fill="#D1D5DB"/>`,
    idle:   `<rect x="14" y="22" width="4" height="3" fill="#D1D5DB"/><rect x="18" y="25" width="8" height="3" fill="#D1D5DB"/><rect x="26" y="22" width="4" height="3" fill="#D1D5DB"/>`,
    jump:   `<rect x="16" y="23" width="12" height="3" fill="#6B7280"/>`,
    sit:    `<rect x="14" y="22" width="4" height="3" fill="#D1D5DB"/><rect x="18" y="25" width="8" height="3" fill="#D1D5DB"/><rect x="26" y="22" width="4" height="3" fill="#D1D5DB"/>`,
    run:    `<rect x="16" y="24" width="12" height="2" fill="#6B7280"/>`,
    thrown: `<rect x="16" y="23" width="4" height="3" fill="#D1D5DB"/><rect x="24" y="23" width="4" height="3" fill="#D1D5DB"/>`,
  };

  const legFn   = LEGS[state]   || LEGS.idle;
  const armFn   = ARMS[state]   || ARMS.idle;
  const mouthSvg = MOUTHS[state] || MOUTHS.idle;

  // Feature-based visuals (unchanged from original)
  const hairColor = age === 'senior' ? '#E5E7EB'
    : gender === 'female' ? '#92400E'
    : '#374151';

  let hairSvg = '';
  if (age === 'senior') {
    hairSvg = `<rect x="8" y="0" width="28" height="5" fill="#E5E7EB"/>
      <rect x="6" y="2" width="4" height="4" fill="#E5E7EB"/>
      <rect x="34" y="2" width="4" height="4" fill="#E5E7EB"/>`;
  } else if (hair === 'long' || (hair === 'default' && gender === 'female')) {
    hairSvg = `<rect x="6" y="0" width="32" height="5" rx="1" fill="${hairColor}"/>
      <rect x="4" y="4" width="4" height="20" rx="1" fill="${hairColor}"/>
      <rect x="36" y="4" width="4" height="20" rx="1" fill="${hairColor}"/>`;
  } else if (hair !== 'bald') {
    hairSvg = `<rect x="8" y="0" width="28" height="4" rx="1" fill="${hairColor}"/>
      <rect x="6" y="2" width="4" height="4" rx="1" fill="${hairColor}"/>
      <rect x="34" y="2" width="4" height="4" rx="1" fill="${hairColor}"/>`;
  }

  const lashes = gender === 'female' ? `
    <rect x="12" y="9" width="2" height="2" fill="#9CA3AF" opacity="0.6"/>
    <rect x="15" y="8" width="2" height="2" fill="#9CA3AF" opacity="0.6"/>
    <rect x="18" y="8" width="2" height="1" fill="#9CA3AF" opacity="0.4"/>
    <rect x="26" y="9" width="2" height="2" fill="#9CA3AF" opacity="0.6"/>
    <rect x="29" y="8" width="2" height="2" fill="#9CA3AF" opacity="0.6"/>
    <rect x="24" y="8" width="2" height="1" fill="#9CA3AF" opacity="0.4"/>` : '';

  const earring = gender === 'female' ? `
    <rect x="3" y="17" width="3" height="3" rx="1" fill="#F472B6" opacity="0.85"/>
    <rect x="38" y="17" width="3" height="3" rx="1" fill="#F472B6" opacity="0.85"/>` : '';

  const glasses = (age === 'senior' || style === 'lowliteracy') ? `
    <rect x="10" y="10" width="8" height="6" rx="1" fill="none" stroke="#9CA3AF" stroke-width="1"/>
    <rect x="26" y="10" width="8" height="6" rx="1" fill="none" stroke="#9CA3AF" stroke-width="1"/>
    <rect x="18" y="12" width="8" height="1" fill="#9CA3AF"/>
    <rect x="8" y="12" width="2" height="1" fill="#9CA3AF"/>
    <rect x="34" y="12" width="2" height="1" fill="#9CA3AF"/>` : '';

  const eyeH = gender === 'female' ? 7 : 6;

  const bodyX = gender === 'female' ? 8 : 10;
  const bodyW = gender === 'female' ? 28 : 24;
  const viewH = build === 'tall' ? 62 : build === 'short_build' ? 52 : 58;
  const bodyH = build === 'tall' ? 20 : build === 'short_build' ? 12 : 16;
  const legsY = 32 + bodyH + 2;

  const bodyExtra = style === 'worker' ? `
    <rect x="20" y="33" width="4" height="8" rx="1" fill="#6B7280"/>
    <rect x="19" y="41" width="6" height="4" rx="1" fill="#4B5563"/>` :
    style === 'busy' ? `
    <rect x="34" y="30" width="5" height="8" rx="1" fill="#374151" stroke="#6B7280" stroke-width="0.5"/>
    <rect x="35" y="31" width="3" height="1" fill="#6B7280" opacity="0.5"/>
    <rect x="35" y="33" width="3" height="1" fill="#6B7280" opacity="0.4"/>` :
    style === 'student' ? `
    <rect x="2" y="34" width="7" height="10" rx="1" fill="#1E3A5F" stroke="#3B82F6" stroke-width="0.5"/>
    <rect x="4" y="32" width="3" height="4" rx="1" fill="none" stroke="#3B82F6" stroke-width="0.5"/>` : '';

  return `<svg width="80" height="96" viewBox="0 0 44 ${viewH}" style="image-rendering:pixelated">
    ${hairSvg}
    ${armFn(stroke)}
    <rect x="6" y="2" width="32" height="28" rx="2" fill="#1F2937" stroke="${stroke}" stroke-width="1.5"/>
    ${lashes}
    <rect x="12" y="10" width="6" height="${eyeH}" fill="#D1D5DB"/>
    <rect x="26" y="10" width="6" height="${eyeH}" fill="#D1D5DB"/>
    <rect x="${14 + ex}" y="${12 + ey}" width="3" height="${3 * bs}" fill="#0F172A"/>
    <rect x="${28 + ex}" y="${12 + ey}" width="3" height="${3 * bs}" fill="#0F172A"/>
    ${earring}${glasses}${mouthSvg}
    <rect x="${bodyX}" y="32" width="${bodyW}" height="${bodyH}" rx="2" fill="#1F2937" stroke="${stroke}" stroke-width="1"/>
    ${bodyExtra}
    ${legFn(stroke)}
  </svg>`;
}

document.addEventListener('alpine:init', () => {
  Alpine.data('personaApp', () => ({
    screen: 'source',
    files: [],
    taskDesc: '',
    dragging: false,
    error: '',
    copied: false,
    detailOpen: false,
    statusStep: 0,
    result: null,
    characterState: 'idle',
    personaFeatures: {},
    personaMinimized: false,
    _thinkInterval: null,

    // Source screen
    sourceMode: 'file',
    sourcePort: '',
    sourcePath: '',
    sourceUrl: '',

    // Target select
    selectedAgeGroup: '',
    selectedSex: '',
    selectedEducation: '',
    selectedRegion: '모두',
    selectedOccupationType: '모두',
    matchedStrata: [],
    totalCount: 0,
    previewPersonas: [],
    castLoading: false,

    // Result sidebar
    resultSection: 'tldr',
    liveThought: '',

    physX: 100,
    physY: 100,

    // animation state machine (non-reactive private vars)
    _animState: 'walk',
    _facingLeft: false,
    _walkPhase: 0,
    _bobY: 0,
    _scaleX: 1,
    _scaleY: 1,

    // jump sub-state
    _jumpVY: 0,
    _jumpY: 0,
    _jumpPhase: 'none',
    _jumpPhaseTimer: 0,

    // sit sub-state
    _sitProgress: 0,
    _sitTimer: 0,

    // run timer
    _runTimer: 0,

    // eye system
    _eyeOX: 1,
    _eyeOY: 0,
    _eyeTargetX: 1,
    _eyeTargetY: 0,
    _eyeTimer: 0,
    _blinkScale: 1,
    _blinkTimer: 0,

    // mouse position
    _mouseX: 0,
    _mouseY: 0,

    // throw velocity (set by onPersonaMousedown)
    _thrownVX: 0,
    _thrownVY: 0,

    // drag/throw infrastructure
    _animFrame: null,
    _idleTimer: null,
    _dragOffset: { x: 0, y: 0 },
    _dragHistory: [],

    steps: [
      { label: '코드 파싱', icon: '📂' },
      { label: '페르소나 매칭', icon: '🧬' },
      { label: 'UX 시뮬레이션', icon: '🔍' },
      { label: '리포트 생성', icon: '📊' },
    ],

    init() {
      this.physX = window.innerWidth * 0.8;
      this.physY = window.innerHeight * 0.7;
      this._mouseX = window.innerWidth * 0.5;
      this._mouseY = window.innerHeight * 0.5;

      window.addEventListener('mousemove', (e) => {
        this._mouseX = e.clientX;
        this._mouseY = Math.min(e.clientY, this._maxY() + 39);
      });

      this._startPhysics();
      this._animState = 'walk';
    },

    get sourceReady() {
      if (this.sourceMode === 'file') return this.files.length > 0;
      if (this.sourceMode === 'localhost') return this.sourcePort.trim().length > 0;
      if (this.sourceMode === 'url') return this.sourceUrl.trim().length > 0;
      return false;
    },

    get sourceLabel() {
      if (this.sourceMode === 'localhost') return `localhost:${this.sourcePort}${this.sourcePath ? '/' + this.sourcePath : ''}`;
      if (this.sourceMode === 'url') return this.sourceUrl || 'URL';
      return `${this.files.length}개 파일`;
    },

    get sourceTargetUrl() {
      if (this.sourceMode === 'localhost') {
        const port = this.sourcePort.trim();
        const path = this.sourcePath.trim();
        return `http://localhost:${port}${path ? '/' + path.replace(/^\//, '') : ''}`;
      }
      if (this.sourceMode === 'url') return this.sourceUrl.trim();
      return null;
    },

    proceedFromSource() {
      if (!this.sourceReady) return;
      this.error = '';
      this.selectedAgeGroup = '';
      this.selectedSex = '';
      this.selectedEducation = '';
      this.selectedRegion = '모두';
      this.selectedOccupationType = '모두';
      this.matchedStrata = [];
      this.totalCount = 0;
      this.previewPersonas = [];
      this.screen = 'target_select';
    },

    get targetSelectReady() {
      return !!(this.selectedAgeGroup && this.selectedSex && this.selectedEducation);
    },

    async fetchBuildCast() {
      if (!this.targetSelectReady) return;
      this.castLoading = true;
      this.matchedStrata = [];
      this.totalCount = 0;
      this.previewPersonas = [];
      try {
        const res = await fetch('/build-cast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            age_group: this.selectedAgeGroup,
            sex: this.selectedSex,
            education: this.selectedEducation,
            region: this.selectedRegion,
            occupation_type: this.selectedOccupationType,
          }),
        });
        if (!res.ok) throw new Error('build-cast');
        const data = await res.json();
        this.matchedStrata = data.matched_strata || [];
        this.totalCount = data.total_count || 0;
        this.previewPersonas = data.preview_personas || [];
      } catch (_) {
        this.error = '매칭 중 오류가 발생했어요.';
      } finally {
        this.castLoading = false;
      }
    },

    handleFiles(e) {
      this.addFiles(Array.from(e.target.files || []));
    },

    handleDrop(e) {
      this.dragging = false;
      this.addFiles(Array.from(e.dataTransfer.files || []));
    },

    addFiles(incoming) {
      const allowed = ['.tsx', '.jsx', '.html', '.vue', '.js', '.ts', '.zip'];
      const filtered = incoming.filter(f =>
        allowed.some(ext => f.name.toLowerCase().endsWith(ext))
      );
      this.files = [...this.files, ...filtered];
    },

    removeFile(i) {
      this.files = this.files.filter((_, idx) => idx !== i);
    },

    _maxX() { return window.innerWidth  - 66; },
    _maxY() { return window.innerHeight - 78 - 80; },

    _floorY(x) {
      const H = 78;
      const cx = x + 33;
      const feetY = this.physY + H;
      const maxY = this._maxY();
      let floor = maxY;
      for (const el of document.querySelectorAll('[data-platform]')) {
        const r = el.getBoundingClientRect();
        if (cx < r.left || cx > r.right) continue;
        const standY = r.top - H;
        if (standY < 0 || standY >= maxY) continue;
        if (r.top >= feetY - 24 && standY < floor) floor = standY;
      }
      return floor;
    },

    _scheduleIdle(delay) {
      clearTimeout(this._idleTimer);
      this._idleTimer = setTimeout(() => {
        const roll = Math.random();
        if (roll < 0.20) {
          this._startJump();
        } else if (roll < 0.35) {
          this._startSit();
        } else {
          this._animState = 'walk';
        }
      }, delay != null ? delay : 600 + Math.random() * 1400);
    },

    _startJump() {
      this._animState = 'jump';
      this._jumpPhase = 'anticipate';
      this._jumpPhaseTimer = 0;
      this._jumpY = 0;
      this._jumpVY = 0;
    },

    _startSit() {
      this._animState = 'sit';
      this._sitProgress = 0;
      this._sitTimer = 0;
    },

    _startPhysics() {
      const GRAVITY = 0.45, DAMPING = 0.52, FRICTION = 0.96;
      const WALK_SPEED = 1.4, RUN_SPEED = 3.2;
      const W = 66, H = 78;
      let lastTime = 0;

      const tickWalk = (dt) => {
        const tx = Math.max(0, Math.min(this._maxX(), this._mouseX - W / 2));
        const ty = this._floorY(tx);
        const dx = tx - this.physX, dy = ty - this.physY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 8) {
          this._animState = 'idle';
          this._bobY = 0; this._scaleX = 1; this._scaleY = 1;
          this._scheduleIdle();
          return;
        }
        const speed = WALK_SPEED * dt;
        this.physX += (dx / dist) * speed;
        this.physY += (dy / dist) * speed;
        this._facingLeft = dx < 0;
        this._walkPhase = (this._walkPhase + 0.06 * dt) % 1;
        const bob = Math.sin(this._walkPhase * Math.PI * 2);
        this._bobY = bob * 3;
        this._scaleX = 1 + Math.abs(bob) * 0.04;
        this._scaleY = 1 - Math.abs(bob) * 0.04;
        this._eyeTargetX = this._facingLeft ? -1 : 1;
      };

      const tickIdle = (dt) => {
        this._bobY = Math.sin(Date.now() / 900) * 1.5;
        this._scaleX = 1; this._scaleY = 1;
        const floor = this._floorY(this.physX);
        if (this.physY < floor - 16) { this._animState = 'walk'; }
        const dx = this._mouseX - W / 2 - this.physX;
        const dy = this._mouseY - H / 2 - this.physY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 40) {
          clearTimeout(this._idleTimer);
          this._animState = 'walk';
        }
      };

      const tickJump = (dt) => {
        this._jumpPhaseTimer += dt;
        if (this._jumpPhase === 'anticipate') {
          const a = Math.min(this._jumpPhaseTimer / 15, 1);
          this._scaleX = 1 + a * 0.18; this._scaleY = 1 - a * 0.22;
          this._bobY = a * 5;
          if (this._jumpPhaseTimer > 15) {
            this._jumpPhase = 'up';
            this._jumpPhaseTimer = 0;
            this._jumpVY = -14;
          }
        } else if (this._jumpPhase === 'up' || this._jumpPhase === 'down') {
          this._jumpVY += GRAVITY * dt;
          this._jumpY -= this._jumpVY * dt;
          this._bobY = -this._jumpY;
          this._scaleX = 0.85; this._scaleY = 1.15;
          if (this._jumpY <= 0 && this._jumpVY > 0) {
            this._jumpY = 0;
            this._jumpPhase = 'land';
            this._jumpPhaseTimer = 0;
          } else {
            this._jumpPhase = this._jumpVY < 0 ? 'up' : 'down';
          }
        } else if (this._jumpPhase === 'land') {
          const l = Math.min(this._jumpPhaseTimer / 12, 1);
          const recover = Math.sin(l * Math.PI);
          this._scaleX = 1 + recover * 0.22; this._scaleY = 1 - recover * 0.28;
          this._bobY = recover * 4;
          if (this._jumpPhaseTimer > 20) {
            this._scaleX = 1; this._scaleY = 1; this._bobY = 0;
            this._jumpPhase = 'none';
            this._animState = 'idle';
            this._scheduleIdle(600 + Math.random() * 1200);
          }
        }
      };

      const tickSit = (dt) => {
        this._sitTimer += dt;
        if (this._sitProgress < 1) {
          this._sitProgress = Math.min(this._sitProgress + 0.04 * dt, 1);
        }
        if (this._sitTimer > 90) {
          this._sitProgress -= 0.04 * dt;
          if (this._sitProgress <= 0) {
            this._sitProgress = 0; this._scaleX = 1; this._scaleY = 1; this._bobY = 0;
            this._animState = 'idle';
            this._scheduleIdle(400);
            return;
          }
        }
        this._scaleY = 1 - this._sitProgress * 0.32;
        this._scaleX = 1 + this._sitProgress * 0.18;
        this._bobY = this._sitProgress * 8;
      };

      const tickRun = (dt) => {
        const tx = Math.max(0, Math.min(this._maxX(), this._mouseX - W / 2));
        const ty = Math.max(0, Math.min(this._maxY(), this._mouseY - H / 2));
        const dx = tx - this.physX, dy = ty - this.physY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this._runTimer -= dt;
        if (dist < 8 || this._runTimer <= 0) {
          this._animState = 'idle';
          this._scheduleIdle(800);
          return;
        }
        const speed = RUN_SPEED * dt;
        this.physX += (dx / dist) * speed;
        this.physY += (dy / dist) * speed;
        this._facingLeft = dx < 0;
        this._walkPhase = (this._walkPhase + 0.1 * dt) % 1;
        const bob = Math.sin(this._walkPhase * Math.PI * 2);
        this._bobY = bob * 5;
        this._scaleX = 1 + Math.abs(bob) * 0.06;
        this._scaleY = 1 - Math.abs(bob) * 0.07;
      };

      const tickThrown = (dt) => {
        this._thrownVY += GRAVITY * dt;
        this.physX += this._thrownVX * dt;
        this.physY += this._thrownVY * dt;
        const _floor = this._floorY(this.physX);
        if (this.physY >= _floor) {
          this.physY = _floor;
          this._thrownVY = -Math.abs(this._thrownVY) * DAMPING;
          this._thrownVX *= FRICTION;
          this._scaleX = 1.3; this._scaleY = 0.65;
          if (Math.abs(this._thrownVY) < 1.5 && Math.abs(this._thrownVX) < 0.8) {
            this._thrownVX = 0; this._thrownVY = 0;
            this._animState = 'walk';
          }
        } else {
          this._scaleX = 0.85; this._scaleY = 1.15;
        }
        if (this.physX < 0)            { this.physX = 0;            this._thrownVX =  Math.abs(this._thrownVX) * DAMPING; }
        if (this.physX > this._maxX()) { this.physX = this._maxX(); this._thrownVX = -Math.abs(this._thrownVX) * DAMPING; }
        if (this.physY < 0)            { this.physY = 0;            this._thrownVY =  Math.abs(this._thrownVY) * DAMPING; }
      };

      const tickEyes = (dt) => {
        this._eyeTimer -= dt;
        if (this._eyeTimer <= 0) {
          const r = Math.random();
          if (r < 0.35)      { this._eyeTargetX = this._facingLeft ? -2 : 2; this._eyeTargetY = 0; }
          else if (r < 0.55) { this._eyeTargetX = 0; this._eyeTargetY = -1; }
          else if (r < 0.7)  { this._eyeTargetX = this._facingLeft ? 1 : -1; this._eyeTargetY = 1; }
          else               { this._eyeTargetX = this._facingLeft ? -1 : 1; this._eyeTargetY = 0; }
          this._eyeTimer = 40 + Math.random() * 120;
        }
        this._eyeOX += (this._eyeTargetX - this._eyeOX) * 0.15 * dt;
        this._eyeOY += (this._eyeTargetY - this._eyeOY) * 0.15 * dt;
      };

      const tickBlink = (dt) => {
        this._blinkTimer -= dt;
        if (this._blinkTimer <= 0) {
          this._blinkScale = 0.08;
          setTimeout(() => { this._blinkScale = 1; }, 80);
          this._blinkTimer = 120 + Math.random() * 200;
        }
      };

      const loop = (ts) => {
        const dt = Math.min((ts - lastTime) / 16.67, 3);
        lastTime = ts;

        if (this._animState !== 'dragging') {
          switch (this._animState) {
            case 'walk':    tickWalk(dt);    break;
            case 'idle':    tickIdle(dt);    break;
            case 'jump':    tickJump(dt);    break;
            case 'sit':     tickSit(dt);     break;
            case 'run':     tickRun(dt);     break;
            case 'thrown':  tickThrown(dt);  break;
          }
        }

        tickEyes(dt);
        tickBlink(dt);

        // Direct DOM: position + squash/stretch
        const wrap = this.$el.querySelector('.persona-wrap');
        if (wrap) {
          const flipX = this._facingLeft ? -1 : 1;
          wrap.style.left = this.physX + 'px';
          wrap.style.top  = (this.physY + this._bobY) + 'px';
          wrap.style.transform = `scaleX(${flipX * this._scaleX}) scaleY(${this._scaleY})`;
        }

        // Direct DOM: SVG re-render (all screens — rAF is sole owner of .persona-svg-wrap)
        const svgWrap = this.$el.querySelector('.persona-svg-wrap');
        if (svgWrap) {
          if (this.screen === 'progress') {
            const staticSvg = PERSONA_SVGS[this.characterState] || PERSONA_SVGS.thinking;
            if (svgWrap.innerHTML !== staticSvg) svgWrap.innerHTML = staticSvg;
          } else {
            const svgState = this._animState === 'jump' && this._jumpPhase !== 'none' ? 'jump'
              : this._animState === 'sit'    ? 'sit'
              : this._animState === 'run'    ? 'run'
              : this._animState === 'thrown' ? 'thrown'
              : this._animState === 'walk'   ? 'walk'
              : 'idle';

            const strokeColor = this._animState === 'thrown' ? '#EF4444'
              : this._animState === 'run'    ? '#F59E0B'
              : (this.screen === 'result' && this.result)
                ? ({ ok: '#10B981', warning: '#F59E0B', critical: '#EF4444' }[this.result.risk_level] || '#9CA3AF')
              : '#9CA3AF';

            svgWrap.innerHTML = buildPersonaSvg(
              this.personaFeatures,
              strokeColor,
              {
                state: svgState,
                facingLeft: this._facingLeft,
                eyeOX: Math.round(this._eyeOX),
                eyeOY: Math.round(this._eyeOY),
                blinkScale: this._blinkScale,
              }
            );
          }
        }

        this._animFrame = requestAnimationFrame(loop);
      };
      this._animFrame = requestAnimationFrame(loop);
    },

    onPersonaMousedown(e) {
      if (this._animState === 'thrown') return;
      this._animState = 'dragging';
      clearTimeout(this._idleTimer);

      this._dragOffset = { x: e.clientX - this.physX, y: e.clientY - this.physY };
      this._dragHistory = [{ x: e.clientX, y: e.clientY, t: Date.now() }];

      const onMove = (ev) => {
        this.physX = ev.clientX - this._dragOffset.x;
        this.physY = ev.clientY - this._dragOffset.y;
        this._dragHistory.push({ x: ev.clientX, y: ev.clientY, t: Date.now() });
        if (this._dragHistory.length > 8) this._dragHistory.shift();
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);

        const now = Date.now();
        const recent = this._dragHistory.filter(p => now - p.t < 120);
        if (recent.length >= 2) {
          const first = recent[0], last = recent[recent.length - 1];
          const dt = Math.max(last.t - first.t, 1);
          this._thrownVX = ((last.x - first.x) / dt) * 16;
          this._thrownVY = ((last.y - first.y) / dt) * 16;
          this._animState = 'thrown';
        } else {
          this._thrownVX = 0; this._thrownVY = 0;
          this._animState = 'idle';
          this._scheduleIdle(500);
        }
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },

    startThinking() {
      this.characterState = 'thinking';
      this._thinkInterval = setInterval(() => {
        this.characterState = this.characterState === 'thinking' ? 'scanning' : 'thinking';
      }, 1500);
    },

    stopThinking() {
      clearInterval(this._thinkInterval);
      this._thinkInterval = null;
    },

    async analyze() {
      const hasFiles = this.files.length > 0;
      const hasUrl = !!this.sourceTargetUrl;
      if (!hasFiles && !hasUrl) {
        this.error = '소스를 선택해주세요.';
        return;
      }
      this.error = '';
      this.liveThought = '';
      this.resultSection = 'tldr';
      this.screen = 'progress';
      this.startThinking();
      this._animState = 'run';
      this._runTimer = 180;
      this.statusStep = 1;

      await sleep(800);
      this.statusStep = 2;
      await sleep(600);
      this.statusStep = 3;
      this.liveThought = `${this.totalCount.toLocaleString()}명 규모 페르소나가 앱을 살펴보고 있어요…`;

      try {
        const formData = new FormData();
        formData.append('strata_keys', JSON.stringify(this.matchedStrata));
        formData.append('task', this.taskDesc.trim() || '서비스 탐색하기');

        if (hasUrl) {
          formData.append('target_url', this.sourceTargetUrl);
        } else {
          for (const file of this.files) {
            formData.append('files', file);
          }
        }

        const response = await fetch('/analyze', {
          method: 'POST',
          body: formData,
        });

        this.statusStep = 4;
        await sleep(300);

        if (!response.ok) throw new Error('backend');

        this.stopThinking();
        this.result = await response.json();
        this.liveThought = '';
        this.detailOpen = false;
        this.screen = 'result';
        this._animState = 'idle';
        this._scheduleIdle(1000);

      } catch (err) {
        this.stopThinking();
        this.liveThought = '';
        this.screen = 'source';
        this.error = err.message === 'backend'
          ? '⚠️ 분석 중 오류가 발생했어요. 파일 형식을 확인하거나 잠시 후 다시 시도해주세요.'
          : '⚠️ 서버에 연결할 수 없어요. 백엔드가 실행 중인지 확인해주세요. (http://localhost:8000)';
      }
    },

    async copyPrompts() {
      const text = (this.result?.fix_prompts || []).join('\n\n---\n\n');
      try {
        await navigator.clipboard.writeText(text);
        this.copied = true;
        setTimeout(() => { this.copied = false; }, 2000);
      } catch (_) {}
    },

    reset() {
      this.stopThinking();
      this.characterState = 'idle';
      this.personaFeatures = {};
      this._animState = 'walk';
      this._thrownVX = 0;
      this._thrownVY = 0;
      this._scaleX = 1;
      this._scaleY = 1;
      this._bobY = 0;
      clearTimeout(this._idleTimer);
      this.screen = 'source';
      this.result = null;
      this.files = [];
      this.error = '';
      this.taskDesc = '';
      this.sourceMode = 'file';
      this.sourcePort = '';
      this.sourcePath = '';
      this.sourceUrl = '';
      this.selectedAgeGroup = '';
      this.selectedSex = '';
      this.selectedEducation = '';
      this.selectedRegion = '모두';
      this.selectedOccupationType = '모두';
      this.matchedStrata = [];
      this.totalCount = 0;
      this.previewPersonas = [];
      this.liveThought = '';
      this.resultSection = 'tldr';
    },


    get personaLabel() {
      if (this.screen === 'progress') return '분석 중...';
      if (this.screen === 'result' && this.result) {
        return this.result.risk_label || '분석 완료';
      }
      if (!this.selectedAgeGroup) return '페르소나 대기 중';
      return `${this.selectedAgeGroup} ${this.selectedSex} ${this.selectedEducation}`.trim();
    },

    get riskConfig() {
      const configs = {
        critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', icon: '🔴' },
        warning:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', icon: '🟡' },
        ok:       { color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', icon: '🟢' },
      };
      return configs[this.result?.risk_level] || configs.ok;
    },

    get thinkAloudFirstSentence() {
      const text = this.result?.think_aloud || '';
      const match = text.match(/^[^.!?]+[.!?]/);
      return match ? match[0] : text.slice(0, 80) + (text.length > 80 ? '...' : '');
    },

    buildAnnotatedCode() {
      const source = this.result?.source_code || '';
      const top3 = this.result?.top3 || [];
      if (!source) return '';

      const lines = source.split('\n');
      const issueMap = {};
      for (const item of top3) {
        if (item.line_number) issueMap[item.line_number] = item;
      }

      const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const rows = lines.map((line, i) => {
        const n = i + 1;
        const escaped = esc(line).replace(/ /g, '&nbsp;');
        const issue = issueMap[n];
        if (issue) {
          const sev = issue.severity || 0;
          const sevKey = sev > 0.7 ? 'high' : sev > 0.4 ? 'med' : 'low';
          const sevLabel = sev > 0.7 ? 'HIGH' : sev > 0.4 ? 'MED' : 'LOW';
          const bg = sev > 0.7 ? '#3d1515' : sev > 0.4 ? '#3d2b0a' : '#1a2d3d';
          return `<tr style="background:${bg}">
            <td class="ln">${n}</td>
            <td class="lc">${escaped}</td>
            <td class="li"><span class="sev-label sev-label--${sevKey}">[${sevLabel}]</span> ${esc(issue.reason)}</td>
          </tr>`;
        }
        return `<tr>
          <td class="ln dim">${n}</td>
          <td class="lc dim">${escaped}</td>
          <td></td>
        </tr>`;
      }).join('');

      return `<div class="code-view">
        <p class="code-label">소스 코드 — 이슈 라인 하이라이트</p>
        <table style="border-collapse:collapse;width:100%">${rows}</table>
      </div>`;
    },

    buildIssueCards() {
      const top3 = this.result?.top3 || [];
      if (!top3.length) return '<p class="no-issues">감지된 이슈 없음</p>';

      const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      return top3.map(item => {
        const sev = item.severity || 0;
        const sevPct = Math.round(sev * 100);
        const sevKey = sev > 0.7 ? 'high' : sev > 0.4 ? 'med' : 'low';
        const sevLabel = sev > 0.7 ? 'HIGH' : sev > 0.4 ? 'MED' : 'LOW';
        const borderColor = sev > 0.7
          ? 'rgba(239,68,68,0.3)'
          : sev > 0.4
          ? 'rgba(245,158,11,0.3)'
          : 'rgba(59,130,246,0.3)';
        return `<details class="issue-card" style="border-color:${borderColor}">
          <summary class="issue-summary">
            <span><span class="sev-label sev-label--${sevKey}">[${sevLabel}]</span> line ${item.line_number || '?'} — ${esc(item.reason)}</span>
            <span class="issue-sev">${sevPct}%</span>
          </summary>
          <div class="issue-body"><b>근거</b> — ${esc(item.evidence)}</div>
        </details>`;
      }).join('');
    },

    buildFrictionBars() {
      const fm = this.result?.friction_map || [];
      if (!fm.length) return '<p class="no-issues">마찰 지점 없음</p>';
      const esc = s => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return fm.slice(0, 8).map((item, i) => {
        const pct = Math.round(item.rate * 100);
        const bars = '█'.repeat(Math.round(item.rate * 8));
        const color = pct >= 70 ? '#EF4444' : pct >= 40 ? '#F59E0B' : '#60a5fa';
        return `<div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="color:#CBD5E1;font-size:13px">${i+1}. ${esc(item.element)}</span>
            <span style="color:${color};font-size:12px;font-family:monospace">${item.affected_count}명</span>
          </div>
          <div style="font-size:11px;color:${color};letter-spacing:-1px">${bars}</div>
        </div>`;
      }).join('');
    },
  }));
});

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
