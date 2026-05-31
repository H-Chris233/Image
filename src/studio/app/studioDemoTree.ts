import type { StudioComposer, StudioT3 } from './studioLocation';

export type StudioDemoT3 = {
  id: string;
  title: string;
  description: string;
  kind: NonNullable<StudioT3>['kind'];
  composer: NonNullable<StudioComposer>['kind'] | null;
  preset: Record<string, string>;
  actions: string[];
};

export type StudioDemoPanel = {
  emptyTitle: string;
  emptyDescription: string;
  items: StudioDemoT3[];
};

const createPanels: Record<string, StudioDemoPanel> = {
  ecommerce: panel('电商商品', '主图 / 详情 / 投放', [
    create('product-white-background', '白底图', '平台主图'),
    create('product-scene', '场景图', '生活方式'),
    create('product-benefit', '卖点图', '详情页 / 广告'),
    create('product-detail', '详情图', '详情页'),
    create('product-ad', '广告图', '投放素材'),
    create('product-sizes', '多平台尺寸', '多尺寸适配'),
  ]),
  content: panel('内容营销', '封面 / 海报 / 种草', [
    create('xiaohongshu-cover', '小红书封面', '图文首图'),
    create('article-cover', '公众号封面', '文章封面'),
    create('short-video-cover', '短视频封面', '视频首帧'),
    create('event-poster', '活动海报', '活动发布'),
    create('seeding-card', '种草图', '内容流'),
    create('promo-card', '促销卡片', '优惠信息'),
  ]),
  'local-store': panel('本地门店', '门店 / 团购 / 菜品', [
    create('store-poster', '门店海报', '到店宣传'),
    create('group-buying', '团购套餐', '平台展示'),
    create('dish-image', '菜品图', '菜单 / 外卖'),
    create('store-event', '到店活动', '活动引流'),
    create('holiday-promo', '节日促销', '节日节点'),
    create('store-signage', '招牌物料', '门头 / 店内'),
  ]),
  brand: panel('品牌物料', '官网 / 介绍 / 展会', [
    create('website-hero', '官网首屏', '官网首屏'),
    create('product-intro', '产品介绍', '产品说明'),
    create('brand-kv', '品牌 KV', '品牌主视觉'),
    create('investment-image', '招商图', '招商物料'),
    create('expo-material', '展会图', '展会物料'),
    create('social-material', '社媒物料', '品牌发布'),
  ]),
  'quick-start': panel('快速开始', '上传 / 资产 / Prompt', [
    create('upload-image', '上传图', '本地图片'),
    create('from-assets', '选资产', '资产库'),
    create('recent-generated', '最近生成', '上一轮结果'),
    create('favorite-image', '收藏图', '收藏资产'),
    create('apply-template', '套模板', '模板库'),
    create('paste-prompt', '写提示词', '自由输入'),
  ]),
};

const redrawPanels: Record<string, StudioDemoPanel> = {
  'input-source': panel('输入来源', '选择输入图。', [
    redraw('upload-new', '上传图', '本地图片'),
    redraw('from-assets', '选资产', '资产库'),
    redraw('from-recent', '最近生成', '上一轮结果'),
    redraw('from-favorite', '收藏图', '收藏资产'),
  ]),
  product: panel('商品生成', '选择动作。', [
    redraw('white-background', '白底图', '平台主图'),
    redraw('premium-hero', '精修图', '棚拍质感'),
    redraw('lifestyle-scene', '场景图', '生活方式'),
  ]),
  cleanup: panel('图像清理', '选择动作。', [
    redraw('remove-object', '去杂物', '移除物体'),
    redraw('remove-background', '去背景', '主体保留'),
    redraw('fix-flaws', '修瑕疵', '污点 / 折痕'),
  ]),
  replace: panel('局部替换', '选择动作。', [
    redraw('replace-background', '换背景', '背景替换'),
    redraw('change-color', '改颜色', '颜色调整'),
    redraw('replace-local-object', '换局部', '局部物体'),
    redraw('keep-subject-scene', '换场景', '主体保留'),
  ]),
  variation: panel('变体生成', '选择动作。', [
    redraw('same-style-variation', '同款变体', '背景 / 光影'),
    redraw('platform-spec', '平台规格', '尺寸适配'),
    redraw('style-variation', '风格变体', '风格切换'),
    redraw('ab-test-assets', 'A/B 素材', '投放测试'),
  ]),
  extend: panel('画幅扩展', '选择动作。', [
    redraw('horizontal-ad', '横版图', '16:9'),
    redraw('vertical-poster', '竖版图', '9:16'),
    redraw('square-main', '方图', '1:1'),
    redraw('content-cover', '内容封面', '封面图'),
  ]),
  enhance: panel('质量增强', '选择动作。', [
    redraw('upscale-resolution', '提清晰', '分辨率'),
    redraw('enhance-texture', '提材质', '纹理 / 反光'),
    redraw('fix-lighting', '修光影', '曝光 / 阴影'),
    redraw('commercial-photo', '商业感', '棚拍升级'),
  ]),
};

