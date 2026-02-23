import { describe, it, expect } from "vitest";
import { markdownToHtml } from "./markdown-to-html";

describe("markdownToHtml", () => {
  it("converts headings h1–h3", () => {
    const md = "# Title\n## Section\n### Subsection";
    const html = markdownToHtml(md);
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<h2>Section</h2>");
    expect(html).toContain("<h3>Subsection</h3>");
  });

  it("wraps consecutive list items in a single <ul>", () => {
    const md = "- Alpha\n- Beta\n- Gamma";
    const html = markdownToHtml(md);
    expect(html).toContain("<ul><li>Alpha</li><li>Beta</li><li>Gamma</li></ul>");
  });

  it("closes the list when a non-list line follows", () => {
    const md = "- Item\nParagraph";
    const html = markdownToHtml(md);
    expect(html).toContain("</ul>");
    expect(html).toContain("<p>Paragraph</p>");
    // List must close before the paragraph
    expect(html.indexOf("</ul>")).toBeLessThan(html.indexOf("<p>"));
  });

  it("converts paragraphs", () => {
    const html = markdownToHtml("Hello world");
    expect(html).toContain("<p>Hello world</p>");
  });

  it("ignores blank lines (no empty paragraphs)", () => {
    const html = markdownToHtml("Line one\n\nLine two");
    expect(html).not.toContain("<p></p>");
    expect(html).toContain("<p>Line one</p>");
    expect(html).toContain("<p>Line two</p>");
  });

  it("converts bold and italic inline", () => {
    const html = markdownToHtml("**bold** and *italic*");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });

  it("escapes HTML special characters", () => {
    const html = markdownToHtml("A & B < C > D");
    expect(html).toContain("A &amp; B &lt; C &gt; D");
  });

  it("wraps output in html/body tags", () => {
    const html = markdownToHtml("Hello");
    expect(html).toMatch(/^<html><body>/);
    expect(html).toMatch(/<\/body><\/html>$/);
  });

  it("handles a realistic meeting summary", () => {
    const md = [
      "## Meeting Summary",
      "",
      "### Key Decisions",
      "- Adopt TypeScript across all services",
      "- Release v2 by end of Q1",
      "",
      "### Action Items",
      "- **Alice**: Update the docs",
      "- **Bob**: Fix the CI pipeline",
    ].join("\n");

    const html = markdownToHtml(md);
    expect(html).toContain("<h2>Meeting Summary</h2>");
    expect(html).toContain("<h3>Key Decisions</h3>");
    expect(html).toContain("<li>Adopt TypeScript across all services</li>");
    expect(html).toContain("<strong>Alice</strong>");
    expect(html).toContain("<strong>Bob</strong>");
  });
});
