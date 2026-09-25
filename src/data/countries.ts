import type { Continent, Country } from './types'

export const schemaVersion = 1
const source = 'https://en.wikipedia.org/wiki/Google_Street_View_coverage#Current_coverage'
// Reviewed 2026-09-25 against the current road-coverage table, with boundary decisions
// recorded in docs/COVERAGE.md. A country here is a candidate, not a claim that its
// clue profile or every subdivision has been verified.
const rows: [Continent, string][] = [
  ['Europe', `AL|Albania|阿尔巴尼亚;AD|Andorra|安道尔;AT|Austria|奥地利;BE|Belgium|比利时;BA|Bosnia and Herzegovina|波斯尼亚和黑塞哥维那;BG|Bulgaria|保加利亚;HR|Croatia|克罗地亚;CZ|Czechia|捷克;DK|Denmark|丹麦;EE|Estonia|爱沙尼亚;FO|Faroe Islands|法罗群岛;FI|Finland|芬兰;FR|France|法国;DE|Germany|德国;GI|Gibraltar|直布罗陀;GR|Greece|希腊;HU|Hungary|匈牙利;IS|Iceland|冰岛;IE|Ireland|爱尔兰;IM|Isle of Man|马恩岛;IT|Italy|意大利;JE|Jersey|泽西岛;XK|Kosovo|科索沃;LV|Latvia|拉脱维亚;LI|Liechtenstein|列支敦士登;LT|Lithuania|立陶宛;LU|Luxembourg|卢森堡;MT|Malta|马耳他;MC|Monaco|摩纳哥;ME|Montenegro|黑山;NL|Netherlands|荷兰;MK|North Macedonia|北马其顿;NO|Norway|挪威;PL|Poland|波兰;PT|Portugal|葡萄牙;RO|Romania|罗马尼亚;RU|Russia|俄罗斯;SM|San Marino|圣马力诺;RS|Serbia|塞尔维亚;SK|Slovakia|斯洛伐克;SI|Slovenia|斯洛文尼亚;ES|Spain|西班牙;SE|Sweden|瑞典;CH|Switzerland|瑞士;UA|Ukraine|乌克兰;GB|United Kingdom|英国`],
  ['Asia', `BD|Bangladesh|孟加拉国;BT|Bhutan|不丹;KH|Cambodia|柬埔寨;CY|Cyprus|塞浦路斯;GE|Georgia|格鲁吉亚;HK|Hong Kong|香港;IN|India|印度;ID|Indonesia|印度尼西亚;IL|Israel|以色列;JP|Japan|日本;JO|Jordan|约旦;KZ|Kazakhstan|哈萨克斯坦;KG|Kyrgyzstan|吉尔吉斯斯坦;LA|Laos|老挝;MO|Macau|澳门;MY|Malaysia|马来西亚;MN|Mongolia|蒙古;NP|Nepal|尼泊尔;OM|Oman|阿曼;PS|Palestine (West Bank)|巴勒斯坦（约旦河西岸）;PH|Philippines|菲律宾;SG|Singapore|新加坡;KR|South Korea|韩国;LK|Sri Lanka|斯里兰卡;TW|Taiwan|台湾;TH|Thailand|泰国;TR|Turkey|土耳其;AE|United Arab Emirates|阿拉伯联合酋长国;VN|Vietnam|越南`],
  ['Africa', `BW|Botswana|博茨瓦纳;SZ|Eswatini|埃斯瓦蒂尼;GH|Ghana|加纳;KE|Kenya|肯尼亚;LS|Lesotho|莱索托;NA|Namibia|纳米比亚;NG|Nigeria|尼日利亚;RE|Réunion|留尼汪;RW|Rwanda|卢旺达;SN|Senegal|塞内加尔;ZA|South Africa|南非;TN|Tunisia|突尼斯;UG|Uganda|乌干达`],
  ['North America', `BM|Bermuda|百慕大;CA|Canada|加拿大;CR|Costa Rica|哥斯达黎加;CW|Curaçao|库拉索;DO|Dominican Republic|多米尼加共和国;GT|Guatemala|危地马拉;MX|Mexico|墨西哥;PA|Panama|巴拿马;PR|Puerto Rico|波多黎各;US|United States|美国;VI|U.S. Virgin Islands|美属维尔京群岛`],
  ['South America', `AR|Argentina|阿根廷;BO|Bolivia|玻利维亚;BR|Brazil|巴西;CL|Chile|智利;CO|Colombia|哥伦比亚;EC|Ecuador|厄瓜多尔;PY|Paraguay|巴拉圭;PE|Peru|秘鲁;UY|Uruguay|乌拉圭`],
  ['Oceania', `AS|American Samoa|美属萨摩亚;AU|Australia|澳大利亚;GU|Guam|关岛;MP|Northern Mariana Islands|北马里亚纳群岛;NZ|New Zealand|新西兰`],
]
const limited = new Set('BM CW DO FO GI JE LI MC NP OM PS RE RW SM VI AS GU MP'.split(' '))
const recent: Record<string, string> = {
  NP: 'https://blog.google/products-and-platforms/products/maps/nepal-street-view/',
  OM: 'https://blog.google/intl/en-mena/product-updates/explore-get-answers/google-street-view-is-coming-to-oman/',
  BA: 'https://blog.google/products-and-platforms/products/earth/3-imagery-updates-to-google-earth-and-maps/',
  GE: 'https://en.wikipedia.org/wiki/Google_Street_View_coverage#2026',
  XK: 'https://en.wikipedia.org/wiki/Google_Street_View_coverage#2026',
  PY: 'https://en.wikipedia.org/wiki/Google_Street_View_coverage#2025',
  VN: 'https://en.wikipedia.org/wiki/Google_Street_View_coverage#2025',
}
export const countries: Country[] = rows.flatMap(([continent, raw]) => raw.split(';').map((part) => {
  const [id, en, zh] = part.split('|')
  const isLimited = limited.has(id)
  return {
    id, name: { en, zh }, continent,
    coverage: isLimited ? 'limited-road' : 'road',
    coverageNote: isLimited
      ? { en: 'Official road imagery is limited to selected areas; no nationwide coverage is implied.', zh: '官方道路影像仅覆盖部分区域，不代表全国覆盖。' }
      : { en: 'Official public road imagery is reported; extent varies by area and date.', zh: '资料记载有官方公共道路影像；范围随地区和拍摄时间而异。' },
    coverageSource: recent[id] || source, reviewed: '2026-09-25',
  } satisfies Country
}))
export const countryById = new Map(countries.map((country) => [country.id, country]))
