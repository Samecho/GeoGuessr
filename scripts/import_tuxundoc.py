#!/usr/bin/env python3
"""Convert the local Tuxundoc chapter archive into compact, traceable JSON.
Read-only with respect to tuxundoc/. Run: python scripts/import_tuxundoc.py [--only botswana,india]
"""
from __future__ import annotations
import argparse, hashlib, json, re, unicodedata
from pathlib import Path
from urllib.parse import unquote
from bs4 import BeautifulSoup, Tag
ROOT=Path(__file__).resolve().parents[1]; SOURCE=ROOT/'tuxundoc'; DEFAULT_OUT=ROOT/'src'/'data'/'knowledge'
CONTINENTS={'非洲':('Africa','非洲'),'亚洲':('Asia','亚洲'),'欧洲':('Europe','欧洲'),'北美洲':('North America','北美洲'),'大洋洲':('Oceania','大洋洲'),'南美洲':('South America','南美洲'),'南极洲':('Antarctica','南极洲')}
PARENT_SEEDS={'alaska':'united-states','hawaii':'united-states','greenland':'denmark','faroe-islands':'denmark','azores':'portugal','madeira':'portugal','christmas-island':'australia','cocos-islands':'australia','martinique':'france','reunion':'france','saint-pierre-and-miquelon':'france','curacao':'netherlands','american-samoa':'united-states','guam':'united-states','northern-mariana-islands':'united-states','us-virgin-islands':'united-states','pitcairn-islands':'united-kingdom','bermuda':'united-kingdom','british-indian-ocean-territory':'united-kingdom','falkland-islands':'united-kingdom','macau':'china','hong-kong':'china','taiwan':'china','south-georgia-sandwich-islands':'falkland-islands'}
EN_OVERRIDES={'alaska':'Alaska','american-samoa':'American Samoa','azores':'Azores','antarctica':'Antarctica','british-indian-ocean-territory':'British Indian Ocean Territory','costa_rica':'Costa Rica','cocos-islands':'Cocos Islands','christmas-island':'Christmas Island','curacao':'Curaçao','dominican':'Dominican Republic','falkland-islands':'Falkland Islands','faroe-islands':'Faroe Islands','greenland':'Greenland','hawaii':'Hawaii','hong-kong':'Hong Kong','isle-of-man':'Isle of Man','macau':'Macau','martinique':'Martinique','northern-mariana-islands':'Northern Mariana Islands','pitcairn-islands':'Pitcairn Islands','reunion':'Réunion','saint-pierre-and-miquelon':'Saint Pierre and Miquelon','south-georgia-sandwich-islands':'South Georgia and the South Sandwich Islands','united-states':'United States','united-kingdom':'United Kingdom','us-minor-outlying-islands':'U.S. Minor Outlying Islands','us-virgin-islands':'U.S. Virgin Islands','krygyzstan':'Kyrgyzstan','sao-tome-and-principe':'São Tomé and Príncipe'}
CATEGORY_DEFS=[('driving','Driving side','行车方向',['靠左','靠右','左行','右行','行驶方向']),('markings','Road markings & pavement','道路标线与路面',['标线','实线','虚线','双黄','白线','黄线','路面','沥青','铺装','未铺']),('posts','Posts & delineators','路桩与示警柱',['路桩','反光桩','桩','标柱','示警柱']),('poles','Utility poles & wires','电杆与电线',['电线杆','电杆','杆顶','电线','绝缘子','电力线','木杆']),('barriers','Guardrails & barriers','护栏与隔离设施',['护栏','防撞','路缘石','隔离带','护墙']),('signs','Road signs & hardware','道路标志与支架',['路牌','路标','警示牌','警告牌','标牌','标志','指示牌','诱导标','箭头','信号灯','标杆']),('plates','Vehicle plates','车牌',['车牌','牌照','车牌号','前牌','后牌']),('road-vehicles','Road vehicles','道路车辆',['出租车','嘟嘟车','三轮车','摩托车','车辆','卡车','汽车','巴士','公交车','货车']),('camera','Street View car & camera','街景车辆与相机',['相机','街景车','街景代','天线','车头','镜头','马赛克','模糊','摄像','徒步','三脚架','代际']),('terrain','Terrain & water','地形与水体',['山丘','山脉','山峰','峡谷','海岸','海湾','河流','湖泊','瀑布','地形','平坦','高原']),('plants','Vegetation','植被',['树','灌木','植被','草地','森林','棕榈','仙人掌','花','作物','枝','叶']),('soil','Soil & rock','土壤与岩石',['土壤','沙土','红土','泥土','石头','岩石','沙地','沙漠']),('buildings','Buildings & settlement','建筑与聚落',['建筑','砖','瓦','房屋','屋顶','住宅','小屋','房子','村庄','城市','城镇','棚屋']),('languages','Recognized language','语言',['英语','法语','西班牙语','葡萄牙语','印地语','旁遮普语','泰米尔语','阿拉伯语','希伯来语','孟加拉语','泰语','老挝语','高棉语','韩语','越南语','罗马尼亚语','挪威语','芬兰语','瑞典语','丹麦语','德语','乌尔都语','语言']),('scripts','Letter shapes & diacritics','字形与变音符号',['文字','字母','字形','变音符','符号','拼写']),('words','Visible words & phrases','可见词语与短语',['词语','单词','停止标志','停牌','写有','写着','词尾','短语','路名']),('brands','Shop signs, ads & logos','店招、广告与标志',['品牌','商店','店铺','广告','Logo','加油站','超市','招牌']),('other','Other visual cues','其他视觉线索',[])]
CATEGORY_LABEL={x[0]:(x[1],x[2]) for x in CATEGORY_DEFS}
EN_APPEARANCE={'电线杆':'utility pole','车牌':'vehicle plate','路牌':'road sign','景观':'landscape','杆顶':'pole top','护栏':'guardrail','诱导标':'chevron sign','岩石':'rock','山谷':'valley','棕榈':'palm tree','横杆':'crossarm','土壤':'soil','英语':'English text','法语':'French text','西班牙语':'Spanish text','卡车':'truck','绝缘子':'insulator','松树':'pine tree','指示牌':'direction sign','贴纸':'sticker','公交车':'bus','出租车':'taxi','草原':'grassland','植物':'plant','徒步旅者':'trekker camera','前牌':'front plate','后牌':'rear plate','STOP':'STOP sign text','STOPP':'STOPP sign text','ALTO':'ALTO sign text','PARE':'PARE sign text','DUR':'DUR sign text','左行':'left-hand traffic','右行':'right-hand traffic','双黄线':'double yellow center lines','白色车牌':'white vehicle plate','黄色车牌':'yellow vehicle plate','巴拉那松':'Paraná pine','水平枝条':'horizontal branches','枝条末端叶簇':'foliage clustered at branch tips','叶子只在枝条末端':'leaves only at branch tips','红土':'red soil','反光桩':'road delineator','木质电线杆':'wooden utility pole','混凝土杆':'concrete utility pole','金属杆':'metal pole','平屋顶':'flat roof','瓦屋顶':'tile roof','棕榈树':'palm tree','仙人掌':'cactus','西里尔字母':'Cyrillic letters','拉丁字母':'Latin letters','阿拉伯字母':'Arabic script','区号':'area code','电话号码':'phone number','黄色':'yellow','白色':'white','绿色':'green','棕色':'brown','红色':'red','黑白相间':'black-and-white striped','红白相间':'red-and-white striped','蓝色':'blue','双实线':'double solid lines','黄色边线':'yellow road edge line','圆形路桩':'round road bollard','方形路桩':'square road bollard','州旗':'state flag','县旗':'county flag','警告牌':'warning sign','黑色车':'black vehicle','灰色车辆':'gray vehicle','蓝色条纹':'blue stripe','黄色后牌':'yellow rear plate','招牌':'shop sign','棕榈树':'palm tree','停止标志':'stop sign','字母连接':'connected letters','泰语':'Thai text','泰文':'Thai script','高棉文':'Khmer script','韩文':'Korean script','韩语':'Korean text','老挝文':'Lao script','罗马尼亚语':'Romanian text','越南语':'Vietnamese text','葡萄牙语':'Portuguese text','阿拉伯语':'Arabic text','希伯来语':'Hebrew text','天城文':'Devanagari script','双语标志':'bilingual sign','菱形警示牌':'diamond warning sign','黄色灯泡':'yellow beacon globe','黄色菱形':'yellow diamond','黄色菱形标志':'yellow diamond sign','黑白相间的路标':'black-and-white pedestrian crossing sign','干旱灌木丛':'dry thorn scrub','荆棘林':'thorn scrub','多肉植物':'succulent plants','带刺的灌木丛':'thorny shrubs','适应干旱的草':'drought-adapted grass','三语标志':'trilingual sign','菱形警示牌':'diamond warning sign','黑白路桩':'black-and-white road bollard','橙色':'orange','黑色':'black','粉色':'pink','红色':'red','后车牌':'rear plate'}
EN_APPEARANCE.update({
'泰文':'Thai script','泰语文字':'Thai script','泰米尔文字':'Tamil script','泰米尔文':'Tamil script','泰米尔文字样本':'Tamil script sample','双语标志':'Bilingual sign','双语或三语':'Bilingual or trilingual sign','黄色中线':'Yellow center line','黄色外线':'Yellow edge line','黄色边线':'Yellow edge line','黑白路桩':'Black-and-white bollard','路桩':'Road bollard','圆圈':'Circular glyphs','三轮车':'Three-wheeled vehicle','三轮出租车':'Three-wheeled taxi','贝利沙灯':'Belisha beacon','店铺招牌':'Shop sign','菱形警示牌':'Diamond warning sign','干旱灌木丛':'Dry thorn scrub','混凝土杆':'Concrete utility pole','高棉文字':'Khmer script','韩文':'Hangul script','老挝文':'Lao script','黄色灯泡':'Yellow beacon globe','叶子只在枝条末端':'Leaves only at branch tips','黄色后牌':'Yellow rear plate','多孔混凝土杆':'Perforated concrete utility pole','反光桩':'Road delineator','浅色':'Light-colored','深色':'Dark-colored','橙色':'Orange','粉色':'Pink','红色':'Red','黄色':'Yellow','绿色':'Green','白色':'White','黑色':'Black'
})

