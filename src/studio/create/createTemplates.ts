export type CreateScenario = 'ecommerce' | 'content' | 'local-store' | 'brand' | 'quick-start';

export type TemplateInputType = 'image' | 'text' | 'asset' | 'optional-image';
export type TemplateVariableType = 'text' | 'select' | 'color' | 'toggle';
export type TemplateQuickAction = 'upload' | 'asset' | 'editPrompt' | 'generate';

export type StudioCreateTemplate = {
  id: string;
  title: string;
  scenario: CreateScenario;
  useCase: string;
  previewImage: string;
  platforms: string[];
  aspectRatios: string[];
  requiredInputs: Array<{
    id: string;
    label: string;
    type: TemplateInputType;
    required: boolean;
  }>;
  variables: Array<{
    id: string;
    label: string;
    type: TemplateVariableType;
    defaultValue: string | boolean;
    options?: string[];
  }>;
  promptTemplate: string;
  quickActions: TemplateQuickAction[];
};

const productImage = { id: 'productImage', label: '商品图', type: 'image' as const, required: true };
const optionalImage = { id: 'referenceImage', label: '参考图', type: 'optional-image' as const, required: false };
const assetInput = { id: 'asset', label: '资产', type: 'asset' as const, required: true };
const sellingPointText = { id: 'sellingPoints', label: '卖点文案', type: 'text' as const, required: true };
const topicText = { id: 'topic', label: '主题', type: 'text' as const, required: true };

