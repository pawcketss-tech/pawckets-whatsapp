const express = require('express');
const twilio = require('twilio');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====== COMPLETE SYMPTOM DATABASE ======
const SYMPTOMS = {
  diarrhea: {
    keywords: ['肚柯', '柯水', '腹瀉', '肚瀉', '爛便', '水便', '痾水', '肚痾', '屙', '柯爛', '爛屎', '濕便', '軟便', '綠色便', '黃色便'],
    aliases: ['肚痾', '屙爛'],
    info: '腹瀉可由飲食改變、細菌感染或寄生蟲引起。'
  },
  wetTail: {
    keywords: ['濕尾', '屁股濕', '肛門濕', '尾巴濕', 'pat濕', '尾部濕', '肛門紅腫', '屁股紅'],
    aliases: ['尾濕'],
    info: '濕尾症是嚴重腸道感染，可由壓力、飲食不當或細菌引起。'
  },
  constipation: {
    keywords: ['便秘', '屙唔出', '冇便便', '便便好少', '肚脹', '腹脹', '排便困難', '一粒粒便', '硬便'],
    aliases: ['便秘', '屙唔出'],
    info: '便秘可能因缺水、飲食纖維不足或腸道阻塞引起。'
  },
  poopingTooMuch: {
    keywords: ['柯好多', '便便多', '多便', '柯得多', '排泄多', '便便頻密', '成日柯'],
    aliases: ['多便'],
    info: '倉鼠正常的糞便量會因飲食量而改變，突然增多可能與食物攝取增加或消化不良有關。如糞便形狀正常則無需擔心。',
    habitual: true
  },
  sneeze: {
    keywords: ['打噴嚏', '噴嚏', '打乞嗤', '乞嗤', '噴嚏', '打噴', '鼻敏感'],
    aliases: ['噴'],
    info: '噴嚏可能因灰塵、墊材過敏或呼吸道感染引起。'
  },
  runnyNose: {
    keywords: ['流鼻水', '鼻水', '鼻涕', '流鼻', '鼻塞', '鼻子濕', '鼻水倒流', '呼吸有鼻聲'],
    aliases: ['鼻水', '鼻塞'],
    info: '流鼻水常見於感冒、過敏或感染，需觀察是否惡化。'
  },
  breathing: {
    keywords: ['呼吸有聲', '喘氣', '呼吸困難', '喘', '氣喘', '唞氣', '索索聲', '呼吸聲', '開口呼吸', '腹部呼吸', '急速呼吸'],
    aliases: ['喘', '唞'],
    info: '呼吸困難屬急症！可能由肺炎、過敏或心臟問題引起。'
  },
  scratching: {
    keywords: ['抓癢', '痕癢', '不停抓', 'R痕', '搔癢', '抓', '癢', '痕', '咬毛', '咬自己'],
    aliases: ['痕', '癢'],
    info: '經常抓癢可能因寄生蟲、皮膚乾燥或過敏引起。'
  },
  hairLoss: {
    keywords: ['脫毛', '甩毛', '禿毛', '冇毛', '甩髮', '斑禿', '掉毛', '毛變稀疏', '光禿'],
    aliases: ['甩毛', '禿'],
    info: '脫毛可由壓力、營養不良、寄生蟲或荷爾蒙問題引起。'
  },
  mites: {
    keywords: ['寄生蟲', '蟲', '蜱', '蝨', '皮膚紅點', '皮屑', '白色皮屑', '乾燥皮膚', '頭皮屑'],
    aliases: ['蟲', '皮屑'],
    info: '寄生蟲感染需用獸醫處方藥物治療，切勿自行用藥。'
  },
  skinRedness: {
    keywords: ['皮膚紅', '紅腫', '發炎', '皮膚炎', '濕疹', '紅疹', '皮膚潰瘍', '爛皮膚'],
    aliases: ['紅腫', '發炎'],
    info: '皮膚紅腫可能因感染、過敏或傷口發炎引起。'
  },
  abscess: {
    keywords: ['膿瘡', '腫塊', '硬塊', '瘤', '囊腫', '化膿', '傷口流膿', '膿包', '臉頰腫'],
    aliases: ['膿包', '腫塊'],
    info: '膿瘡需由獸醫切開引流，勿自行擠壓。'
  },
  eyeRedness: {
    keywords: ['眼紅', '眼睛紅', '紅眼', '眼充血', '血絲', '眼部紅腫'],
    aliases: ['紅眼'],
    info: '眼部紅腫可能因過敏、感染或異物刺激引起。'
  },
  eyeDischarge: {
    keywords: ['流眼淚', '眼水', '淚水', '眼屎', '眼分泌', '眼濕', '黏眼', '眼睛黏住'],
    aliases: ['淚水'],
    info: '眼睛分泌物過多可能係感染或鼻淚管阻塞。'
  },
  eyeSwelling: {
    keywords: ['眼腫', '眼皮腫', '眼睛腫', '眼凸', '眼球突出', '眼睛變大'],
    aliases: ['腫眼'],
    info: '眼部腫脹需立即檢查，可能係牙根問題或感染。'
  },
  eyeCloudy: {
    keywords: ['眼白', '朦眼', '眼朦', '白內障', '角膜潰瘍', '眼珠變白', '藍眼'],
    aliases: ['朦'],
    info: '白內障常見於老年倉鼠，但幼鼠出現需檢查糖尿病或營養問題。'
  },
  drooling: {
    keywords: ['流口水', '口水', '濕下巴', '下巴濕', '甩牙', '牙齒過長', '牙太長', '食唔到嘢', '口水多'],
    aliases: ['口水'],
    info: '過度流口水可能因牙齒問題或口腔感染引起。'
  },
  teethOvergrowth: {
    keywords: ['牙長', '牙齒過長', '臼齒過長', '咬合不正', '門牙過長', '牙齒歪', '唔肯食硬糧'],
    aliases: ['牙長'],
    info: '倉鼠牙齒會持續生長，需提供磨牙用品。過長需獸醫修剪。'
  },
  cheekPouchIssues: {
    keywords: ['頰囊', '面腫', '倉囊', '頰囊發炎', '頰囊積食', '臉頰鼓', '囊腫', '食物塞住', '頰囊腫脹'],
    aliases: ['面腫', '頰囊'],
    info: '頰囊食物積累或發炎常見，需獸醫清理。'
  },
  urinaryProblems: {
    keywords: ['尿頻', '柯尿多', '尿少', '尿血', '血尿', '柯尿困難', '泌尿', '飲好多水', '口渴'],
    aliases: ['尿血', '柯尿'],
    info: '泌尿問題可能因膀胱感染、結石或糖尿病引起。'
  },
  drinkingTooMuch: {
    keywords: ['飲好多水', '成日飲水', '飲水多', '口渴', '狂飲水'],
    aliases: ['飲多', '口渴'],
    info: '異常口渴可能係糖尿病、腎病或感染，需觀察尿量。',
    habitual: true
  },
  lethargy: {
    keywords: ['冇精神', '呆滯', '唔郁', '冇力', '倦怠', '唔活躍', '成日瞓', '冇活力', '垂頭喪氣', '軟弱', '疲勞', '無力'],
    aliases: ['冇力', '呆'],
    info: '精神差可能由多種疾病引起，需觀察其他症狀。'
  },
  noAppetite: {
    keywords: ['唔食', '唔肯食', '食慾下降', '食量減少', '冇胃口', '唔願食', '食少', '厭食', '唔食嘢', '食慾不振', '瘦', '體重下降'],
    aliases: ['厭食', '冇胃口'],
    info: '倉鼠超過12小時不進食屬危險信號，需立即處理。'
  },
  weightLoss: {
    keywords: ['瘦咗', '體重下降', '輕咗', '變瘦', '冇肉', '見骨', '消瘦', '營養不良'],
    aliases: ['瘦咗'],
    info: '體重持續下降可能因慢性疾病、寄生蟲或牙齒問題。'
  },
  shaking: {
    keywords: ['震', '抖', '痙攣', '抽搐', '發抖', '顫抖', '震顫', '癲癇', '抽筋'],
    aliases: ['震', '抖'],
    info: '顫抖可能因寒冷、低血糖、緊張或神經系統疾病引起。'
  },
  headTilt: {
    keywords: ['頭歪', '歪頭', '側頭', '平衡問題', '暈眩', '耳水不平衡', '打轉', '轉圈', '失平衡', '跌倒'],
    aliases: ['歪頭', '側頭'],
    info: '歪頭可能因中耳炎、腦部問題或創傷引起，需立即檢查。'
  },
  paralysis: {
    keywords: ['癱瘓', '後腿冇力', '行唔到', '跛', '腳冇力', '癱', '半身不遂', '行路姿勢怪', '拖住行'],
    aliases: ['癱', '行唔到'],
    info: '癱瘓可能因脊椎受傷、營養缺乏或中風引起，屬急症。'
  },
  normalSleeping: {
    keywords: ['成日瞓', '成日訓', '瞓好多', '訓好多', '懶瞓', '睡眠多'],
    aliases: ['瞓多'],
    info: '倉鼠是夜行動物，日間睡眠屬正常。如夜間也持續昏睡則需留意。',
    habitual: true
  },
  burrowing: {
    keywords: ['掘', '挖', '鑽', '掘洞', '挖窿', '掘地', '藏食物', '藏糧'],
    aliases: ['掘', '挖'],
    info: '掘洞是倉鼠的天性，用於藏食和築巢。提供足夠墊材（建議8-10cm深）讓牠們發揮天性。',
    habitual: true
  },
  hoardingFood: {
    keywords: ['儲糧', '藏食物', '收埋', '匿藏', '儲存食物', '藏糧', '搬食物'],
    aliases: ['儲糧', '藏食'],
    info: '儲藏食物是倉鼠的自然本能。只需定期檢查儲糧有無變壞，無需制止。',
    habitual: true
  },
  grooming: {
    keywords: ['清潔', '舔毛', '整理毛', '梳洗', '舔自己', '清潔身體', '洗手'],
    aliases: ['清潔', '舔毛'],
    info: '倉鼠會花大量時間清潔自己，這是正常行為。如過度清潔導致脫毛則可能有壓力或皮膚問題。',
    habitual: true
  },
  feelingCold: {
    keywords: ['凍', '寒冷', '好凍', '手腳凍', '耳仔凍', '凍親', '打冷震', '縮埋', '發冷'],
    aliases: ['凍', '寒冷'],
    info: '🐹 倉鼠怕冷！最適溫度為20-24°C。\n\n🆘 保暖措施：\n• 提供棉花或紙巾碎讓牠們築巢（⚠️ 避免用棉絮，纏腳危險！）\n• 放置暖水袋（用毛巾包好）在籠外\n• 增加墊材厚度（至少8cm）\n• 將籠移到溫暖位置（但避免太陽直射）\n• 提供更多高熱量食物（如葵花籽）\n\n❌ 不要直接用暖爐對著籠！',
    urgency: 'environmental'
  },
  feelingHot: {
    keywords: ['熱', '好熱', '中暑', '散熱', '攤開', '四腳朝天', '熱到', '曬', '陽光'],
    aliases: ['熱', '中暑'],
    info: '🥵 倉鼠怕熱！理想溫度為20-24°C，超過28°C有中暑風險。\n\n🆘 降溫措施：\n• 放冰凍水樽（用毛巾包好）在籠邊\n• 確保通風（但不直吹）\n• 提供陶瓷窩或石板降溫\n• 更換新鮮飲水\n• 避免陽光直射\n\n⚠️ 中暑徵兆：流口水、躺平、呼吸急促 → 需立即降溫及就醫！',
    urgency: 'environmental'
  },
  needsBedding: {
    keywords: ['墊材', '木屑', '紙墊', '棉花', '築巢', '巢材', '換墊材', '墊料', '紙巾'],
    aliases: ['墊材', '築巢'],
    info: '🏠 墊材選擇指南：\n\n✅ 安全墊材：\n• 無塵木屑（松木、白楊木）\n• 紙製墊材（Carefresh等）\n• 廁紙碎（無香味）\n\n❌ 避免使用：\n• 雪松木（有毒）\n• 棉絮（纏腳危險！）\n• 有香味墊材（刺激呼吸道）\n• 報紙（油墨有毒）\n\n🛏️ 建議厚度：8-10cm，讓倉鼠可以掘洞！',
    urgency: 'environmental'
  },
  cageTooSmall: {
    keywords: ['籠細', '太逼', '唔夠大', '空間細', '籠太細', '迫', '細籠'],
    aliases: ['太細'],
    info: '📏 籠子大小標準：\n\n🐹 侏儒倉鼠：最少 60 x 40cm\n🐹 敘利亞倉鼠：最少 80 x 50cm\n\n⚠️ 籠太小會導致壓力、咬籠、過度清潔等行為問題。\n\n💡 建議用大型收納箱改裝，既經濟又寬敞！',
    urgency: 'environmental'
  },
  needExercise: {
    keywords: ['跑輪', '運動', '跑步', '轉輪', '滾輪', '冇運動', '活動空間', '缺少運動', '要活動'],
    aliases: ['運動', '跑輪'],
    info: '🏃 運動對倉鼠非常重要！\n\n✅ 跑輪要求：\n• 侏儒倉鼠：最小直徑 16cm\n• 敘利亞倉鼠：最小直徑 21cm\n• 不可用鐵絲網（傷腳！）\n\n💡 建議使用：\n• 靜音跑輪\n• 飛碟式跑輪\n• 也可提供散佈空間（如大型圍欄）\n\n🚫 籠太小會導致壓力、咬籠、過度清潔等行為問題。',
    urgency: 'environmental'
  }
};