def safe_display_phrase(phrase,category,aliases):
 value=clean(phrase);first=len(value)
 for alias in aliases:
  if not alias or len(alias)<3: continue
  match=re.search(re.escape(alias),value,re.I if alias.isascii() else 0)
  if match:first=min(first,match.start())
 if first<len(value): value=value[:first]
 value=re.sub(r'^[\W_]*(?:在|于|属于|来自|位于|国家|地区|省州|范围|仅|唯一|主要|常见于|独有于|分布在|可见于|有些|比如|例如|与|和|或)+[\W_]*','',value)
 value=re.sub(r'[，,。；;：:（(\s]+$','',value).strip()
 if len(norm(value))<2 or re.search(r'国家|其他国家|分布于|分布在|独有|独特|罕见|很少|常见于|唯一|主要分布|与.*区别|区分.*和',value) or re.search(r'^(?:在|于|位于|出现在|仅在|只在|这一|这些|这种|上述|此国家)',value):
  return CATEGORY_LABEL[category][1]+'视觉特征'
 return value

def english_label(phrase):
 if phrase in EN_APPEARANCE:return EN_APPEARANCE[phrase]
 latin=' '.join(re.findall(r'[A-Za-z][A-Za-z0-9’\-]*',phrase))
 return latin if latin else phrase
def stable(prefix,value,n=14): return prefix+hashlib.sha256(value.encode('utf-8')).hexdigest()[:n]
def clean(s): return re.sub(r'\s+',' ',unicodedata.normalize('NFKC',s or '')).strip()
def norm(s): return re.sub(r'[\s\.,，。:：;；!！?？、()（）\[\]【】“”"\'‘’—–_-]+','',clean(s).casefold())
def slug_en(slug):
 slug=slug.replace('_','-').strip('-'); return EN_OVERRIDES.get(slug,' '.join(w.capitalize() for w in slug.split('-')))
def category_for(text):
 low=text.casefold()
 if any(k in text for k in ['英语','法语','西班牙语','葡萄牙语','印地语','旁遮普语','泰米尔语','阿拉伯语','希伯来语','孟加拉语','泰语','老挝语','高棉语','韩语','越南语','罗马尼亚语','挪威语','芬兰语','瑞典语','丹麦语','德语','乌尔都语','语言']): return 'languages'
 if any(k in text.upper() for k in ['STOP','DUR','ALTO','STOPP']) or any(k in text for k in ['词语','单词','停牌','写有','写着','词尾','短语','路名','区号','电话号码','邮政编码','邮编','门牌号']): return 'words'
 for cid,_,_,keys in CATEGORY_DEFS:
  if cid in ('other','languages','words'): continue
  if any(k.casefold() in low for k in keys): return cid
 if any(k in text for k in ['文字','字母','变音符','拼写','泰文','高棉文','韩文','韩国字','老挝文','孟加拉文','天城文','罗马尼亚语字母']): return 'scripts'
 if any(k.casefold() in low for k in ['logo','brand','shop','advert','oxxo','k-market','s-market','k-supermarket','k-citymarket']): return 'brands'
 return 'other'
FREQ=[('exclusive',r'唯一|只有|仅在|独有|独见|仅有|only|unique'),('very-common',r'绝大多数|几乎全部|几乎所有|所有的|通常|最常见|随处可见|普遍|全部|always|most|usually|very common'),('common',r'常见|经常|大部分|很多|大量|广泛|主要|常常|易于识别|可以辨认|可用于识别|特点是|特征是|characterized by|identified by|recognizable|indicative of|frequent|common|often|widespread'),('occasional',r'偶尔|有时|有时候|部分|可能|可以看到|散见|偶见|sometimes|occasionally|may appear'),('rare',r'罕见|很少|少见|极少|很难看到|不常见|rarely|uncommon|rare')]
FREQ=[(n,re.compile(p,re.I)) for n,p in FREQ]; ABSENT=re.compile(r'没有|未见|不存在|从未|并非|不会|never|absent|not found|no (?:such|any)',re.I); NEG=re.compile(r'很少|罕见|少见|极少|不常见|难以|几乎不|rarely|uncommon|rare|not common',re.I); POS=re.compile(r'也有|也可|也能|同样|亦有|还可|还会|分布于|见于|出现于|also|too|shared|occurs in|found in',re.I)
def band_for(s):
 for n,p in FREQ:
  if p.search(s): return n
 return 'unknown'

