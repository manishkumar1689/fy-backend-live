/*
dict prefixes:
num: caughadia
result: guna
*/

const caughadiaData = {
  values: [
    /* Daytime:   (sunset - sunrise) / 8. 
       First part ruled by the ruler of the day, then next etc. 
       Last part (8th) also ruled by the day ruler */

    /* Nighttime: (sunrise (next day) - sunset) / 8. 
       First and last part ruled by the ruler of the day +5 (or -2) (night attribute) */

    /* Sunday daytime starts with "udvega", nightime with "śubha",
       Monday starts with "amṛta", nightime with "cala",
       Tuesday starts with "roga", nightime with "kāla",
       Wednesday starts with "lābha", nightime with "udvega",
       Thursday starts with "śubha", nightime with "amṛta",
       Friday starts with "cala", nightime with "roga",
       Saturday starts with "kāla", nightime with "lābha",
       */
    { num: 1, ruler: 'su', result: 'm' },
    { num: 2, ruler: 've', result: 'n' },
    { num: 3, ruler: 'me', result: 'b' },
    { num: 4, ruler: 'mo', result: 'b' },
    { num: 5, ruler: 'sa', result: 'm' },
    { num: 6, ruler: 'ju', result: 'b' },
    { num: 7, ruler: 'ma', result: 'm' },
  ],
  days: [
    { day: 0, dayStart: 1, nightStart: 6 },
    { day: 1, dayStart: 4, nightStart: 2 },
    { day: 2, dayStart: 7, nightStart: 5 },
    { day: 3, dayStart: 3, nightStart: 1 },
    { day: 4, dayStart: 6, nightStart: 4 },
    { day: 5, dayStart: 2, nightStart: 7 },
    { day: 6, dayStart: 5, nightStart: 3 },
  ],
};

export default caughadiaData;