// ====== VETERINARIAN DATABASE ======
const VETS = [
  { 
    name: '香港珍禽異獸醫療中心', 
    district: '太子', 
    address: '太子道西 123 號', 
    phone: '2390 0000', 
    rating: 4.8, 
    emergency: true,
    note: '24小時急診｜珍禽異獸專科'
  },
  { 
    name: '城市獸醫—珍禽異獸分科', 
    district: '旺角', 
    address: '旺角彌敦道 700 號', 
    phone: '2398 0000', 
    rating: 4.6, 
    emergency: true,
    note: '24小時急診｜異獸專科'
  },
  { 
    name: '寵物 24 小時醫療中心', 
    district: '銅鑼灣', 
    address: '銅鑼灣告士打道 255 號', 
    phone: '2890 0000', 
    rating: 4.5, 
    emergency: true,
    note: '24小時急診｜全科'
  },
  { 
    name: '大圍珍禽異獸及寵物醫院', 
    district: '大圍', 
    address: '大圍積信街 69 號', 
    phone: '2687 0000', 
    rating: 4.7, 
    emergency: true,
    note: '24小時急診｜珍禽異獸專科'
  },
  { 
    name: '太平道動物診所', 
    district: '九龍城', 
    address: '太平道 9 號', 
    phone: '2760 0000', 
    rating: 4.4, 
    emergency: false,
    note: '需預約｜異獸專科'
  }
];

