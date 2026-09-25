import type { Category, Text2 } from './types'
const t = (en: string, zh: string): Text2 => ({ en, zh })
export const schemaVersion = 1
export const categories: Category[] = [
  { id: 'roads', name: t('Roads & roadside', '道路与路侧'), children: [
    { id: 'driving', name: t('Driving side', '行车方向'), selectionMode: 'single' },
    { id: 'markings', name: t('Lines & pavement', '标线与路面'), selectionMode: 'multiple' },
    { id: 'posts', name: t('Reflector posts', '反光桩'), selectionMode: 'multiple' },
    { id: 'poles', name: t('Utility poles', '电线杆'), selectionMode: 'multiple' },
    { id: 'barriers', name: t('Guardrails', '护栏'), selectionMode: 'multiple' },
    { id: 'signs', name: t('Road signs', '路牌'), selectionMode: 'multiple' },
  ] },
  { id: 'vehicles', name: t('Vehicles & camera', '车辆与相机'), children: [
    { id: 'plates', name: t('Vehicle plates', '车牌'), selectionMode: 'multiple' },
    { id: 'road-vehicles', name: t('Road vehicles', '道路车辆'), selectionMode: 'multiple' },
    { id: 'camera', name: t('Street View car & camera', '街景车与相机'), selectionMode: 'multiple' },
  ] },
  { id: 'landscape', name: t('Landscape & built world', '景观与建筑'), children: [
    { id: 'terrain', name: t('Terrain', '地形'), selectionMode: 'multiple' },
    { id: 'plants', name: t('Vegetation', '植被'), selectionMode: 'multiple' },
    { id: 'soil', name: t('Soil', '土壤'), selectionMode: 'multiple' },
    { id: 'buildings', name: t('Buildings', '建筑'), selectionMode: 'multiple' },
  ] },
  { id: 'writing', name: t('Writing & signs', '文字与招牌'), children: [
    { id: 'scripts', name: t('Letter shapes', '字形'), selectionMode: 'multiple' },
    { id: 'words', name: t('Visible words', '常见词'), selectionMode: 'multiple' },
    { id: 'brands', name: t('Shop signs, ads & logos', '店招、广告与标志'), selectionMode: 'multiple' },
  ] },
]
