export type Image2ScenarioGroup =
  | '商品生成'
  | '图像清理'
  | '局部替换'
  | '变体生成'
  | '画幅扩展'
  | '质量增强';

export type Image2ScenarioId =
  | 'product-white-bg'
  | 'product-premium-hero'
  | 'product-lifestyle'
  | 'cleanup-object'
  | 'replace-background'
  | 'change-color'
  | 'variation-style'
  | 'variation-platform'
  | 'extend-horizontal'
  | 'extend-vertical'
  | 'enhance-resolution'
  | 'enhance-texture';

export type Image2Scenario = {
  id: Image2ScenarioId;
  group: Image2ScenarioGroup;
  title: string;
  shortTitle: string;
  description: string;
  inputLabel: string;
  defaultAspectRatio: string;
  defaultCount: number;
  promptTemplate: string;
  userPromptPlaceholder: string;
  beforeImage: string;
  afterImage: string;
  tags: string[];
};

const COMMON_PRESERVE_RULES = `
Preserve the uploaded product identity, geometry, material, color accuracy, logo position, and key visible details.
Keep realistic lighting, shadows, perspective, and photographic texture.
Avoid distorted product shape, incorrect logos, random text, watermark, extra fingers, duplicated products, or unrealistic artifacts.
`.trim();

