// duo_hinge — runs inside the iOS Simulator (xcrun simctl spawn <udid> duo_hinge ...)
// Posts the vendor-defined HID event that Xcode Device Hub's hinge slider sends,
// so an iPhone Duo simulator can be folded / unfolded from a script.
// Event format documented by https://github.com/artemnovichkov/hinge (MIT).
//
//   duo_hinge set <degrees> [provider]
//   duo_hinge sweep <from> <to> <seconds> [provider]
//   duo_hinge orient <portrait|pud|landscape-left|landscape-right|faceup|facedown> [provider]
#include <CoreFoundation/CoreFoundation.h>
#include <mach/mach_time.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

typedef struct __IOHIDEvent *IOHIDEventRef;
typedef struct __IOHIDEventSystemClient *IOHIDEventSystemClientRef;
extern IOHIDEventRef IOHIDEventCreateVendorDefinedEvent(CFAllocatorRef, uint64_t, uint32_t usagePage, uint32_t usage,
    uint32_t version, const uint8_t *data, CFIndex length, uint32_t options);
extern IOHIDEventSystemClientRef IOHIDEventSystemClientCreateWithType(CFAllocatorRef, int type, CFDictionaryRef);
extern void IOHIDEventSystemClientDispatchEvent(IOHIDEventSystemClientRef, IOHIDEventRef);
extern CFDataRef IOCFSerialize(CFTypeRef, CFOptionFlags);

enum { kUsagePage = 0xFF61, kUsage = 0x5B, kClientTypeSimple = 4, kSerializeBinary = 1, kHz = 60 };
static const char *gProvider = "com.apple.Virtualization";

static void send_orient(IOHIDEventSystemClientRef client, const char *orient) {
    CFStringRef provider = CFStringCreateWithCString(NULL, gProvider, kCFStringEncodingUTF8);
    CFStringRef value = CFStringCreateWithCString(NULL, orient, kCFStringEncodingUTF8);
    const void *keys[] = {CFSTR("provider"), CFSTR("source"), CFSTR("type"), CFSTR("value")};
    const void *vals[] = {provider, CFSTR("orientation-picker-control"), CFSTR("enum"), value};
    CFDictionaryRef payload = CFDictionaryCreate(NULL, keys, vals, 4, &kCFTypeDictionaryKeyCallBacks, &kCFTypeDictionaryValueCallBacks);
    CFDataRef data = IOCFSerialize(payload, kSerializeBinary);
    if (data) {
        IOHIDEventRef ev = IOHIDEventCreateVendorDefinedEvent(NULL, mach_absolute_time(), kUsagePage, kUsage, 0,
            CFDataGetBytePtr(data), CFDataGetLength(data), 0);
        if (ev) { IOHIDEventSystemClientDispatchEvent(client, ev); CFRelease(ev); }
        CFRelease(data);
    } else fprintf(stderr, "duo_hinge: IOCFSerialize failed\n");
    CFRelease(payload); CFRelease(provider); CFRelease(value);
}

static void send_angle(IOHIDEventSystemClientRef client, double deg) {
    if (deg < 0) deg = 0; if (deg > 180) deg = 180;
    CFNumberRef value = CFNumberCreate(NULL, kCFNumberDoubleType, &deg);
    CFStringRef provider = CFStringCreateWithCString(NULL, gProvider, kCFStringEncodingUTF8);
    const void *keys[] = {CFSTR("provider"), CFSTR("source"), CFSTR("type"), CFSTR("value")};
    const void *vals[] = {provider, CFSTR("hinge-slider-control"), CFSTR("range"), value};
    CFDictionaryRef payload = CFDictionaryCreate(NULL, keys, vals, 4, &kCFTypeDictionaryKeyCallBacks, &kCFTypeDictionaryValueCallBacks);
    CFDataRef data = IOCFSerialize(payload, kSerializeBinary);
    if (data) {
        IOHIDEventRef ev = IOHIDEventCreateVendorDefinedEvent(NULL, mach_absolute_time(), kUsagePage, kUsage, 0,
            CFDataGetBytePtr(data), CFDataGetLength(data), 0);
        if (ev) { IOHIDEventSystemClientDispatchEvent(client, ev); CFRelease(ev); }
        CFRelease(data);
    } else fprintf(stderr, "duo_hinge: IOCFSerialize failed\n");
    CFRelease(payload); CFRelease(provider); CFRelease(value);
}

int main(int argc, char **argv) {
    if (argc < 3) { fprintf(stderr, "usage: duo_hinge set <deg> [provider] | sweep <from> <to> <sec> [provider]\n"); return 64; }
    IOHIDEventSystemClientRef client = IOHIDEventSystemClientCreateWithType(NULL, kClientTypeSimple, NULL);
    if (!client) { fprintf(stderr, "duo_hinge: cannot create HID event system client\n"); return 1; }
    if (!strcmp(argv[1], "set") && argc >= 3) {
        if (argc >= 4) gProvider = argv[3];
        send_angle(client, atof(argv[2]));
    } else if (!strcmp(argv[1], "sweep") && argc >= 5) {
        if (argc >= 6) gProvider = argv[5];
        double from = atof(argv[2]), to = atof(argv[3]), sec = fmax(atof(argv[4]), 0);
        int steps = (int)fmax(1, round(sec * kHz));
        for (int i = 0; i <= steps; i++) { send_angle(client, from + (to - from) * i / steps); if (i < steps) usleep((useconds_t)(sec * 1e6 / steps)); }
    } else if (!strcmp(argv[1], "orient") && argc >= 3) {
        // portrait | pud | landscape-left | landscape-right | faceup | facedown
        if (argc >= 4) gProvider = argv[3];
        send_orient(client, argv[2]);
    } else { fprintf(stderr, "duo_hinge: bad arguments\n"); return 64; }
    usleep(150000);
    return 0;
}
