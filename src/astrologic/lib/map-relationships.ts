import maitriData from './settings/maitri-data';
import { calcInclusiveTwelfths } from './math-funcs';
import { Relationship } from './models/relationship';

export const mapRelationships = (
  sign = 0,
  rulerSign = 0,
  isOwnSign = false,
  natRel: string,
) => {
  const numSteps = calcInclusiveTwelfths(sign, rulerSign);
  const isTempFriend = maitriData.temporary.friend.includes(numSteps);
  const isTempEnemy = maitriData.temporary.enemy.includes(numSteps);
  const relationship = new Relationship();
  relationship.natural = natRel;
  relationship.temporary = isTempFriend
    ? 'friend'
    : isTempEnemy
    ? 'enemy'
    : 'neutral';
  const { natural, temporary } = relationship;
  const compoundMatches = Object.entries(maitriData.compound).map(entry => {
    const [key, vals] = entry;
    return {
      key,
      values: vals.map(
        cv => cv.natural === natural && cv.temporary === temporary,
      ),
    };
  });
  const compoundKeys = compoundMatches
    .filter(cm => cm.values.some(v => v))
    .map(cm => cm.key);
  relationship.compound =
    compoundKeys.length > 0 ? compoundKeys[0] : isOwnSign ? 'ownSign' : '';
  return relationship;
};
