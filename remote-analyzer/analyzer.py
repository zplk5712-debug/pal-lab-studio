import os
import re

from OCC.Core.Bnd import Bnd_Box
from OCC.Core.GProp import GProp_GProps
from OCC.Extend.DataExchange import read_step_file_with_names_colors

# loadCalculatorData.js의 MATERIAL_GROUP_OPTIONS와 동일한 목록(키, 라벨, 밀도 kg/m^3).
# STEP 파일에서 읽은 소재명/밀도를 이 목록과 대조해 가장 가까운 소재를 자동으로 고릅니다.
MATERIAL_OPTIONS = [
    ("carbonSteel", "탄소강", 7850),
    ("lowCarbonSteel", "저탄소강", 7850),
    ("alloySteel", "합금강", 7830),
    ("toolSteel", "공구강", 7770),
    ("castIron", "주철", 7150),
    ("stainless304", "스테인리스 304", 7930),
    ("stainless316", "스테인리스 316", 7980),
    ("stainless310", "스테인리스 310", 7900),
    ("stainless430", "스테인리스 430", 7750),
    ("invar", "인바(Invar)", 8050),
    ("kovar", "코바(Kovar)", 8360),
    ("al1050", "알루미늄 1050", 2710),
    ("al5052", "알루미늄 5052", 2680),
    ("al6061", "알루미늄 6061", 2700),
    ("al7075", "알루미늄 7075", 2810),
    ("copper", "구리", 8960),
    ("oxygenFreeCopper", "무산소동 (OFHC)", 8940),
    ("ofeCopper", "OFE 무산소동", 8940),
    ("glidcopAl15", "GlidCop AL-15", 8910),
    ("glidcopAl25", "GlidCop AL-25", 8890),
    ("cuCrZr", "CuCrZr", 8890),
    ("chromeCopper", "크롬동 (C18200)", 8890),
    ("telluriumCopper", "텔루륨동 (C14500)", 8890),
    ("berylliumCopper", "베릴륨동 (C17200)", 8250),
    ("phosphorBronze", "인청동", 8890),
    ("brass", "황동", 8530),
    ("bronze", "청동", 8800),
    ("nickelSilver", "니켈실버", 8600),
    ("nickel", "니켈", 8908),
    ("titaniumGr2", "티타늄 Grade 2", 4510),
    ("titaniumGr5", "티타늄 Grade 5", 4430),
    ("magnesiumAZ31", "마그네슘 AZ31", 1780),
    ("zinc", "아연", 7140),
    ("tin", "주석", 7310),
    ("lead", "납", 11340),
    ("tungsten", "텅스텐", 19250),
    ("molybdenum", "몰리브덴", 10280),
    ("tantalum", "탄탈럼", 16690),
    ("niobium", "니오븀", 8570),
    ("silver", "은", 10490),
    ("gold", "금", 19320),
    ("platinum", "백금", 21450),
    ("palladium", "팔라듐", 12020),
    ("rhodium", "로듐", 12410),
    ("iridium", "이리듐", 22560),
    ("ruthenium", "루테늄", 12370),
    ("osmium", "오스뮴", 22590),
    ("monel400", "모넬 400", 8800),
    ("incoloy800", "인콜로이 800", 7940),
    ("inconel718", "인코넬 718", 8190),
    ("inconel625", "인코넬 625", 8440),
    ("hastelloyC276", "하스텔로이 C-276", 8890),
    ("gold24k", "금 24K", 19320),
    ("platinumLab", "백금 (실험실용)", 21450),
    ("diamond", "다이아몬드", 3515),
    ("ruby", "루비", 3980),
    ("emerald", "에메랄드", 2760),
    ("yag", "YAG", 4550),
    ("silicon", "실리콘", 2329),
    ("quartz", "석영(Quartz)", 2650),
    ("fusedSilica", "용융 실리카", 2203),
    ("borosilicateGlass", "붕규산 유리", 2230),
    ("sodaLimeGlass", "소다석회 유리", 2500),
    ("alumina", "알루미나", 3950),
    ("zirconia", "지르코니아", 6050),
    ("siliconCarbide", "탄화규소(SiC)", 3210),
    ("siliconNitride", "질화규소(Si3N4)", 3200),
    ("sapphire", "사파이어", 3980),
    ("macor", "마코어(Macor)", 2520),
    ("graphite", "흑연", 1800),
    ("glassyCarbon", "글래시 카본", 1420),
    ("carbonFiberComposite", "카본파이버 복합재", 1600),
    ("cfrp", "CFRP", 1550),
    ("carbonCarbon", "C/C 복합재", 1750),
    ("abs", "ABS", 1040),
    ("pom", "POM", 1410),
    ("peek", "PEEK", 1320),
    ("ptfe", "PTFE", 2200),
    ("pvdf", "PVDF", 1780),
    ("pvc", "PVC", 1380),
    ("polycarbonate", "폴리카보네이트(PC)", 1200),
    ("acrylic", "아크릴(PMMA)", 1190),
    ("nylon6", "나일론 6", 1130),
    ("polypropylene", "폴리프로필렌(PP)", 900),
    ("hdpe", "HDPE", 950),
    ("uhmwpe", "UHMW-PE", 930),
    ("epoxyG10", "에폭시 G10/FR4", 1850),
    ("rubber", "고무", 1100),
]

