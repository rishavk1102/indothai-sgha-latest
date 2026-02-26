import React from 'react';
import DynamicSectionsList from '../../components/DynamicSectionsList';
import { Card } from 'react-bootstrap';

/**
 * Example component showing how to use DynamicSectionsList with JSON data
 * 
 * Usage:
 * 1. Import this component or copy the usage pattern
 * 2. Pass your JSON data array to the sectionsData prop
 * 3. Customize title and serviceTypes as needed
 */

// Example JSON data structure (replace with your actual data)
const exampleSectionsData = [
  {
    "id": 1762368827568,
    "type": "heading_no",
    "label": "Heading No.",
    "value": "1",
    "checkboxValue": []
  },
  {
    "id": 1762368828568,
    "type": "heading",
    "label": "Heading",
    "value": "MANAGEMENT AND ADMINISTRATIVE FUNCTIONS",
    "checkboxValue": []
  },
  {
    "id": 1762368873127,
    "type": "subheading_no",
    "label": "Subheading No.",
    "value": "1.1",
    "checkboxValue": []
  },
  {
    "id": 1762368874127,
    "type": "subheading",
    "label": "Subheading",
    "value": "Representation",
    "checkboxValue": []
  },
  {
    "id": 1762369329865,
    "type": "editor",
    "label": "Text Editor",
    "value": "<ol type=\"1\" class=\"\" style=\"margin-left: 20px; padding-left: 20px;\"><li>Financial Guarantee Facilitation</li><ol type=\"1\" style=\"margin-left: 20px; padding-left: 20px;\"><li>Provide a financial guarantee to facilitate the Carrier's activities with third party(ies).</li><li>Arrange for a financial guarantee to facilitate the Carrier's activities with third party(ies).</li></ol><li>Liaise with local authorities.</li><li>Indicate that the Handling Company is acting as the handling agent for the Carrier.</li><li>Inform all interested parties concerning schedules of the Carrier's Aircraft.</li></ol>",
    "checkboxValue": [],
    "commentConfig": {
      "list-0": true,
      "list-1": true
    },
    "checkboxConfig": {
      "item-1": {
        "comp": true,
        "ramp": false,
        "cargo": true
      },
      "item-2": {
        "comp": true,
        "ramp": false,
        "cargo": true
      }
    }
  }
  // Add more sections as needed...
];

const SectionsDisplayExample = ({ sectionsData = exampleSectionsData }) => {
  const [serviceTypes, setServiceTypes] = React.useState({
    comp: true,
    ramp: false,
    cargo: false
  });

  const handleServiceTypeChange = (type, checked) => {
    setServiceTypes(prev => {
      const newTypes = { ...prev, [type]: checked };
      
      // Ramp and COMP are mutually exclusive
      if (type === 'ramp' && checked) {
        newTypes.comp = false;
      } else if (type === 'comp' && checked) {
        newTypes.ramp = false;
      }
      
      return newTypes;
    });
  };

  return (
    <div className="container-fluid p-4">
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <h3 className="mb-4">Dynamic Sections Display Example</h3>
          
          <DynamicSectionsList
            sectionsData={sectionsData}
            title="IATA Standard Ground Handling Agreement ANNEX A"
            serviceTypes={serviceTypes}
            onServiceTypeChange={handleServiceTypeChange}
          />
        </Card.Body>
      </Card>
    </div>
  );
};

export default SectionsDisplayExample;

