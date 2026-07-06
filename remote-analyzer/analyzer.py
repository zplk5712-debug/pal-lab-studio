import os

from OCC.Core.Bnd import Bnd_Box
from OCC.Core.GProp import GProp_GProps
from OCC.Extend.DataExchange import read_step_file_with_names_colors

try:
    from OCC.Core.BRepGProp import brepgprop

    def _volume_properties(shape, props):
        brepgprop.VolumeProperties(shape, props)
except ImportError:  # older pythonocc-core API
    from OCC.Core.BRepGProp import brepgprop_VolumeProperties

    def _volume_properties(shape, props):
        brepgprop_VolumeProperties(shape, props)

try:
    from OCC.Core.BRepBndLib import brepbndlib

    def _add_bbox(shape, box):
        brepbndlib.Add(shape, box)
except ImportError:  # older pythonocc-core API
    from OCC.Core.BRepBndLib import brepbndlib_Add

    def _add_bbox(shape, box):
        brepbndlib_Add(shape, box)


def safe_name(value, fallback):
    value = (value or "").strip()
    return value if value else fallback


def shape_volume_mm3(shape):
    props = GProp_GProps()
    _volume_properties(shape, props)
    return abs(props.Mass())


def shape_bbox(shape):
    box = Bnd_Box()
    _add_bbox(shape, box)

    if box.IsVoid():
        return None

    xmin, ymin, zmin, xmax, ymax, zmax = box.Get()
    return {"xmin": xmin, "xmax": xmax, "ymin": ymin, "ymax": ymax, "zmin": zmin, "zmax": zmax}


def merge_bbox(target, bounds):
    if bounds is None:
        return target

    if target is None:
        return dict(bounds)

    return {
        "xmin": min(target["xmin"], bounds["xmin"]),
        "xmax": max(target["xmax"], bounds["xmax"]),
        "ymin": min(target["ymin"], bounds["ymin"]),
        "ymax": max(target["ymax"], bounds["ymax"]),
        "zmin": min(target["zmin"], bounds["zmin"]),
        "zmax": max(target["zmax"], bounds["zmax"]),
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


def analyze_with_opencascade(file_path, file_name, file_size_bytes):
    shapes_labels_colors = read_step_file_with_names_colors(file_path)

    part_map = {}
    total_bounds = None

    for index, (shape, (label_name, _color)) in enumerate(shapes_labels_colors.items()):
        volume_mm3 = shape_volume_mm3(shape)

        if volume_mm3 <= 0:
            continue

        bounds = shape_bbox(shape)
        total_bounds = merge_bbox(total_bounds, bounds)

        name = safe_name(label_name, f"Unnamed part {index + 1}")

        if name not in part_map:
            part_map[name] = {
                "name": name,
                "count": 1,
                "materialKey": "al6061",
                "totalVolumeMm3": volume_mm3,
            }
        else:
            part_map[name]["count"] += 1
            part_map[name]["totalVolumeMm3"] += volume_mm3

    part_items = []

    for item in part_map.values():
        count = max(1, item["count"])
        unit_volume_mm3 = item["totalVolumeMm3"] / count
        part_items.append(
            {
                "name": item["name"],
                "count": count,
                "materialKey": item["materialKey"],
                "volumeMm3": f"{unit_volume_mm3:.3f}",
                "volumeSource": "auto",
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
        "OpenCascade(pythonocc-core) solid analysis completed on the remote analyzer.",
        "Volumes are computed from BRepGProp VolumeProperties in mm^3.",
    ]

    if volume_fill_ratio is not None:
        notes.append(f"Bounding-box fill ratio is {volume_fill_ratio * 100:.1f}%.")

        if volume_fill_ratio >= 0.85:
            notes.append(
                "The imported model is almost a full solid relative to its outer size."
            )

    result = {
        "modelFileName": file_name,
        "modelFileType": file_name.split(".")[-1].upper(),
        "modelFileSizeBytes": file_size_bytes,
        "modelPartName": os.path.splitext(file_name)[0],
        "modelAnalysisSource": "OpenCascade remote analyzer",
        "modelDetectedUnit": "mm",
        "modelDetectedVolumeM3": detected_volume_m3 if part_items else None,
        "modelBoundingBox": bbox_to_string(total_bounds),
        "modelBoundingBoxVolumeM3": bbox_volume_m3 if bbox_volume_m3 > 0 else None,
        "modelVolumeFillRatio": volume_fill_ratio,
        "modelStatus": "OpenCascade analysis complete"
        if part_items
        else "OpenCascade analysis found no solid bodies",
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
        result["modelNotes"].append("No solid bodies with positive volume were found.")

    return result