export const CREATE_TEMPLATES: StudioCreateTemplate[] = [
  {
    id: 'ecommerce-white-bg',
    title: '白底图',
    scenario: 'ecommerce',
    useCase: '平台主图',
    previewImage: '/scene-samples/cross_border_ecommerce_white_bg.jpg',
    platforms: ['Amazon', '独立站', '淘宝'],
    aspectRatios: ['1:1', '4:5'],
    requiredInputs: [productImage],
    variables: [
      { id: 'background', label: '背景', type: 'select', defaultValue: '纯白', options: ['纯白', '浅灰', '透明'] },
      { id: 'shadow', label: '阴影', type: 'select', defaultValue: '轻微', options: ['无', '轻微', '真实'] },
      { id: 'composition', label: '构图', type: 'select', defaultValue: '居中', options: ['居中', '充满', '留白'] },
    ],
    promptTemplate: '把商品处理成{background}背景的电商白底图，保持商品真实材质，{shadow}阴影，{composition}构图。',
    quickActions: ['upload', 'asset', 'editPrompt', 'generate'],
  },
  {
    id: 'ecommerce-scene',
    title: '场景图',
    scenario: 'ecommerce',
    useCase: '生活方式',
    previewImage: '/scene-samples/cross_border_ecommerce_lifestyle.jpg',
    platforms: ['独立站', '小红书', '淘宝'],
    aspectRatios: ['1:1', '4:5', '16:9'],
    requiredInputs: [productImage, optionalImage],
    variables: [
      { id: 'scene', label: '场景', type: 'select', defaultValue: '居家', options: ['居家', '户外', '节日', '高级棚拍'] },
      { id: 'mood', label: '氛围', type: 'select', defaultValue: '自然', options: ['自然', '高级感', '清透', '热卖'] },
    ],
    promptTemplate: '为商品生成{scene}使用场景图，氛围{mood}，商品清晰真实，适合电商展示。',
    quickActions: ['upload', 'asset', 'editPrompt', 'generate'],
  },
  {
    id: 'ecommerce-benefit',
    title: '卖点图',
    scenario: 'ecommerce',
    useCase: '详情页 / 广告',
    previewImage: '/scene-samples/domestic_ecommerce_poster.jpg',
    platforms: ['淘宝', 'Meta', '独立站'],
    aspectRatios: ['4:5', '16:9'],
    requiredInputs: [productImage, sellingPointText],
    variables: [
      { id: 'layout', label: '版式', type: 'select', defaultValue: '三卖点', options: ['三卖点', '左右对比', '大标题'] },
      { id: 'tone', label: '风格', type: 'select', defaultValue: '清晰商业', options: ['清晰商业', '高级简洁', '大促强转化'] },
    ],
    promptTemplate: '基于商品图制作{layout}卖点图，风格{tone}，突出卖点文案：{sellingPoints}。',
    quickActions: ['upload', 'asset', 'editPrompt', 'generate'],
  },
  {
    id: 'ecommerce-detail',
    title: '详情图',
    scenario: 'ecommerce',
    useCase: '详情页',
    previewImage: '/scene-samples/domestic_ecommerce_macro.jpg',
    platforms: ['淘宝', '独立站', 'Amazon'],
    aspectRatios: ['4:5', '1:1'],
    requiredInputs: [productImage, sellingPointText],
    variables: [
      { id: 'focus', label: '重点', type: 'select', defaultValue: '材质细节', options: ['材质细节', '功能拆解', '使用步骤'] },
      { id: 'density', label: '信息量', type: 'select', defaultValue: '适中', options: ['克制', '适中', '信息丰富'] },
    ],
    promptTemplate: '生成商品详情图，重点展示{focus}，信息量{density}，画面干净可读。',
    quickActions: ['upload', 'asset', 'editPrompt', 'generate'],
  },
  {
    id: 'ecommerce-ad',
    title: '广告图',
    scenario: 'ecommerce',
    useCase: '投放素材',
    previewImage: '/scene-samples/cross_border_ecommerce_poster.jpg',
    platforms: ['Meta', 'Google', '抖音'],
    aspectRatios: ['1:1', '4:5', '16:9'],
    requiredInputs: [productImage, sellingPointText],
    variables: [
      { id: 'hook', label: '钩子', type: 'select', defaultValue: '新品上市', options: ['新品上市', '限时优惠', '痛点解决'] },
      { id: 'visual', label: '视觉', type: 'select', defaultValue: '高对比', options: ['高对比', '生活方式', '极简'] },
    ],
    promptTemplate: '为商品生成{hook}广告图，视觉{visual}，突出转化卖点：{sellingPoints}。',
    quickActions: ['upload', 'asset', 'editPrompt', 'generate'],
  },
  {
    id: 'ecommerce-platform-sizes',
    title: '多平台尺寸',
    scenario: 'ecommerce',
    useCase: '多尺寸适配',
    previewImage: '/scene-samples/domestic_ecommerce_white_bg.jpg',
    platforms: ['Amazon', '淘宝', '小红书', '抖音'],
    aspectRatios: ['1:1', '4:5', '16:9', '9:16'],
    requiredInputs: [assetInput],
    variables: [
      { id: 'safeArea', label: '留白', type: 'select', defaultValue: '自动', options: ['自动', '偏大', '紧凑'] },
      { id: 'cropMode', label: '裁切', type: 'select', defaultValue: '保主体', options: ['保主体', '充满画面', '保留文案'] },
    ],
    promptTemplate: '将资产适配为多平台尺寸，{safeArea}留白，{cropMode}裁切，保持主体完整。',
    quickActions: ['asset', 'editPrompt', 'generate'],
  },
  {
    id: 'content-xhs-cover',
    title: '小红书封面',
    scenario: 'content',
    useCase: '图文首图',
    previewImage: '/scene-samples/domestic_ecommerce_on_model.jpg',
    platforms: ['小红书'],
    aspectRatios: ['3:4', '4:5'],
    requiredInputs: [topicText, optionalImage],
    variables: [
      { id: 'style', label: '风格', type: 'select', defaultValue: '种草', options: ['种草', '清透', '高级感'] },
      { id: 'titleTone', label: '标题', type: 'select', defaultValue: '直接', options: ['直接', '情绪化', '教程感'] },
    ],
    promptTemplate: '生成小红书封面，主题{topic}，风格{style}，标题表达{titleTone}，画面适合内容流点击。',
    quickActions: ['editPrompt', 'upload', 'generate'],
  },
  {
    id: 'content-article-cover',
    title: '公众号封面',
    scenario: 'content',
    useCase: '文章封面',
    previewImage: '/scene-samples/media_account_article_cover.png',
    platforms: ['公众号'],
    aspectRatios: ['16:9', '2.35:1'],
    requiredInputs: [topicText],
    variables: [
      { id: 'tone', label: '调性', type: 'select', defaultValue: '专业', options: ['专业', '故事感', '观点型'] },
      { id: 'layout', label: '版式', type: 'select', defaultValue: '标题优先', options: ['标题优先', '图像优先', '留白'] },
    ],
    promptTemplate: '生成公众号封面，主题{topic}，调性{tone}，版式{layout}。',
    quickActions: ['editPrompt', 'generate'],
  },
  {
    id: 'content-video-cover',
    title: '短视频封面',
    scenario: 'content',
    useCase: '视频首帧',
    previewImage: '/scene-samples/media_account_banner.png',
    platforms: ['抖音', '视频号', '小红书'],
    aspectRatios: ['9:16', '16:9'],
    requiredInputs: [topicText, optionalImage],
    variables: [
      { id: 'energy', label: '强度', type: 'select', defaultValue: '中等', options: ['克制', '中等', '强吸睛'] },
      { id: 'textSize', label: '标题大小', type: 'select', defaultValue: '大', options: ['中', '大', '超大'] },
    ],
    promptTemplate: '生成短视频封面，主题{topic}，视觉强度{energy}，标题{textSize}。',
    quickActions: ['upload', 'editPrompt', 'generate'],
  },
  {
    id: 'local-store-poster',
    title: '门店海报',
    scenario: 'local-store',
    useCase: '到店宣传',
    previewImage: '/scene-samples/physical_store_fnb_promo_poster.png',
    platforms: ['小红书', '美团', '门店'],
    aspectRatios: ['4:5', '9:16'],
    requiredInputs: [topicText, optionalImage],
    variables: [
      { id: 'offer', label: '活动', type: 'text', defaultValue: '新品上架' },
      { id: 'mood', label: '氛围', type: 'select', defaultValue: '热闹', options: ['热闹', '温暖', '高级'] },
    ],
    promptTemplate: '生成门店海报，主题{topic}，活动{offer}，氛围{mood}。',
    quickActions: ['upload', 'editPrompt', 'generate'],
  },
  {
    id: 'local-store-dish',
    title: '菜品图',
    scenario: 'local-store',
    useCase: '菜单 / 外卖',
    previewImage: '/scene-samples/physical_store_fnb_dish_hero.png',
    platforms: ['美团', '饿了么', '小红书'],
    aspectRatios: ['1:1', '4:5'],
    requiredInputs: [productImage],
    variables: [
      { id: 'lighting', label: '光线', type: 'select', defaultValue: '自然光', options: ['自然光', '暖光', '棚拍'] },
      { id: 'plate', label: '摆盘', type: 'select', defaultValue: '精致', options: ['真实', '精致', '高级'] },
    ],
    promptTemplate: '把菜品生成{lighting}的{plate}菜品图，适合外卖和菜单展示。',
    quickActions: ['upload', 'asset', 'generate'],
  },
  {
    id: 'brand-website-hero',
    title: '官网首屏',
    scenario: 'brand',
    useCase: '官网首屏',
    previewImage: '/scene-samples/smb_saas_hero.png',
    platforms: ['官网', '落地页'],
    aspectRatios: ['16:9', '21:9'],
    requiredInputs: [topicText, optionalImage],
    variables: [
      { id: 'brandTone', label: '品牌感', type: 'select', defaultValue: '可信', options: ['可信', '科技', '高端', '温暖'] },
      { id: 'space', label: '留白', type: 'select', defaultValue: '左侧文案区', options: ['左侧文案区', '右侧文案区', '居中'] },
    ],
    promptTemplate: '生成官网首屏视觉，主题{topic}，品牌感{brandTone}，预留{space}。',
    quickActions: ['upload', 'editPrompt', 'generate'],
  },
  {
    id: 'brand-product-intro',
    title: '产品介绍',
    scenario: 'brand',
    useCase: '产品说明',
    previewImage: '/scene-samples/smb_saas_feature.png',
    platforms: ['官网', 'PPT', '社媒'],
    aspectRatios: ['16:9', '4:5'],
    requiredInputs: [topicText, optionalImage],
    variables: [
      { id: 'structure', label: '结构', type: 'select', defaultValue: '功能拆解', options: ['功能拆解', '价值陈列', '步骤说明'] },
      { id: 'style', label: '视觉', type: 'select', defaultValue: '简洁', options: ['简洁', '科技', '实拍感'] },
    ],
    promptTemplate: '生成产品介绍图，主题{topic}，结构{structure}，视觉{style}。',
    quickActions: ['upload', 'editPrompt', 'generate'],
  },
  {
    id: 'quick-upload',
    title: '上传图',
    scenario: 'quick-start',
    useCase: '本地图片',
    previewImage: '/scene-samples/domestic_ecommerce_premium_hero.jpg',
    platforms: ['通用'],
    aspectRatios: ['1:1', '4:5', '16:9'],
    requiredInputs: [productImage],
    variables: [
      { id: 'goal', label: '目标', type: 'text', defaultValue: '生成一张可直接使用的商品图' },
    ],
    promptTemplate: '根据上传图片，{goal}。',
    quickActions: ['upload', 'editPrompt', 'generate'],
  },
  {
    id: 'quick-prompt',
    title: '写提示词',
    scenario: 'quick-start',
    useCase: '自由输入',
    previewImage: '/scene-samples/media_account_quote_card.png',
    platforms: ['通用'],
    aspectRatios: ['1:1', '4:5', '16:9', '9:16'],
    requiredInputs: [{ id: 'prompt', label: '提示词', type: 'text', required: true }],
    variables: [],
    promptTemplate: '{prompt}',
    quickActions: ['editPrompt', 'generate'],
  },
];

export const WORKFLOW_SHORTCUTS = [
  { id: 'upload-white-bg', title: '从白底图开始', description: '直接做白底图', templateId: 'ecommerce-white-bg' },
  { id: 'asset-scene', title: '从资产继续', description: '生成场景图', templateId: 'ecommerce-scene' },
  { id: 'recent-variant', title: '最近生成', description: '改尺寸或风格', templateId: 'ecommerce-platform-sizes' },
  { id: 'prompt-image', title: '写提示词', description: '自由生成', templateId: 'quick-prompt' },
];

export function templatesForScenario(scenario: CreateScenario | string | null | undefined) {
  return CREATE_TEMPLATES.filter((template) => template.scenario === scenario);
}

export function templateById(id: string | null | undefined) {
  return CREATE_TEMPLATES.find((template) => template.id === id) ?? null;
}
