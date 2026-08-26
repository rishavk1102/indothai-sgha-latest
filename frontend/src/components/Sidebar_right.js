import React, { useState } from 'react';
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import { NavLink, useLocation } from 'react-router-dom';
import { FiMenu, FiHome } from 'react-icons/fi';
import { LiaTimesSolid } from 'react-icons/lia';
import DynamicIcon from './DynamicIcon'; // Make sure this resolves icon_url strings
import { CLIENT_ROUTES } from '../utils/clientWorkspace';
import { EMPLOYEE_ROUTES } from '../utils/employeeWorkspace';

const SidebarRight = ({ pages = [] }) => {
  const location = useLocation();
  const [menuCollapse, setMenuCollapse] = useState(false);

  const menuIconClick = () => setMenuCollapse(!menuCollapse);

  const isPageActive = (page) => {
    if (location.pathname === page.path) return true;
    if (
      page.path === CLIENT_ROUTES.newSgha &&
      location.pathname === CLIENT_ROUTES.agreement
    ) {
      return true;
    }
    if (
      page.path === EMPLOYEE_ROUTES.templates &&
      (location.pathname === EMPLOYEE_ROUTES.builder ||
        location.pathname === EMPLOYEE_ROUTES.pdfImport)
    ) {
      return true;
    }
    if (
      page.path === EMPLOYEE_ROUTES.clients &&
      location.pathname.toLowerCase() === "/dashboard/clients"
    ) {
      return true;
    }
    return false;
  };

  // Group pages by menu_group.id (for submenu) and null (for direct items)
  const groupedPages = {};

  pages.forEach((page) => {
    const groupKey = page.menu_group?.menu_group_id || 'ungrouped';
    if (!groupedPages[groupKey]) {
      groupedPages[groupKey] = {
        group: page.menu_group || null,
        pages: [],
      };
    }
    groupedPages[groupKey].pages.push(page);
  });

  // Sort groups based on menu_group.order_index
  const sortedGroups = Object.values(groupedPages).sort((a, b) => {
    if (a.group && b.group) {
      return a.group.order_index - b.group.order_index;
    }
    if (!a.group) return -1; // ungrouped comes first
    if (!b.group) return 1;
    return 0;
  });

  return (
    <Sidebar collapsed={menuCollapse} className="sidebar">
      <Menu iconShape="square" className="py-5">
        {sortedGroups.map(({ group, pages }) => {
          if (!group) {
            // Render ungrouped pages directly
            return pages.map((page) => (
              <MenuItem
                key={page.page_id}
                icon={<DynamicIcon name={page.icon_url} />}
                active={isPageActive(page)}
                component={<NavLink to={page.path} />}
              >
                {page.name}
              </MenuItem>
            ));
          } else {
            return (
              <SubMenu
                key={group.menu_group_id}
                label={group.name}
                icon={<DynamicIcon name={group.icon_url} />}
              >
                {pages.map((page) => (
                  <MenuItem
                    key={page.page_id}
                    icon={<DynamicIcon name={page.icon_url} />}
                    active={isPageActive(page)}
                    component={<NavLink to={page.path} />}
                  >
                    {page.name}
                  </MenuItem>
                ))}
              </SubMenu>
            );
          }
        })}
      </Menu>

      <div className="closemenu" onClick={menuIconClick}>
        {menuCollapse ? <FiMenu /> : <LiaTimesSolid />}
      </div>
    </Sidebar>
  );
};

export default SidebarRight;
