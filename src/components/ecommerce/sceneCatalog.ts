// 静态精选场景目录：每个 (客户, 场景) = 一张代表图 + 一条专家提示词。
// 铁律：每类客户的场景各自定义（跨境 ≠ 餐饮 ≠ 自媒体），右栏场景按客户独立 curate。
// 生成时把 prompt 当 style 直出（见 Create.tsx runGeneration），不调 AI 识图 / 推荐 / optimize。
// 代表图统一走 public/scene-samples/ 静态资源（build 自带，各环境零依赖、不依赖后端 /storage 同步）。
// 命名约定：scene-samples/{customerKey}_{sceneKey}.{jpg|png}。

export interface SceneTemplate {
  customerKey: string;
  sceneKey: string;
  label: string;
  /** 专家提示词，作为生成的视觉风格（style）直传后端。 */
  prompt: string;
  /** 代表图：统一指向 public/scene-samples/ 静态资源；为空时卡片渲染占位。 */
  sampleImage: string;
}

export interface CustomerDef {
  key: string;
  label: string;
  tagline: string;
}

// 5 类 SMB 客户。顺序即左栏展示顺序（v1 主力跨境 / 国内在前）。
export const CUSTOMERS: CustomerDef[] = [
  { key: 'cross_border_ecommerce', label: '跨境电商', tagline: '亚马逊 / 独立站主图与营销图' },
  { key: 'domestic_ecommerce', label: '国内电商·直播', tagline: '淘宝 / 拼多多 / 直播间素材' },
  { key: 'physical_store_fnb', label: '实体店·餐饮', tagline: '菜品、海报、菜单与门头' },
  { key: 'media_account', label: '公众号·自媒体', tagline: '封面、配图与金句卡片' },
  { key: 'smb_saas', label: '中小 SaaS·实业', tagline: 'Logo、官网与宣传物料' },
];