# 소재명 텍스트(한글/영문)에서 소재 계열을 좁히기 위한 키워드 -> 후보 키 목록.
# 밀도만으로는 애매한 경우(예: 강철 계열 여러 개가 밀도가 비슷함) 이 키워드로 우선순위를 정합니다.
MATERIAL_KEYWORD_GROUPS = [
    (re.compile(r"연강|mild\s*steel|low\s*carbon"), ["lowCarbonSteel", "carbonSteel"]),
    (re.compile(r"합금강|alloy\s*steel"), ["alloySteel"]),
    (re.compile(r"공구강|tool\s*steel"), ["toolSteel"]),
    (re.compile(r"주철|cast\s*iron"), ["castIron"]),
    (re.compile(r"탄소강|steel|강철|스틸"), ["carbonSteel", "lowCarbonSteel", "alloySteel"]),
    (re.compile(r"알루미늄|알미늄|aluminum|aluminium"), ["al6061", "al7075", "al5052", "al1050"]),
    (re.compile(r"무산소동|ofhc"), ["oxygenFreeCopper", "ofeCopper"]),
    (re.compile(r"청동|bronze"), ["bronze", "phosphorBronze"]),
    (re.compile(r"황동|brass"), ["brass"]),
    (re.compile(r"구리|동|copper"), ["copper", "oxygenFreeCopper"]),
    (re.compile(r"티타늄|titanium"), ["titaniumGr2", "titaniumGr5"]),
    (re.compile(r"인코넬|inconel"), ["inconel718", "inconel625"]),
    (re.compile(r"모넬|monel"), ["monel400"]),
]


def _decode_utf16be_hex(hex_value):
    clean_hex = re.sub(r"\s+", "", hex_value)

    if not clean_hex or len(clean_hex) % 4 != 0:
        return ""

    try:
        code_points = [int(clean_hex[i : i + 4], 16) for i in range(0, len(clean_hex), 4)]
        return "".join(chr(cp) for cp in code_points)
    except ValueError:
        return ""


def decode_step_text(value, fallback=""):
    if not value:
        return fallback

    decoded = re.sub(
        r"\\X2\\([0-9A-Fa-f]+)\\X0\\",
        lambda m: _decode_utf16be_hex(m.group(1)),
        value,
    )
    decoded = re.sub(
        r"\\X\\([0-9A-Fa-f]{2})",
        lambda m: chr(int(m.group(1), 16)),
        decoded,
    )
    decoded = re.sub(r"\\P[A-Za-z]\\?", "", decoded)
    decoded = re.sub(r"\s+", " ", decoded).strip()

    return decoded or fallback


def _extract_refs(args_text):
    return [int(match) for match in re.findall(r"#(\d+)", args_text)]


