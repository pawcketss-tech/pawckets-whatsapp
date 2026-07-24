const express = require('express');
const twilio = require('twilio');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// DISCLAIMER
// ============================================================
const CONVERSATION_DISCLAIMER = `
---
⚠️ 此為網上資訊摘要，並非醫療建議。如有疑慮，請諮詢獸醫。`;

// ============================================================
// SYMPTOM DATABASE WITH SYNONYMS
// ============================================================
const SYMPTOMS = {
  lossOfAppetite: {
    keywords: ['唔食', '唔肯食', '食慾下降', '食量減少', '冇胃口', '唔願食', '食少', '厭食', '唔食嘢', '食慾不振', '瘦', '體重下降'],
    synonyms: ['loss of appetite', 'no appetite', 'not eating', 'won\'t eat', 'eating less', 'anorexia', 'refusing food', 'doesn\'t want to eat', 'not hungry', 'skip meals', 'starving', 'fasting'],
    info: '食慾不振是常見警號，可能由壓力、牙齒問題或內臟疾病引起。'
  },
  weightLoss: {
    keywords: ['瘦咗', '體重下降', '輕咗', '變瘦', '冇肉', '見骨', '消瘦', '營養不良', '骨瘦如柴', '皮包骨'],
    synonyms: ['weight loss', 'losing weight', 'skinny', 'underweight', 'thin', 'emaciated', 'bony', 'slim', 'slender', 'lean', 'gaunt'],
    info: '體重持續下降可能因慢性疾病、寄生蟲、腫瘤或牙齒問題。'
  },
  lethargy: {
    keywords: ['冇精神', '呆滯', '唔郁', '冇力', '倦怠', '唔活躍', '成日瞓', '冇活力', '垂頭喪氣', '軟弱', '疲勞', '無力', '唔動', '好攰', '攰'],
    synonyms: ['lethargy', 'lethargic', 'tired', 'sleepy', 'no energy', 'weak', 'fatigue', 'inactive', 'not moving', 'exhausted', 'drowsy', 'sluggish', 'lazy', 'listless', 'apathetic', 'drained'],
    info: '精神差可能由多種疾病引起，需觀察其他症狀。'
  },
  huddling: {
    keywords: ['縮埋', '蜷縮', '縮成一團', '角落', '唔出嚟', '匿埋', '縮', '卷埋', '彎腰'],
    synonyms: ['hunched', 'huddling', 'curled up', 'hiding', 'corner', 'withdrawn', 'crouching', 'cowering', 'nestled', 'bunched up'],
    info: '縮埋一角或駝背姿勢是常見的疼痛或不適表現。'
  },
  irritability: {
    keywords: ['暴躁', '咬人', '攻擊', '發脾氣', '易怒', '激動', '尖叫', '緊張', '唔比摸', '唔比掂'],
    synonyms: ['irritable', 'aggressive', 'biting', 'angry', 'snappy', 'tense', 'nervous', 'cranky', 'grumpy', 'moody', 'fussy', 'short-tempered', 'hostile'],
    info: '突然變得暴躁或愛咬人，可能是疼痛或不適的信號。'
  },
  repetitiveBehavior: {
    keywords: ['重複行為', '來回走', '搖頭', '咬籠', '轉圈', '兜圈', '重複動作', '強迫行為'],
    synonyms: ['repetitive', 'pacing', 'circling', 'bar biting', 'head shaking', 'obsessive', 'stereotypic', 'repetitive movements', 'rocking', 'weaving'],
    info: '重複行為通常是壓力、無聊或神經系統問題的信號。'
  },
  shaking: {
    keywords: ['震', '抖', '痙攣', '抽搐', '發抖', '顫抖', '震顫', '癲癇', '抽筋', '打震'],
    synonyms: ['shaking', 'trembling', 'tremors', 'shivers', 'seizures', 'convulsions', 'tremor', 'quivering', 'shuddering', 'vibrating', 'jerking'],
    info: '顫抖可能因寒冷、低血糖、緊張或神經系統疾病引起。'
  },
  shivering: {
    keywords: ['發冷', '凍到震', '打冷震', '寒顫', '怕凍'],
    synonyms: ['shivering', 'shivers', 'chills', 'cold', 'cold shivers', 'freezing', 'biting cold', 'frosty'],
    info: '持續發冷可能因體溫過低或嚴重感染。'
  },
  ruffledCoat: {
    keywords: ['毛凌亂', '毛亂', '冇梳毛', '毛打結', '打結', '毛豎起', '毛粗糙', '骯髒', '冇理毛'],
    synonyms: ['ruffled fur', 'unkempt', 'matted fur', 'puffed up', 'messy coat', 'rough coat', 'scruffy', 'disheveled', 'bedraggled', 'unkempt fur'],
    info: '毛髮凌亂代表鼠鼠停止梳理自己，通常是不舒服的表現。'
  },
  hairLoss: {
    keywords: ['脫毛', '甩毛', '禿毛', '冇毛', '甩髮', '斑禿', '掉毛', '毛變稀疏', '光禿', '局部禿'],
    synonyms: ['hair loss', 'bald patches', 'balding', 'thinning fur', 'alopecia', 'fur loss', 'shedding', 'moulting', 'bald spots', 'patches of hair loss'],
    info: '脫毛可由壓力、營養不良、寄生蟲、過敏或荷爾蒙問題引起。'
  },
  scratching: {
    keywords: ['抓癢', '痕癢', '不停抓', 'R痕', '搔癢', '抓', '癢', '痕', '咬毛', '咬自己', '舔到禿'],
    synonyms: ['scratching', 'itchy', 'itch', 'scratch', 'biting fur', 'overgrooming', 'pruritus', 'scratching excessively', 'rubbing', 'chewing skin'],
    info: '頻繁抓癢可能因寄生蟲（蟎蟲）、皮膚乾燥、過敏或真菌感染引起。'
  },
  lumps: {
    keywords: ['腫塊', '硬塊', '瘤', '囊腫', '粒嘢', '肉粒', '突起', '腫脹', '結節', '脂肪瘤'],
    synonyms: ['lump', 'bump', 'mass', 'tumor', 'swelling', 'nodule', 'cyst', 'growth', 'protrusion', 'swollen area'],
    info: '身體上的腫塊可能是膿瘡、腫瘤或囊腫，需由獸醫檢查。'
  },
  abscess: {
    keywords: ['膿瘡', '化膿', '傷口流膿', '膿包', '發炎腫脹', '有膿', '含膿'],
    synonyms: ['abscess', 'pus', 'infected wound', 'boil', 'pustule', 'purulent', 'suppuration', 'festering', 'draining pus'],
    info: '膿瘡需由獸醫切開引流，切勿自行擠壓。'
  },
  skinWounds: {
    keywords: ['傷口', '咬傷', '抓傷', '潰瘍', '皮膚破損', '流血', '損咗', '刮傷'],
    synonyms: ['wound', 'cut', 'scratch', 'ulcer', 'injury', 'skin tear', 'bite wound', 'laceration', 'abrasion', 'gash', 'sore', 'lesion'],
    info: '傷口可能來自打架、擦傷或寄生蟲，需保持清潔並就醫。'
  },
  scalySkin: {
    keywords: ['皮屑', '脫皮', '乾燥皮膚', '鱗屑', '白色皮屑', '頭皮屑', '甩皮', '皮膚乾'],
    synonyms: ['scaly skin', 'dandruff', 'dry skin', 'flaky skin', 'scales', 'flaking', 'squamous', 'desquamation', 'peeling skin'],
    info: '大量皮屑可能因寄生蟲（蟎蟲）或真菌感染（金錢癬）。'
  },
  sneeze: {
    keywords: ['打噴嚏', '噴嚏', '打乞嗤', '乞嗤', '噴嚏', '打噴', '鼻敏感'],
    synonyms: ['sneeze', 'sneezing', 'allergies', 'sneeze fit', 'sternutation', 'sniffle', 'snuffling'],
    info: '噴嚏可能因灰塵、墊材過敏或呼吸道感染引起。'
  },
  runnyNose: {
    keywords: ['流鼻水', '鼻水', '鼻涕', '流鼻', '鼻塞', '鼻子濕', '鼻水倒流', '呼吸有鼻聲', '鼻潺'],
    synonyms: ['runny nose', 'nasal discharge', 'stuffy nose', 'sniffling', 'wet nose', 'rhinorrhea', 'congestion', 'blocked nose', 'snuffles'],
    info: '流鼻水常見於感冒、過敏或感染，需觀察是否惡化。'
  },
  breathing: {
    keywords: ['呼吸有聲', '喘氣', '呼吸困難', '喘', '氣喘', '唞氣', '索索聲', '呼吸聲', '開口呼吸', '腹部呼吸', '急速呼吸', '好喘'],
    synonyms: ['labored breathing', 'difficulty breathing', 'wheezing', 'shortness of breath', 'respiratory distress', 'rapid breathing', 'breathlessness', 'dyspnea', 'gasping', 'panting', 'hard breathing', 'struggling to breathe'],
    info: '呼吸困難屬急症！可能由肺炎、過敏或心臟問題引起。'
  },
  coughing: {
    keywords: ['咳', '咳嗽', '咳聲', '乾咳', '清喉嚨', '氣管'],
    synonyms: ['cough', 'coughing', 'dry cough', 'hacking', 'coughing fit', 'tussis', 'wheezing cough'],
    info: '咳嗽可能因呼吸道感染或墊材灰塵刺激。'
  },
  wheezing: {
    keywords: ['氣喘聲', '哮鳴', '呼吸有哨聲', '喘鳴', '索索聲'],
    synonyms: ['wheezing', 'wheeze', 'whistling sound', 'sibilant', 'asthmatic breathing', 'chest congestion'],
    info: '呼吸有異聲可能因氣管收窄或感染。'
  },
  nasalDischarge: {
    keywords: ['鼻分泌物', '鼻水有顏色', '黃色鼻水', '綠色鼻水', '鼻膿', '鼻涕'],
    synonyms: ['nasal discharge', 'yellow discharge', 'green discharge', 'snot', 'mucus', 'purulent nasal', 'thick mucus', 'colored discharge'],
    info: '有色鼻水（黃/綠）表示細菌感染，需盡快就醫。'
  },
  blueSkin: {
    keywords: ['變藍', '藍色皮膚', '發紫', '紫紺', '皮膚藍', '嘴藍'],
    synonyms: ['blue skin', 'cyanosis', 'blue gums', 'purple skin', 'blue tint', 'bluish', 'discolored', 'pale blue', 'blue lips'],
    info: '皮膚或黏膜變藍是缺氧的危險信號，屬急症！'
  },
  diarrhea: {
    keywords: ['肚柯', '柯水', '腹瀉', '肚瀉', '爛便', '水便', '痾水', '肚痾', '屙', '柯爛', '爛屎', '濕便', '軟便', '綠色便', '黃色便', '柯水水'],
    synonyms: ['diarrhea', 'loose stool', 'watery stool', 'runny poop', 'soft stool', 'green stool', 'frequent pooping', 'dysentery', 'gastroenteritis', 'tummy ache', 'upset stomach', 'colon issues', 'dehydration'],
    info: '腹瀉可由飲食改變、細菌感染或寄生蟲引起。'
  },
  wetTail: {
    keywords: ['濕尾', '屁股濕', '肛門濕', '尾巴濕', 'pat濕', '尾部濕', '肛門紅腫', '屁股紅', '尾濕'],
    synonyms: ['wet tail', 'wet Tail', 'wet-tail', 'wetTail', 'wet bottom', 'proliferative ileitis', 'wet tail disease', 'diarrhea tail', 'mucky bottom', 'dirty tail'],
    info: '濕尾症是嚴重腸道感染，屬急症！可在48小時內致命。'
  },
  vomiting: {
    keywords: ['嘔吐', '嘔', '反胃', '吐', '嘔吐物'],
    synonyms: ['vomit', 'vomiting', 'throw up', 'nausea', 'queasy', 'sick to stomach', 'regurgitation', 'emesis', 'upset stomach', 'gastric distress'],
    info: '嘔吐可能因飲食不當、腸胃問題或寄生蟲引起。如持續嘔吐，需盡快就醫。'
  },
  vomitingBlood: {
    keywords: ['吐血', '嘔血', '咳血', '吐血絲'],
    synonyms: ['vomit blood', 'vomiting blood', 'blood in vomit', 'bloody vomit', 'hematemesis', 'red vomit', 'coffee ground vomit'],
    info: '吐血屬急症！可能因內出血、潰瘍或中毒引起。'
  },
  bleeding: {
    keywords: ['流血', '出血', '傷口流血', '陰道出血', '肛門出血', '鼻血', '血', '吐血', '嘔血', '咳血'],
    synonyms: ['blood', 'bleeding', 'hemorrhage', 'blood loss', 'hemoptysis', 'bloody', 'blood-stained', 'open wound bleeding'],
    info: '任何部位出血都需立即就醫！屬急症！'
  },
  constipation: {
    keywords: ['便秘', '屙唔出', '冇便便', '便便好少', '肚脹', '腹脹', '排便困難', '一粒粒便', '硬便', '乾便'],
    synonyms: ['constipation', 'hard stool', 'no poop', 'difficulty pooping', 'dry stool', 'impacted', 'infrequent stool', 'straining to poop', 'bloating', 'unable to defecate'],
    info: '便秘可能因缺水、飲食纖維不足或腸道阻塞引起。'
  },
  bloating: {
    keywords: ['肚脹', '腹脹', '肚仔大', '肚脹卜卜', '腹部腫脹', '肚圓', '鼓鼓'],
    synonyms: ['bloating', 'swollen belly', 'distended abdomen', 'bloated stomach', 'gas', 'flatulence', 'abdominal distention', 'puffed belly'],
    info: '腹部脹大可能因消化不良、腸道阻塞或嚴重感染。'
  },
  dehydration: {
    keywords: ['缺水', '脫水', '皮膚乾', '眼窩凹陷', '口渴', '飲水少', '乾燥', '皮膚冇彈性'],
    synonyms: ['dehydration', 'dry skin', 'sunken eyes', 'thirsty', 'not drinking', 'water deficiency', 'fluid loss', 'skin tenting', 'dry mouth'],
    info: '脫水可能因腹瀉或飲水不足引起，需立即補充水分。'
  },
  fecalChange: {
    keywords: ['便便變色', '便便異味', '便便形狀改變', '屎變細', '屎粒變少', '屎臭'],
    synonyms: ['stool change', 'poop change', 'abnormal stool', 'smelly poop', 'foul-smelling', 'discolored stool', 'pellet size change', 'fecal consistency change'],
    info: '糞便的顏色、氣味或形狀改變可能因感染或飲食問題。'
  },
  eyeDull: {
    keywords: ['眼無神', '眼凹', '眼窩凹陷', '眼乾', '眼冇光', '眼珠暗淡'],
    synonyms: ['dull eyes', 'sunken eyes', 'dry eyes', 'glassy eyes', 'lusterless eyes', 'cloudy look', 'depressed eyes', 'hollow-eyed'],
    info: '眼睛凹陷或無神是脫水或嚴重疾病的常見徵兆。'
  },
  eyeDischarge: {
    keywords: ['流眼淚', '眼水', '淚水', '眼屎', '眼分泌', '眼濕', '黏眼', '眼睛黏住', '眼膠', '眼紅'],
    synonyms: ['eye discharge', 'watery eyes', 'goopy eyes', 'runny eyes', 'sticky eyes', 'eye gunk', 'purulent eye', 'weepy eyes', 'crusty eyes'],
    info: '眼睛分泌物過多可能係感染或鼻淚管阻塞。'
  },
  eyeRedness: {
    keywords: ['眼紅', '眼睛紅', '紅眼', '眼充血', '血絲', '眼部紅腫'],
    synonyms: ['red eyes', 'bloodshot eyes', 'pink eye', 'eye inflammation', 'conjunctivitis', 'hyperemia', 'ocular redness'],
    info: '眼部紅腫可能因過敏、感染或異物刺激引起。'
  },
  eyeSwelling: {
    keywords: ['眼腫', '眼皮腫', '眼睛腫', '眼凸', '眼球突出', '眼睛變大'],
    synonyms: ['swollen eye', 'bulging eye', 'eye swelling', 'protruding eye', 'periorbital edema', 'exophthalmos', 'swollen eyelid'],
    info: '眼部腫脹需立即檢查，可能係牙根問題或感染。'
  },
  eyeCloudy: {
    keywords: ['眼白', '朦眼', '眼朦', '白內障', '角膜潰瘍', '眼珠變白', '藍眼', '眼有白點'],
    synonyms: ['cloudy eye', 'white eye', 'cataract', 'corneal ulcer', 'blue eye', 'hazy eye', 'opacity', 'leukoma', 'blurred vision'],
    info: '白內障常見於老年倉鼠，但幼鼠出現需檢查糖尿病或營養問題。'
  },
  earDischarge: {
    keywords: ['耳水', '耳分泌物', '耳朵有嘢', '耳垢多', '耳臭', '耳膿'],
    synonyms: ['ear discharge', 'runny ear', 'smelly ear', 'ear infection', 'otorrhea', 'purulent ear', 'ear wax', 'foul-smelling ear'],
    info: '耳朵分泌物可能因中耳炎或耳道感染。'
  },
  drooling: {
    keywords: ['流口水', '口水', '濕下巴', '下巴濕', '甩牙', '牙齒過長', '牙太長', '食唔到嘢', '口水多', '頷濕'],
    synonyms: ['drooling', 'drool', 'wet chin', 'salivation', 'excessive salivation', 'ptyalism', 'slobbering', 'dribbling', 'sialorrhea'],
    info: '過度流口水可能因牙齒問題或口腔感染引起。'
  },
  teethOvergrowth: {
    keywords: ['牙長', '牙齒過長', '臼齒過長', '咬合不正', '門牙過長', '牙齒歪', '唔肯食硬糧', '牙太長'],
    synonyms: ['overgrown teeth', 'long teeth', 'malocclusion', 'overgrowth', 'tooth overgrowth', 'incisor overgrowth', 'molar overgrowth', 'dental issues'],
    info: '倉鼠牙齒會持續生長，需提供磨牙用品。過長需獸醫修剪。'
  },
  teethBroken: {
    keywords: ['甩牙', '斷牙', '崩牙', '冇牙', '牙齒斷裂'],
    synonyms: ['broken tooth', 'chipped tooth', 'missing tooth', 'fractured tooth', 'tooth fracture', 'dental fracture', 'tooth loss'],
    info: '牙齒斷裂可能因外傷，需檢查有無影響進食。'
  },
  urinaryProblems: {
    keywords: ['尿頻', '柯尿多', '尿少', '尿血', '血尿', '柯尿困難', '泌尿', '飲好多水', '口渴', '尿痛', '柯尿好耐'],
    synonyms: ['urinary problems', 'frequent urination', 'blood in urine', 'difficulty urinating', 'painful urination', 'dysuria', 'hematuria', 'polyuria', 'straining to urinate', 'bladder infection', 'UTI'],
    info: '泌尿問題可能因膀胱感染、結石或糖尿病引起。'
  },
  drinkingTooMuch: {
    keywords: ['飲好多水', '成日飲水', '飲水多', '口渴', '狂飲水', '不停飲水'],
    synonyms: ['drinking a lot', 'excessive thirst', 'polydipsia', 'too much water', 'hyperhydration', 'over-drinking'],
    info: '異常口渴可能係糖尿病、腎病或感染，需觀察尿量。'
  },
  urinaryDiscoloration: {
    keywords: ['尿變色', '啡尿', '紅尿', '尿有沉澱', '尿濁'],
    synonyms: ['discolored urine', 'brown urine', 'red urine', 'cloudy urine', 'sediment in urine', 'hematuria', 'urine discoloration'],
    info: '尿液顏色異常可能因膀胱感染、結石或出血。'
  },
  headTilt: {
    keywords: ['頭歪', '歪頭', '側頭', '平衡問題', '暈眩', '耳水不平衡', '打轉', '轉圈', '失平衡', '跌倒', '傾斜'],
    synonyms: ['head tilt', 'tilted head', 'balance problem', 'dizziness', 'vertigo', 'circling', 'vestibular syndrome', 'wry neck', 'torticollis', 'head turning'],
    info: '歪頭可能因中耳炎、腦部問題或創傷引起，需立即檢查。'
  },
  paralysis: {
    keywords: ['癱瘓', '後腿冇力', '行唔到', '跛', '腳冇力', '癱', '半身不遂', '行路姿勢怪', '拖住行', '後腳冇力'],
    synonyms: ['paralysis', 'paralyzed', 'hind leg weakness', 'cannot walk', 'limping', 'dragging legs', 'immobile', 'paresis', 'quadriplegia', 'paraplegia', 'leg paralysis'],
    info: '癱瘓可能因脊椎受傷、營養缺乏或中風引起，屬急症。'
  },
  circling: {
    keywords: ['轉圈', '兜圈', '打轉', '繞圈', '原地轉', '不停轉'],
    synonyms: ['circling', 'spinning', 'walking in circles', 'turning', 'pivoting', 'gyrating', 'rotating'],
    info: '不停轉圈可能因耳部感染或神經系統問題。'
  },
  lossOfBalance: {
    keywords: ['失平衡', '行唔穩', '跌', '搖晃', '站唔穩', '東歪西倒'],
    synonyms: ['loss of balance', 'unsteady', 'stumbling', 'falling', 'wobbly', 'ataxia', 'incoordination', 'staggering', 'loss of coordination'],
    info: '失去平衡可能因中耳炎或神經問題。'
  },
  seizures: {
    keywords: ['抽搐', '癲癇', '發羊吊', '全身抽', '四肢僵硬', '口吐白沫', '全身抖'],
    synonyms: ['seizure', 'seizures', 'convulsions', 'fit', 'epilepsy', 'spasm', 'paroxysm', 'ictus', 'tonic-clonic', 'muscle spasms'],
    info: '抽搐屬急症！可能因癲癇、中毒或代謝問題。'
  },
  lameness: {
    keywords: ['跛行', '跛腳', '行路拐', '腳痛', '縮腳', '唔肯行', '行路慢', '跳跳下'],
    synonyms: ['lameness', 'lame', 'limping', 'painful walking', 'unable to walk', 'claudication', 'favoring leg', 'walking with difficulty'],
    info: '跛行可能因拉傷、骨折或關節炎。'
  },
  boneFracture: {
    keywords: ['骨折', '斷骨', '腳斷', '手斷', '變形', '骨裂', '跌親'],
    synonyms: ['fracture', 'broken bone', 'fractured limb', 'swollen leg', 'bone break', 'traumatic injury'],
    info: '骨折需立即就醫，避免移動患處。'
  },
  jointSwelling: {
    keywords: ['關節腫', '關節脹', '腳腫', '手腫', '關節變大'],
    synonyms: ['joint swelling', 'swollen joint', 'inflamed joint', 'arthritis', 'osteoarthritis', 'synovitis', 'joint inflammation'],
    info: '關節腫脹可能因關節炎或感染。'
  },
  pregnant: {
    keywords: ['懷孕', '有咗', '大肚', '生bb', '分娩', '哺乳', '脹奶', '乳腺腫大', '有bb'],
    synonyms: ['pregnant', 'pregnancy', 'expecting', 'giving birth', 'nursing', 'milk production', 'gestation', 'prenatal', 'mammary swelling'],
    info: '懷孕期間需提供充足營養和安靜環境。'
  },
  dystocia: {
    keywords: ['難產', '生唔出', '生好耐', '分娩困難', 'bb生唔出'],
    synonyms: ['dystocia', 'difficult birth', 'prolonged labor', 'stuck baby', 'birth complications', 'obstructed labor'],
    info: '難產屬急症，需立即就醫！'
  },
  feelingCold: {
    keywords: ['凍', '寒冷', '好凍', '手腳凍', '耳仔凍', '凍親', '打冷震', '縮埋', '發冷', '體溫低'],
    synonyms: ['cold', 'feeling cold', 'chilly', 'low body temperature', 'freezing', 'hypothermia', 'cold to touch'],
    info: '倉鼠怕冷！最適溫度20-24°C。需即時保暖。'
  },
  feelingHot: {
    keywords: ['熱', '好熱', '中暑', '散熱', '攤開', '四腳朝天', '熱到', '曬', '陽光', '炎熱'],
    synonyms: ['hot', 'feeling hot', 'heatstroke', 'overheating', 'heat exhaustion', 'sun exposure', 'hyperthermia'],
    info: '倉鼠怕熱！超過28°C有中暑風險。需即時降溫。'
  },
  needsBedding: {
    keywords: ['墊材', '木屑', '紙墊', '棉花', '築巢', '巢材', '換墊材', '墊料', '紙巾'],
    synonyms: ['bedding', 'nesting material', 'substrate', 'wood shavings', 'carefresh', 'paper bedding', 'nesting fluff'],
    info: '提供適當墊材（8-10cm深）讓倉鼠築巢。避免棉絮（纏腳危險）。'
  },
  cageTooSmall: {
    keywords: ['籠細', '太逼', '唔夠大', '空間細', '籠太細', '迫', '細籠', '唔夠空間'],
    synonyms: ['cage too small', 'small cage', 'cramped', 'no space', 'enclosure too small', 'tiny cage', 'overcrowded'],
    info: '侏儒倉鼠需最小60x40cm籠，敘利亞倉鼠需80x50cm。'
  },
  needExercise: {
    keywords: ['跑輪', '運動', '跑步', '轉輪', '滾輪', '冇運動', '活動空間', '缺少運動', '要活動', '放風'],
    synonyms: ['exercise', 'running wheel', 'no exercise', 'lack of activity', 'wheel', 'need exercise', 'playtime', 'run on wheel'],
    info: '每天需至少30分鐘運動。跑輪直徑：侏儒≥16cm，敘利亞≥21cm。'
  }
};

