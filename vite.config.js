import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { WEB_SEARCH_PROVIDERS } from "./src/companyDirectory.js";

function decodeDuckDuckGoUrl(rawUrl) {
  try {
    if (!rawUrl) {
      return "";
    }

    if (rawUrl.startsWith("//")) {
      return `https:${rawUrl}`;
    }

    if (!rawUrl.startsWith("http")) {
      return rawUrl;
    }

    const parsed = new URL(rawUrl);

    if (parsed.hostname.includes("duckduckgo.com")) {
      const uddg = parsed.searchParams.get("uddg");
      return uddg ? decodeURIComponent(uddg) : rawUrl;
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}

function stripTags(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function isOfficialUrl(url, provider) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return provider.domains.some((domain) => hostname.endsWith(domain.replace(/^www\./, "")));
  } catch {
    return false;
  }
}

function buildSearchQuery(provider, params) {
  const parts = [
    provider.keyword,
    params.motorType && params.motorType !== "?꾩껜" ? params.motorType : "",
    params.phaseType && params.phaseType !== "?꾩껜" ? params.phaseType : "",
    params.direction === "vertical" ? "vertical brake" : "linear motion",
  ];

  if (params.requiredPowerW) {
    parts.push(`${Math.max(1, Math.round(Number(params.requiredPowerW)))}W`);
  }

  if (params.requiredRpm) {
    parts.push(`${Math.max(1, Math.round(Number(params.requiredRpm)))}rpm`);
  }

  if (params.requiredTorqueNm) {
    parts.push(`${Number(params.requiredTorqueNm).toFixed(2)}Nm`);
  }

  if (params.requiredForceN) {
    parts.push(`${Number(params.requiredForceN).toFixed(1)}N`);
  }

  if (params.requiredSpeedMmS) {
    parts.push(`${Math.max(1, Math.round(Number(params.requiredSpeedMmS)))}mm/s`);
  }

  const domainQuery = provider.domains.map((domain) => `site:${domain}`).join(" OR ");
  return `${parts.filter(Boolean).join(" ")} ${domainQuery}`;
}

function buildSearchQueries(provider, params) {
  const domainQuery = provider.domains.map((domain) => `site:${domain}`).join(" OR ");
  const genericMotorType = params.motorType && params.motorType !== "?袁⑷퍥" ? params.motorType : "";
  const genericPhaseType = params.phaseType && params.phaseType !== "?袁⑷퍥" ? params.phaseType : "";

  return [
    buildSearchQuery(provider, params),
    `${[provider.keyword, genericMotorType, genericPhaseType, "catalog product gearmotor servo stepper brake"]
      .filter(Boolean)
      .join(" ")} ${domainQuery}`,
    `${[provider.keyword, genericMotorType, "motion product selector datasheet"].filter(Boolean).join(" ")} ${domainQuery}`,
  ];
}

function parseDuckDuckGoResults(html, provider, limit = 5) {
  const results = [];
  const resultPattern =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>|<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>)([\s\S]*?)(?:<\/a>|<\/div>)/g;

  let match;
  while ((match = resultPattern.exec(html)) !== null && results.length < limit) {
    const url = decodeDuckDuckGoUrl(match[1]);

    if (!isOfficialUrl(url, provider)) {
      continue;
    }

    results.push({
      company: provider.company,
      title: stripTags(match[2]),
      snippet: stripTags(match[3]),
      url,
      source: "Official web search",
    });
  }

  return results;
}

function buildManualSearchQuery(provider, params) {
  const parts = [
    provider.keyword,
    params.motorType && params.motorType !== "?꾩껜" ? params.motorType : "",
    params.phaseType && params.phaseType !== "?꾩껜" ? params.phaseType : "",
    "manual datasheet catalog pdf",
  ];

  const domainQuery = provider.domains.map((domain) => `site:${domain}`).join(" OR ");
  return `${parts.filter(Boolean).join(" ")} filetype:pdf ${domainQuery}`;
}

function buildManualSearchQueries(provider, params) {
  const domainQuery = provider.domains.map((domain) => `site:${domain}`).join(" OR ");
  const genericMotorType = params.motorType && params.motorType !== "?袁⑷퍥" ? params.motorType : "";
  const genericPhaseType = params.phaseType && params.phaseType !== "?袁⑷퍥" ? params.phaseType : "";

  return [
    buildManualSearchQuery(provider, params),
    `${[provider.keyword, genericMotorType, genericPhaseType, "manual pdf"].filter(Boolean).join(" ")} ${domainQuery}`,
    `${[provider.keyword, genericMotorType, "datasheet pdf catalog"].filter(Boolean).join(" ")} ${domainQuery}`,
  ];
}

