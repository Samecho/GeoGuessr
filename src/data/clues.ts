import type { Clue, Text2 } from './types'
import { yuqueClues } from './yuque-clues'
const t = (en: string, zh: string): Text2 => ({ en, zh })
export const schemaVersion = 1
const reviewed = '2026-09-25'
export const clues: Clue[] = [
  {
    id: 'drive-left', categoryId: 'driving', groupId: 'driving-side', appearance: t('Traffic keeps left', '车辆靠左行驶'), formalName: t('Left-hand traffic', '左侧通行'),
    identify: t('Use moving traffic on a two-way road, not a parked car or one-way street.', '根据双向道路上的行驶车辆判断，不看停靠车辆或单行道。'),
    geography: t('Used in several regions, including the UK, Japan, India and parts of Africa and Oceania.', '见于英国、日本、印度以及非洲和大洋洲部分地区。'),
    strength: t('Broad country filter; not a unique marker.', '宽泛的国家筛选线索，并非独有。'), caveat: t('One-way streets and mirror images can mislead.', '单行道或镜像可能误导。'),
    sourceUrls: ['https://www.worldstandards.eu/cars/list-of-left-driving-countries/'], reviewed, assetIds: [], tags: ['traffic'],
  },
  {
    id: 'drive-right', categoryId: 'driving', groupId: 'driving-side', appearance: t('Traffic keeps right', '车辆靠右行驶'), formalName: t('Right-hand traffic', '右侧通行'),
    identify: t('Use moving traffic on a two-way road.', '根据双向道路上的行驶车辆判断。'),
    geography: t('Used by most covered candidates, with local exceptions recorded separately.', '多数候选地区使用，局部例外需单独判断。'),
    strength: t('Broad filter only.', '仅为宽泛筛选线索。'), caveat: t('One-way streets can mislead.', '单行道可能误导。'),
    sourceUrls: ['https://www.worldstandards.eu/cars/list-of-left-driving-countries/'], reviewed, assetIds: [], tags: ['traffic'],
  },
  {
    id: 'front-plate-seen', categoryId: 'plates', groupId: 'front-plate-presence', appearance: t('A vehicle has a front plate', '看到一辆车有前牌'), formalName: t('Front plate observed on one vehicle', '单辆车有前牌'),
    identify: t('Record the vehicle actually seen; this does not describe every vehicle in the scene.', '仅记录眼前这辆车，不推断画面中所有车辆。'),
    geography: t('Varies by registration jurisdiction; cross-border vehicles are possible.', '随登记地区而异；跨境车辆也可能出现。'),
    strength: t('No country weight in the first release.', '首版不赋予国家权重。'), caveat: t('Temporary, foreign and special vehicles differ.', '临时牌、境外牌和特殊车辆可能不同。'),
    sourceUrls: ['https://www.gov.uk/displaying-number-plates/rules-number-plates'], reviewed, assetIds: [], tags: ['plate'],
  },
  {
    id: 'front-plate-absent', categoryId: 'plates', groupId: 'front-plate-absence', appearance: t('A vehicle has no front plate', '看到一辆车无前牌'), formalName: t('No front plate observed on one vehicle', '单辆车无前牌'),
    identify: t('Use only when the front of that vehicle is clearly visible.', '只在该车车头清晰可见时使用。'),
    geography: t('Varies by registration jurisdiction; this can coexist with a plated vehicle.', '随登记地区而异；可与看到有前牌的另一辆车同时成立。'),
    strength: t('No country weight in the first release.', '首版不赋予国家权重。'), caveat: t('A missing plate on one object is not scene-wide absence.', '单辆车缺牌不等于全画面都无牌。'),
    sourceUrls: ['https://www.gov.uk/displaying-number-plates/rules-number-plates'], reviewed, assetIds: [], tags: ['plate'],
  },
  {
    id: 'yellow-rear', categoryId: 'plates', groupId: 'yellow-plate', appearance: t('Yellow plate on the rear', '车尾黄色车牌'), formalName: t('Yellow rear registration plate', '黄色后车牌'),
    identify: t('Look for black characters on a reflective yellow rear plate.', '看车尾黄色反光底板上的黑色字符。'),
    geography: t('Required on ordinary UK vehicles; also used elsewhere, including the Netherlands.', '普通英国车辆依法使用；荷兰等地也使用黄色车牌。'),
    strength: t('Useful with driving side and front-plate color, not unique alone.', '与行车方向和前牌颜色合看更有用，单独并不独有。'),
    caveat: t('The example photo is historical; current formats differ. Foreign vehicles travel.', '示例照片年代较早，现行格式不同；境外车辆也会行驶。'),
    sourceUrls: ['https://www.gov.uk/displaying-number-plates/rules-number-plates','https://commons.wikimedia.org/wiki/File:Datsun_Cherry_E10_100A_-_Yellow_saloon_rear.jpg'], reviewed, assetIds: ['yellow-rear-detail', 'yellow-rear-plate'], tags: ['yellow', 'plate'], exclusionAllowed: true,
  },
  {
    id: 'yellow-center', categoryId: 'markings', groupId: 'centerline-color', appearance: t('Yellow center line', '黄色道路中心线'), formalName: t('Yellow center road marking', '黄色中心标线'),
    identify: t('Look for a yellow line separating opposing traffic, not a curb restriction.', '辨认分隔对向车流的黄色线，而非路缘禁停线。'),
    geography: t('Visible in Finland and many other countries; not a Finland-only marker.', '芬兰及许多其他国家可见，绝非芬兰独有。'),
    strength: t('Low to moderate unless combined with other verified road details.', '单独较弱，需要其他已核实道路细节配合。'), caveat: t('Paint color and road standard can change by road class and year.', '颜色会随道路等级和年代变化。'),
    sourceUrls: ['https://commons.wikimedia.org/wiki/File:Keltainen_sulkuviiva_20180524.jpg'], reviewed, assetIds: ['yellow-centerline'], tags: ['yellow', 'road'], exclusionAllowed: true,
  },
  {
    id: 'japan-stop', categoryId: 'signs', groupId: 'stop-sign-shape', appearance: t('Red triangular sign with 止まれ', '红色三角牌写有「止まれ」'), formalName: t('Japanese stop sign', '日本停止标志'),
    identify: t('A downward-pointing red triangle with white Japanese characters.', '倒三角形红底，内有白色日文字。'),
    geography: t('Japanese road sign; sample photographed in Japan.', '日本道路标志；样本拍摄于日本。'),
    strength: t('High specificity when the characters and shape are clearly visible.', '字形与形状清楚时辨识度高。'), caveat: t('A shop sign, souvenir or historical photo is not a live road sign.', '商店展示、纪念品或历史图像不能当成当前道路标志。'),
    sourceUrls: ['https://commons.wikimedia.org/wiki/File:Japanesestopsign-may28-2015.jpg'], reviewed, assetIds: ['japan-stop'], tags: ['red', 'script', 'sign'], exclusionAllowed: true,
  },
  {
    id: 'thai-script', categoryId: 'scripts', groupId: 'thai-writing', appearance: t('Looped letters like ถนน / อุดรธานี', '圆环字形，如「ถนน / อุดรธานี」'), formalName: t('Thai script on a road sign', '路牌上的泰文字母'),
    identify: t('Rounded connected-looking glyphs with small loops; choose the shapes, not a language guess.', '圆弧与小环构成的字形；按看到的形状选，不必先猜语言。'),
    geography: t('Thai script is strongly associated with Thailand; also visible in border contexts.', '泰文字主要对应泰国，也可能出现在边境语境。'),
    strength: t('Strong when a public road sign is legible.', '公共道路标牌清晰时较强。'), caveat: t('Distinguish from Khmer, Lao and decorative type.', '需区别高棉文、老挝文及装饰字体。'),
    sourceUrls: ['https://commons.wikimedia.org/wiki/File:Road_signs_in_NE_Thailand.JPG'], reviewed, assetIds: ['thai-road-sign'], tags: ['script', 'sign'], exclusionAllowed: true,
  },
  {
    id: 'french-english', categoryId: 'scripts', groupId: 'bilingual-writing', appearance: t('French + English on one sign', '同一标牌上有法语和英语'), formalName: t('English–French bilingual sign', '英法双语标牌'),
    identify: t('Both languages are printed on the same fixed sign.', '两种文字印在同一块固定标牌上。'),
    geography: t('Found in Canada and other bilingual settings; not exclusive to Quebec.', '加拿大等双语环境可见，绝非魁北克独有。'),
    strength: t('Moderate when paired with road context.', '结合道路环境为中等线索。'), caveat: t('Tourist signs and foreign businesses travel across borders.', '旅游标牌和跨国商店可能造成混淆。'),
    sourceUrls: ['https://commons.wikimedia.org/wiki/File:Bilingual_street_sign_in_Hampstead,_Quebec.jpg'], reviewed, assetIds: ['bilingual-street'], tags: ['script', 'sign'], exclusionAllowed: true,
  },
  {
    id: 'three-scripts', categoryId: 'scripts', groupId: 'hebrew-arabic-latin', appearance: t('Hebrew + Arabic + Latin letters', '希伯来文＋阿拉伯文＋拉丁字母'), formalName: t('Trilingual road sign', '三语道路标牌'),
    identify: t('One line of blocky right-to-left letters, one cursive right-to-left line, and Latin letters.', '一行方块状从右向左字形、一行连笔从右向左字形，以及拉丁字母。'),
    geography: t('Common on public signs in Israel; the photo is from Israel. Regional context matters.', '以色列公共标牌中常见；此图拍摄于以色列。仍需结合地区语境。'),
    strength: t('Strong regional writing combination, not a legal exclusivity claim.', '较强的组合字形线索，但不声称法律上的独占。'), caveat: t('Religious or tourist signage can occur elsewhere.', '宗教或旅游标牌也可能出现在其他地区。'),
    sourceUrls: ['https://commons.wikimedia.org/wiki/File:Multilingualism_in_Israel.jpg'], reviewed, assetIds: ['three-scripts'], tags: ['script', 'sign'], exclusionAllowed: true,
  },
  {
    id: 'cyrillic', categoryId: 'scripts', groupId: 'cyrillic-writing', appearance: t('Letters like Б / Щ / Ч', '字母如「Б / Щ / Ч」'), formalName: t('Cyrillic script', '西里尔字母'),
    identify: t('Look for distinct Cyrillic shapes, not just unfamiliar Latin typography.', '辨认特有的西里尔字形，避免把陌生拉丁字体看错。'),
    geography: t('Used across several covered countries, including Bulgaria, Serbia, North Macedonia and Russia.', '多个覆盖国家使用，包括保加利亚、塞尔维亚、北马其顿与俄罗斯。'),
    strength: t('Broad multi-country support.', '支持多个国家的宽泛线索。'), caveat: t('Many countries use both Cyrillic and Latin scripts.', '许多国家同时使用西里尔和拉丁字母。'),
    sourceUrls: ['https://commons.wikimedia.org/wiki/File:Road_Sign_in_Satovcha_Municipality.jpg'], reviewed, assetIds: ['cyrillic-road'], tags: ['script', 'sign'], exclusionAllowed: true,
  },
  {
    id: 'oxxo', categoryId: 'brands', groupId: 'oxxo-brand', appearance: t('Red and yellow OXXO storefront', '红黄配色 OXXO 店招'), formalName: t('OXXO convenience store', 'OXXO 便利店'),
    identify: t('The white OXXO wordmark sits inside a red field framed by yellow bands.', '白色 OXXO 字标置于红底黄边的招牌中。'),
    geography: t('FEMSA reports OXXO stores in Mexico, Brazil, Chile, Colombia, Peru and the United States.', 'FEMSA 报告称 OXXO 门店位于墨西哥、巴西、智利、哥伦比亚、秘鲁和美国。'),
    strength: t('Useful, but not Mexico-exclusive.', '有用，但并非墨西哥独有。'), caveat: t('The company footprint changes; distinguish a store from an advertisement.', '品牌分布会变化；需区别实体门店与广告。'),
    sourceUrls: ['https://www.femsa.com/en/business-units/proximity-and-health/oxxo/'], reviewed, assetIds: ['red-yellow-shop'], tags: ['red', 'yellow', 'wordmark'], exclusionAllowed: true,
  },
  {
    id: 'concrete-ladder-pole', categoryId: 'poles', groupId: 'concrete-ladder-pole', appearance: t('Concrete pole with ladder-like recesses', '带阶梯状凹槽的混凝土杆'), formalName: t('Recessed concrete utility pole', '凹槽式混凝土电线杆'),
    identify: t('A vertical row of deep rectangular step recesses is molded into one face of the concrete shaft.', '杆身一面有连续的深矩形踏步凹槽。'),
    geography: t('A documented French example; similar ladder poles are reported in Spain and elsewhere.', '已核实法国实例；西班牙等地也有类似阶梯杆。'),
    strength: t('Weak support alone; compare the recess shape and crossarm with other evidence.', '单独较弱，应与凹槽形状、横担及其他证据合看。'),
    caveat: t('Do not confuse shallow indentations with through-holes. Utility designs vary within one country.', '浅凹槽与贯通孔不同；同一国家也有多种杆型。'),
    sourceUrls: ['https://www.geocoach.me/theory/region/western-europe','https://commons.wikimedia.org/wiki/File:Power_pole_with_line_anchoring.jpg'], reviewed, assetIds: ['concrete-pole'], tags: ['pole','concrete'],
  },
  {
    id: 'slanted-black-post', categoryId: 'posts', groupId: 'slanted-post', appearance: t('White post with a slanted black reflector panel', '白桩上有斜边黑色反光板'), formalName: t('Roadside delineator post, sign 620 family', '路侧引导桩（620 类）'),
    identify: t('Look at the wedge-shaped top, slanted black inset and pale vertical reflector; ignore any road distance number.', '看楔形顶部、斜边黑色嵌板和竖向浅色反光片，不需读取里程数字。'),
    geography: t('Documented in Germany and comparable forms in Switzerland.', '德国有正式规范，瑞士有相近形式。'),
    strength: t('Moderate visual support only when the front-facing shape is clear.', '正面形状清晰时有一定辅助价值。'),
    caveat: t('Neighboring countries use similar posts; side and rear reflectors differ. The photographed kilometer marking is not a location lookup clue.', '邻国也有相似桩，侧面与背面的反光片不同；照片上的里程字样不用于反查地点。'),
    sourceUrls: ['https://www.gesetze-im-internet.de/stvo_2013/BJNR036710013.html','https://www.geocoach.me/maps/027b9391-6ab0-406a-9271-ecf49022e0ae/geocoach-world-bollards-0c9b8d10','https://commons.wikimedia.org/wiki/File:Hectoreflecto_D_26k346.jpg'], reviewed, assetIds: ['black-white-post'], tags: ['post','road'],
  },
]
clues.push(...yuqueClues)
export const clueById = new Map(clues.map((clue) => [clue.id, clue]))

