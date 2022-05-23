import { smartCastFloat } from "../../../lib/converters";
import { KeyNumValue } from "../../../lib/interfaces";
import { calcInclusiveDistance } from "../math-funcs";
import { Chart } from "../models/chart";

const kotaPaalaValues = [
  ["ve","ve","ve","mo"],
  ["mo","mo","mo","mo"],
  ["su","su","su","su"],
  ["su","mo","mo","mo"],
  ["mo","mo","ma","ma"],
  ["ma","ma","ma","ve"],
  ["ma","ma","mo","mo"],
  ["mo","mo","mo","me"],
  ["me","me","me","me"],
  ["sa","sa","sa","sa"],
  ["sa","me","me","me"],
  ["me","me","sa","sa"],
  ["sa","mo","me","me"],
  ["sa","sa","mo","mo"],
  ["mo","mo","mo","ju"],
  ["ju","ju","ju","ju"],
  ["ju","ju","ju","ju"],
  ["ju","mo","mo","mo"],
  ["mo","mo","sa","sa"],
  ["sa","ju","sa","me"],
  ["sa","sa","ve","ve"],
  ["ma","ma","ma","ma"],
  ["ma","ma","ma","ma"],
  ["ma","mo","mo","mo"],
  ["mo","mo","ju","ju"],
  ["ju","ju","ve","ve"],
  ["ju","ju","ve","ve"]
];

const padNakIndices = (deg: number): number[] => {
	const degPerNak = (360/27);
	const padaIndex = Math.floor(deg / (degPerNak / 4))  % 4;
	const nakIndex = Math.floor(deg / degPerNak);
	return [nakIndex, padaIndex];
}

export const matchKotaPala = (deg: number): string => {
	const [nakIndex, padaIndex] = padNakIndices(deg);
	return nakIndex < kotaPaalaValues.length && padaIndex < 4? kotaPaalaValues[nakIndex][padaIndex] : "";
}

export interface KotaScoreResult {
  score: number;
  offset: number;
  type: string;
}

export class KotaCakraScoreItem {

  direct = 0;

  retro = 0;

  constructor(inData = null) {
    if (inData instanceof Object) {
      Object.entries(inData).forEach(([k, v]) => {
        if (typeof v === 'number') {
          switch (k) {
            case "direct":
              this.direct = v;
              break;
            case "retro":
              this.retro = v;
              break;
          }
        }
      })
    } else if (typeof inData === 'number') {
      this.direct = inData;
      this.retro = inData;
    }
  }

  getValue(retro = false): number {
    return retro? this.retro : this.direct;
  }

}

export class KotaCakraScore {

  distance = 0;

  malefic = new KotaCakraScoreItem();

  benefic = new KotaCakraScoreItem();

  svami = new KotaCakraScoreItem();

  pala = new KotaCakraScoreItem();

  node = new KotaCakraScoreItem();

  constructor(inData = null, distance = 0) {
    this.distance = distance;
    if (inData instanceof Object) {
      Object.entries(inData).forEach(([k, v]) => {
        switch (k) {
          case "mal":
          case "malefic":
            this.malefic = new KotaCakraScoreItem(v);
            break;
          case "ben":
          case "benefic":
            this.benefic = new KotaCakraScoreItem(v);
            break;
          case "svami":
            this.svami = new KotaCakraScoreItem(v);
            break;
          case "pala":
            this.pala = new KotaCakraScoreItem(v);
            break;
          case "node":
            this.node = new KotaCakraScoreItem(v);
            break;
        }
      })
    }
  }
}

export const kotaGrahaKeys = ['su', 'mo', 'ma', 'me', 'ju', 've', 'sa', 'ra', 'ke'];

export class KotaCakraScoreSet {

  scores: KotaCakraScore[] = [];

  svamiOffsets: KeyNumValue[] = [];

  palaOffsets: KeyNumValue[] = [];

  malefics: string[] = [];

  benefics: string[] = [];

  offset = 0;

  constructor(inData = null) {
    if (inData instanceof Object) {
      
      Object.entries(inData).forEach(([k, v]) => {
        const key = k.toLowerCase();
        switch (key) {
          case 'scores':
            this.setScores(v);
            break;
          case 'svami_pala':
          case 'svamipala':
            this.setSvamiPala(v);
            break;
          case 'grahas':
          case 'graha':
            this.setMalBen(v);
            break;
          case 'offset':
            this.setOffset(v);
            break;
        }
      })
    }
  }

  setOffset(v = null) {
    this.offset = smartCastFloat(v, 0);
  }

  setScores(scores = null) {
    if (scores instanceof Array) {
      this.scores = scores.map((sc, si) => new KotaCakraScore(sc, si + 1));
    }
  }

