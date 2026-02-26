import React, { useState } from 'react';
import DynamicSectionsList from '../../components/DynamicSectionsList';
import { Card, Button } from 'react-bootstrap';
import { Dialog } from 'primereact/dialog';

// Your JSON data
const testSectionsData = [
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
      },
      "item-3": {
        "comp": true,
        "ramp": false,
        "cargo": true
      },
      "item-4": {
        "comp": true,
        "ramp": true,
        "cargo": true
      },
      "item-5": {
        "comp": true,
        "ramp": false,
        "cargo": true
      },
      "item-6": {
        "comp": true,
        "ramp": true,
        "cargo": true
      }
    }
  },
  {
    "id": 1762370147586,
    "type": "subheading_no",
    "label": "Subheading No.",
    "value": "1.2",
    "checkboxValue": []
  },
  {
    "id": 1762370148586,
    "type": "subheading",
    "label": "Subheading",
    "value": "Administrative Functions",
    "checkboxValue": []
  },
  {
    "id": 1762370188465,
    "type": "editor",
    "label": "Text Editor",
    "value": "<ol type=\"1\"><li>Establish and maintain local procedures.</li><li>Take action on communications addressed to the Carrier.</li><li>Documentation Management and Administrative Duties</li><ol type=\"1\" style=\"margin-left: 20px; padding-left: 20px;\"><li>Prepare, forward, file and retain for a period [as specified in Annex B]:</li><ol type=\"1\" style=\"margin-left: 20px; padding-left: 20px;\"><li>Messages, documents</li><li>Reports, statistics</li></ol><li>Perform other administrative duties [as specified in Annex B] in the following areas:</li><ol type=\"1\" style=\"margin-left: 20px; padding-left: 20px;\"><li>Station administration</li><li>Passenger services</li><li>Ramp services</li><li>Load control</li><li>Flight operations</li><li>Cargo services</li><li>Mail services</li><li>Support services</li><li>Security</li><li>Aircraft maintenance</li><li>Other, <i>[as specified in Annex B]</i></li></ol></ol><li>Maintain the Carrier's manuals, circulars, and other operational documents connected with the performance of the services.</li><li>On behalf of the Carrier items including but not limited to, invoices, supply orders, handling charge notes, work orders.</li><ol type=\"1\" style=\"margin-left: 20px; padding-left: 20px;\"><li>Check</li><li>Sign</li><li>Forward</li></ol><li>Effect payment, on behalf of the Carrier:<ol type=\"1\" style=\"margin-left: 20px; padding-left: 20px;\"><li>Airport, customs, police and other charges relating to the services performed</li><li>Out-of-pocket expenses, accommodation, transport</li><li>Other, <i>[as specified in Annex B]</i></li></ol></li></ol>",
    "checkboxValue": [],
    "commentConfig": {
      "list-0": true,
      "list-1": true,
      "list-2": true,
      "list-3": true,
      "list-4": true,
      "list-5": true
    },
    "checkboxConfig": {
      "item-1": {
        "comp": true,
        "ramp": true,
        "cargo": true
      },
      "item-2": {
        "comp": true,
        "ramp": true,
        "cargo": true
      }
    }
  },
  {
    "id": 1762370688144,
    "type": "subheading_no",
    "label": "Subheading No.",
    "value": "1.3",
    "checkboxValue": []
  },
  {
    "id": 1762370689144,
    "type": "subheading",
    "label": "Subheading",
    "value": "Supervision and/or Coordination",
    "checkboxValue": []
  },
  {
    "id": 1762370713814,
    "type": "editor",
    "label": "Text Editor",
    "value": "<ol type=\"1\"><li>Provide:</li><ol type=\"1\" style=\"margin-left: 20px; padding-left: 20px;\"><li>Supervision</li><li>Coordination<br>of services contracted by the Carrier with:<br>a.&nbsp;The Handling Company<br>b.&nbsp;Third party(ies)<br><i>[as specified in Annex B]</i></li></ol><li>Provide turnaround coordinator (TRC).</li><li>Ensure that the third party(ies) is(are) informed about operational data and Carrier's requirements in a timely manner.</li><li>Liaise with the Carrier's designated Representative.</li><li>Verify availability and preparedness of personnel, equipment, load, and documentation of third party(ies).</li><li>Meet aircraft upon arrival and liaise with crew.<br></li><li>Decide on non-routine matters.</li><li>Verify dispatch of operational messages.</li><li>Note irregularities and inform the Carrier.</li></ol>",
    "checkboxValue": [],
    "commentConfig": {
      "list-0": true,
      "list-1": true
    },
    "checkboxConfig": {
      "item-1": {
        "comp": true,
        "ramp": true,
        "cargo": true
      }
    }
  },
  {
    "id": 1764696318165,
    "type": "heading_no",
    "label": "Heading No.",
    "value": "2",
    "checkboxValue": []
  },
  {
    "id": 1764696319165,
    "type": "heading",
    "label": "Heading",
    "value": "PASSENGER SERVICES",
    "checkboxValue": []
  },
  {
    "id": 1764696335241,
    "type": "heading_no",
    "label": "Heading No.",
    "value": "3",
    "checkboxValue": []
  },
  {
    "id": 1764696336241,
    "type": "heading",
    "label": "Heading",
    "value": "RAMP SERVICES",
    "checkboxValue": []
  },
  {
    "id": 1764696335924,
    "type": "heading_no",
    "label": "Heading No.",
    "value": "4",
    "checkboxValue": []
  },
  {
    "id": 1764696336924,
    "type": "heading",
    "label": "Heading",
    "value": "LOAD CONTROL AND FLIGHT OPTIONS",
    "checkboxValue": []
  },
  {
    "id": 1764696336555,
    "type": "heading_no",
    "label": "Heading No.",
    "value": "5",
    "checkboxValue": []
  },
  {
    "id": 1764696337555,
    "type": "heading",
    "label": "Heading",
    "value": "CARGO AND MAIL SERVICES",
    "checkboxValue": []
  },
  {
    "id": 1764696337132,
    "type": "heading_no",
    "label": "Heading No.",
    "value": "6",
    "checkboxValue": []
  },
  {
    "id": 1764696338132,
    "type": "heading",
    "label": "Heading",
    "value": "SUPPORT SERVICES",
    "checkboxValue": []
  },
  {
    "id": 1764696337708,
    "type": "heading_no",
    "label": "Heading No.",
    "value": "7",
    "checkboxValue": []
  },
  {
    "id": 1764696338708,
    "type": "heading",
    "label": "Heading",
    "value": "SECURITY",
    "checkboxValue": []
  },
  {
    "id": 1764696391739,
    "type": "heading_no",
    "label": "Heading No.",
    "value": "8",
    "checkboxValue": []
  },
  {
    "id": 1764696392739,
    "type": "heading",
    "label": "Heading",
    "value": "AIRPORT MAINTEINANCE",
    "checkboxValue": []
  }
];

const TestSectionsDisplay = () => {
  const [serviceTypes, setServiceTypes] = useState({
    comp: true,
    ramp: false,
    cargo: false
  });
  const [showDialog, setShowDialog] = useState(true);

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
          <h3 className="mb-4">Test Dynamic Sections Display</h3>
          <p className="text-muted mb-4">
            This page displays your JSON data structure dynamically. 
            All sections should be visible and expandable.
          </p>
          
          <DynamicSectionsList
            sectionsData={testSectionsData}
            title="IATA Standard Ground Handling Agreement ANNEX A"
            serviceTypes={serviceTypes}
            onServiceTypeChange={handleServiceTypeChange}
          />
        </Card.Body>
      </Card>
    </div>
  );
};

export default TestSectionsDisplay;

