# 车牌图片审查与署名

- 以下首轮审查记录于 2026-09-26，当时逐张核对用户 JSON 中全部 20 条车牌卡。图片的源文件仍原样嵌入 JSON；以下 focused view 仅影响卡片呈现，详情放大仍可看完整教学对照图。
- 八张对照图卡设置了与线索对应的半幅展示。两张南非地区卡的唯一教程图同时混合多个省份且带地图，不适合直接作为单一颜色示例，暂改为纯文字卡。
- 本版共 81 条线索、55 条带图；车牌 20 条中 15 条带图、5 条纯文字。非车牌图片、所有地点倍率和域名线索均未更改。

## 逐条判断

| 线索 | 处理 |
|---|---|
| 商用车使用黄色车牌 | 加纳对照图下半幅：只展示黄色商用牌；上方白色普通牌不在卡片画面。 |
| 白底车牌 | 博茨瓦纳对照图左半幅：只展示白色前牌。 |
| 白色车牌带明显绿色 | 斯威士兰图仅一张白底、明显绿色的牌；另有黄装饰，仍符合宽泛绿色观察。 |
| 黄底车牌 | 纳米比亚对照图左半幅：只展示黄底牌，排除右侧白底蓝字牌。 |
| 白底车牌带绿、黄装饰 | 斯威士兰图仅一张白底绿黄装饰牌。 |
| 蓝白配色的车牌 | 塞内加尔对照图的两款均为蓝白配色（蓝底白字／白底左蓝条），宽泛线索可同时展示。 |
| 同一辆车：前白牌、后黄牌 | 博茨瓦纳图左白前牌、右黄后牌，正好对应组合观察。 |
| 同一辆车：白色长前牌、黄色方形后牌 | 肯尼亚图上白长前牌、下黄方后牌，正好对应组合观察。 |
| 黄底黑字车牌 | 纳米比亚对照图左半幅：只展示黄底黑字牌。 |
| 白底蓝字车牌 | 纳米比亚对照图右半幅：只展示白底蓝字牌。 |
| 长车牌底部有绿色横带 | 斯威士兰图仅一张底部绿色横带的牌。 |
| 蓝底白字车牌 | 塞内加尔对照图上半幅：只展示蓝底白字牌。 |
| 白色车牌左侧有蓝色竖条 | 塞内加尔对照图下半幅：只展示左侧蓝条的白牌。 |
| 黑底白字车牌 | 突尼斯图上半幅：只展示普通黑底白字牌，不显示下方军用变体和跟车。 |
| 车牌整体偏绿 | 撤图：多省混合地图无法单独说明偏绿的自由邦牌。 |
| 车牌整体偏蓝 | 撤图：多省混合地图无法单独说明偏蓝的夸祖鲁-纳塔尔牌。 |
| 车牌上有明显蓝色 | 继续纯文字：同一宽泛蓝色观察可涵盖不同朝向；无单图能代表全部。 |
| 白底车牌略泛绿 | 继续纯文字：原截图模糊，不能清楚展示泛绿色调。 |
| 白底蓝字的长车牌 | 莱索托原图只有一张白底蓝字长牌，保留。 |
| 黑白配色的车牌 | 继续纯文字：黑底白字与白底黑字方向不同，单图不宜假装代表所有。 |

## 2026-09-27 update

The table above records the original 20-card image audit. At the consolidation stage, the library merged five overlapping plate cards into 15 cards: 14 illustrated and one text-only. The broad green card then used the previously audited white plate with green detail; the broad blue card then retained the two blue/white variants. The separate green/yellow decoration image remains available in the read-only tutorial archive but is no longer a separate selectable card. No new plate image or inferred plate color was introduced.

## 2026-09-27 presentation update

The table above is the earlier image audit, not the current card count. In the current Africa library the five broad color observations are text-only, and all ten precise plate-layout observations have images. The cropped plate examples remain on the precise cards, and source images remain intact in the JSON.

## 2026-09-27 missing regional examples audit

At that update, the plate section had 21 clues: five broad text color clues and sixteen precise pictured clues, with 23 plate images. The whole Africa library then had 94 clues, 56 pictured clues, 38 text-only clues, and 63 image instances. Shared examples are selectable only through their one underlying clue ID and therefore never add a second score.

