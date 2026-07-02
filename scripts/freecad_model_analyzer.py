import base64
import json
import os
import sys
import tempfile
from collections import OrderedDict


def configure_freecad_paths():
    freecad_root = os.environ.get("FREECAD_ROOT", "").strip()

    if not freecad_root:
        freecad_cmd = os.environ.get("FREECAD_CMD", "").strip()
        if freecad_cmd:
            freecad_root = os.path.dirname(freecad_cmd)

    if not freecad_root:
        return

    candidate_paths = [
        os.path.join(freecad_root, "bin"),
        os.path.join(freecad_root, "lib"),
        os.path.join(freecad_root, "Mod"),
        os.path.join(freecad_root, "Ext"),
    ]

    for path in candidate_paths:
        if os.path.isdir(path) and path not in sys.path:
            sys.path.insert(0, path)


def read_payload():
    payload_file = os.environ.get("MODEL_ANALYZER_PAYLOAD_FILE", "").strip()
    if payload_file:
        with open(payload_file, "r", encoding="utf-8-sig") as handle:
            return json.load(handle)

    raw = sys.stdin.read().strip()
    if not raw:
        raise RuntimeError("Missing analyzer payload")
    return json.loads(raw)


def write_result(result):
    sys.stdout.write(json.dumps({"result": result}, ensure_ascii=False))
    sys.stdout.flush()


def write_error(message):
    sys.stdout.write(json.dumps({"error": message}, ensure_ascii=False))
    sys.stdout.flush()


def safe_name(value, fallback):
    value = (value or "").strip()
    return value if value else fallback


def merge_bbox(target, shape):
    bbox = shape.BoundBox
    if target is None:
        return {
            "xmin": bbox.XMin,
            "xmax": bbox.XMax,
            "ymin": bbox.YMin,
            "ymax": bbox.YMax,
            "zmin": bbox.ZMin,
            "zmax": bbox.ZMax,
        }

    return {
        "xmin": min(target["xmin"], bbox.XMin),
        "xmax": max(target["xmax"], bbox.XMax),
        "ymin": min(target["ymin"], bbox.YMin),
        "ymax": max(target["ymax"], bbox.YMax),
        "zmin": min(target["zmin"], bbox.ZMin),
        "zmax": max(target["zmax"], bbox.ZMax),
    }


def bbox_to_string(bounds):
    if not bounds:
        return ""
    return (
        f"{bounds['xmax'] - bounds['xmin']:.2f} x "
        f"{bounds['ymax'] - bounds['ymin']:.2f} x "
        f"{bounds['zmax'] - bounds['zmin']:.2f} mm"
    )


def bbox_volume_mm3(bounds):
    if not bounds:
        return 0.0

    return max(0.0, bounds["xmax"] - bounds["xmin"]) * max(
        0.0, bounds["ymax"] - bounds["ymin"]
    ) * max(0.0, bounds["zmax"] - bounds["zmin"])


def import_into_freecad(file_path):
    import FreeCAD as App  # type: ignore
    import Import  # type: ignore

    doc = App.newDocument("ModelAnalyzer")
    Import.insert(file_path, doc.Name)
    doc.recompute()
    return App, doc


def get_object_key(obj):
    return getattr(obj, "FullName", None) or getattr(obj, "Name", None)


def has_positive_volume_shape(obj):
    shape = getattr(obj, "Shape", None)

    if shape is None:
        return False

    if getattr(shape, "isNull", lambda: True)():
        return False

    return getattr(shape, "Volume", 0) > 0


def iter_shape_objects(doc):
    candidates = []
    positive_keys = set()

    for obj in doc.Objects:
        shape = getattr(obj, "Shape", None)
        if shape is None:
            continue
        if getattr(shape, "isNull", lambda: True)():
            continue
        if getattr(shape, "Volume", 0) <= 0:
            continue

        key = get_object_key(obj)
        if not key or key in positive_keys:
            continue

        positive_keys.add(key)
        candidates.append((obj, shape, key))

    if not candidates:
        return []

    parent_keys = set()

    for obj, _, key in candidates:
        child_candidates = list(getattr(obj, "OutList", []) or [])
        child_candidates.extend(getattr(obj, "Group", []) or [])

        if any(get_object_key(child) in positive_keys for child in child_candidates):
            parent_keys.add(key)

    leaf_candidates = [(obj, shape) for obj, shape, key in candidates if key not in parent_keys]
    fallback_candidates = [(obj, shape) for obj, shape, _ in candidates]

    return leaf_candidates or fallback_candidates


