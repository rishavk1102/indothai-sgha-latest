import React, { useRef } from 'react';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import CustomToast from './CustomToast';
import { Button } from 'primereact/button';

export default function CustomConfirmPopup({ message, defaultFocus,acceptClassName, icon, onConfirm, onReject, buttonLabel, title, buttonClass, buttonIcon }) {
    const toastRef = useRef(null); // Reference for the CustomToast component
    // Show toast message function
    const showMessage = (severity, detail) => {
        const summary = severity.charAt(0).toUpperCase() + severity.slice(1);
        toastRef.current.show(severity, summary, detail);
    };
    // Accept function for the confirmation popup
    const accept = () => {
        onConfirm();
        showMessage('info', 'Action confirmed successfully.');
    };

    // Reject function for the confirmation popup
    const reject = () => {
        onReject();
        showMessage('warn', 'Action has been Cancelled.');
    };

    const showConfirmPopup = (event) => {
        confirmPopup({
            target: event.currentTarget,
            message,
            defaultFocus,
            acceptClassName,
            icon,
            accept,
            reject,
        });
    };

    return (
        <>
            <CustomToast ref={toastRef} />
            <ConfirmPopup />
            <Button onClick={showConfirmPopup} icon={buttonIcon} title={title} aria-label={buttonLabel} className={buttonClass}></Button>
        </>
    );
}
