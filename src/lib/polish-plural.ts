const pluralRules = new Intl.PluralRules("pl-PL");

export type PolishPluralForms = {
  one: string;
  few: string;
  many: string;
};

export function polishPlural(count: number, forms: PolishPluralForms): string {
  const category = pluralRules.select(count);
  if (category === "one") {
    return forms.one;
  }
  if (category === "few") {
    return forms.few;
  }
  return forms.many;
}
