"""Flatten the K Sure UI v3-final Figma frame into per-screen spec files.

usage: python3 extract_spec.py <final.json> <out_dir>
Writes <out_dir>/<SCREEN>.json (simplified node tree) and <SCREEN>.md (readable tree).
"""
import json
import sys
from pathlib import Path

SCREENS = {
    "29:172": "L1", "29:402": "L2", "29:553": "L3", "29:701": "L4", "29:813": "L5", "29:975": "L6",
    "29:1114": "T1", "29:1313": "T2", "29:1446": "T3", "29:1537": "T4", "29:1664": "T5",
    "29:1780": "T6", "29:1912": "T7", "29:2045": "T8",
}


def hexc(c, opacity=1.0):
    a = c.get("a", 1) * opacity
    h = "#%02X%02X%02X" % (round(c["r"] * 255), round(c["g"] * 255), round(c["b"] * 255))
    return h if a >= 0.999 else f"{h}/{a:.2f}"


def paint(p):
    if p.get("visible", True) is False:
        return None
    t = p["type"]
    if t == "SOLID":
        return hexc(p["color"], p.get("opacity", 1))
    if t.startswith("GRADIENT"):
        stops = ", ".join(f"{hexc(s['color'])} {s['position'] * 100:.0f}%" for s in p["gradientStops"])
        handles = p.get("gradientHandlePositions") or []
        hp = " ".join(f"({h['x']:.2f},{h['y']:.2f})" for h in handles[:2])
        return f"{t.replace('GRADIENT_', '').lower()}[{stops}] handles {hp}"
    if t == "IMAGE":
        return f"image:{p.get('imageRef', '')[:10]}"
    return t.lower()


def effect(e):
    if e.get("visible", True) is False:
        return None
    if e["type"] in ("DROP_SHADOW", "INNER_SHADOW"):
        o = e.get("offset", {})
        inset = "inset " if e["type"] == "INNER_SHADOW" else ""
        return f"{inset}{o.get('x', 0):g} {o.get('y', 0):g} {e.get('radius', 0):g} {e.get('spread', 0) or 0:g} {hexc(e['color'])}"
    return f"{e['type'].lower()} {e.get('radius', 0):g}"


def simplify(n, ox, oy):
    if n.get("visible", True) is False:
        return None
    b = n.get("absoluteBoundingBox") or {}
    out = {
        "id": n["id"],
        "type": n["type"],
        "name": n["name"],
        "x": round(b.get("x", 0) - ox, 1),
        "y": round(b.get("y", 0) - oy, 1),
        "w": round(b.get("width", 0), 1),
        "h": round(b.get("height", 0), 1),
    }
    fills = [f for f in (paint(p) for p in n.get("fills", [])) if f]
    if fills:
        out["fills"] = fills
    strokes = [s for s in (paint(p) for p in n.get("strokes", [])) if s]
    if strokes:
        out["strokes"] = strokes
        out["strokeWeight"] = round(n.get("strokeWeight", 1), 2)
    if n.get("cornerRadius"):
        out["radius"] = n["cornerRadius"]
    if n.get("rectangleCornerRadii") and len(set(n["rectangleCornerRadii"])) > 1:
        out["radii"] = n["rectangleCornerRadii"]
    effects = [e for e in (effect(e) for e in n.get("effects", [])) if e]
    if effects:
        out["effects"] = effects
    if n.get("opacity", 1) < 1:
        out["opacity"] = round(n["opacity"], 2)
    if n.get("layoutMode") and n["layoutMode"] != "NONE":
        out["layout"] = {
            "mode": n["layoutMode"],
            "gap": n.get("itemSpacing", 0),
            "pad": [n.get("paddingTop", 0), n.get("paddingRight", 0), n.get("paddingBottom", 0), n.get("paddingLeft", 0)],
            "main": n.get("primaryAxisAlignItems", "MIN"),
            "cross": n.get("counterAxisAlignItems", "MIN"),
        }
    if n["type"] == "TEXT":
        s = n.get("style", {})
        out["text"] = n.get("characters", "")
        out["font"] = {
            "family": s.get("fontFamily"),
            "weight": s.get("fontWeight"),
            "size": s.get("fontSize"),
            "lineHeight": round(s.get("lineHeightPx", 0), 1),
            "letterSpacing": round(s.get("letterSpacing", 0), 2),
            "align": s.get("textAlignHorizontal"),
        }
    kids = [k for k in (simplify(c, ox, oy) for c in n.get("children", [])) if k]
    if kids:
        out["children"] = kids
    return out


def to_md(node, depth=0, lines=None):
    lines = [] if lines is None else lines
    ind = "  " * depth
    bits = [f"{node['type'].lower()}", f"{node['w']:g}×{node['h']:g}", f"@{node['x']:g},{node['y']:g}"]
    if "radius" in node:
        bits.append(f"r{node['radius']:g}")
    if "radii" in node:
        bits.append("r" + "/".join(f"{r:g}" for r in node["radii"]))
    if "fills" in node:
        bits.append("bg " + " + ".join(node["fills"]))
    if "strokes" in node:
        bits.append(f"border {node['strokeWeight']:g} " + " + ".join(node["strokes"]))
    if "effects" in node:
        bits.append("shadow " + " | ".join(node["effects"]))
    if "opacity" in node:
        bits.append(f"opacity {node['opacity']}")
    if "layout" in node:
        lo = node["layout"]
        bits.append(f"{lo['mode'].lower()} gap{lo['gap']:g} pad{'/'.join(f'{p:g}' for p in lo['pad'])}")
    if "text" in node:
        f = node["font"]
        txt = node["text"].replace("\n", "⏎")
        bits.append(f'"{txt}" {f["family"]} {f["weight"]} {f["size"]:g}/{f["lineHeight"]:g}'
                    + (f" ls{f['letterSpacing']:g}" if f["letterSpacing"] else ""))
    lines.append(f"{ind}- {' · '.join(bits)}")
    for c in node.get("children", []):
        to_md(c, depth + 1, lines)
    return lines


def find(n, target):
    if n["id"] == target:
        return n
    for c in n.get("children", []):
        r = find(c, target)
        if r:
            return r
    return None


def main():
    src, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    data = json.loads(src.read_text())
    root = data["nodes"]["29:2"]["document"]
    for node_id, code in SCREENS.items():
        n = find(root, node_id)
        b = n["absoluteBoundingBox"]
        spec = simplify(n, b["x"], b["y"])
        (out_dir / f"{code}.json").write_text(json.dumps(spec, ensure_ascii=False, indent=1))
        header = [f"# {code} — Figma spec (K Sure UI v3-final, node `{node_id}`)", "",
                  "> สร้างอัตโนมัติจาก Figma REST API · พิกัดเทียบมุมซ้ายบนของเฟรมโทรศัพท์ (393×852) · หน่วย px", ""]
        (out_dir / f"{code}.md").write_text("\n".join(header + to_md(spec)) + "\n")
        print(code, "ok")


if __name__ == "__main__":
    main()
