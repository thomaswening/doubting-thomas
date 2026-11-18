---
title: AES-GCM and authenticated encryption
area: cryptography
created: 2026-11-18
updated: 2026-11-18
prerequisites: []
related: [cryptography/password-key-derivation]
projects: []
tags: [cryptography, aes, gcm, aead, nonce, authentication-tag, aesgcm]
---

# AES-GCM and authenticated encryption

## TL;DR

- **AES** encrypts one 16-byte block with a key. To encrypt data of any length you need a **mode**. **GCM** (Galois/Counter Mode) is the mode to use by default: it encrypts *and* computes a 16-byte **authentication tag** that detects any change to the ciphertext.

- That makes it **authenticated encryption**: decryption either returns exactly the original bytes or throws. A wrong key, a flipped bit or a cut-off file all end in `AuthenticationTagMismatchException`, never in garbage.

- Each encryption needs a 12-byte **nonce** (number used once). It is not secret and is stored with the ciphertext, but it must **never repeat under the same key**. A repeated nonce lets an attacker combine the two ciphertexts and recover plaintext without the key.

- **Associated data** is authenticated but not encrypted. A file header (version, KDF parameters, salt) goes in there: readable by anyone, changeable by no one.

- In .NET: `new AesGcm(key, tagSizeInBytes: 16)`, then `Encrypt(nonce, plaintext, ciphertext, tag, associatedData)` and `Decrypt(nonce, ciphertext, tag, plaintext, associatedData)`.

## Key claims

- <a id="c1"></a>**C1.** AES is a block cipher: with a 128-, 192- or 256-bit key it encrypts exactly one 16-byte block. A **mode of operation** defines how to encrypt longer data with it. GCM is a mode that turns AES into a stream: the ciphertext is as long as the plaintext.

- <a id="c2"></a>**C2.** GCM is an **authenticated encryption with associated data** (AEAD) mode. Encryption outputs the ciphertext and an authentication tag computed over the ciphertext and the associated data. Decryption recomputes the tag and fails if it differs, so any change to ciphertext, tag, nonce or associated data, and any wrong key, is detected.

- <a id="c3"></a>**C3.** In .NET, `AesGcm.Decrypt` throws `AuthenticationTagMismatchException` (a `CryptographicException`, since .NET 8) when the tag doesn't verify, and clears the plaintext buffer. The caller never receives unverified plaintext.

- <a id="c4"></a>**C4.** GCM needs a nonce for every encryption. .NET's `AesGcm` supports only 12-byte nonces. The nonce doesn't need to be secret and is stored next to the ciphertext. It must never be used twice with the same key.

- <a id="c5"></a>**C5.** If two messages are encrypted with the same key and nonce, the XOR of their ciphertexts equals the XOR of their plaintexts. Knowing one plaintext then reveals the other, without the key. Nonce reuse also lets an attacker forge valid tags.

- <a id="c6"></a>**C6.** Random 12-byte nonces are safe as long as one key encrypts no more than about $2^{32}$ messages. Beyond that, the chance of a repeated nonce grows too large.

- <a id="c7"></a>**C7.** **Associated data** is passed to both `Encrypt` and `Decrypt`, is covered by the tag, but is not encrypted and not stored by GCM. A file format puts its header there, so the header stays readable but can't be changed undetected.

- <a id="c8"></a>**C8.** Unauthenticated modes such as CBC detect no tampering. An attacker who can submit modified ciphertexts and observe whether decryption fails can, in many designs, recover the plaintext (a **padding oracle** attack). That is why authenticated encryption is the default.

## Explanation

### From a block cipher to a mode

