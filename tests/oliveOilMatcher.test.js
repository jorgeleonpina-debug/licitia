import { describe, expect, it } from "vitest";
import {
  buildExternalItemKey,
  calculateOpportunityScore,
  deduplicateOpportunities,
  detectOliveOilMatch,
  normalizeText,
} from "../lib/oliveOilMatcher.js";

describe("oliveOilMatcher", () => {
  it("normaliza mayúsculas, tildes y espacios", () => {
    expect(normalizeText("  ACEITE  de ÓLIVA ")).toBe("aceite de oliva");
  });

  it("detecta coincidencia exacta", () => {
    const result = detectOliveOilMatch({ productName: "Aceite de oliva extra virgen 1L" });
    expect(result).toMatchObject({ matched: true, matchType: "EXACT", basePoints: 50 });
  });

  it("detecta AOVE", () => {
    expect(detectOliveOilMatch({ itemDescription: "AOVE botella 500 ml" })).toMatchObject({ matched: true, matchType: "EXACT", basePoints: 40 });
  });

  it("detecta aceite y oliva aunque no estén seguidos", () => {
    expect(detectOliveOilMatch({ itemDescription: "Aceite refinado premium elaborado de oliva" })).toMatchObject({ matched: true, matchType: "KEYWORD", basePoints: 35 });
  });

  it("detecta un UNSPSC configurable", () => {
    expect(detectOliveOilMatch({ productName: "Producto alimentario", unspsc: 50151513 })).toMatchObject({ matched: true, matchType: "UNSPSC" });
  });

  it.each(["Aceite vegetal maravilla", "Aceite para motor", "Lubricante industrial"])("evita falso positivo: %s", (text) => {
    expect(detectOliveOilMatch({ productName: text }).matched).toBe(false);
  });
});

describe("calculateOpportunityScore", () => {
  const now = new Date("2026-08-20T12:00:00Z");

  it("limita el máximo a 100", () => {
    const match = detectOliveOilMatch({ productName: "Aceite de oliva extra virgen", unspsc: "50151513" });
    const result = calculateOpportunityScore({ match, unspsc: "50151513", quantity: 480, estimatedAmount: 10_000_000, closingDate: "2026-09-20T12:00:00Z", now });
    expect(result.score).toBe(100);
  });

  it("limita el mínimo a 0", () => {
    const result = calculateOpportunityScore({ match: { basePoints: 0 }, closingDate: "2026-08-01T12:00:00Z", now });
    expect(result.score).toBe(0);
  });

  it("marca urgente y penaliza un cierre menor a 48 horas", () => {
    const match = detectOliveOilMatch({ productName: "Aceite de oliva" });
    const result = calculateOpportunityScore({ match, closingDate: "2026-08-21T12:00:00Z", now });
    expect(result.isUrgent).toBe(true);
    expect(result.reasons).toContainEqual(expect.objectContaining({ points: -30 }));
  });

  it("premia un cierre lejano", () => {
    const match = detectOliveOilMatch({ productName: "AOVE" });
    const result = calculateOpportunityScore({ match, closingDate: "2026-08-30T12:00:00Z", now });
    expect(result.reasons).toContainEqual(expect.objectContaining({ points: 10, reason: "Cierre a más de 5 días" }));
  });
});

describe("deduplicación", () => {
  it("conserva una oportunidad por ítem al procesar dos veces el mismo dato", () => {
    const externalItemKey = buildExternalItemKey({ tenderCode: "1234-56-LQ26", itemId: 7, productCode: 50151513, itemIndex: 0 });
    const firstSync = deduplicateOpportunities([{ external_item_key: externalItemKey, score: 80 }]);
    const secondSync = deduplicateOpportunities([...firstSync, { external_item_key: externalItemKey, score: 90 }]);
    expect(secondSync).toHaveLength(1);
    expect(secondSync[0].score).toBe(90);
  });

  it("usa código de producto e índice cuando no existe correlativo", () => {
    expect(buildExternalItemKey({ tenderCode: "abc-1", productCode: "50151513", itemIndex: 2 })).toBe("ABC-1:product:50151513:index:2");
  });
});
