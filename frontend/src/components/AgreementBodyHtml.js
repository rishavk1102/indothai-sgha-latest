import DOMPurify from "dompurify";
import React from "react";
import { stringLooksLikeHtml } from "../utils/agreementDocFormat";

const DEFAULT_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "br",
  "div",
  "span",
  "sub",
  "sup",
  "blockquote",
  "a",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
];
const DEFAULT_ATTR = [
  "href",
  "target",
  "rel",
  "class",
  "colspan",
  "rowspan",
];

/**
 * Renders stored agreement / section body: plain text keeps newlines (pre-line);
 * HTML is sanitized. Avoids innerHTML-only for plain text (collapsed newlines).
 */
export default function AgreementBodyHtml({
  content,
  className = "sgha-doc-html",
}) {
  if (content == null || content === "") return null;
  const s = String(content);
  if (!stringLooksLikeHtml(s)) {
    return (
      <div className={`${className} sgha-doc-plain`.trim()}>{s}</div>
    );
  }
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(s, {
          ALLOWED_TAGS: DEFAULT_TAGS,
          ALLOWED_ATTR: DEFAULT_ATTR,
        }),
      }}
    />
  );
}