AES is a function: 32 key bytes and 16 input bytes in, 16 scrambled bytes out ([C1](#c1)). That's all. A password store is longer than 16 bytes, so something must decide how to apply AES to many blocks. That is the **mode**.

The naive mode, encrypting each block on its own (ECB), leaks patterns: equal plaintext blocks give equal ciphertext blocks. Real modes mix in a varying value. GCM uses **counter mode**: it encrypts the numbers *nonce‖1*, *nonce‖2*, *nonce‖3*, … with AES and XORs the results, the **keystream**, onto the plaintext.

```mermaid
flowchart LR
    n["nonce ‖ counter 1, 2, 3, …"] --> aes["AES with the key"]
    aes --> ks["keystream"]
    ks --> x(("XOR"))
    p["plaintext"] --> x
    x --> c["ciphertext<br/>(same length as the plaintext)"]
    c --> gh["GHASH with a key derived from the AES key"]
    ad["associated data<br/>(the file header)"] --> gh
    gh --> tag["16-byte tag"]
```

### The tag: encryption you can trust

Counter mode alone hides the data but protects nothing else. Flip bit 5 of the ciphertext, and bit 5 of the plaintext flips at decryption, silently. An attacker who knows where the password sits in the file can change it without knowing it.

GCM adds an **authentication tag** ([C2](#c2)). After encrypting, it computes a keyed checksum (GHASH) over the ciphertext and the associated data, and stores the 16-byte result. A .NET comparison: like a hash you'd store to detect a corrupt download, except that it is keyed. Without the key, an attacker can't compute a matching tag for modified data.

At decryption, `AesGcm` recomputes the tag. If it differs, it throws `AuthenticationTagMismatchException` and clears the output buffer ([C3](#c3)). This gives a password store two things at once:

- **Tampering is detected.** A flipped bit anywhere fails.
- **A wrong password is detected.** A wrong password gives a wrong key, which gives a wrong tag. No separate "password check" value needs storing.

### The nonce: once, really once

Counter mode's keystream depends only on the key and the nonce. Use the same pair twice, and you get the same keystream twice ([C4](#c4)). Then for two ciphertexts:

```math
C_1 \oplus C_2 = (P_1 \oplus K) \oplus (P_2 \oplus K) = P_1 \oplus P_2
```

The keystream $K$ cancels. An attacker who knows or guesses one plaintext gets the other ([C5](#c5)). The example below does exactly that. It also breaks the tag: from two messages under one nonce, an attacker can work out GHASH's key and then forge tags for messages of their choice.

How to get unique nonces:

- **Random:** 12 bytes from `RandomNumberGenerator` at every encryption. Two random 96-bit values collide only rarely, as long as one key doesn't encrypt more than about $2^{32}$ messages ([C6](#c6)). A password store saved a few times a day is billions of saves away from that.
- **New key per encryption:** if each save also draws a new salt, the KDF gives a new key, and the nonce only has to be unique under that one key.

The nonce isn't secret. It's stored in the file, like the salt.

### Associated data: the header

A store file starts with a header: a format marker, the KDF's iteration count, the salt, the nonce. The reader needs these *before* it can decrypt, so they can't be encrypted. But they must not be changeable either: an attacker who lowers the iteration count in the header would make the next save weaker.

That is what **associated data** is for ([C7](#c7)). You pass the header bytes to `Encrypt` and `Decrypt` as `associatedData`. GCM doesn't encrypt or store them, but includes them in the tag. Change one header byte, and decryption fails.

### The file layout

```text
offset  length  field                    encrypted?   in the tag?
------  ------  -----------------------  -----------  -----------
     0       4  format marker "PWS1"     no           yes (associated data)
     4       4  PBKDF2 iterations        no           yes (associated data)
     8      16  salt                     no           yes (associated data)
    24      12  nonce                    no           yes (associated data)
    36      16  tag                      no           (it is the tag)
    52       n  ciphertext               yes          yes
```

Overhead: 52 bytes, whatever the length of the data.

### Why not AES-CBC?

Older code often uses `Aes.Create()` with its default mode, CBC, which encrypts but doesn't authenticate ([C8](#c8)). Decrypting tampered CBC data either yields garbage or fails on the padding at the end. If an attacker can tell those two outcomes apart, by an error message or by timing, they can decrypt the data byte by byte through repeated tries. Fixing CBC means adding an HMAC over the ciphertext, and checking it before decrypting. AES-GCM does both jobs in one primitive, which is why it is the default choice in new code.

## Examples

### A password-protected store

The full program was run with .NET 10. It combines the [key derivation note](password-key-derivation.md) with AES-GCM and the layout above:

```csharp
using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;

byte[] file = Store.Seal("correct horse"u8, "github: hunter2"u8);
Console.WriteLine($"plaintext 15 bytes, file {file.Length} bytes");
Console.WriteLine(Encoding.UTF8.GetString(Store.Open("correct horse"u8, file)));

try { Store.Open("wrong horse"u8, file); }
catch (AuthenticationTagMismatchException e) { Console.WriteLine($"wrong password: {e.GetType().Name}"); }

byte[] tampered = (byte[])file.Clone();
BinaryPrimitives.WriteInt32LittleEndian(tampered.AsSpan(4), 1000);   // lower the iteration count
try { Store.Open("correct horse"u8, tampered); }
catch (AuthenticationTagMismatchException) { Console.WriteLine("header tampered: AuthenticationTagMismatchException"); }

byte[] flipped = (byte[])file.Clone();
flipped[^1] ^= 1;
try { Store.Open("correct horse"u8, flipped); }
catch (AuthenticationTagMismatchException) { Console.WriteLine("ciphertext bit flipped: AuthenticationTagMismatchException"); }

static class Store
{
    // Layout: "PWS1" | iterations (int32 LE) | salt (16) | nonce (12) | tag (16) | ciphertext
    const int HeaderLength = 4 + 4 + 16 + 12;
    const int Iterations = 600_000;

    public static byte[] Seal(ReadOnlySpan<byte> password, ReadOnlySpan<byte> plaintext)
    {
        byte[] file = new byte[HeaderLength + 16 + plaintext.Length];
        Span<byte> header = file.AsSpan(0, HeaderLength);
        "PWS1"u8.CopyTo(header);
        BinaryPrimitives.WriteInt32LittleEndian(header[4..], Iterations);
        RandomNumberGenerator.Fill(header.Slice(8, 16));    // new salt at every save
        RandomNumberGenerator.Fill(header.Slice(24, 12));   // new nonce at every save

        byte[] key = Rfc2898DeriveBytes.Pbkdf2(password, header.Slice(8, 16), Iterations, HashAlgorithmName.SHA256, 32);
        try
        {
            using var gcm = new AesGcm(key, tagSizeInBytes: 16);
            gcm.Encrypt(header.Slice(24, 12), plaintext,
                        file.AsSpan(HeaderLength + 16), file.AsSpan(HeaderLength, 16),
                        associatedData: header);
        }
        finally { CryptographicOperations.ZeroMemory(key); }
        return file;
    }

    public static byte[] Open(ReadOnlySpan<byte> password, byte[] file)
    {
        ReadOnlySpan<byte> header = file.AsSpan(0, HeaderLength);
        if (!header[..4].SequenceEqual("PWS1"u8)) throw new InvalidDataException("not a store");
        int iterations = BinaryPrimitives.ReadInt32LittleEndian(header[4..]);

        byte[] key = Rfc2898DeriveBytes.Pbkdf2(password, header.Slice(8, 16), iterations, HashAlgorithmName.SHA256, 32);
        try
        {
            byte[] plaintext = new byte[file.Length - HeaderLength - 16];
            using var gcm = new AesGcm(key, tagSizeInBytes: 16);
            gcm.Decrypt(header.Slice(24, 12), file.AsSpan(HeaderLength + 16), file.AsSpan(HeaderLength, 16),
                        plaintext, associatedData: header);
            return plaintext;
        }
        finally { CryptographicOperations.ZeroMemory(key); }
    }
}
```

Expected output:

```text
plaintext 15 bytes, file 67 bytes
github: hunter2
wrong password: AuthenticationTagMismatchException
header tampered: AuthenticationTagMismatchException
ciphertext bit flipped: AuthenticationTagMismatchException
```

- 67 bytes = 52 bytes of header and tag + 15 bytes of ciphertext, as long as the plaintext ([C1](#c1)).
- All three failures throw the same exception, and no plaintext comes back ([C2](#c2), [C3](#c3)).
- The changed iteration count would also give a different key. The point is that *any* header byte is covered, including ones that don't change the key, such as the format marker ([C7](#c7)).
- A real program would keep the plaintext and the key in a buffer that zeroes itself, not in plain arrays and `string` literals.

### What a repeated nonce gives away

```csharp
byte[] key = RandomNumberGenerator.GetBytes(32);
byte[] nonce = RandomNumberGenerator.GetBytes(12);
byte[] p1 = "pin=4711 user=al"u8.ToArray();
byte[] p2 = "pin=0000 user=bo"u8.ToArray();
byte[] c1 = new byte[16], c2 = new byte[16], t = new byte[16];
using (var gcm = new AesGcm(key, 16))
{
    gcm.Encrypt(nonce, p1, c1, t);
    gcm.Encrypt(nonce, p2, c2, t);   // the mistake: the same nonce again
}

// The attacker has c1 and c2 and knows p2, but not the key.
byte[] x = new byte[16];
for (int i = 0; i < 16; i++) x[i] = (byte)(c1[i] ^ c2[i] ^ p2[i]);
Console.WriteLine($"recovered without the key: {Encoding.UTF8.GetString(x)}");
```

Expected output:

```text
recovered without the key: pin=4711 user=al
```

The attacker computed $`C_1 \oplus C_2 \oplus P_2 = P_1`$ ([C5](#c5)).

## Good habits

- Use an authenticated mode, AES-GCM, for new code; not CBC without a MAC, never ECB ([C2](#c2), [C8](#c8); NIST SP 800-38D; OWASP *Cryptographic Storage Cheat Sheet*).

- Generate a fresh 12-byte nonce with `RandomNumberGenerator` for every encryption, and store it with the ciphertext ([C4](#c4), [C6](#c6); NIST SP 800-38D, section 8).

- Pass the file header as associated data ([C7](#c7); NIST SP 800-38D).

- Construct `AesGcm` with an explicit `tagSizeInBytes: 16` ([C3](#c3); .NET diagnostic SYSLIB0053).

- Treat `AuthenticationTagMismatchException` as "wrong password or damaged file", and never use partial output ([C3](#c3); Microsoft Learn, `AesGcm.Decrypt`).

## Pitfalls

- **A constant or counter-from-zero nonce with a long-lived key.** The second save under the same key repeats it ([C5](#c5)).

- **Thinking the nonce must be secret.** It mustn't repeat. It may be public ([C4](#c4)).

- **Leaving the header out of the associated data.** An attacker can then change it unnoticed, for example to lower the KDF cost ([C7](#c7)).

- **Using `Aes.Create()` and its default mode for files.** That is CBC without authentication ([C8](#c8)).

- **Telling the user "wrong password" and "file damaged" apart.** GCM can't tell them apart, and it shouldn't try: both are a tag mismatch ([C2](#c2)).

## Exercises

1. **Predict.** In the store above, an attacker flips one bit in the salt. What happens when you open the file with the right password?

   <details><summary>Solution</summary>

   `AuthenticationTagMismatchException`. The salt is part of the associated data, so the tag no longer matches ([C7](#c7)). The changed salt also gives a different key, which fails the tag as well.

   </details>

2. **Explain.** Why does a password store with AES-GCM need no separate value to check whether the master password is right?

   <details><summary>Solution</summary>

   A wrong password gives a wrong key, and a wrong key gives a tag that doesn't match. Decryption fails before returning anything ([C2](#c2), [C3](#c3)).

   </details>

3. **Find the bug.** A colleague's store derives its key once at installation (fixed salt), and uses `new byte[12]` (all zeros) as the nonce at every save. What can an attacker who collects two saved versions of the file do?

   <details><summary>Solution</summary>

   Both versions use the same key and the same nonce, so the XOR of the ciphertexts is the XOR of the two plaintexts ([C5](#c5)). Knowing parts of one version (an entry the attacker added, or a common URL) reveals the same positions of the other. The attacker can also forge tags. Fix: a random nonce at every save ([C4](#c4)), ideally with a new salt too.

   </details>

## Sources

- M. Dworkin, [NIST SP 800-38D: Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC](https://csrc.nist.gov/pubs/sp/800/38/d/final), 2007: the mode, 96-bit IVs, the uniqueness requirement (section 8) and the limit for random IVs (section 8.3).
- A. Joux, [Authentication Failures in NIST version of GCM](https://csrc.nist.gov/csrc/media/projects/block-cipher-techniques/documents/bcm/joux_comments.pdf), comment to NIST, 2006: forging tags after a nonce is repeated.
- Microsoft Learn, [`AesGcm` class](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.aesgcm): nonce and tag sizes, the constructor with `tagSizeInBytes`, `AuthenticationTagMismatchException`, clearing the plaintext on failure.
- OWASP, [Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html): authenticated modes as the default.
- Claude session, 2026-11-18: both snippets were run there with .NET 10.
