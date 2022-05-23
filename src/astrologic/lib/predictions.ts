import { GeoPos } from '../interfaces/geo-pos';
import { ProtocolSettings } from './interfaces';
import { Chart } from './models/chart';
import {
  Condition,
  matchKalanalaChandra,
  matchKotaChakra,
  matchShulaChakra,
  processByBirthSign,
  processTransitDashaRuleSet,
  processTransitMatch,
} from './models/protocol-models';

export const processTransitRuleSet = async (
  cond: Condition,
  chart: Chart,
  geo: GeoPos,
  settings: ProtocolSettings,
) => {
  const [fromCat, subType] = cond.fromMode.split('_');
  const refCat = cond.matchBirthSign ? 'birth_asc' : fromCat;
  switch (refCat) {
    case 'birth_asc':
      return processByBirthSign(cond, chart);
    case 'level':
      return await processTransitDashaRuleSet(
        cond,
        parseInt(subType, 10),
        chart,
        settings,
      );
    case 'transit':
      return await processTransitMatch(cond, chart, geo, settings);
    default:
      return { valid: false };
  }
};

export const processPredictiveRuleSet = async (
  cond: Condition,
  ruleType = '',
  chart: Chart,
  geo: GeoPos,
  settings: ProtocolSettings
) => {
  const result: any = { valid: false, start: null, end: null, score: 0 };
  switch (ruleType) {
    case 'transit':
      return await processTransitRuleSet(cond, chart, geo, settings);
    case 'kota':
      return matchKotaChakra(cond, chart);
    case 'shula':
      return matchShulaChakra(cond, chart);
    case 'kalanala':
    case 'chandra_kalanala':
      return matchKalanalaChandra(cond, chart, geo);
    default:
      return result;
  }
};
