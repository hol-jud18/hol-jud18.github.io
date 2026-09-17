---
layout: post
title: "A Deep Dive on Entropy Analysis"
date: 2026-06-20
tags: [PE Headers]
description: "Entropy measures how much information is compressed in a data stream."
---

Entropy is the measure of randomness in data. This metric is useful because real network data in the form of IP addresses, UUIDs, MAC addresses, etc. have specific entropy characteristics. When you format shellcode as network data, it has different characteristics than real data.

Entropy analysis is fantastic because it works against all obfuscation formats.

## What Is Entropy

The mathematical definition of entropy is:

$H(X)=-\sum p(x)\log_2p(x)$

$p(x)$ tells us how likely an event is to happen while $\log_2p(x)$ tells us how much information the outcome contains. As a result, the second term will provide more information if the outcome is less likely to occur. We then calculate $-p(x)\log_2p(x)$ for every possible and add that all together giving us what is essentially the average amount of information.

High entropy means bytes are varied and unpredictable, while low entropy tells us that bytes repeat or follow some patterns.

| Data Type | Entropy | Why |
|---|---|---|
| `00 00 00 00 00...` (nulls) | 0 | Only one unique byte, fully predictable |
| `01 02 03 04 05...` (sequential) | ~7.62 | 256 unique bytes, uniform distribution |
| `ff ff ff ff ff...` (fills) | 0 | Repetitive |
| Random bytes (no pattern) | ~8.0 | Maximum entropy for 8-bit data |
| English text | ~4.7 | Biased toward common letters (e, t, a, etc.) |
| Base64-encoded data | ~6.0 | 64 possible characters, more uniform than text |
| IPv4 strings | ~3–5 | Dependent on actual IP distribution |

## Does Shellcode Have Distinct Entropy?

Raw shellcode is ultimately just compiled machine code. As an example:
```
fc 48 83 ec 20 48 83 e4 f0 48 8d 35 07 04 00 00 31 ff ac 3c 01 78 07 bb d8 7f 00 00 00 d9 e2 74 f4 59 66 3b 3c 3b eb 22
```

Position independent code is carefully crafted. It reuses common opcodes:
- `48` `83` appears multiple times (common AES operations)
- `bb`, `b8` (mov to registers) appear frequently
- Null bytes are carefully avoided or positioned
- Conditional branches cluster certain byte patterns

```
Byte frequency analysis:
0x00: 0% (avoided - breaks string parsing in some contexts)
0x48: ~8% (mov rax, etc.)
0x83: ~6% (add/sub imm8)
0xc3: ~3% (ret)
0x90: ~2% (nop - padding)
...
Entropy: ~7.1 bits
```

So this shellcode entropy is pretty high but not uniform.

## Encoded Data Has Different Entropy

What changes when we encode that same shellcode as IPv4 addresses?

```python
# Raw shellcode bytes
shellcode = bytes.fromhex("fc48 83ec 2048 83e4 f048 8d35 0704 0000...")

# Encode as IPv4 (4 bytes per address)
ipv4_array = []
for i in range(0, len(shellcode), 4):
    chunk = shellcode[i:i+4]
    ipv4_array.append(f"{chunk[0]}.{chunk[1]}.{chunk[2]}.{chunk[3]}")

# ipv4_array = ["252.72.131.228", "240.232.192.0", ...]
```

At the end of the day the bytes are the same, but the representation very specifically changes entropy.

Before encoding, the entropy was ~7.1 bits, which is a distribution that follows opcodes.

However, after encoding to IPv4 strings:
- The binary is now printable ASCII
    - Byte frequency is now dominated by ASCII characters
- Entropy of the string representation drops to ~3-5 btis
- But the original byte frequency has not changed.

There exists a fundamental mismatch between the entropy in binary representation being all ASCII and the expected entropy for real IPv4 data, as IP addresses aren't random.

## How Entropy Anomalies are Detected

### Method 1: Byte Frequency Analysis

Look at the raw bytes in the PE file:

```
IPv4-encoded shellcode: "252.72.131.228"
Raw bytes: 32 35 32 2e 37 32 2e 31 33 31 2e 32 32 38 (ASCII)
```

