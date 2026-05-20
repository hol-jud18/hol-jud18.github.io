---
layout: post
title: "Process Injection via DLL Injection"
date: 2026-05-18
tags: [Process Injection]
description: "Exploring a process injection technique where we will enumerate running processes and inject a DLL into that process"
---

In this post I would like to explore first how to enumerate running processes, match a target process, and inject a DLL into that process.

The first thing to accomplish is to find all processes running on the machine which brings us to our first challenge.

Windows provides a very userful structure in tlhelp32.h called `PROCESSENTRY32` which is parsed by the tlhelp32.h functions `CreateToolhelp32Snapshot Process32First Process32Next`.

You can learn more about the structure from Microsoft here: [Microsoft Documentation](https://learn.microsoft.com/en-us/windows/win32/api/tlhelp32/ns-tlhelp32-processentry32)

A quick aside on that structure if you look into it, you will find that there are a fair amount of dead fields that have been around since like Win2k. I am not 100% sure why that is, but maintaining backwards compatability is the best I can come up with. I may look more into this in the future. 

Going back to `PROCESSENTRY32`, there are 3 fields that matter for this technique:
+ `dwSize` : this is going to be set to `sizeof(PROCESSENTRY32)` which tells WinAPI what version of the structure the code is expecting
+ `th32ProcessID` : this is the PID of the currently running process
+ `szExeFile` : this is the process name as a string

```C
// given a target process name, returns a PID and an open handle to it
BOOL GetRemoteProcessHandle(IN LPWSTR szProcessName, OUT DWORD* dwProcessId, OUT HANDLE* hProcess) {

    // initialize the struct with the necessary step of setting dwSize
    PROCESSENTRY32 pe = { .dwSize = sizeof(PROCESSENTRY32) };

    // takes a snapshot of all currently running processes
    HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (hSnapshot == INVALID_HANDLE_VALUE) {
        printf("[!] CreateToolhelp32Snapshot failed: %d\n", GetLastError());
        return FALSE;
    }

    // retrieves the first process from the snapshot
    if (!Process32First(hSnapshot, &pe)) {
        printf("[!] Process32First failed: %d\n", GetLastError());
        CloseHandle(hSnapshot);
        return FALSE;
    }

    // use a do-while loop to iterate through the snapshot looking for the target process
    do {
        // compare name we are on to name we are looking for
        if (wcscmp(pe.szExeFile, szProcessName) == 0) {
            // store the PID
            *dwProcessId = pe.th32ProcessID;
            // open a handle to the process with full access
            *hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pe.th32ProcessID);
            if (*hProcess == NULL) {
                printf("[!] OpenProcess failed: %d\n", GetLastError());
            }
            break;
        }
    } while (Process32Next(hSnapshot, &pe));

    // done with the snapshot so we close the handle to it
    CloseHandle(hSnapshot);

    // if we couldn't find the process or couldn't open a handle to it, fail
    if (*dwProcessId == 0 || *hProcess == NULL)
        return FALSE;

    return TRUE;
}
```