function resolveOfficialUrl(rawUrl, baseUrl, provider) {
  try {
    const absoluteUrl = new URL(rawUrl, baseUrl).toString();
    return isOfficialUrl(absoluteUrl, provider) ? absoluteUrl : "";
  } catch {
    return "";
  }
}

function parsePdfLinksFromHtml(html, baseUrl, provider) {
  const links = [];
  const seen = new Set();
  const linkPattern = /href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/gi;

  let match;
  while ((match = linkPattern.exec(html)) !== null && links.length < 4) {
    const absoluteUrl = resolveOfficialUrl(match[1], baseUrl, provider);

    if (!absoluteUrl || seen.has(absoluteUrl)) {
      continue;
    }

    seen.add(absoluteUrl);
    links.push(absoluteUrl);
  }

  return links;
}

function collectMetricValues(text, pattern, mapper) {
  const values = [];
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const value = mapper(match);

    if (Number.isFinite(value) && value > 0) {
      values.push(value);
    }
  }

  pattern.lastIndex = 0;
  return [...new Set(values.map((value) => Number(value.toFixed(3))))];
}

function selectMetric(values, requiredValue = 0) {
  const sorted = [...values].sort((left, right) => left - right);

  if (sorted.length === 0) {
    return null;
  }

  if (!(requiredValue > 0)) {
    return sorted[sorted.length - 1];
  }

  const aboveRequired = sorted.find((value) => value >= requiredValue);
  if (aboveRequired) {
    return aboveRequired;
  }

  const nearRequired = sorted.find((value) => value >= requiredValue * 0.7);
  if (nearRequired) {
    return nearRequired;
  }

  return sorted[sorted.length - 1];
}