  setSvamiPala(value = null) {
    if (value instanceof Object) {
      if (value.svami instanceof Object) {
        this.svamiOffsets = Object.entries(value.svami).map(([key,value]) => {
          return { 
            key,
            value: smartCastFloat(value)
          }
        })
      }
      if (value.pala instanceof Object) {
        this.palaOffsets = Object.entries(value.pala).map(([key,value]) => {
          return { 
            key,
            value: smartCastFloat(value)
          }
        })
      }
    }
  }

  setMalBen(value = null) {
    if (value instanceof Object) {
      if (value.ben instanceof Array) {
        this.benefics = value.ben;
      }
      if (value.mal instanceof Array) {
        this.malefics = value.mal;
      }
    }
  }

  svamiPalaOffset(key = '', svami = true): number {
    const rows = svami? this.svamiOffsets : this.palaOffsets;
    const row = rows.find(row => row.key === key);
    return row instanceof Object ? row.value : 0;
  }

  svamiOffset(key = ''): number {
    return this.svamiPalaOffset(key, true);
  }

  palaOffset(key = ''): number {
    return this.svamiPalaOffset(key, false);
  }

  calc(key = '', distance = 0, retro = false, svami = '', pala = ''): KotaScoreResult {
    const scoreRow = this.scores.find(sc => sc.distance === distance);
    let offset = 0;
    let base = 0;
    let type = '';
    if (scoreRow instanceof KotaCakraScore) {
      const isNode = ['ra', 'ke'].includes(key);
      const isPala = key === pala;
      const isSvami = key === svami;
      const isNotSpecial = !isNode && !isSvami && !isPala;
      const isMalefic = isNotSpecial && this.malefics.includes(key);
      const isBenefic = isNotSpecial && this.benefics.includes(key);
      if (isNode) {
        base = scoreRow.node.getValue(retro);
        type = "node";
      } else if (isPala) {
        base = scoreRow.pala.getValue(retro);
        offset = this.palaOffset(key);
        type = 'pala';
      } else if (isSvami) {
        base = scoreRow.svami.getValue(retro);
      offset = this.svamiOffset(key)
        type = 'svami';
      } else if (isBenefic) {
        type = 'benefic';
        base = scoreRow.benefic.getValue(retro);
      }  else if (isMalefic) {
        type = 'malefic';
        base = scoreRow.malefic.getValue(retro);
      }
    }
    const score = Math.round((base + offset) * 100) / 100;
    return { score, offset, type };
  }

  calcValue(key = '', distance = 0, retro = false, svami = '', pala = ''): number {
    return this.calc(key, distance, retro, svami, pala).score;
  }

}

const mapKotChakraScore = (key = '', transit: Chart, scoreSet: KotaCakraScoreSet, moonNakshatra = 0, separateSP = false, svami = '', pala = '') => {
  const currGr = transit.graha(key);
  const nakshatra = Math.round(currGr.nakshatra28);
  const distance = calcInclusiveDistance(nakshatra, moonNakshatra, 28);
  const retro = currGr.lngSpeed < 0;
  const svamiRef = separateSP ? '' : svami;
  const palaRef = separateSP ? '' : pala;
  
  const { score, offset, type} = scoreSet.calc(key, distance, retro, svamiRef, palaRef);
  return {
    key,
    nakshatra,
    distance,
    retro,
    score,
    offset,
    type
  }
}

export const calcKotaChakraScoreData = (birth: Chart, transit: Chart, scoreSet: KotaCakraScoreSet, separateSP = false) => {
  birth.setAyanamshaItemByKey('true_citra');
  transit.setAyanamshaItemByKey('true_citra');
  const pala = birth.kotaPala;
  const svami = birth.kotaSvami;

  const moonNakshatra = Math.round(birth.moon.nakshatra28);
  let specialScores: any[] = [];
  if (separateSP) {
    specialScores = [svami, pala].map(key => mapKotChakraScore(key, transit, scoreSet, moonNakshatra, false, svami, pala));
  }
  const coreScores = kotaGrahaKeys.map(key => mapKotChakraScore(key, transit, scoreSet, moonNakshatra, separateSP, svami, pala));
  const scores = [...specialScores, ...coreScores];
  const rawTotal = scores.map(sc => sc.score).reduce((a, b) => a + b, 0);
  const total = Math.round(rawTotal * 100) / 100 + scoreSet.offset;
  return {scores, total, moonNakshatra, svami, pala };
}



export const calcKotaChakraScoreSet = (birth: Chart, transit: Chart, ruleData = null, separateSP = false) => {
  const scoreSet = new KotaCakraScoreSet(ruleData);
  const data = calcKotaChakraScoreData(birth, transit, scoreSet, separateSP);
  return { ...data, scoreSet };
}

export default kotaPaalaValues;