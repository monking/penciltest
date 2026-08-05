/// <reference path="locale/en-US.locale.js">
type LocaleDict = {[key:string]: string};
type LocaleData = {content:LocaleDict};
type LocaleDb = {[key:string]: LocaleData};

declare var LOCALES:LocaleDb;

interface LocaleOptions {
  subPattern?: RegExp;
};

class Locale {

  static recursionLimit = 3;
  static defaultOptions: LocaleOptions = {
    subPattern: /%%(?<key>[^%]{1,128})%%/,
  }

  options: LocaleOptions;

  dict:LocaleDict;

  constructor(options:LocaleOptions = {}) {
    this.options = {
      ...Locale.defaultOptions,
      ...options
    };
  }

  makeEngine(localeKey:string): Function {
    if (!(localeKey in LOCALES)) {
      throw new Error(`Missing locale '${localeKey}' in global LOCALES object.`);
    }

    this.dict = LOCALES[localeKey].content as LocaleDict;

    const engine = (key:string, substitution:{[key:string]: string} | null, subDepth:number = 0): string => {
      const dict = subDepth === 0 ? { ...this.dict, ...substitution } : substitution;
      const keyExists = key in dict;
      const message = keyExists ? dict[key] : key;
      if (substitution) {
        return message.replace(this.options.subPattern, (match, groups) => engine(groups.key, substitution ? dict : substitution, subDepth + 1));
      }
      if (keyExists || subDepth === 0) {
        return message;
      }
      return '(?)';
    };

    return engine;
  }

}

const thisLocale = new Locale();
const lc = thisLocale.makeEngine('en-US');