// 电商两类（跨境 / 国内）的场景：sampleImage 取自灵感库 relevance>=4 的代表图（两客户各取不同图），
// 已拷入 public/scene-samples/；prompt 据库样本 curate 干净版本（去掉库里 {argument}/REFERENCE_0 占位符），
// 直传后端当视觉风格。铁律：跨境（全球货品 / 英文市场）与国内（食品为主 / 淘宝拼多多直播）各自定义，右栏不雷同。
const ECOMMERCE_SCENES: SceneTemplate[] = [
  // ── 跨境电商（亚马逊 / 独立站） ──
  {
    customerKey: 'cross_border_ecommerce',
    sceneKey: 'white_bg',
    label: '白底主图',
    prompt:
      'Amazon-compliant e-commerce main image of the uploaded product on a pure seamless white background (#FFFFFF), product centered and filling ~85% of the frame, crisp edges, true-to-life color, soft even studio lighting with a subtle natural ground shadow. Sharp focus throughout, no props, no text, no watermark. Clean, professional, marketplace-ready.',
    sampleImage: '/scene-samples/cross_border_ecommerce_white_bg.jpg',
  },
  {
    customerKey: 'cross_border_ecommerce',
    sceneKey: 'premium_hero',
    label: '精修主图',
    prompt:
      'Premium hero product shot of the uploaded item for a high-end Western brand. Studio cinematic lighting with controlled highlights and soft gradient backdrop, refined reflections, shallow depth of field, glossy commercial color grading. Luxury advertising aesthetic, strong focal emphasis on the product, generous negative space. Photorealistic, aspirational, brand-grade.',
    sampleImage: '/scene-samples/cross_border_ecommerce_premium_hero.jpg',
  },
  {
    customerKey: 'cross_border_ecommerce',
    sceneKey: 'lifestyle',
    label: '场景氛围图',
    prompt:
      'Bright lifestyle scene featuring the uploaded product in a tasteful Western home or outdoor setting. Natural sunlight, airy and clean styling, complementary props kept subtle, soft bokeh background, warm authentic atmosphere. Product remains the clear focal point, editorial flat-lay or in-context composition, fresh and inviting commercial look.',
    sampleImage: '/scene-samples/cross_border_ecommerce_lifestyle.jpg',
  },
  {
    customerKey: 'cross_border_ecommerce',
    sceneKey: 'macro',
    label: '细节特写',
    prompt:
      'Macro detail shot of the uploaded product highlighting material, texture and craftsmanship. Extreme close-up with razor-sharp focus on the key surface, dramatic directional lighting revealing fine structure, dark or neutral backdrop, optional clean exploded-view layout of components. Technical, premium, conversion-focused detail imagery.',
    sampleImage: '/scene-samples/cross_border_ecommerce_macro.jpg',
  },
  {
    customerKey: 'cross_border_ecommerce',
    sceneKey: 'on_model',
    label: '模特实拍',
    prompt:
      'On-model fashion-campaign shot featuring the uploaded product worn or used naturally. Professional model, confident pose, editorial styling, flattering studio or location lighting, cohesive color palette. Magazine-grade composition with the product clearly showcased, modern Western e-commerce campaign feel.',
    sampleImage: '/scene-samples/cross_border_ecommerce_on_model.jpg',
  },
  {
    customerKey: 'cross_border_ecommerce',
    sceneKey: 'poster',
    label: '海报营销',
    prompt:
      'Editorial marketing poster built around the uploaded product as the hero. Bold dynamic layout with strong typographic hierarchy and clear space for an English headline, energetic accent color, premium advertising composition, balanced negative space. Scroll-stopping, brand-grade promo visual ready for social ads.',
    sampleImage: '/scene-samples/cross_border_ecommerce_poster.jpg',
  },

  // ── 国内电商·直播（淘宝 / 拼多多 / 直播间） ──
  {
    customerKey: 'domestic_ecommerce',
    sceneKey: 'white_bg',
    label: '白底主图',
    prompt:
      '电商白底主图：将上传的商品放在纯净白底（#FFFFFF）上居中展示，主体占画面约 85%，边缘干净、颜色真实，柔和均匀的棚拍光配自然落地投影。整体清晰锐利，无多余道具、无文字、无水印。干净、专业、可直接做淘宝 / 拼多多主图。',
    sampleImage: '/scene-samples/domestic_ecommerce_white_bg.jpg',
  },
  {
    customerKey: 'domestic_ecommerce',
    sceneKey: 'premium_hero',
    label: '精修主图',
    prompt:
      '高级感精修主图：以上传商品为主角，影棚级布光与柔和渐变背景，细腻反光与浅景深，商业级调色，质感突出。诱人、有食欲（若为食品）或高端有质感（若为日用 / 美妆），主体聚焦、留白克制，直播间与详情页通用的旗舰品质视觉。',
    sampleImage: '/scene-samples/domestic_ecommerce_premium_hero.jpg',
  },
  {
    customerKey: 'domestic_ecommerce',
    sceneKey: 'lifestyle',
    label: '场景氛围图',
    prompt:
      '生活场景氛围图：把上传商品自然融入暖光生活场景（咖啡馆 / 餐桌 / 家居一角），柔和自然光，温馨真实的氛围，搭配克制的点缀道具，背景虚化柔和。商品仍是清晰焦点，构图自然有呼吸感，适合朋友圈与种草内容的温暖商业风。',
    sampleImage: '/scene-samples/domestic_ecommerce_lifestyle.jpg',
  },
  {
    customerKey: 'domestic_ecommerce',
    sceneKey: 'macro',
    label: '细节特写',
    prompt:
      '细节特写图：聚焦上传商品的材质、纹理与做工。微距超近距，关键表面极致锐利对焦，戏剧性侧光勾勒结构层次，深色或中性背景；如适合可用干净的爆炸结构展示内部组件。技术感、高级感、强转化的细节图。',
    sampleImage: '/scene-samples/domestic_ecommerce_macro.jpg',
  },
  {
    customerKey: 'domestic_ecommerce',
    sceneKey: 'on_model',
    label: '模特实拍',
    prompt:
      '模特实拍图：让上传商品自然地被模特佩戴或使用。专业模特、自信姿态、得体造型，讨喜的棚拍或场景光，统一协调的色调。杂志级构图、商品清晰可见，符合国内电商与直播间审美的现代实拍风。',
    sampleImage: '/scene-samples/domestic_ecommerce_on_model.jpg',
  },
  {
    customerKey: 'domestic_ecommerce',
    sceneKey: 'poster',
    label: '促销海报',
    prompt:
      '促销海报：以上传商品为主角的高转化营销海报。醒目大胆的版式，强烈的标题层级与中文促销文案留白区，活力强调色，明显的价格 / 折扣标签位，丰富的飞溅或元素点缀。鲜亮、有冲击力，直播间与大促氛围的转化型主视觉。',
    sampleImage: '/scene-samples/domestic_ecommerce_poster.jpg',
  },
];

