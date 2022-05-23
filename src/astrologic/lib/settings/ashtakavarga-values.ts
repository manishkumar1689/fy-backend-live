import { naturalBenefics, naturalMalefics } from "./graha-values";
/* import { KeyNumValue } from "../interfaces"; */
import { SignTimelineSet } from "../astro-motion";
import { julToISODate } from "../date-funcs";
import { loopShift, loopShiftInner, toSignValues } from "../helpers";
import { KeyLng, SignValueSet } from "../interfaces";

const matchIndexShiftedArrayValue = (sourceSign: number, targetSign: number, bindu: number[] = []) => {
	const sourceIndex = sourceSign - 1;
	const targetIndex = targetSign - 1;
	const index = ((targetIndex - sourceIndex + 12) % 12);
  return index >= 0 && index < bindu.length ? bindu[index] : 0;
}
/* 
    AV = Asthaka Varga
    BAV Bhinna Ashtaka Varga = AV value of a single Graha in house/sign
                               Each GRAHA has a BAV score in each sign
    SAV Sarva Ashtaka Varga  = All BAV summed up for each house/sign
                               Each SIGN has one SAV score
    
    FOR graha = 1 to 9        // ex: ashtakavarga.su      --- graha (from Su to ASC) 
      for fromGraha = 1 to 9  // ex: ashtakavarga.su.key  --- Assign bindu array scores to houses/signs 
        fromGrahaSign = sign of subGraha in chart
        for sign = 1 to 12    // ex: ashtakavarga.su.bindu[sign] --- Assign bindu array scores to houses/signs
          grahaBAVarray(sign) = ashtakavarga.su.bindu[sign] (0 or 1)
       count (inclusively) from the sign of each of the other Grahas points from bindu array
    BAV of each Graha = the sum of points given in each sign
    SAV = the sum of all BAV (of all Grahas+ASC) for each sign
*/
const ashtakavargaValues = [
  {
    key: "su",
    values: [
      /* AV of Sun - counted from each of the Grahas in rows below */
      { key: "su", bindu: [1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0], ex: false },
      { key: "mo", bindu: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0], ex: false },
      { key: "ma", bindu: [1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0], ex: false },
      { key: "me", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1], ex: false },
      { key: "ju", bindu: [0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0], ex: false },
      { key: "ve", bindu: [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1], ex: false },
      { key: "sa", bindu: [1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0], ex: false },
      { key: "as", bindu: [0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
  {
    key: "mo",
    values: [
      { key: "su", bindu: [0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0], ex: false },
      { key: "mo", bindu: [1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0], ex: false },
      { key: "ma", bindu: [0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0], ex: false },
      { key: "me", bindu: [1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0], ex: false },
      {
        key: "ju",
        bindu: [1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0],
        ex: true,
        vm: [1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1],
      },
      { key: "ve", bindu: [0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0], ex: false },
      { key: "sa", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0], ex: false },
      { key: "as", bindu: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
  {
    key: "ma",
    values: [
      { key: "su", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0], ex: false },
      { key: "mo", bindu: [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0], ex: false },
      { key: "ma", bindu: [1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0], ex: false },
      { key: "me", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0], ex: false },
      { key: "ju", bindu: [0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1], ex: false },
      { key: "ve", bindu: [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1], ex: false },
      { key: "sa", bindu: [1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0], ex: false },
      { key: "as", bindu: [1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
  {
    key: "me",
    values: [
      { key: "su", bindu: [0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1], ex: false },
      { key: "mo", bindu: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0], ex: false },
      { key: "ma", bindu: [1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0], ex: false },
      { key: "me", bindu: [1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1], ex: false },
      { key: "ju", bindu: [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1], ex: false },
      { key: "ve", bindu: [1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0], ex: false },
      { key: "sa", bindu: [1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0], ex: false },
      { key: "as", bindu: [1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
  {
    key: "ju",
    values: [
      { key: "su", bindu: [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0], ex: false },
      { key: "mo", bindu: [0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0], ex: false },
      { key: "ma", bindu: [1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0], ex: false },
      { key: "me", bindu: [1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0], ex: false },
      { key: "ju", bindu: [1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0], ex: false },
      { key: "ve", bindu: [0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0], ex: false },
      { key: "sa", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1], ex: false },
      { key: "as", bindu: [1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
  {
    key: "ve",
    values: [
      { key: "su", bindu: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1], ex: false },
      { key: "mo", bindu: [1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1], ex: false },
      {
        key: "ma",
        bindu: [0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1],
        ex: true,
        vm: [0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1],
      },
      { key: "me", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0], ex: false },
      { key: "ju", bindu: [0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0], ex: false },
      { key: "ve", bindu: [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0], ex: false },
      { key: "sa", bindu: [0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0], ex: false },
      { key: "as", bindu: [1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
  {
    key: "sa",
    values: [
      { key: "su", bindu: [1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0], ex: false },
      { key: "mo", bindu: [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0], ex: false },
      { key: "ma", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1], ex: false },
      { key: "me", bindu: [0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1], ex: false },
      { key: "ju", bindu: [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1], ex: false },
      { key: "ve", bindu: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1], ex: false },
      { key: "sa", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0], ex: false },
      { key: "as", bindu: [1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
  {
    key: "as",
    values: [
      { key: "su", bindu: [0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1], ex: false },
      { key: "mo", bindu: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1], ex: false },
      { key: "ma", bindu: [1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0], ex: false },
      { key: "me", bindu: [1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0], ex: false },
      { key: "ju", bindu: [0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0], ex: false },
      { key: "ve", bindu: [1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0], ex: false },
      { key: "sa", bindu: [1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 0], ex: false },
      { key: "as", bindu: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0], ex: false },
      { key: "ra", bindu: [0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1], ex: false },
      { key: "ke", bindu: [0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1], ex: false },
    ],
  },
  {
    key: "ra",
    values: [
      { key: "su", bindu: [1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0], ex: false },
      { key: "mo", bindu: [1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0], ex: false },
      { key: "ma", bindu: [0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1], ex: false },
      { key: "me", bindu: [0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1], ex: false },
      { key: "ju", bindu: [1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0], ex: false },
      { key: "ve", bindu: [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1], ex: false },
      { key: "sa", bindu: [0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1], ex: false },
      { key: "as", bindu: [0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 1], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
  {
    key: "ke",
    values: [
      { key: "su", bindu: [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0], ex: false },
      { key: "mo", bindu: [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0], ex: false },
      { key: "ma", bindu: [0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1], ex: false },
      { key: "me", bindu: [1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0], ex: false },
      { key: "ju", bindu: [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1], ex: false },
      { key: "ve", bindu: [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1], ex: false },
      { key: "sa", bindu: [0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1], ex: false },
      { key: "as", bindu: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], ex: false },
      { key: "ra", bindu: [], ex: false },
      { key: "ke", bindu: [], ex: false },
    ],
  },
];

const getAshtakavargaBodyRow = (lngItem: KeyLng, tableKey = "", binduSet = "default") => {
  let values = [];
  const sign = Math.floor(lngItem.lng / 30) + 1;
  const graha = { ...lngItem, sign };
  const tableSet = ashtakavargaValues.find((tv) => tv.key === tableKey);
  if (tableSet.values instanceof Array) {
    const gv = tableSet.values.find((rv) => rv.key === graha.key);

    if (gv) {
      const binduVals = binduSet === "vm" && gv.ex === true ? gv.vm : gv.bindu;
      const innerVals = loopShiftInner(
        toSignValues(binduVals),
        graha.sign - 1
      );
      values = loopShift(
        innerVals,
        innerVals.findIndex((p) => p.sign === 1)
      );
    }
  }
  return values;
}

const getAshtakavargaBodyRowTotals = (graha: KeyLng, bodies: KeyLng[], binduSet = "default") => {
  const keys = bodies.map(gr => gr.key);
  let row = [];
  keys.forEach((key, keyIndex) => {
    const matchedGraha = bodies.find((gr) => gr.key === key);
    const br = getAshtakavargaBodyRow(matchedGraha, graha.key, binduSet);
    if (keyIndex === 0) {
      row = br;
    } else {
      row = row.map((item, itemIndex) => {
        if (itemIndex < br.length) {
          item.value = item.value + br[itemIndex].value;
        }
        return item;
      });
    }
  });
  return row;
}

export const getAshtakavargaBodyTable = (bodies: KeyLng[] = [], binduSet = "default") => {
   return bodies
        .map((gr) => {
          const values = getAshtakavargaBodyRowTotals(gr, bodies, binduSet);
          
          const sign = Math.floor(gr.lng / 30) + 1;
          return {
            sign,
            key: gr.key,
            values,
          };
        })
        .filter((row) => row.values.length > 0);
}

export const getAshtakavargaBodyValues = (bodies: KeyLng[] = [], binduSet = "default") => {
  return bodies
       .map((gr) => {
         const values = bodies.map(gr2 => {
            return {
              key: gr2.key,
              values: getAshtakavargaBodyRow(gr, gr2.key, binduSet)
            };
         });
         return { 
           key: gr.key,
           values
         }
       })
       .filter((row) => row.values.length > 0);
}


export const flipGridValues = (gridValues: any[]) => {
  const keys = gridValues.length > 1 ? gridValues[0].values.map(row => row.key) : [];
  return gridValues.map(row => {
    const values = keys.map(k1 => {
      const items = row.values.map(r2 => {
        const r2v = r2.values.find(r3 => r3.key === k1);
        return {
          key: r2.key,
          value: r2v.value,
        }
      });
      return {
        key: k1,
        values: items.filter(item => item.value > 0).map(item => item.key)
      }
    });
    return {
      sign: row.sign,
      values
    }	
  })
}

export const getAshtakavargaBodyGrid = (bodies: KeyLng[] = [], binduSet = "default") => {
  const gridValues = getAshtakavargaBodyValues(bodies, binduSet);
  const baseKeys = bodies.map(b => b.key).splice(0, 8);
  const grid = Array.from(Array(12)).map((_, i) => i).map(signIndex => { 
    const sign = signIndex + 1;
    const values = gridValues.filter(g1 => baseKeys.includes(g1.key)).map(g1 => {
      const { key, values } = g1;
      return {
        key,
        values: values.filter(g2 => baseKeys.includes(g2.key) && Object.keys(g2).includes("values") && g2.values instanceof Array && signIndex < g2.values.length).map(g2 => {
          return {
            key: g2.key,
            value: g2.values[signIndex].value
          }
        })
      };
    });
    return {
      sign,
      values
    }
  });
  return flipGridValues(grid);
}


export const getAshtakavargaGridTotal = (bodies: KeyLng[] = [], refBodies: Map<string, number> = new Map()) => {
  return bodies
       .map((gr) => {
         const signIndex = Math.floor(gr.lng / 30);
         const sign = signIndex + 1;
         const row = ashtakavargaValues.find(bs => bs.key === gr.key);
         const values = row.values.filter(r => r.bindu instanceof Array && r.bindu.length > 0).map(r => {
          if (r.bindu instanceof Array && r.bindu.length > signIndex) {
            const innerBodyValue = refBodies.get(r.key);
            const toSignIndex = typeof innerBodyValue === 'number'? innerBodyValue : 0;
            return matchIndexShiftedArrayValue(signIndex, toSignIndex, r.bindu);
          } else {
            return 0;
          }
         });
         return {
           sign,
           key: gr.key,
           values,
         };
       });
}

export const getAshtakavargaBavItems = (bodies: KeyLng[] = [], refBodies: Map<string, number> = new Map()) => {
  
  return getAshtakavargaGridTotal(bodies, refBodies).map((row, ri) => {
    const { key, values, sign } = row;
    const value = values.reduce((a, b) => a + b, 0);
    return { key, sign, lng: (sign - 1 ) * 30, value };
  });
}



export const buildAsktakavargaSignSet = (bodies: KeyLng[]): SignValueSet[] => {
  const table = getAshtakavargaBodyTable(bodies);
  const grahaKeys = bodies.map(b => b.key);
  return Array.from(Array(12)).map((_,i) => i + 1).map(sign => {
    const values = grahaKeys.map(gk => {
      const row = table.find(row => row.key === gk);
      const item = row instanceof Object && row.values instanceof Array? row.values.find(r => r.sign === sign) : null;
      const hasItem = item instanceof Object
      return hasItem ? { key: gk, value: item.value } : { key: "", value: 0 };
    });
    return { sign,  values };
  });
}

export interface QualitySet {
  b: number;
  m: number;
  a?: number;
  n?: number;
}

export const getAshtakavargaBavBMN = (bodies: KeyLng[] = [], refBodies: Map<string, number> = new Map()): QualitySet => {
  const items = getAshtakavargaBavItems(bodies, refBodies);
  const m = items.filter(row => naturalMalefics.includes(row.key)).map(row => row.value).reduce((a, b) => a +b, 0) / naturalBenefics.length;
  const b = items.filter(row => naturalBenefics.includes(row.key)).map(row => row.value).reduce((a, b) => a +b, 0) / naturalMalefics.length;
  const a = items.map(row => row.value).reduce((a, b) => a + b, 0) / items.length;
  return {
    b,
    m,
    a,
  };
}

const matchBavTimelineBodies = (data: SignTimelineSet[], jd = 0) => {
  const bds = data.map(rs => {
    const { key, longitude, nextMatches} = rs;
    const next = nextMatches.find(ri => ri.jd >= jd);
    return next instanceof Object? { 
      key,
      sign: next.sign,
      lng: next.lng
    } : {key, lng: Math.round(longitude), sign: Math.floor(longitude / 30) + 1 };
  })
  return bds;
}

export const calcBavSignSamples = (data: SignTimelineSet[] = [], startJd = 0, endJd = 0, stepsPerDay = 4, refBodies: Map<string, number> = new Map()) => {
  let signSwitchJds = [];

  if (stepsPerDay  < 1) {
    const signSwitchRows = [];
    data.forEach(row => {
      if (row.nextMatches instanceof Array) {
        row.nextMatches.forEach(nm => {
          if (nm.jd <= endJd) {
            signSwitchRows.push({
              jd: nm.jd,
              bodies: [],
              key: row.key,
            })
          }
        })
      }
    })
    signSwitchRows.sort((a, b) => a.jd - b.jd);
    signSwitchJds = signSwitchRows.map(row => {
      const bodyRows = row.bodies.length > 0? row.bodies : matchBavTimelineBodies(data, row.jd)
      const bodies = getAshtakavargaBavItems(bodyRows, refBodies);
      return {...row, dt: julToISODate(row.jd), bodies};
    })
  } else {
    const days = Math.floor(endJd - startJd);
    const steps = days * stepsPerDay;
    const frac = 1 / stepsPerDay;
    for (let i = 1; i <= steps; i++) {
      const sampleJd = startJd + (frac * i);
      const bodyRows = matchBavTimelineBodies(data, sampleJd);
      const bodies = getAshtakavargaBavItems(bodyRows, refBodies);
      signSwitchJds.push({ jd: sampleJd, dt: julToISODate(sampleJd), bodies });
    }
  }
  return signSwitchJds;
}

export const calcBavGraphData = (data: SignTimelineSet[] = [], refBodies: Map<string, number> = new Map(), startJd = 0, endJd = 0, stepsPerDay = 2) => {
  
  const initBodies = data.map(row => {
    const { key, longitude} = row;
    return { key, lng: longitude, sign: Math.floor(row.longitude / 30) + 1 };
  });
  const initValues = getAshtakavargaBavBMN(initBodies, refBodies);
  const graphData = [{
    jd: startJd,
    refJd: 0,
    dt: julToISODate(startJd),
    ...initValues
  }];
  const signSwitchJds = calcBavSignSamples(data, startJd, endJd, stepsPerDay);
  signSwitchJds.forEach((row, ri) => {
    const {jd, dt, bodies} = row;
    const items = getAshtakavargaBavBMN(bodies, refBodies);
    graphData.push({
      jd,
      refJd: jd - startJd,
      dt,
      ...items
    });
  });
  return graphData;
}

export default ashtakavargaValues;