def _extract_quoted_strings(args_text):
    return re.findall(r"'([^']*)'", args_text)


def _parse_step_entities(text):
    entities = {}

    for match in re.finditer(r"#(\d+)\s*=\s*([A-Z0-9_]+)\s*\(([^;]*)\)\s*;", text):
        entities[int(match.group(1))] = (match.group(2), match.group(3))

    return entities


def _normalize_part_name(name):
    normalized = re.sub(r"[:_]\d+$", "", name or "").strip().lower()
    return re.sub(r"\s+", " ", normalized)


def count_assembly_leaf_parts(text):
    """STEP의 NEXT_ASSEMBLY_USAGE_OCCURRENCE 트리를 따라가서, 자식이 없는 말단(leaf)
    부품의 이름과 인스턴스 수를 셉니다. 반환값: { part_name: count }.
    조립도에 '있어야 하는' 부품 목록을 얻어, OCC가 실제로 불러온 솔리드와 대조하는 용도입니다."""
    entities = _parse_step_entities(text)

    formation_of_definition = {}
    product_of_formation = {}
    name_of_product = {}
    edges = []

    for entity_id, (entity_type, args) in entities.items():
        if entity_type == "PRODUCT_DEFINITION":
            refs = _extract_refs(args)
            if refs:
                formation_of_definition[entity_id] = refs[0]
        elif entity_type in (
            "PRODUCT_DEFINITION_FORMATION",
            "PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE",
        ):
            refs = _extract_refs(args)
            if refs:
                product_of_formation[entity_id] = refs[0]
        elif entity_type == "PRODUCT":
            strings = _extract_quoted_strings(args)
            raw = (strings[1] if len(strings) > 1 else (strings[0] if strings else "")).strip()
            name = decode_step_text(raw)
            if name:
                name_of_product[entity_id] = name
        elif entity_type == "NEXT_ASSEMBLY_USAGE_OCCURRENCE":
            refs = _extract_refs(args)
            if len(refs) >= 2:
                edges.append((refs[0], refs[1]))

    children_by_parent = {}
    related_ids = set()
    for relating, related in edges:
        children_by_parent.setdefault(relating, []).append(related)
        related_ids.add(related)

    def resolve_name(definition_id):
        formation_id = formation_of_definition.get(definition_id)
        if formation_id is None:
            return None
        product_id = product_of_formation.get(formation_id)
        if product_id is None:
            return None
        return name_of_product.get(product_id)

    counts = {}

    def walk(definition_id, depth):
        if depth > 25:
            return
        children = children_by_parent.get(definition_id)
        if not children:
            name = resolve_name(definition_id)
            if name:
                counts[name] = counts.get(name, 0) + 1
            return
        for child in children:
            walk(child, depth + 1)

    roots = [d for d in formation_of_definition if d not in related_ids]
    for root in roots:
        walk(root, 0)

    return counts