const assetPanels: Record<string, StudioDemoPanel> = {
  uploads: panel('上传原图', '选择资产。', [
    asset('product-originals', '商品图', '原始商品'),
    asset('portrait-originals', '人像图', '人物 / 模特'),
    asset('scene-reference', '场景图', '背景 / 构图'),
    asset('brand-assets', '品牌素材', 'Logo / 包装'),
  ]),
  'recent-generated': panel('最近生成', '选择资产。', [
    asset('create-results', '创建图', '创建结果'),
    asset('redraw-results', '重绘图', '重绘结果'),
    asset('variation-results', '变体图', '测试版本'),
    asset('prompt-assets', 'Prompt', '提示词'),
  ]),
  'recent-redraw': panel('最近重绘', '选择记录。', [
    asset('background-edits', '换背景', '背景任务'),
    asset('extends', '扩图', '画幅任务'),
    asset('cleanup-edits', '清理', '清理任务'),
    asset('enhance-edits', '增强', '增强任务'),
  ]),
  favorites: panel('收藏', '选择收藏。', [
    asset('favorite-images', '收藏图', '图片'),
    asset('favorite-prompts', 'Prompt', '提示词'),
    asset('favorite-styles', '风格', '风格资产'),
  ]),
  failed: panel('失败任务', '选择任务。', [
    asset('generation-failed', '生成失败', '模型 / 超时'),
    asset('upload-failed', '上传失败', '格式 / 权限'),
    asset('retryable-tasks', '可重试', '保留参数'),
  ]),
};

const inspirationPanels: Record<string, StudioDemoPanel> = {
  recommended: panel('推荐', '选择灵感。', [
    inspiration('recommended-create', '创建类似', '同类生成'),
    inspiration('recommended-redraw', '用图重绘', '参考输入'),
    inspiration('recommended-save', '收藏', '存入资产库'),
    inspiration('recommended-prompt', '看 Prompt', '提示词'),
  ]),
  'favorite-inspiration': panel('收藏灵感', '选择灵感。', [
    inspiration('favorite-style', '风格', '风格参考'),
    inspiration('favorite-image', '图片', '图像参考'),
    inspiration('favorite-prompt', 'Prompt', '提示词'),
  ]),
  'same-industry': panel('同行案例', '选择案例。', [
    inspiration('industry-main-image', '同行主图', '平台主图'),
    inspiration('industry-ad', '同行广告', '投放创意'),
    inspiration('industry-social', '同行内容', '社媒图'),
  ]),
  trending: panel('最近热门', '选择趋势。', [
    inspiration('trend-layout', '热门构图', '构图'),
    inspiration('trend-style', '热门风格', '风格'),
    inspiration('trend-platform', '热门规格', '平台规格'),
  ]),
};

const userPanels: Record<string, StudioDemoPanel> = {
  account: panel('账号', '选择项目。', [
    user('profile', '账号资料', '资料 / 登录'),
    user('workspace', '工作区', '个人 / 团队'),
  ]),
  balance: panel('额度', '选择项目。', [
    user('current-balance', '当前额度', '余额'),
    user('usage-records', '消耗记录', '任务消耗'),
    user('upgrade-plan', '套餐升级', '充值 / 权益'),
  ]),
  preferences: panel('偏好', '选择项目。', [
    user('default-ratio', '默认比例', '画幅'),
    user('default-count', '默认数量', '张数'),
    user('default-industry', '默认行业', '行业'),
    user('default-platform', '默认平台', '平台'),
  ]),
  settings: panel('设置', '选择项目。', [
    user('language', '语言', '界面 / 输出'),
    user('watermark', '水印', '导出规则'),
    user('export-format', '导出格式', '文件格式'),
    user('privacy', '隐私', '可见性'),
  ]),
};

const panelsByT1 = {
  create: createPanels,
  redraw: redrawPanels,
  assets: assetPanels,
  inspiration: inspirationPanels,
  user: userPanels,
};

export function demoPanelFor(t1: keyof typeof panelsByT1, t2: string | null | undefined) {
  const panels = panelsByT1[t1];
  return panels[t2 ?? ''] ?? Object.values(panels)[0];
}

function panel(emptyTitle: string, emptyDescription: string, items: StudioDemoT3[]): StudioDemoPanel {
  return { emptyTitle, emptyDescription, items };
}

function create(id: string, title: string, description: string): StudioDemoT3 {
  return item('workflow', 'create', id, title, description, ['Brief', '参考', '生成', '入库']);
}

function redraw(id: string, title: string, description: string): StudioDemoT3 {
  return item('scenario', 'redraw', id, title, description, ['输入', '要求', '生成', '再重绘']);
}

function asset(id: string, title: string, description: string): StudioDemoT3 {
  return item('asset', 'asset-action', id, title, description, ['重绘', '参考', 'Prompt', '下载']);
}

function inspiration(id: string, title: string, description: string): StudioDemoT3 {
  return item('inspiration', null, id, title, description, ['创建', '重绘', '收藏']);
}

function user(id: string, title: string, description: string): StudioDemoT3 {
  return item('workflow', null, id, title, description, ['查看', '修改', '保存']);
}

function item(
  kind: NonNullable<StudioT3>['kind'],
  composer: NonNullable<StudioComposer>['kind'] | null,
  id: string,
  title: string,
  description: string,
  actions: string[],
): StudioDemoT3 {
  return {
    id,
    title,
    description,
    kind,
    composer,
    preset: { id, title },
    actions,
  };
}