| Visible layout or instance | Local source | Published treatment |
|---|---|---|
| Rwanda long white front / long yellow rear | `tuxundoc/非洲/rwanda/images/0002.png` | Second image on shared front-white/rear-yellow clue. |
| Uganda white front / yellow rear with small striped flag | `tuxundoc/非洲/uganda/images/0005.png` | Separate specific plate card, full figure. |
| Free State pale yellow-green plate, initially misread as black characters | `tuxundoc/非洲/south-africa/images/0016.png`, crop (362, 301, 553, 354) | Former image and label; replaced after clearer-photo review below. |
| Gauteng white plate, blue characters and round emblem | Same source, crop (244, 66, 438, 116) | Separate regional card. |
| Northern Cape green characters and yellow-green decoration | Same source, crop (140, 349, 330, 406) | Separate regional card. |
| KwaZulu-Natal white/blue plate | Same source, crop (558, 300, 749, 354) | Second image on shared white/blue clue. |
| Eastern Cape white/black plate with yellow-green lower design | Same source, crop (377, 467, 555, 523) | Second image on existing band clue. |
| North West similar lower yellow-green design | Same source, crop (313, 176, 497, 232) | Third image on existing band clue. |
| Limpopo, Mpumalanga, Western Cape white/black examples | Same source, crops (483, 49, 674, 111), (548, 172, 733, 225), (104, 535, 291, 586) | Extra images on shared white-background/black-characters clue; no province-specific weight. |
| Ghana standard white/black plate | `tuxundoc/非洲/ghana/images/0003.png`, crop (0, 0, 1920, 420) | Main image on shared white-background/black-characters clue. |
| Tunisian military black/white plate with red flag panel | `tuxundoc/非洲/tunisia/images/0002.png`, crop (4, 354, 543, 455) | Separate military-context card. |

The archive originals stay read-only. Focused plate excerpts are padded with a neutral dark background for the gallery aspect ratio; plate colors are not recolored. The North West and Eastern Cape plates are visually close to the existing lower-band clue, whereas ordinary white/black provincial plates are only extra examples of a shared pattern. The local Nigeria chapter provides a textual green-tinge comparison but no standalone plate figure. The current Nigerian picture was sourced independently as detailed below.

## 2026-09-27 independent image review (current build)

The current plate section has **22 clues: five broad text-only color clues and 17 pictured specific layouts, with 25 plate image instances**. The whole Africa library has **95 clues, 57 pictured, 38 text-only, and 65 image instances**. Each example below is embedded in `public/libraries/africa.json`; the individual `photoCredits` entry is also shown in the info dialog for that image. Reviewed 2026-09-27.

| Card / photo | Source, author, license | Change and visual check |
|---|---|---|
| Free State pale green, green letters, yellow wildlife | [South Africa Free State License plate 05](https://commons.wikimedia.org/wiki/File:South_Africa_Free_State_License_plate_05.jpg), Dickelbers, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | Replaced tiny diagram crop. Green letters clearly visible; former “black characters” wording corrected. Resized, WebP, neutral padding; plate colors intact. |
| Gauteng white/blue with small round emblem | [South Africa Gauteng plate (5)](https://commons.wikimedia.org/wiki/File:South_Africa_-_Gauteng_plate_(5).JPG), Dickelbers, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | Replaced tiny diagram crop; blue letters and emblem visible. Resized, WebP, neutral padding; colors intact. |
| Northern Cape light plate/dark green letters and antelope artwork | [South Africa Northern Cape license plate](https://commons.wikimedia.org/wiki/File:South_Africa_Northern_Cape_license_plate.jpg), Marduk, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | Replaced tiny diagram crop; corrected label to match antelope artwork. Resized, WebP, neutral padding; colors intact. |
| KwaZulu-Natal white/blue historical variant | [South Africa KwaZulu-Natal (1)](https://commons.wikimedia.org/wiki/File:South_Africa_-_KwaZulu-Natal_(1).JPG), Dickelbers, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | Replaced second image on shared white/blue card. Photo from 2015; it illustrates an older visible variant and does not establish current issue practice. Resized, WebP, neutral padding; colors intact. |
| Nigeria white/blue/green-map, Adamawa | [Nigerian number plate Adamawa](https://commons.wikimedia.org/wiki/File:Nigerian_number_plate_Adamawa.jpg), Niegodzisie, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | First image on new detailed Nigerian card. Blue characters and green map motif visible. Resized and WebP; colors intact. |
| Nigeria white/blue/green-map, Lagos | [Nigeria Lagos License Plate](https://commons.wikimedia.org/wiki/File:Nigeria_Lagos_License_Plate.jpg), Joshua Doubek, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | Second example of the same clue, with no second score. Resized and WebP; colors intact. |

The [Federal Road Safety Corps guide](https://frsc.gov.ng/wp-content/uploads/2021/11/Recent.pdf) documents the Nigerian map element. Photo author/license metadata comes from each Commons file page; the direct links are kept in the published JSON. The tutorial archive remains read-only. Its own images have separate user-reported authorization; the Commons terms above govern these six independently sourced examples.