function cleanProductTitle(title, company) {
  return title
    .replace(new RegExp(company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "")
    .replace(/\b(pdf|manual|catalog|datasheet|brochure|user guide|user manual|product guide)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractModelNumber(title, url, text) {
  const haystack = `${title} ${decodeURIComponent(url)} ${text.slice(0, 800)}`;
  const patterns = [
    /\b[A-Z]{2,}[A-Z0-9]*(?:[-/][A-Z0-9]{2,})+\b/g,
    /\b[A-Z]{1,5}\d{1,}[A-Z0-9-]{1,}\b/g,
  ];

  for (const pattern of patterns) {
    const matches = haystack.match(pattern) || [];
    const filtered = matches
      .map((value) => value.replace(/\.pdf$/i, ""))
      .filter((value) => value.length >= 4);

    if (filtered.length > 0) {
      return filtered[0];
    }
  }

  return "";
}

function inferPhaseTypes(text) {
  const lowerText = text.toLowerCase();
  const phaseTypes = [];

  if (/3[\s-]?phase|three[\s-]?phase/.test(lowerText)) {
    phaseTypes.push("3-phase AC");
  }

  if (/1[\s-]?phase|single[\s-]?phase/.test(lowerText)) {
    phaseTypes.push("1-phase AC");
  }

  if (/2[\s-]?phase/.test(lowerText)) {
    phaseTypes.push("2-phase");
  }

  if (/5[\s-]?phase/.test(lowerText)) {
    phaseTypes.push("5-phase");
  }

  if (/\bdc\b|brushless dc|bldc/.test(lowerText)) {
    phaseTypes.push("DC");
  }

  return phaseTypes.length > 0 ? [...new Set(phaseTypes)] : ["ALL"];
}

function inferMotorType(text) {
  const lowerText = text.toLowerCase();

  if (/induction|low voltage motor|ie3|ie4/.test(lowerText)) {
    return "induction motor";
  }

  if (/hybrid servo|closed loop stepper|closed-loop stepper/.test(lowerText)) {
    return "closed-loop stepper";
  }

  if (/5[\s-]?phase/.test(lowerText)) {
    return "5-phase stepper";
  }

  if (/stepper|stepping/.test(lowerText)) {
    return "stepper motor";
  }

  if (/ultrasonic|nanomotion|linear stage|precision stage/.test(lowerText)) {
    return "precision direct drive";
  }

  if (/brushless|servo|bldc/.test(lowerText)) {
    return "brushless motor";
  }

  return "ALL";
}

function buildWebManualCandidate(manual, params) {
  const combinedText = `${manual.title} ${manual.fullText} ${manual.url}`.replace(/\s+/g, " ").trim();
  const lowerText = combinedText.toLowerCase();

  const powerValues = collectMetricValues(
    combinedText,
    /(\d+(?:\.\d+)?)\s*(kW|W)\b/gi,
    (match) => Number(match[1]) * (match[2].toLowerCase() === "kw" ? 1000 : 1),
  );
  const rpmValues = collectMetricValues(
    combinedText,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*rpm\b/gi,
    (match) => Number(match[1].replace(/,/g, "")),
  );
  const torqueValues = collectMetricValues(
    combinedText,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*N\s*[·•-]?\s*m\b/gi,
    (match) => Number(match[1].replace(/,/g, "")),
  );
  const forceValues = collectMetricValues(
    combinedText,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*N\b(?!\s*[·•-]?\s*m)/gi,
    (match) => Number(match[1].replace(/,/g, "")),
  );
  const speedValues = collectMetricValues(
    combinedText,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*mm\/s\b/gi,
    (match) => Number(match[1].replace(/,/g, "")),
  );

  const requiredPower = Number(params.requiredPowerW) || 0;
  const requiredTorque = Number(params.requiredTorqueNm) || 0;
  const requiredRpm = Number(params.requiredRpm) || 0;
  const requiredForce = Number(params.requiredForceN) || 0;
  const requiredSpeed = Number(params.requiredSpeedMmS) || 0;

  const powerW = selectMetric(powerValues, requiredPower);
  const modelNumber = extractModelNumber(manual.title, manual.url, manual.fullText);
  const productName = cleanProductTitle(manual.title, manual.company) || `${manual.company} web manual candidate`;
  const phaseTypes =
    params.phaseType && params.phaseType !== "?꾩껜"
      ? [params.phaseType]
      : inferPhaseTypes(combinedText);
  const motorType =
    params.motorType && params.motorType !== "?꾩껜"
      ? params.motorType
      : inferMotorType(combinedText);
  const verticalReady = /vertical|brake|holding brake|electromagnetic brake/.test(lowerText);
  const linearHints =
    /linear|direct drive|ultrasonic|stall force|thrust/.test(lowerText) ||
    (speedValues.length > 0 && forceValues.length > 0 && rpmValues.length === 0);

  if (linearHints) {
    const maxLinearForceN = selectMetric(forceValues, requiredForce);
    const maxLinearSpeedMmS = selectMetric(speedValues, requiredSpeed);

    if (!powerW || !maxLinearForceN || !maxLinearSpeedMmS) {
      return null;
    }

    return {
      company: manual.company,
      series: "Official web manual",
      productName,
      modelNumber: modelNumber || productName,
      sampleModel: `${productName} / ${manual.company} official web manual`,
      motorType,
      phaseTypes,
      imageUrl: null,
      powerW,
      maxMotorRpm: 0,
      minMotorRpm: 0,
      gearheadType: "Direct drive / web manual",
      availableRatios: [1],
      verticalReady,
      driveMode: "linear-direct",
      maxLinearSpeedMmS,
      maxLinearForceN,
      notes: "Auto-extracted from an official PDF manual. Recheck the original PDF before final selection.",
      sourceLabel: "Official web manual extract",
      sourceType: "web-manual",
      sourceUrl: manual.url,
      externalReducerOnly: false,
    };
  }

  const maxMotorRpm = selectMetric(rpmValues, requiredRpm);
  const maxOutputTorqueNm = selectMetric(torqueValues, requiredTorque);

  if (!powerW || !maxMotorRpm || !maxOutputTorqueNm) {
    return null;
  }

  return {
    company: manual.company,
    series: "Official web manual",
    productName,
    modelNumber: modelNumber || productName,
    sampleModel: `${productName} / ${manual.company} official web manual`,
    motorType,
    phaseTypes,
    imageUrl: null,
    powerW,
    maxMotorRpm,
    minMotorRpm: Math.max(0, Math.round(maxMotorRpm * 0.05)),
    gearheadType: "Web manual candidate / reducer review",
    availableRatios: [1, 3, 5, 7, 10, 15, 20, 30, 50],
    maxOutputTorqueNm,
    verticalReady,
    externalReducerOnly: true,
    notes: "Auto-extracted from an official PDF manual. Recheck reducer matching and final order code in the original PDF.",
    sourceLabel: "Official web manual extract",
    sourceType: "web-manual",
    sourceUrl: manual.url,
  };
}

async function extractPdfManual(url, company) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("pdf") && !url.toLowerCase().includes(".pdf")) {
    return null;
  }

  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: Buffer.from(await response.arrayBuffer()) });

  try {
    const info = await parser.getInfo({ parsePageInfo: false }).catch(() => null);
    const text = await parser.getText().catch(() => null);
    const cleanText = (text?.text || "").replace(/\s+/g, " ").trim();

    return {
      company,
      title: info?.info?.Title || url.split("/").pop() || "PDF manual",
      url,
      pageCount: info?.total || null,
      fullText: cleanText,
      sample: cleanText.slice(0, 500),
      source: "Official PDF manual",
    };
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function discoverManualCandidates(provider, params) {
  const candidates = [];
  const seen = new Set();
  const manualQueries = buildManualSearchQueries(provider, params);

  for (const query of manualQueries) {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      continue;
    }

    const html = await response.text();
    const searchResults = parseDuckDuckGoResults(html, provider, 6);

    for (const item of searchResults) {
      if (item.url.toLowerCase().includes(".pdf")) {
        if (!seen.has(item.url)) {
          seen.add(item.url);
          candidates.push({ url: item.url, query, referrer: "" });
        }
        continue;
      }

      try {
        const pageResponse = await fetch(item.url, {
          headers: {
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
        });

        if (!pageResponse.ok) {
          continue;
        }

        const pageHtml = await pageResponse.text();
        const pdfLinks = parsePdfLinksFromHtml(pageHtml, item.url, provider);

        for (const pdfUrl of pdfLinks) {
          if (!seen.has(pdfUrl)) {
            seen.add(pdfUrl);
            candidates.push({ url: pdfUrl, query, referrer: item.url });
          }
        }
      } catch {
        continue;
      }
    }

    if (candidates.length >= 4) {
      break;
    }
  }

  return candidates.slice(0, 4);
}

async function searchOfficialManuals(params) {
  const providers =
    params.company && params.company !== "all"
      ? WEB_SEARCH_PROVIDERS.filter((provider) => provider.company === params.company)
      : WEB_SEARCH_PROVIDERS;

  const manuals = [];
  const normalizedCandidates = [];
  const candidateKeys = new Set();

  for (const provider of providers) {
    const manualCandidates = await discoverManualCandidates(provider, params);

    for (const candidate of manualCandidates.slice(0, 2)) {
      try {
        const manual = await extractPdfManual(candidate.url, provider.company);

        if (!manual) {
          continue;
        }

        const normalizedCandidate = buildWebManualCandidate(manual, params);
        if (normalizedCandidate) {
          const candidateKey = `${normalizedCandidate.company}-${normalizedCandidate.productName}-${normalizedCandidate.modelNumber}`;

          if (!candidateKeys.has(candidateKey)) {
            candidateKeys.add(candidateKey);
            normalizedCandidates.push(normalizedCandidate);
          }
        }

        const { fullText: _fullText, ...manualInfo } = manual;
        manuals.push({
          ...manualInfo,
          query: candidate.query,
          referrer: candidate.referrer,
        });
      } catch {
        continue;
      }
    }
  }

  return {
    manuals: manuals.slice(0, 6),
    candidates: normalizedCandidates.slice(0, 6),
  };
}

async function searchOfficialWeb(params) {
  const providers =
    params.company && params.company !== "all"
      ? WEB_SEARCH_PROVIDERS.filter((provider) => provider.company === params.company)
      : WEB_SEARCH_PROVIDERS;

  const collected = [];
  const seen = new Set();

  for (const provider of providers) {
    const searchQueries = buildSearchQueries(provider, params);

    for (const query of searchQueries) {
      const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
      });

      if (!response.ok) {
        continue;
      }

      const html = await response.text();
      const providerResults = parseDuckDuckGoResults(html, provider)
        .filter((item) => {
          if (seen.has(item.url)) {
            return false;
          }

          seen.add(item.url);
          return true;
        })
        .map((item) => ({
          ...item,
          query,
        }));

      collected.push(...providerResults);

      if (providerResults.length > 0 || collected.length >= 6) {
        break;
      }
    }
  }

  return collected.slice(0, 6);
}

