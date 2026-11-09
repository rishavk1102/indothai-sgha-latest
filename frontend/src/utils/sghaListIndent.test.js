import { createNumberingContext, parseAgreementDocument } from "./sghaClauseParser";

function rows(html, numbering) {
  return parseAgreementDocument(html, numbering ? { numbering } : {}).flatMap((block) =>
    (block.lines || []).map((line) => ({
      type: block.type,
      number: block.number || "",
      text: line.text,
      indent: line.indent,
      list: !!line.list,
      blank: !!line.blank || !!block.blank,
    })),
  );
}

describe("pdf list indent", () => {
  test("sibling nested lists step one level at a time", () => {
    const html = `
      <p>7.1.1</p>
      <ol>
        <li>Provide</li>
        <li>Arrange For</li>
        <ol style="margin-left: 20px; padding-left: 20px">
          <li>matching of Passengers against established data</li>
          <li>processing Passengers through:</li>
          <ol style="margin-left: 20px; padding-left: 20px">
            <li>(i) security questioning</li>
            <li>(ii) security interviewing</li>
            <li>(iii) behavior detection measures</li>
          </ol>
        </ol>
      </ol>
      <p>7.1.2</p>
      <ol>
        <li>Provide</li>
      </ol>
    `;
    const got = rows(html).map((row) => `${row.indent}|${row.text}`);
    expect(got).toEqual([
      "0|7.1.1",
      "0|1. Provide",
      "0|2. Arrange For",
      "1|1. matching of Passengers against established data",
      "1|2. processing Passengers through:",
      "2|(i) security questioning",
      "2|(ii) security interviewing",
      "2|(iii) behavior detection measures",
      "0|7.1.2",
      "0|1. Provide",
    ]);
  });

  test("pulled-apart indented lists nest by their margin", () => {
    const html = `
      <ol>
        <li>Provide</li>
        <li>Arrange For</li>
      </ol>
      <ol style="margin-left: 20px; padding-left: 20px">
        <li>matching of Passengers against established data</li>
        <li>processing Passengers through:</li>
      </ol>
      <ol style="margin-left: 40px; padding-left: 40px">
        <li>(i) security questioning</li>
        <li>(ii) security interviewing</li>
        <li>(iii) behavior detection measures</li>
      </ol>
    `;
    const got = rows(html).map((row) => `${row.indent}|${row.text}`);
    expect(got).toEqual([
      "0|1. Provide",
      "0|2. Arrange For",
      "1|1. matching of Passengers against established data",
      "1|2. processing Passengers through:",
      "2|(i) security questioning",
      "2|(ii) security interviewing",
      "2|(iii) behavior detection measures",
    ]);
  });

  test("a second list without an indent stays separate and keeps article numbers", () => {
    const html = `
      <ol>
        <li>First duty</li>
        <li>Second duty</li>
      </ol>
      <p>The Handling Company shall also:</p>
      <ol>
        <li>Third duty</li>
      </ol>
    `;
    const got = rows(html, createNumberingContext("14"));
    expect(got.map((row) => `${row.type}|${row.number}|${row.list}|${row.text}`)).toEqual([
      "clause|14.1|false|First duty",
      "clause|14.2|false|Second duty",
      "paragraph||false|The Handling Company shall also:",
      "clause|14.3|false|Third duty",
    ]);
  });

  test("typed (a) and (i) lines keep marker indent when they are not a list", () => {
    const html = "<p>Provide the service (a) on arrival (i) at the gate</p>";
    const got = rows(html);
    expect(got.map((row) => `${row.list}|${row.indent}|${row.text}`)).toEqual([
      "false|0|Provide the service",
      "false|1|(a) on arrival",
      "false|2|(i) at the gate",
    ]);
  });

  test("a blank line between 3.10.1 and 3.10.2 is kept", () => {
    const html = `
      <p>3.10.1 The carrier arrives.</p>
      <p><br></p>
      <p>3.10.2 The carrier departs.</p>
    `;
    const got = rows(html).map((row) => `${row.blank ? "blank" : row.text}`);
    expect(got).toEqual([
      "3.10.1 The carrier arrives.",
      "blank",
      "3.10.2 The carrier departs.",
    ]);
  });

  test("one line break stays a new line and two line breaks leave a gap", () => {
    const single = rows("<p>3.10.1 First sentence.<br>Second sentence.</p>").map((row) => row.text);
    expect(single).toEqual(["3.10.1 First sentence.", "Second sentence."]);

    const doubled = rows("<p>3.10.1 First sentence.<br><br>Second sentence.</p>").map((row) =>
      row.blank ? "blank" : row.text,
    );
    expect(doubled).toEqual(["3.10.1 First sentence.", "blank", "Second sentence."]);
  });

  test("article numbering still uses the clause column", () => {
    const html = `
      <ol>
        <li>Do the work</li>
        <li>Arrange it
          <ol>
            <li>first detail</li>
          </ol>
        </li>
      </ol>
    `;
    const got = rows(html, createNumberingContext("14"));
    expect(got.map((row) => `${row.type}|${row.number}|${row.indent}|${row.text}`)).toEqual([
      "clause|14.1|0|Do the work",
      "clause|14.2|0|Arrange it",
      "clause|14.2|1|1. first detail",
    ]);
  });
});