def extract_material_hints_by_name(text):
    """STEP 텍스트에서 부품별 소재명/밀도 힌트를 추출합니다.
    반환값: { normalized_part_name: {"materialText": str, "densityGCm3": float|None} }
    """
    entities = _parse_step_entities(text)

    # property_definition_id -> ("material" | "density", product_definition_id)
    property_kind_by_id = {}
    for entity_id, (entity_type, args) in entities.items():
        if entity_type != "PROPERTY_DEFINITION":
            continue

        strings = _extract_quoted_strings(args)
        refs = _extract_refs(args)

        if len(strings) < 2 or not refs:
            continue

        label = strings[1].strip().lower()

        if label == "material name":
            property_kind_by_id[entity_id] = ("material", refs[0])
        elif label == "density of part":
            property_kind_by_id[entity_id] = ("density", refs[0])

    # property_definition_id -> representation_id
    representation_by_property = {}
    for entity_id, (entity_type, args) in entities.items():
        if entity_type != "PROPERTY_DEFINITION_REPRESENTATION":
            continue
        refs = _extract_refs(args)
        if len(refs) >= 2:
            representation_by_property[refs[0]] = refs[1]

    # representation_id -> first item ref (representations end with a context ref last)
    item_by_representation = {}
    for entity_id, (entity_type, args) in entities.items():
        if entity_type != "REPRESENTATION":
            continue
        refs = _extract_refs(args)
        if len(refs) >= 2:
            item_by_representation[entity_id] = refs[0]

    # product_definition_id -> {"materialText":..., "densityGCm3":...}
    hints_by_product_def = {}

    for prop_id, (kind, product_def_id) in property_kind_by_id.items():
        representation_id = representation_by_property.get(prop_id)
        if representation_id is None:
            continue
        item_id = item_by_representation.get(representation_id)
        if item_id is None or item_id not in entities:
            continue

        item_type, item_args = entities[item_id]
        hint = hints_by_product_def.setdefault(
            product_def_id, {"materialText": "", "densityGCm3": None}
        )

        if kind == "material" and item_type == "DESCRIPTIVE_REPRESENTATION_ITEM":
            strings = _extract_quoted_strings(item_args)
            if strings:
                hint["materialText"] = decode_step_text(strings[0])
        elif kind == "density" and item_type == "MEASURE_REPRESENTATION_ITEM":
            value_match = re.search(
                r"POSITIVE_RATIO_MEASURE\s*\(\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*\)",
                item_args,
            )
            if value_match:
                try:
                    hint["densityGCm3"] = float(value_match.group(1))
                except ValueError:
                    pass

    # product_definition_id -> part name (이 파일들은 보통 PRODUCT_DEFINITION의 첫 문자열이
    # 사람이 읽을 수 있는 부품명입니다)
    name_by_product_def = {}
    for entity_id, (entity_type, args) in entities.items():
        if entity_type != "PRODUCT_DEFINITION":
            continue
        strings = _extract_quoted_strings(args)
        if strings:
            name_by_product_def[entity_id] = decode_step_text(strings[0], "")

    hints_by_name = {}
    for product_def_id, hint in hints_by_product_def.items():
        if not hint["materialText"] and hint["densityGCm3"] is None:
            continue
        name = name_by_product_def.get(product_def_id)
        if not name:
            continue
        hints_by_name[_normalize_part_name(name)] = hint

    return hints_by_name


_STAINLESS_PATTERN = re.compile(r"스테인|stainless")


