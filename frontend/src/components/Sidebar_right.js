import React, { useState } from 'react';
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import { NavLink, useLocation } from 'react-router-dom';
import { FiMenu, FiHome } from 'react-icons/fi';
import { LiaTimesSolid } from 'react-icons/lia';
import DynamicIcon from './DynamicIcon'; // Make sure this resolves icon_url strings

const SidebarRight = ({ pages = [] }) => {
  const location = useLocation();
  const [menuCollapse, setMenuCollapse] = useState(false);

  const menuIconClick = () => setMenuCollapse(!menuCollapse);

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
                active={location.pathname === page.path}
                component={<NavLink to={page.path} />}
              >
                {page.name}
              </MenuItem>
            ));
          } else {
            // Render submenu
            // Filter out first 2 pages for "SGHA Builder" submenu
            let pagesToRender = pages;
            if (group.name === 'SGHA Builder') {
              pagesToRender = pages.slice(2); // Skip first 2 items
            }
            
            return (
              <SubMenu
                key={group.menu_group_id}
                label={group.name}
                icon={<DynamicIcon name={group.icon_url} />}
              >
                {pagesToRender.map((page) => (
                  <MenuItem
                    key={page.page_id}
                    icon={<DynamicIcon name={page.icon_url} />}
                    active={location.pathname === page.path}
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