const MM3_PER_M3 = 1_000_000_000;

function mm3ToM3(value) {
  return value / MM3_PER_M3;
}

function m3ToMm3(value) {
  return value * MM3_PER_M3;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const rawBody = Buffer.concat(chunks).toString("utf8");
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function inferStepLengthUnit(text) {
  if (/SI_UNIT\s*\(\s*\.MILLI\.\s*,\s*\.METRE\.\s*\)/i.test(text)) {
    return "mm";
  }

  if (/SI_UNIT\s*\(\s*\$?\s*,\s*\.METRE\.\s*\)/i.test(text)) {
    return "m";
  }

  return "unknown";
}

function convertStepVolumeValueToM3(rawVolume, lengthUnit) {
  if (lengthUnit === "mm") {
    return mm3ToM3(rawVolume);
  }

  if (lengthUnit === "m") {
    return rawVolume;
  }

  return null;
}

function decodeUtf16BeHex(hexValue) {
  const cleanHex = hexValue.replace(/\s+/g, "");

  if (!cleanHex || cleanHex.length % 4 !== 0) {
    return "";
  }

  const codePoints = [];

  for (let index = 0; index < cleanHex.length; index += 4) {
    const chunk = cleanHex.slice(index, index + 4);
    const codePoint = Number.parseInt(chunk, 16);

    if (!Number.isFinite(codePoint)) {
      return "";
    }

    codePoints.push(codePoint);
  }

  return String.fromCharCode(...codePoints);
}

function decodeStepName(value, fallback = "Unnamed part") {
  if (!value) {
    return fallback;
  }

  const decoded = value
    .replace(/\\X2\\([0-9A-F]+)\\X0\\/gi, (_, hex) => decodeUtf16BeHex(hex) || "")
    .replace(/\\X\\([0-9A-F]{2})/gi, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/\\P[A-Z]\\?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return decoded || fallback;
}

function extractStepVolumeCandidatesM3(text, lengthUnit) {
  const matches = [...text.matchAll(/VOLUME_MEASURE\s*\(\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*\)/gi)];

  return [...new Set(matches
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => convertStepVolumeValueToM3(value, lengthUnit))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Number(value.toFixed(9))))];
}