// ====== PARSING FUNCTION ======
function parseSymptoms(text) {
  const found = [];
  const lowerText = text.toLowerCase();
  
  for (const [symptom, data] of Object.entries(SYMPTOMS)) {
    for (const kw of data.keywords) {
      if (text.includes(kw)) {
        if (!found.includes(symptom)) found.push(symptom);
        break;
      }
    }
  }
  
  if (found.length === 0) {
    for (const [symptom, data] of Object.entries(SYMPTOMS)) {
      for (const alias of data.aliases || []) {
        if (text.includes(alias) || lowerText.includes(alias.toLowerCase())) {
          if (!found.includes(symptom)) found.push(symptom);
          break;
        }
      }
    }
  }
  
  const contextPhrases = {
    '唔舒服': ['lethargy', 'noAppetite', 'stress'],
    '有病': ['lethargy', 'noAppetite'],
    '唔正常': ['lethargy'],
    '擔心': ['stress'],
    '急症': ['breathing', 'bleeding', 'headTilt']
  };
  
  for (const [phrase, symptoms] of Object.entries(contextPhrases)) {
    if (text.includes(phrase)) {
      for (const sym of symptoms) {
        if (!found.includes(sym)) found.push(sym);
      }
    }
  }
  
  return [...new Set(found)];
}

