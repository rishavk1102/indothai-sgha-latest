import React from 'react';

// Import entire icon libraries (or just needed ones)
import * as FiIcons from 'react-icons/fi';
import * as MdIcons from 'react-icons/md';
import * as AiIcons from 'react-icons/ai';
import * as BsIcons from 'react-icons/bs';
import * as Fa5Icons from 'react-icons/fa';
import * as Fa6Icons from 'react-icons/fa6'; // ✅ Add this line

const iconSets = {
  Fi: FiIcons,
  Md: MdIcons,
  Ai: AiIcons,
  Bs: BsIcons,
  Fa: Fa5Icons,  // Font Awesome 5
  Fa6: Fa6Icons, // ✅ Font Awesome 6
};

const DynamicIcon = ({ name, size = 20, className = '' }) => {
  if (!name) return null;

  // Extract prefix from icon name (e.g., "FiHome" => "Fi")
  const prefix = name.slice(0, 2);
  const iconSet = iconSets[prefix];

  const IconComponent = iconSet?.[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found. Using default.`);
    return <FiIcons.FiHome size={size} className={className} />;
  }

  return <IconComponent size={size} className={className} />;
};

export default DynamicIcon;