// ============================================================
// VETERINARIAN DATABASE
// ============================================================
const VETS = [
  { name: '香港珍禽異獸醫療中心', district: '太子', address: '太子道西 123 號', phone: '2390 0000', rating: 4.8, emergency: true, note: '24小時急診｜珍禽異獸專科' },
  { name: '城市獸醫—珍禽異獸分科', district: '旺角', address: '旺角彌敦道 700 號', phone: '2398 0000', rating: 4.6, emergency: true, note: '24小時急診｜異獸專科' },
  { name: '寵物 24 小時醫療中心', district: '銅鑼灣', address: '銅鑼灣告士打道 255 號', phone: '2890 0000', rating: 4.5, emergency: true, note: '24小時急診｜全科' },
  { name: '大圍珍禽異獸及寵物醫院', district: '大圍', address: '大圍積信街 69 號', phone: '2687 0000', rating: 4.7, emergency: true, note: '24小時急診｜珍禽異獸專科' },
  { name: '太平道動物診所', district: '九龍城', address: '太平道 9 號', phone: '2760 0000', rating: 4.4, emergency: false, note: '需預約｜異獸專科' }
];

// ============================================================
// USER SESSIONS
// ============================================================
const userSessions = new Map();

function logReferral(sender, vet, assessment, symptoms) {
  const userPhone = sender.replace('whatsapp:', '');
  const referral = { userPhone, vetName: vet.name, vetPhone: vet.phone, urgency: assessment.urgency, symptoms: symptoms.join('、'), timestamp: new Date().toISOString() };
  console.log('📊 REFERRAL TRACKED:', JSON.stringify(referral, null, 2));
  if (userSessions.has(sender)) {
    const session = userSessions.get(sender);
    session.referralHistory = session.referralHistory || [];
    session.referralHistory.push(referral);
  }
  return referral;
}

