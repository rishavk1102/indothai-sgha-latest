import { buildAnnexASubmissionSelections } from "./annexASelection";
import { nestedCheckboxSelectionsToAnnexAState } from "./submissionDraftHydrate";

const template = [
  { type: "heading_no", value: "1" },
  { type: "heading", value: "Management Functions" },
  { type: "subheading_no", value: "1.1" },
  { type: "subheading", value: "Representation" },
  {
    type: "editor",
    value:
      "<ol><li>First clause</li><li>Second clause<ol><li>Child a</li><li>Child b</li></ol></li><li>Third clause</li></ol>",
    checkboxConfig: {},
  },
];

const ramp = { ramp: true, comp: false, cargo: false };

describe("Annex A submission selections", () => {
  test("untouched template defaults are submitted, deselected items are not", () => {
    const states = {
      serviceTypes: ramp,
      "1.1": {
        "1.1:f0:item-1": { ramp: false, comp: false, cargo: false },
        "1.1:f0:item-4": { ramp: false, comp: false, cargo: false },
      },
    };
    const nested = buildAnnexASubmissionSelections(template, states);
    expect(Object.keys(nested["1"]["1.1"]).sort()).toEqual([
      "1.1.2",
      "1.1.2.1",
      "1.1.3",
    ]);
  });

  test("restored submission keeps deselected items unchecked", () => {
    const saved = {
      serviceTypes: ramp,
      1: { "1.1": { "1.1.2": true, "1.1.2.1": true } },
    };
    const restored = nestedCheckboxSelectionsToAnnexAState(saved);
    const again = buildAnnexASubmissionSelections(template, restored);
    expect(again["1"]["1.1"]).toEqual({ "1.1.2": true, "1.1.2.1": true });
  });
});
