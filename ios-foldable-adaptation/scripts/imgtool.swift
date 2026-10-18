// imgtool — 截圖輔助工具（macOS, AppKit / CoreGraphics，無第三方相依）
//
//   imgtool size <png>                         → 印出 "w h"
//   imgtool raw <png> <out.rgba>               → 輸出 RGBA8 原始像素，印出 "w h"
//   imgtool diff <a.png> <b.png>               → 印出相異像素比例（0..1），尺寸不同印 -1
//   imgtool annotate <in.png> <out.png> <spec.json>
//
// spec.json：
// {
//   "scale": 3,                  // 座標單位（pt）→ 像素倍率
//   "maxWidth": 1400,            // 輸出最大寬度（像素），0 = 不縮
//   "header": "01-選股頁 ／ 展開",  // 圖片上方標題列
//   "boxes": [ {"x":0,"y":0,"w":100,"h":40,"color":"#FF3B30","badge":"1","text":"元件超出畫面"} ]
// }

import AppKit
import Foundation

struct Box: Decodable {
    var x: Double; var y: Double; var w: Double; var h: Double
    var color: String?
    var badge: String?
    var text: String?
}

struct Spec: Decodable {
    var scale: Double?
    var maxWidth: Double?
    var header: String?
    var boxes: [Box]
}

func loadImage(_ path: String) -> (CGImage, Int, Int) {
    guard let data = FileManager.default.contents(atPath: path),
          let src = CGImageSourceCreateWithData(data as CFData, nil),
          let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
        FileHandle.standardError.write("cannot read \(path)\n".data(using: .utf8)!)
        exit(2)
    }
    return (img, img.width, img.height)
}

func rgba(_ img: CGImage) -> [UInt8] {
    let w = img.width, h = img.height
    var buf = [UInt8](repeating: 0, count: w * h * 4)
    let cs = CGColorSpaceCreateDeviceRGB()
    let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: cs,
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
    return buf
}

func color(_ hex: String?) -> NSColor {
    var s = (hex ?? "#FF3B30").trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    if s.count == 6 { s += "FF" }
    var v: UInt64 = 0
    Scanner(string: s).scanHexInt64(&v)
    return NSColor(red: CGFloat((v >> 24) & 0xFF) / 255, green: CGFloat((v >> 16) & 0xFF) / 255,
                   blue: CGFloat((v >> 8) & 0xFF) / 255, alpha: CGFloat(v & 0xFF) / 255)
}

func writePNG(_ image: NSImage, to path: String) {
    guard let tiff = image.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
          let png = rep.representation(using: .png, properties: [:]) else { exit(3) }
    try! png.write(to: URL(fileURLWithPath: path))
}