// ====== ASSESSMENT FUNCTION ======
function assessSymptoms(symptoms) {
  const s = new Set(symptoms);
  
  const envSymptoms = ['feelingCold', 'feelingHot', 'needsBedding', 'cageTooSmall', 'needExercise'];
  const hasEnv = envSymptoms.some(sym => s.has(sym));
  
  if (hasEnv && s.size === 1) {
    const symptom = [...s][0];
    const data = SYMPTOMS[symptom];
    return {
      level: '🏠',
      levelText: '環境建議',
      advice: data.info,
      urgency: 'environmental'
    };
  }
  
  if (s.has('diarrhea') && s.has('wetTail')) {
    return {
      level: '🚨',
      levelText: '⚠️ 緊急情況 — 立即就醫！',
      advice: '濕尾症可在 48 小時內致命！\n\n🏥 請立即帶鼠鼠前往 24 小時珍禽異獸醫院！\n\n🆘 等待期間：\n• 保暖 (28-30°C)\n• 提供電解質水\n• 不要強迫餵食',
      urgency: 'emergency'
    };
  }
  
  if (s.has('breathing') && (s.has('sneeze') || s.has('runnyNose'))) {
    return {
      level: '🚨',
      levelText: '⚠️ 呼吸道急症 — 立即就醫！',
      advice: '呼吸困難是危險信號！\n\n🫁 請立即帶鼠鼠前往獸醫！\n\n💡 途中護理：\n• 保持溫暖通風\n• 避免驚嚇\n• 保持安靜',
      urgency: 'emergency'
    };
  }
  
  if (s.has('headTilt') || s.has('shaking') || s.has('paralysis')) {
    return {
      level: '🚨',
      levelText: '⚠️ 神經系統急症 — 立即就醫！',
      advice: '歪頭、震顫或癱瘓可能表示嚴重腦部或耳部問題！\n\n🧠 請立即帶鼠鼠前往獸醫檢查！',
      urgency: 'emergency'
    };
  }
  
  if (s.has('bleeding') || s.has('abscess')) {
    return {
      level: '🚨',
      levelText: '⚠️ 出血或感染 — 立即就醫！',
      advice: '傷口出血或膿瘡需要立即處理！\n\n🏥 請盡快帶鼠鼠前往獸醫！\n\n🆘 如大量出血，請先按壓止血。',
      urgency: 'emergency'
    };
  }
  
  if (s.has('eyeCloudy') || s.has('eyeSwelling')) {
    return {
      level: '🔴',
      levelText: '眼部問題 — 24 小時內就醫',
      advice: '白內障、角膜潰瘍或眼部腫脹需要緊急處理。\n\n👁️ 請在 24 小時內帶鼠鼠檢查。\n\n💡 保持眼部清潔，避免摩擦。',
      urgency: 'urgent'
    };
  }
  
  if (s.has('diarrhea') && !s.has('wetTail')) {
    return {
      level: '🔴',
      levelText: '腹瀉 — 24 小時內就醫',
      advice: '腹瀉可導致脫水，對倉鼠很危險！\n\n💧 請儘快就醫。\n\n🏠 護理：\n• 補充足夠水分\n• 停餵新鮮蔬果\n• 保持籠內清潔',
      urgency: 'urgent'
    };
  }
  
  if (s.has('noAppetite') && s.has('lethargy')) {
    return {
      level: '🔴',
      levelText: '食慾不振 + 沒精神 — 24 小時內就醫',
      advice: '倉鼠不吃東西超過 12 小時很危險！\n\n🩺 請儘快帶鼠鼠檢查。\n\n💡 嘗試提供：\n• 少量軟質食物\n• 稀釋的嬰兒食品\n• 用針筒餵水',
      urgency: 'urgent'
    };
  }
  
  if (s.has('sneeze') && s.has('runnyNose')) {
    return {
      level: '🟠',
      levelText: '呼吸道感染 — 建議 24-48 小時內就醫',
      advice: '🫁 呼吸道感染可快速惡化。\n\n📋 家居護理：\n• 保持溫暖 (26-28°C)\n• 增加環境濕度\n• 避免強風直接吹\n• 確保充足水分\n\n⚠️ 如出現喘氣或開口呼吸，請立即就醫！',
      urgency: 'high'
    };
  }
  
  if (s.has('urinaryProblems') || s.has('drinkingTooMuch')) {
    return {
      level: '🟠',
      levelText: '泌尿問題 — 建議 24-48 小時內就醫',
      advice: '🩸 尿頻、尿血或異常口渴可能是膀胱感染或糖尿病！\n\n📋 護理建議：\n• 確保充足飲水\n• 停餵高蛋白食物\n• 觀察排尿情況',
      urgency: 'high'
    };
  }
  
  if (s.has('teethOvergrowth') || s.has('cheekPouchIssues')) {
    return {
      level: '🟠',
      levelText: '牙齒或頰囊問題 — 儘快就醫',
      advice: '🦷 牙齒過長或頰囊發炎需要獸醫處理。\n\n📋 護理建議：\n• 提供硬質食物磨牙\n• 檢查頰囊有無異物\n• 避免餵食黏性食物',
      urgency: 'high'
    };
  }
  
  if (s.has('weightLoss')) {
    return {
      level: '🟠',
      levelText: '體重下降 — 建議 48 小時內就醫',
      advice: '📉 體重下降可能暗示多種潛在疾病。\n\n📋 護理建議：\n• 每天記錄體重\n• 提供營養補充\n• 檢查糞便狀態',
      urgency: 'high'
    };
  }
  
  if (s.has('scratching') && (s.has('hairLoss') || s.has('mites'))) {
    return {
      level: '🟡',
      levelText: '皮膚問題 — 居家觀察 24-48 小時',
      advice: '🐛 可能係皮膚感染或寄生蟲。\n\n📋 建議：\n• 更換乾淨墊材\n• 檢查有無寄生蟲\n• 避免潮濕環境\n\n如惡化或出現紅腫，請就醫。',
      urgency: 'medium'
    };
  }
  
  if (s.has('eyeRedness') || s.has('eyeDischarge')) {
    return {
      level: '🟡',
      levelText: '眼部輕微不適 — 居家觀察',
      advice: '👁️ 輕微紅眼或分泌物可能係過敏或輕微感染。\n\n📋 護理建議：\n• 用生理鹽水清潔眼部\n• 檢查墊材有無刺激物\n• 觀察有無惡化',
      urgency: 'medium'
    };
  }
  
  if (s.has('constipation')) {
    return {
      level: '🟡',
      levelText: '便秘 — 居家觀察',
      advice: '💩 輕微便秘可先觀察。\n\n📋 護理建議：\n• 增加飲水\n• 停餵乾糧，改餵濕糧\n• 提供南瓜泥或橄欖油（少量）\n\n如 48 小時無改善請就醫。',
      urgency: 'medium'
    };
  }
  
  if (s.has('drooling')) {
    return {
      level: '🟡',
      levelText: '流口水 — 注意觀察',
      advice: '💧 流口水可能係牙齒問題或口腔感染。\n\n📋 建議：\n• 檢查口腔有無異物\n• 檢查牙齒長度\n• 避免餵食硬物\n\n如持續或食慾下降請就醫。',
      urgency: 'medium'
    };
  }
  
  if (s.has('normalSleeping')) {
    return {
      level: '💤',
      levelText: '正常睡眠行為',
      advice: '✅ 倉鼠是夜行動物，日間睡眠屬正常。\n\n📋 倉鼠睡眠習慣：\n• 每天睡眠 12-14 小時\n• 活躍時間為黃昏至清晨\n• 如夜間也持續昏睡則需留意\n\n💡 保持規律作息，避免日間打擾。',
      urgency: 'habitual'
    };
  }
  
  if (s.has('burrowing')) {
    return {
      level: '🏗️',
      levelText: '正常掘洞行為',
      advice: '✅ 掘洞是倉鼠的天性！\n\n🏠 築巢建議：\n• 提供 8-10cm 厚墊材\n• 混合不同材質（木屑、紙墊、乾草）\n• 提供紙巾碎或廁紙卷\n\n🎯 掘洞幫助倉鼠：\n• 藏食物\n• 築溫暖巢穴\n• 減輕壓力\n• 保持自然本能',
      urgency: 'habitual'
    };
  }
  
  if (s.has('hoardingFood')) {
    return {
      level: '🍽️',
      levelText: '正常儲糧行為',
      advice: '✅ 儲藏食物是倉鼠的自然本能！\n\n📋 管理建議：\n• 提供足夠食物讓牠們儲藏\n• 每週檢查儲糧有無變壞\n• 不要完全清空儲糧點\n\n⚠️ 只移除發霉或變壞的食物。',
      urgency: 'habitual'
    };
  }
  
  if (s.has('grooming')) {
    return {
      level: '🧹',
      levelText: '正常清潔行為',
      advice: '✅ 清潔自己是倉鼠的正常行為！\n\n📋 正常清潔：\n• 每天花數小時舔毛\n• 梳理全身毛髮\n• 清潔面部和手部\n\n⚠️ 警惕過度清潔：\n• 導致局部脫毛\n• 皮膚紅腫\n• 可能係壓力或皮膚問題',
      urgency: 'habitual'
    };
  }
  
  if (s.has('poopingTooMuch')) {
    return {
      level: '💩',
      levelText: '正常排便行為（糞便量多）',
      advice: '✅ 糞便量多通常屬正常！\n\n📋 判斷正常與否：\n• 正常：形狀完整、堅硬、乾燥\n• 異常：水狀、綠色、黏液狀\n\n📊 影響糞便量因素：\n• 食量（食得多柯得多）\n• 食物種類（高纖維多便）\n• 飲水量（影響軟硬度）\n\n⚠️ 如形狀或顏色異常，請拍照記錄並諮詢獸醫。',
      urgency: 'habitual'
    };
  }
  
  if (s.has('feelingCold')) {
    return {
      level: '🧊',
      levelText: '鼠鼠覺得凍 — 立即保暖！',
      advice: '🥶 倉鼠怕冷！最適溫度為 20-24°C。\n\n🆘 保暖措施：\n• ✅ 提供棉花或紙巾碎（⚠️ 避免用棉絮，纏腳危險！）\n• ✅ 放暖水袋（毛巾包好）在籠外\n• ✅ 增加墊材至 8-10cm\n• ✅ 將籠移到溫暖位置\n• ✅ 提供更多高熱量食物\n• ❌ 不要直接用暖爐對著籠！\n\n如果持續發抖或縮埋，請盡快就醫！',
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
      advice: '🏃 運動對倉鼠非常重要！\n\n✅ 跑輪要求：\n• 侏儒倉鼠：直徑 ≥ 16cm\n• 敘利亞倉鼠：直徑 ≥ 21cm\n• ❌ 不可用鐵絲網（傷腳！）\n\n💡 其他活動：\n• 放風區（至少 1m²）\n• 隧道和玩具\n• 每天至少 30 分鐘活動時間\n\n💡 靜音跑輪推薦：Wodent Wheel, Silent Runner',
      urgency: 'environmental'
    };
  }
  
  return {
    level: '🟢',
    levelText: '低風險 — 繼續觀察',
    advice: '✅ 鼠鼠目前冇明顯異常。\n\n📋 保持健康建議：\n• 每天檢查行為變化\n• 保持籠內清潔\n• 提供均衡飲食\n• 定期更換墊材\n• 每週記錄體重\n\n如有任何變化，可再次查詢！',
    urgency: 'low'
  };
}