// ============================================================
// ENHANCED PARSING WITH FUZZY MATCHING & SYNONYMS
// ============================================================
function parseSymptoms(text) {
  const found = [];
  const lowerText = text.toLowerCase();
  
  // 1. CHECK EXACT KEYWORDS & SYNONYMS
  for (const [symptom, data] of Object.entries(SYMPTOMS)) {
    // Check keywords (Cantonese + English)
    for (const kw of data.keywords) {
      if (text.includes(kw)) {
        if (!found.includes(symptom)) found.push(symptom);
        break;
      }
    }
    // Check synonyms (English only)
    if (!found.includes(symptom)) {
      for (const syn of data.synonyms || []) {
        // Exact match on synonyms
        if (lowerText.includes(syn.toLowerCase())) {
          if (!found.includes(symptom)) found.push(symptom);
          break;
        }
        // Partial match: "vomit" matches "vomiting"
        const words = lowerText.split(/\s+/);
        for (const word of words) {
          const synWords = syn.toLowerCase().split(/\s+/);
          for (const synWord of synWords) {
            if (synWord.length > 3 && word.includes(synWord) || synWord.includes(word)) {
              if (!found.includes(symptom)) found.push(symptom);
              break;
            }
          }
          if (found.includes(symptom)) break;
        }
        if (found.includes(symptom)) break;
      }
    }
  }
  
  // 2. CONTEXTUAL PHRASES (Emergency detection)
  const contextPhrases = {
    '急症': ['breathing', 'wetTail', 'shaking', 'paralysis', 'bleeding', 'headTilt', 'seizures', 'vomitingBlood'],
    'immediate vet': ['breathing', 'wetTail', 'shaking', 'paralysis', 'bleeding', 'headTilt', 'seizures', 'vomitingBlood'],
    'emergency': ['breathing', 'wetTail', 'shaking', 'paralysis', 'bleeding', 'headTilt', 'seizures', 'vomitingBlood'],
    'hospital': ['breathing', 'wetTail', 'shaking', 'paralysis', 'bleeding', 'headTilt', 'seizures', 'vomitingBlood'],
    '唔舒服': ['lethargy', 'lossOfAppetite'],
    '有病': ['lethargy', 'lossOfAppetite'],
    '擔心': ['lethargy'],
  };
  
  for (const [phrase, symptoms] of Object.entries(contextPhrases)) {
    if (lowerText.includes(phrase.toLowerCase())) {
      for (const sym of symptoms) {
        if (!found.includes(sym)) found.push(sym);
      }
    }
  }
  
  // 3. REMOVE DUPLICATES
  return [...new Set(found)];
}