# Candidate vocabulary is used to recover visual observations in prose that the
# source did not bold. Terms remain traceable to their original paragraph.
OBSERVABLE_TERMS={
'driving':['左侧通行','靠左行驶','左行','右侧通行','靠右行驶','右行'],
'markings':['双黄线','黄色中心线','白色中心线','黄色虚线','白色虚线','双实线','单实线','虚线','实线','未铺装路面','碎石路','土路'],
'posts':['反光桩','路桩','示警柱','导向柱'],
'poles':['电线杆','混凝土杆','木质电线杆','电线杆顶','绝缘子','灰色底座','横杆','横杠','杆顶','贴纸','电表','电力线','电线'],
'barriers':['护栏','防撞栏','水泥护栏','钢护栏','路缘石'],
'signs':['STOP','STOPP','ALTO','PARE','DUR','路牌','指示牌','限速标志','停止标志','交通标志','警告标志','转向标志','诱导标','箭头指向标','狩猎标志','标志边界','雪杆'],
'plates':['黄色车牌','白色车牌','前车牌','后车牌','前牌','后牌','车牌'],
'road-vehicles':['嘟嘟车','三轮车','摩托车','出租车','巴士','公交车','卡车','货车'],
'camera':['街景车','相机代际','相机','镜头','车头','车顶','天线','模糊','马赛克','徒步相机','三脚架'],
'terrain':['山脉','山峰','山丘','高原','峡谷','海岸','海湾','河流','湖泊','瀑布','平坦地形','雪山','积雪','日落','太阳','阴影','光线','地平线'],
'plants':['棕榈树','仙人掌','针叶树','桉树','植被','草地','森林','灌木','树木','作物','树枝','树叶'],
'soil':['红土','红色土壤','沙土','沙地','泥土','岩石','石灰岩','火山岩','土壤'],
'buildings':['瓦屋顶','金属屋顶','平屋顶','砖墙','建筑','房屋','棚屋','村庄','住宅','屋顶'],
'languages':['区号','电话号码','西班牙语','法语','葡萄牙语','英语','印地语','旁遮普语','泰米尔语','孟加拉语','阿萨姆语','古吉拉特语','马拉地语','泰卢固语','奥里亚语','马拉雅拉姆语','阿拉伯语','希伯来语','俄语','日语','韩语','泰语','越南语','高棉语','老挝语','德语','意大利语','荷兰语','土耳其语','塞尔维亚语','克罗地亚语','希腊语'],
'scripts':['西里尔字母','拉丁字母','阿拉伯字母','特殊字母','变音符号','鼻音符号','重音符号','连写字母','字母形状'],
'words':['STOP','STOPP','ALTO','PARE','DUR','ARRÊT','写有','词语','短语','停止标志上的'],
'brands':['招牌','店铺招牌','广告牌','品牌标志','加油站标志','Logo'],
'posts':['雪杆','反光镜','反光片'],
'markings':['黄色边线','白色边线','双白线','三重线','黄色中心线','边缘线'],
'camera':['shitcam','街景代际','三脚架','徒步旅者'],
'terrain':['景观','荒凉景观','草原','山谷','侵蚀山谷','积云'],
'plants':['茶园','甘蔗','咖啡豆','松树','针叶','针叶树','树冠','棕榈','植物','高草'],
'buildings':['圆形烟囱','装饰性烟囱','瓷砖','深棕色瓷砖','白色圆顶'],
'words':['Västra Götaland','C35','A35','A33','M-082','EM-04','NH34','NH206']}

def infer_unbolded_phrase(text, section=''):
 value=clean(text)
 if not value or re.search(r'译者|更新[：|]|原文[：|]|by [A-Z]|YouTube频道|第四步|地图与资源|街景连胜|AI生成',value,re.I): return None
 section_cat=category_for(section)
 section_relevant=any(k in section for k in ['基础设施','区域','州特定','景观','植被','农业','建筑','语言','街景车','车牌','相机','道路','标志','地形','重点','第一步','第一部分','第一节','第1步','第 1 步','第2步','第 2 步','第3步','第 3 步','第二步','第二部分','Step 1','Step1','Step 2','Step2','环境','极端Meta','旗帜','地貌','城镇','交通','线索','特征','认识'])
 if not re.search(r'杆|牌|标|线|树|草|土|石|路|车|相机|植被|地形|建筑|文字|字母|语言|绝缘体|横杆|轮胎|屋顶|海岸|山|覆盖|松|棕榈|植物|绝缘|边线|贴纸|号段|数字|太阳|日落|横杠',value) and not section_relevant: return None
 if not (FREQ and any(pattern.search(value) for _,pattern in FREQ) or re.search(r'可以看到|可见|出现|分布|辨认|长得|看起来|材质|颜色|形状|形态|有一个|有几个|使用|车牌|道路',value)):
  return None
 # Keep the visual description and cut location/prevalence prose where possible.
 value=re.sub(r'^(?:注意[，,:：]?|请注意[，,:：]?|注[，,:：]?|同时[，,:：]?|此外[，,:：]?)','',value)
 value=re.split(r'(?=主要分布于|常见于|最常见于|通常分布于|可以在|可在|仅在|只在|出现在|见于|分布于)',value,maxsplit=1)[0]
 value=re.split(r'[，。；;：]',value,maxsplit=1)[0].strip()
 value=re.sub(r'(?:几乎|最|非常|比较|较为|尤其|通常|经常|偶尔|主要|往往|可能|可以|能够|很少|罕见|常见|独有|独特|普遍)+$','',value)
 value=clean(value)
 return value if 2<=len(norm(value))<=48 else None

def extract_phrases(text, emphasized, section=''):
 # Author emphasis is the most precise visual feature boundary. Only infer terms
 # from vocabulary when the source supplies no emphasized phrase in that block.
 out=list(dict.fromkeys(emphasized)); normed={norm(x) for x in out}
 if not out:
  terms=sorted(((term,cat) for cat,items in OBSERVABLE_TERMS.items() for term in items),key=lambda x:len(norm(x[0])),reverse=True)
  occupied=[]
  for term,cat in terms:
   if norm(term) in normed or term.casefold() not in text.casefold(): continue
   pos=text.casefold().find(term.casefold())
   if any(pos < end and pos+len(term)> start for start,end in occupied): continue
   out.append(term);normed.add(norm(term));occupied.append((pos,pos+len(term)))
 if not out:
  inferred=infer_unbolded_phrase(text,section)
  if inferred and norm(inferred) not in normed: out.append(inferred)
 return out