function parseStepEntities(text) {
  const entities = new Map();
  const entityRegex = /#(\d+)\s*=\s*([A-Z0-9_]+)\s*\(([^;]*)\)\s*;/g;
  let match = entityRegex.exec(text);

  while (match) {
    entities.set(Number(match[1]), { type: match[2], args: match[3] });
    match = entityRegex.exec(text);
  }

  return entities;
}

function extractRefIds(argsText) {
  return [...argsText.matchAll(/#(\d+)/g)].map((match) => Number(match[1]));
}

function extractQuotedStrings(argsText) {
  return [...argsText.matchAll(/'([^']*)'/g)].map((match) => match[1]);
}

function buildStepAssemblyGraph(entities) {
  const formationOfDefinition = new Map();
  const productOfFormation = new Map();
  const nameOfProduct = new Map();
  const assemblyEdges = [];

  entities.forEach(({ type, args }, id) => {
    if (type === "PRODUCT_DEFINITION") {
      const refs = extractRefIds(args);

      if (refs.length > 0) {
        formationOfDefinition.set(id, refs[0]);
      }

      return;
    }

    if (
      type === "PRODUCT_DEFINITION_FORMATION" ||
      type === "PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE"
    ) {
      const refs = extractRefIds(args);

      if (refs.length > 0) {
        productOfFormation.set(id, refs[0]);
      }

      return;
    }

    if (type === "PRODUCT") {
      const strings = extractQuotedStrings(args);
      const name = decodeStepName((strings[1] || strings[0] || "").trim(), "");

      if (name) {
        nameOfProduct.set(id, name);
      }

      return;
    }

    if (type === "NEXT_ASSEMBLY_USAGE_OCCURRENCE") {
      const refs = extractRefIds(args);

      if (refs.length >= 2) {
        assemblyEdges.push({ relating: refs[0], related: refs[1] });
      }
    }
  });

  const resolveProductName = (definitionId) => {
    const formationId = formationOfDefinition.get(definitionId);

    if (formationId === undefined) {
      return undefined;
    }

    const productId = productOfFormation.get(formationId);

    if (productId === undefined) {
      return undefined;
    }

    return nameOfProduct.get(productId);
  };

  return { assemblyEdges, formationOfDefinition, resolveProductName };
}

function countAssemblyInstancesByUsageTree(text) {
  const entities = parseStepEntities(text);
  const { assemblyEdges, formationOfDefinition, resolveProductName } = buildStepAssemblyGraph(entities);

  if (assemblyEdges.length === 0) {
    return null;
  }

  const childrenByParent = new Map();
  const relatedIds = new Set();

  assemblyEdges.forEach(({ relating, related }) => {
    if (!childrenByParent.has(relating)) {
      childrenByParent.set(relating, []);
    }

    childrenByParent.get(relating).push(related);
    relatedIds.add(related);
  });

  const rootIds = [...formationOfDefinition.keys()].filter((id) => !relatedIds.has(id));
  const quantityByName = new Map();
  const MAX_DEPTH = 25;

  const traverse = (definitionId, depth) => {
    if (depth > MAX_DEPTH) {
      return;
    }

    const children = childrenByParent.get(definitionId);

    if (!children || children.length === 0) {
      const name = resolveProductName(definitionId);

      if (name) {
        quantityByName.set(name, (quantityByName.get(name) ?? 0) + 1);
      }

      return;
    }

    children.forEach((childId) => traverse(childId, depth + 1));
  };

  rootIds.forEach((rootId) => traverse(rootId, 0));

  return quantityByName.size > 0 ? quantityByName : null;
}

function extractStepAssemblyParts(text) {
  const quantityByName = countAssemblyInstancesByUsageTree(text);
  let parts;
  const usedAssemblyTree = quantityByName !== null;

  if (usedAssemblyTree) {
    parts = [...quantityByName.entries()].map(([name, count]) => ({ name, count }));
  } else {
    const productMatches = [...text.matchAll(/PRODUCT\s*\(\s*'([^']*)'/gi)];
    const counts = new Map();

    productMatches
      .map((match) => decodeStepName((match[1] || "").trim(), "Unnamed part"))
      .filter((name) => name && name.toUpperCase() !== "NONE")
      .forEach((name) => {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      });

    parts = [...counts.entries()].map(([name, count]) => ({ name, count }));
  }

  parts = parts.sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));

  const totalInstances = parts.reduce((sum, item) => sum + item.count, 0);
  const assemblyType =
    /NEXT_ASSEMBLY_USAGE_OCCURRENCE/i.test(text) || parts.length > 1 || totalInstances > 1
      ? "assembly"
      : "single";

  return {
    assemblyType,
    partCount: parts.length,
    totalInstances,
    parts,
    usedAssemblyTree,
  };
}

function parseStepTextServer(text, fileName) {
  const productMatch = text.match(/PRODUCT\s*\(\s*'([^']*)'/i);
  const lengthUnit = inferStepLengthUnit(text);
  const volumeCandidatesM3 = extractStepVolumeCandidatesM3(text, lengthUnit);
  const assembly = extractStepAssemblyParts(text);
  const notes = [];

  if (lengthUnit === "mm") {
    notes.push("Server detected STEP length unit as mm.");
  } else if (lengthUnit === "m") {
    notes.push("Server detected STEP length unit as m.");
  } else {
    notes.push("Server could not confirm STEP length unit.");
  }

  if (volumeCandidatesM3.length > 0) {
    notes.push(`Server found ${volumeCandidatesM3.length} volume candidate(s) in STEP metadata.`);
  } else {
    notes.push("Server could not find direct volume metadata in STEP.");
  }

  if (assembly.assemblyType === "assembly") {
    notes.push(
      assembly.usedAssemblyTree
        ? `Server analyzed the assembly usage tree: ${assembly.partCount} unique part(s), ${assembly.totalInstances} total instance(s).`
        : `Server identified an assembly with ${assembly.partCount} unique part names.`,
    );
  } else {
    notes.push("Server identified a single-part STEP.");
  }

  const canMapAssemblyVolumes =
    assembly.assemblyType === "assembly" &&
    volumeCandidatesM3.length > 0 &&
    volumeCandidatesM3.length === assembly.parts.length;

  return {
    modelPartName: decodeStepName(productMatch?.[1], fileName.replace(/\.[^.]+$/, "")),
    modelDetectedUnit: lengthUnit,
    modelDetectedVolumeM3: volumeCandidatesM3.length > 0 ? Math.max(...volumeCandidatesM3) : null,
    modelBoundingBox: "",
    modelStatus:
      volumeCandidatesM3.length > 0 ? "Server STEP analysis complete" : "Server STEP metadata only",
    modelNotes: notes,
    modelAssemblyType: assembly.assemblyType,
    modelPartCount: assembly.partCount,
    modelPartItems: assembly.parts.map((part, index) => ({
      ...part,
      materialKey: "al6061",
      volumeMm3:
        assembly.assemblyType === "single" && volumeCandidatesM3[0]
          ? String(Math.round(m3ToMm3(volumeCandidatesM3[0])))
          : canMapAssemblyVolumes
            ? String(Math.round(m3ToMm3(volumeCandidatesM3[index] || 0)))
            : "",
      volumeSource:
        assembly.assemblyType === "single" && volumeCandidatesM3[0]
          ? "auto"
          : canMapAssemblyVolumes && volumeCandidatesM3[index]
            ? "auto"
            : "none",
    })),
  };
}

function analyzeModelUpload({ fileName, fileSizeBytes, dataBase64 }, externalAnalyzerError = "") {
  if (!fileName || !dataBase64) {
    throw new Error("missing file payload");
  }

  const extension = `.${fileName.split(".").pop()?.toLowerCase() ?? ""}`;
  const buffer = Buffer.from(dataBase64, "base64");

  if (extension === ".step" || extension === ".stp") {
    const parsed = parseStepTextServer(buffer.toString("utf8"), fileName);

    return {
      modelFileName: fileName,
      modelFileType: extension.toUpperCase().slice(1),
      modelFileSizeBytes: fileSizeBytes ?? buffer.byteLength,
      modelAnalysisSource: "Vite local server analysis",
      ...parsed,
      modelBoundingBoxVolumeM3: null,
      modelVolumeFillRatio: null,
      modelNotes: externalAnalyzerError
        ? [
            ...(parsed.modelNotes || []),
            `External analyzer fallback: ${externalAnalyzerError}`,
          ]
        : parsed.modelNotes,
    };
  }

  throw new Error("unsupported model type");
}

function normalizeAnalyzerResult(input, fallbackFileName, fallbackFileSizeBytes) {
  if (!input || typeof input !== "object") {
    throw new Error("invalid analyzer result");
  }

  const fileName = input.modelFileName || fallbackFileName;
  const fileType =
    input.modelFileType || fileName?.split(".").pop()?.toUpperCase() || "";
  const partItems = Array.isArray(input.modelPartItems) ? input.modelPartItems : [];

  return {
    modelFileName: fileName,
    modelFileType: fileType,
    modelFileSizeBytes: input.modelFileSizeBytes ?? fallbackFileSizeBytes ?? null,
    modelPartName: input.modelPartName || fileName?.replace(/\.[^.]+$/, "") || "",
    modelAnalysisSource: input.modelAnalysisSource || "External analyzer",
    modelDetectedUnit: input.modelDetectedUnit || "",
    modelDetectedVolumeM3:
      Number.isFinite(input.modelDetectedVolumeM3) ? input.modelDetectedVolumeM3 : null,
    modelBoundingBox: input.modelBoundingBox || "",
    modelBoundingBoxVolumeM3:
      Number.isFinite(input.modelBoundingBoxVolumeM3) ? input.modelBoundingBoxVolumeM3 : null,
    modelVolumeFillRatio:
      Number.isFinite(input.modelVolumeFillRatio) ? input.modelVolumeFillRatio : null,
    modelStatus: input.modelStatus || "External analysis complete",
    modelNotes: Array.isArray(input.modelNotes) ? input.modelNotes : [],
    modelAssemblyType: input.modelAssemblyType || "",
    modelPartCount: Number.isFinite(input.modelPartCount) ? input.modelPartCount : partItems.length,
    modelPartItems: partItems.map((part) => ({
      name: part.name || "Unnamed part",
      count: Number.isFinite(part.count) ? part.count : 1,
      materialKey: part.materialKey || "al6061",
      volumeMm3:
        part.volumeMm3 === "" || part.volumeMm3 === null || part.volumeMm3 === undefined
          ? ""
          : String(part.volumeMm3),
      volumeSource: part.volumeSource || (part.volumeMm3 ? "auto" : "none"),
    })),
  };
}

async function runRemoteAnalyzer(payload) {
  const analyzerUrl = globalThis.process?.env?.MODEL_ANALYZER_URL;

  if (!analyzerUrl) {
    return null;
  }

  const response = await fetch(analyzerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result || result.error) {
    throw new Error(result?.error || "remote analyzer request failed");
  }

  return normalizeAnalyzerResult(
    result.result || result,
    payload.fileName,
    payload.fileSizeBytes,
  );
}

function runCommandAnalyzer(payload) {
  const defaultCommand = join(
    globalThis.process?.cwd?.() || ".",
    "scripts",
    "run_freecad_analyzer.cmd",
  );
  const command = globalThis.process?.env?.MODEL_ANALYZER_COMMAND || defaultCommand;

  const tempPayloadPath = join(
    tmpdir(),
    `motor-simulator-analyzer-${Date.now()}-${Math.round(Math.random() * 1_000_000)}.json`,
  );

  return writeFile(tempPayloadPath, JSON.stringify(payload), "utf8").then(
    () =>
      new Promise((resolve, reject) => {
        const analyzerEnv = {
          ...globalThis.process?.env,
          MODEL_ANALYZER_PAYLOAD_FILE: tempPayloadPath,
        };

        const child =
          globalThis.process?.platform === "win32"
            ? spawn(
                "powershell.exe",
                [
                  "-NoProfile",
                  "-ExecutionPolicy",
                  "Bypass",
                  "-Command",
                  `& '${command.replace(/'/g, "''")}'`,
                ],
                {
                  shell: false,
                  stdio: ["ignore", "pipe", "pipe"],
                  cwd: globalThis.process?.cwd?.(),
                  env: analyzerEnv,
                },
              )
            : spawn(command, {
                shell: true,
                stdio: ["ignore", "pipe", "pipe"],
                cwd: globalThis.process?.cwd?.(),
                env: analyzerEnv,
              });

        let stdout = "";
        let stderr = "";
        let settled = false;

        const cleanup = async () => {
          try {
            await unlink(tempPayloadPath);
          } catch {
            return null;
          }
        };

        const rejectOnce = (error) => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup().finally(() => reject(error));
        };

        const resolveOnce = (value) => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup().finally(() => resolve(value));
        };

        child.stdout.on("data", (chunk) => {
          stdout += chunk.toString();
        });

        child.stderr.on("data", (chunk) => {
          stderr += chunk.toString();
        });

        child.on("error", rejectOnce);
        child.on("close", (code) => {
          let parsed = null;

          try {
            parsed = JSON.parse(stdout);
          } catch {
            parsed = null;
          }

          if (parsed?.error) {
            rejectOnce(new Error(parsed.error));
            return;
          }

          if (parsed?.result) {
            resolveOnce(
              normalizeAnalyzerResult(parsed.result, payload.fileName, payload.fileSizeBytes),
            );
            return;
          }

          if (code !== 0) {
            rejectOnce(new Error(stderr.trim() || `analyzer command exited with ${code}`));
            return;
          }

          rejectOnce(new Error("analyzer command returned no JSON result"));
        });
      }),
  );
}

