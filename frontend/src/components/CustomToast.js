// CustomToast.js
import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Toast } from 'primereact/toast';

const CustomToast = forwardRef((props, ref) => {
    const toast = useRef(null);

    useImperativeHandle(ref, () => ({
        show(severity, summary, detail, life = 3000) {
            toast.current.show({ severity, summary, detail, life });
        }
    }));

    return <Toast ref={toast} position="bottom-right" />;
});

export default CustomToast;