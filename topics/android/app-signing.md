---
title: Android app signing
area: android
created: 2026-11-08
updated: 2026-11-08
prerequisites: []
related: [github/repository-access]
projects: [skip-the-fluff]
tags: [android, apk, signing, keys, certificates, key-rotation, security]
---

# Android app signing

## TL;DR

- Every Android app (APK) is signed with a private key. Android installs an **update** only if it is signed with the **same key** as the app already installed.
- The certificate is **self-signed**. No authority vouches for it. The key *is* the app's identity, so whoever holds it can publish as that app.
- A **lost** key means no more updates. Users must uninstall, which deletes the app's data, and install a new version signed with a new key. A **stolen** key lets someone else publish updates that Android accepts as genuine.
- **Key rotation** (APK Signature Scheme v3, Android 9 and later) lets a release say "this new key replaces the old one". Only the old key can sign that statement, so rotation helps against theft, not against loss.
- Publishing the certificate's **SHA-256 fingerprint** lets anyone check that an APK really comes from you.

## Key claims

- <a id="c1"></a>**C1.** Android installs an update over an installed app only if the update is signed with the same signing certificate, or with one the installed app's certificate has rotated to. Otherwise the installation fails, and the user can install the new APK only after uninstalling the old app, which deletes its data.
- <a id="c2"></a>**C2.** An Android signing certificate is normally self-signed. Android does not check it against a certificate authority. It only compares it with the certificate of the installed app.
- <a id="c3"></a>**C3.** If the signing key is lost and the app is not distributed through Google Play with Play App Signing, no further update can be installed over the existing installations. Nobody can recover the key.
- <a id="c4"></a>**C4.** Whoever holds a copy of the signing key can sign an APK that Android installs as an update of the app.
- <a id="c5"></a>**C5.** APK Signature Scheme v3, supported from Android 9 (API level 28), lets an app rotate to a new signing key. The new APK carries a proof of rotation signed with the old key, so rotation requires the old key to still be available.
- <a id="c6"></a>**C6.** Anyone can read the signing certificate of an APK, for example with `apksigner verify --print-certs`. Comparing its SHA-256 fingerprint with one the developer published shows whether the APK was signed by that developer.
- <a id="c7"></a>**C7.** Debug builds are signed with an automatically generated debug key, which is not the release key. An app installed from a debug build cannot be updated by a release build, or the other way round, without uninstalling it.

## Explanation

### The key is the app's identity

On Windows, a code-signing certificate is issued by a certificate authority. Windows trusts the publisher because the authority vouched for them. Android works differently. The developer creates a key pair and a certificate for it themselves ([C2](#c2)). Nobody vouches for it. Instead, Android remembers which certificate signed the app when it was first installed. Every update must be signed with the same one ([C1](#c1)).

So the key is not proof of *who* the developer is. It is proof that an update comes from *the same* developer as the first install. In .NET terms it is closer to a strong-name key, which ties versions of an assembly together, than to an Authenticode certificate.

### Losing the key versus having it stolen

The two failures are not mirror images:

- **Lost** ([C3](#c3)): the developer can no longer sign updates. Every user must uninstall, which deletes the app's data, such as a sign-in or settings, and install a new version signed with a new key. Google Play offers *Play App Signing*, where Google keeps the real signing key and the developer only holds a replaceable upload key. An app distributed elsewhere, such as through GitHub Releases, has no such safety net.
- **Stolen** ([C4](#c4)): someone else can sign an APK that Android accepts as a genuine update. They still have to get users to install it, for example with a fake download page.

Protection against loss means **backups**. Protection against theft means **few places** that hold the key, and **approval** before anything uses it. The two pull against each other: every backup is one more place to steal from.

### Rotation

APK Signature Scheme v3 adds a *proof of rotation* to the APK: a statement, signed with the old key, that a new key now speaks for the app ([C5](#c5)). Android 9 and later accept updates signed with the new key from then on. Rotation is the remedy for a stolen key: rotate, then announce it. It cannot help with a lost key, because only the old key can sign the statement.

### Checking an APK

The signing certificate is inside every APK and can be read by anyone ([C6](#c6)). Its fingerprint is a short hash that is easy to compare. A developer who publishes the fingerprint, in the README and on each release page, lets users and app stores check that an APK they downloaded is the real one.

### Debug and release keys

Android's build tools sign every debug build with a debug key that they create on the first build ([C7](#c7)). It is meant for testing only. A tester who installed a debug build must uninstall it before installing the release build.

## Examples

Creating a release key, a 4096-bit RSA key valid for 30 years in a PKCS 12 keystore. `keytool` comes with every JDK:

```text
keytool -genkeypair -v -storetype PKCS12 -keystore my-app-release.p12 -alias my-app -keyalg RSA -keysize 4096 -validity 10950 -dname "CN=My App"
```

Reading the certificate of an APK. `apksigner` comes with the Android SDK's build tools:

```text
apksigner verify --print-certs my-app-1.0.0.apk
```

Expected output, in part:

```text
Signer #1 certificate DN: CN=My App
Signer #1 certificate SHA-256 digest: 3f1a…c9e2
```

How [Skip the Fluff](https://github.com/thomaswening/skip-the-fluff) protects its key ([ADR-0005](https://github.com/thomaswening/skip-the-fluff/blob/main/docs/adr/0005-signing-key.md)):

- **Few places:** the key lives as a secret in a protected GitHub environment. A workflow signs each release there, and every run needs Thomas's approval.
- **Backups:** two copies off GitHub, because GitHub never shows a secret again once it is stored.
- **Checking:** the fingerprint is published.
- **Plans:** rotation if the key is stolen, a new key and a reinstall if it is lost.

## Pitfalls

- **Treating the key like a password that can be reset.** It cannot. Without Play App Signing, nobody holds a second copy unless you made one ([C3](#c3)).
- **Expecting rotation to rescue a lost key.** Rotation needs the old key ([C5](#c5)).
- **Releasing a debug build.** Users who install it cannot update to a release build without uninstalling ([C7](#c7)).
- **Keeping the only copy in CI.** A CI service's secret store usually cannot give a secret back, so it is not a backup.

## Exercises

1. **Explain.** A learner installed version 1.0 from GitHub. Version 1.1 is signed with a different key. What happens when they open the 1.1 APK, and what do they lose if they work around it?

   <details><summary>Solution</summary>

   Android refuses the update, because the certificate differs ([C1](#c1)). To install 1.1 they must uninstall 1.0 first, which deletes the app's data, such as their sign-in and settings.

   </details>

2. **Decide.** A developer finds their release key in a public paste. They still have their own copy. What should they do, and why would the same plan fail if they had no copy left?

   <details><summary>Solution</summary>

   Rotate to a new key with APK Signature Scheme v3, then announce it ([C5](#c5)). Rotation needs the old key to sign the proof of rotation. Without a copy they could only publish under a new key, and every user would have to reinstall ([C3](#c3)).

   </details>

## Sources

- Claude session on Skip the Fluff, 2026-11-08: [ADR-0005](https://github.com/thomaswening/skip-the-fluff/blob/main/docs/adr/0005-signing-key.md) and its review in [PR #9](https://github.com/thomaswening/skip-the-fluff/pull/9).
- Android Developers: [Sign your app](https://developer.android.com/studio/publish/app-signing).
- Android Open Source Project: [APK Signature Scheme v3](https://source.android.com/docs/security/features/apksigning/v3).
- Android Developers: [apksigner](https://developer.android.com/tools/apksigner).