EXTRA_OBSERVABLE_TERMS={
 'posts':['方形路桩','圆形路桩','黑白路桩','楔形路桩','柱形路桩','顶部黑色路桩','短白色路桩','反光片颜色','红白条纹路桩','白色混凝土路桩','白色反光板','反光板朝向','柱体红白条纹'],
 'signs':['菱形警示牌','黄色菱形警示牌','黄色灯泡','黑白相间的路标','行人过路标志','警告标志边框','警告牌边框','黄色菱形警告牌','红色三角形标志','黄色背景标志','标牌字体大小','停车标志字体','路牌边框','速度标志边框','限速牌边框','骑行道标志','州旗','县旗','区旗','省旗','交通标志颜色'],
 'camera':['灰车短天线','短天线','车顶行李架','蓝色条纹街景车','车头形状','相机低视角','低相机视角','相机高度','蓝白色街景车','车顶架','屋顶行李架','引擎盖污迹'],
 'poles':['灰色金属杆','金属电线杆','混凝土多孔杆','灰色杆顶','三叉戟杆顶','两道横杆','多个横杆','倒A形杆顶','倒三角形杆顶','三角形金属杆顶','双横杆','多孔电线杆','灰色天线','电表颜色','电力公司标牌','杆顶形状'],
 'markings':['黄色外线','黄色边线与白色中线','全黄道路标线','橙色道路中线','三重中心线','双黄色禁止停车边线','白色道路边线','黄色中心线','红砖铺装路面','鹅卵石路面','石块铺装路','沥青路面'],
 'terrain':['高大陡峭山脉','低矮丘陵','平顶山脊','绿色侵蚀山谷','V形山谷','山峰积雪','山坡平坦','干燥沙质土壤','红色土壤','深色土壤','湖泊','积雪','多云天空','稀疏植被','平坦湿地','开阔草原','沙丘','沿海沼泽'],
 'plants':['干旱灌木丛','荆棘林','多肉植物','带刺的灌木丛','适应干旱的草','灌丛和多肉植物','棕色草地','干燥灌丛','稀疏树木','低矮植被','黄色草','高草','茶园','甘蔗田','棉花田','油棕种植园','巴拉那松','南洋杉','水平枝条','枝条末端叶簇','叶子只在枝条末端','树冠形状','针叶树冠','棕榈叶片','仙人掌栅栏'],
 'buildings':['红砖墙','白色小屋','平直瓦片','金属波纹屋顶','屋顶水箱','木屋高跷','交叉框架木屋','白色圆顶','茅草屋顶','灰色砖屋顶','屋顶颜色','砖砌房屋'],
 'road-vehicles':['黑色顶棚黄色嘟嘟车','黄色车顶黑色出租车','白色小型汽车','摩托车侧斗','三轮出租车','蓝白色街景车','车牌字符颜色'],
 'languages':['西班牙语','葡萄牙语','英语','法语','英语与法语','阿拉伯语','希伯来语','泰米尔语','旁遮普语','古吉拉特语','马拉地语','印地语','本地语言'],
 'scripts':['顶端横线字形','带波浪号的字母','下加符号','叠加变音符','连写字母','西里尔字母','阿拉伯字形','圆环字形','元音字形'],
 'words':['区号','电话号码','邮政编码','门牌号','STOP','ALTO','PARE','DUR','BERHENTI','Rua','Jalan','Kabupaten','标牌上的具体单词'],
 'scripts':['圆圈','泰文','泰语文字','高棉文','高棉文字','韩文','韩文字','韩语文字','老挝文','老挝文字','罗马尼亚语字母','越南语字母','孟加拉文','天城文','Cyrillic','西里尔字母','Thai script','Khmer script','Hangul','阿拉伯字母','希伯来字母','希伯来文'],
 'languages':['泰语','高棉语','老挝语','韩语','越南语','罗马尼亚语','芬兰语','瑞典语','挪威语','丹麦语','德语','乌尔都语'],
 'brands':['OXXO','K-Market','S-Market','K-Supermarket','K-Citymarket'],
 'brands':['店铺招牌','广告墙','店铺标志','黄色K字标志','红色字标','连锁商店招牌'],
}
for _cat,_terms in EXTRA_OBSERVABLE_TERMS.items():OBSERVABLE_TERMS[_cat]=list(dict.fromkeys(OBSERVABLE_TERMS.get(_cat,[])+_terms))
COMBINATION_INTERACTION_LR=1.6
BRAZIL_STATE_CODES=set('AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO'.split())
BRAZIL_STATE_NAMES={'AC':'阿克里州','AL':'阿拉戈斯州','AM':'亚马逊州','AP':'阿马帕州','BA':'巴伊亚州','CE':'塞阿拉州','DF':'巴西利亚（DF）','ES':'圣埃斯皮里图州','GO':'戈亚斯州','MA':'马拉尼昂州','MG':'米纳斯吉拉斯州','MS':'南马托格罗索州','MT':'马托格罗索州','PA':'帕拉州','PB':'帕拉伊巴州','PE':'伯南布哥州','PI':'皮奥伊州','PR':'巴拉那州','RJ':'里约热内卢州','RN':'北里奥格兰德州','RO':'朗多尼亚州','RR':'罗赖马州','RS':'南里奥格兰德州','SC':'圣卡塔琳娜州','SE':'塞尔希培州','SP':'圣保罗州','TO':'托坎廷斯州'}
# These exact state names occur in the local India chapter; nearby prose is not used to invent names.
INDIA_REGION_NAMES=('中央邦','马哈拉施特拉邦','加尔克汉德邦','北方邦','北阿坎德邦','卡纳塔克邦','古吉拉特邦','哈里亚纳邦','喀拉拉邦','喜马偕尔邦','奥里萨邦','安得拉邦','恰蒂斯加尔邦','拉贾斯坦邦','旁遮普邦','西孟加拉邦','曼尼普尔邦','果阿邦','梅加拉亚邦','比哈尔邦','泰米尔纳德邦','特伦甘纳邦','特里普拉邦','米佐拉姆邦','阿萨姆邦','锡金','拉达克')
def region_mentions(slug,text):
 out=[]
 if slug=='brazil':
  for match in re.finditer(r'\[([A-Z]{2})\]',text):
   code=match.group(1)
   if code not in BRAZIL_STATE_CODES: continue
   out.append({'key':code,'name':BRAZIL_STATE_NAMES[code],'code':code,'start':match.start(),'end':match.end()})
 elif slug=='india':
  for name in INDIA_REGION_NAMES:
   for match in re.finditer(re.escape(name),text):
    out.append({'key':name,'name':name,'code':None,'start':match.start(),'end':match.end()})
 return list({x['key']:x for x in out}.values())

def flag_lookup(slug):
 table=ROOT/'node_modules'/'flag-icons'/'country.json'; records=json.loads(table.read_text(encoding='utf-8')) if table.exists() else []
 def key(v): return ''.join(ch for ch in unicodedata.normalize('NFKD',v).casefold() if ch.isalnum())
 names={key(r['name']):r['code'] for r in records if r.get('iso')}
 aliases={'czechia':'czechrepublic','krygyzstan':'kyrgyzstan','macau':'macao','cape-verde':'caboverde','ivory-coast':'cotedivoire','drcongo':'congodemocraticrepublic','congo':'congorepublic'}
 value=aliases.get(slug,slug); normed=key(slug_en(value))
 return names.get(normed) or names.get(key(slug_en(slug)))
def parse_chapters():
 soup=BeautifulSoup((SOURCE/'index.html').read_text(encoding='utf-8'),'html.parser');out=[]
 for h in soup.find_all('h2'):
  cont=clean(h.get_text(' ',strip=True)); ul=h.find_next_sibling('ul')
  if not ul or cont not in CONTINENTS: continue
  for a in ul.find_all('a',href=True):
   folder=SOURCE/Path(unquote(a['href'])).parent; mp=folder/'metadata.json'; hp=folder/'index.html';meta=json.loads(mp.read_text(encoding='utf-8')) if mp.exists() else {};slug=meta.get('slug') or folder.name;title=clean(meta.get('title') or a.get_text(' ',strip=True))
   out.append({'slug':slug,'id':'loc:'+slug,'name':{'en':slug_en(slug),'zh':title},'continent':CONTINENTS[cont][0],'continentName':{'en':CONTINENTS[cont][0],'zh':CONTINENTS[cont][1]},'sourcePath':folder.relative_to(ROOT).as_posix(),'htmlPath':hp.relative_to(ROOT).as_posix() if hp.exists() else None,'lakePath':(folder/'document.lake').relative_to(ROOT).as_posix() if (folder/'document.lake').exists() else None,'metadata':meta,'sourceUrl':meta.get('source_url') or '','flagCode':flag_lookup(slug)})
 return out
