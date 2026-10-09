# Language

EN, UK, and RU switch the product title, navigation, and coverage sentence. On Ukraine today the choice is also written into the `lang` query (`uk` or `ru`; English omits it). On Method and Constellation the choice is kept in the browser profile and is not put on the URL.

## Sub-features

- `lang-en` shows English copy and does not put `lang` on the Ukraine URL.
- `lang-uk` shows Ukrainian copy and `lang=uk` on the Ukraine URL.
- `lang-ru` shows Russian copy and `lang=ru` on the Ukraine URL.
- `lang-method` switches Method without adding `lang` to `/method`.

## How to get to it (user POV)

- Choose the `EN`, `UK`, or `RU` button in the header. The pressed button is the active language.
- Open Ukraine today with `?lang=uk` or `?lang=ru`.
- After switching on Ukraine today, open Method. The Method page follows the profile language.

## Driving it with verify-rassvet

Preconditions:

- Doctor reports the verification origin.
- Fresh English profile, or switch back to `EN` before starting.
- Button names stay `EN`, `UK`, and `RU` in every language.

- **English baseline.** Open the root. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open /`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --role heading --name "Rassvet over Ukraine"`. The URL does not contain `lang=`.
- **Ukrainian.** Choose UK. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser click --role button --name "UK" --wait-text "Рассвет над Україною"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --url-includes "lang=uk"`. The Primary link for Method reads `Метод`.
- **Russian.** Choose RU. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser click --role button --name "RU" --wait-text "Рассвет над Украиной"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --url-includes "lang=ru"`.
- **Back to English.** Choose EN. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser click --role button --name "EN" --wait-text "Rassvet over Ukraine"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser url`. The query does not contain `lang=`.
- **Method follows the profile.** Choose UK again with the UK click above, then open Method. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser click --role link --name "Метод"`. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --url-includes "/method"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser expect --text "Ця сторінка — договір."`. The Method URL does not contain `lang=`.
- **Proof.** Capture the Ukrainian Ukraine page before leaving it. Run `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open "/?lang=uk"` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser screenshot --path .cursor/skills/verify-rassvet/evidence/language/uk.png --full-page --feature language` and `.cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser snapshot --aria --path .cursor/skills/verify-rassvet/evidence/language/uk.aria.txt --feature language`. Both show `Рассвет над Україною`.

## Gotchas

- The language button names are always `EN`, `UK`, and `RU`. Do not look for `УК` or `РУ`.
- English omits `lang`. Assert the parameter only for `uk` and `ru`.
- Method and Constellation do not write `lang` into their URLs. A missing `lang` on `/method` is not proof that the page is English. Read the Method lede.
- The browser profile remembers the last language. A later feature that expects English must click `EN` or `browser open /` after cleanup created a new profile.
- `?lang=uk` on `/method` does not select Ukrainian by itself. Switch with the header button, or set the language on Ukraine today first so the profile stores it.
