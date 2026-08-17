type LocaleDict = {[key:string]: string};
type LocaleData = {content:LocaleDict};
type LocaleDb = {[key:string]: LocaleData};

declare var LOCALES:LocaleDb;

type PluralFunction = (message:string, engine:Function) => string;

interface LocaleOptions {
  subPattern?: RegExp;
  plural?: PluralFunction;
};

class Locale {

  static recursionLimit = 3;
  static defaultOptions: LocaleOptions = {
    subPattern: /%([uUlLp]*){([^}]{1,128})}/g,
  }

  options: LocaleOptions;
  dict:LocaleDict;
  pluralOperation: PluralFunction;
  getFilter: Function;

  constructor(options:LocaleOptions = {}) {
    this.options = {
      ...Locale.defaultOptions,
      ...options
    };
  }

  // NOTE: Using '.substr(0, 1)' where a string output is a must, and `[0]` where `undefined` is OK.

  makeEngine(localeKey:string): Function {
    if (!(localeKey in LOCALES)) {
      throw new Error(`Missing locale '${localeKey}' in global LOCALES object.`);
    }

    this.dict = LOCALES[localeKey].content as LocaleDict;

    if (typeof this.options.plural === 'function') {
      this.pluralOperation = this.options.plural;
    } else {
      this.pluralOperation = (message:string, engine:Function) => Number(message) === 1 ? engine('_singular') : engine('_plural');
    }

    const engine = (key:string, innerDict:LocaleDict = {}, filterIds:string = '', recursionLimit:number = Locale.recursionLimit): string => {
      if (!key) { return ''; }
      const filters: Array<Function> = [];
      Array.from(filterIds).forEach((filterId) => {
        const filterMatch = this.getFilter(filterId);
        if (typeof filterMatch === 'function') {
          // NOTE: Filters are run inside out (closest to `{` first)
          filters.unshift(filterMatch);
        }
      });

      let message = key;
      if (key in innerDict) {
        message = innerDict[key];
      } else if (key in this.dict) {
        message = this.dict[key];
      }

      if (recursionLimit > 0) {
        message = message.replaceAll(this.options.subPattern, (match, filterIds, key) => engine(key, innerDict, filterIds, recursionLimit - 1));
      }

      if (filters.length > 0) {
        return filters.reduce((m, f) => f(m), message);
      }

      return message;
    };

    this.getFilter = (filterId:string): Function | null => {
      switch (filterId) {
        case 'u':
          return (message) => message.substr(0, 1).toUpperCase() + message.substr(1);
        case 'U':
          return (message) => message.toUpperCase();
        case 'l':
          return (message) => message.substr(0, 1).toLowerCase() + message.substr(1);
        case 'L':
          return (message) => message.toLowerCase();
        case 'p':
          return (message) => this.pluralOperation(message, engine);
      }
      return null;
    };

    return engine;
  }

}

const thisLocale = new Locale();
var lc = thisLocale.makeEngine('en-US');
// LATER Make user-configurable  #28fa073e-553f-4942-9f8f-26fcee173a44
