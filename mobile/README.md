# Cedarville Learning — Android app

This folder wraps the web app (`site/app`) in a native Android shell with
[Capacitor](https://capacitorjs.com). There is **one codebase**: change the web
app, run `npm run sync`, and the Android app updates too.

> Not built or tested in this repo's setup — building an Android app needs
> Android Studio on your own computer. Follow the steps below.

## One-time setup (your computer)

1. Install **Node 18+**, **Android Studio** (it brings the Android SDK) and **JDK 17**.
2. Make sure the API is live (see `../LAUNCH-GUIDE.md`) and that
   `site/app/config.js` → `NATIVE_API_BASE` is the real address, e.g.
   `https://api.repurposekey.com/api`.
3. In this folder:
   ```bash
   npm install
   npx cap add android      # creates the android/ project (once)
   npm run sync             # copies the web app in
   npm run open             # opens Android Studio
   ```
4. In Android Studio press ▶ to run on a phone or emulator.

## Before you upload to Google Play

- **Package name** `com.repurposekey.cedarlearning` (in `capacitor.config.json`) is permanent once
  published. Change it now if you want something else.
- **Icon:** replace the launcher icons in Android Studio (*File → New → Image Asset*). The school logo
  provided is only 150×150 px; Play Store needs a sharp 512×512 icon.
- **Release build:** *Build → Generate Signed Bundle (AAB)*. **Keep the keystore file and its passwords
  safe** — lose them and you can never update the app.
- **Play Console** needs a privacy-policy URL (use `https://<your-site>/app/privacy.html` after the
  school has reviewed it), the **Data safety** form, a **content rating** questionnaire, and the
  **Target audience: children** declaration. Declaring children means Google's **Families Policy** applies
  (no behavioural ads, only approved ad/analytics SDKs, accurate data-safety answers).
- New personal developer accounts must complete Google's **closed testing** requirement (a number of
  testers over a number of weeks) before production — check the current rules in Play Console.

## Payments inside the Android app — read this first

Google Play generally requires **Google Play Billing** for digital subscriptions sold *inside* an app
distributed on Play. The Paystack checkout in this project is fine for the **website**. For the Android
app you have two safe options:

1. **Launch the app free** (daily quiz + limited practice) and let parents subscribe on the website; or
2. Integrate Google Play Billing for the Android build (extra work: a Capacitor billing plugin plus a
   server endpoint to verify purchases).

Check Google's current "Payments" policy and any Nigeria-specific alternatives before choosing; the rules
change. Don't ship an in-app Paystack button to Play without confirming it is allowed.
