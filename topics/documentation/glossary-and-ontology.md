---
title: Glossary and ontology
area: documentation
created: 2026-10-25
updated: 2026-10-25
prerequisites: []
related: [documentation/diataxis]
projects: [tante]
tags: [glossary, ontology, skos, owl, rdf, controlled-vocabulary]
---

# Glossary and ontology

## TL;DR

- A **glossary** defines terms in prose for people. An **ontology** writes concepts and their relations in a formal language that programs can read.
- **SKOS** (W3C, 2009) is the light option: concepts with labels, definitions and *broader*, *narrower* and *related* links.
- **OWL** is the heavy option: classes and logical axioms that a **reasoner** can draw conclusions from and check for contradictions.
- SKOS's *broader* is a loose hierarchy, not "is a subclass of". Only OWL says "every RATFUN is a coefficient" in a way a machine can check.
- An ontology pays off when a **program reads the vocabulary**, when it is **too large to follow by eye**, or when **several projects or languages share it**. Before that it is cost without a reader.
- A glossary with **fixed labels** (Kind of, See also) can be converted to SKOS later by a short script, so nothing is lost by waiting.

## Key claims

- <a id="c1"></a>**C1.** A glossary is written for human readers, as prose definitions. An ontology states concepts and their relations in a formal, machine-readable language.

- <a id="c2"></a>**C2.** SKOS (Simple Knowledge Organization System) became a W3C Recommendation in 2009. It describes vocabularies as concepts with labels (`skos:prefLabel`, `skos:altLabel`), documentation (`skos:definition`, `skos:scopeNote`) and relations (`skos:broader`, `skos:narrower`, `skos:related`).

- <a id="c3"></a>**C3.** `skos:broader` states a hierarchical link with no formal meaning beyond that. It is not a subclass relation. It is not transitive either: `skos:broaderTransitive` is the property that covers indirect links.

- <a id="c4"></a>**C4.** SKOS's mapping properties (`skos:exactMatch`, `skos:closeMatch`, `skos:broadMatch`, `skos:narrowMatch`, `skos:relatedMatch`) link concepts in different vocabularies. This is what makes a SKOS vocabulary shareable across projects.

- <a id="c5"></a>**C5.** OWL (Web Ontology Language) defines classes, properties and axioms such as `rdfs:subClassOf` and `owl:disjointWith`. A reasoner uses them to infer new facts and to detect contradictions.

- <a id="c6"></a>**C6.** SKOS and OWL are both written in RDF, as subject–predicate–object triples, often in the Turtle syntax.

- <a id="c7"></a>**C7.** An ontology pays off when a program consumes the vocabulary, when the vocabulary is too large for people to keep consistent, or when it must be shared or mapped across projects or languages. A small glossary read only by people gains nothing from one.

- <a id="c8"></a>**C8.** If every glossary relation uses a fixed label, the glossary can be converted to SKOS by a script, so choosing a glossary now does not rule out an ontology later.

## Explanation

### Two readers

