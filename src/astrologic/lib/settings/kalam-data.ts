/* duration from sunrise to sunset / 8.
Rahu Kalam
Yamagandam
Gulika
Make time HH:MM of beginning and end of period

Display names:
1. Rahu kāla
2. Yamaghaṇṭa
3. Gulika kāla

https://vedicastrologylessons.com/rahu-kalam-yamagandam-and-gulika-kalam-vedic-astrology-lessons/
sunrise
1. 06:00 - 07:30
2. 07:30 - 09:00
3. 09:00 - 10:30
4. 10:30 - 12:00
5. 12:00 - 13:30
6. 13:30 - 15:00
7. 15:00 - 15:00
8: 16:30 - 18:00
sunset

dict prefix: graha__chaya_kalam

*/

const kalamData = {
  values: [
    { day: 0, rahu: 8, yama: 5, gulika: 7 },
    { day: 1, rahu: 2, yama: 4, gulika: 6 },
    { day: 2, rahu: 7, yama: 3, gulika: 5 },
    { day: 3, rahu: 5, yama: 2, gulika: 4 },
    { day: 4, rahu: 6, yama: 1, gulika: 3 },
    { day: 5, rahu: 4, yama: 7, gulika: 2 },
    { day: 6, rahu: 3, yama: 6, gulika: 1 },
  ],
  dict: {
    rahu: 'rk',
    yama: 'yk',
    gulika: 'gk',
  },
};

export default kalamData;
