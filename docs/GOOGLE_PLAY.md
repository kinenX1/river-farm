# Getting The Sides of the River onto phones

There are four ways, from fastest to slowest.

## 0. The website (best first step)

One free service runs the website and the online server together.

1. Put the project on GitHub (`river-farm` repo).
2. Make an account at render.com (sign in with GitHub), then **New → Blueprint**
   and pick the repo. It reads `render.yaml`, builds the game and starts it.
3. After a few minutes you get an address like
   `https://sides-of-the-river.onrender.com`. That's the game. Send it to
   anyone: it works in any phone or computer browser, no sign-in.
4. On a phone, the browser menu has **Add to Home Screen** / **Install app**:
   the game then opens full-screen with its own icon, like a real app.

Render's free plan sleeps after 15 minutes with nobody playing; the first
visitor wakes it (about 30 seconds). Players and friend lists are kept on the
server's disk, which the free plan resets when it restarts; a paid plan ($7/mo)
or a database fixes that later. You can also connect your own domain name
(like `sidesoftheriver.com`) in Render's settings.

## 1. Today: share the game link

The claude.ai link works on phones in the browser, and friends who open it can
play online together (the "room" connection). Share it from the page's Share
menu. Friends need to be signed in to claude.ai. To be able to *host* a lobby a
player needs edit access; players with view access can still join.

## 2. This week: send friends the app file (APK)

No Play Store needed. Android installs it after the friend allows "install
unknown apps" for their browser or file manager.

1. Put the project on GitHub (`river-farm` repo).
2. Host the website + server (step 0 above) and copy its address.
3. In the GitHub repo: **Settings → Secrets and variables → Actions → Variables**,
   add `SERVER_URL` = the same address but starting with `wss://`.
4. Push to `main` (or run **Actions → Android build → Run workflow**).
5. When it finishes, open the run and download **the-sides-of-the-river-test-apk**.
   Send `app-debug.apk` to your friends (WhatsApp, Drive, Discord…).

Render's free server sleeps after 15 minutes alone; the first player to connect
wakes it (about 30 seconds).

## 3. Google Play

1. **Developer account**: play.google.com/console, pay the one-time $25, and
   verify your identity (ID). You must be 18+, or have a parent open the account.
2. **Signing key** (once, keep it safe forever; losing it means you can't update the app):
   ```bash
   keytool -genkey -v -keystore release.keystore -alias sides -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 release.keystore > keystore.txt
   ```
   In GitHub **Secrets** add `ANDROID_KEYSTORE_BASE64` (contents of keystore.txt),
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`sides`), `ANDROID_KEY_PASSWORD`.
   The next build also produces **the-sides-of-the-river-play-store-aab**.
3. **Create the app** in Play Console: name *The Sides of the River*, type Game,
   free.
4. **Store listing**: short and full description, a 512×512 icon, a 1024×500
   feature graphic, and at least 2 phone screenshots (landscape is fine).
5. **App content** forms: privacy policy URL (required, because players pick a
   name and play online), ads (none), content rating questionnaire, target
   audience, data safety (player name and ID are sent to your server).
6. **Testing first**: new personal developer accounts must run a **closed test
   with at least 12 testers for 14 days** before they can publish to everyone.
   Upload the `.aab` to *Testing → Closed testing*, add your friends' Google
   emails as testers, and they install it from the Play Store link. This is also
   the easiest way for friends to get it from the Play Store right away.
7. After the 14 days, **Production → Create release**, upload the same kind of
   `.aab`, and send it for review (usually a few days).

Every new version: bump `versionCode` in `client/android/app/build.gradle`,
push, download the new `.aab`, upload it as a new release.
