import React from "react";
import { Breadcrumb } from "react-bootstrap";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { IoChevronBackOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { CLIENT_HOME, CLIENT_ROUTES } from "../utils/clientWorkspace";

export function ClientBreadcrumbs({
  backTo = CLIENT_HOME,
  backLabel = "Home",
  items = [],
}) {
  const navigate = useNavigate();
  const trail = Array.isArray(items) ? items : [];

  return (
    <Breadcrumb>
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

export function ClientUnauthorizedDialog({
  visible,
  title = "You don’t have access to this page",
  message = "This area is not available for your client workspace. Return to Home to continue.",
}) {
  const navigate = useNavigate();

  const goHome = () => navigate(CLIENT_HOME, { replace: true });

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

export function ClientEmptyState({
  title,
  message,
  primaryLabel = "Go to Home",
  primaryTo = CLIENT_HOME,
  secondaryLabel,
  secondaryTo,
  icon = "pi pi-inbox",
}) {
  const navigate = useNavigate();

  return (
    <div className="client-empty-state text-center py-5 px-3">
      <i className={`${icon} mb-3`} style={{ fontSize: "2.2rem", color: "#924a97" }} />
      <h5 className="mb-2">{title}</h5>
      {message && <p className="text-muted mb-4">{message}</p>}
      <div className="d-flex justify-content-center gap-2 flex-wrap">
        <Button
          label={primaryLabel}
          icon="pi pi-home"
          className="py-2"
          severity="warning"
          onClick={() => navigate(primaryTo)}
        />
        {secondaryLabel && secondaryTo && (
          <Button
            label={secondaryLabel}
            icon="pi pi-arrow-right"
            className="py-2"
            severity="secondary"
            outlined
            onClick={() => navigate(secondaryTo)}
          />
        )}
      </div>
    </div>
  );
}

export function ClientFlowStepper({ steps, activeIndex, onSelect }) {
  return (
    <ol className="client-flow-stepper">
      {steps.map((step, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;
        const clickable = typeof onSelect === "function";
        return (
          <li
            key={step.label}
            className={`${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}`}
          >
            <button
              type="button"
              className="client-flow-stepper__btn"
              onClick={clickable ? () => onSelect(index) : undefined}
              disabled={!clickable}
            >
              <span className="client-flow-stepper__num">{index + 1}</span>
              <span className="client-flow-stepper__label">{step.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export { CLIENT_HOME, CLIENT_ROUTES };
