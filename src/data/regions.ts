import type { RegionScheme, Text2 } from './types'

export const schemaVersion = 1
const t = (en: string, zh: string): Text2 => ({ en, zh })
const usSource = 'https://www.census.gov/programs-surveys/economic-census/guidance-geographies/levels.html'
const caSource = 'https://www.statcan.gc.ca/en/subjects/standard/sgc/2021/introduction'
const brSource = 'https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/18310-divisao-politico-administrativa-e-regional.html'
const make = (raw: string, source: string) => raw.split(';').map((entry) => {
  const [id, en, zh] = entry.split('|')
  return { id, name: t(en, zh), coverageSource: source }
})

export const regionSchemes: RegionScheme[] = [
  {
    schemaVersion: 1, countryId: 'US', granularity: t('States and DC', '州与哥伦比亚特区'),
    regions: make('AL|Alabama|阿拉巴马州;AK|Alaska|阿拉斯加州;AZ|Arizona|亚利桑那州;AR|Arkansas|阿肯色州;CA|California|加利福尼亚州;CO|Colorado|科罗拉多州;CT|Connecticut|康涅狄格州;DE|Delaware|特拉华州;DC|District of Columbia|哥伦比亚特区;FL|Florida|佛罗里达州;GA|Georgia|佐治亚州;HI|Hawaii|夏威夷州;ID|Idaho|爱达荷州;IL|Illinois|伊利诺伊州;IN|Indiana|印第安纳州;IA|Iowa|艾奥瓦州;KS|Kansas|堪萨斯州;KY|Kentucky|肯塔基州;LA|Louisiana|路易斯安那州;ME|Maine|缅因州;MD|Maryland|马里兰州;MA|Massachusetts|马萨诸塞州;MI|Michigan|密歇根州;MN|Minnesota|明尼苏达州;MS|Mississippi|密西西比州;MO|Missouri|密苏里州;MT|Montana|蒙大拿州;NE|Nebraska|内布拉斯加州;NV|Nevada|内华达州;NH|New Hampshire|新罕布什尔州;NJ|New Jersey|新泽西州;NM|New Mexico|新墨西哥州;NY|New York|纽约州;NC|North Carolina|北卡罗来纳州;ND|North Dakota|北达科他州;OH|Ohio|俄亥俄州;OK|Oklahoma|俄克拉何马州;OR|Oregon|俄勒冈州;PA|Pennsylvania|宾夕法尼亚州;RI|Rhode Island|罗得岛州;SC|South Carolina|南卡罗来纳州;SD|South Dakota|南达科他州;TN|Tennessee|田纳西州;TX|Texas|得克萨斯州;UT|Utah|犹他州;VT|Vermont|佛蒙特州;VA|Virginia|弗吉尼亚州;WA|Washington|华盛顿州;WV|West Virginia|西弗吉尼亚州;WI|Wisconsin|威斯康星州;WY|Wyoming|怀俄明州', usSource),
    note: t('States and DC are distinct candidates. Road extent is uneven; the administrative source establishes boundaries, not imagery density.', '各州与特区互斥。道路影像密度不均；行政资料只证明边界，不证明影像密度。'),
  },
  {
    schemaVersion: 1, countryId: 'CA', granularity: t('Provinces and road-covered territories', '省与有道路影像的地区'),
    regions: make('AB|Alberta|阿尔伯塔省;BC|British Columbia|不列颠哥伦比亚省;MB|Manitoba|马尼托巴省;NB|New Brunswick|新不伦瑞克省;NL|Newfoundland and Labrador|纽芬兰与拉布拉多省;NS|Nova Scotia|新斯科舍省;NT|Northwest Territories|西北地区;ON|Ontario|安大略省;PE|Prince Edward Island|爱德华王子岛省;QC|Quebec|魁北克省;SK|Saskatchewan|萨斯喀彻温省;YT|Yukon|育空地区', caSource),
    note: t('Nunavut is omitted pending confirmation of Google road-car coverage rather than local panoramas. Northern coverage is sparse.', '努纳武特地区的道路车载影像仍待核验，因此未列入。北部覆盖稀疏。'),
  },
  {
    schemaVersion: 1, countryId: 'BR', granularity: t('IBGE macro-regions', '巴西地理统计局大区'),
    regions: make('N|North|北部;NE|Northeast|东北部;CW|Central-West|中西部;SE|Southeast|东南部;S|South|南部', brSource),
    note: t('Five mutually exclusive official macro-regions. No state-level inference is claimed until regional evidence is reviewed.', '采用五个互斥的官方大区；地区线索核验前不声称可判断具体州。'),
  },
]

export const regionSchemeByCountry = new Map(regionSchemes.map((scheme) => [scheme.countryId, scheme]))