All bytes are in the printable range (0x20-0x7e). A frequency histogram shows:

```
Digit characters (0x30-0x39): ~40%
Dot (0x2e): ~14%
Everything else: ~0%
```

Red flag: A .data section with this pattern is suspicious. Legitimate data (config strings, embedded images) has more diverse byte distributions.

### Method 2: CHi-Squared Test

This method compated observed frequency to expected frequency:

$$
\chi^2 = \sum\frac{(observed-expected)^2}{expected}
$$

For random data, the $\chi^2 \approx 256$ as there are 256 degrees of freedom. 

```python
import math

def chi_squared_randomness(data):
    freq = {}
    for byte in data:
        freq[byte] = freq.get(byte, 0) + 1
    
    expected = len(data) / 256
    chi2 = 0
    for i in range(256):
        observed = freq.get(i, 0)
        chi2 += ((observed - expected) ** 2) / expected
    
    return chi2

# Random data: chi2 ≈ 256
# IPv4-encoded: chi2 ≈ 3000+ (huge deviation from random)
```

### Method 3: Entropy Calculation

The most reliable method is to calculate the entropy directly:

```python
def entropy(data):
    freq = {}
    for byte in data:
        freq[byte] = freq.get(byte, 0) + 1
    
    entropy = 0.0
    for count in freq.values():
        p = count / len(data)
        if p > 0:
            ent -= p * math.log2(p)
    
    return entropy

# Random shellcode: ~7.1 bits
# IPv4-encoded: ~2.5 bits (ASCII printable range)
# Encrypted data: ~7.9 bits (high, looks random)
```

There are entropy profiles for common binary types:
| Binary Type | Expected Entropy |
|------------|-----------------|
| Uncompressed code | 6.5-7.2 bits |
| Compressed code | 7.8-8.0 bits |
| Text resources | 4-5 bits |
| Image resources | 7.5-8.0 bits |
| Encrypted data | 7.95-8.0 bits |
| IPv4-encoded obfuscation | 2.5-3.5 bits |
| UUID-encoded obfuscation | 3.5-4.5 bits |

## A Simple Python Script to Detect Obfuscation

```python
import math
from pathlib import Path
 
def analyze_pe_section(pe_data, section_name=".data"):
    # Extract section
    # (This is pseudocode; real PE parsing is more complex)
    section = pe_data[section_start:section_end]
    
    entropy = calculate_entropy(section)
    chi2 = calculate_chi_squared(section)
    
    # Check for anomalies
    if entropy < 3.0:
        print(f"[!] Low entropy ({entropy:.2f}) in {section_name} - possible encoding")
    
    if chi2 > 1000:
        print(f"[!] High chi-squared ({chi2:.0f}) - suspicious byte distribution")
    
    # Heuristic: IPv4-encoded data
    ascii_percentage = sum(1 for b in section if 32 <= b < 127) / len(section) * 100
    if ascii_percentage > 80:
        print(f"[!] {ascii_percentage:.1f}% ASCII bytes - possible string obfuscation")
```

## Making Entropy Analysis Harder

### 1. Encryption (Best Approach)
 
Encrypt the obfuscated data. `AES-256-CBC` or even `RC4` brings entropy back to ~8.0:
 
Now the output is:
- Encrypted UUID-formatted shellcode (bytes are random after encryption)
- Entropy ~7.95 bits
- But encrypted data in `.data` section, which is unusual for a legitimate binary

The tradeoff is entropy analysis is way less clear, but now you have a binary with encrypted data which is immediately weird.

### 2. Mixed Legitimate Data
 
Pad the `.data` section with legitimate strings.
 
```c
char* ips[] = {
    "8.8.8.8",
    "1.1.1.1",
    "252.72.131.228",  // Shellcode disguised
    "8.8.8.8",
    "1.1.1.1",
};
```
 
Entropy analysis becomes harder if legitimate data overwhelms the obfuscated data.

### 3. Compression Before Encoding
 
Compress shellcode before format encoding to increase entropy:
 
```
Shellcode → zlib compress → entropy rises to ~7.2 → UUID encode → entropy drops to ~4 → less suspicious than raw encoding
```
 
Still detectable, but harder than format encoding alone.