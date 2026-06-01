import type { StudioT1 } from './studioLocation';

export type StudioNavChild = {
  id: string;
  label: string;
  description: string;
};

export type StudioNavItem = {
  id: StudioT1;
  label: string;
  description: string;
  children: StudioNavChild[];
};

export const STUDIO_NAV: StudioNavItem[] = [
  {
    id: 'create',
    label: '创建',
    description: '新图',
    children: [
      { id: 'ecommerce', label: '电商商品', description: '主图 / 详情 / 投放' },
      { id: 'content', label: '内容营销', description: '封面 / 海报 / 种草' },
      { id: 'local-store', label: '本地门店', description: '门店 / 团购 / 菜品' },
      { id: 'brand', label: '品牌物料', description: '官网 / 介绍 / 展会' },
      { id: 'quick-start', label: '快速开始', description: '上传 / 资产 / Prompt' },
    ],
  },
  {
    id: 'redraw',
    label: '重绘',
    description: '改图',
    children: [
      { id: 'input-source', label: '输入来源', description: '上传 / 资产' },
      { id: 'product', label: '商品生成', description: '主图 / 场景' },
      { id: 'cleanup', label: '图像清理', description: '去除 / 修复' },
      { id: 'replace', label: '局部替换', description: '背景 / 局部' },
      { id: 'variation', label: '变体生成', description: '变体 / 测试' },
      { id: 'extend', label: '画幅扩展', description: '横版 / 竖版' },
      { id: 'enhance', label: '质量增强', description: '清晰 / 质感' },
    ],
  },
  {
    id: 'assets',
    label: '资产库',
    description: '资产',
    children: [
      { id: 'uploads', label: '上传原图', description: '原图 / 品牌' },
      { id: 'recent-generated', label: '最近生成', description: '创建 / 重绘' },
      { id: 'recent-redraw', label: '最近重绘', description: '改图记录' },
      { id: 'favorites', label: '收藏', description: '图片 / Prompt' },
      { id: 'in-progress', label: '进行中', description: '排队 / 生成中' },
      { id: 'failed', label: '失败任务', description: '失败 / 重试' },
    ],
  },
  {
    id: 'inspiration',
    label: '灵感',
    description: '参考',
    children: [
      { id: 'recommended', label: '推荐', description: '推荐' },
      { id: 'favorite-inspiration', label: '收藏灵感', description: '收藏' },
      { id: 'same-industry', label: '同行业案例', description: '同行' },
      { id: 'trending', label: '最近热门', description: '热门' },
    ],
  },
  {
    id: 'user',
    label: '用户',
    description: '账户',
    children: [
      { id: 'account', label: '账号', description: '资料 / 登录' },
      { id: 'balance', label: '额度', description: '余额 / 消耗' },
      { id: 'preferences', label: '偏好', description: '默认参数' },
      { id: 'settings', label: '设置', description: '导出 / 隐私' },
    ],
  },
];

export function navItemById(id: StudioT1 | null) {
  return STUDIO_NAV.find((item) => item.id === id) ?? STUDIO_NAV[0];
}

export function defaultT2(t1: StudioT1 | null) {
  return navItemById(t1).children[0]?.id ?? null;
}