def guess_material_key(material_text, density_g_cm3):
    text = (material_text or "").strip()

    # 스테인리스는 모델링 프로그램에 정확한 등급이 없어 다른 등급으로 저장되는 경우가 많고,
    # 등급 표기 방식도 제각각이라 텍스트만으로 신뢰하기 어렵습니다. 그래서 STEP에
    # "스테인리스/stainless"라고만 적혀 있으면 무조건 가장 흔한 304로 지정합니다. 316 등 다른
    # 등급이 필요하면 하중 계산 화면에서 직접 다시 지정하면 됩니다.
    if _STAINLESS_PATTERN.search(text):
        return "stainless304"

    keyword_candidates = None

    for pattern, candidates in MATERIAL_KEYWORD_GROUPS:
        if pattern.search(text):
            keyword_candidates = candidates
            break

    density_matches = []
    if density_g_cm3 is not None:
        target_kg_m3 = density_g_cm3 * 1000
        tolerance = max(30, target_kg_m3 * 0.02)
        density_matches = [
            key
            for key, _label, density in MATERIAL_OPTIONS
            if abs(density - target_kg_m3) <= tolerance
        ]
        density_matches.sort(
            key=lambda key: abs(next(d for k, _l, d in MATERIAL_OPTIONS if k == key) - target_kg_m3)
        )

    if keyword_candidates and density_matches:
        overlap = [key for key in keyword_candidates if key in density_matches]
        if overlap:
            return overlap[0]

    if density_matches:
        return density_matches[0]

    if keyword_candidates:
        return keyword_candidates[0]

    return None

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

    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as step_file:
            raw_text = step_file.read()
    except OSError:
        raw_text = ""

    material_hints_by_name = extract_material_hints_by_name(raw_text) if raw_text else {}

    part_map = {}
    total_bounds = None
    total_shape_count = len(shapes_labels_colors)
    # 인식 안 된 부품을 {이름, 사유}로 모읍니다. 정규화 이름으로 중복을 걸러냅니다.
    skipped_parts = []
    skipped_norm_names = set()

    def add_skipped(name, reason):
        norm = _normalize_part_name(name)
        if norm in skipped_norm_names:
            return
        skipped_norm_names.add(norm)
        skipped_parts.append({"name": name, "reason": reason})

    for index, (shape, (label_name, _color)) in enumerate(shapes_labels_colors.items()):
        volume_mm3 = shape_volume_mm3(shape)

        if volume_mm3 <= 0:
            add_skipped(
                safe_name(label_name, f"Unnamed part {index + 1}"),
                "솔리드가 아니어서 체적을 계산할 수 없습니다 (면·셸·와이어 형태).",
            )
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
    material_notes = []

    for item in part_map.values():
        count = max(1, item["count"])
        unit_volume_mm3 = item["totalVolumeMm3"] / count
        material_key = item["materialKey"]

        hint = material_hints_by_name.get(_normalize_part_name(item["name"]))

        if hint:
            guessed_key = guess_material_key(hint.get("materialText"), hint.get("densityGCm3"))

            if guessed_key:
                material_key = guessed_key
                guessed_label = next(
                    (label for key, label, _density in MATERIAL_OPTIONS if key == guessed_key),
                    guessed_key,
                )
                density_note = (
                    f", 밀도 {hint['densityGCm3']:.2f} g/cm³" if hint.get("densityGCm3") is not None else ""
                )
                text_note = f" ('{hint['materialText']}')" if hint.get("materialText") else ""
                material_notes.append(
                    f"'{item['name']}' 부품: STEP에서 소재 정보를 찾아 '{guessed_label}'로 자동 "
                    f"설정했습니다{text_note}{density_note}."
                )

        part_items.append(
            {
                "name": item["name"],
                "count": count,
                "materialKey": material_key,
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

    # 조립도 트리에는 있으나 OCC가 솔리드로 불러오지 못한 부품을 찾아냅니다.
    # (예: 참조/빈 노드이거나, OCC가 형상을 열지 못한 경우 — 하중 계산에서 통째로 빠짐)
    recognized_norm_names = {_normalize_part_name(name) for name in part_map}
    if raw_text:
        for tree_name in count_assembly_leaf_parts(raw_text):
            norm = _normalize_part_name(tree_name)
            if norm and norm not in recognized_norm_names:
                add_skipped(
                    tree_name,
                    "조립도에는 있으나 솔리드 형상을 불러오지 못했습니다.",
                )

    notes = [
        "OpenCascade(pythonocc-core) solid analysis completed on the remote analyzer.",
        "Volumes are computed from BRepGProp VolumeProperties in mm^3.",
    ]

    if skipped_parts:
        sample = ", ".join(f"'{p['name']}'" for p in skipped_parts[:8])
        more = f" 외 {len(skipped_parts) - 8}개" if len(skipped_parts) > 8 else ""
        notes.append(
            f"⚠ 부품 {len(skipped_parts)}개가 하중 계산에서 제외되었습니다(체적을 계산할 수 없거나 "
            f"형상을 불러오지 못함). 실제 무게보다 가볍게 나올 수 있으니 주의하세요: {sample}{more}"
        )

    if volume_fill_ratio is not None:
        notes.append(f"Bounding-box fill ratio is {volume_fill_ratio * 100:.1f}%.")

        if volume_fill_ratio >= 0.85:
            notes.append(
                "The imported model is almost a full solid relative to its outer size."
            )

    notes.extend(material_notes)

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
        "modelSkippedParts": skipped_parts,
        "modelSkippedShapeCount": len(skipped_parts),
        "modelTotalShapeCount": total_shape_count,
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