def main_blocks(html):
 soup=BeautifulSoup(html,'html.parser');main=soup.find('main') or soup.body or soup;current='';heads=[];blocks=[];pending=[];image_no=0
 for node in main.find_all(['h1','h2','h3','h4','p','li','blockquote']):
  if not isinstance(node,Tag):continue
  if node.name=='p' and node.find_parent('blockquote'):continue
  if node.name in ('h1','h2','h3','h4'):
   current=clean(node.get_text(' ',strip=True));heads.append({'title':current,'id':node.get('data-lake-id') or node.get('id') or stable('sec-',current,10)});continue
  text=clean(node.get_text(' ',strip=True));imgs=[]
  for img in node.find_all('img'):
   src=img.get('src','')
   if src:image_no+=1;imgs.append({'sourcePath':src.replace('\\','/'),'alt':clean(img.get('alt','')),'ordinal':image_no})
  if not text:pending.extend(imgs);continue
  allimgs=pending+imgs;pending=[];emphasis=[]
  for item in node.find_all(['strong','b']):
   p=clean(item.get_text(' ',strip=True))
   if len(norm(p))>=2:emphasis.append(p)
  blocks.append({'tag':node.name,'text':text,'section':current,'sectionId':heads[-1]['id'] if heads else '','sourceId':node.get('data-lake-id') or node.get('id') or '','ordinal':len(blocks)+1,'emphasis':list(dict.fromkeys(emphasis)),'images':allimgs})
 if pending: blocks.append({'tag':'figure','text':'','section':current,'sectionId':heads[-1]['id'] if heads else '','sourceId':'','ordinal':len(blocks)+1,'emphasis':[],'images':pending})
 return soup,heads,blocks,image_no,0
