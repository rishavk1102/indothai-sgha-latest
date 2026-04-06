import React, { useState, useEffect, useCallback } from "react";
import { Form, Table } from 'react-bootstrap';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { Button } from "primereact/button";
import { Sidebar } from 'primereact/sidebar';
import { Checkbox } from "primereact/checkbox";
import api from '../api/axios';
import DOMPurify from 'dompurify';
import { stringLooksLikeHtml } from '../utils/agreementDocFormat';

const Sgha_mainagreemment = ({ templateYear = 2025, templateName = null }) => {
    const [visibleRight, setVisibleRight] = useState(false);
    const [templateData, setTemplateData] = useState(null);
    const [loadingTemplate, setLoadingTemplate] = useState(false);
    const [mainAgreementSections, setMainAgreementSections] = useState([]);

    // Parse Main Agreement template data to extract sections
    const parseMainAgreementData = useCallback((templateData) => {
        if (!templateData || !Array.isArray(templateData)) {
            console.log('Main Agreement: No template data or not an array');
            setMainAgreementSections([]);
            return;
        }

        console.log('Main Agreement: Parsing template data', templateData);

        const sections = [];
        let currentArticle = null;
        let currentSection = null;
        let currentMainSection = null;
        let mainSectionHeading = null;

        templateData.forEach((field, index) => {
            // Check if we're entering a main section (Article 1, Article 2, etc.)
            if (field.type === 'heading_no') {
                const sectionNum = String(field.value);
                
                // Check if it's a main article number (1, 2, 3, etc.) — accept 'heading' or 'subheading' (PDF/editor use subheading)
                if (!sectionNum.includes('.') && ['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(sectionNum)) {
                    const nextField = templateData[index + 1];
                    if (index + 1 < templateData.length && nextField && (nextField.type === 'heading' || nextField.type === 'subheading')) {
                        currentMainSection = sectionNum;
                        mainSectionHeading = nextField.value ?? '';
                        
                        // Create new article section
                        currentArticle = {
                            articleNumber: sectionNum,
                            articleTitle: mainSectionHeading,
                            sections: []
                        };
                        sections.push(currentArticle);
                        console.log('Main Agreement: Created article', currentArticle);
                        return;
                    }
                }

                // Handle subsection numbers (like 1.1, 1.2, etc.)
                if (sectionNum.includes('.') && currentMainSection) {
                    const nextField = index + 1 < templateData.length ? templateData[index + 1] : null;
                    if (nextField && nextField.type === 'subheading') {
                        currentSection = {
                            sectionNumber: sectionNum,
                            sectionTitle: nextField.value || '',
                            content: null
                        };
                        if (currentArticle) {
                            currentArticle.sections.push(currentSection);
                        }
                        return;
                    }
                }
            }

            // Check for subheading_no fields
            if (field.type === 'subheading_no' && currentMainSection) {
                const headingNo = String(field.value);
                if (headingNo.includes('.')) {
                    const nextField = index + 1 < templateData.length ? templateData[index + 1] : null;
                    const subheadingText = (nextField && nextField.type === 'subheading') ? nextField.value : '';
                    
                    currentSection = {
                        sectionNumber: headingNo,
                        sectionTitle: subheadingText,
                        content: null
                    };
                    if (currentArticle) {
                        currentArticle.sections.push(currentSection);
                    }
                    return;
                }
            }

            // Find editor content - can be for a section or directly for an article
            if (field.type === 'editor' && currentArticle) {
                if (currentSection) {
                    // Editor content belongs to a subsection
                    currentSection.content = field.value;
                    console.log('Main Agreement: Added content to section', currentSection);
                } else {
                    // Editor content is directly for the article (no subsections)
                    // Create a default section to hold the content
                    const defaultSection = {
                        sectionNumber: null,
                        sectionTitle: null,
                        content: field.value
                    };
                    currentArticle.sections.push(defaultSection);
                    console.log('Main Agreement: Added default section with content to article', currentArticle);
                }
            }
        });

        console.log('Main Agreement: Final parsed sections', sections);
        setMainAgreementSections(sections);
    }, []);

    // Fetch Main Agreement template data
    useEffect(() => {
        const fetchMainAgreementData = async () => {
            try {
                setLoadingTemplate(true);
                const url = `/sgha_template_content/get/${templateYear}/Main Agreement/Section Template`;
                const params = (templateName != null && String(templateName).trim() !== '')
                  ? { template_name: String(templateName).trim() }
                  : {};
                console.log('[Main Agreement] fetch:', url, 'params:', params);
                const response = await api.get(url, { params });
                console.log('[Main Agreement] response:', response.status, '| has content:', !!response.data?.data?.content);

                if (response.data?.data?.content) {
                    const content = response.data.data.content;
                    let parsedContent;
                    try {
                        parsedContent = typeof content === 'string' 
                            ? JSON.parse(content) 
                            : content;
                    } catch (parseError) {
                        console.error('Error parsing Main Agreement content:', parseError);
                        setTemplateData(null);
                        return;
                    }
                    
                    setTemplateData(parsedContent);
                    parseMainAgreementData(parsedContent);
                }
            } catch (error) {
                console.error("Error fetching Main Agreement template data:", error);
                setTemplateData(null);
            } finally {
                setLoadingTemplate(false);
            }
        };

        fetchMainAgreementData();
    }, [parseMainAgreementData, templateYear, templateName]);

    // Render HTML content safely (plain text must not use innerHTML alone — newlines collapse)
    const renderHTMLContent = (htmlString) => {
        if (!htmlString) return null;

        if (!stringLooksLikeHtml(htmlString)) {
            return (
                <div className="sgha-doc-html sgha-doc-plain">{htmlString}</div>
            );
        }

        const sanitizedHTML = DOMPurify.sanitize(htmlString, {
            ALLOWED_TAGS: [
                'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
                'strong', 'em', 'b', 'i', 'u', 'br', 'div', 'span', 'sub', 'sup',
                'blockquote', 'a', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
            ],
            ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'colspan', 'rowspan'],
        });

        return (
            <div
                className="sgha-doc-html"
                dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
            />
        );
    };

     return (
        <>
            <div className="main-agreement comSty">
                <Accordion activeIndex={0}>
                    <AccordionTab header="Main Agreement">
                        <div className="d-flex justify-content-end position-relative">
                            <Button
                            icon="pi pi-pencil"
                            className="p-1 sigedit"
                            label="Edit"
                            tooltipOptions="left"
                            severity="danger"
                            text
                            onClick={() => setVisibleRight(true)}
                            />
                        </div>
                        <Table className="table" borderless>
                            <tbody>
                            <tr>
                                <td className="d-flex gap-2">
                                <span>An Agreement made between :</span>
                                <b className="mb-0">Malindo Airways SDN BHD</b>
                                </td>
                            </tr>
                            <tr>
                                <td className="d-flex gap-2">
                                <span>having its principal office at·</span>
                                <b className="mb-0">Petaling Jaya, Malaysia</b>
                                </td>
                            </tr>
                            <tr>
                                <td>hereinafter referred to as the 'Carrier' or the 'Handling Company' as the case may be,</td>
                            </tr>
                            <tr>
                                <td className="d-flex gap-2">
                                <span>and:</span>
                                <b className="mb-0">INDOTHAI KOLKATA PRIVATE LIMITED</b>
                                </td>
                            </tr>
                            <tr>
                                <td className="d-flex gap-2">
                                <span>having its principal office at·</span>
                                <b className="mb-0">Kolkata, IN</b>
                                </td>
                            </tr>
                            <tr>
                                <td>hereinafter referred to as the 'Handling Company' or the 'Carrier', as the case may be, the Carrier and/or the Handling Company may hereinafter be referred to as the "Party(ies)" Whereby all the parties agree as follows:</td>
                            </tr>
                            </tbody>
                    </Table>
                    </AccordionTab>
                    {/* Dynamically loaded Main Agreement content from backend */}
                    {loadingTemplate ? (
                        <AccordionTab header="Loading...">
                            <div className="text-center p-4">
                                <i className="pi pi-spin pi-spinner me-2"></i>
                                Loading Main Agreement content...
                            </div>
                        </AccordionTab>
                    ) : (
                        mainAgreementSections.map((article, articleIndex) => (
                            <AccordionTab 
                                key={`article-${articleIndex}`}
                                header={`Article ${article.articleNumber} : ${article.articleTitle}`}
                            >
                                <Table borderless>
                                    <tbody>
                                        <tr>
                                            <td colSpan="2">
                                                {article.sections.map((section, sectionIndex) => (
                                                    <div key={`section-${sectionIndex}`} className="mb-4">
                                                        {section.sectionNumber && section.sectionTitle && (
                                                            <h6>{section.sectionNumber} {section.sectionTitle}</h6>
                                                        )}
                                                        {section.content && renderHTMLContent(section.content)}
                                                    </div>
                                                ))}
                                                {article.sections.length === 0 && (
                                                    <p className="text-muted">No content available for this article.</p>
                                                )}
                                            </td>
                                        </tr>
                                    </tbody>
                                </Table>
                            </AccordionTab>
                        ))
                    )}
                    
                    {/* Fallback static content if no template data is available */}
                    {!loadingTemplate && mainAgreementSections.length === 0 && templateData === null && (
                        <AccordionTab header="Article 1 :  Provision of Services">
                        <Table borderless>
                            <tbody>
                                <tr>
                                    <td colspan="2">
                                        <h6>1.1 General</h6>
                                        <p>The Carrier and the Handling Company agree to give the highest importance to the compliance with all applicable laws and regulations governing their activities and expect their agents and contractors to do the same.</p>
                                        <p>Of particular concern are laws related to anti-bribery, anti-trust, data protection, and labor relations (including but not limited to the prohibition of child labor).</p>
                                        <p>The Handling Company shall comply with and shall use its best efforts to ensure that its employees and sub-agents comply with:</p>
                                        <ul>
                                        <li>All laws and regulations applicable in its country of establishment and in all other countries where services are provided under this Agreement.</li>
                                        <li>Applicable IATA, ICAO, and other governing rules, regulations, and procedures.</li>
                                        <li>All international treaties and regulations related to commerce, aircraft operation, passenger transport, and air freight or mail.</li>
                                        </ul>

                                        <p>The Carrier and the Handling Company shall ensure that their personnel are aware of all relevant legislation concerning commerce, aircraft operation, passenger transport, and air freight. They shall also ensure awareness of:</p>
                                        <ul>
                                        <li>Competition and antitrust regulations (domestic and extraterritorial).</li>
                                        <li>Rules governing bribery, kickbacks, secret commissions, and payments to government officials.</li>
                                        <li>Any other applicable laws or regulations whose breach could cause damage to either Party or its employees.</li>
                                        </ul>
                                        <p><em>It is not considered necessary or possible to specify every detail of the services, it being generally understood what such services comprise and the standards to be attained in their performance.</em></p>


                                        <h6>1.2 Documents for Ground Handling</h6>
                                        <p>Documents used for ground handling shall be the Handling Company's own documents, where applicable, provided these documents comply with standardized formats under IATA, ICAO, or other governing regulations.</p>

                                        
                                        
                                        <h6>1.3 Scheduled Flights</h6>
                                        <p>The Handling Company agrees to provide services for the Carrier’s scheduled flights at the designated locations (Annex B). The Carrier agrees to inform the Handling Company promptly about changes to schedules, frequencies, or aircraft types, in line with the IATA Standard Schedule Information Manual (SSIM).</p>

                                        
                                        
                                        <h6>1.4 Extra Flights</h6>
                                        <p>The Handling Company will also provide services for flights beyond the agreed schedule, subject to reasonable prior notice and availability of resources.</p>

                                        
                                        
                                        <h6>1.5 Priority</h6>
                                        <p>The Handling Company shall, as far as possible, give priority to aircraft operating on schedule.</p>

                                        
                                        <h6>1.6 Emergency Assistance</h6>
                                        <p>The Handling Company must participate in local emergency response planning to support the Carrier in emergencies, including aircraft incidents, accidents, or unlawful interference. Both Parties shall agree on personnel, competencies, and required actions.</p>
                                        <p>The Carrier shall provide its emergency procedures to the Handling Company. If unavailable, the Handling Company shall follow its own maintained emergency plan(s). In emergencies, the Handling Company must notify the Carrier immediately and maintain open communications.</p>
                                        <p>The Handling Company shall take all reasonable measures to assist passengers, crew, and families, safeguard baggage, cargo, and mail, and cooperate with local authorities.</p>
                                        <p>All emergency documentation belongs to the Carrier and must remain confidential unless required by law. The Carrier shall reimburse the Handling Company for expenses incurred in providing assistance.</p>

                                        
                                        <h6>1.7 Additional Services</h6>
                                        <p>Upon request, the Handling Company will provide additional services not covered in this Agreement, subject to mutually agreed special conditions.</p>

                                        
                                        <h6>1.8 Other Locations</h6>
                                        <p>For occasional flights at locations not designated in this Agreement, where the Handling Company maintains a ground handling organization, it shall make every effort to provide necessary services subject to local availability.</p>
                                    </td>
                                </tr>

                            </tbody>
                        </Table>
                    </AccordionTab>
                    )}
                </Accordion>
            </div>

            <Sidebar visible={visibleRight} position="right"  dismissable={false} onHide={() => setVisibleRight(false)} style={{width: '400px'}} className="Sghasisbar">
                <h5 className="py-4 border-bottom mb-4">Edit Main Agreemnet</h5>
                <Form.Group className="mb-3" controlId="formBasicEmail">
                    <Form.Label>An Agreement made between :</Form.Label>
                    <Form.Control type="text" placeholder="Malindo Airways SDN BHD" />
                </Form.Group>
        
                <Form.Group className="mb-3" controlId="formBasicEmail">
                    <Form.Label>having its principal office at :</Form.Label>
                    <Form.Control type="text" placeholder="Petaling Jaya, Malaysia" />
                </Form.Group>
        
                <Form.Group className="mb-3" controlId="formBasicEmail">
                    <Form.Label>hereinafter referred to as the 'Carrier' or the 'Handling Company' as the case may be, and:</Form.Label>
                    <Form.Control type="text" placeholder="INDOTHAI KOLKATA PRIVATE LIMITED" />
                </Form.Group>
        
                <Form.Group className="mb-3" controlId="formBasicEmail">
                    <Form.Label>having its principal office at·</Form.Label>
                    <Form.Control type="text" placeholder="Kolkata, IN" />
                </Form.Group>
                <div className="d-flex justify-content-end gap-2">
                    <Button
                    icon="pi pi-times"
                    label="Cancel"
                    className="py-2"
                    severity="secondary"
                    />
                    <Button
                    icon="pi pi-check"
                    label="Save"
                    className="py-2"
                    severity="success"
                />
                </div>
            </Sidebar>
        </>
    );
};

export default Sgha_mainagreemment;
