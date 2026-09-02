import DOMPurify from "dompurify";
import React from "react";
import { formatAgreementBodyForDisplay } from "../utils/agreementDocFormat";

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
  "style",
];

/**
 * Renders stored agreement / section body: plain text and markdown pipe tables are
 * converted to structured HTML; existing HTML is sanitized.
 */
export default function AgreementBodyHtml({
  content,
  className = "sgha-doc-html",
  style,
}) {
  if (content == null || content === "") return null;

  const html = formatAgreementBodyForDisplay(String(content));
  if (!html) return null;

  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(html, {
          ALLOWED_TAGS: DEFAULT_TAGS,
          ALLOWED_ATTR: DEFAULT_ATTR,
        }),
      }}
    />
  );
}