func annotate(input: String, output: String, specPath: String) {
    let spec = try! JSONDecoder().decode(Spec.self, from: Data(contentsOf: URL(fileURLWithPath: specPath)))
    let (cg, w, h) = loadImage(input)
    let scale = CGFloat(spec.scale ?? 1)
    let headerH: CGFloat = spec.header == nil ? 0 : max(72, CGFloat(w) * 0.045)
    // 固定像素尺寸的 bitmap（避免 NSImage.lockFocus 在 Retina 上把輸出放大兩倍）
    let totalH = Int(CGFloat(h) + headerH)
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: totalH, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                               bytesPerRow: 0, bitsPerPixel: 0)!
    rep.size = NSSize(width: CGFloat(w), height: CGFloat(totalH))
    let base = NSGraphicsContext(bitmapImageRep: rep)!
    let ctx = base.cgContext
    ctx.translateBy(x: 0, y: CGFloat(totalH))
    ctx.scaleBy(x: 1, y: -1)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: true)

    // 標題列
    if let header = spec.header {
        NSColor(white: 0.12, alpha: 1).setFill()
        NSBezierPath(rect: NSRect(x: 0, y: 0, width: CGFloat(w), height: headerH)).fill()
        let font = NSFont.systemFont(ofSize: headerH * 0.42, weight: .semibold)
        let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor.white]
        let str = NSAttributedString(string: header, attributes: attrs)
        str.draw(at: NSPoint(x: headerH * 0.3, y: (headerH - str.size().height) / 2))
    }

    // 原圖（翻轉座標系下要再翻回來畫）
    ctx.saveGState()
    ctx.translateBy(x: 0, y: headerH + CGFloat(h))
    ctx.scaleBy(x: 1, y: -1)
    ctx.draw(cg, in: CGRect(x: 0, y: 0, width: CGFloat(w), height: CGFloat(h)))
    ctx.restoreGState()

    // 標註框
    let lineW = max(3, CGFloat(w) / 400)
    let badgeR = max(16, CGFloat(w) / 55)
    for b in spec.boxes {
        let c = color(b.color)
        let r = NSRect(x: CGFloat(b.x) * scale, y: headerH + CGFloat(b.y) * scale,
                       width: CGFloat(b.w) * scale, height: CGFloat(b.h) * scale)
        c.setStroke()
        let p = NSBezierPath(rect: r)
        p.lineWidth = lineW
        let large = r.width * r.height > 0.4 * CGFloat(w) * CGFloat(h)
        if large {
            p.setLineDash([lineW * 4, lineW * 3], count: 2, phase: 0)
        }
        p.stroke()
        if !large {
            c.withAlphaComponent(0.12).setFill()
            p.fill()
        }
        if let badge = b.badge {
            let bx = max(r.minX - badgeR, 2), by = max(r.minY - badgeR, headerH + 2)
            let circle = NSBezierPath(ovalIn: NSRect(x: bx, y: by, width: badgeR * 2, height: badgeR * 2))
            c.setFill(); circle.fill()
            NSColor.white.setStroke(); circle.lineWidth = lineW * 0.6; circle.stroke()
            let font = NSFont.systemFont(ofSize: badgeR * 1.1, weight: .bold)
            let s = NSAttributedString(string: badge, attributes: [.font: font, .foregroundColor: NSColor.white])
            s.draw(at: NSPoint(x: bx + badgeR - s.size().width / 2, y: by + badgeR - s.size().height / 2))
        }
        if let text = b.text, !text.isEmpty {
            let font = NSFont.systemFont(ofSize: badgeR * 0.95, weight: .medium)
            let s = NSAttributedString(string: text, attributes: [.font: font, .foregroundColor: NSColor.white])
            let pad = badgeR * 0.35
            var tx = r.minX + badgeR * 1.2, ty = r.maxY + pad
            if ty + s.size().height + pad * 2 > headerH + CGFloat(h) { ty = r.minY - s.size().height - pad * 3 }
            if tx + s.size().width + pad * 2 > CGFloat(w) { tx = CGFloat(w) - s.size().width - pad * 2 }
            tx = max(tx, 2)
            let bg = NSRect(x: tx - pad, y: ty - pad, width: s.size().width + pad * 2, height: s.size().height + pad * 2)
            c.withAlphaComponent(0.92).setFill()
            NSBezierPath(roundedRect: bg, xRadius: pad, yRadius: pad).fill()
            s.draw(at: NSPoint(x: tx, y: ty))
        }
    }
    NSGraphicsContext.restoreGraphicsState()

    // 縮圖輸出（同樣用固定像素的 bitmap）
    var outRep = rep
    if let mw = spec.maxWidth, mw > 0, CGFloat(w) > CGFloat(mw) {
        let f = CGFloat(mw) / CGFloat(w)
        let sw = Int(CGFloat(w) * f), sh = Int(CGFloat(totalH) * f)
        let small = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: sw, pixelsHigh: sh, bitsPerSample: 8,
                                     samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                                     bytesPerRow: 0, bitsPerPixel: 0)!
        small.size = NSSize(width: CGFloat(sw), height: CGFloat(sh))
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: small)
        NSGraphicsContext.current?.imageInterpolation = .high
        rep.draw(in: NSRect(x: 0, y: 0, width: CGFloat(sw), height: CGFloat(sh)))
        NSGraphicsContext.restoreGraphicsState()
        outRep = small
    }
    guard let png = outRep.representation(using: .png, properties: [:]) else { exit(3) }
    try! png.write(to: URL(fileURLWithPath: output))
}

let args = CommandLine.arguments
guard args.count >= 3 else { print("usage: imgtool size|raw|diff|annotate ..."); exit(64) }
switch args[1] {
case "size":
    let (_, w, h) = loadImage(args[2]); print("\(w) \(h)")
case "raw":
    let (img, w, h) = loadImage(args[2])
    try! Data(rgba(img)).write(to: URL(fileURLWithPath: args[3])); print("\(w) \(h)")
case "diff":
    let (a, aw, ah) = loadImage(args[2]); let (b, bw, bh) = loadImage(args[3])
    if aw != bw || ah != bh { print("-1"); exit(0) }
    let pa = rgba(a), pb = rgba(b)
    var diff = 0
    var i = 0
    while i < pa.count {
        if abs(Int(pa[i]) - Int(pb[i])) > 24 || abs(Int(pa[i+1]) - Int(pb[i+1])) > 24 || abs(Int(pa[i+2]) - Int(pb[i+2])) > 24 { diff += 1 }
        i += 4
    }
    print(String(format: "%.5f", Double(diff) / Double(aw * ah)))
case "annotate":
    guard args.count >= 5 else { print("usage: imgtool annotate in.png out.png spec.json"); exit(64) }
    annotate(input: args[2], output: args[3], specPath: args[4])
default:
    print("unknown command"); exit(64)
}
