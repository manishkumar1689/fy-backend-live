import { zeroPad } from "../../../lib/converters";

/* const panchangaValues = [
   { num: 1, anga: "Vāra", bhuta: "Agni", ele: "Fire", type: "weekday" },
   { num: 2, anga: "Tithi", bhuta: "Jala", ele: "Water", type: "lunar day" },
   { num: 3, anga: "Karaṇa", bhuta: "Pṛthvi", ele: "Earth", type: "lunar -half day" },
   { num: 4, anga: "Yoga", bhuta: "Ākāśa", ele: "Space", type: "Sun/Moon combination" },
   { num: 5, anga: "Nakṣatra", bhuta: "Vāyu", ele: "Air", type: "lunar mansion" },
];

prefixes:

anga: panchanga
bhuta: bhuta
 */
const panchangaValues = [
  /* pañcāṅga */
  { num: 1, anga: 'vara', bhuta: 'agni', type: 'weekday' },
  { num: 2, anga: 'tithi', bhuta: 'jala', type: 'lunar day' },
  {
    num: 3,
    anga: 'karana',
    bhuta: 'prithvi',
    type: 'lunar-half day',
  },
  {
    num: 4,
    anga: 'yoga',
    bhuta: 'akasha',
    type: 'Sun/Moon combination',
  },
  {
    num: 5,
    anga: 'nakshatra',
    bhuta: 'vayu',
    type: 'lunar mansion',
  },
];

