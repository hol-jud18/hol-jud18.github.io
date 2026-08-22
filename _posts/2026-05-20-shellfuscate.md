---
layout: post
title: "ShellFuscate: A Shellcode Obfuscator and Encryptor"
date: 2026-05-20
tags: [PE Headers]
description: "ShellFuscate is a tool for ofuscating and optionally encrypting shellcode to bypass antivirus controls."
---

Shellcode is often the functional payload embedded within malware. However, antivirus engines have an easy time pattern matching known byte sequences. 

ShellFuscate is a windows shellcode obfuscation tool that takes raw shellcode and returns plausible looking data in the form of IPv4, IPv6, UUIDs, and MAC addresses. The goal is to disguise well known byte patterns as data that looks legitimate.

## Implementation Strategy

This tool offers 4 obfuscation formats

| Format | Bytes/Element | Example Output                | Use Case                                |
| ------ | ------------: | ----------------------------- | --------------------------------------- |
| IPv4   |             4 | `144.215.40.13`               | Small payloads, high density            |
| IPv6   |            16 | `FC4E:9001:2F35:8B09:...`     | Medium payloads, less suspicious        |
| UUID   |            16 | `2801904F-C04E-359F-8B09-...` | Large payloads, natural in Windows code |
| MAC    |             5 | `FC:4E:90:01:2F`              | Hybrid approach, fewer elements needed  |

Just encoding alone is insufficient though. It would not be particularly difficult for someone to decode the encoded strings found in the binary and determine the shellcode.

### AES-256-CBC via Windows BCrypt API:

```c
BCryptOpenAlgorithmProvider(&hAlgorithm, BCRYPT_AES_ALGORITHM, NULL, 0);
BCryptGenerateSymmetricKey(hAlgorithm, pbKey, cbKey, &hKey, NULL, 0);
BCryptEncrypt(hKey, pbPlaintext, cbPlaintext, NULL, pbIV, cbIV, pbCiphertext, cbCiphertext, &cbResult, BCRYPT_BLOCK_PADDING);
```

We use two calls to `BCryptEncrypt`, first with NULL output to determine size, then actual encryption. BCrypt is used because it is native to Windows and avoids any external dependencies.

### RC4 vis `SystemFunction032`

```c
NTSTATUS status = SystemFunction032(&DataBlob, &KeyBlob);
```

`SystemFunction032` is an undocumented export in `Advapi32.dll` that performs RC4 in-place as opposed to linking to some external RC4 implementation.

```c
typedef NTSTATUS(WINAPI * pSystemFunction032)(PBLOB, PBLOB);
pSystemFunction032 func = (pSystemFunction032)GetProcAddress(GetModuleHandleA("Advapi32"), "SystemFunction032");
func(&DataBlob, &KeyBlob);
```

RC4 is given as an option for a couple of reasons, one being that RC4 is symmetric, so the same key is used for encryption and decryption. So that allows a loader to use identical ode for encryption and decryption. Also, avoiding a static import on something encryption related is nice because that is easy to detect, while `GetProcAddress` lookups are harder to signature on than direct imports.

## Some Quirks in Encoding

### UUID Byte Ordering

UUIDs have an interesting quirk in that the first 4-byte group is stored in little-endian byte order, but formatted as big-endian in the string representation.

Given raw bytes: `38 01 90 4F C0 4E 35 9F ...`

Parsing straightforward would interpret this as `4F901038-C0C0-9F35-...`
which is incorrect.

The `GenerateUUID` function reverses the first four bytes during formatting like so:

```c
snprintf(uuid_string, sizeof(uuid_string),
    "%02X%02X%02X%02X-%02X%02X-%02X%02X-%02X%02X-%02X%02X%02X%02X%02X%02X",
    bytes[3], bytes[2], bytes[1], bytes[0],  // Reversed
    bytes[4], bytes[5], bytes[6], bytes[7],
    ...);
```

### Automatic Padding

Shellcode doesn't always have to align with the encoding format's size. Ex. IPv4 requires a multiple of 4, UUID/IPv6 needs a multiple of 16, and MAC requires a multiple of 5.

Si ShellFuscate will automatically pad shellcode:

```c
size_t padded_size = ((shellcode_size + element_size - 1) / element_size) * element_size;
shellcode = realloc(shellcode, padded_size);
memset(shellcode + shellcode_size, 0, padded_size - shellcode_size);
```

## Usage and Output

Usage:

```bash
ShellFuscate.exe -f shell.bin -fmt uuid -enc aes
```

Output:

```c
unsigned char AesKey[] = { 0x3A, 0x1F, 0x2E, 0x7C, ... };
unsigned char AesIv[]  = { 0xC2, 0x44, 0x9B, 0xE1, ... };

char* UuidArray[12] = {
    "E3A12F4B-9C01-3D7F-A2B8-5F1E9C3D8A4E",
    "B7F5C2D9-1E4A-6B3F-9A2C-D8E1F3C5A7B9",
    ... 
};

#define NumberOfElements 12
```

A loader then:

1. Declares or imports the `AesKey`, `AesIv`, and `UuidArray`.
2. For each UUID string, parses it into bytes.
3. Passes these bytes to `BCryptDecrypt` with the key/IV.
4. Concatenates the plaintext chunks.
5. Allocates executable memory, copies the decoded shellcode, and transfers execution.