// ====== REPLY GENERATOR ======
function generateReply(assessment, symptoms) {
   let reply = `🐹 **Pawckets 症狀分析**\n\n`;
  reply += `${assessment.level} ${assessment.levelText}\n\n`;
  
  if (symptoms.length > 0) {
    reply += `📋 偵測到症狀：${symptoms.join('、')}\n\n`;
  } else {
    reply += `📋 暫未偵測到明顯症狀\n\n`;
  }
  
  reply += `${assessment.advice}\n\n`;
  
  // Show vets for emergency, urgent, or high risk
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
  reply += `⚠️ AI 建議僅供參考，最終診斷以獸醫為準。\n`;
  reply += `🔄 如需重新評估，請重新描述症狀。`;
  
  return reply;
}

// ====== WEBHOOK ======
app.post('/webhook', (req, res) => {
  const incomingMsg = req.body.Body || '';
  const sender = req.body.From;
  const mediaUrl = req.body.MediaUrl0;
  
  console.log(`📩 來自 ${sender}: ${incomingMsg}`);
  
  if (mediaUrl) {
    const reply = `🐹 收到你嘅圖片！\n\n目前 Pawckets 只支援文字分析。請用文字詳細描述鼠鼠嘅症狀。\n\n例如：打噴嚏、流鼻水、肚柯、冇精神等。`;
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(reply);
    return res.type('text/xml').send(twiml.toString());
  }
  
  const symptoms = parseSymptoms(incomingMsg);
  const assessment = assessSymptoms(symptoms);
  const reply = generateReply(assessment, symptoms);
  
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);
  res.type('text/xml').send(twiml.toString());
});

// ====== HEALTH CHECK ======
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// ====== START SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🐹 Pawckets 運行中：${PORT}`));