export const panchangaTerms = [
  {
      key: "karana__1",
      name: "bava",
      dv: "बव"
  },
  {
      key: "karana__2",
      name: "bālava",
      dv: "बालव"
  },
  {
      key: "karana__3",
      name: "kaulava",
      dv: "कौलव"
  },
  {
      key: "karana__4",
      name: "taitila",
      dv: "तैतिल"
  },
  {
      key: "karana__6",
      name: "vaṇija",
      dv: "वणिज"
  },
  {
      key: "karana__7",
      name: "viṣṭi",
      dv: "विष्टि"
  },
  {
      key: "karana__5",
      name: "garaja",
      dv: "गरज"
  },
  {
      key: "karana__8",
      name: "śakuni",
      dv: "शकुनि"
  },
  {
      key: "karana__10",
      name: "catuṣpāda",
      dv: "चतुष्पाद"
  },
  {
      key: "karana__9",
      name: "nāga",
      dv: "नाग"
  },
  {
      key: "karana__11",
      name: "kiṃstughna",
      dv: "किंस्तुघ्न"
  },
  {
      key: "karana__0",
      name: "kāraṇā",
      dv: "कारणा"
  },
  {
      key: "nakshatra__01",
      name: "aśvini",
      dv: "अश्विनि",
      short: "अश्व"
  },
  {
      key: "nakshatra__03",
      name: "kṛttikā",
      dv: "कृत्तिका",
      short: "कृत"
  },
  {
      key: "nakshatra__04",
      name: "rohiṇī",
      dv: "रोहिणी",
      short: "रोह्"
  },
  {
      key: "nakshatra__02",
      name: "bharaṇī",
      dv: "भरणी",
      short: "भर"
  },
  {
      key: "nakshatra__05",
      name: "mṛgaśīrṣā",
      dv: "म्रृगशीर्षा",
      short: "मृग्"
  },
  {
      key: "nakshatra__06",
      name: "ārdrā",
      dv: "आर्द्रा",
      short: "आर्द"
  },
  {
      key: "nakshatra__07",
      name: "punarvasu",
      dv: "पुनर्वसु",
      short: "पुन"
  },
  {
      key: "nakshatra__08",
      name: "puṣya",
      dv: "पुष्य",
      short: "पुष्य"
  },
  {
      key: "nakshatra__09",
      name: "āśleṣā",
      dv: "आश्लेषा",
      short: "आश"
  },
  {
      key: "nakshatra__10",
      name: "maghā",
      dv: "मघा",
      short: "मघ"
  },
  {
      key: "nakshatra__12",
      name: "uttara phālgunī",
      dv: "उत्तर फाल्गुनी",
      short: "उ.फ"
  },
  {
      key: "nakshatra__11",
      name: "pūrva phālgunī",
      dv: "पूर्व फाल्गुनी",
      short: "प.फ"
  },
  {
      key: "nakshatra__13",
      name: "hastā",
      dv: "हस्त",
      short: "हस"
  },
  {
      key: "nakshatra__14",
      name: "citrā",
      dv: "चित्रा",
      short: "चित"
  },
  {
      key: "nakshatra__17",
      name: "anurādhā",
      dv: "अनुराधा",
      short: "अनु"
  },
  {
      key: "nakshatra__18",
      name: "jyeṣṭhā",
      dv: "ज्येष्ठा",
      short: "ज्ये"
  },
  {
      key: "nakshatra__19",
      name: "mūla",
      dv: "मूल",
      short: "मूल"
  },
  {
      key: "nakshatra__16",
      name: "viśākhā",
      dv: "विशाखा",
      short: "विश"
  },
  {
      key: "nakshatra__20",
      name: "pūrva aṣāḍhā",
      dv: "पूर्वाषाढ़ा",
      short: "प.अष"
  },
  {
      key: "nakshatra__21",
      name: "uttara aṣāḍhā",
      dv: "उत्तराषाढ़ा",
      short: "उ.अष"
  },
  {
      key: "nakshatra__24",
      name: "śatabhiṣā",
      dv: "शतभिषा",
      short: "शत"
  },
  {
      key: "nakshatra__22",
      name: "śrāvaṇa",
      dv: "श्रावण",
      short: "श्रा"
  },
  {
      key: "nakshatra__23",
      name: "dhaniṣṭhā",
      dv: "धनिष्ठा",
      short: "धन"
  },
  {
      key: "nakshatra__25",
      name: "pūrva bhādrapadā",
      dv: "पूर्वभाद्रपदा",
      short: "प.भ"
  },
  {
      key: "nakshatra__26",
      name: "uttara bhādrapadā",
      dv: "उत्तरभाद्रपदा",
      short: "उ.भ"
  },
  {
      key: "nakshatra__27",
      name: "revati",
      dv: "रेवती",
      short: "रेव"
  },
  {
      key: "nakshatra__n28_22",
      name: "abhijit",
      dv: "अभिजित",
      short: "अभ"
  },
  {
      key: "nakshatra__n28_23",
      name: "śrāvaṇa",
      dv: "श्रावण"
  },
  {
      key: "nakshatra__n28_24",
      name: "dhaniṣṭhā",
      dv: "धनिष्ठा"
  },
  {
      key: "nakshatra__n28_25",
      name: "śatabhiṣā",
      dv: "शतभिषा"
  },
  {
      key: "nakshatra__n28_26",
      name: "pūrva bhādrapadā",
      dv: "पूर्वभाद्रपदा"
  },
  {
      key: "nakshatra__15",
      name: "svāti",
      dv: "स्वाति",
      short: "स्वा"
  },
  {
      key: "nakshatra__n28_28",
      name: "revati",
      dv: "रेवती"
  },
  {
      key: "nakshatra__n28_27",
      name: "uttara bhādrapadā",
      dv: "उत्तरभाद्रपदा"
  },
  {
      key: "tithi__1",
      name: "śukla pratipadā",
      dv: "शुक्ल प्रतिपदा"
  },
  {
      key: "tithi__2",
      name: "śukla dvitīyā",
      dv: "शुक्ल द्वितीया"
  },
  {
      key: "tithi__4",
      name: "śukla caturthī",
      dv: "शुक्ल चतुर्थी"
  },
  {
      key: "tithi__3",
      name: "śukla tṛtīyā",
      dv: "शुक्ल तृतीया"
  },
  {
      key: "tithi__5",
      name: "śukla pancamī",
      dv: "शुक्ल पन्चमी"
  },
  {
      key: "tithi__6",
      name: "śukla ṣaṣthī",
      dv: "शुक्ल षष्थी"
  },
  {
      key: "tithi__7",
      name: "śukla saptamī",
      dv: "शुक्ल सप्तमी"
  },
  {
      key: "tithi__9",
      name: "śukla navamī",
      dv: "शुक्ल नवमी"
  },
  {
      key: "tithi__8",
      name: "śukla aṣṭamī",
      dv: "शुक्ल अष्टमी"
  },
  {
      key: "tithi__11",
      name: "śukla ekādaśī",
      dv: "शुक्ल एकादशी"
  },
  {
      key: "tithi__10",
      name: "śukla daśamī",
      dv: "शुक्ल दशमी"
  },
  {
      key: "tithi__12",
      name: "śukla dvādaśī",
      dv: "शुक्ल द्वादशी"
  },
  {
      key: "tithi__13",
      name: "śukla trayodaśī",
      dv: "शुक्ल त्रयोदशी"
  },
  {
      key: "tithi__14",
      name: "śukla caturdaśī",
      dv: "शुक्ल चतुर्दशी"
  },
  {
      key: "tithi__15",
      name: "śukla pūrṇimā",
      dv: "शुक्ल पूर्णिमा"
  },
  {
      key: "tithi__16",
      name: "kṛṣṇa pratipadā",
      dv: "कृष्ण प्रतिपदा"
  },
  {
      key: "tithi__20",
      name: "kṛṣṇa pancamī",
      dv: "कृष्ण पन्चमी"
  },
  {
      key: "tithi__19",
      name: "kṛṣṇa caturthī",
      dv: "कृष्ण चतुर्थी"
  },
  {
      key: "tithi__21",
      name: "kṛṣṇa ṣaṣthī",
      dv: "कृष्ण षष्थी"
  },
  {
      key: "tithi__22",
      name: "kṛṣṇa saptamī",
      dv: "कृष्ण सप्तमी"
  },
  {
      key: "tithi__23",
      name: "kṛṣṇa aṣṭamī",
      dv: "कृष्ण अष्टमी"
  },
  {
      key: "tithi__24",
      name: "kṛṣṇa navamī",
      dv: "कृष्ण नवमी"
  },
  {
      key: "tithi__25",
      name: "kṛṣṇa daśamī",
      dv: "कृष्ण दशमी"
  },
  {
      key: "tithi__27",
      name: "kṛṣṇa dvādaśī",
      dv: "कृष्ण द्वादशी"
  },
  {
      key: "tithi__28",
      name: "kṛṣṇa trayodaśī",
      dv: "कृष्ण त्रयोदशी"
  },
  {
      key: "tithi__29",
      name: "kṛṣṇa caturdaśī",
      dv: "कृष्ण चतुर्दशी"
  },
  {
      key: "tithi__30",
      name: "kṛṣṇa amāvasyā",
      dv: "कृष्ण अमावस्या"
  },
  {
      key: "tithi__26",
      name: "kṛṣṇa ekādaśī",
      dv: "कृष्ण एकादशी"
  },
  {
      key: "tithi__17",
      name: "kṛṣṇa dvitīyā",
      dv: "कृष्ण द्वितीया"
  },
  {
      key: "tithi__18",
      name: "kṛṣṇa tṛtīyā",
      dv: "कृष्ण तृतीया"
  },
  {
      key: "vara__1",
      name: "bhānuvāra",
      dv: "भानुवार"
  },
  {
      key: "vara__3",
      name: "maṅgalavāra",
      dv: "मङ्गलवार"
  },
  {
      key: "vara__2",
      name: "somavāra",
      dv: "सोमवार"
  },
  {
      key: "vara__5",
      name: "guruvāra",
      dv: "गुरुवार"
  },
  {
      key: "vara__6",
      name: "śukravāra",
      dv: "शुक्रवार"
  },
  {
      key: "vara__7",
      name: "śanivāra",
      dv: "शनिवार"
  },
  {
      key: "vara__4",
      name: "budhavāra",
      dv: "बुधवार"
  },
  {
      key: "vara__0",
      name: "vara",
      dv: "वर"
  },
  {
      key: "yoga__1",
      name: "viṣkambha",
      dv: "विष्कम्भ"
  },
  {
      key: "yoga__2",
      name: "prīti",
      dv: "प्रीति"
  },
  {
      key: "yoga__3",
      name: "āyuśmān",
      dv: "आयुश्मान्"
  },
  {
      key: "yoga__5",
      name: "śobhana",
      dv: "शोभन"
  },
  {
      key: "yoga__6",
      name: "atigaṇḍa",
      dv: "अतिगण्ड"
  },
  {
      key: "yoga__4",
      name: "saubhāgya",
      dv: "सौभाग्य"
  },
  {
      key: "yoga__7",
      name: "sukarma",
      dv: "सुकर्म"
  },
  {
      key: "yoga__8",
      name: "dhṛti",
      dv: "धृति"
  },
  {
      key: "yoga__9",
      name: "śūla",
      dv: "शूल"
  },
  {
      key: "yoga__10",
      name: "gaṇḍa",
      dv: "गण्ड"
  },
  {
      key: "yoga__11",
      name: "vṛddhi",
      dv: "वृद्धि"
  },
  {
      key: "yoga__13",
      name: "vyāghatā",
      dv: "व्याघता"
  },
  {
      key: "yoga__12",
      name: "dhruva",
      dv: "ध्रुव"
  },
  {
      key: "yoga__14",
      name: "harṣaṇa",
      dv: "हर्षण"
  },
  {
      key: "yoga__15",
      name: "vajra",
      dv: "वज्र"
  },
  {
      key: "yoga__16",
      name: "siddhi",
      dv: "सिद्धि"
  },
  {
      key: "yoga__17",
      name: "vyatipāta",
      dv: "व्यतिपात"
  },
  {
      key: "yoga__18",
      name: "variyas",
      dv: "वरियस्"
  },
  {
      key: "yoga__20",
      name: "śiva",
      dv: "शिव"
  },
  {
      key: "yoga__22",
      name: "sādhya",
      dv: "साध्य"
  },
  {
      key: "yoga__23",
      name: "śubha",
      dv: "शुभ"
  },
  {
      key: "yoga__24",
      name: "śukla",
      dv: "शुक्ल"
  },
  {
      key: "yoga__25",
      name: "brahma",
      dv: "ब्रह्म"
  },
  {
      key: "yoga__26",
      name: "māhendra",
      dv: "माहेन्द्र"
  },
  {
      key: "yoga__27",
      name: "vaidhṛti",
      dv: "वैधृति"
  },
  {
      key: "yoga__19",
      name: "parigha",
      dv: "परिघ"
  },
  {
      key: "yoga__21",
      name: "siddha",
      dv: "सिद्ध"
  }
];

export interface SimpleTerm {
  key?: string;
  name: string;
  dv?: string;
  short?: string;
}

export const matchPanchangaTerm = (key = '', num = 0): SimpleTerm => {
  const strNum = zeroPad(num, 2);
  const key1 = [key, strNum].join('__');
  let rowIndex = panchangaTerms.findIndex(row => row.key === key1);
  if (rowIndex < 0) {
    const key2 = [key, num].join('__');
    rowIndex = panchangaTerms.findIndex(row => row.key === key2);
  }
  const item: SimpleTerm = rowIndex < 0? { name: "", dv: "" } : panchangaTerms[rowIndex];
  if (item.key) {
    delete item.key
  }
  return item;
}

export default panchangaValues;