export const IMAGE2_SCENARIOS: Image2Scenario[] = [
  {
    id: 'product-white-bg',
    group: '商品生成',
    title: '白底主图',
    shortTitle: '白底主图',
    description: '把上传商品整理成干净可售卖的白底主图。',
    inputLabel: '上传商品图',
    defaultAspectRatio: '1:1',
    defaultCount: 1,
    beforeImage: '/scene-samples/domestic_ecommerce_lifestyle.jpg',
    afterImage: '/scene-samples/cross_border_ecommerce_white_bg.jpg',
    tags: ['marketplace', 'main-image'],
    userPromptPlaceholder: '例如：主体再大一点，边缘干净，适合亚马逊主图。',
    promptTemplate: `
Use the uploaded product image as the primary reference.
Create a marketplace-ready ecommerce main image on a pure seamless white background (#FFFFFF).
Center the product and make it fill about 85% of the frame with crisp edges and a subtle natural ground shadow.
${COMMON_PRESERVE_RULES}
    `.trim(),
  },
  {
    id: 'product-premium-hero',
    group: '商品生成',
    title: '精修主图',
    shortTitle: '精修主图',
    description: '提升商品质感，生成高级棚拍风主视觉。',
    inputLabel: '上传商品图',
    defaultAspectRatio: '1:1',
    defaultCount: 2,
    beforeImage: '/scene-samples/cross_border_ecommerce_white_bg.jpg',
    afterImage: '/scene-samples/cross_border_ecommerce_premium_hero.jpg',
    tags: ['hero', 'premium'],
    userPromptPlaceholder: '例如：更有高级感，适合独立站首页首屏。',
    promptTemplate: `
Use the uploaded product image as the primary reference.
Create a premium hero product shot with controlled studio lighting, refined highlights, soft gradient background, and commercial color grading.
Make the product feel aspirational, polished, and brand-grade while keeping the scene uncluttered.
${COMMON_PRESERVE_RULES}
    `.trim(),
  },
  {
    id: 'product-lifestyle',
    group: '商品生成',
    title: '场景氛围图',
    shortTitle: '氛围图',
    description: '把商品自然放进生活场景，适合种草和社媒。',
    inputLabel: '上传商品图',
    defaultAspectRatio: '4:3',
    defaultCount: 2,
    beforeImage: '/scene-samples/cross_border_ecommerce_white_bg.jpg',
    afterImage: '/scene-samples/cross_border_ecommerce_lifestyle.jpg',
    tags: ['lifestyle', 'social'],
    userPromptPlaceholder: '例如：放在温暖咖啡桌场景，阳光自然一点。',
    promptTemplate: `
Use the uploaded product image as the primary reference.
Place the product naturally in a tasteful lifestyle scene with believable props, natural light, depth, and a clean commercial composition.
The product must remain the clear focal point while the background supports the intended buying scenario.
${COMMON_PRESERVE_RULES}
    `.trim(),
  },
  {
    id: 'cleanup-object',
    group: '图像清理',
    title: '去掉杂物',
    shortTitle: '清理画面',
    description: '移除画面中不需要的元素，并自然补全背景。',
    inputLabel: '上传要清理的图片',
    defaultAspectRatio: '1:1',
    defaultCount: 1,
    beforeImage: '/scene-samples/physical_store_fnb_moments.png',
    afterImage: '/scene-samples/physical_store_fnb_dish_hero.png',
    tags: ['erase', 'cleanup'],
    userPromptPlaceholder: '例如：去掉桌面上的杂物，保留商品和背景质感。',
    promptTemplate: `
Use the uploaded image as the primary reference.
Remove unwanted objects or distracting elements naturally.
Reconstruct the missing background with realistic texture, lighting, shadows, and perspective.
Preserve the main subject, composition, colors, and all untouched areas.
Avoid visible seams, repeated patterns, blurry patches, new objects, text, logos, or watermarks.
    `.trim(),
  },
  {
    id: 'replace-background',
    group: '局部替换',
    title: '更换背景',
    shortTitle: '换背景',
    description: '保留商品，换成更适合销售的背景或场景。',
    inputLabel: '上传主体图片',
    defaultAspectRatio: '1:1',
    defaultCount: 2,
    beforeImage: '/scene-samples/cross_border_ecommerce_white_bg.jpg',
    afterImage: '/scene-samples/domestic_ecommerce_lifestyle.jpg',
    tags: ['background', 'replace'],
    userPromptPlaceholder: '例如：换成浴室台面，背景干净、高级、浅色。',
    promptTemplate: `
Use the uploaded image as the product identity reference.
Replace or redesign the background while preserving the product exactly.
The new background should match the requested scene, lighting direction, camera perspective, and product scale.
${COMMON_PRESERVE_RULES}
    `.trim(),
  },
  {
    id: 'change-color',
    group: '局部替换',
    title: '调整颜色',
    shortTitle: '改颜色',
    description: '调整商品或画面颜色，保持材质和真实感。',
    inputLabel: '上传图片',
    defaultAspectRatio: '1:1',
    defaultCount: 1,
    beforeImage: '/scene-samples/cross_border_ecommerce_macro.jpg',
    afterImage: '/scene-samples/domestic_ecommerce_premium_hero.jpg',
    tags: ['color', 'replace'],
    userPromptPlaceholder: '例如：把包装改成雾面黑色，保留金属反光。',
    promptTemplate: `
Use the uploaded image as the primary reference.
Change the requested color or color palette while preserving material, lighting, shadows, and product geometry.
Keep the result realistic and commercially polished.
${COMMON_PRESERVE_RULES}
    `.trim(),
  },
  {
    id: 'variation-style',
    group: '变体生成',
    title: '生成同款变体',
    shortTitle: '生成变体',
    description: '保持主体一致，生成不同背景、光影或构图。',
    inputLabel: '上传基准图片',
    defaultAspectRatio: '1:1',
    defaultCount: 4,
    beforeImage: '/scene-samples/cross_border_ecommerce_premium_hero.jpg',
    afterImage: '/scene-samples/cross_border_ecommerce_lifestyle.jpg',
    tags: ['variation', 'style'],
    userPromptPlaceholder: '例如：生成更干净、更适合独立站的高级感变体。',
    promptTemplate: `
Use the uploaded image as the primary identity reference.
Create high-quality ecommerce image variations.
Vary the background, lighting, styling, camera distance, and composition while keeping the product recognizable and accurate.
${COMMON_PRESERVE_RULES}
    `.trim(),
  },
  {
    id: 'variation-platform',
    group: '变体生成',
    title: '生成平台规格图',
    shortTitle: '平台规格',
    description: '围绕同一商品生成适合不同投放平台的视觉。',
    inputLabel: '上传商品图',
    defaultAspectRatio: '4:5',
    defaultCount: 3,
    beforeImage: '/scene-samples/domestic_ecommerce_white_bg.jpg',
    afterImage: '/scene-samples/domestic_ecommerce_poster.jpg',
    tags: ['platform', 'ads'],
    userPromptPlaceholder: '例如：生成小红书/淘宝风格，留一点中文标题位置。',
    promptTemplate: `
Use the uploaded product image as the primary reference.
Create platform-ready product visuals with strong hierarchy, clean negative space, and ad-friendly composition.
Preserve the product exactly while adapting the scene, framing, and commercial styling to the requested platform.
${COMMON_PRESERVE_RULES}
    `.trim(),
  },
  {
    id: 'extend-horizontal',
    group: '画幅扩展',
    title: '扩成横版广告图',
    shortTitle: '扩横版',
    description: '把现有图自然扩展成横版，适合 Banner 和广告。',
    inputLabel: '上传原图',
    defaultAspectRatio: '16:9',
    defaultCount: 1,
    beforeImage: '/scene-samples/cross_border_ecommerce_premium_hero.jpg',
    afterImage: '/scene-samples/media_account_banner.png',
    tags: ['extend', 'banner'],
    userPromptPlaceholder: '例如：左侧留出干净空间放广告文案。',
    promptTemplate: `
Use the uploaded image as the central reference.
Extend the canvas horizontally into a natural 16:9 composition.
Generate plausible surrounding background that matches the original scene, lighting, perspective, and texture.
Keep the main subject intact and avoid visible seams, stretched textures, repeated patterns, or extra text.
    `.trim(),
  },
  {
    id: 'extend-vertical',
    group: '画幅扩展',
    title: '扩成竖版海报',
    shortTitle: '扩竖版',
    description: '把现有图自然扩展成竖版，适合广告和内容流。',
    inputLabel: '上传原图',
    defaultAspectRatio: '9:16',
    defaultCount: 1,
    beforeImage: '/scene-samples/cross_border_ecommerce_premium_hero.jpg',
    afterImage: '/scene-samples/domestic_ecommerce_poster.jpg',
    tags: ['extend', 'poster'],
    userPromptPlaceholder: '例如：上方留标题空间，下方保留商品视觉重心。',
    promptTemplate: `
Use the uploaded image as the central reference.
Extend the canvas vertically into a natural 9:16 poster composition.
Preserve the main subject and generate surrounding background that matches the original lighting, perspective, and texture.
Leave tasteful negative space for poster copy where appropriate.
Avoid seams, stretched artifacts, unrelated props, text, logos, or watermarks.
    `.trim(),
  },
  {
    id: 'enhance-resolution',
    group: '质量增强',
    title: '提升清晰度',
    shortTitle: '提高清晰',
    description: '增强边缘、细节和商业摄影质感。',
    inputLabel: '上传图片',
    defaultAspectRatio: '1:1',
    defaultCount: 1,
    beforeImage: '/scene-samples/domestic_ecommerce_lifestyle.jpg',
    afterImage: '/scene-samples/domestic_ecommerce_premium_hero.jpg',
    tags: ['enhance', 'resolution'],
    userPromptPlaceholder: '例如：让商品边缘更锐利，整体更像棚拍。',
    promptTemplate: `
Use the uploaded image as the primary reference.
Enhance clarity, edge definition, material detail, lighting balance, and commercial photography quality.
Preserve the exact subject identity, composition, and color intent.
Avoid over-sharpening, plastic skin, halos, distorted geometry, extra text, logos, or watermarks.
    `.trim(),
  },
  {
    id: 'enhance-texture',
    group: '质量增强',
    title: '增强材质质感',
    shortTitle: '增强质感',
    description: '突出商品材质、纹理、反光和高级感。',
    inputLabel: '上传商品图',
    defaultAspectRatio: '1:1',
    defaultCount: 1,
    beforeImage: '/scene-samples/cross_border_ecommerce_white_bg.jpg',
    afterImage: '/scene-samples/cross_border_ecommerce_macro.jpg',
    tags: ['texture', 'detail'],
    userPromptPlaceholder: '例如：突出金属质感和细节纹理，背景保持克制。',
    promptTemplate: `
Use the uploaded product image as the primary reference.
Enhance material texture, fine surface detail, reflections, highlights, and premium tactile quality.
Keep the product shape, color, logo, and proportions accurate.
Avoid exaggerated gloss, fake texture, distorted geometry, text, logos, or watermarks.
    `.trim(),
  },
];

export function scenarioById(id: string | undefined) {
  return IMAGE2_SCENARIOS.find((scenario) => scenario.id === id) ?? IMAGE2_SCENARIOS[0];
}

export function groupedScenarios() {
  return IMAGE2_SCENARIOS.reduce<Record<string, Image2Scenario[]>>((groups, scenario) => {
    groups[scenario.group] = [...(groups[scenario.group] ?? []), scenario];
    return groups;
  }, {});
}

export function buildImage2ScenarioPrompt({
  scenario,
  userBrief,
  outputSpec,
}: {
  scenario: Image2Scenario;
  userBrief: string;
  outputSpec: string;
}) {
  return [
    scenario.promptTemplate,
    userBrief.trim() ? `User direction:\n${userBrief.trim()}` : '',
    `Output:\n${outputSpec}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}
