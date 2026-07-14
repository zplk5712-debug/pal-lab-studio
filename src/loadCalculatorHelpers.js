import {
  DEFAULT_LOAD_FORM,
  LOAD_INPUT_MODE_OPTIONS,
  SHAPE_OPTIONS,
} from "./loadCalculatorData";
import { formatLoadNumber } from "./loadCalculatorUtils";

let loadItemSeed = 1;

export function createLoadItem(overrides = {}) {
  const id = `load-item-${loadItemSeed}`;
  loadItemSeed += 1;
  return {
    id,
    ...DEFAULT_LOAD_FORM,
    ...overrides,
    modelNotes: [...(overrides.modelNotes ?? DEFAULT_LOAD_FORM.modelNotes)],
    modelPartItems: (overrides.modelPartItems ?? DEFAULT_LOAD_FORM.modelPartItems).map((part) => ({
      ...part,
    })),
    modelSelectedPartNames: [
      ...(overrides.modelSelectedPartNames ?? DEFAULT_LOAD_FORM.modelSelectedPartNames),
    ],
  };
}

export function cloneLoadItem(item) {
  const { id: _ignoredId, ...rest } = item;

  return createLoadItem({
    ...rest,
    itemName: item.itemName?.trim() ? `${item.itemName.trim()} 복사본` : "",
    isCollapsed: false,
  });
}

export function getShapeOption(shape) {
  return SHAPE_OPTIONS.find((item) => item.value === shape) ?? SHAPE_OPTIONS[0];
}

export function getItemTitle(index, item) {
  const customName = item.itemName?.trim();

  if (customName) {
    return customName;
  }

  if (item.inputMode === "manual") {
    return `항목 ${index + 1} · 수동 입력`;
  }

  if (item.inputMode === "model") {
    return `항목 ${index + 1} · ${item.modelFileName || item.modelPartName || "모델링 파일"}`;
  }

  return `항목 ${index + 1} · ${getShapeOption(item.shape).label}`;
}

export function getInputModeLabel(value) {
  return LOAD_INPUT_MODE_OPTIONS.find((option) => option.value === value)?.label ?? "-";
}

export function getItemQuickFacts(item, itemResult) {
  const facts = [getInputModeLabel(item.inputMode)];
  const quantity = Number(item.quantity);

  if (item.inputMode === "direct") {
    facts.push(getShapeOption(item.shape).label);
  }

  if (item.inputMode === "model" && item.modelAssemblyType === "assembly") {
    facts.push(`부품 ${formatLoadNumber(item.modelPartCount, 0)}종`);
  } else if (item.inputMode === "model" && item.modelFileName) {
    facts.push(item.modelFileName);
  }

  if (Number.isFinite(quantity) && quantity > 0) {
    facts.push(`개수 ${formatLoadNumber(quantity, 0)}`);
  }

  if (itemResult) {
    facts.push(`${formatLoadNumber(itemResult.massKg, 3)} kg`);
  }

  return facts;
}
