import { LM_GUIDE_DATABASE } from "./lmGuideDatabase";
import { ENCODER_DATABASE } from "./encoderDatabase";

function matchesMinimumNumber(value, minimum) {
  if (!Number.isFinite(minimum) || minimum <= 0) {
    return true;
  }

  if (!Number.isFinite(value)) {
    return false;
  }

  return value >= minimum;
}

function matchesTextFilter(itemValue, filterValue) {
  if (!filterValue || filterValue === "all") {
    return true;
  }

  if (itemValue === null || itemValue === undefined || itemValue === "catalog_check_required") {
    return false;
  }

  return String(itemValue).toLowerCase() === String(filterValue).toLowerCase();
}

function matchesLooseText(itemValue, filterValue) {
  if (!filterValue || filterValue === "all") {
    return true;
  }

  if (itemValue === null || itemValue === undefined || itemValue === "catalog_check_required") {
    return false;
  }

  return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
}

export function findLmGuideCandidates(loadCondition = {}, motionCondition = {}, database = LM_GUIDE_DATABASE) {
  const {
    requiredLoad = 0,
    requiredStaticLoad = 0,
    railSize = "",
    accuracyGrade = "",
  } = loadCondition;

  const {
    maxSpeed_m_min: requiredSpeed = 0,
    application = "",
  } = motionCondition;

  return database
    .filter((item) => matchesMinimumNumber(item.dynamicLoad_N, requiredLoad))
    .filter((item) => matchesMinimumNumber(item.staticLoad_N, requiredStaticLoad))
    .filter((item) => matchesMinimumNumber(item.maxSpeed_m_min, requiredSpeed))
    .filter((item) => matchesTextFilter(item.railSize, railSize))
    .filter((item) => matchesTextFilter(item.accuracyGrade, accuracyGrade))
    .filter((item) => matchesLooseText(item.application, application))
    .sort((left, right) => {
      const leftLoad = Number.isFinite(left.dynamicLoad_N) ? left.dynamicLoad_N : Number.MAX_SAFE_INTEGER;
      const rightLoad = Number.isFinite(right.dynamicLoad_N) ? right.dynamicLoad_N : Number.MAX_SAFE_INTEGER;
      return leftLoad - rightLoad;
    });
}

export function findEncoderCandidates(motorCondition = {}, accuracyCondition = {}, database = ENCODER_DATABASE) {
  const {
    maxSpeed_rpm: requiredRpm = 0,
    encoderType = "",
    measurementType = "",
    interfaceType = "",
  } = motorCondition;

  const {
    resolution = "",
    accuracy = "",
  } = accuracyCondition;

  return database
    .filter((item) => matchesMinimumNumber(item.maxSpeed_rpm, requiredRpm))
    .filter((item) => matchesTextFilter(item.encoderType, encoderType))
    .filter((item) => matchesTextFilter(item.measurementType, measurementType))
    .filter((item) => matchesTextFilter(item.interfaceType, interfaceType))
    .filter((item) => matchesLooseText(item.resolution, resolution))
    .filter((item) => matchesLooseText(item.accuracy, accuracy))
    .sort((left, right) => {
      const leftSpeed = Number.isFinite(left.maxSpeed_rpm) ? left.maxSpeed_rpm : Number.MAX_SAFE_INTEGER;
      const rightSpeed = Number.isFinite(right.maxSpeed_rpm) ? right.maxSpeed_rpm : Number.MAX_SAFE_INTEGER;
      return leftSpeed - rightSpeed;
    });
}
