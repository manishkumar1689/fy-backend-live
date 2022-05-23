/*
	Lagnas
		1. śrī lagna       -> my chart= 125.45     -> formula= https://docs.google.com/spreadsheets/d/19KkiY7_zigniYMWVe7lvLlJswEqlyHlT_m2z4bX7BNw/edit#gid=247624230
		2. indu lagna      -> my chart= 222.5      -> formula= https://docs.google.com/spreadsheets/d/19KkiY7_zigniYMWVe7lvLlJswEqlyHlT_m2z4bX7BNw/edit#gid=0
		3. varṇada lagna   -> my chart= 117.63333  -> formula= https://docs.google.com/spreadsheets/d/19KkiY7_zigniYMWVe7lvLlJswEqlyHlT_m2z4bX7BNw/edit#gid=99597136
		4. horā lagna      -> my chart= 343.283333 -> formula= https://docs.google.com/spreadsheets/d/19KkiY7_zigniYMWVe7lvLlJswEqlyHlT_m2z4bX7BNw/edit#gid=589680777
		5. ghati lagna     -> my chart= 28.9333333 -> formula= https://docs.google.com/spreadsheets/d/19KkiY7_zigniYMWVe7lvLlJswEqlyHlT_m2z4bX7BNw/edit#gid=481004777
		6. vighati lagna   -> my chart= 257.216666 -> formula= https://docs.google.com/spreadsheets/d/19KkiY7_zigniYMWVe7lvLlJswEqlyHlT_m2z4bX7BNw/edit#gid=1903040642
		7. prāṇapada lagna -> my chart= 17.56666   -> formula= https://docs.google.com/spreadsheets/d/19KkiY7_zigniYMWVe7lvLlJswEqlyHlT_m2z4bX7BNw/edit#gid=1434519808
		8. bhāva lagna     -> my chart= 209.0666   -> formula= https://docs.google.com/spreadsheets/d/19KkiY7_zigniYMWVe7lvLlJswEqlyHlT_m2z4bX7BNw/edit#gid=522833706
	Sphutas:
		1.  yogi sphuṭa    -> my chart= 59.0500    -> formula= Sun degree + Moon degree + 93.333333333 / mod 360
		2.  yogi           -> my chart= ma (Mars)  -> formula= lord of Nakshatra of Yoga Sputa
		3.  avayogi sphuṭa -> my chart= 245.716666 -> formula= Yoga Sphuta + 186.666666666 / mod 360
		4.  avayogi        -> my chart= ke (Ketu)  -> formula= lord of Nakshatra of Avayoga Sphuta
		5.  bīja sphuta    -> my chart= 23.0666665 -> formula= Jupiter + Mars + Moon /mod 360
		6.  kṣetra sphuṭa  -> my chart= 301.016666 -> formula= Jupiter + Venus + Sun / mod 360
		7.  santāna tithi  -> my chart= 15 purnima -> formula= The tithi of result of = ceiling(mod(mod((Moon's degree-Sun's degree)*5,360)/12,15),1) 
		8.  prāṅasphuṭa    -> my chart= 156.55     -> formula= ((Lagna's degree x 5)+Gulika's degree) / mod 360
		9.  dehasphuṭa     -> my chart= 358.383333 -> formula= ((Moon's degree x 8)+Gulika's degree) / mod 360
		10. mṛtusphuṭa     -> my chart= 321.899999 -> formula= ((Gulika's degree x 7)+Sun's degree) / mod 360
		11. trisphuṭa      -> my chart= 178.52     -> formula= Prāṅasphuṭa + Dehasphuṭa + Mṛtusphuṭa / mod 360
		12. catusphuṭa     -> my chart= 251.73     -> formula= Trisphuṭa + Sun's degree / mod 360
		13. pañcasphuṭa    -> my chart= 18.35      -> formula= Catusphuṭa + Rahu's degree / mod 360
		14. bṛghu bindu    -> my chart= 189.5      -> formula= Version1=(Moon degree+Rahu degree) / 2, counting from Rahu --- Version2=(Moon degree+Rahu degree) / 2 (shortest distance) less 180
*/

const sphutaValues = [
  { key: 'lagna__1' } /* śrī lagna */,
  { key: 'lagna__2' } /* indu lagna */,
  { key: 'lagna__3' } /* varṇada lagna */,
  { key: 'lagna__4' } /* horā lagna */,
  { key: 'lagna__5' } /* ghati lagna */,
  { key: 'lagna__6' } /* vighati lagna */,
  { key: 'lagna__7' } /* vighati lagna */,
  { key: 'lagna__8' } /* bhāva lagna */,
  { key: 'sphuta__1' } /*yogi sphuṭa*/,
  { key: 'graha__type_yogi' } /* yogi */,
  { key: 'sphuta__2' } /* avayogi sphuṭa */,
  { key: 'graha__type_avayogi' } /* avayogi */,
  { key: 'sphuta__3' } /* bīja sphuta */,
  { key: 'sphuta__4' } /* kṣetra sphuṭa */,
  { key: 'tithi__type_santana' } /* santāna tithi */,
  { key: 'sphuta__5' } /* prāṅasphuṭa */,
  { key: 'sphuta__6' } /* dehasphuṭa */,
  { key: 'sphuta__7' } /* mṛtusphuṭa */,
  { key: 'sphuta__8' } /* trisphuṭa */,
  { key: 'sphuta__9' } /* catusphuṭa */,
  { key: 'sphuta__10' } /* pañcasphuṭa */,
  { key: 'sphuta__11' } /* bṛghu bindu */,
];

export default sphutaValues;
