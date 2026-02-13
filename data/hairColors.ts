import { HairColor } from '../types';

export const hairColors: HairColor[] = [
  // === 내추럴 ===
  {
    id: 'natural',
    name: 'Keep Original',
    nameKo: '염색 안함',
    colorHex: '#888888',
    description: 'Keep the original hair color exactly as it is. Do not change hair color.',
    category: 'natural',
  },
  {
    id: 'natural-black',
    name: 'Natural Black',
    nameKo: '자연 흑발',
    colorHex: '#1a1a1a',
    description: 'Deep natural black hair, glossy and healthy-looking with subtle dark brown undertones in light.',
    category: 'natural',
  },
  {
    id: 'dark-brown',
    name: 'Dark Brown',
    nameKo: '다크 브라운',
    colorHex: '#3b2214',
    description: 'Rich dark brown hair color, warm chocolate tone with natural depth.',
    category: 'natural',
  },

  // === 브라운 계열 ===
  {
    id: 'chestnut-brown',
    name: 'Chestnut Brown',
    nameKo: '체스트넛 브라운',
    colorHex: '#6b3a2a',
    description: 'Warm chestnut brown with reddish undertones, like autumn leaves. Rich and vibrant.',
    category: 'brown',
  },
  {
    id: 'caramel-brown',
    name: 'Caramel Brown',
    nameKo: '카라멜 브라운',
    colorHex: '#a0682c',
    description: 'Warm golden caramel brown, honey-toned highlights through mid-lengths, sun-kissed look.',
    category: 'brown',
  },
  {
    id: 'milk-brown',
    name: 'Milk Brown',
    nameKo: '밀크 브라운',
    colorHex: '#c4956a',
    description: 'Soft milky light brown, creamy and warm. A trendy Korean hair color with gentle beige undertones.',
    category: 'brown',
  },
  {
    id: 'rose-brown',
    name: 'Rose Brown',
    nameKo: '로즈 브라운',
    colorHex: '#8b5e5e',
    description: 'Brown base with soft pink-rose undertones. Romantic and feminine, subtle pinkish sheen.',
    category: 'brown',
  },

  // === 애쉬 계열 ===
  {
    id: 'ash-brown',
    name: 'Ash Brown',
    nameKo: '애쉬 브라운',
    colorHex: '#7a7062',
    description: 'Cool-toned muted brown with grey ash undertones. Sophisticated and modern, no warm/red tones.',
    category: 'ash',
  },
  {
    id: 'ash-grey',
    name: 'Ash Grey',
    nameKo: '애쉬 그레이',
    colorHex: '#9e9e9e',
    description: 'Cool silvery grey-brown tone. Trendy Korean ash grey with muted, smoky feel.',
    category: 'ash',
  },
  {
    id: 'ash-beige',
    name: 'Ash Beige',
    nameKo: '애쉬 베이지',
    colorHex: '#c2b59b',
    description: 'Light warm beige with soft ash undertone. Bright and airy, very popular K-beauty color.',
    category: 'ash',
  },

  // === 비비드 / 포인트 ===
  {
    id: 'burgundy',
    name: 'Burgundy',
    nameKo: '버건디',
    colorHex: '#722f37',
    description: 'Deep wine-red burgundy. Rich and bold, elegant dark red with purple undertones.',
    category: 'vivid',
  },
  {
    id: 'copper-orange',
    name: 'Copper Orange',
    nameKo: '카퍼 오렌지',
    colorHex: '#c47030',
    description: 'Warm vivid copper-orange tone. Bold and trendy, metallic warm orange sheen.',
    category: 'vivid',
  },
  {
    id: 'pink-lavender',
    name: 'Pink Lavender',
    nameKo: '핑크 라벤더',
    colorHex: '#c8a2c8',
    description: 'Soft pastel pink-lavender blend. Dreamy and playful, light purple-pink with soft gradient.',
    category: 'vivid',
  },
  {
    id: 'blue-black',
    name: 'Blue Black',
    nameKo: '블루 블랙',
    colorHex: '#1c2331',
    description: 'Deep black base with cool blue sheen that shows in light. Mysterious and sleek.',
    category: 'vivid',
  },

  // === 하이라이트 / 투톤 ===
  {
    id: 'face-framing-blonde',
    name: 'Face-framing Blonde',
    nameKo: '페이스라인 블론드',
    colorHex: '#3b2214',
    colorHexSecond: '#d4a76a',
    description: 'Dark brown base with bright blonde face-framing highlights (money pieces). Blonde streaks frame the face around temples and jawline.',
    category: 'highlight',
  },
  {
    id: 'inner-color-pink',
    name: 'Inner Color Pink',
    nameKo: '이너컬러 핑크',
    colorHex: '#3b2214',
    colorHexSecond: '#e8839b',
    description: 'Dark brown on surface layer with hidden pink inner color underneath. The pink shows when hair moves or is tucked behind ears.',
    category: 'highlight',
  },
];

export const colorCategories = [
  { id: 'natural', label: '내추럴' },
  { id: 'brown', label: '브라운' },
  { id: 'ash', label: '애쉬' },
  { id: 'vivid', label: '비비드' },
  { id: 'highlight', label: '하이라이트' },
] as const;
