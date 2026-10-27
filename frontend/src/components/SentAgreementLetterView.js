import React, { forwardRef } from "react";
import { Table } from "react-bootstrap";
import logoImage from "../assets/images/logo.png";
import AgreementBodyHtml from "./AgreementBodyHtml";

const SentAgreementLetterView = forwardRef(function SentAgreementLetterView(
  { template },
  ref,
) {
  if (!template) return null;

  const { mainAgreement, business, client } = template;

  return (
    <div className="p-2" ref={ref}>
      {mainAgreement ? (
        <div className="letterTable">
          <div className="d-flex justify-content-between align-items-center py-3 mb-3">
            <h4 className="text-black">{mainAgreement?.template_name}</h4>
            <span className="d-block">
              <img
                src={logoImage}
                alt="brand-logo"
                style={{ width: "80px" }}
              />
            </span>
          </div>
          <Table bordered-0>
            <tbody>
              <tr>
                <td colSpan={2} className="d-flex align-items-center gap-2">
                  <span>An Agreement made between :</span>
                  <b
                    className="mb-0"
                    style={{
                      borderBottom: "1px solid #ccc",
                      paddingBottom: "5px",
                    }}
                  >
                    {client?.name}
                  </b>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="d-flex align-items-center gap-2">
                  <span>having its principal office at·</span>
                  <b
                    className="mb-0"
                    style={{
                      borderBottom: "1px solid #ccc",
                      paddingBottom: "5px",
                    }}
                  >
                    {client?.city}, {client?.country}
                  </b>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  hereinafter referred to as the &apos;Carrier&apos; or the
                  &apos;Handling Company&apos; as the case may be,
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="d-flex align-items-center gap-2">
                  <span>and:</span>
                  <b
                    className="mb-0"
                    style={{
                      borderBottom: "1px solid #ccc",
                      paddingBottom: "5px",
                    }}
                  >
                    {business?.name}
                  </b>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="d-flex align-items-center gap-2">
                  <span>having its principal office at·</span>
                  <b
                    className="mb-0"
                    style={{
                      borderBottom: "1px solid #ccc",
                      paddingBottom: "5px",
                    }}
                  >
                    {business?.city}, {business?.country}
                  </b>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  hereinafter referred to as the &apos;Handling Company&apos; or
                  the &apos;Carrier&apos;, as the case may be, the Carrier
                  and/or the Handling Company may hereinafter be referred to as
                  the &quot;Party(ies)&quot; Whereby all the parties agree as
                  follows:
                </td>
              </tr>
              {mainAgreement.sections && mainAgreement.sections.length > 0 ? (
                [...mainAgreement.sections]
                  .sort((a, b) => a.section_order - b.section_order)
                  .map((section) => (
                    <tr
                      key={
                        section.SGHA_Main_agreement_section_id ??
                        section.section_id ??
                        section.section_order
                      }
                    >
                      <td colSpan={2}>
                        <h6>{section.section_heading}</h6>
                        <AgreementBodyHtml content={section.section_body} />
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={2}>
                    <p>No sections available.</p>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <span>Signed the</span>
                    <span
                      style={{
                        borderBottom: "1px solid #ccc",
                        width: "calc(100% - 80px)",
                      }}
                    />
                  </div>
                </td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <span>Signed the</span>
                    <span
                      style={{
                        borderBottom: "1px solid #ccc",
                        width: "calc(100% - 80px)",
                      }}
                    />
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <span>at</span>
                    <span
                      style={{
                        borderBottom: "1px solid #ccc",
                        width: "calc(100% - 20px)",
                      }}
                    />
                  </div>
                </td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <span>at</span>
                    <span
                      style={{
                        borderBottom: "1px solid #ccc",
                        width: "calc(100% - 20px)",
                      }}
                    />
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <span>for and on behalf of</span>
                    <span
                      style={{
                        borderBottom: "1px solid #ccc",
                        width: "calc(100% - 130px)",
                      }}
                    />
                  </div>
                </td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <span>for and on behalf of</span>
                    <span
                      style={{
                        borderBottom: "1px solid #ccc",
                        width: "calc(100% - 130px)",
                      }}
                    />
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <span>by</span>
                    <span
                      style={{
                        borderBottom: "1px solid #ccc",
                        width: "calc(100% - 20px)",
                      }}
                    />
                  </div>
                </td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <span>by</span>
                    <span
                      style={{
                        borderBottom: "1px solid #ccc",
                        width: "calc(100% - 20px)",
                      }}
                    />
                  </div>
                </td>
              </tr>
              <tr>
                <td className="text-end" colSpan={2}>
                  <small className="mt-4">
                    People. Passion. Pride. Since 1833
                  </small>
                </td>
              </tr>
            </tfoot>
          </Table>
        </div>
      ) : (
        <p>No template data available</p>
      )}
    </div>
  );
});

export default SentAgreementLetterView;