// ============================================================
// ASSESSMENT FUNCTION
// ============================================================
function assessSymptoms(symptoms) {
  const s = new Set(symptoms);
  
  // EMERGENCY - Vomiting Blood
  if (s.has('vomitingBlood') || s.has('bleeding')) {
    return {
      level: '🚨',
      levelText: '⚠️ 緊急情況 — 立即就醫！',
      advice: '🩸 **吐血是嚴重危險信號！**\n\n🏥 請立即帶鼠鼠前往 24 小時珍禽異獸醫院！\n\n🆘 等待期間：\n• 保持鼠鼠溫暖安靜\n• 不要強迫餵食或飲水\n• 盡快就醫！',
      urgency: 'emergency'
    };
  }
  
  // EMERGENCY - Wet Tail
  if (s.has('wetTail')) {
    return {
      level: '🚨',
      levelText: '⚠️ 緊急情況 — 立即就醫！',
      advice: '🔴 **濕尾症可在 48 小時內致命！**\n\n🏥 請立即帶鼠鼠前往 24 小時珍禽異獸醫院！\n\n🆘 等待期間：\n• 保暖 (28-30°C)\n• 提供電解質水\n• 不要強迫餵食\n• 保持籠內清潔',
      urgency: 'emergency'
    };
  }
  
  // EMERGENCY - Breathing / Respiratory
  if (s.has('breathing') || s.has('wheezing') || s.has('blueSkin')) {
    return {
      level: '🚨',
      levelText: '⚠️ 呼吸急症 — 立即就醫！',
      advice: '🫁 **呼吸困難是危險信號！**\n\n🏥 請立即帶鼠鼠前往獸醫！\n\n💡 途中護理：\n• 保持溫暖通風\n• 避免驚嚇\n• 保持安靜\n• 不要平躺',
      urgency: 'emergency'
    };
  }
  
  // EMERGENCY - Neurological
  if (s.has('headTilt') || s.has('seizures') || s.has('paralysis') || s.has('circling')) {
    return {
      level: '🚨',
      levelText: '⚠️ 神經系統急症 — 立即就醫！',
      advice: '🧠 **歪頭、抽搐或癱瘓可能表示嚴重神經問題！**\n\n🏥 請立即帶鼠鼠前往獸醫檢查！\n\n🚑 途中護理：\n• 保持安靜\n• 避免過多刺激\n• 用毛巾包裹安撫',
      urgency: 'emergency'
    };
  }
  
  // EMERGENCY - Trauma
  if (s.has('abscess') || s.has('boneFracture') || s.has('dystocia')) {
    return {
      level: '🚨',
      levelText: '⚠️ 創傷急症 — 立即就醫！',
      advice: '🩸 **創傷需要立即處理！**\n\n🏥 請盡快帶鼠鼠前往獸醫！\n\n🆘 如大量出血，請用乾淨布按壓止血。',
      urgency: 'emergency'
    };
  }
  
  // URGENT - Diarrhea (without wet tail)
  if (s.has('diarrhea') && !s.has('wetTail')) {
    return {
      level: '🔴',
      levelText: '腹瀉 — 24 小時內就醫',
      advice: '💧 腹瀉可導致脫水，對倉鼠很危險！\n\n🏠 護理：\n• 補充足夠水分\n• 停餵新鮮蔬果\n• 保持籠內清潔\n• 觀察有無惡化',
      urgency: 'urgent'
    };
  }
  
  // URGENT - Loss of Appetite + Lethargy
  if (s.has('lossOfAppetite') && s.has('lethargy')) {
    return {
      level: '🔴',
      levelText: '食慾不振 + 沒精神 — 24 小時內就醫',
      advice: '🍽️ 倉鼠超過12小時不進食很危險！\n\n💡 嘗試提供：\n• 少量軟質食物（嬰兒食品）\n• 用針筒餵水\n• 保持溫暖\n\n🩺 請儘快就醫檢查！',
      urgency: 'urgent'
    };
  }
  
  // URGENT - Eye Problems
  if (s.has('eyeCloudy') || s.has('eyeSwelling') || s.has('eyeDischarge')) {
    return {
      level: '🔴',
      levelText: '眼部問題 — 24 小時內就醫',
      advice: '👁️ 眼部問題需盡快處理，避免惡化或失明。\n\n📋 護理建議：\n• 用生理鹽水清潔眼部\n• 避免摩擦\n• 觀察有無惡化',
      urgency: 'urgent'
    };
  }
  
  // URGENT - Urinary Problems
  if (s.has('urinaryProblems') || s.has('drinkingTooMuch') || s.has('urinaryDiscoloration')) {
    return {
      level: '🔴',
      levelText: '泌尿問題 — 24 小時內就醫',
      advice: '🩸 尿頻、尿血或異常口渴可能是感染或糖尿病！\n\n📋 護理建議：\n• 確保充足飲水\n• 停餵高蛋白食物\n• 觀察排尿情況',
      urgency: 'urgent'
    };
  }
  
  // HIGH RISK - Respiratory Infection
  if (s.has('sneeze') && s.has('runnyNose')) {
    return {
      level: '🟠',
      levelText: '呼吸道感染 — 建議 24-48 小時內就醫',
      advice: '🫁 呼吸道感染可快速惡化。\n\n🏠 家居護理：\n• 保持溫暖 (26-28°C)\n• 增加環境濕度\n• 避免強風\n• 確保充足水分',
      urgency: 'high'
    };
  }
  
  // HIGH RISK - Dental Problems
  if (s.has('teethOvergrowth') || s.has('drooling')) {
    return {
      level: '🟠',
      levelText: '牙齒或口腔問題 — 盡快就醫',
      advice: '🦷 牙齒問題會影響進食和健康。\n\n📋 護理建議：\n• 提供硬質食物磨牙\n• 檢查口腔有無異物\n• 避免餵食黏性食物',
      urgency: 'high'
    };
  }
  
  // HIGH RISK - Weight Loss
  if (s.has('weightLoss')) {
    return {
      level: '🟠',
      levelText: '體重下降 — 建議 48 小時內就醫',
      advice: '📉 體重下降可能暗示潛在疾病。\n\n📋 護理建議：\n• 每天記錄體重\n• 提供營養補充\n• 檢查糞便狀態',
      urgency: 'high'
    };
  }
  
  // HIGH RISK - Lumps / Skin Wounds
  if (s.has('lumps') || s.has('skinWounds') || s.has('scalySkin')) {
    return {
      level: '🟠',
      levelText: '皮膚腫塊/傷口 — 建議就醫檢查',
      advice: '🔍 腫塊或傷口需由獸醫檢查性質。\n\n📋 護理建議：\n• 保持清潔\n• 不要自行擠壓\n• 觀察有無增大',
      urgency: 'high'
    };
  }
  
  // MODERATE - Skin Issues
  if (s.has('scratching') && (s.has('hairLoss') || s.has('scalySkin'))) {
    return {
      level: '🟡',
      levelText: '皮膚問題 — 居家觀察 24-48 小時',
      advice: '🐛 可能係寄生蟲或真菌感染。\n\n📋 建議：\n• 更換乾淨墊材\n• 檢查有無寄生蟲\n• 避免潮濕環境\n\n如惡化或出現紅腫，請就醫。',
      urgency: 'medium'
    };
  }
  
  // MODERATE - Digestive Issues
  if (s.has('constipation') || s.has('bloating') || s.has('vomiting')) {
    return {
      level: '🟡',
      levelText: '消化問題 — 居家觀察 24 小時',
      advice: '💩 輕微消化不良可先觀察。\n\n📋 護理建議：\n• 增加飲水\n• 停餵乾糧，改餵濕糧\n• 提供少量南瓜泥\n\n如 24 小時無改善請就醫。',
      urgency: 'medium'
    };
  }
  
  // MODERATE - Lameness
  if (s.has('lameness') || s.has('jointSwelling')) {
    return {
      level: '🟡',
      levelText: '行動問題 — 注意觀察',
      advice: '🦵 行動異常可能因輕微扭傷或關節問題。\n\n📋 建議：\n• 檢查腳部有無異物\n• 減少跑輪使用\n• 觀察有無改善\n\n如持續或惡化請就醫。',
      urgency: 'medium'
    };
  }
  
  // MODERATE - Behavioral Issues
  if (s.has('irritability') || s.has('repetitiveBehavior')) {
    return {
      level: '🟡',
      levelText: '行為異常 — 注意觀察',
      advice: '🧠 行為改變可能因壓力或疼痛引起。\n\n📋 建議：\n• 檢查環境有無壓力源\n• 提供躲藏空間\n• 減少打擾\n\n如持續請諮詢獸醫。',
      urgency: 'medium'
    };
  }
  
  // ENVIRONMENTAL
  if (s.has('shivering') || s.has('feelingCold')) {
    return {
      level: '🧊',
      levelText: '鼠鼠覺得凍 — 立即保暖！',
      advice: '🥶 倉鼠怕冷！最適溫度為 20-24°C。\n\n🆘 保暖措施：\n• ✅ 提供紙巾碎或專用棉（⚠️ 避免用普通棉絮，纏腳危險！）\n• ✅ 放暖水袋（毛巾包好）在籠外\n• ✅ 增加墊材至 8-10cm\n• ✅ 將籠移到溫暖位置\n• ✅ 提供更多高熱量食物\n• ❌ 不要直接用暖爐對著籠！\n\n如果持續發抖或縮埋，請盡快就醫！',
      urgency: 'environmental'
    };
  }
  
  if (s.has('feelingHot')) {
    return {
      level: '🌡️',
      levelText: '鼠鼠覺得熱 — 立即降溫！',
      advice: '🥵 倉鼠怕熱！理想溫度為 20-24°C。\n\n🆘 降溫措施：\n• ✅ 放冰凍水樽（毛巾包好）在籠邊\n• ✅ 確保通風但不直吹\n• ✅ 提供陶瓷窩或石板\n• ✅ 更換新鮮飲水\n• ✅ 避免陽光直射\n\n⚠️ 中暑徵兆：流口水、躺平、呼吸急促 → 立即降溫及就醫！',
      urgency: 'environmental'
    };
  }
  
  if (s.has('needsBedding')) {
    return {
      level: '🛏️',
      levelText: '墊材建議',
      advice: '🏠 墊材選擇指南：\n\n✅ 安全墊材：\n• 無塵木屑（松木、白楊木）\n• 紙製墊材（Carefresh 等）\n• 廁紙碎（無香味）\n\n❌ 避免使用：\n• 雪松木（有毒）\n• 棉絮（纏腳危險！）\n• 有香味墊材（刺激呼吸道）\n• 報紙（油墨有毒）\n\n🛏️ 建議厚度：8-10cm',
      urgency: 'environmental'
    };
  }
  
  if (s.has('cageTooSmall')) {
    return {
      level: '📐',
      levelText: '籠子大小建議',
      advice: '📏 籠子大小標準：\n\n🐹 侏儒倉鼠：最少 60 x 40cm\n🐹 敘利亞倉鼠：最少 80 x 50cm\n\n💡 改善建議：\n• 用大型收納箱改裝（經濟實惠）\n• 提供多層空間和玩具\n• 每天額外放風時間\n\n🚫 籠太小會導致：\n• 壓力及焦慮\n• 咬籠、過度清潔\n• 肥胖及肌肉萎縮',
      urgency: 'environmental'
    };
  }
  
  if (s.has('needExercise')) {
    return {
      level: '🏃',
      levelText: '運動建議',
      advice: '🏃 運動對倉鼠非常重要！\n\n✅ 跑輪要求：\n• 侏儒倉鼠：直徑 ≥ 16cm\n• 敘利亞倉鼠：直徑 ≥ 21cm\n• ❌ 不可用鐵絲網（傷腳！）\n\n💡 其他活動：\n• 放風區（至少 1m²）\n• 隧道和玩具\n• 每天至少 30 分鐘活動時間',
      urgency: 'environmental'
    };
  }
  
  // LOW RISK (Default)
  return {
    level: '🟢',
    levelText: '低風險 — 繼續觀察',
    advice: '✅ 鼠鼠目前冇明顯異常。\n\n📋 保持健康建議：\n• 每天檢查行為變化\n• 保持籠內清潔\n• 提供均衡飲食\n• 定期更換墊材\n• 每週記錄體重\n\n如有任何變化，可再次查詢！',
    urgency: 'low'
  };
}