// 非电商三类：库里几乎没有，prompt 现写；代表图用本场景 prompt 经生成管线真出图，存 public/scene-samples/。
const NON_ECOMMERCE_SCENES: SceneTemplate[] = [
  // ── 实体店·餐饮 ──
  {
    customerKey: 'physical_store_fnb',
    sceneKey: 'dish_hero',
    label: '菜品/产品图',
    prompt:
      'Appetizing hero food photography of the uploaded dish, shot 45-degree angle with a 90mm macro lens, shallow depth of field. Natural soft window light from the side, warm and inviting tones, fresh steam and glistening texture, garnish in sharp focus. Clean rustic wooden or matte ceramic surface, softly blurred restaurant background, professional food-commercial color grading. Vibrant, fresh, mouth-watering.',
    sampleImage: '/scene-samples/physical_store_fnb_dish_hero.png',
  },
  {
    customerKey: 'physical_store_fnb',
    sceneKey: 'promo_poster',
    label: '促销海报',
    prompt:
      'Eye-catching promotional poster for a food & beverage shop featuring the uploaded product as the hero. Bold high-contrast layout with strong headline space at the top, energetic warm color blocks, dynamic splash and ingredient accents around the product. Clear price-tag / discount badge area, modern sans-serif typographic hierarchy, balanced negative space for Chinese promo copy. Vivid, commercial, conversion-focused.',
    sampleImage: '/scene-samples/physical_store_fnb_promo_poster.png',
  },
  {
    customerKey: 'physical_store_fnb',
    sceneKey: 'menu',
    label: '电子菜单',
    prompt:
      'Clean digital menu board layout presenting the uploaded item as the featured dish. Elegant grid composition with a large hero photo plus a tidy list area for item names and prices, consistent food-photography treatment, warm neutral background, subtle brand accent color. Generous margins, refined typographic rhythm, restaurant-menu aesthetic that reads clearly on a screen.',
    sampleImage: '/scene-samples/physical_store_fnb_menu.png',
  },
  {
    customerKey: 'physical_store_fnb',
    sceneKey: 'moments',
    label: '朋友圈图',
    prompt:
      'Cozy lifestyle square photo of the uploaded food/product styled for a WeChat Moments post. Authentic hand-held everyday feel, warm natural light, a real café or home table setting with tasteful props, soft bokeh background. Casual but premium, inviting and shareable, color graded warm and friendly. 1:1 composition with the product naturally placed off-center.',
    sampleImage: '/scene-samples/physical_store_fnb_moments.png',
  },
  {
    customerKey: 'physical_store_fnb',
    sceneKey: 'storefront',
    label: '门头招牌',
    prompt:
      'Photorealistic storefront signage mockup featuring the uploaded brand/product. Modern shop facade at golden hour, illuminated channel-letter or lightbox sign, clean awning and entrance, tasteful materials (wood, metal, warm light). Street-level perspective, inviting and upscale small-business look, realistic lighting and reflections.',
    sampleImage: '/scene-samples/physical_store_fnb_storefront.png',
  },

  // ── 公众号·自媒体 ──
  {
    customerKey: 'media_account',
    sceneKey: 'article_cover',
    label: '文章封面',
    prompt:
      'WeChat official-account article cover, wide 2.35:1 banner composition with the uploaded subject as focal point. Editorial magazine feel, strong title area with clear typographic hierarchy, refined color palette and tasteful accent, balanced negative space for a Chinese headline. Crisp, modern, scroll-stopping thumbnail that stays legible when small.',
    sampleImage: '/scene-samples/media_account_article_cover.png',
  },
  {
    customerKey: 'media_account',
    sceneKey: 'inline_image',
    label: '正文配图',
    prompt:
      'Clean in-article illustration based on the uploaded subject. Minimal, well-lit, single clear focal point on a soft neutral or gently colored background, generous breathing room, consistent editorial style. Calm and readable, optimized to break up body text without distracting, soft shadows and balanced composition.',
    sampleImage: '/scene-samples/media_account_inline_image.png',
  },
  {
    customerKey: 'media_account',
    sceneKey: 'banner',
    label: '头图Banner',
    prompt:
      'Wide hero banner featuring the uploaded subject, designed for the top of an article or landing page. Cinematic horizontal composition, depth through layering and soft gradient lighting, clear focal subject with ample copy space on one side. Polished brand-grade look, modern color grading, high visual impact.',
    sampleImage: '/scene-samples/media_account_banner.png',
  },
  {
    customerKey: 'media_account',
    sceneKey: 'quote_card',
    label: '金句卡片',
    prompt:
      'Minimalist quote card with the uploaded subject as a subtle supporting visual. Large clean area reserved for a short bold Chinese quote, elegant typographic emphasis, refined color palette, gentle texture or gradient, tasteful accent line or mark. Calm, premium, highly shareable social card aesthetic, 1:1 or 4:5 composition.',
    sampleImage: '/scene-samples/media_account_quote_card.png',
  },

  // ── 中小 SaaS·实业 ──
  {
    customerKey: 'smb_saas',
    sceneKey: 'logo',
    label: 'Logo',
    prompt:
      'Clean, modern vector-style logo concept derived from the uploaded mark/product. Simple geometric construction, balanced proportions, a single confident brand color plus neutral, scalable and memorable, presented centered on a clean light background. Professional tech-brand identity look, crisp edges, no clutter.',
    sampleImage: '/scene-samples/smb_saas_logo.png',
  },
  {
    customerKey: 'smb_saas',
    sceneKey: 'hero',
    label: '官网首屏图',
    prompt:
      'SaaS website hero visual featuring the uploaded product. Modern, airy composition with the product floating on a soft gradient or subtle 3D-mesh background, gentle ambient lighting and tasteful glow, generous copy space on the left. Premium, trustworthy tech aesthetic, crisp UI-grade rendering, balanced and uncluttered.',
    sampleImage: '/scene-samples/smb_saas_hero.png',
  },
  {
    customerKey: 'smb_saas',
    sceneKey: 'feature',
    label: '功能宣传图',
    prompt:
      'Feature highlight graphic built around the uploaded product/screenshot. Clean isometric or floating-card presentation, clear single-feature focus, soft shadows and rounded surfaces, calm professional color palette with one accent, space for a short caption. Modern product-marketing look, polished and easy to read.',
    sampleImage: '/scene-samples/smb_saas_feature.png',
  },
  {
    customerKey: 'smb_saas',
    sceneKey: 'deck',
    label: 'PPT/宣传册配图',
    prompt:
      'Clean presentation/brochure key visual featuring the uploaded subject. Corporate-modern composition, plenty of structured negative space for headings and bullet copy, restrained color system with a single brand accent, soft professional lighting. Crisp, business-grade, consistent with a slide-deck or printed brochure aesthetic.',
    sampleImage: '/scene-samples/smb_saas_deck.png',
  },
];

