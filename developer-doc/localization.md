# Localization

To translate Interactives available in this site, first please see related Lab Framework docs:

[Localization: Interactives localization](https://github.com/concord-consortium/lab/blob/master/developer-doc/localization.md#interactives-localization)

Although Lab Framework doesn't require it, we follow a few conventions related to files locations:

- Localized Interactives, models and resources should be stored in `locales/<lang-code>` directory.
- Paths of the localized files should be equal to original ones with `locales/<lang-code>` prefix.
  For example:

  - original, English Interactive: `interactives/samples/1-oil-and-water-shake.json`
  - Polish translation: `locales/pl/interactives/samples/1-oil-and-water-shake.json`
  - Spanish translation: `locales/es/interactives/samples/1-oil-and-water-shake.json`

- Internationalization metadata files should be stored in `locales/metadata/` directory.
- Paths of internationalization metadata files should be equal to paths of the original
  Interactives with `locales/metadata/` prefix. For example:

  - original, English Interactive: `interactives/samples/1-oil-and-water-shake.json`
  - related i18n metadata: `locales/metadata/interactives/samples/1-oil-and-water-shake.json`

There are existing translation examples in the repository which can be used as a reference.
