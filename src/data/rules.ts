import { countries } from './countries'
import type { Rule, Text2 } from './types'

export const schemaVersion = 1
const t = (en: string, zh: string): Text2 => ({ en, zh })
const date = '2026-09-25'
const sideSource = 'https://www.worldstandards.eu/cars/list-of-left-driving-countries/'
const left = new Set('GB IE IM JE MT CY JP HK MO IN BD BT ID MY SG LK TH AU NZ ZA BW SZ KE LS NA UG BM VI'.split(' '))
const right = countries.map((c) => c.id).filter((id) => !left.has(id))
const rule = (id: string, targets: string[], when: Rule['when'], weight: number, group: string,
  rationale: Text2, sourceUrls: string[], relation: Rule['relation'] = 'single', scope: Rule['scope'] = 'country', countryId?: string): Rule =>
  ({ id, targets, when, weight, group, rationale, sourceUrls, relation, scope, countryId, reviewed: date })

// Log-score weights are deliberately heuristic. Sources establish presence, standards or
// company footprint, not measured likelihood ratios in GeoGuessr maps.
export const rules: Rule[] = [
  rule('left-support', [...left], { all: ['drive-left'] }, 0.95, 'driving-side', t('Documented traffic side is broad but useful.', '已记录的通行方向可作宽泛筛选。'), [sideSource]),
  rule('left-oppose', right, { all: ['drive-left'] }, -0.95, 'driving-side', t('Opposite national traffic rule; one-way and border exceptions remain possible.', '与常规通行方向相反，但单行道与边境仍有例外。'), [sideSource]),
  rule('right-support', right, { all: ['drive-right'] }, 0.95, 'driving-side', t('Documented traffic side is broad but useful.', '已记录的通行方向可作宽泛筛选。'), [sideSource]),
  rule('right-oppose', [...left], { all: ['drive-right'] }, -0.95, 'driving-side', t('Opposite national traffic rule; exceptions remain possible.', '与常规通行方向相反，但仍可能有例外。'), [sideSource]),
  rule('japan-stop', ['JP'], { all: ['japan-stop'] }, 6.2, 'japan-stop', t('Specific shape and Japanese inscription together are highly distinctive.', '形状与日文字同时可见时辨识度高。'), ['https://commons.wikimedia.org/wiki/File:Japanesestopsign-may28-2015.jpg']),
  rule('japan-stop-absent', ['JP'], { excluded: ['japan-stop'] }, -0.18, 'japan-stop-absence', t('No stop sign in a fully visible junction is weak evidence only.', '完整可见的路口没有该牌仅是很弱的反证。'), ['https://commons.wikimedia.org/wiki/File:Japanesestopsign-may28-2015.jpg']),
  rule('thai-script', ['TH'], { all: ['thai-script'] }, 5.5, 'thai-script', t('Legible Thai shapes on an ordinary public road sign are distinctive.', '普通公共路牌上的清晰泰文字形辨识度较高。'), ['https://commons.wikimedia.org/wiki/File:Road_signs_in_NE_Thailand.JPG']),
  rule('three-scripts-israel', ['IL'], { all: ['three-scripts'] }, 4.2, 'three-scripts', t('The observed Hebrew, Arabic and Latin combination is documented on Israeli road signs.', '希伯来、阿拉伯与拉丁文字组合见于以色列道路标牌。'), ['https://commons.wikimedia.org/wiki/File:Multilingualism_in_Israel.jpg']),
  rule('cyrillic-shared', ['BG','RS','MK','RU','UA','KZ','KG','ME'], { all: ['cyrillic'] }, 1.6, 'writing-system', t('Cyrillic is shared across multiple covered countries.', '西里尔字母由多个覆盖国家共用。'), ['https://commons.wikimedia.org/wiki/File:Road_Sign_in_Satovcha_Municipality.jpg']),
  rule('bilingual-canada', ['CA'], { all: ['french-english'] }, 1.7, 'bilingual-writing', t('English–French signs are documented in several Canadian jurisdictions.', '多个加拿大司法辖区有英法双语标牌。'), ['https://www.ontario.ca/document/official-ministry-transportation-mto-truck-handbook/signs','https://www.gnb.ca/en/org/languages/service.html']),
  rule('yellow-rear-uk', ['GB'], { all: ['yellow-rear'] }, 2.4, 'plate-color', t('UK law requires yellow rear plates on ordinary vehicles.', '英国法律要求普通车辆使用黄色后牌。'), ['https://www.gov.uk/displaying-number-plates/rules-number-plates']),
  rule('yellow-rear-netherlands', ['NL'], { all: ['yellow-rear'] }, 0.9, 'plate-color', t('Yellow plates also appear in the Netherlands; rear yellow alone is not exclusive.', '荷兰也有黄色车牌，单看黄色后牌并不独有。'), ['https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_the_Netherlands']),
  rule('yellow-rear-left-interaction', ['GB'], { all: ['yellow-rear','drive-left'] }, 0.65, 'plate-road-combo', t('This adds a small interaction beyond the two separate clues; it is not a measured frequency.', '在两条独立线索外增加少量组合项，并非实测频率。'), ['https://www.gov.uk/displaying-number-plates/rules-number-plates',sideSource], 'extra'),
  rule('yellow-line-finland', ['FI'], { all: ['yellow-center'] }, 0.6, 'line-color', t('A verified Finnish example supports presence, but yellow lines are widespread.', '已核实芬兰实例证明存在，但黄色标线广泛分布。'), ['https://commons.wikimedia.org/wiki/File:Keltainen_sulkuviiva_20180524.jpg']),
  rule('oxxo-mexico', ['MX'], { all: ['oxxo'] }, 2.4, 'brand-oxxo', t('FEMSA identifies Mexico as the original OXXO market; the weight is a heuristic, not measured map frequency.', 'FEMSA 列明墨西哥是 OXXO 发源地；权重是启发式参数，并非地图实测频率。'), ['https://www.femsa.com/en/business-units/proximity-and-health/oxxo/']),
  rule('oxxo-other', ['BR','CL','CO','PE','US'], { all: ['oxxo'] }, 0.9, 'brand-oxxo', t('The operator explicitly lists these additional markets.', '运营商明确列出这些其他市场。'), ['https://www.femsa.com/en/business-units/proximity-and-health/oxxo/']),
  rule('ca-bilingual-nb', ['NB'], { all: ['french-english'] }, 1.0, 'bilingual-region', t('New Brunswick requires bilingual government signs.', '新不伦瑞克要求政府标牌双语。'), ['https://www.gnb.ca/en/org/languages/service.html'], 'single', 'region', 'CA'),
  rule('ca-bilingual-on', ['ON'], { all: ['french-english'] }, 0.65, 'bilingual-region', t('Ontario transport guidance documents bilingual signs in designated areas.', '安大略交通指南记录指定地区的双语标牌。'), ['https://www.ontario.ca/document/official-ministry-transportation-mto-truck-handbook/signs'], 'single', 'region', 'CA'),
  rule('ca-bilingual-qc', ['QC'], { all: ['french-english'] }, 0.25, 'bilingual-region', t('A documented local bilingual street sign exists; this does not imply Quebec-wide prevalence.', '有已记录的当地双语街牌，不代表全省普遍。'), ['https://commons.wikimedia.org/wiki/File:Bilingual_street_sign_in_Hampstead,_Quebec.jpg'], 'single', 'region', 'CA'),
  rule('ca-front-plate-on', ['ON'], { all: ['front-plate-seen'] }, 0.45, 'plate-front', t('Ontario generally requires front and rear plates; an individual vehicle remains weak evidence.', '安大略通常要求前后车牌，但单辆车只是弱证据。'), ['https://www.ontario.ca/laws/regulation/900628/v93'], 'single', 'region', 'CA'),
  rule('ca-no-front-ab', ['AB'], { all: ['front-plate-absent'] }, 0.45, 'plate-front', t('Alberta locates ordinary plates on the rear; other vehicle origins remain possible.', '阿尔伯塔普通车辆车牌在后方，但车辆可能来自他处。'), ['https://www.alberta.ca/licence-plates.aspx'], 'single', 'region', 'CA'),
  rule('us-front-ca', ['CA'], { all: ['front-plate-seen'] }, 0.45, 'plate-front', t('California issues two plates for most vehicle types.', '加利福尼亚多数车辆配两块车牌。'), ['https://qr.dmv.ca.gov/portal/handbook/vehicle-industry-registration-procedures-manual-2/general-registration-information/license-plates/'], 'single', 'region', 'US'),
  rule('us-no-front-fl', ['FL'], { all: ['front-plate-absent'] }, 0.45, 'plate-front', t('Florida normally issues one plate; exceptions and visiting cars exist.', '佛罗里达通常发一块牌，但有例外和外州车辆。'), ['https://www.flsenate.gov/Laws/Statutes/2026/316.605','https://www.flsenate.gov/laws/statutes/2021/320.06'], 'single', 'region', 'US'),
  rule('french-recessed-pole', ['FR'], { all: ['concrete-ladder-pole'] }, 0.7, 'utility-pole-shape', t('A real French example and tutorial description establish presence, not exclusivity or measured frequency.', '法国实拍与教程证明此形态存在，不代表独有或已测频率。'), ['https://www.geocoach.me/theory/region/western-europe','https://commons.wikimedia.org/wiki/File:Power_pole_with_line_anchoring.jpg']),
  rule('slanted-post-germany-swiss', ['DE','CH'], { all: ['slanted-black-post'] }, 0.75, 'roadside-post-shape', t('German sign 620 and a guide covering Germany and Switzerland support this shared shape.', '德国 620 标志规定与德瑞两国指南支持这种共用形态。'), ['https://www.gesetze-im-internet.de/stvo_2013/BJNR036710013.html','https://www.geocoach.me/maps/027b9391-6ab0-406a-9271-ecf49022e0ae/geocoach-world-bollards-0c9b8d10']),
]