export const SCENE_CATALOG: SceneTemplate[] = [...ECOMMERCE_SCENES, ...NON_ECOMMERCE_SCENES];

// 兜底入口「最常用」：跨类精选高频场景，给不确定自己属于哪类的用户一个起点（不并入 5 类真实客户，避免影响其它界面）。
export const POPULAR_CUSTOMER: CustomerDef = { key: 'popular', label: '最常用', tagline: '不确定从这开始就选这里' };

const POPULAR_PICKS: ReadonlyArray<readonly [string, string]> = [
  ['cross_border_ecommerce', 'white_bg'],
  ['domestic_ecommerce', 'white_bg'],
  ['cross_border_ecommerce', 'lifestyle'],
  ['physical_store_fnb', 'dish_hero'],
  ['domestic_ecommerce', 'poster'],
  ['cross_border_ecommerce', 'on_model'],
];

export const POPULAR_SCENES: SceneTemplate[] = POPULAR_PICKS
  .map(([customerKey, sceneKey]) =>
    SCENE_CATALOG.find((scene) => scene.customerKey === customerKey && scene.sceneKey === sceneKey),
  )
  .filter((scene): scene is SceneTemplate => Boolean(scene));

export function customerLabel(key: string): string {
  return CUSTOMERS.find((customer) => customer.key === key)?.label ?? key;
}

export function scenesOf(customerKey: string): SceneTemplate[] {
  return SCENE_CATALOG.filter((scene) => scene.customerKey === customerKey);
}
