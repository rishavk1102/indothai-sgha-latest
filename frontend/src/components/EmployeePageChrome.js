import React from "react";
import { Breadcrumb } from "react-bootstrap";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { IoChevronBackOutline } from "react-icons/io5";
import { Link, useNavigate } from "react-router-dom";
import { EMPLOYEE_HOME, EMPLOYEE_ROUTES, PAGE_PERMISSION_NAMES } from "../utils/employeeWorkspace";

export function EmployeeBreadcrumbs({
  backTo = EMPLOYEE_HOME,
  backLabel = "Home",
  items = [],
}) {
  const navigate = useNavigate();
  const trail = Array.isArray(items) ? items : [];

  return (
    <Breadcrumb className="mb-0">
      <Breadcrumb.Item
        onClick={() => navigate(backTo)}
        style={{ cursor: "pointer" }}
      >
        <IoChevronBackOutline /> Back to {backLabel}
      </Breadcrumb.Item>
      {trail.map((item, index) => {
        const isLast = index === trail.length - 1;
        return (
          <Breadcrumb.Item
            key={`${item.label}-${index}`}
            active={isLast || !item.to}
            onClick={!isLast && item.to ? () => navigate(item.to) : undefined}
            style={!isLast && item.to ? { cursor: "pointer" } : undefined}
          >
            {item.label}
          </Breadcrumb.Item>
        );
      })}
    </Breadcrumb>
  );
}

export function EmployeePageHeader({
  title,
  items = [],
  backTo = EMPLOYEE_HOME,
  backLabel = "Home",
  primaryLabel,
  primaryIcon = "pi pi-plus",
  onPrimary,
  extra,
}) {
  return (
    <div className="employee-page-header">
      <div>
        <EmployeeBreadcrumbs backTo={backTo} backLabel={backLabel} items={items} />
        {title ? <h4 className="employee-page-header__title">{title}</h4> : null}
      </div>
      <div className="employee-page-header__actions">
        {extra}
        {primaryLabel && onPrimary ? (
          <Button
            label={primaryLabel}
            icon={primaryIcon}
            className="py-2"
            severity="help"
            onClick={onPrimary}
          />
        ) : null}
      </div>
    </div>
  );
}

export function EmployeeRelatedLinks({ links = [] }) {
  const visible = (links || []).filter((link) => link && link.to && link.label);
  if (!visible.length) return null;

  return (
    <div className="employee-related-links">
      <span className="employee-related-links__label">Related</span>
      {visible.map((link) => (
        <Link key={`${link.to}-${link.label}`} to={link.to} className="employee-related-links__item">
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function EmployeeUnauthorizedDialog({
  visible,
  title = "You don’t have access to this page",
  message = "This area is not available for your role. Return to Home to continue.",
}) {
  const navigate = useNavigate();
  const goHome = () => navigate(EMPLOYEE_HOME, { replace: true });

  return (
    <Dialog
      style={{ width: "380px" }}
      visible={visible}
      onHide={goHome}
      closable={false}
      dismissableMask={false}
    >
      <div className="text-center client-empty-state">
        <img
          src="https://blackboxstorage.blr1.cdn.digitaloceanspaces.com/assetImages/protect.png"
          alt=""
          width="100"
          className="mb-3"
        />
        <h5>{title}</h5>
        <p className="mb-3">{message}</p>
        <Button
          label="Go to Home"
          icon="pi pi-home"
          className="py-2 mt-2 text-white"
          style={{ fontSize: "14px" }}
          severity="warning"
          onClick={goHome}
        />
      </div>
    </Dialog>
  );
}

export { EMPLOYEE_HOME, EMPLOYEE_ROUTES, PAGE_PERMISSION_NAMES };
