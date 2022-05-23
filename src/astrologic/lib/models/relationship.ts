export class Relationship {
  natural = '';
  temporary = '';
  compound = '';

  constructor(inData: any = null) {
    if (inData instanceof Object) {
      const keys = Object.keys(inData);
      if (keys.includes('natural')) {
        this.natural = inData.natural;
      }
      if (keys.includes('temporary')) {
        this.temporary = inData.temporary;
      }
      if (keys.includes('compound')) {
        this.compound = inData.compound;
      }
    }
  }
}
