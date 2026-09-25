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
]
export const assetById = new Map(assets.map((asset) => [asset.id, asset]))