def run(args):
 all_chapters=parse_chapters();chosen=set(args.only.split(',')) if args.only else None;chapters=[c for c in all_chapters if not chosen or c['slug'] in chosen];all_by={c['slug']:c for c in all_chapters}
 ctext={};bmap={};hmap={};stats={}
 for c in chapters:
  if c['htmlPath']:
   soup,heads,blocks,imgs,orphan=main_blocks((ROOT/c['htmlPath']).read_text(encoding='utf-8',errors='replace'));ctext[c['slug']]=clean(soup.get_text(' ',strip=True)); seen={im['sourcePath'] for b in blocks for im in b['images']}; allrefs=[]
   for ordinal,img in enumerate(soup.find_all('img'),1):
    src=img.get('src','').replace('\\','/');
    if src: allrefs.append({'sourcePath':src,'alt':clean(img.get('alt','')),'ordinal':ordinal})
   for im in allrefs:
    if im['sourcePath'] not in seen: blocks.append({'tag':'figure','text':'','section':'','sectionId':'','sourceId':'','ordinal':len(blocks)+1,'emphasis':[],'images':[im]});seen.add(im['sourcePath'])
   bmap[c['slug']]=blocks;hmap[c['slug']]=heads;stats[c['slug']]={'blocks':len(blocks),'images':len(allrefs),'orphan':0,'highlighted':sum(bool(b['emphasis']) for b in blocks)}
  else:ctext[c['slug']]='';bmap[c['slug']]=[];hmap[c['slug']]=[];stats[c['slug']]={'blocks':0,'images':0,'orphan':0,'highlighted':0}
 def explicit_parent_relation(text,parent_name):
  if not parent_name: return False
  for match in re.finditer(re.escape(parent_name),text,re.I):
   context=text[max(0,match.start()-72):min(len(text),match.end()+72)]
   if re.search(r'属于|隶属|领土|属地|海外|附属|的一部分|的领土|的地区|territory of|part of|overseas|dependent territory',context,re.I): return True
  return False
 parent_issues=[];locations=[]
 for c in chapters:
  ps=PARENT_SEEDS.get(c['slug']);parent=all_by.get(ps) if ps else None
  if parent and not explicit_parent_relation(ctext.get(c['slug'],''),parent['name']['zh']):
   parent_issues.append({'slug':c['slug'],'candidateParent':ps,'reason':'local chapter does not explicitly state this parent relationship'});parent=None
  locations.append({'id':c['id'],'kind':'region' if parent else ('territory' if c['slug']=='antarctica' else 'country'),'name':c['name'],'parentId':parent['id'] if parent else None,'continentId':'continent:'+c['continent'].lower().replace(' ','-'),'continent':c['continent'],'candidate':True,'flagCode':c['flagCode'] or (parent['flagCode'] if parent else None),'knownAttributes':{},'unknownAttributes':['drivingSide','scriptFamilies','roadCoverageExtent','streetViewGeneration'],'source':{'path':c['htmlPath'],'metadataPath':(ROOT/c['sourcePath']/'metadata.json').relative_to(ROOT).as_posix(),'url':c['sourceUrl']}})
 aliases=sorted([(name,c['id']) for c in all_chapters for name in (c['name']['zh'],c['name']['en']) if len(name)>=3],key=lambda item:len(item[0]),reverse=True)
 display_aliases=sorted({name for c in all_chapters for name in (c['name']['zh'],c['name']['en']) if len(name)>=3}|set(BRAZIL_STATE_NAMES.values())|set(INDIA_REGION_NAMES),key=len,reverse=True)
 regional_locations={};region_mentions_by_block={}
 for chapter in chapters:
  if chapter['slug'] not in ('brazil','india'): continue
  for block in bmap[chapter['slug']]:
   mentions=region_mentions(chapter['slug'],block['text']);region_mentions_by_block[(chapter['slug'],block['ordinal'])]=mentions
   for mention in mentions:
    rid=(chapter['id']+':state:'+mention['code'].lower()) if mention['code'] else stable('loc-region-',chapter['id']+'|'+norm(mention['name']),16)
    if rid not in regional_locations:
     regional_locations[rid]={'id':rid,'kind':'region','name':{'en':('Brasília (DF)' if mention['code']=='DF' else 'Brazil state '+mention['code']) if mention['code'] else mention['name'],'zh':mention['name']},'parentId':chapter['id'],'continentId':'continent:'+chapter['continent'].lower().replace(' ','-'),'continent':chapter['continent'],'candidate':False,'flagCode':None,'knownAttributes':{},'unknownAttributes':['streetViewGeneration','roadEnvironment'],'source':{'path':chapter['htmlPath'],'metadataPath':(ROOT/chapter['sourcePath']/'metadata.json').relative_to(ROOT).as_posix(),'url':chapter['sourceUrl'],'localCode':mention['code']}}
 locations.extend(regional_locations.values())
 features={};images={};facts=[];claims=[];estimates=[];interactions=[];audit=[]
 for c in chapters:
  for b in bmap[c['slug']]:
   block_regions=region_mentions_by_block.get((c['slug'],b['ordinal']),[])
   fid=stable('fact-',c['id']+'|'+(b['sourceId'] or str(b['ordinal']))+'|'+b['text'],18);pf=[]
   for phrase in extract_phrases(b['text'], b['emphasis'], b['section']):
    cat=category_for(phrase)
    if cat=='other':
     section_category=category_for(b['section']);context_category=category_for(b['text'])
     cat=section_category if section_category!='other' else context_category
    if cat=='other':
     cat='languages' if '语言' in b['section'] else 'plants' if any(k in b['section'] for k in ['植被','农业']) else 'buildings' if '建筑' in b['section'] else 'camera' if any(k in b['section'] for k in ['街景车','相机']) else 'markings' if any(k in b['section'] for k in ['道路','路面']) else 'poles' if '基础设施' in b['section'] else 'terrain' if any(k in b['section'] for k in ['景观','地区','区域','焦点','位置']) else 'other'
    key=norm(phrase);feature_id=stable('feat-',key,16)
    if feature_id not in features:
     display_phrase=safe_display_phrase(phrase,cat,display_aliases);english=english_label(display_phrase);features[feature_id]={'id':feature_id,'appearance':{'en':english,'zh':display_phrase},'categoryId':cat,'categoryIds':[cat],'categoryVotes':{},'evidenceGroupIds':[],'imageIds':[],'assetIds':[],'factIds':[],'translationStatus':'reviewed-glossary' if display_phrase in EN_APPEARANCE else ('source-latin' if re.search(r'[A-Za-z]',display_phrase) else 'needs-translation'),'normalizedKey':key}
    ft=features[feature_id];ft['categoryVotes'][cat]=ft['categoryVotes'].get(cat,0)+1;pf.append({'featureId':feature_id,'phrase':phrase,'position':b['text'].find(phrase),'categoryId':cat});ft['factIds'].append(fid)
   digest=hashlib.sha256(b['text'].encode()).hexdigest();audit.append({'id':fid,'locationId':c['id'],'sectionId':b['sectionId'],'sourceId':b['sourceId'] or None,'tag':b['tag'],'textHash':digest,'hasText':bool(b['text']),'hasVisualEmphasis':bool(b['emphasis']),'hasExtractedFeature':bool(pf),'status':'feature-extracted' if pf else 'preserved-context-needs-review'})
   image_ids=[]
   for im in b['images']:
    iid=stable('img-',c['id']+'|'+im['sourcePath'],16);image_ids.append(iid)
    images.setdefault(iid,{'id':iid,'sourcePath':(Path(c['sourcePath'])/im['sourcePath']).as_posix(),'chapterId':c['id'],'chapterSourceUrl':c['sourceUrl'],'alt':im['alt'],'ordinal':im['ordinal'],'thumbnailPath':None,'originalPath':(Path(c['sourcePath'])/im['sourcePath']).as_posix(),'author':None,'license':'unknown from local metadata','redistributionStatus':'review-required','status':'source-only'})
   for f in pf:
    ft=features[f['featureId']];ft['imageIds'].extend(image_ids);ft['evidenceGroupIds'].append(fid)
   text=b['text'];tier=band_for(text);mentioned=[]
   for alias,lid in aliases:
    if lid!=c['id'] and alias in text:
     pos=text.find(alias);ctx=text[max(0,pos-24):min(len(text),pos+len(alias)+24)]
     relation='opposes' if NEG.search(ctx) else ('supports' if POS.search(ctx) else 'unclassified');mentioned.append({'locationId':lid,'alias':alias,'relation':relation})
   fclaims=[]
   paramsByBand={'exclusive':(0.96,'Explicit unique wording; estimated, not measured.'),'very-common':(0.82,'Broad high-frequency wording; estimated, not measured.'),'common':(0.62,'Common/frequent wording; estimated, not measured.'),'occasional':(0.34,'Occasional/possible wording; estimated, not measured.'),'rare':(0.14,'Rare wording; estimated, not measured.'),'explicit-absence':(0.03,'Explicit local absence statement; exceptions remain possible.')}
   for f in pf:
    pos=max(0,f['position']);ctx=text[max(0,pos-36):min(len(text),pos+len(f['phrase'])+36)];rel='explicit-absence' if ABSENT.search(ctx) else ('opposes' if NEG.search(ctx) else 'supports');claim_id=stable('claim-',fid+'|'+f['featureId']+'|'+c['id'],18);prevalence='explicit-absence' if rel=='explicit-absence' else tier
    region_specific=bool(block_regions) and c['slug'] in ('brazil','india')
    if region_specific: prevalence='unknown'
    claim={'id':claim_id,'factId':fid,'featureId':f['featureId'],'locationId':c['id'],'relation':rel,'prevalenceBand':prevalence,'conditions':{'section':b['section'] or None,'categoryId':f['categoryId'],'years':sorted(set(re.findall(r'20(?:0[0-9]|1[0-9]|2[0-9])',text))),'cameraGenerationMentioned':bool(re.search(r'相机代际|第[一二三四五六]代|generation',text,re.I)),'regionSpecific':region_specific},'correlationGroupId':fid,'mentionCandidates':mentioned};fclaims.append(claim);claims.append(claim)
    if prevalence in paramsByBand:
     band=prevalence;params=paramsByBand[band];estimates.append({'claimId':claim_id,'featureId':f['featureId'],'locationId':c['id'],'pPresent':params[0],'band':band,'basis':'qualitative-band-estimate-v1','basisReason':params[1],'status':'initial-estimate','measured':False,'sourceFactId':fid,'sourceHash':digest})
    for region in block_regions:
     rid=(c['id']+':state:'+region['code'].lower()) if region['code'] else stable('loc-region-',c['id']+'|'+norm(region['name']),16)
     rctx=text[max(0,region['start']-72):min(len(text),region['end']+72)];rband=band_for(rctx) if band_for(rctx)!='unknown' else tier;rrel='explicit-absence' if ABSENT.search(rctx) else ('opposes' if NEG.search(rctx) else 'supports');rprev='explicit-absence' if rrel=='explicit-absence' else rband
     rcid=stable('claim-',fid+'|'+f['featureId']+'|'+rid,18);rclaim={'id':rcid,'factId':fid,'featureId':f['featureId'],'locationId':rid,'relation':rrel,'prevalenceBand':rprev,'conditions':{'section':b['section'] or None,'sourceRegionName':region['name'],'localCode':region['code'],'years':sorted(set(re.findall(r'20(?:0[0-9]|1[0-9]|2[0-9])',rctx)))},'correlationGroupId':fid,'mentionCandidates':[]};fclaims.append(rclaim);claims.append(rclaim)
     if rprev in paramsByBand:
      pval,reason=paramsByBand[rprev];estimates.append({'claimId':rcid,'featureId':f['featureId'],'locationId':rid,'pPresent':pval,'band':rprev,'basis':'qualitative-band-estimate-v1','basisReason':reason,'status':'initial-estimate','measured':False,'sourceFactId':fid,'sourceHash':digest})
   for f in pf:
    for mention in mentioned:
     if mention['relation'] not in ('supports','opposes'): continue
     mid=mention['locationId'];mctx=text[max(0,text.find(mention['alias'])-60):min(len(text),text.find(mention['alias'])+len(mention['alias'])+60)];mband=band_for(mctx);mrel='explicit-absence' if ABSENT.search(mctx) else ('opposes' if NEG.search(mctx) else mention['relation']);mprev='explicit-absence' if mrel=='explicit-absence' else mband
     mcid=stable('claim-',fid+'|'+f['featureId']+'|'+mid,18);mclaim={'id':mcid,'factId':fid,'featureId':f['featureId'],'locationId':mid,'relation':mrel,'prevalenceBand':mprev,'conditions':{'sourceMention':mention['alias'],'section':b['section'] or None},'correlationGroupId':fid,'mentionCandidates':[]};fclaims.append(mclaim);claims.append(mclaim)
     if mprev in paramsByBand:
      pval,reason=paramsByBand[mprev];estimates.append({'claimId':mcid,'featureId':f['featureId'],'locationId':mid,'pPresent':pval,'band':mprev,'basis':'qualitative-band-estimate-v1','basisReason':reason,'status':'initial-estimate','measured':False,'sourceFactId':fid,'sourceHash':digest})
   if len(pf)>1 and re.search(r'结合|同时|组合|配合|共同|一起|both|together|combination|combine',text,re.I):
    iids=sorted({x['featureId'] for x in pf})
    if len(iids)>1:
     interactions.append({'id':stable('interaction-',fid+'|'.join(iids),18),'featureIds':iids,'locationId':c['id'],'relation':'interaction','likelihoodRatio':COMBINATION_INTERACTION_LR,'certaintyMode':'minimum','condition':'all-seen','sourceFactId':fid,'rationale':'Explicit source text combines these observations; LR is a centralized initial estimate of extra interaction, not a measured rate.','measured':False})
   if text: facts.append({'id':fid,'locationId':c['id'],'section':b['section'] or 'Unsectioned source text','sectionId':b['sectionId'] or stable('sec-',c['id']+'|unsectioned',10),'source':{'path':c['htmlPath'],'elementId':b['sourceId'] or None,'url':c['sourceUrl']},'sourceHash':digest,'excerpt':text[:320],'featureIds':[f['featureId'] for f in pf],'imageIds':image_ids,'claims':fclaims,'status':'feature-extracted' if pf else 'preserved-context-needs-review'})
 # Consolidate repeated same clue/location references as one estimate, preserving all source fact IDs elsewhere.
 # One clue/location gets one estimate: deduplicate identical source text, then use the median
 # of distinct source estimates so a single emphatic sentence cannot dominate conflicting notes.
 grouped={};
 for e in estimates: grouped.setdefault((e['featureId'],e['locationId']),{}).setdefault(e.get('sourceHash',e['sourceFactId']),e)
 best={}
 for key,by_source in grouped.items():
  rows=list(by_source.values());values=sorted(row['pPresent'] for row in rows);n=len(values);median=values[n//2] if n%2 else (values[n//2-1]+values[n//2])/2
  reference=sorted(rows,key=lambda row:row['sourceFactId'])[0]
  best[key]={k:v for k,v in reference.items() if k not in ('claimId','pPresent','band','basisReason')}
  best[key].update({'pPresent':median,'band':'median-source-estimate','basis':'median-distinct-source-estimates-v1','basisReason':'Median of distinct local source-text estimates for this clue and location; qualitative tiers are initial estimates, never measured rates.','sourceFactIds':sorted({row['sourceFactId'] for row in rows}),'claimIds':sorted({cid for row in rows for cid in row.get('claimIds',[row['claimId']] if row.get('claimId') else [])})})
 # Marginalize the complete Brazil state scheme into the country candidate with a uniform state prior.
 brazil_codes={x['source'].get('localCode') for x in regional_locations.values() if x['parentId']=='loc:brazil'}
 if brazil_codes==BRAZIL_STATE_CODES:
  brazil_state_ids={x['id'] for x in regional_locations.values() if x['parentId']=='loc:brazil'}
  by_feature={}
  for estimate in best.values():
   if estimate['locationId'] in brazil_state_ids: by_feature.setdefault(estimate['featureId'],[]).append(estimate)
  for feature_id,rows in by_feature.items():
   if (feature_id,'loc:brazil') in best: continue
   by_location={row['locationId']:row for row in rows};values=[by_location.get(state_id,{}).get('pPresent',0.5) for state_id in sorted(brazil_state_ids)];reference=rows[0]
   best[(feature_id,'loc:brazil')]={'featureId':feature_id,'locationId':'loc:brazil','pPresent':sum(values)/len(values),'band':'uniform-state-marginal-estimate','basis':'uniform-state-marginal-v1','basisReason':'Mean of 27 mutually exclusive source-listed states; unmentioned states use shared 0.5 background. Equal state prior is an engineering assumption, not a game sampling estimate.','status':'initial-estimate','measured':False,'sourceFactId':reference['sourceFactId'],'claimIds':sorted({cid for row in rows for cid in row.get('claimIds',[])})}
 region_schemes=[]
 for parent in locations:
  children=[x for x in locations if x['parentId']==parent['id']]
  if not children: continue
  codes={x['source'].get('localCode') for x in children if x['source'].get('localCode')};complete=parent['id']=='loc:brazil' and codes==BRAZIL_STATE_CODES
  region_schemes.append({'schemaVersion':3,'countryId':parent['id'],'granularity':{'en':'States (source-coded)','zh':'州（按原文代码）'},'regions':[{'id':x['id'],'name':x['name'],'coverageSource':x['source']['url']} for x in sorted(children,key=lambda x:x['id'])],'complete':complete,'note':{'en':'The 27 source-coded states are mutually exclusive. Uniform state prior is used because no local map sampling weights are available.' if complete else 'The source names some areas only; a complete mutually exclusive partition is not established, so no distribution is shown.','zh':'原文代码对应的 27 个州互不重叠。没有本地地图抽样权重，因此州内采用均匀先验。' if complete else '资料只提到部分地区，没有建立完整互斥分区，因此不显示比例。'}})
 photo_curation=json.loads((ROOT/'src'/'data'/'knowledge'/'photo-curation.json').read_text(encoding='utf-8'))
 approved_assets={asset['id'] for asset in photo_curation.get('assets',[]) if asset.get('status')=='approved'}
 photo_issues=[]
 for match in photo_curation.get('matches',[]):
  feature=features.get(match.get('featureId',''))
  if not feature or match.get('assetId') not in approved_assets:
   photo_issues.append({'assetId':match.get('assetId'),'featureId':match.get('featureId'),'reason':'missing feature or approved asset'})
   continue
  feature['assetIds'].append(match['assetId'])
 for f in features.values():
  f['categoryId']=sorted(f['categoryVotes'].items(),key=lambda item:(-item[1],item[0]))[0][0] if f['categoryVotes'] else f['categoryId'];f['categoryIds']=[f['categoryId']];f.pop('categoryVotes',None)
  f['factIds']=list(dict.fromkeys(f['factIds']));f['evidenceGroupIds']=list(dict.fromkeys(f['evidenceGroupIds']));f['imageIds']=list(dict.fromkeys(f['imageIds']));f['assetIds']=list(dict.fromkeys(f['assetIds']))
 progress=[]
 for c in chapters:
  s=stats[c['slug']];count=sum(x['locationId']==c['id'] and bool(x['featureIds']) for x in facts);allfacts=sum(x['locationId']==c['id'] for x in facts);textblocks=sum(x['locationId']==c['id'] and x['hasText'] for x in audit);unclass=sum(x['locationId']==c['id'] and x['hasText'] and not x['hasExtractedFeature'] for x in audit)
  progress.append({'locationId':c['id'],'chapter':c['sourcePath'],'sourceUrl':c['sourceUrl'],'status':'imported' if s['blocks'] else 'missing-content','textBlocks':textblocks,'convertedFeatureBlocks':count,'preservedContextBlocks':allfacts-count,'unclassifiedBlocks':unclass,'emphasizedBlocks':s['highlighted'],'imagesReferenced':s['images'],'orphanImages':s['orphan'],'missingLake':not bool(c['lakePath']),'issues':(['chapter HTML has no content paragraphs'] if not s['blocks'] else [])+(['raw document.lake missing; HTML retained'] if not c['lakePath'] else [])})
 groups={'roads':('Roads & roadside','道路与路侧',['driving','markings','posts','poles','barriers','signs']),'vehicles':('Vehicles & camera','车辆与相机',['plates','road-vehicles','camera']),'landscape':('Landscape & built world','景观与建筑',['terrain','plants','soil','buildings']),'writing':('Writing & signs','文字与招牌',['languages','scripts','words','brands','other'])}
 categories=[{'id':gid,'name':{'en':en,'zh':zh},'children':[{'id':cid,'name':{'en':CATEGORY_LABEL[cid][0],'zh':CATEGORY_LABEL[cid][1]},'selectionMode':'single' if cid=='driving' else 'multiple'} for cid in children]} for gid,(en,zh,children) in groups.items()]
 detail_map={}
 for fact in facts:
  for feature_id in fact['featureIds']:
   item=detail_map.setdefault(feature_id,{'featureId':feature_id,'sourceNotes':[],'sourceUrls':[],'relations':{'supports':[],'opposes':[],'explicit-absence':[]}})
   url=fact['source']['url']
   if url and url not in item['sourceUrls']: item['sourceUrls'].append(url)
   note={'section':fact['section'],'excerpt':fact['excerpt'][:180],'url':url}
   if note not in item['sourceNotes'] and len(item['sourceNotes'])<2: item['sourceNotes'].append(note)
 for claim in claims:
  relation=claim['relation']
  if relation not in ('supports','opposes','explicit-absence'): continue
  item=detail_map.setdefault(claim['featureId'],{'featureId':claim['featureId'],'sourceNotes':[],'sourceUrls':[],'relations':{'supports':[],'opposes':[],'explicit-absence':[]}})
  if claim['locationId'] not in item['relations'][relation]: item['relations'][relation].append(claim['locationId'])
 clue_info=sorted(detail_map.values(),key=lambda item:item['featureId'])
 return {'locations':locations,'categories':categories,'features':sorted(features.values(),key=lambda x:x['id']),'runtimeFeatures':[{key:feature[key] for key in ('id','appearance','categoryId','evidenceGroupIds','assetIds','translationStatus')} for feature in sorted(features.values(),key=lambda x:x['id'])],'clueInfo':clue_info,'facts':sorted(facts,key=lambda x:x['id']),'claims':sorted(claims,key=lambda x:x['id']),'estimates':sorted(best.values(),key=lambda x:(x['locationId'],x['featureId'])),'images':sorted(images.values(),key=lambda x:x['id']),'interactions':sorted(interactions,key=lambda x:x['id']),'regionSchemes':region_schemes,'photoCuration':photo_curation,'audit':{'chapterProgress':progress,'paragraphAudit':audit,'parentUnverified':parent_issues,'photoCurationMatches':len(photo_curation.get('matches',[])),'photoCurationIssues':photo_issues,'approvedPhotoAssets':len(approved_assets),'sourceChapters':len(chapters),'sourceTextBlocks':sum(bool(x['hasText']) for x in audit),'sourceContentNodes':len(audit),'featureCount':len(features),'factCount':len(facts),'claimCount':len(claims),'estimateCount':len(best),'interactionCount':len(interactions),'imageReferences':len(images),'processedWith':'scripts/import_tuxundoc.py','readOnlySource':True,'sourceVersion':{'entry':'tuxundoc/index.html','capturedAt':'2026-09-25','chapterCount':len(all_chapters)},'modelNote':'Qualitative language bands map to initial estimated prevalence. These are not measured frequencies.'}}
def write_json(path,value):
 path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_suffix(path.suffix+'.tmp');tmp.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8');tmp.replace(path)
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--only',help='comma-separated chapter slugs for pilot');ap.add_argument('--out',help='output directory; defaults to src/data/knowledge');args=ap.parse_args()
 if not (SOURCE/'index.html').exists():raise SystemExit(f'Local source entry not found: {SOURCE}')
 data=run(args);out=Path(args.out) if args.out else DEFAULT_OUT
 for fn,key in [('locations.json','locations'),('categories.json','categories'),('features.json','features'),('facts.json','facts'),('claims.json','claims'),('estimates.json','estimates'),('images.json','images'),('interactions.json','interactions'),('regions.json','regionSchemes'),('import-progress.json','audit')]:write_json(out/fn,{'schemaVersion':3,key:data[key]})
 write_json(out/'runtime-features.json',{'schemaVersion':3,'features':data['runtimeFeatures']})
 write_json(out/'clue-info.json',{'schemaVersion':3,'clues':data['clueInfo']})
 write_json(out/'model-parameters.json',{'schemaVersion':3,'parameters':{'qualitativePrevalenceBands':{'exclusive':0.96,'very-common':0.82,'common':0.62,'occasional':0.34,'rare':0.14,'explicit-absence':0.03},'observationModel':{'certainSensitivity':0.95,'certainSpecificity':0.98,'uncertainSensitivity':0.68,'uncertainSpecificity':0.78,'interpretation':'Estimated observation recognition rates; centralized defaults, not measured.'},'unknownLocationFeature':'use common background prevalence 0.5; no evidence is neutral relative to the shared background.'},'prior':{'kind':'uniform','reason':'No reliable sampling prior is available in the local source corpus.'},'combinationInteractionLikelihoodRatio':COMBINATION_INTERACTION_LR,'regionalPrior':{'kind':'uniform-over-explicit-complete-scheme','reason':'Only complete source-supported partitions are scored; incomplete regional mentions are retained but not normalized into a fake whole-country distribution.'},'dependenceFallback':'For unresolved correlation within one source fact, retain the strongest candidate-relative marginal likelihood term; explicit interaction terms are applied separately.','normalization':'log-sum-exp; no fixed tail mixture or posterior cap'})
 print(json.dumps({'chapters':data['audit']['sourceChapters'],'blocks':data['audit']['sourceTextBlocks'],'features':data['audit']['featureCount'],'facts':len(data['facts']),'claims':len(data['claims']),'estimates':len(data['estimates']),'interactions':len(data['interactions']),'images':data['audit']['imageReferences'],'sourceImagesRedistributionApproved':sum(x['redistributionStatus']=='approved' for x in data['images']),'textOnlyFeatureCount':sum(not x['assetIds'] for x in data['features']),'sourceImageReferencedFeatureCount':sum(bool(x['imageIds']) for x in data['features']),'licensedPhotoCardCount':sum(bool(x['assetIds']) for x in data['features']),'licensedPhotoCount':data['audit']['approvedPhotoAssets'],'factsWithoutFeature':sum(not x['featureIds'] for x in data['facts']),'output':str(out)},ensure_ascii=False))
if __name__=='__main__':main()
