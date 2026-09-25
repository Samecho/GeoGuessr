import type { Asset } from './types'
export const schemaVersion = 1
const commons = 'https://commons.wikimedia.org/wiki/File:'
const ccsa = 'https://creativecommons.org/licenses/by-sa/'
const by = 'https://creativecommons.org/licenses/by/'
const a = (id: string, file: string, original: string, author: string, license: string, licenseUrl: string): Asset => ({
  id, path: `/images/${file}`, sourceUrl: commons + original, author, license, licenseUrl,
  attribution: `${author}, Wikimedia Commons, ${license}; Wikimedia thumbnail, no local content alteration`,
  redistribution: 'Author-released Commons file; the stated Creative Commons license permits redistribution with attribution and license link.',
  reviewed: '2026-09-25', status: 'approved',
})
export const assets: Asset[] = [
  a('japan-stop', 'japan-stop.jpg', 'Japanesestopsign-may28-2015.jpg', 'Nesnad', 'CC BY 3.0', by + '3.0/'),
  a('thai-road-sign', 'thai-road-sign.jpg', 'Road_signs_in_NE_Thailand.JPG', 'Mattes', 'CC BY-SA 4.0', ccsa + '4.0/'),
  a('bilingual-street', 'bilingual-street.jpg', 'Bilingual_street_sign_in_Hampstead,_Quebec.jpg', 'D. Benjamin Miller', 'CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/'),
  a('yellow-centerline', 'yellow-centerline.jpg', 'Keltainen_sulkuviiva_20180524.jpg', 'Santeri Viinamäki', 'CC BY-SA 4.0', ccsa + '4.0/'),
  a('three-scripts', 'three-scripts.jpg', 'Multilingualism_in_Israel.jpg', 'Anthony Baratier', 'CC BY-SA 3.0', ccsa + '3.0/'),
  a('cyrillic-road', 'cyrillic-road.jpg', 'Road_Sign_in_Satovcha_Municipality.jpg', 'Пакко', 'CC BY-SA 3.0', ccsa + '3.0/'),
  a('red-yellow-shop', 'red-yellow-shop.jpg', 'Oxxo_en_La_Chinesca.jpg', 'ProtoplasmaKid', 'CC BY 4.0', by + '4.0/'),
  a('yellow-rear-detail', 'yellow-rear-detail.jpg', 'NORTHERN_IRELAND,_BELFAST_2000%27s_-YELLOW_REAR_USE_VEHICLE_LICENSE_PLATE_-_Flickr_-_woody1778a.jpg', 'Jerry Woody', 'CC BY-SA 2.0', ccsa + '2.0/'),
  a('yellow-rear-plate', 'yellow-rear-plate.jpg', 'Datsun_Cherry_E10_100A_-_Yellow_saloon_rear.jpg', 'Colin Smith', 'CC BY-SA 2.0', ccsa + '2.0/'),
  a('concrete-pole', 'concrete-pole.jpg', 'Power_pole_with_line_anchoring.jpg', 'Matthieu2743', 'CC BY-SA 4.0', ccsa + '4.0/'),
  a('black-white-post', 'black-white-post.jpg', 'Hectoreflecto_D_26k346.jpg', 'Pudding4brains', 'CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/'),
  a('alto-sign', 'alto.jpg', 'ALTO_sign.jpg', 'Dickelbers', 'CC BY-SA 4.0', ccsa + '4.0/'),
  a('philippine-tricycle', 'tricycle.jpg', 'A_tricycle_on_the_streets_of_Talisay,_Cebu.jpg', 'Øyvind Holmstad', 'CC BY-SA 4.0', ccsa + '4.0/'),
  a('araucaria', 'araucaria.jpg', 'Araucárias_(31463020692).jpg', 'Rafael Vianna Croffi', 'CC BY 2.0', by + '2.0/'),
  a('belisha', 'belisha.jpg', 'Belisha_beacon_in_Fetter_Lane_-_geograph.org.uk_-_1802863.jpg', 'Basher Eyre', 'CC BY-SA 2.0', ccsa + '2.0/'),
  a('caatinga-road', 'caatinga.jpg', 'Estrada_entre_Canudos_e_Jeremoabo_na_Bahia_Road_between_Canudos_and_Jeremoabo_in_Bahia_(12182535453).jpg', 'A. Duarte', 'CC BY-SA 2.0', ccsa + '2.0/'),
  a('k-market', 'kmarket.jpg', 'K-Market_Inari_retailer_by_Inarintie_in_Inari_village,_Inari,_Lapland,_Finland,_2021_September.jpg', 'Ximonic (Simo Räsänen)', 'CC BY-SA 3.0', ccsa + '3.0/'),
  a('tamil-road', 'tamil.jpg', 'Karadivavi_road_sign_board_in_Tamil_Nadu_JEG6438.JPG', 'PJeganathan', 'CC BY-SA 4.0', ccsa + '4.0/'),
  a('hangul-road', 'hangul.jpg', 'Korean_local_line_1011.JPG', 'hyolee2', 'CC BY-SA 3.0', ccsa + '3.0/'),
  a('lao-stop', 'lao.jpg', 'Luang-Prabang_Laos_Stop-Sign-01.jpg', 'CEphoto, Uwe Aranas', 'CC BY-SA 3.0', ccsa + '3.0/'),
  a('khmer-road', 'khmer.jpg', 'Road_signs_in_Cambodia._Electricity_Factory_5_km.jpg', 'Dmitry Makeev', 'CC BY-SA 4.0', ccsa + '4.0/'),
  a('irish-diamond', 'irish.jpg', 'Sign-1020567,_Blanchardstown,_Dublin,_Ireland.jpg', 'Leimanbhradain', 'CC BY-SA 4.0', ccsa + '4.0/'),
  a('s-market', 'smarket.jpg', 'S_Market_Ranua.jpg', 'Ypsilon from Finland', 'CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/'),
  a('dur-sign', 'dur.jpg', 'Stop_sign,_Beyoğlu_7May23.jpg', 'Mariam elr', 'CC BY-SA 4.0', ccsa + '4.0/'),
  { id: 'yuque-botswana-road-map', path: '/images/yuque-botswana-covered-roads.png', sourceUrl: 'https://www.yuque.com/chaofun/tuxun/botswana', author: 'Plonk It; Chinese adaptation by 图寻汉化组', license: 'CC BY-NC-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/', attribution: 'Plonk It / 图寻汉化组, Botswana road coverage diagram from 图寻文档; original marks retained', redistribution: 'The Yuque copyright page grants CC BY-NC-SA 4.0 for the translated Plonk It Guide series; this original diagram contains no extracted Street View frame and is shown only with the applicable attribution.', reviewed: '2026-09-25', status: 'approved' },
]
export const assetById = new Map(assets.map((asset) => [asset.id, asset]))

