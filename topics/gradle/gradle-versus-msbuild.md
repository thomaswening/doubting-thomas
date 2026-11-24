---
title: Gradle versus MSBuild, for a .NET developer
area: gradle
created: 2026-11-09
updated: 2026-11-09
prerequisites: []
related: []
projects: [skip-the-fluff]
tags: [gradle, msbuild, nuget, kotlin, android, modules, packages, architecture-tests]
---

# Gradle versus MSBuild, for a .NET developer

## TL;DR

- **Gradle** is the build tool of Android (and of much of the Java and Kotlin world). It does the work of MSBuild and of NuGet restore together.
- A **build file** `build.gradle.kts` is a Kotlin script, the counterpart of a `.csproj`. `settings.gradle.kts` lists the modules of the build, like a `.sln`.
- The **wrapper** `gradlew` pins Gradle's version, as `global.json` pins the .NET SDK. The **version catalog** `gradle/libs.versions.toml` keeps library versions in one place, like `Directory.Packages.props`.
- A **Gradle module** is a folder with its own build file, like a project in a solution. It can use another module only if its build file declares the dependency, like a project reference.
- A **Kotlin package** is a namespace and sets no boundary: any file can import any package's public declarations.
- So rules between packages need **architecture tests** (Konsist in Kotlin, NetArchTest in .NET). Even modules can't forbid platform APIs such as `java.net`, which every module can reach.

## Key claims

