const express = require('express');
const twilio = require('twilio');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SYMPTOMS = {
  diarrhea: ['肚柯', '柯水', '腹瀉', '肚瀉', '爛便', '水便'],
  wetTail: ['濕尾', '屁股濕', '肛門濕'],
  sneeze: ['打噴嚏', '噴嚏', '打乞嗤'],
  runnyNose: ['流鼻水', '鼻水', '鼻涕'],
  breathing: ['呼吸有聲', '喘氣', '呼吸困難', '喘'],
  scratching: ['抓癢', '痕癢', '不停抓', 'R痕'],
  hairLoss: ['脫毛', '甩毛', '禿毛', '冇毛'],
  noAppetite: ['唔食', '唔肯食', '食慾下降', '食量減少', '冇胃口'],
  lethargy: ['冇精神', '呆滯', '唔郁', '冇力', '倦怠']
};

const VETS = [
  { name: '香港珍禽異獸醫療中心', district: '太子', address: '太子道西 123 號', phone: '2390 0000', rating: 4.8, emergency: true },
  { name: '城市獸醫—珍禽異獸分科', district: '旺角', address: '旺角彌敦道 700 號', phone: '2398 0000', rating: 4.6, emergency: true },
  { name: '寵物 24 小時醫療中心', district: '銅鑼灣', address: '銅鑼灣告士打道 255 號', phone: '2890 0000', rating: 4.5, emergency: true },
  { name: '大圍珍禽異獸及寵物醫院', district: '大圍', address: '大圍積信街 69 號', phone: '2687 0000', rating: 4.7, emergency: true },
  { name: '太平道動物診所', district: '九龍城', address: '太平道 9 號', phone: '2760 0000', rating: 4.4, emergency: false }
];

function parseSymptoms(text) {
  const found = [];
  for (const [symptom, keywords] of Object.entries(SYMPTOMS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) { found.push(symptom); break; }
    }
  }
  return found;
}

function assessSymptoms(symptoms) {
  if (symptoms.includes('diarrhea') && symptoms.includes('wetTail')) {
    return { level: '🔴', levelText: '立即就醫 — 緊急情況', advice: '濕尾症可在 48 小時內致命。請立即帶鼠鼠前往最近的珍禽異獸醫院。', urgency: 'emergency' };
  }
  if (symptoms.includes('sneeze') && symptoms.includes('runnyNose')) {
    return { level: '🟠', levelText: '建議 24 小時內就醫', advice: '呼吸道感染可快速惡化為肺炎。請盡快預約獸醫。', urgency: 'high' };
  }
  if (symptoms.includes('scratching') && symptoms.includes('hairLoss')) {
    return { level: '🟡', levelText: '居家觀察 24-48 小時', advice: '可能係皮膚感染或寄生蟲。建議先檢查墊材濕度。', urgency: 'medium' };
  }
  return { level: '🟢', levelText: '繼續觀察', advice: '鼠鼠目前冇明顯異常症狀。請繼續觀察 24 小時。', urgency: 'low' };
}

function generateReply(assessment, symptoms) {
  let reply = `🐹 **Pawckets 症狀分析**\n\n${assessment.level} 風險：${assessment.levelText}\n\n📋 偵測到症狀：${symptoms.length > 0 ? symptoms.join('、') : '（暫無明顯症狀）'}\n\n${assessment.advice}\n\n`;
  if (assessment.urgency === 'emergency' || assessment.urgency === 'high') {
    reply += `📍 **推薦獸醫（24 小時）**\n`;
    VETS.filter(v => v.emergency).slice(0, 3).forEach((v, i) => {
      reply += `${i+1}. ${v.name}\n   ${v.district} | ⭐${v.rating}\n   📞 ${v.phone}\n\n`;
    });
  }
  reply += `---\n⚠️ AI 建議僅供參考，最終診斷以獸醫為準。`;
  return reply;
}

app.post('/webhook', (req, res) => {
  const incomingMsg = req.body.Body || '';
  const sender = req.body.From;
  console.log(`📩 來自 ${sender}: ${incomingMsg}`);
  const symptoms = parseSymptoms(incomingMsg);
  const assessment = assessSymptoms(symptoms);
  const reply = generateReply(assessment, symptoms);
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);
  res.type('text/xml').send(twiml.toString());
});

app.get('/health', (req, res) => res.json({ status: 'OK' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🐹 Pawckets 運行中：${PORT}`));
