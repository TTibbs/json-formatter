import { describe, expect, it } from "vitest";
import { transform } from "@json-transformer/core";
import { dslToRows, rowsToDsl } from "../builder";
import { TEMPLATES } from "../templates";

describe("template catalog", () => {
  it("has unique ids", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const template of TEMPLATES) {
    describe(template.name, () => {
      it("is flat-builder compatible and round-trips", () => {
        const rows = dslToRows(JSON.stringify(template.dsl));
        expect(rows).not.toBeNull();
        expect(rowsToDsl(rows!)).toEqual(template.dsl);
      });

      it("produces zero warnings against its own sample input", () => {
        const result = transform(template.input, template.dsl);
        expect(result.errors).toEqual([]);
      });
    });
  }

  it("Shopify template joins names and maps cities", () => {
    const t = TEMPLATES.find((x) => x.id === "shopify-hubspot")!;
    const { output } = transform(t.input, t.dsl);
    expect(output).toMatchObject({
      fullname: "Jane Doe",
      lifecyclestage: "customer",
      cities: ["Austin", "Denver"],
      hs_source: "shopify",
    });
  });

  it("Stripe customer template flags healthy accounts as active", () => {
    const t = TEMPLATES.find((x) => x.id === "stripe-crm")!;
    const { output } = transform(t.input, t.dsl);
    expect(output).toMatchObject({
      contactId: "cus_OWk3PQpzXkU9aF",
      company: "Acme Inc",
      status: "active",
      source: "stripe",
    });
  });

  it("Stripe invoice template converts cents and detects paid", () => {
    const t = TEMPLATES.find((x) => x.id === "stripe-invoice-accounting")!;
    const { output } = transform(t.input, t.dsl);
    expect(output).toMatchObject({
      totalDue: 249.99,
      totalPaid: 249.99,
      isPaid: true,
      lineDescriptions: ["Growth plan (monthly)", "Extra seats x2"],
    });
  });

  it("API DTO template flattens nested attributes", () => {
    const t = TEMPLATES.find((x) => x.id === "api-dto")!;
    const { output } = transform(t.input, t.dsl);
    expect(output).toMatchObject({
      id: 81723,
      authorName: "Ada Lovelace",
      tags: ["engineering", "json"],
    });
  });

  it("Order template joins the address line and picks service", () => {
    const t = TEMPLATES.find((x) => x.id === "order-fulfillment")!;
    const { output } = transform(t.input, t.dsl);
    expect(output).toMatchObject({
      addressLine: "500 Main St, Austin, TX",
      skus: ["KB-01", "MS-02"],
      service: "express",
    });
  });

  it("Webhook template builds the repo title and success message", () => {
    const t = TEMPLATES.find((x) => x.id === "webhook-notification")!;
    const { output } = transform(t.input, t.dsl);
    expect(output).toMatchObject({
      title: "tward/json-transformer",
      message: "Deployment finished",
      channel: "deployments",
    });
  });
});
