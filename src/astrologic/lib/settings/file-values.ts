/* 
    Comments:
        Last edited set to 19/03/2020 17:44:24 seems doubtful
        The true age of the file is found on ftp://ftp.astro.com/pub/swisseph/ephe/
        It would be useful to add a page based on seasnam.txt (in list below)
            1. minor planet designation (MPC) number
            2. Asteroid name
        Link to ftp://ftp.astro.com/pub/swisseph/ephe/
        Perhaps a way to add/update ephemeris files straight from the source
*/

const files = [
  {
    file: 'seplm54.se1',
    yearRange: [-5401, -4802],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - BC',
  },
  {
    file: 'seplm48.se1',
    yearRange: [-4801, -4202],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - BC',
  },
  {
    file: 'seplm42.se1',
    yearRange: [-4201, -3602],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - BC',
  },
  {
    file: 'seplm36.se1',
    yearRange: [-3601, -3002],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - BC',
  },
  {
    file: 'seplm30.se1',
    yearRange: [-3001, -2402],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - BC',
  },
  {
    file: 'seplm24.se1',
    yearRange: [-2401, -1802],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - BC',
  },
  {
    file: 'seplm18.se1',
    yearRange: [-1801, -1202],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - BC',
  },
  {
    file: 'seplm12.se1',
    yearRange: [-1201, -602],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - BC',
  },
  {
    file: 'seplm06.se1',
    yearRange: [-601, -2],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - BC',
  },
  {
    file: 'sepl_00.se1',
    yearRange: [-1, 599],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - AD',
  },
  {
    file: 'sepl_06.se1',
    yearRange: [600, 1199],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - AD',
  },
  {
    file: 'sepl_12.se1',
    yearRange: [1200, 1799],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - AD',
  },
  {
    file: 'sepl_18.se1',
    yearRange: [1800, 2399],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - AD',
  },
  {
    file: 'sepl_24.se1',
    yearRange: [2400, 2999],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - AD',
  },
  {
    file: 'sepl_30.se1',
    yearRange: [3000, 3599],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - AD',
  },
  {
    file: 'sepl_36.se1',
    yearRange: [3600, 4199],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - AD',
  },
  {
    file: 'sepl_42.se1',
    yearRange: [4200, 4799],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - AD',
  },
  {
    file: 'sepl_48.se1',
    yearRange: [4800, 5399],
    info: 'SwissEph ephemeris files for main planets, 600 years per file - AD',
  },
  {
    file: 'semom54.se1',
    yearRange: [-5401, -4802],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - BC',
  },
  {
    file: 'semom48.se1',
    yearRange: [-4801, -4202],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - BC',
  },
  {
    file: 'semom42.se1',
    yearRange: [-4201, -3602],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - BC',
  },
  {
    file: 'semom36.se1',
    yearRange: [-3601, -3002],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - BC',
  },
  {
    file: 'semom30.se1',
    yearRange: [-3001, -2402],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - BC',
  },
  {
    file: 'semom24.se1',
    yearRange: [-2401, -1802],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - BC',
  },
  {
    file: 'semom18.se1',
    yearRange: [-1801, -1202],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - BC',
  },
  {
    file: 'semom12.se1',
    yearRange: [-1201, -602],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - BC',
  },
  {
    file: 'semom06.se1',
    yearRange: [-601, -2],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - BC',
  },
  {
    file: 'semo_00.se1',
    yearRange: [-1, 599],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - AD ',
  },
  {
    file: 'semo_06.se1',
    yearRange: [600, 1199],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - AD ',
  },
  {
    file: 'semo_12.se1',
    yearRange: [1200, 1799],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - AD ',
  },
  {
    file: 'semo_18.se1',
    yearRange: [1800, 2399],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - AD ',
  },
  {
    file: 'semo_24.se1',
    yearRange: [2400, 2999],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - AD ',
  },
  {
    file: 'semo_30.se1',
    yearRange: [3000, 3599],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - AD ',
  },
  {
    file: 'semo_36.se1',
    yearRange: [3600, 4199],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - AD ',
  },
  {
    file: 'semo_42.se1',
    yearRange: [4200, 4799],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - AD ',
  },
  {
    file: 'semo_48.se1',
    yearRange: [4800, 5399],
    info: 'SwissEph ephemeris files for Moon, 600 years per file - AD ',
  },
  {
    file: 'seasm54.se1',
    yearRange: [-5401, -4802],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - BC',
  },
  {
    file: 'seasm48.se1',
    yearRange: [-4801, -4202],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - BC',
  },
  {
    file: 'seasm42.se1',
    yearRange: [-4201, -3602],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - BC',
  },
  {
    file: 'seasm36.se1',
    yearRange: [-3601, -3002],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - BC',
  },
  {
    file: 'seasm30.se1',
    yearRange: [-3001, -2402],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - BC',
  },
  {
    file: 'seasm24.se1',
    yearRange: [-2401, -1802],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - BC',
  },
  {
    file: 'seasm18.se1',
    yearRange: [-1801, -1202],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - BC',
  },
  {
    file: 'seasm12.se1',
    yearRange: [-1201, -602],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - BC',
  },
  {
    file: 'seasm06.se1',
    yearRange: [-601, -2],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - BC',
  },
  {
    file: 'seas_00.se1',
    yearRange: [-1, 599],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - AD',
  },
  {
    file: 'seas_06.se1',
    yearRange: [600, 1199],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - AD',
  },
  {
    file: 'seas_12.se1',
    yearRange: [1200, 1799],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - AD',
  },
  {
    file: 'seas_18.se1',
    yearRange: [1800, 2399],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - AD',
  },
  {
    file: 'seas_24.se1',
    yearRange: [2400, 2999],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - AD',
  },
  {
    file: 'seas_30.se1',
    yearRange: [3000, 3599],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - AD',
  },
  {
    file: 'seas_36.se1',
    yearRange: [3600, 4199],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - AD',
  },
  {
    file: 'seas_42.se1',
    yearRange: [4200, 4799],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - AD',
  },
  {
    file: 'seas_48.se1',
    yearRange: [4800, 5399],
    info:
      'SwissEph ephemeris files with asteroids Ceres, Pallas, Vesta, Juno, Chiron and Pholus, 600 years per file - AD',
  },
  {
    file: 'seasnam.txt',
    yearRange: [],
    info: 'Asteroid names and minor planet designation (MPC) number',
  },
  { file: 'fixstars.cat', yearRange: [], info: 'Fixed stars with elements' },
  { file: 'sefstars.txt', yearRange: [], info: 'Fixed stars data file' },
  {
    file: 's118230s.se1',
    yearRange: [1500, 2100],
    info: 'Asteroid 118230  Sado',
  },
  {
    file: 's134340s.se1',
    yearRange: [1501, 2100],
    info: 'Asteroid 134340  Pluto',
  },
  {
    file: 's136108s.se1',
    yearRange: [1502, 2100],
    info: 'Asteroid 136108  Haumea',
  },
  {
    file: 's136199.se1',
    yearRange: [1503, 2100],
    info: 'Asteroid 136199  Eris',
  },
  {
    file: 's136472s.se1',
    yearRange: [1504, 2100],
    info: 'Asteroid 136472  Makemake',
  },
  {
    file: 's145593s.se1',
    yearRange: [1505, 2100],
    info: 'Asteroid 145593  Xantus',
  },
  {
    file: 's146199s.se1',
    yearRange: [1506, 2100],
    info: 'Asteroid 146199  2000 UZ9',
  },
  {
    file: 's432971s.se1',
    yearRange: [1507, 2100],
    info: 'Asteroid 432971  Loving',
  },
  {
    file: 'se00005.se1',
    yearRange: [1508, 2100],
    info: 'Asteroid 000005  Astraea',
  },
  {
    file: 'se00006s.se1',
    yearRange: [1509, 2100],
    info: 'Asteroid 000006  Hebe',
  },
  {
    file: 'se00007s.se1',
    yearRange: [1510, 2100],
    info: 'Asteroid 000007  Iris',
  },
  {
    file: 'se00008s.se1',
    yearRange: [1511, 2100],
    info: 'Asteroid 000008  Flora',
  },
  {
    file: 'se00009s.se1',
    yearRange: [1512, 2100],
    info: 'Asteroid 000009  Metis',
  },
  {
    file: 'se00010s.se1',
    yearRange: [1513, 2100],
    info: 'Asteroid 000010  Hygiea',
  },
  {
    file: 'se00011s.se1',
    yearRange: [1514, 2100],
    info: 'Asteroid 000011  Parthenope',
  },
  {
    file: 'se00012s.se1',
    yearRange: [1515, 2100],
    info: 'Asteroid 000012  Victoria',
  },
  {
    file: 'se00013s.se1',
    yearRange: [1516, 2100],
    info: 'Asteroid 000013  Egeria',
  },
  {
    file: 'se00014s.se1',
    yearRange: [1517, 2100],
    info: 'Asteroid 000014  Irene',
  },
  {
    file: 'se00015s.se1',
    yearRange: [1518, 2100],
    info: 'Asteroid 000015  Eunomia',
  },
  {
    file: 'se00016s.se1',
    yearRange: [1519, 2100],
    info: 'Asteroid 000016  Psyche',
  },
  {
    file: 'se00017s.se1',
    yearRange: [1520, 2100],
    info: 'Asteroid 000017  Thetis',
  },
  {
    file: 'se00018s.se1',
    yearRange: [1521, 2100],
    info: 'Asteroid 000018  Melpomene',
  },
  {
    file: 'se00019s.se1',
    yearRange: [1522, 2100],
    info: 'Asteroid 000019  Fortuna',
  },
  {
    file: 'se00020s.se1',
    yearRange: [1523, 2100],
    info: 'Asteroid 000020  Massalia',
  },
  {
    file: 'se00021s.se1',
    yearRange: [1524, 2100],
    info: 'Asteroid 000021  Lutetia',
  },
  {
    file: 'se00022s.se1',
    yearRange: [1525, 2100],
    info: 'Asteroid 000022  Kalliope',
  },
  {
    file: 'se00023s.se1',
    yearRange: [1526, 2100],
    info: 'Asteroid 000023  Thalia',
  },
  {
    file: 'se00024s.se1',
    yearRange: [1527, 2100],
    info: 'Asteroid 000024  Themis',
  },
  {
    file: 'se00025s.se1',
    yearRange: [1528, 2100],
    info: 'Asteroid 000025  Phocaea',
  },
  {
    file: 'se00026s.se1',
    yearRange: [1529, 2100],
    info: 'Asteroid 000026  Proserpina',
  },
  {
    file: 'se00027s.se1',
    yearRange: [1530, 2100],
    info: 'Asteroid 000027  Euterpe',
  },
  {
    file: 'se00028s.se1',
    yearRange: [1531, 2100],
    info: 'Asteroid 000028  Bellona',
  },
  {
    file: 'se00029s.se1',
    yearRange: [1532, 2100],
    info: 'Asteroid 000029  Amphitrite',
  },
  {
    file: 'se00030s.se1',
    yearRange: [1533, 2100],
    info: 'Asteroid 000030  Urania',
  },
  {
    file: 'se00055s.se1',
    yearRange: [1534, 2100],
    info: 'Asteroid 000055  Pandora',
  },
  {
    file: 'se00060s.se1',
    yearRange: [1535, 2100],
    info: 'Asteroid 000060  Echo',
  },
  {
    file: 'se00062s.se1',
    yearRange: [1536, 2100],
    info: 'Asteroid 000062  Erato',
  },
  {
    file: 'se00075s.se1',
    yearRange: [1537, 2100],
    info: 'Asteroid 000075  Eurydike',
  },
  {
    file: 'se00076s.se1',
    yearRange: [1538, 2100],
    info: 'Asteroid 000076  Freia',
  },
  {
    file: 'se00077s.se1',
    yearRange: [1539, 2100],
    info: 'Asteroid 000077  Frigga',
  },
  {
    file: 'se00080s.se1',
    yearRange: [1540, 2100],
    info: 'Asteroid 000080  Sappho',
  },
  {
    file: 'se00103s.se1',
    yearRange: [1541, 2100],
    info: 'Asteroid 000103  Hera',
  },
  {
    file: 'se00109s.se1',
    yearRange: [1542, 2100],
    info: 'Asteroid 000109  Felicitas',
  },
  {
    file: 'se00118s.se1',
    yearRange: [1543, 2100],
    info: 'Asteroid 000118  Peitho',
  },
  {
    file: 'se00120s.se1',
    yearRange: [1544, 2100],
    info: 'Asteroid 000120  Lachesis',
  },
  {
    file: 'se00128s.se1',
    yearRange: [1545, 2100],
    info: 'Asteroid 000128  Nemesis',
  },
  {
    file: 'se00151s.se1',
    yearRange: [1546, 2100],
    info: 'Asteroid 000151  Abundantia',
  },
  {
    file: 'se00157s.se1',
    yearRange: [1547, 2100],
    info: 'Asteroid 000157  Dejanira',
  },
  {
    file: 'se00171s.se1',
    yearRange: [1548, 2100],
    info: 'Asteroid 000171  Ophelia',
  },
  {
    file: 'se00240s.se1',
    yearRange: [1549, 2100],
    info: 'Asteroid 000240  Vanadis',
  },
  {
    file: 'se00307s.se1',
    yearRange: [1550, 2100],
    info: 'Asteroid 000307  Nike',
  },
  {
    file: 'se00361s.se1',
    yearRange: [1551, 2100],
    info: 'Asteroid 000361  Bononia',
  },
  {
    file: 'se00390s.se1',
    yearRange: [1552, 2100],
    info: 'Asteroid 000390  Alma',
  },
  {
    file: 'se00393s.se1',
    yearRange: [1553, 2100],
    info: 'Asteroid 000393  Lampetia',
  },
  {
    file: 'se00408s.se1',
    yearRange: [1554, 2100],
    info: 'Asteroid 000408  Fama',
  },
  {
    file: 'se00433s.se1',
    yearRange: [1555, 2100],
    info: 'Asteroid 000433  Eros',
  },
  {
    file: 'se00447s.se1',
    yearRange: [1556, 2100],
    info: 'Asteroid 000447  Valentine',
  },
  {
    file: 'se00582s.se1',
    yearRange: [1557, 2100],
    info: 'Asteroid 000582  Olympia',
  },
  {
    file: 'se00672s.se1',
    yearRange: [1558, 2100],
    info: 'Asteroid 000672  Astarte',
  },
  {
    file: 'se00763s.se1',
    yearRange: [1559, 2100],
    info: 'Asteroid 000763  Cupido',
  },
  {
    file: 'se00875s.se1',
    yearRange: [1560, 2100],
    info: 'Asteroid 000875  Nymphe',
  },
  {
    file: 'se01022s.se1',
    yearRange: [1561, 2100],
    info: 'Asteroid 001022  Olympiada',
  },
  {
    file: 'se01181s.se1',
    yearRange: [1562, 2100],
    info: 'Asteroid 001181  Lilith',
  },
  {
    file: 'seleapsec.txt',
    yearRange: [],
    info:
      'Dates of leap seconds to be taken into account by the Swiss Ephemeris',
  },
  { file: 'sedeltat.txt.inactive', yearRange: [], info: 'Delta-T' },
  {
    file: 'seorbel.txt',
    yearRange: [],
    info: 'Orbital elements of ficticious planets',
  },
];

export default files;
