import React, { useState, useMemo } from 'react';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { Checkbox } from 'primereact/checkbox';
import DOMPurify from 'dompurify';
import { Card } from 'react-bootstrap';

/**
 * DynamicSectionsList Component
 * Displays sections dynamically from JSON data structure
 * 
 * @param {Array} sectionsData - Array of section objects with types: heading_no, heading, subheading_no, subheading, editor
 * @param {String} title - Optional title for the sections list
 * @param {Object} serviceTypes - Object with comp, ramp, cargo boolean values
 * @param {Function} onServiceTypeChange - Callback when service type checkboxes change
 */
const DynamicSectionsList = ({ 
    sectionsData = [], 
    title = "IATA Standard Ground Handling Agreement ANNEX A",
    serviceTypes = { comp: true, ramp: false, cargo: false },
    onServiceTypeChange = null
}) => {
    const [expandedSections, setExpandedSections] = useState({});

    // Parse and group sections from JSON data
    const parsedSections = useMemo(() => {
        if (!sectionsData || !Array.isArray(sectionsData)) {
            console.warn('DynamicSectionsList: sectionsData is not a valid array', sectionsData);
            return [];
        }

        console.log('DynamicSectionsList: Parsing', sectionsData.length, 'items');
        
        const sections = [];
        let currentSection = null;
        let currentSubsection = null;
        let processedIndices = new Set(); // Track which indices we've already processed

        sectionsData.forEach((item, index) => {
            // Validate item structure
            if (!item || typeof item !== 'object' || !item.type) {
                console.warn(`Skipping invalid item at index ${index}:`, item);
                return;
            }

            // Skip if we've already processed this index (e.g., when processing pairs)
            if (processedIndices.has(index)) {
                return;
            }

            // Handle heading_no + heading pairs
            if (item.type === 'heading_no') {
                const nextItem = sectionsData[index + 1];
                if (nextItem && nextItem.type === 'heading') {
                    // Create new main section with heading number
                    currentSection = {
                        headingNo: item.value,
                        heading: nextItem.value,
                        subsections: [],
                        id: item.id || nextItem.id
                    };
                    sections.push(currentSection);
                    currentSubsection = null;
                    processedIndices.add(index); // Mark heading_no as processed
                    processedIndices.add(index + 1); // Mark heading as processed
                    return;
                }
            }

            // Handle standalone heading (no heading_no before it)
            if (item.type === 'heading') {
                const prevItem = sectionsData[index - 1];
                // Only process if previous item is NOT a heading_no (to avoid double processing)
                if (!prevItem || prevItem.type !== 'heading_no') {
                    currentSection = {
                        headingNo: '',
                        heading: item.value,
                        subsections: [],
                        id: item.id
                    };
                    sections.push(currentSection);
                    currentSubsection = null;
                    processedIndices.add(index);
                    return;
                }
            }

            // Handle subheading_no + subheading pairs
            if (item.type === 'subheading_no') {
                const nextItem = sectionsData[index + 1];
                if (nextItem && nextItem.type === 'subheading') {
                    currentSubsection = {
                        subheadingNo: item.value,
                        subheading: nextItem.value,
                        editor: null,
                        id: item.id || nextItem.id
                    };
                    if (currentSection) {
                        currentSection.subsections.push(currentSubsection);
                    }
                    processedIndices.add(index); // Mark subheading_no as processed
                    processedIndices.add(index + 1); // Mark subheading as processed
                    return;
                }
            }

            // Handle standalone subheading (no subheading_no before it)
            if (item.type === 'subheading') {
                const prevItem = sectionsData[index - 1];
                // Only process if previous item is NOT a subheading_no
                if (!prevItem || prevItem.type !== 'subheading_no') {
                    currentSubsection = {
                        subheadingNo: '',
                        subheading: item.value,
                        editor: null,
                        id: item.id
                    };
                    if (currentSection) {
                        currentSection.subsections.push(currentSubsection);
                    }
                    processedIndices.add(index);
                    return;
                }
            }

            // Handle editor content - attach to current subsection
            if (item.type === 'editor') {
                if (currentSubsection) {
                    currentSubsection.editor = {
                        value: item.value,
                        checkboxConfig: item.checkboxConfig || {},
                        commentConfig: item.commentConfig || {}
                    };
                } else if (currentSection) {
                    // If there's no subsection but there's a section, create a default subsection
                    currentSubsection = {
                        subheadingNo: '',
                        subheading: '',
                        editor: {
                            value: item.value,
                            checkboxConfig: item.checkboxConfig || {},
                            commentConfig: item.commentConfig || {}
                        },
                        id: item.id
                    };
                    currentSection.subsections.push(currentSubsection);
                }
                processedIndices.add(index);
            }
        });

        // Debug: Log parsed sections
        console.log('Parsed sections:', sections);
        sections.forEach((sec, idx) => {
            console.log(`Section ${idx}: ${sec.headingNo ? `SECTION ${sec.headingNo}` : ''} ${sec.heading} - ${sec.subsections.length} subsections`);
        });

        return sections;
    }, [sectionsData]);

    // Function to determine section status (checkmark or X)
    const getSectionStatus = (section) => {
        // Check if section has any content
        if (!section.subsections || section.subsections.length === 0) {
            return null; // No status icon for empty sections
        }

        // Check if any subsections have editor content
        const hasContent = section.subsections.some(sub => 
            sub.editor && sub.editor.value && sub.editor.value.trim() !== '' && sub.editor.value !== '<p><br></p>'
        );
        
        // Return checkmark if has content, X if not
        return hasContent ? 'check' : 'cross';
    };

    // Toggle section expansion
    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    if (!sectionsData || !Array.isArray(sectionsData) || sectionsData.length === 0) {
        return (
            <Card className="border-0 shadow-sm">
                <Card.Body>
                    <p className="text-muted text-center">No sections available.</p>
                    {sectionsData && (
                        <p className="text-muted text-center small">
                            Debug: sectionsData type = {typeof sectionsData}, 
                            isArray = {Array.isArray(sectionsData) ? 'yes' : 'no'},
                            length = {Array.isArray(sectionsData) ? sectionsData.length : 'N/A'}
                        </p>
                    )}
                </Card.Body>
            </Card>
        );
    }

    return (
        <div className="dynamic-sections-list">
            {/* Header with title and service type checkboxes */}
            {title && (
                <div 
                    className="mb-3" 
                    style={{ 
                        background: '#f0e6ff', 
                        padding: '15px', 
                        borderRadius: '5px' 
                    }}
                >
                    <h4 className="mb-2">{title}</h4>
                    <div className="d-flex gap-3">
                        <div className="d-flex align-items-center">
                            <Checkbox 
                                checked={serviceTypes.comp || false}
                                onChange={(e) => onServiceTypeChange && onServiceTypeChange('comp', e.checked)}
                                disabled={!onServiceTypeChange}
                            />
                            <label className="ms-2"><b>COMP</b></label>
                        </div>
                        <div className="d-flex align-items-center">
                            <Checkbox 
                                checked={serviceTypes.ramp || false}
                                onChange={(e) => onServiceTypeChange && onServiceTypeChange('ramp', e.checked)}
                                disabled={!onServiceTypeChange}
                            />
                            <label className="ms-2"><b>Ramp</b></label>
                        </div>
                        <div className="d-flex align-items-center">
                            <Checkbox 
                                checked={serviceTypes.cargo || false}
                                onChange={(e) => onServiceTypeChange && onServiceTypeChange('cargo', e.checked)}
                                disabled={!onServiceTypeChange}
                            />
                            <label className="ms-2"><b>Cargo</b></label>
                        </div>
                    </div>
                </div>
            )}

            {/* Sections List */}
            <div className="sections-list-container">
                {parsedSections.map((section, sectionIndex) => {
                    const status = getSectionStatus(section);
                    // Format section title: if it has a headingNo, prefix with "SECTION X.", otherwise just show heading
                    const sectionTitle = section.headingNo && section.headingNo.trim() !== ''
                        ? `SECTION ${section.headingNo}. ${section.heading}`
                        : section.heading;
                    const sectionKey = section.id || `section-${sectionIndex}`;

                    return (
                        <div 
                            key={sectionKey} 
                            className="section-item mb-3"
                            style={{
                                border: '1px solid #ddd',
                                borderRadius: '5px',
                                overflow: 'hidden',
                                backgroundColor: '#fff'
                            }}
                        >
                            <Accordion>
                                <AccordionTab
                                    header={
                                        <div className="d-flex justify-content-between align-items-center w-100">
                                            <span className="d-flex align-items-center gap-2">
                                                <i 
                                                    className="pi pi-chevron-right" 
                                                    style={{ 
                                                        fontSize: '0.8rem',
                                                        transition: 'transform 0.3s',
                                                        transform: expandedSections[sectionKey] ? 'rotate(90deg)' : 'rotate(0deg)'
                                                    }}
                                                ></i>
                                                <span style={{ fontWeight: '500' }}>{sectionTitle}</span>
                                            </span>
                                            {status && (
                                                <span className="ms-auto me-2">
                                                    {status === 'check' ? (
                                                        <i 
                                                            className="pi pi-check" 
                                                            style={{ 
                                                                color: '#28a745', 
                                                                fontSize: '1.2rem',
                                                                fontWeight: 'bold'
                                                            }}
                                                        ></i>
                                                    ) : (
                                                        <i 
                                                            className="pi pi-times" 
                                                            style={{ 
                                                                color: '#dc3545', 
                                                                fontSize: '1.2rem',
                                                                fontWeight: 'bold'
                                                            }}
                                                        ></i>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    }
                                    onClick={() => toggleSection(sectionKey)}
                                >
                                    <div className="p-3" style={{ backgroundColor: '#f9f9f9' }}>
                                        {section.subsections && section.subsections.length > 0 ? (
                                            section.subsections.map((subsection, subIndex) => {
                                                const subKey = subsection.id || `subsection-${sectionIndex}-${subIndex}`;
                                                return (
                                                    <div key={subKey} className="mb-4">
                                                        {/* Display subheading number and name */}
                                                        {(subsection.subheadingNo || subsection.subheading) && (
                                                            <h6 className="mb-2" style={{ color: '#495057', fontWeight: '600' }}>
                                                                {subsection.subheadingNo && (
                                                                    <span>{subsection.subheadingNo} </span>
                                                                )}
                                                                {subsection.subheading}
                                                            </h6>
                                                        )}
                                                        {/* Display editor content */}
                                                        {subsection.editor && subsection.editor.value && 
                                                         subsection.editor.value.trim() !== '' && 
                                                         subsection.editor.value !== '<p><br></p>' && (
                                                            <div
                                                                className="editor-content"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: DOMPurify.sanitize(subsection.editor.value)
                                                                }}
                                                                style={{ 
                                                                    marginLeft: subsection.subheadingNo || subsection.subheading ? '20px' : '0',
                                                                    lineHeight: '1.6'
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-muted">No subsections available.</p>
                                        )}
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DynamicSectionsList;

