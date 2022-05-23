export class BaseObject {
  toObject() {
    const entries = Object.entries(this)
      .filter(entry => entry[0].startsWith('_') === false)
      .map(entry => {
        const [k, v] = entry;
        if (v instanceof Function && v.length < 1) {
          return [k, v()];
        } else {
          return entry;
        }
      });
    return Object.fromEntries(entries);
  }

  toJSON() {
    const jsonObj = Object.assign({}, this);
    const proto = Object.getPrototypeOf(this);
    for (const key of Object.getOwnPropertyNames(proto)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      const hasGetter = desc && typeof desc.get === 'function';
      if (hasGetter) {
        jsonObj[key] = this[key];
      }
    }
    return jsonObj;
  }
}
