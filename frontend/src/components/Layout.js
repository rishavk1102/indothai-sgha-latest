import React, { useEffect, useState } from 'react';
import Header from './Header';
import Sidebar_right from './Sidebar_right';
import '../assets/css/sidebar_header.css';
import { Container } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
const Layout = ({ children }) => {
  const { roleId, role } = useAuth();
  const [pages, setPages] = useState([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  
  useEffect(() => {
    const fetchPages = async () => {
      if (!roleId) {
        setPagesLoading(false);
        return;
      }
      
      try {
        setPagesLoading(true);
        const res = await api.get(`/roles/fetch_pages_by_role/${roleId}`);
        let fetchedPages = res.data.pages || [];
        
        // Filter out "Add SGHA Template" for clients - should only be visible to employees
        if (role === 'Client') {
          fetchedPages = fetchedPages.filter(page => {
            // Filter by page name or path
            const pageName = page.name?.toLowerCase() || '';
            const pagePath = page.path?.toLowerCase() || '';
            return !pageName.includes('add sgha template') && 
                   !pagePath.includes('createsghatemplate');
          });
        }
        
        setPages(fetchedPages);
      } catch (err) {
        console.error("Sidebar fetch error:", err);
        
        // If authentication error, the user needs to log in again
        if (err.response?.status === 401) {
          console.warn("Authentication required - please log in again");
          // Don't clear pages immediately, let the auth context handle redirect
        }
        
        setPages([]); // Set empty array on error
      } finally {
        setPagesLoading(false);
      }
    };

    fetchPages();
  }, [roleId, role]);
  return (
    <div>
      <Header />
      <div style={{ display: 'flex' }}>
        <Sidebar_right pages={pages}/>
        <main style={{ flexGrow: 1, padding: '30px' }}>
          <Container fluid className='position-relative p-0'>
            {children}
          </Container>
        </main>
      </div>
    </div>
  );
};

export default Layout;