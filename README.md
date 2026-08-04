<img src="https://capsule-render.vercel.app/api?type=venom&height=300&color=006fff&text=talemods.com&fontColor=ffffff&stroke=000000&strokeWidth=5"/>
The official website of TaleMods built with plain HTML, CSS and vanilla JavaScript modules.

## Design

The interface, which we call **TaleUI**, has been built and refined over a long time (mostly inspired by the HarmonyOS design language).

## Contributing a Translation

Translations are in JSON files, so you can add a language without touching any code.
1. Add the language to `src/i18n/languages.json`, mapping its code to its native name:

   ```json
   {
     "en": "English",
     "tr": "Türkçe",
     "ru": "Русский",
     "de": "Deutsch"
   }
   ```

2. Add the same language code to each string in the translation files under `src/i18n/`. Every entry is keyed by language, and English is used as the fallback:

   ```json
   {
     "hero.callToAction": {
       "en": "Our Products",
       "tr": "Ürünlerimiz",
       "ru": "Наши продукты",
       "de": "Unsere Produkte"
     }
   }
   ```

## Our Socials
- [Telegram](https://t.me/talemods)
- [Discord](https://discord.gg/tsmod)