// ============================================================
// REPLY GENERATOR
// ============================================================
function generateReply(assessment, symptoms) {
  let reply = `🐹 **Pawckets 症狀分析**\n\n`;
  reply += `${assessment.level} ${assessment.levelText}\n\n`;
  
  if (symptoms.length > 0) {
    reply += `📋 偵測到症狀：${symptoms.join('、')}\n\n`;
  } else {
    reply += `📋 暫未偵測到明顯症狀\n\n`;
  }
  
  reply += `${assessment.advice}\n\n`;
  
  if (['emergency', 'urgent', 'high'].includes(assessment.urgency)) {
    reply += `📍 **推薦獸醫**\n`;
    const vetsToShow = assessment.urgency === 'emergency' 
      ? VETS.filter(v => v.emergency).slice(0, 3)
      : VETS.slice(0, 3);
    
    vetsToShow.forEach((v, i) => {
      reply += `${i+1}. ${v.name}\n`;
      reply += `   📍 ${v.district} | ⭐${v.rating}\n`;
      reply += `   📞 ${v.phone}\n`;
      if (v.note) reply += `   📌 ${v.note}\n`;
      reply += `\n`;
    });
  }
  
  reply += `---\n`;
  reply += `⚠️ **免責聲明**：此為網上公開資訊整理摘要，並非醫療建議。如有疑慮，請諮詢獸醫。\n`;
  reply += `🔄 如需重新評估，請重新描述症狀。`;
  
  return reply;
}

