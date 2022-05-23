import { zeroPad } from "../../lib/converters";
import { SynastryAspectMatch } from "./interfaces";

const synastryAspectPairs = [
  [ 'as', 'as' ], [ 'as', 'su' ], [ 'as', 'mo' ],
  [ 'as', 'me' ], [ 'as', 've' ], [ 'as', 'ma' ],
  [ 'as', 'ju' ], [ 'as', 'sa' ], [ 'as', 'ur' ],
  [ 'as', 'ne' ], [ 'as', 'pl' ], [ 'su', 'su' ],
  [ 'mo', 'mo' ], [ 'me', 'me' ], [ 've', 've' ],
  [ 'ma', 'ma' ], [ 'su', 'mo' ], [ 'su', 'me' ],
  [ 'su', 've' ], [ 'su', 'ma' ], [ 'su', 'ju' ],
  [ 'su', 'sa' ], [ 'su', 'ur' ], [ 'su', 'ne' ],
  [ 'su', 'pl' ], [ 'ma', 'ju' ], [ 'ma', 'sa' ],
  [ 'ma', 'ur' ], [ 'ma', 'ne' ], [ 'ma', 'pl' ],
  [ 've', 'ma' ], [ 've', 'ju' ], [ 've', 'sa' ],
  [ 've', 'ur' ], [ 've', 'ne' ], [ 've', 'pl' ],
  [ 'mo', 'me' ], [ 'mo', 've' ], [ 'mo', 'ma' ],
  [ 'mo', 'ju' ], [ 'mo', 'sa' ], [ 'mo', 'ur' ],
  [ 'mo', 'ne' ], [ 'mo', 'pl' ], [ 'me', 've' ],
  [ 'me', 'ne' ], [ 'me', 'ma' ], [ 'me', 'ju' ],
  [ 'me', 'sa' ], [ 'me', 'ur' ], [ 'me', 'pl' ]
]

export const matchSynastrySnippetKey = (k1: string, k2: string, deg = 0) => {
  const degKey = zeroPad(deg, 3);
  let first = true;
  let keyIndex = synastryAspectPairs.findIndex(pair => pair[0] === k1 && pair[1] === k2);
  if (keyIndex < 0 ) {
    keyIndex = synastryAspectPairs.findIndex(pair => pair[0] === k2 && pair[1] === k1);
    first = keyIndex < 0;
  }
  const matched = keyIndex >= 0;
  const pair = matched ? synastryAspectPairs[keyIndex] : [];
  const key = matched? [pair[0], degKey, pair[1]].join('_') : '';
  return { 
    key,
    first,
    matched
  };
}

export const addSnippetKeyToSynastryAspectMatches = (aspects: SynastryAspectMatch[] = [], ak1Name = 'p1', ak2Name = 'p2' ): SynastryAspectMatch[] => {
  return aspects.map(asp => {
    const snip = matchSynastrySnippetKey(asp.k1, asp.k2, asp.deg);
    const { key, first } = snip;
    const ak1 = first? ak1Name : ak2Name;
    const ak2 = first? ak2Name : ak1Name;
    return { ...asp, key, ak1, ak2, first: first? 1 : 2 };
  })
}