A glossary and an ontology answer the same question, "what does this word mean, and how does it relate to others?", for different readers ([C1](#c1)). A glossary entry is a sentence for a person: "RATFUN: a coefficient that is a rational function." An ontology states the same thing as data for a program, e.g. "`ratfun` has broader concept `coefficient`". The program can then answer questions nobody wrote down, such as "list everything that is a kind of coefficient".

In .NET terms, a glossary is like XML doc comments: helpful, but the compiler ignores them. An ontology is like the type hierarchy itself, which tools can query and check.

### SKOS: a vocabulary with links

SKOS ([C2](#c2)) was made for thesauri, library subject headings and taxonomies: vocabularies that people maintain and programs read. Each term becomes a *concept*. It has one preferred label per language, any number of alternative labels, a definition and links to other concepts.

Its hierarchy is deliberately loose ([C3](#c3)). `skos:broader` says only that one concept sits above another, in whatever sense the vocabulary's authors meant. "Wheel" can have broader concept "car" (part of) as well as "RATFUN" broader "coefficient" (kind of). This looseness makes SKOS easy to adopt. Its price is that a program can't conclude much: no inheritance, no contradictions.

SKOS's strength is sharing ([C4](#c4)). With `skos:exactMatch`, Tante's concept "coefficient" can be declared the same as PartonForge's, or as an entry in a public mathematics vocabulary. Programs can then join the vocabularies.

### OWL: logic you can check

OWL ([C5](#c5)) treats terms as classes with formal meaning. `:RatFun rdfs:subClassOf :Coefficient` means every RATFUN *is* a coefficient, with all the consequences. If `:Coefficient owl:disjointWith :Symbol` is also stated, a reasoner concludes that no RATFUN is a symbol. It reports a contradiction if someone declares one that is. That is the compiler-like checking a glossary can't give. It costs modelling effort and a tool chain (an editor such as Protégé, a reasoner), plus people who can read OWL.

### When it pays off

Neither SKOS nor OWL helps a reader who reads only prose ([C7](#c7)). They pay off when:

- **a program reads the vocabulary**: a documentation generator that links terms automatically, a language server that shows definitions on hover, a search that finds synonyms;
- **the vocabulary is too large to follow by eye**, so that inconsistencies (a cycle of *kind of*, two terms for one concept) slip through review;
- **several projects or languages share it**, so that mappings ([C4](#c4)) or labels in several languages are needed.

Until then, a glossary is the right tool. Writing its relations with fixed labels keeps the door open ([C8](#c8)): "Kind of" maps to `skos:broader`, "See also" to `skos:related`. SKOS has no property for "Not to be confused with". A conversion would put it in a `skos:scopeNote` or define a property of its own.

### RDF in one paragraph

Both are written in RDF ([C6](#c6)): every fact is a triple of subject, predicate and object, e.g. `:ratfun skos:broader :coefficient .` Names are URIs, abbreviated by prefixes. Turtle is the most readable syntax for writing triples by hand.

## Examples

### The same entry three ways

A glossary entry, as in [Tante](https://github.com/thomaswening/Tante)'s `docs/glossary.md`:

```markdown
<a id="ratfun"></a>**RATFUN** *(project)*: a coefficient that is a rational function.

- Kind of: [coefficient](#coefficient)
- See also: [rational function](#rational-function)
```

The same in SKOS, in Turtle:

```turtle
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix : <https://github.com/thomaswening/Tante/blob/main/docs/glossary.md#> .

:ratfun a skos:Concept ;
    skos:prefLabel "RATFUN"@en ;
    skos:definition "a coefficient that is a rational function."@en ;
    skos:broader :coefficient ;
    skos:related :rational-function .
```

The same in OWL, which says more: every RATFUN is a coefficient, and no coefficient is a symbol.

```turtle
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix : <https://example.org/tante#> .

:RatFun      a owl:Class ; rdfs:subClassOf :Coefficient .
:Coefficient a owl:Class ; owl:disjointWith :Symbol .
:Symbol      a owl:Class .
```

### Converting fixed labels to SKOS

A C# file-based program (`dotnet run GlossaryToSkos.cs`, .NET 10) that turns glossary entries into SKOS triples. It works only because the labels are fixed ([C8](#c8)).

```csharp
using System.Text.RegularExpressions;

var glossary = """
    <a id="coefficient"></a>**coefficient** *(domain)*: the factor of a term that is not a symbol or function.

    <a id="ratfun"></a>**RATFUN** *(project)*: a coefficient that is a rational function.

    - Kind of: [coefficient](#coefficient)
    - See also: [rational function](#rational-function)
    """;

var entry = new Regex(@"<a id=""([^""]+)""></a>\*\*(.+?)\*\* \*\((\w+)\)\*: (.+)");
var label = new Regex(@"- (Kind of|See also): (.+)");
var property = new Dictionary<string, string>
{
    ["Kind of"] = "skos:broader",
    ["See also"] = "skos:related",
};

string? current = null;
foreach (var line in glossary.Split('\n'))
{
    var e = entry.Match(line);
    var l = label.Match(line);
    if (e.Success)
    {
        current = e.Groups[1].Value;
        Console.WriteLine($":{current} a skos:Concept ;");
        Console.WriteLine($"    skos:prefLabel \"{e.Groups[2].Value}\"@en ;");
        Console.WriteLine($"    skos:definition \"{e.Groups[4].Value.TrimEnd()}\"@en .");
    }
    else if (l.Success && current is not null)
    {
        foreach (Match target in Regex.Matches(l.Groups[2].Value, @"\(#([^)]+)\)"))
            Console.WriteLine($":{current} {property[l.Groups[1].Value]} :{target.Groups[1].Value} .");
    }
}
```

Output (run on .NET 10.0.401):

```text
:coefficient a skos:Concept ;
    skos:prefLabel "coefficient"@en ;
    skos:definition "the factor of a term that is not a symbol or function."@en .
:ratfun a skos:Concept ;
    skos:prefLabel "RATFUN"@en ;
    skos:definition "a coefficient that is a rational function."@en .
:ratfun skos:broader :coefficient .
:ratfun skos:related :rational-function .
```

## Pitfalls

- **Reading `skos:broader` as "is a".** It also covers "part of" and any other hierarchy ([C3](#c3)). Only OWL's `rdfs:subClassOf` means "is a" with consequences.
- **Assuming `skos:broader` chains.** If A is broader than B and B broader than C, SKOS does not state that A is broader than C. That is `skos:broaderTransitive`.
- **Building the ontology first.** Without a program that reads it, an ontology is a second copy of the glossary that drifts ([C7](#c7)).
- **Free-text relations.** "Related to coefficient, sort of" can't be converted by a script. Fixed labels can ([C8](#c8)).

## Sources

- Claude session on Tante, 2026-10-25: decision G4 (relations Kind of, See also, Not to be confused with; no ontology yet), applied in Tante's glossary, pull request [#7](https://github.com/thomaswening/Tante/pull/7).
- W3C, [SKOS Simple Knowledge Organization System Reference](https://www.w3.org/TR/skos-reference/) (Recommendation, 18 August 2009).
- W3C, [OWL 2 Web Ontology Language Primer](https://www.w3.org/TR/owl2-primer/).
- W3C, [RDF 1.1 Turtle](https://www.w3.org/TR/turtle/).