// ============================================================
// WEBHOOK
// ============================================================
app.post('/webhook', (req, res) => {
  const incomingMsg = req.body.Body || '';
  const sender = req.body.From;
  const mediaUrl = req.body.MediaUrl0;
  
  console.log(`📩 來自 ${sender}: ${incomingMsg}`);
  
  if (!userSessions.has(sender)) {
    userSessions.set(sender, {
      symptomSet: new Set(),
      referralHistory: [],
      firstContact: new Date()
    });
  }
  
  if (mediaUrl) {
    const reply = `🐹 收到你嘅圖片！\n\n📸 目前 Pawckets 只支援文字分析。請用文字詳細描述鼠鼠嘅症狀。\n\n例如：打噴嚏、流鼻水、肚柯、冇精神等。\n\n${CONVERSATION_DISCLAIMER}`;
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(reply);
    return res.type('text/xml').send(twiml.toString());
  }
  
  const symptoms = parseSymptoms(incomingMsg);
  const assessment = assessSymptoms(symptoms);
  const reply = generateReply(assessment, symptoms);
  
  if (['emergency', 'urgent', 'high'].includes(assessment.urgency)) {
    const vetsToShow = assessment.urgency === 'emergency' 
      ? VETS.filter(v => v.emergency).slice(0, 1)
      : VETS.slice(0, 1);
    if (vetsToShow.length > 0) {
      logReferral(sender, vetsToShow[0], assessment, symptoms);
    }
  }
  
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);
  res.type('text/xml').send(twiml.toString());
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🐹 Pawckets 運行中：${PORT}`));
