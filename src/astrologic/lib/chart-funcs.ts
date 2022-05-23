import { GeoPos } from '../interfaces/geo-pos';
import { BmMatchRow } from '../interfaces/sign-house';
import { calcCompactChartData } from './core';
import { deepClone, midLng } from './helpers';
import { applyAyanamsha, Chart } from './models/chart';
import { Condition } from './models/protocol-models';

export const combineCharts = (c1: Chart, c2: Chart, ayanamshaNum = 27) => {
  c1.setAyanamshaItemByNum(ayanamshaNum);
  c2.setAyanamshaItemByNum(ayanamshaNum);

  const grahas = c1.grahas.map(gr => {
    const mb = c2.grahas.find(g2 => g2.key === gr.key);
    const midG = deepClone(gr);
    midG.lng = midLng(gr.lng, mb.lng);
    return midG;
  });

  const ascendant = midLng(c1.ascendant, c2.ascendant);
  const ayanamshas = c1.ayanamshas.map(ay1 => {
    const ay2 = c2.ayanamshas.find(a2 => a2.key === ay1.key);
    const aya = Object.assign({}, ay1);
    if (ay2) {
      aya.value = (ay1.value + ay2.value) / 2;
    }
    return aya;
  });
  const upagrahas = c1.upagrahas.map(up1 => {
    const up2 = c2.upagrahas.find(u2 => u2.key === up1.key);
    const upa = Object.assign({}, up1);
    if (up2) {
      upa.value = midLng(up1.value, up2.value);
    }
    return upa;
  });
  const sphutas = c1.sphutas.map(ss1 => {
    const ss2 = c2.sphutas.find(s1 => s1.num === ss1.num);
    const ss = {
      num: ss1.num,
      items: [],
    };
    if (ss2) {
      ss.items = ss1.items.map(sp1 => {
        const sp2 = ss2.items.find(s2 => s2.key === sp1.key);
        const sp = Object.assign({}, sp1);
        if (sp2) {
          sp.value = midLng(sp1.value, sp2.value);
        }
        return sp;
      });
    }
    return ss;
  });
  const jd = (c1.jd + c2.jd) / 2;
  const houses = c1.houses.map(hs => {
    const house = Object.assign({}, hs);
    const hs2 = c2.houses.find(h => h.system === hs.system);
    switch (hs.system) {
      case 'P':
        house.values = hs.values.map((v, i) => {
          return midLng(v, hs2.values[i]);
        });
        break;
      case 'W':
        house.values = [Math.floor(ascendant / 30) * 30];
        break;
    }
  });
  const chart = {
    jd,
    ascendant,
    houses,
    grahas,
    ayanamshas,
    upagrahas,
    sphutas,
  };
  const nc = new Chart(chart);
  const ayanamshaItem = nc.setAyanamshaItemByNum(ayanamshaNum);
  applyAyanamsha(nc, nc.bodies, ayanamshaItem);
  return nc;
};

export const extractSurfaceData = (paired: any) => {
  let surface = null;
  if (paired instanceof Object) {
    const { surfaceGeo, surfaceAscendant, surfaceTzOffset } = paired;
    if (surfaceGeo instanceof Object) {
      const { lat, lng } = surfaceGeo;
      surface = {
        geo: { lng, lat },
        ascendant: surfaceAscendant,
        tzOffset: surfaceTzOffset,
      };
    }
  }
  return surface;
};

export const filterBmMatchRow = (row: BmMatchRow, condition: Condition) => {
  if (condition.sendsDrishti) {
    return row.sendsVal === 1;
  } else if (condition.receivesDrishti) {
    return row.getsVal === 1;
  } else if (condition.mutualDrishti) {
    return row.sendsVal === 1 && row.getsVal === 1;
  } else {
    return false;
  }
};

export const fetchChartObject = async (
  dtUtc = '',
  geo: GeoPos,
  addExtras = false,
): Promise<Chart> => {
  const chartData = await calcCompactChartData(
    dtUtc,
    geo,
    'true_citra',
    [],
    0,
    false,
    addExtras,
  );
  const chart = new Chart(chartData);
  chart.setAyanamshaItemByNum(27);
  return chart;
};