async function tryExternalAnalyzer(payload) {
  let remoteError = "";
  let commandError = "";

  const remoteResult = await runRemoteAnalyzer(payload).catch((error) => {
    remoteError = error instanceof Error ? error.message : "remote analyzer failed";
    return null;
  });
  if (remoteResult) {
    return {
      result: remoteResult,
      error: "",
    };
  }

  const commandResult = await runCommandAnalyzer(payload).catch((error) => {
    commandError = error instanceof Error ? error.message : "command analyzer failed";
    return null;
  });
  if (commandResult) {
    return {
      result: commandResult,
      error: "",
    };
  }

  return {
    result: null,
    error: commandError || remoteError || "",
  };
}

function hybridSearchPlugin() {
  const productsHandler = async (req, res) => {
    try {
      const requestUrl = new URL(req.url, "http://localhost");
      const params = Object.fromEntries(requestUrl.searchParams.entries());
      const results = await searchOfficialWeb(params);

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ results }));
    } catch (error) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          results: [],
          error: error instanceof Error ? error.message : "web search failed",
        }),
      );
    }
  };

  const manualsHandler = async (req, res) => {
    try {
      const requestUrl = new URL(req.url, "http://localhost");
      const params = Object.fromEntries(requestUrl.searchParams.entries());
      const { manuals, candidates } = await searchOfficialManuals(params);

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ results: manuals, candidates }));
    } catch (error) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          results: [],
          candidates: [],
          error: error instanceof Error ? error.message : "manual extraction failed",
        }),
      );
    }
  };

  const analyzeModelHandler = async (req, res) => {
    try {
      const payload = await readJsonBody(req);
      const extension = `.${payload.fileName?.split(".").pop()?.toLowerCase() ?? ""}`;

      if (extension !== ".step" && extension !== ".stp") {
        throw new Error("unsupported model type");
      }

      const externalResult = await tryExternalAnalyzer(payload);
      const result = externalResult?.result ?? analyzeModelUpload(payload, externalResult?.error || "");

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ result }));
    } catch (error) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          result: null,
          error: error instanceof Error ? error.message : "model analysis failed",
        }),
      );
    }
  };

  return {
    name: "hybrid-search-plugin",
    configureServer(server) {
      server.middlewares.use("/api/web-search-products", productsHandler);
      server.middlewares.use("/api/web-search-manuals", manualsHandler);
      server.middlewares.use("/api/analyze-model", analyzeModelHandler);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/web-search-products", productsHandler);
      server.middlewares.use("/api/web-search-manuals", manualsHandler);
      server.middlewares.use("/api/analyze-model", analyzeModelHandler);
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), hybridSearchPlugin()],
});