def analyze_with_freecad(file_path, file_name, file_size_bytes):
    app, doc = import_into_freecad(file_path)

    try:
        part_map = OrderedDict()
        total_bounds = None
        selected_objects = iter_shape_objects(doc)

        for obj, shape in selected_objects:
            label = safe_name(
                getattr(obj, "Label", ""),
                safe_name(getattr(obj, "Name", ""), "Unnamed part"),
            )
            volume_mm3 = float(getattr(shape, "Volume", 0.0) or 0.0)

            if volume_mm3 <= 0:
                continue

            total_bounds = merge_bbox(total_bounds, shape)

            if label not in part_map:
                part_map[label] = {
                    "name": label,
                    "count": 1,
                    "materialKey": "al6061",
                    "volumeMm3": f"{volume_mm3:.3f}",
                    "totalVolumeMm3": volume_mm3,
                    "volumeSource": "auto",
                }
            else:
                part_map[label]["count"] += 1
                part_map[label]["totalVolumeMm3"] += volume_mm3

        part_items = []

        for item in part_map.values():
            count = max(1, int(item["count"]))
            unit_volume_mm3 = item["totalVolumeMm3"] / count
            part_items.append(
                {
                    "name": item["name"],
                    "count": count,
                    "materialKey": item["materialKey"],
                    "volumeMm3": f"{unit_volume_mm3:.3f}",
                    "volumeSource": item["volumeSource"],
                }
            )

        total_volume_mm3 = sum(item["totalVolumeMm3"] for item in part_map.values())
        bbox_volume_m3 = bbox_volume_mm3(total_bounds) / 1_000_000_000
        detected_volume_m3 = total_volume_mm3 / 1_000_000_000
        volume_fill_ratio = (
            detected_volume_m3 / bbox_volume_m3 if bbox_volume_m3 > 0 else None
        )
        assembly_type = (
            "assembly"
            if len(part_items) > 1 or sum(item["count"] for item in part_items) > 1
            else "single"
        )

        notes = [
            "FreeCAD solid analysis completed.",
            "Volumes are taken from FreeCAD Shape.Volume in mm^3.",
        ]

        if selected_objects and len(selected_objects) < len(doc.Objects):
            notes.append(
                "Assembly container objects were skipped and only leaf solids were summed."
            )

        if volume_fill_ratio is not None:
            notes.append(
                f"Bounding-box fill ratio is {volume_fill_ratio * 100:.1f}%."
            )

            if volume_fill_ratio >= 0.85:
                notes.append(
                    "The imported model is almost a full solid relative to its outer size."
                )

        result = {
            "modelFileName": file_name,
            "modelFileType": file_name.split(".")[-1].upper(),
            "modelFileSizeBytes": file_size_bytes,
            "modelPartName": os.path.splitext(file_name)[0],
            "modelAnalysisSource": "FreeCAD external analyzer",
            "modelDetectedUnit": "mm",
            "modelDetectedVolumeM3": detected_volume_m3,
            "modelBoundingBox": bbox_to_string(total_bounds),
            "modelBoundingBoxVolumeM3": bbox_volume_m3 if bbox_volume_m3 > 0 else None,
            "modelVolumeFillRatio": volume_fill_ratio,
            "modelStatus": "FreeCAD analysis complete",
            "modelNotes": notes,
            "modelAssemblyType": assembly_type,
            "modelPartCount": len(part_items),
            "modelPartItems": part_items
            or [
                {
                    "name": os.path.splitext(file_name)[0],
                    "count": 1,
                    "materialKey": "al6061",
                    "volumeMm3": "",
                    "volumeSource": "none",
                }
            ],
        }

        if not part_items:
            result["modelStatus"] = "FreeCAD analysis found no solid bodies"
            result["modelNotes"].append(
                "No solid Shape objects with positive volume were found."
            )
            result["modelDetectedVolumeM3"] = None

        return result
    finally:
        app.closeDocument(doc.Name)


def main():
    configure_freecad_paths()
    payload = read_payload()
    file_name = payload.get("fileName")
    data_base64 = payload.get("dataBase64")
    file_size_bytes = payload.get("fileSizeBytes")

    if not file_name or not data_base64:
        raise RuntimeError("Missing fileName or dataBase64")

    suffix = os.path.splitext(file_name)[1] or ".step"
    binary = base64.b64decode(data_base64)

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(binary)
        temp_path = temp_file.name

    try:
        result = analyze_with_freecad(temp_path, file_name, file_size_bytes)
        write_result(result)
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # pragma: no cover
        write_error(str(error))
        sys.exit(1)