- <a id="c1"></a>**C1.** Gradle both builds the code and downloads the libraries it depends on from repositories such as Google's Maven repository and Maven Central. In .NET these are MSBuild's and NuGet restore's jobs. Gradle has no separate restore step.
- <a id="c2"></a>**C2.** A `build.gradle.kts` file is a Kotlin script that Gradle compiles and runs, so it can hold real code. A `.csproj` is an XML file that MSBuild reads as data.
- <a id="c3"></a>**C3.** The Gradle wrapper (`gradlew`, `gradlew.bat` and the folder `gradle/wrapper/`) is committed with the code. It runs the Gradle version named in `gradle/wrapper/gradle-wrapper.properties` and downloads that version first if it is missing. `global.json` also pins a version, of the .NET SDK, but never downloads it.
- <a id="c4"></a>**C4.** A version catalog (by default `gradle/libs.versions.toml`) declares library and plugin versions for the whole build. Like a `PackageVersion` entry in `Directory.Packages.props`, an entry adds no dependency to any module. Each module still declares what it uses, as `implementation(libs.androidx.core.ktx)`.
- <a id="c5"></a>**C5.** A Gradle module (Gradle's own word is "project" or "subproject") is a folder with its own build file, listed by `include(...)` in `settings.gradle.kts`. Its .NET counterpart is a project in a solution.
- <a id="c6"></a>**C6.** A module can use code from another module only if its build file declares the dependency, as `implementation(project(":core"))`. The build fails otherwise, as in .NET without a `ProjectReference`.
- <a id="c7"></a>**C7.** A Kotlin package is a namespace. Any file can import the public declarations of any package in its module, as any C# file can `using` any namespace of its project. Kotlin has no package-level visibility: its narrowest scopes are the file (`private`) and the module (`internal`).
- <a id="c8"></a>**C8.** Kotlin's `internal` means "visible in the same module", where a module is a set of files compiled together, such as a Gradle source set. It is the counterpart of C#'s `internal`, which means "visible in the same assembly".
- <a id="c9"></a>**C9.** Rules about which package may use which (such as "the screens never import the web layer") are enforced only by architecture tests: unit tests that read the code's structure and fail on a broken rule. Konsist does this for Kotlin, NetArchTest for .NET.
- <a id="c10"></a>**C10.** Splitting code into modules can't forbid platform APIs, because every module compiles against the platform. Every Android module can import `java.net`, as every .NET project can use `HttpClient`. A rule like "only one part of the app talks to the network" therefore needs an architecture test even with modules.

## Explanation

### One tool for build and restore

In .NET, two tools share the build. NuGet restore reads the `PackageReference` items and downloads the packages. MSBuild then compiles. `dotnet build` runs both, but they remain two steps with two configurations. Gradle is one tool for both ([C1](#c1)). The build file names the libraries, and Gradle fetches them from the repositories listed in `settings.gradle.kts` before it compiles. A Maven repository plays the part of a NuGet feed: Google's repository (`google()`) holds the Android libraries, Maven Central (`mavenCentral()`) most of the others.

Android Studio builds every Android app with Gradle and Google's Android Gradle plugin. The plugin teaches Gradle how to turn Kotlin code and resources into an APK, the installable file, much as the Android workload teaches MSBuild in .NET for Android.

### Build files are programs

A `.csproj` is data: properties and items in XML that MSBuild evaluates. A `build.gradle.kts` is a Kotlin script ([C2](#c2)). Gradle compiles it and runs it to learn what to build. Most build files look declarative anyway, because they call functions with the same shape as `.csproj` entries. But a build file *can* compute things, for example derive Android's version number from the version string. In a `.csproj` the same takes a property function or an MSBuild task.

The files of a Gradle build line up with those of a .NET solution:

| Gradle | .NET | Holds |
|---|---|---|
| `settings.gradle.kts` | `.sln` (or `.slnx`) | which modules belong to the build; also the repositories |
| `build.gradle.kts` in the root | roughly `Directory.Build.props` | build-wide setup, such as the plugins the modules may apply |
| `app/build.gradle.kts` | `app/App.csproj` | one module's plugins, settings and dependencies |
| `gradlew` and `gradle/wrapper/` | `global.json` | the tool's version ([C3](#c3)) |
| `gradle/libs.versions.toml` | `Directory.Packages.props` | the library versions ([C4](#c4)) |

### The wrapper pins Gradle's version

`gradle-wrapper.properties` names one Gradle version in its `distributionUrl`. Running `./gradlew build` (or `gradlew.bat build` on Windows) instead of `gradle build` runs that version. If it isn't on the machine yet, the wrapper downloads it first ([C3](#c3)). So a fresh clone builds with nothing installed but a Java runtime. Every developer and every CI run uses the same Gradle.

`global.json` pins the .NET SDK in the same spirit. The difference: if the pinned SDK isn't installed, `dotnet` fails or rolls forward to another installed one, by the `rollForward` rule. It never downloads.

### The version catalog

`gradle/libs.versions.toml` is a TOML file, a simple `key = value` format with `[sections]`. Its sections are `[versions]`, `[libraries]`, `[bundles]` (groups of libraries used together) and `[plugins]`. Gradle reads it automatically and makes every entry available to build files as `libs.<alias>`. Dashes in the alias become dots: `androidx-core-ktx` is used as `libs.androidx.core.ktx`.

This is Central Package Management. In `Directory.Packages.props`, a `PackageVersion` sets the version, but a project uses the package only if it has its own `PackageReference`. In the same way, a catalog entry is an offer, not a dependency ([C4](#c4)). Each module still lists what it uses, without a version.

### A module is a project

A Gradle build with several modules is a multi-project build. Gradle calls each part a project or subproject, while Android Studio and its documentation call it a module. Each module is a folder with its own `build.gradle.kts`. `settings.gradle.kts` lists them, `include(":app", ":core")`, as a `.sln` lists its projects ([C5](#c5)).

A module sees another module's code only if its build file says so ([C6](#c6)):

```kotlin
// app/build.gradle.kts
dependencies {
    implementation(project(":core"))  // like <ProjectReference Include="..\Core\Core.csproj" />
}
```

Without that line, `app` can't import anything from `core`: the compiler doesn't find it. That makes modules a boundary the build checks. One difference from .NET: an `implementation` dependency is not passed on. If `app` uses `core` and `core` uses `util` by `implementation`, `app` can't use `util`'s classes. `api` instead of `implementation` passes it on. In SDK-style .NET projects, a `ProjectReference` is passed on by default.

Kotlin's `internal` follows the module too ([C8](#c8)): it hides a declaration from other modules, as C#'s `internal` hides it from other assemblies. Strictly, Kotlin's unit is the set of files compiled together, the Gradle source set. A module's `main` code is one source set and its tests another, with the exception that tests may see `main`'s `internal` declarations, as `InternalsVisibleTo` allows for a test project in .NET.

### A package is only a namespace

A Kotlin file starts with `package io.example.app.screens`, as a C# file starts with `namespace App.Screens;`. Like a namespace, the package groups names and avoids clashes. And like a namespace, it is not a wall ([C7](#c7)). Any file in the module can `import io.example.app.shell.Browser` if `Browser` is public, as any C# file can `using App.Shell;`. Kotlin has no package-private visibility (Java has, Kotlin dropped it). `private` at the top level of a file means "this file only". `internal` means "this module". There is nothing in between.

Package names and folders need not match in Kotlin, though the convention is that they do. C# is the same: a namespace is not tied to the folder.

### Why architecture tests, and not modules

Suppose an app should obey rules such as "the native screens never import the web layer" and "only the update checker talks to the network". With one module and one package per building block, nothing in the compiler stops a file from breaking them. An architecture test does ([C9](#c9)). It is an ordinary unit test that loads the code's structure (files, imports, calls) and asserts the rules. A broken rule fails the test run, so it fails the build. Konsist is such a library for Kotlin. NetArchTest (or ArchUnitNET) is the .NET counterpart.

One module per building block would turn the first kind of rule into a build error: `screens` simply wouldn't declare a dependency on the web layer. But it can't express the second kind ([C10](#c10)). Every Android module compiles against the Android platform, which includes Java's `java.net` and the WebView. A missing dependency line can't take those away. .NET is the same: every project targeting `net8.0` gets the whole shared framework, `HttpClient` included, and no `ProjectReference` can remove it. So the network rule needs an architecture test with or without modules. [Skip the Fluff](https://github.com/thomaswening/skip-the-fluff) chose one module for this reason ([ADR-0006](https://github.com/thomaswening/skip-the-fluff/blob/main/docs/adr/0006-structure-and-build.md)): most of its rules are about platform APIs, the tests are needed anyway, and every extra module costs a build file and build time.

## Examples

### A version catalog and the build file that uses it

```toml
# gradle/libs.versions.toml
[versions]
coreKtx = "1.15.0"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
```

```kotlin
// app/build.gradle.kts
dependencies {
    implementation(libs.androidx.core.ktx)  // the dashes of the alias become dots
}
```

The same in .NET, with Central Package Management:

```xml
<!-- Directory.Packages.props -->
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
  </PropertyGroup>
  <ItemGroup>
    <PackageVersion Include="Serilog" Version="4.1.0" />
  </ItemGroup>
</Project>

<!-- App/App.csproj: the reference, without a version -->
<ItemGroup>
  <PackageReference Include="Serilog" />
</ItemGroup>
```

In both, deleting the module's own line (`implementation(...)` or `PackageReference`) removes the dependency, although the central entry stays ([C4](#c4)).

### The pinned Gradle version

```properties
# gradle/wrapper/gradle-wrapper.properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.11.1-bin.zip
```

```json
// global.json
{ "sdk": { "version": "8.0.404", "rollForward": "latestFeature" } }
```

`./gradlew build` downloads Gradle 8.11.1 if needed. `dotnet build` with this `global.json` uses SDK 8.0.404 or a later installed 8.0 feature band, and fails if there is none ([C3](#c3)).

### A package rule as an architecture test

The rule "`screens` imports nothing from `shell`", written with NetArchTest in C# for comparison:

```csharp
[Fact]
public void Screens_do_not_depend_on_the_shell()
{
    var result = Types.InAssembly(typeof(App.Screens.MainScreen).Assembly)
        .That().ResideInNamespace("App.Screens")
        .ShouldNot().HaveDependencyOn("App.Shell")
        .GetResult();

    Assert.True(result.IsSuccessful);
}
```

A Konsist test in Kotlin states the same: take the files of package `..screens..` and assert that none imports from `..shell..`. Neither the compiler nor the build would catch the broken rule without such a test ([C9](#c9)).

## Pitfalls

- **Treating a package as a module.** One package per building block looks like a structure, but nothing enforces it. A rule without an architecture test is not enforced ([C7](#c7), [C9](#c9)).
- **Expecting modules to forbid everything.** A module boundary stops imports of *other modules*. It doesn't stop the platform's own APIs ([C10](#c10)).
- **Thinking a catalog entry adds a library.** It only names a version. Each module still needs its own `implementation(libs.…)` line ([C4](#c4)).
- **Running `gradle` instead of `./gradlew`.** An installed `gradle` may be a different version from the one the project pins. Always use the wrapper ([C3](#c3)).
- **Expecting a dependency of a dependency to be usable.** With `implementation`, it isn't, unlike a .NET `ProjectReference`, which is passed on by default.
- **Reading Kotlin's `internal` as "this package".** It means "this module", as C#'s `internal` means "this assembly" ([C8](#c8)).

## Sources

- Claude session on Skip the Fluff, 2026-11-09: [ADR-0006](https://github.com/thomaswening/skip-the-fluff/blob/main/docs/adr/0006-structure-and-build.md) and its review in [PR #13](https://github.com/thomaswening/skip-the-fluff/pull/13).
- Gradle: [Wrapper basics](https://docs.gradle.org/current/userguide/gradle_wrapper_basics.html), [The Gradle Wrapper](https://docs.gradle.org/current/userguide/gradle_wrapper.html), [Version catalogs](https://docs.gradle.org/current/userguide/version_catalogs.html), [Multi-project builds](https://docs.gradle.org/current/userguide/multi_project_builds.html), [`api` and `implementation`](https://docs.gradle.org/current/userguide/java_library_plugin.html#sec:java_library_separation), [Kotlin DSL primer](https://docs.gradle.org/current/userguide/kotlin_dsl.html).
- Android: [Configure your build](https://developer.android.com/build), [Add build dependencies](https://developer.android.com/build/dependencies).
- Kotlin: [Packages and imports](https://kotlinlang.org/docs/packages.html), [Visibility modifiers](https://kotlinlang.org/docs/visibility-modifiers.html), [Basic syntax](https://kotlinlang.org/docs/basic-syntax.html) (packages need not match folders).
- .NET: [Central Package Management](https://learn.microsoft.com/nuget/consume-packages/central-package-management), [global.json](https://learn.microsoft.com/dotnet/core/tools/global-json).
- Architecture tests: [Konsist](https://docs.konsist.lemonappdev.com/), [NetArchTest](https://github.com/BenMorris/NetArchTest).
