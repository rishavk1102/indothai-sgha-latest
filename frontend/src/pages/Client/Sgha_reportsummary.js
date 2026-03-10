import DOMPurify from 'dompurify';
import { Avatar } from 'primereact/avatar';
import { Button } from "primereact/button";
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { TabPanel, TabView } from 'primereact/tabview';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Breadcrumb, Card, Col, Form, Row, Table } from "react-bootstrap";
import { IoChevronBackOutline } from "react-icons/io5";
import { MdFlight } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import GifLoder from '../../interfaces/GifLoder';
import { getSocket } from '../../context/socket';
import { generateSubmissionPDF } from '../../utils/generateSubmissionPDF';

const Sgha_reportsummary = () => {
   const { userId, username } = useAuth(); // userId is client_registration_id for clients
   const navigate = useNavigate();
     const goBack = () => {
      navigate(-1);
    };

    const [expandedRow, setExpandedRow] = useState(null);
      const [visible, setVisible] = useState(false);
      const [searchValue, setSearchValue] = useState('');
   const [submissions, setSubmissions] = useState([]);
   const [filteredSubmissions, setFilteredSubmissions] = useState([]);
   const [loading, setLoading] = useState(true);
   const [statusCounts, setStatusCounts] = useState({
      Pending: 0,
      'In Progress': 0,
      Approved: 0,
      Rejected: 0,
   });
   const [activeStatus, setActiveStatus] = useState('Pending');
   const [sortOrder, setSortOrder] = useState('DESC');
   const [perPage, setPerPage] = useState(15);
   const [selectedSubmission, setSelectedSubmission] = useState(null);
   const [selectedStatus, setSelectedStatus] = useState(null);
   const [dialogVariables, setDialogVariables] = useState({});
   const [dialogTemplateVariables, setDialogTemplateVariables] = useState([]);
   const [loadingDialogVariables, setLoadingDialogVariables] = useState(false);
   const [loadingTemplate, setLoadingTemplate] = useState(false);
   const [itemTextMap, setItemTextMap] = useState({});
   const [sectionTitles, setSectionTitles] = useState({});
   const [submissionVariables, setSubmissionVariables] = useState({}); // Map of submission_id to variables
   const [templateVariables, setTemplateVariables] = useState({}); // Map of submission_id to template variable names
   const [loadingVariables, setLoadingVariables] = useState({}); // Map of submission_id to loading state

   // Comment state
   const [commentVisible, setCommentVisible] = useState(false);
   const [commentSubmission, setCommentSubmission] = useState(null);
   const [comments, setComments] = useState([]);
   const [commentsLoading, setCommentsLoading] = useState(false);
   const [newMessage, setNewMessage] = useState('');
   const [replyingTo, setReplyingTo] = useState(null);
   const [sendingComment, setSendingComment] = useState(false);
   const commentsEndRef = useRef(null);

   // Edit history state (client view: see what was updated)
   const [historyDialogVisible, setHistoryDialogVisible] = useState(false);
   const [historySubmission, setHistorySubmission] = useState(null);
   const [editHistory, setEditHistory] = useState([]);
   const [historyLoading, setHistoryLoading] = useState(false);
   
   const toggleRow = (id) => {
      setExpandedRow(expandedRow === id ? null : id);
   };

   // Fetch comments for a submission
   const fetchComments = async (submissionId) => {
      try {
         setCommentsLoading(true);
         const res = await api.get(`/api/client/submissions/${submissionId}/comments`);
         if (res.data && res.data.data) {
            setComments(res.data.data);
         }
      } catch (err) {
         console.error('Error fetching comments:', err);
         setComments([]);
      } finally {
         setCommentsLoading(false);
      }
   };

   // Open comment dialog
   const openCommentDialog = (submission) => {
      setCommentSubmission(submission);
      setCommentVisible(true);
      setReplyingTo(null);
      setNewMessage('');
      fetchComments(submission.submission_id);
   };

   // Send comment or reply
   const handleSendComment = async () => {
      if (!newMessage.trim() || !commentSubmission) return;

      try {
         setSendingComment(true);
         await api.post(`/api/client/submissions/${commentSubmission.submission_id}/comments`, {
            sender_type: 'Client',
            sender_id: userId,
            sender_name: username || 'Unknown',
            message: newMessage.trim(),
            parent_comment_id: replyingTo?.comment_id || null,
         });
         setNewMessage('');
         setReplyingTo(null);
         await fetchComments(commentSubmission.submission_id);
         setTimeout(() => {
            commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
         }, 100);
      } catch (err) {
         console.error('Error sending comment:', err);
      } finally {
         setSendingComment(false);
      }
   };

   // Listen for real-time comment events
   useEffect(() => {
      try {
         const socket = getSocket();
         if (socket) {
            const handler = (data) => {
               if (commentSubmission && data.submission_id === commentSubmission.submission_id) {
                  fetchComments(commentSubmission.submission_id);
               }
            };
            socket.on('submission-comment-added', handler);
            return () => socket.off('submission-comment-added', handler);
         }
      } catch (e) {
         // Socket not connected yet
      }
   }, [commentSubmission]);

   // Format comment time
   const formatCommentTime = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
   };

   const openHistoryDialog = async (submission) => {
      setHistorySubmission(submission);
      setHistoryDialogVisible(true);
      setHistoryLoading(true);
      try {
         const res = await api.get(`/api/client/annex-a-submissions/${submission.submission_id}/history`);
         setEditHistory(res.data?.data || []);
      } catch (err) {
         console.error('Error fetching edit history:', err);
         setEditHistory([]);
      } finally {
         setHistoryLoading(false);
      }
   };

   const formatHistoryDate = (dateStr) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
   };
    
   // Parse HTML content to extract items with their text and numbers
   const parseHTMLContent = useCallback((htmlString) => {
      if (!htmlString) {
         return { items: {} };
      }
      
      try {
         const tempDiv = document.createElement('div');
         tempDiv.innerHTML = DOMPurify.sanitize(htmlString, { ALLOWED_TAGS: ['ol', 'ul', 'li'] });
         
         const allLists = Array.from(tempDiv.querySelectorAll('ol, ul'));
         
         const topLevelLists = allLists.filter(list => {
            let parent = list.parentElement;
            while (parent && parent !== tempDiv) {
               if (parent.tagName === 'OL' || parent.tagName === 'UL') {
                  return false;
               }
               parent = parent.parentElement;
            }
            return true;
         });
         
         let globalItemCounter = 1;
         let topLevelIndex = 0;
         const itemsMap = {};
         
         const convertListItems = (listElement, parentIndexPath = [], isTopLevelList = false) => {
            if (!listElement || (listElement.tagName !== 'OL' && listElement.tagName !== 'UL')) {
               return [];
            }
            
            const items = [];
            const allChildren = Array.from(listElement.children);
            let currentItemIndex = 0;
            
            for (let i = 0; i < allChildren.length; i++) {
               const child = allChildren[i];
               
               if (child.tagName === 'LI') {
                  const item = child;
                  const itemIndex = currentItemIndex;
                  currentItemIndex++;
                  
                  const itemClone = item.cloneNode(true);
                  const nestedListsInClone = itemClone.querySelectorAll('ol, ul');
                  nestedListsInClone.forEach(nestedList => nestedList.remove());
                  
                  const textContent = itemClone.textContent || itemClone.innerText || '';
                  const cleanText = textContent.trim();
                  
                  let currentIndexPath;
                  if (isTopLevelList && parentIndexPath.length === 0) {
                     topLevelIndex++;
                     currentIndexPath = [topLevelIndex];
                  } else {
                     currentIndexPath = [...parentIndexPath, itemIndex + 1];
                  }
                  const hierarchicalIndex = currentIndexPath.join('.');
                  
                  const itemId = `item-${globalItemCounter}`;
                  globalItemCounter++;
                  
                  let subItems = null;
                  const nestedLists = item.querySelectorAll('ol, ul');
                  if (nestedLists.length > 0) {
                     subItems = [];
                     nestedLists.forEach(nestedList => {
                        const nestedItems = convertListItems(nestedList, currentIndexPath, false);
                        nestedItems.forEach(nestedItem => {
                           subItems.push(nestedItem);
                        });
                     });
                  }
                  
                  const itemData = {
                     id: itemId,
                     index: hierarchicalIndex,
                     text: cleanText,
                     subItems: subItems || []
                  };
                  
                  itemsMap[itemId] = itemData;
                  items.push(itemData);
               }
            }
            
            return items;
         };
         
         topLevelLists.forEach((list) => {
            convertListItems(list, [], true);
         });
         
         return { items: itemsMap };
      } catch (error) {
         console.error('Error parsing HTML content:', error);
         return { items: {} };
      }
   }, []);

   // Parse template data to create a map of item numbers to text
   const parseTemplateData = useCallback((templateData) => {
      if (!templateData || !Array.isArray(templateData)) {
         setItemTextMap({});
         return;
      }

      const sectionMap = {};
      const titlesMap = {};
      let currentSection = null;
      let currentMainSection = null;
      let mainSectionHeading = null;

      templateData.forEach((field, index) => {
         if (field.type === 'heading_no') {
            const sectionNum = String(field.value);
            
            if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(sectionNum)) {
               if (index + 1 < templateData.length && templateData[index + 1].type === 'heading') {
                  currentMainSection = sectionNum;
                  mainSectionHeading = templateData[index + 1].value;
                  return;
               }
            }

            if (sectionNum.includes('.') && currentMainSection) {
               const nextField = index + 1 < templateData.length ? templateData[index + 1] : null;
               if (nextField && nextField.type === 'subheading') {
                  currentSection = sectionNum;
                  if (!sectionMap[currentSection]) {
                     sectionMap[currentSection] = {
                        editorContent: null
                     };
                  }
                  const subheadingText = nextField.value || '';
                  const sectionLabel = mainSectionHeading 
                     ? `${mainSectionHeading} - ${sectionNum} ${subheadingText}`
                     : `${sectionNum} ${subheadingText}`;
                  titlesMap[currentSection] = sectionLabel;
                  return;
               }
            }
         }

         if (field.type === 'subheading_no' && currentMainSection) {
            const headingNo = String(field.value);
            if (headingNo.includes('.')) {
               currentSection = headingNo;
               if (!sectionMap[currentSection]) {
                  sectionMap[currentSection] = {
                     editorContent: null
                  };
               }
               const nextField = index + 1 < templateData.length ? templateData[index + 1] : null;
               const subheadingText = (nextField && nextField.type === 'subheading') ? nextField.value : '';
               const sectionLabel = mainSectionHeading 
                  ? `${mainSectionHeading} - ${headingNo} ${subheadingText}`
                  : `${headingNo} ${subheadingText}`;
               titlesMap[currentSection] = sectionLabel;
               return;
            }
         }

         if (field.type === 'editor' && currentSection && currentMainSection) {
            if (sectionMap[currentSection]) {
               sectionMap[currentSection].editorContent = field.value;
            }
         }
      });
      
      setSectionTitles(titlesMap);

      const textMap = {};
      Object.keys(sectionMap).forEach(sectionKey => {
         const sectionInfo = sectionMap[sectionKey];
         
         if (sectionInfo.editorContent) {
            const parsedContent = parseHTMLContent(sectionInfo.editorContent);
            const itemsMap = parsedContent?.items || {};
            
            Object.values(itemsMap).forEach(item => {
               if (item.index && item.text) {
                  const fullItemNumber = `${sectionKey}.${item.index}`;
                  textMap[fullItemNumber] = item.text;
                  textMap[`${fullItemNumber}-main`] = item.text;
                  
                  if (item.subItems && Array.isArray(item.subItems)) {
                     item.subItems.forEach((subItem) => {
                        if (subItem.index && subItem.text) {
                           const indexParts = subItem.index.split('.');
                           const lastPart = indexParts[indexParts.length - 1];
                           const numericIndex = parseInt(lastPart, 10);
                           
                           if (!isNaN(numericIndex) && numericIndex > 0) {
                              const letter = String.fromCharCode(96 + numericIndex);
                              const fullSubItemNumberLetter = `${fullItemNumber}.${letter}`;
                              textMap[fullSubItemNumberLetter] = subItem.text;
                              
                              const fullSubItemNumberNumeric = `${fullItemNumber}.${numericIndex}`;
                              textMap[fullSubItemNumberNumeric] = subItem.text;
                           }
                        }
                     });
                  }
               }
            });
         }
      });

      setItemTextMap(textMap);
   }, [parseHTMLContent]);

   // Fetch variables when a row is expanded
   const fetchVariables = useCallback(async (submissionId) => {
      try {
         setLoadingVariables(prev => ({ ...prev, [submissionId]: true }));
         const response = await api.get(
            `/api/client/annex-a-submissions/${submissionId}/variables/template`
         );

         if (response.data?.data) {
            setSubmissionVariables(prev => ({
               ...prev,
               [submissionId]: response.data.data.variables || {},
            }));
            setTemplateVariables(prev => ({
               ...prev,
               [submissionId]: response.data.data.templateVariables || [],
            }));
         }
      } catch (error) {
         console.error('Error fetching variables:', error);
         setSubmissionVariables(prev => ({ ...prev, [submissionId]: {} }));
         setTemplateVariables(prev => ({ ...prev, [submissionId]: [] }));
      } finally {
         setLoadingVariables(prev => ({ ...prev, [submissionId]: false }));
      }
   }, []);

   // Fetch template data when a row is expanded (use submission's agreement_year)
   const expandedSubmission = useMemo(
      () => (expandedRow ? submissions.find((s) => s.submission_id === expandedRow) : null),
      [expandedRow, submissions]
   );
   const expandedAgreementYear = expandedSubmission?.agreement_year >= 2000 && expandedSubmission?.agreement_year <= 2100
      ? Number(expandedSubmission.agreement_year)
      : 2025;

   useEffect(() => {
      const fetchTemplateData = async () => {
         if (!expandedRow) {
            setItemTextMap({});
            setSectionTitles({});
            return;
      }

         // Fetch variables for this submission
         fetchVariables(expandedRow);

         try {
            setLoadingTemplate(true);
            const response = await api.get(
               `/sgha_template_content/get/${expandedAgreementYear}/Annex A/Section Template`
            );
            
            if (response.data?.data?.content) {
               const content = response.data.data.content;
               
               let parsedContent;
               try {
                  parsedContent = typeof content === 'string' 
                     ? JSON.parse(content) 
                     : content;
               } catch (parseError) {
                  console.error('Error parsing content:', parseError);
                  setItemTextMap({});
                  return;
               }
               
               parseTemplateData(parsedContent);
            }
         } catch (error) {
            console.error("Error fetching template data:", error);
            setItemTextMap({});
         } finally {
            setLoadingTemplate(false);
         }
      };

      fetchTemplateData();
   }, [expandedRow, expandedAgreementYear, parseTemplateData, fetchVariables]);

   // Get text for an item number
   const getItemText = (itemNumber) => {
      if (!itemNumber) {
         return null;
      }
      
      if (itemTextMap[itemNumber]) {
         return itemTextMap[itemNumber];
      }
      
      const cleanNumber = itemNumber.replace('-main', '');
      if (itemTextMap[cleanNumber]) {
         return itemTextMap[cleanNumber];
      }
      
      const letterSuffixMatch = itemNumber.match(/^(\d+\.\d+\.\d+)\.([a-z]+)$/);
      if (letterSuffixMatch) {
         const parentNumber = letterSuffixMatch[1];
         if (itemTextMap[parentNumber]) {
            return `${itemTextMap[parentNumber]} (${letterSuffixMatch[2]})`;
         }
      }
      
      const numericSuffixMatch = itemNumber.match(/^(\d+\.\d+\.\d+)\.(\d+)$/);
      if (numericSuffixMatch) {
         const parentNumber = numericSuffixMatch[1];
         if (itemTextMap[itemNumber]) {
            return itemTextMap[itemNumber];
         }
         
         const letterIndex = parseInt(numericSuffixMatch[2], 10);
         if (!isNaN(letterIndex) && letterIndex > 0) {
            const letter = String.fromCharCode(96 + letterIndex);
            const letterKey = `${parentNumber}.${letter}`;
            if (itemTextMap[letterKey]) {
               return itemTextMap[letterKey];
            }
         }
         
         if (itemTextMap[parentNumber]) {
            return `${itemTextMap[parentNumber]} (sub-item ${numericSuffixMatch[2]})`;
         }
      }
      
      const parts = itemNumber.split('.');
      if (parts.length >= 3) {
         const baseNumber = parts.slice(0, 3).join('.');
         if (itemTextMap[baseNumber]) {
            return itemTextMap[baseNumber];
         }
      }
      
      return null;
   };

   // Fetch submissions from API
   const fetchSubmissions = useCallback(async () => {
      if (!userId) {
         setLoading(false);
         return;
      }

      try {
         setLoading(true);
         const response = await api.get('/api/client/annex-a-submissions-list', {
            params: {
               status: activeStatus,
               sortBy: sortOrder,
               limit: perPage,
               client_registration_id: userId, // Filter by logged-in client
            },
         });

         if (response.data && response.data.data) {
            setSubmissions(response.data.data);
            setFilteredSubmissions(response.data.data);
            if (response.data.counts) {
               setStatusCounts(response.data.counts);
            }
         }
      } catch (error) {
         console.error('Error fetching submissions:', error);
         setSubmissions([]);
         setFilteredSubmissions([]);
      } finally {
         setLoading(false);
      }
   }, [activeStatus, sortOrder, perPage, userId]);

   useEffect(() => {
      fetchSubmissions();
   }, [fetchSubmissions]);

   // Filter submissions by search
   useEffect(() => {
      if (!searchValue) {
         setFilteredSubmissions(submissions);
         return;
      }

      const filtered = submissions.filter((submission) => {
         const searchLower = searchValue.toLowerCase();
         const detailsSummary = getSghaDetailsSummary(submission);
         return (
            submission.client_name?.toLowerCase().includes(searchLower) ||
            submission.contact_name?.toLowerCase().includes(searchLower) ||
            submission.contact_email?.toLowerCase().includes(searchLower) ||
            submission.contact_phone?.toLowerCase().includes(searchLower) ||
            submission.service_type?.toLowerCase().includes(searchLower) ||
            (detailsSummary !== '—' && detailsSummary.toLowerCase().includes(searchLower))
         );
      });
      setFilteredSubmissions(filtered);
   }, [searchValue, submissions]);

   // Format date from YYYY-MM-DD to DD/MM/YYYY
   const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
   };

   // Format date and time for submission timestamps (DD/MM/YYYY, HH:MM)
   const formatDateTime = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year}, ${hours}:${minutes}`;
   };

   // Build one-line summary of Add New SGHA form_details for table column
   const getSghaDetailsSummary = (submission) => {
      const fd = submission.form_details;
      if (!fd || typeof fd !== 'object') return '—';
      const parts = [];
      if (fd.company_name) parts.push(fd.company_name);
      if (fd.contact_person) parts.push(`Contact: ${fd.contact_person}`);
      if (fd.applicable_for) parts.push(fd.applicable_for);
      const services = [];
      if (fd.ramp) services.push('Ramp');
      if (fd.comp) services.push('COMP');
      if (fd.cargo) services.push('Cargo');
      if (services.length) parts.push(services.join(', '));
      if (fd.rate) parts.push(`Rate: ${fd.rate}`);
      return parts.length ? parts.join(' · ') : '—';
   };
    
      // Map statuses to badge colors (client statuses: Pending, In Progress, Approved, Rejected)
      const statusColors = {
        Pending: "bg-warning text-dark",
        'In Progress': "bg-primary text-white",
        Approved: "bg-success text-white",
        Rejected: "bg-danger text-white",
      };
           
   // Status options for dropdown (client statuses only)
   const statusOptions = useMemo(() => [
      { name: "Pending", code: "Pending" },
      { name: "In Progress", code: "In Progress" },
      { name: "Approved", code: "Approved" },
      { name: "Rejected", code: "Rejected" },
   ], []);

   // Initialize status and fetch Company's Pricing variables when dialog opens
   useEffect(() => {
      if (!visible || !selectedSubmission) {
         if (!visible) {
            setDialogVariables({});
            setDialogTemplateVariables([]);
            setLoadingDialogVariables(false);
            setSelectedStatus(null);
         }
         return;
      }
      // Initialize status: show In Progress if employee has set it, else use client_status
      const displayStatus = selectedSubmission.status === 'In Progress' ? 'In Progress' : (selectedSubmission.client_status || 'Pending');
      const currentStatusOption = statusOptions.find(option => option.code === displayStatus);
      if (currentStatusOption) setSelectedStatus(currentStatusOption);
      else {
         const pendingOption = statusOptions.find(option => option.code === 'Pending');
         if (pendingOption) setSelectedStatus(pendingOption);
      }
      // Fetch variables/template for Company's Pricing so we can show and validate
      const fetchDialogVariables = async () => {
         try {
            setLoadingDialogVariables(true);
            const response = await api.get(
               `/api/client/annex-a-submissions/${selectedSubmission.submission_id}/variables/template`
            );
            console.log('[ReportSummary Status Dialog] Variables loaded', {
               submission_id: selectedSubmission.submission_id,
               data: response.data?.data,
               templateVariables: response.data?.data?.templateVariables,
               templateVariablesCount: (response.data?.data?.templateVariables || []).length,
            });
            if (response.data?.data) {
               const variables = response.data.data.variables || {};
               const templateVars = response.data.data.templateVariables || [];
               setDialogVariables(variables);
               setDialogTemplateVariables(templateVars);
            } else {
               setDialogVariables({});
               setDialogTemplateVariables([]);
            }
         } catch (error) {
            console.error('[ReportSummary Status Dialog] Error fetching variables:', error);
            setDialogVariables({});
            setDialogTemplateVariables([]);
         } finally {
            setLoadingDialogVariables(false);
         }
      };
      fetchDialogVariables();
   }, [visible, selectedSubmission, statusOptions]);

   const handleStatusUpdate = async () => {
      if (!selectedSubmission || !selectedStatus) return;

      // Client-side validation: Company's Pricing vars must not be empty or "na"
      console.log('[ReportSummary Status Update] Update clicked', {
         submission_id: selectedSubmission.submission_id,
         selectedStatus: selectedStatus?.code,
         dialogTemplateVariables,
         dialogTemplateVariablesLength: dialogTemplateVariables.length,
         dialogVariables,
      });
      if (dialogTemplateVariables.length > 0) {
         const emptyOrNa = dialogTemplateVariables.filter((varName) => {
            const val = (dialogVariables[varName] ?? '').toString().trim().toLowerCase();
            return !val || val === 'na' || val === 'n/a';
         });
         console.log('[ReportSummary Status Update] Company\'s Pricing validation', { emptyOrNa, wouldBlock: emptyOrNa.length > 0 });
         if (emptyOrNa.length > 0) {
            const labels = emptyOrNa.map((v) => v.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())).join(', ');
            alert(`Please enter valid values for Company's Pricing: ${labels}. They cannot be empty or "na".`);
            return;
         }
      } else {
         console.log('[ReportSummary Status Update] No template variables – skipping Company\'s Pricing validation');
      }

      try {
         // Call API to update client_status (client side uses client_status, not status)
         await api.put(`/api/client/annex-a-submissions/${selectedSubmission.submission_id}/status`, {
            client_status: selectedStatus.code
         });
         
         // Close dialog
         setVisible(false);
         const newStatus = selectedStatus.code;
         setSelectedSubmission(null);
         setSelectedStatus(null);
         
         if (newStatus !== activeStatus) {
            setActiveStatus(newStatus);
            setSearchValue('');
         } else {
            await fetchSubmissions();
         }
      } catch (error) {
         console.error('Error updating status:', error);
         alert('Failed to update status. Please try again.');
      }
   };

   if (loading) {
      return <div className='loderDiv'><GifLoder /></div>;
   }

   // Render table content for a specific status
   const renderTableContent = () => (
                <Card className='border-0 shadow-0 p-0'>
                    <Card.Header className='border-0 shadow-0 pt-3 bg-white'>
                        <div className="d-flex align-items-center gap-1 justify-content-end filterDiv">
                            <label className="me-2">Sort By</label>
                            <Form.Select
                                aria-label="Sort Order"
                                style={{ width: '100px' }}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                            >
                                <option value="ASC">ASC</option>
                                <option value="DESC">DESC</option>
                            </Form.Select>
                            <Form.Select
                                aria-label="Limit"
                                style={{ width: '100px' }}
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                            >
                                <option value={15}>15</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </Form.Select>
                            <IconField iconPosition="left">
                                <InputIcon className="pi pi-search" />
                                <InputText
                                    placeholder="Search"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                />
                            </IconField>
                        </div>
                    </Card.Header>
                    <Card.Body>
                        <Table bordered>
                            <thead>
                            <tr>
                                <th style={{ width: "60px" }}></th>
                                <th>Client Name</th>
                                <th>Contact Name</th>
                                <th style={{ minWidth: "180px" }}>SGHA Details</th>
                                <th>Effective To</th>
                     <th>Effective From</th>
                                <th>Service Type</th>
                                <th style={{ width: "150px" }}>Price</th>
                                <th style={{ width: "160px" }}>Submission Time</th>
                     <th style={{ width: "260px" }}>Status/Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                  {filteredSubmissions.length === 0 ? (
                     <tr>
                        <td colSpan="10" className="text-center py-4">
                           No submissions found
                        </td>
                     </tr>
                  ) : (
                     filteredSubmissions.map((submission) => (
                        <React.Fragment key={submission.submission_id}>
                                <tr>
                                    <td>
                                    <Button
                                    icon={expandedRow === submission.submission_id ? "pi pi-minus-circle" : "pi pi-plus-circle"}
                                        className="p-0 py-2"
                                        text
                                        severity="danger"
                                    onClick={() => toggleRow(submission.submission_id)}
                                    />
                                    </td>
                                    <td>
                                    <div className="d-flex align-items-center gap-2">
                                        <Avatar
                                        className="me-2"
                                        style={{ backgroundColor: 'rgb(197 197 197 / 27%)', color: 'rgb(146 74 151)', width: '31px', height: '31px' }}
                                        shape="circle"
                                        >
                                        <MdFlight />
                                        </Avatar>
                                        <span className="d-flex flex-column gap-1">
                                       <b>{submission.client_name}</b>
                                        </span>
                                    </div>
                                    </td>
                                    <td>
                                 {submission.contact_name}
                                 <small className='d-block mt-1 mb-0'>E: {submission.contact_email}</small>
                                 <small className='d-block mt-1 mb-0'>M: {submission.contact_phone}</small>
                                    </td>
                                    <td>
                                       <small className="text-muted" style={{ fontSize: '12px', lineHeight: 1.3 }} title={getSghaDetailsSummary(submission)}>
                                          {getSghaDetailsSummary(submission)}
                                       </small>
                                    </td>
                              <td>{formatDate(submission.effective_to)}</td>
                              <td>{formatDate(submission.effective_from)}</td>
                              <td>{submission.service_type}</td>
                              <td>INR -</td>
                              <td className="small">{formatDateTime(submission.submission_timestamp)}</td>
                                    <td>
                                        <div className="d-flex align-items-center gap-2">
                                    <Badge className={statusColors[submission.status === 'In Progress' ? 'In Progress' : (submission.client_status || 'Pending')] || "bg-secondary text-white"} style={{ border: "none", height: '17px' }}>
                                       {submission.status === 'In Progress' ? 'In Progress' : (submission.client_status || 'Pending')}
                                            </Badge>
                                            <div className="d-flex gap-2">
                                                <Button
                                                    icon="pi pi-pencil"
                                                    className="p-0"
                                                    text
                                                    severity="danger"
                                                    style={{ fontSize: '10px', width: '28px' }}
                                          onClick={() => {
                                             setSelectedSubmission(submission);
                                             setVisible(true);
                                          }}
                                                />
                                                <Button
                                                    icon="pi pi-eye"
                                                    className="p-0"
                                                    text
                                                    severity="help"
                                                    style={{ fontSize: '10px', width: '28px' }}
                                                    tooltip="Preview PDF"
                                                    tooltipOptions={{ position: 'top' }}
                                                    onClick={async () => {
                                                       try {
                                                          await generateSubmissionPDF(submission, itemTextMap, sectionTitles, { openInNewTab: true });
                                                       } catch (error) {
                                                          console.error('Error generating PDF preview:', error);
                                                          alert('Failed to generate PDF preview. Please try again.');
                                                       }
                                                    }}
                                                />
                                                <Button
                                                    icon="pi pi-file-pdf"
                                                    className="p-0"
                                                    text
                                                    severity="success"
                                                    style={{ fontSize: '10px', width: '28px' }}
                                                    tooltip="Download PDF"
                                                    tooltipOptions={{ position: 'top' }}
                                                    onClick={async () => {
                                                       try {
                                                          await generateSubmissionPDF(submission, itemTextMap, sectionTitles, { openInNewTab: false });
                                                       } catch (error) {
                                                          console.error('Error downloading PDF:', error);
                                                          alert('Failed to download PDF. Please try again.');
                                                       }
                                                    }}
                                                />
                                                <Button
                                                    icon="pi pi-comments"
                                                    className="p-0"
                                                    text
                                                    severity="info"
                                                    style={{ fontSize: '10px', width: '28px' }}
                                                    tooltip="Comments"
                                                    tooltipOptions={{ position: 'top' }}
                                                    onClick={() => openCommentDialog(submission)}
                                                />
                                                <Button
                                                    icon="pi pi-history"
                                                    className="p-0"
                                                    text
                                                    severity="secondary"
                                                    style={{ fontSize: '10px', width: '28px' }}
                                                    tooltip="What was updated"
                                                    tooltipOptions={{ position: 'top' }}
                                                    onClick={() => openHistoryDialog(submission)}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                </tr>

                           {expandedRow === submission.submission_id && (
                                    <tr>
                                    <td colSpan="10" style={{ background: "#f3ebf43d" }}>
                                    <div className="p-3">
                                       {/* Service Type Name */}
                                       {submission.checkbox_selections?.serviceTypes && (
                                          <h6 className="mb-3">
                                             {submission.checkbox_selections.serviceTypes.comp && 'COMP'}
                                             {submission.checkbox_selections.serviceTypes.ramp && 'Ramp'}
                                             {submission.checkbox_selections.serviceTypes.cargo && 'Cargo'}
                                          </h6>
                                       )}
                                       
                                       {/* Scrollable container for sections */}
                                       <div style={{ overflowX: 'auto', overflowY: 'visible', width: '100%' }}>
                                          <div style={{ display: 'flex', minWidth: 'max-content', gap: '15px' }}>
                                             
                                             {/* SGHA Details (Add New SGHA form data) */}
                                             {submission.form_details && typeof submission.form_details === 'object' && (
                                                <div style={{ minWidth: '260px', maxWidth: '260px', flexShrink: 0 }}>
                                                   <div className="border rounded p-3" style={{ height: '100%', minHeight: '300px' }}>
                                                      <h6 className="mb-3 fw-bold">SGHA Details</h6>
                                                      <div className="adsbody small">
                                                         <ul className="list-unstyled mb-0">
                                                            {submission.form_details.company_name && <li className="mb-1"><strong>Company:</strong> {submission.form_details.company_name}</li>}
                                                            {submission.form_details.contact_person && <li className="mb-1"><strong>Contact:</strong> {submission.form_details.contact_person}</li>}
                                                            {submission.form_details.email && <li className="mb-1"><strong>Email:</strong> {submission.form_details.email}</li>}
                                                            {submission.form_details.phone_number && <li className="mb-1"><strong>Phone:</strong> {submission.form_details.phone_number}</li>}
                                                            {(submission.form_details.address_line_1 || submission.form_details.city) && (
                                                               <li className="mb-1"><strong>Address:</strong> {[submission.form_details.address_line_1, submission.form_details.address_line_2, submission.form_details.city, submission.form_details.post_code, submission.form_details.state, submission.form_details.country].filter(Boolean).join(', ')}</li>
                                                            )}
                                                            {(submission.form_details.pan_card_no || submission.form_details.gstn) && (
                                                               <li className="mb-1"><strong>PAN:</strong> {submission.form_details.pan_card_no || '—'} <strong>GSTN:</strong> {submission.form_details.gstn || '—'}</li>
                                                            )}
                                                            {(submission.form_details.schedule || submission.form_details.nonschedule) && (
                                                               <li className="mb-1"><strong>Flight type:</strong> {[submission.form_details.schedule && 'Schedule', submission.form_details.nonschedule && 'Non Schedule'].filter(Boolean).join(', ')}</li>
                                                            )}
                                                            {(submission.form_details.ramp || submission.form_details.comp || submission.form_details.cargo) && (
                                                               <li className="mb-1"><strong>Services:</strong> {[submission.form_details.ramp && 'Ramp', submission.form_details.comp && 'COMP', submission.form_details.cargo && 'Cargo'].filter(Boolean).join(', ')}</li>
                                                            )}
                                                            {submission.form_details.applicable_for && <li className="mb-1"><strong>Applicable for:</strong> {submission.form_details.applicable_for}</li>}
                                                            {submission.form_details.rate && <li className="mb-1"><strong>Rate:</strong> {submission.form_details.rate}</li>}
                                                            {submission.form_details.template_year && <li className="mb-1"><strong>Template year:</strong> {submission.form_details.template_year}</li>}
                                                            {submission.form_details.other_details && <li className="mb-1"><strong>Other:</strong> {submission.form_details.other_details}</li>}
                                                         </ul>
                                                      </div>
                                                   </div>
                                                </div>
                                             )}
                                             {/* Submission Info Column */}
                                             <div style={{ minWidth: '250px', maxWidth: '250px', flexShrink: 0 }}>
                                                <div className="border rounded p-3" style={{ height: '100%', minHeight: '300px' }}>
                                                   <h6 className="mb-3 fw-bold">Submission Info</h6>
                                            <div className="commentbody">
                                            <ul>
                                                <li>
                                                            <span className="d-block">Agreement Year: {submission.agreement_year}</span>
                                                            <span className="d-block mt-1">Submitted (Client): {formatDateTime(submission.submission_timestamp)}</span>
                                                            <span className="d-block mt-1"><small>Last Updated: {formatDateTime(submission.updated_at)}</small></span>
                                                </li>
                                            </ul>
                                            </div>
                                                </div>
                                             </div>
                                             
                                             {/* Company's Pricing Column (Read-only for clients) */}
                                             {templateVariables[submission.submission_id]?.length > 0 && (
                                                <div style={{ minWidth: '300px', maxWidth: '300px', flexShrink: 0 }}>
                                                   <div className="border rounded p-3" style={{ height: '100%', minHeight: '300px' }}>
                                                      <h6 className="mb-3 fw-bold">Company's Pricing</h6>
                                                      {loadingVariables[submission.submission_id] ? (
                                                         <div className="text-center p-3">
                                                            <i className="pi pi-spin pi-spinner me-2"></i>
                                                            Loading company's pricing...
                                                         </div>
                                                      ) : (
                                                         <div className="adsbody">
                                                            <ul className="list-unstyled mb-0">
                                                               {templateVariables[submission.submission_id].map((varName) => {
                                                                  const varValue = submissionVariables[submission.submission_id]?.[varName] || '';
                                                                  
                                                                  return (
                                                                     <li key={varName} className="mb-2">
                                                                        <div className="d-flex flex-column gap-1">
                                                                           <label className="small fw-semibold">{varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</label>
                                                                           <span className="small">{typeof varValue === 'object' ? JSON.stringify(varValue) : String(varValue || 'N/A')}</span>
                                                                        </div>
                                                                     </li>
                                                                  );
                                                               })}
                                                            </ul>
                                                         </div>
                                                      )}
                                                   </div>
                                                </div>
                                             )}
                                             
                                             {/* Status Column */}
                                             <div style={{ minWidth: '250px', maxWidth: '250px', flexShrink: 0 }}>
                                                <div className="border rounded p-3" style={{ height: '100%', minHeight: '300px' }}>
                                                   <h6 className="mb-3 fw-bold">Status</h6>
                                            <div className="adsbody">
                                            <ul>
                                                <li>
                                                            <p className="mb-0"><b>Current Status: {submission.status === 'In Progress' ? 'In Progress' : (submission.client_status || 'Pending')}</b></p>
                                                            <p className="mb-0 mt-2">
                                                               <small>Last Updated: {formatDateTime(submission.updated_at)}</small>
                                                    </p>
                                                </li>
                                            </ul>
                                            </div>
                                                </div>
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                    </td>
                                    </tr>
                                )}
                                </React.Fragment>
                     ))
                  )}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
   );

   return (
      <>
         <Row className='mb-4'>
            <Col md={12} lg={4}>
               <Breadcrumb>
                  <Breadcrumb.Item onClick={goBack}>
                     <IoChevronBackOutline /> Back
                  </Breadcrumb.Item>
                  <Breadcrumb.Item active>Report Summary</Breadcrumb.Item>
               </Breadcrumb>
            </Col>
         </Row>
         
         <TabView className="mx-0" activeIndex={['Pending', 'In Progress', 'Approved', 'Rejected'].indexOf(activeStatus)} onTabChange={(e) => {
            const statuses = ['Pending', 'In Progress', 'Approved', 'Rejected'];
            setActiveStatus(statuses[e.index] || 'Pending');
            setSearchValue('');
         }}>
            <TabPanel
               header={
                  <span className="flex align-items-center gap-4">
                     Pending <Badge bg="warning">{statusCounts.Pending}</Badge>
                  </span>
               }
            >
               {renderTableContent()}
            </TabPanel>
            <TabPanel
               header={
                  <span className="flex align-items-center gap-4">
                     In Progress <Badge bg="primary">{statusCounts['In Progress']}</Badge>
                  </span>
               }
            >
               {renderTableContent()}
            </TabPanel>
            <TabPanel
               header={
                  <span className="flex align-items-center gap-4">
                     Approved <Badge bg="success">{statusCounts.Approved}</Badge>
                  </span>
               }
            >
               {renderTableContent()}
            </TabPanel>
            <TabPanel 
                header={
                    <span className="flex align-items-center gap-2">
                     Rejected <Badge bg="danger">{statusCounts.Rejected}</Badge>
                    </span>
                }
            >
               {renderTableContent()}
            </TabPanel>
        </TabView>

        <Dialog
            visible={visible}
            style={{ width: "380px" }}
            onHide={() => {
                if (!visible) return;
                setVisible(false);
               setSelectedSubmission(null);
               setSelectedStatus(null);
            }}
            >
            <h6>{selectedSubmission?.client_name || 'Update Status'}</h6>
            <hr />
            <div className="mb-3">
               <label className="small fw-semibold d-block mb-1">Status</label>
               <Dropdown
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.value)}
                  options={statusOptions}
                  optionLabel="name"
                  placeholder="Select a Status"
                  className="w-100"
               />
            </div>
            <Button
                label="Update"
                icon="pi pi-check"
                className="py-1 mt-3 text-white"
                style={{ fontSize: "14px", float: "right" }}
                severity="warning"
                onClick={handleStatusUpdate}
                disabled={!selectedStatus}
            />
        </Dialog>

         {/* Comment Dialog */}
         <Dialog
            visible={commentVisible}
            style={{ width: '480px', maxHeight: '85vh' }}
            header={
               <div className="d-flex align-items-center gap-2">
                  <i className="pi pi-comments" style={{ fontSize: '1.1rem', color: 'rgb(146 74 151)' }}></i>
                  <span>Comments {commentSubmission ? `- ${commentSubmission.client_name}` : ''}</span>
               </div>
            }
            onHide={() => {
               if (!commentVisible) return;
               setCommentVisible(false);
               setCommentSubmission(null);
               setComments([]);
               setNewMessage('');
               setReplyingTo(null);
            }}
            className="p-fluid"
         >
            {/* Comments list */}
            <div style={{ maxHeight: '400px', overflowY: 'auto', minHeight: '200px', padding: '0.5rem 0' }}>
               {commentsLoading ? (
                  <div className="text-center py-4">
                     <i className="pi pi-spin pi-spinner me-2"></i>
                     <p className="mt-2 mb-0" style={{ color: '#808080' }}>Loading comments...</p>
                  </div>
               ) : comments.length === 0 ? (
                  <div className="text-center py-4">
                     <i className="pi pi-inbox" style={{ fontSize: '2rem', color: '#bdbdbd' }}></i>
                     <p className="mt-2 mb-0" style={{ color: '#808080' }}>
                        No comments yet. Start a conversation!
                     </p>
                  </div>
               ) : (
                  [...comments]
                     .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                     .map((comment) => (
                     <div key={comment.comment_id} className="mb-3">
                        {/* Top-level comment */}
                        <div
                           className="d-flex gap-2 p-2 rounded"
                           style={{
                              backgroundColor: comment.sender_type === 'Client' ? '#ffead5' : '#9e52a30f',
                              border: '1px solid',
                              borderColor: comment.sender_type === 'Client' ? '#ff983347' : 'rgba(146, 74, 151, 0.25)',
                           }}
                        >
                           <Avatar
                              label={comment.sender_name?.charAt(0)?.toUpperCase()}
                              shape="circle"
                              style={{
                                 backgroundColor: comment.sender_type === 'Client' ? '#ff9832' : 'rgb(146 74 151)',
                                 color: '#fff',
                                 width: '32px',
                                 height: '32px',
                                 minWidth: '32px',
                                 fontSize: '14px',
                              }}
                           />
                           <div className="flex-grow-1" style={{ minWidth: 0 }}>
                              <div className="d-flex justify-content-between align-items-center">
                                 <span style={{ fontWeight: 600, fontSize: '13px', color: '#2a2a2a' }}>
                                    {comment.sender_name}
                                    <Badge
                                       className="ms-2"
                                       style={{
                                          fontSize: '10px',
                                          fontWeight: 500,
                                          backgroundColor: comment.sender_type === 'Client' ? '#ff9832' : 'rgb(146 74 151)',
                                          color: '#fff',
                                          border: 'none',
                                       }}
                                    >
                                       {comment.sender_type}
                                    </Badge>
                                 </span>
                                 <small style={{ color: '#808080', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                    {formatCommentTime(comment.created_at)}
                                 </small>
                              </div>
                              <p className="mb-1 mt-1" style={{ fontSize: '13px', wordBreak: 'break-word', color: '#424242' }}>
                                 {comment.message}
                              </p>
                              <Button
                                 label="Reply"
                                 icon="pi pi-reply"
                                 className="p-0"
                                 text
                                 style={{ fontSize: '11px', height: '20px', color: '#808080' }}
                                 onClick={() => setReplyingTo(comment)}
                              />
                           </div>
                        </div>

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                           <div className="ms-4 mt-1">
                              {[...comment.replies]
                                 .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                                 .map((reply) => (
                                 <div
                                    key={reply.comment_id}
                                    className="d-flex gap-2 p-2 rounded mt-1"
                                    style={{
                                       backgroundColor: reply.sender_type === 'Client' ? '#ffead5' : '#9e52a30f',
                                       border: '1px solid',
                                       borderColor: reply.sender_type === 'Client' ? '#ff983347' : 'rgba(146, 74, 151, 0.25)',
                                       borderLeft: `3px solid ${reply.sender_type === 'Client' ? '#ff9832' : 'rgb(146 74 151)'}`,
                                    }}
                                 >
                                    <Avatar
                                       label={reply.sender_name?.charAt(0)?.toUpperCase()}
                                       shape="circle"
                                       style={{
                                          backgroundColor: reply.sender_type === 'Client' ? '#ff9832' : 'rgb(146 74 151)',
                                          color: '#fff',
                                          width: '26px',
                                          height: '26px',
                                          minWidth: '26px',
                                          fontSize: '12px',
                                       }}
                                    />
                                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                       <div className="d-flex justify-content-between align-items-center">
                                          <span style={{ fontWeight: 600, fontSize: '12px', color: '#2a2a2a' }}>
                                             {reply.sender_name}
                                             <Badge
                                                className="ms-2"
                                                style={{
                                                   fontSize: '9px',
                                                   fontWeight: 500,
                                                   backgroundColor: reply.sender_type === 'Client' ? '#ff9832' : 'rgb(146 74 151)',
                                                   color: '#fff',
                                                   border: 'none',
                                                }}
                                             >
                                                {reply.sender_type}
                                             </Badge>
                                          </span>
                                          <small style={{ color: '#808080', fontSize: '10px', whiteSpace: 'nowrap' }}>
                                             {formatCommentTime(reply.created_at)}
                                          </small>
                                       </div>
                                       <p className="mb-0 mt-1" style={{ fontSize: '12px', wordBreak: 'break-word', color: '#424242' }}>
                                          {reply.message}
                                       </p>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  ))
               )}
               <div ref={commentsEndRef} />
            </div>

            {/* Reply indicator */}
            {replyingTo && (
               <div className="d-flex align-items-center gap-2 px-2 py-1 mt-2 rounded" style={{ backgroundColor: '#9e52a30f', fontSize: '12px', color: '#424242', border: '1px solid rgba(146, 74, 151, 0.2)' }}>
                  <i className="pi pi-reply" style={{ fontSize: '11px', color: 'rgb(146 74 151)' }}></i>
                  <span>Replying to <b>{replyingTo.sender_name}</b></span>
                  <Button
                     icon="pi pi-times"
                     className="p-0 ms-auto"
                     text
                     style={{ width: '20px', height: '20px', fontSize: '10px', color: '#808080' }}
                     onClick={() => setReplyingTo(null)}
                  />
               </div>
            )}

            {/* Message input */}
            <div className="d-flex gap-2 mt-2 align-items-end">
               <InputText
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                     if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendComment();
                     }
                  }}
                  placeholder={replyingTo ? 'Write a reply...' : 'Write a comment...'}
                  className="flex-grow-1"
                  style={{ fontSize: '13px' }}
                  disabled={sendingComment}
               />
               <Button
                  icon={sendingComment ? 'pi pi-spin pi-spinner' : 'pi pi-send'}
                  className="p-0"
                  style={{ width: '38px', height: '38px', backgroundColor: 'rgb(146 74 151)', borderColor: 'rgb(146 74 151)', color: '#fff' }}
                  onClick={handleSendComment}
                  disabled={!newMessage.trim() || sendingComment}
               />
            </div>
         </Dialog>

         {/* Edit history dialog - client can see what was updated */}
         <Dialog
            visible={historyDialogVisible}
            style={{ width: '520px', maxHeight: '85vh' }}
            header={
               <div className="d-flex align-items-center gap-2">
                  <i className="pi pi-history" style={{ fontSize: '1.1rem', color: 'rgb(146 74 151)' }}></i>
                  <span>What was updated {historySubmission ? `- ${historySubmission.client_name}` : ''}</span>
               </div>
            }
            onHide={() => {
               setHistoryDialogVisible(false);
               setHistorySubmission(null);
               setEditHistory([]);
            }}
         >
            {historyLoading ? (
               <div className="text-center py-4">
                  <i className="pi pi-spin pi-spinner me-2"></i>
                  <span>Loading history...</span>
               </div>
            ) : editHistory.length === 0 ? (
               <div className="text-center py-4 text-muted">
                  <i className="pi pi-inbox" style={{ fontSize: '2rem' }}></i>
                  <p className="mt-2 mb-0">No edits yet. The agreement has not been modified after submission.</p>
               </div>
            ) : (
               <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  {editHistory.map((edit) => (
                     <div key={edit.edit_id} className="border rounded p-3 mb-2" style={{ backgroundColor: '#f8f9fa' }}>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                           <div>
                              <Badge style={{ backgroundColor: 'rgb(146 74 151)', color: '#fff', border: 'none' }}>Version {edit.version}</Badge>
                              <span className="ms-2 fw-semibold">{edit.editor_name}</span>
                              <span className="ms-1 small text-muted">({edit.editor_type})</span>
                           </div>
                           <small className="text-muted">{formatHistoryDate(edit.created_at)}</small>
                        </div>
                        {edit.edit_note && <p className="small mb-2 text-secondary">{edit.edit_note}</p>}
                        {edit.changes_summary && (
                           <div className="small">
                              {edit.changes_summary.added?.length > 0 && (
                                 <div className="mb-1">
                                    <span className="fw-semibold text-success">Added:</span>
                                    <ul className="mb-0 ps-3">
                                       {edit.changes_summary.added.map((a, i) => (
                                          <li key={i}>{a.fieldLabel}{a.value != null ? `: ${typeof a.value === 'object' ? JSON.stringify(a.value) : a.value}` : ''}</li>
                                       ))}
                                    </ul>
                                 </div>
                              )}
                              {edit.changes_summary.removed?.length > 0 && (
                                 <div className="mb-1">
                                    <span className="fw-semibold text-danger">Removed:</span>
                                    <ul className="mb-0 ps-3">
                                       {edit.changes_summary.removed.map((r, i) => (
                                          <li key={i}>{r.fieldLabel}</li>
                                       ))}
                                    </ul>
                                 </div>
                              )}
                              {edit.changes_summary.modified?.length > 0 && (
                                 <div>
                                    <span className="fw-semibold text-primary">Modified:</span>
                                    <ul className="mb-0 ps-3">
                                       {edit.changes_summary.modified.map((m, i) => (
                                          <li key={i}>
                                             {m.fieldLabel}
                                             {m.details?.length > 0 && (
                                                <ul className="mb-0 mt-0">
                                                   {m.details.map((d, j) => (
                                                      <li key={j}><span className="text-muted">{d.property}:</span> &quot;{d.from}&quot; → &quot;{d.to}&quot;</li>
                                                   ))}
                                                </ul>
                                             )}
                                          </li>
                                       ))}
                                    </ul>
                                 </div>
                              )}
                           </div>
                        )}
                     </div>
                  ))}
               </div>
            )}
         </Dialog>
      </>
    )
}

export default Sgha_reportsummary
